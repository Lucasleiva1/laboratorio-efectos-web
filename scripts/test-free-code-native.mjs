import { connectNative } from "./connect-native.mjs";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
await page.reload();
await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
await page.evaluate(async () => {
  const { useLab } = await import("/src/stores/lab.ts");
  const { createProject } = await import("/packages/core/project.ts");
  const p = createProject("QA · Código pegado libre");
  useLab.getState().load(p);
  useLab.getState().select("main.js");
});
const code = `const config = { speed: 1 };\nconst out = document.createElement('output');\nout.id='live-value';out.style.cssText='position:fixed;top:20px;right:20px;color:white;font:30px system-ui';document.body.append(out);\nfunction tick(){out.textContent=String(config.speed);requestAnimationFrame(tick);}tick();`;
await expect(page.locator(".file-tabs button.active")).toContainText("main.js");
await expect(page.locator(".monaco-editor")).toBeVisible();
await page.locator(".monaco-editor").click({ position: { x: 100, y: 60 } });
await page.keyboard.press("Control+A");
await page.keyboard.insertText(code);
await expect
  .poll(() =>
    page.evaluate(async () => {
      const { useLab } = await import("/src/stores/lab.ts");
      return useLab.getState().project.files.find((f) => f.path === "main.js")
        .content;
    }),
  )
  .toBe(code);
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
const frame = page.frameLocator('iframe[title="Vista previa del efecto"]');
await expect(frame.locator("#live-value")).toHaveText("1", { timeout: 30000 });
await page
  .getByRole("button", { name: "Analizar código", exact: true })
  .click();
await page.getByRole("button", { name: /config\.speed/ }).click();
await expect(page.locator(".diff-add")).toContainText(
  'config.speed = values["speed"]',
);
await page
  .getByRole("button", { name: "Aceptar cambio de código", exact: true })
  .click();
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
await page.getByRole("slider", { name: "speed", exact: true }).fill("5");
await expect(frame.locator("#live-value")).toHaveText("5");
console.log(
  "PASS FREE CODE: código pegado en Monaco + AST + adaptador aceptado + parámetro real",
);
const current = await page.evaluate(async () => {
  const { useLab } = await import("/src/stores/lab.ts");
  return useLab.getState().project.files.find((f) => f.path === "main.js")
    .content;
});
await page.locator(".monaco-editor").click({ position: { x: 100, y: 60 } });
await page.keyboard.press("Control+A");
await page.keyboard.insertText("const config = ;");
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
await expect(page.locator(".runtime-state")).toHaveText("Error");
await page.locator(".monaco-editor").click({ position: { x: 100, y: 60 } });
await page.keyboard.press("Control+A");
await page.keyboard.insertText(current);
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
await expect(frame.locator("#live-value")).toHaveText("5");
console.log(
  "PASS ERRORS: sintaxis inválida → diagnóstico → reparación sin perder parámetros",
);
await page.locator(".monaco-editor").click({ position: { x: 100, y: 60 } });
await page.keyboard.press("Control+A");
await page.keyboard.insertText(code);
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
await expect(page.getByText("Vínculo roto", { exact: true })).toBeVisible();
console.log("PASS BINDING: retirar registro conserva y marca el control roto");
await writeFile(
  ".local/free-code-results.json",
  JSON.stringify(
    {
      monacoPaste: true,
      astAdapter: true,
      liveControl: true,
      errorRecovery: true,
      brokenBinding: true,
    },
    null,
    2,
  ),
);
await native.close();
