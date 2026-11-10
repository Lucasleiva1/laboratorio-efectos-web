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
const report = [];
for (const id of [
  "05-parallax-scroll",
  "06-image-displacement",
  "07-glsl-procedural",
  "08-matter-physics",
]) {
  await page.evaluate(async (id) => {
    const { useLab } = await import("/src/stores/lab.ts");
    const { examples } = await import("/src/features/projects/examples.ts");
    useLab.getState().load(structuredClone(examples.find((p) => p.id === id)));
  }, id);
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando", {
    timeout: 60000,
  });
  const frame = page.frameLocator('iframe[title="Vista previa del efecto"]');
  if (id.startsWith("05")) {
    await expect(frame.locator(".far")).toBeVisible();
    const before = await frame
      .locator(".far")
      .evaluate((e) => getComputedStyle(e).transform);
    await frame
      .locator("body")
      .evaluate((e) => e.ownerDocument.defaultView.scrollTo(0, 250));
    await expect
      .poll(() =>
        frame.locator(".far").evaluate((e) => getComputedStyle(e).transform),
      )
      .not.toBe(before);
  } else {
    await expect(frame.locator("canvas")).toBeVisible({ timeout: 30000 });
    await expect
      .poll(() => frame.locator("canvas").evaluate((c) => c.width))
      .toBeGreaterThan(100);
  }
  if (id.startsWith("07")) {
    const original = await page.evaluate(async () => {
      const { useLab } = await import("/src/stores/lab.ts");
      return useLab
        .getState()
        .project.files.find((f) => f.path === "aurora.frag").content;
    });
    await page.evaluate(async () => {
      const { useLab } = await import("/src/stores/lab.ts");
      useLab.getState().edit("aurora.frag", "INVALID GLSL");
    });
    await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
    await expect(page.locator(".runtime-state")).toHaveText("Error");
    await page.evaluate(async (original) => {
      const { useLab } = await import("/src/stores/lab.ts");
      useLab.getState().edit("aurora.frag", original);
    }, original);
    await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
    await expect(page.locator(".runtime-state")).toHaveText("Ejecutando");
  }
  if (id.startsWith("08")) {
    await page
      .getByRole("slider", { name: "Cantidad de cuerpos", exact: true })
      .fill("8");
    await expect(frame.locator("canvas")).toHaveAttribute("data-bodies", "8");
    await page
      .getByRole("combobox", { name: "Tamaño de vista previa", exact: true })
      .selectOption("375px");
    await expect
      .poll(() =>
        frame
          .locator("canvas")
          .evaluate((c) => c.ownerDocument.defaultView.innerWidth),
      )
      .toBe(375);
    await expect
      .poll(() =>
        frame.locator("canvas").evaluate((c) => {
          const ctx = c.getContext("2d");
          const data = ctx.getImageData(0, 0, c.width, c.height).data;
          let bright = 0;
          for (let i = 0; i < data.length; i += 4) if (data[i] > 70) bright++;
          return bright;
        }),
      )
      .toBeGreaterThan(20);
  }
  report.push({ id, pass: true });
  console.log("PASS NATIVE:", id);
}
await writeFile(
  ".local/advanced-native-results.json",
  JSON.stringify(report, null, 2),
);
await native.close();
