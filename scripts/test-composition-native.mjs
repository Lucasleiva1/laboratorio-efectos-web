import { expect } from "@playwright/test";
import { connectNative } from "./connect-native.mjs";
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
  const { examples } = await import("/src/features/projects/examples.ts");
  useLab
    .getState()
    .load(
      structuredClone(examples.find((p) => p.id === "11-composition-timeline")),
    );
});
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
await expect(page.locator(".runtime-state")).toHaveText("Ejecutando", {
  timeout: 60000,
});
const root = page.frameLocator('iframe[title="Vista previa del efecto"]');
await expect(root.locator("#layer-orb iframe")).toBeVisible();
await expect(
  root.frameLocator("iframe").getByRole("button", { name: "Experimentar · 0" }),
).toBeVisible({ timeout: 30000 });
await page.getByRole("button", { name: "Modo visual", exact: true }).click();
await page.getByRole("button", { name: "Timeline", exact: true }).click();
await page.getByRole("slider", { name: "Tiempo de composición" }).fill("1");
await expect(root.locator("#layer-orb")).toHaveCSS("opacity", "0.6");
console.log("PASS TIMELINE: scrub a 1 s = opacidad 0.6");
await page.getByRole("button", { name: "Capas", exact: true }).click();
await page.getByRole("button", { name: "React orbital", exact: true }).click();
await page.getByRole("button", { name: "Visibilidad", exact: true }).click();
await expect(root.locator("#layer-orb")).toBeHidden({ timeout: 30000 });
console.log("PASS LAYERS: ocultar capa actualiza el visor");
await page.reload();
await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
await page.evaluate(async () => {
  const { useLab } = await import("/src/stores/lab.ts");
  const { examples } = await import("/src/features/projects/examples.ts");
  useLab
    .getState()
    .load(
      structuredClone(examples.find((p) => p.id === "10-composition-graph")),
    );
});
await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
await expect(page.locator(".runtime-state")).toHaveText("Ejecutando", {
  timeout: 60000,
});
const graphRoot = page.frameLocator('iframe[title="Vista previa del efecto"]');
await graphRoot
  .frameLocator("iframe")
  .locator("body")
  .hover({ position: { x: 100, y: 100 } });
await expect
  .poll(async () =>
    graphRoot.locator("#layer-label").evaluate((el) => Number(el.dataset.x)),
  )
  .toBeGreaterThan(0);
console.log("PASS GRAPH: cursor → multiply → posición real");
await page.screenshot({ path: ".local/composition-native.png" });
await writeFile(
  ".local/composition-results.json",
  JSON.stringify(
    { scrub: true, visibility: true, pointerGraph: true },
    null,
    2,
  ),
);
await native.close();
