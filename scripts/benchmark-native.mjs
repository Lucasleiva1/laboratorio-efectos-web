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
const results = [];
for (const [id, count, glow, label] of [
  ["01-cursor-halo-html", null, null, "simple"],
  ["03-particles-pixi-gsap", 3000, 8, "partículas original"],
  ["03-particles-pixi-gsap", 900, 2.4, "partículas ligera"],
]) {
  await page.evaluate(
    async ({ id, count, glow }) => {
      const { useLab } = await import("/src/stores/lab.ts");
      const { examples } = await import("/src/features/projects/examples.ts");
      const p = structuredClone(examples.find((p) => p.id === id));
      if (count !== null) {
        p.parameters.find((p) => p.binding === "count").value = count;
        p.parameters.find((p) => p.binding === "glow").value = glow;
      }
      p.id = crypto.randomUUID();
      useLab.getState().load(p);
      window.__qaMetrics = [];
      if (window.__qaMetricsHandler)
        removeEventListener("message", window.__qaMetricsHandler);
      window.__qaMetricsHandler = (e) => {
        if (
          e.source ===
            document.querySelector('iframe[title="Vista previa del efecto"]')
              ?.contentWindow &&
          e.data?.type === "metrics"
        )
          window.__qaMetrics.push(e.data.data);
      };
      addEventListener("message", window.__qaMetricsHandler);
    },
    { id, count, glow },
  );
  const start = performance.now();
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando", {
    timeout: 60000,
  });
  const startup = performance.now() - start;
  await expect
    .poll(() => page.evaluate(() => window.__qaMetrics.length), {
      timeout: 30000,
    })
    .toBeGreaterThanOrEqual(3);
  const metrics = await page.evaluate(() => window.__qaMetrics.slice(-2));
  const result = {
    label,
    count,
    glow,
    startupMs: Math.round(startup),
    fps: metrics.reduce((n, m) => n + m.fps, 0) / metrics.length,
    p95ms: metrics.reduce((n, m) => n + m.p95, 0) / metrics.length,
  };
  results.push(result);
  console.log("BENCH:", result);
}
await writeFile(
  ".local/benchmark-results.json",
  JSON.stringify(
    {
      date: "2026-11-10",
      runtime: "Windows WebView2 nativo, ventana activa, sin lectura CPU/GPU",
      results,
    },
    null,
    2,
  ),
);
await native.close();
