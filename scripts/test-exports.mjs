import { connectNative } from "./connect-native.mjs";
import { chromium, expect } from "@playwright/test";
import { createServer } from "node:http";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { transform } from "esbuild";
import { execFileSync } from "node:child_process";
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
if (!page) throw Error("Falta Effect Lab");
await page.reload();
await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
const packages = await page.evaluate(async () => {
  const { examples } = await import("/src/features/projects/examples.ts");
  const { buildExport } = await import("/src/services/exporter.ts");
  const results = [];
  for (const p of examples) {
    const result = await buildExport(
      p,
      p.profile === "react" ? "react" : "html",
    );
    results.push({
      id: p.id,
      name: p.name,
      files: result.files,
      bytes: result.bytes,
      zipBytes: result.zip.length,
      parameters: p.parameters,
    });
  }
  return results;
});
const outputRoot = ".local/exports-validation/run-" + Date.now();
const map = new Map();
for (const p of packages) {
  await mkdir(outputRoot + "/" + p.id, { recursive: true });
  for (const [name, content] of Object.entries(p.files)) {
    map.set("/" + p.id + "/" + name, content);
    await writeFile(outputRoot + "/" + p.id + "/" + name, content);
  }
  if (p.files["EffectComponent-v0.1.0.tsx"]) {
    const result = await transform(p.files["EffectComponent-v0.1.0.tsx"], {
      loader: "tsx",
      jsx: "automatic",
      format: "esm",
    });
    map.set("/" + p.id + "/EffectComponent-v0.1.0.js", result.code);
    map.set(
      "/" + p.id + "/react-test.html",
      `<!doctype html><div id="root" style="height:600px"></div><script type="importmap">{"imports":{"react":"/__deps/react.js","react-dom/client":"/__deps/react-dom--client.js","react/jsx-runtime":"/__deps/react--jsx-runtime.js"}}</script><script type="module">import React from 'react';import{createRoot}from'react-dom/client';import Effect from './EffectComponent-v0.1.0.js';const root=createRoot(document.getElementById('root'));root.render(React.createElement(Effect));window.unmountReact=()=>root.unmount();</script>`,
    );
    execFileSync(
      process.execPath,
      [
        "node_modules/typescript/bin/tsc",
        "--noEmit",
        "--strict",
        "--jsx",
        "react-jsx",
        "--target",
        "es2022",
        "--module",
        "esnext",
        "--moduleResolution",
        "bundler",
        "--skipLibCheck",
        outputRoot + "/" + p.id + "/EffectComponent-v0.1.0.tsx",
      ],
      { stdio: "pipe" },
    );
  }
}
for (const name of ["react", "react-dom--client", "react--jsx-runtime"])
  map.set(
    "/__deps/" + name + ".js",
    await readFile("public/vendor/" + name + ".js", "utf8"),
  );
const server = createServer((req, res) => {
  const path = new URL(req.url, "http://127.0.0.1").pathname;
  const text = map.get(path);
  if (!text) {
    res.writeHead(404);
    return res.end("No existe");
  }
  res.setHeader(
    "Content-Type",
    path.endsWith(".js")
      ? "text/javascript"
      : path.endsWith(".json")
        ? "application/json"
        : "text/html",
  );
  res.end(text);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;
const browser = await chromium.launch({ channel: "msedge", headless: true });
const results = [];
try {
  for (const p of packages) {
    const test = await browser.newPage();
    const errors = [];
    test.on("pageerror", (e) => errors.push(e.message));
    await test.goto(`http://127.0.0.1:${port}/${p.id}/demo-v0.1.0.html`);
    const child = test.frameLocator("iframe");
    if (p.id.startsWith("01")) {
      await expect(child.locator(".halo")).toBeVisible();
      await test.evaluate(() => window.demoEffect.update({ size: 310 }));
      await expect(child.locator(".halo")).toHaveCSS("width", "310px");
    } else if (p.id.startsWith("02")) {
      await child.getByRole("button", { name: "Experimentar · 0" }).click();
      await expect(
        child.getByRole("button", { name: "Experimentar · 1" }),
      ).toBeVisible();
    } else if (p.id.startsWith("05")) {
      await expect(child.locator("h1")).toBeVisible();
      await child
        .locator("body")
        .evaluate((el) => el.ownerDocument.defaultView.scrollTo(0, 400));
    } else if (p.id.startsWith("13"))
      await expect(child.locator(".image-background img")).toBeVisible();
    else if (/^(09|10|11|12)/.test(p.id))
      await expect(child.locator('[id^="layer-"]').first()).toBeVisible({
        timeout: 30000,
      });
    else await expect(child.locator("canvas")).toBeVisible({ timeout: 30000 });
    await test.getByRole("button", { name: "Probar el sitio" }).click();
    await expect(
      test.getByRole("button", { name: "El sitio sigue funcionando" }),
    ).toBeVisible();
    if (errors.length) throw Error(p.name + ": " + errors.join("; "));
    await test.evaluate(async (id) => {
      const { mountEffect } = await import("/" + id + "/effect-v0.1.0.js");
      const root = document.createElement("div");
      root.style.height = "400px";
      document.body.append(root);
      const other = mountEffect({ target: root });
      if (document.querySelectorAll("iframe").length !== 2)
        throw Error("No hay dos instancias");
      other.destroy();
      window.demoEffect.destroy();
      if (document.querySelectorAll("iframe").length !== 0)
        throw Error("No se desmontaron las instancias");
    }, p.id);
    if (p.files["EffectComponent-v0.1.0.tsx"]) {
      await test.goto(`http://127.0.0.1:${port}/${p.id}/react-test.html`);
      await expect(test.locator("iframe")).toBeVisible({ timeout: 30000 });
      await test.evaluate(() => window.unmountReact());
      await expect(test.locator("iframe")).toHaveCount(0);
      console.log("PASS REACT WRAPPER:", p.name);
    }
    console.log("PASS EXPORT:", p.name, p.bytes, "bytes", p.zipBytes, "ZIP");
    results.push({
      id: p.id,
      status: "PASS",
      bytes: p.bytes,
      zipBytes: p.zipBytes,
    });
    await test.close();
  }
  await writeFile(
    ".local/export-results.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await browser.close();
  await native.close();
  server.close();
}
