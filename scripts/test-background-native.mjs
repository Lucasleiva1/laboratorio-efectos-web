import { connectNative } from "./connect-native.mjs";
import { expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
await page.reload();
await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
await page
  .getByRole("button", { name: /Fondo de imagen.*Recurso listo/ })
  .click();
const sample = JSON.parse(
  await readFile(
    "examples/06-image-displacement/06-image-displacement-v0.1.0.effectlab",
    "utf8",
  ),
).files.find((f) => f.path === "art.svg").content;
await page
  .getByLabel("Elegir imagen de fondo")
  .setInputFiles({
    name: "mi-fondo.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from(sample.split(",")[1], "base64"),
  });
await expect(page.getByText("mi-fondo.svg", { exact: true })).toBeVisible();
await page
  .getByRole("button", { name: "Abrir como experimento", exact: true })
  .click();
const frame = page.frameLocator('iframe[title="Vista previa del efecto"]');
await expect(frame.locator(".image-background img")).toBeVisible({
  timeout: 30000,
});
await page
  .getByRole("slider", { name: "Oscurecimiento", exact: true })
  .fill(".6");
await expect(frame.locator(".shade")).toHaveCSS(
  "background-color",
  "rgba(9, 7, 15, 0.6)",
);
await page.getByRole("slider", { name: "Desenfoque", exact: true }).fill("4");
await expect(frame.locator(".image-background img")).toHaveCSS(
  "filter",
  "blur(4px)",
);
await page
  .getByRole("combobox", { name: "Encuadre", exact: true })
  .selectOption("contain");
await expect(frame.locator(".image-background img")).toHaveCSS(
  "object-fit",
  "contain",
);
const persisted = await page.evaluate(async () => {
  const { useLab } = await import("/src/stores/lab.ts");
  const { parseProject } = await import("/packages/core/project.ts");
  const p = parseProject(JSON.stringify(useLab.getState().project));
  return {
    image: p.files
      .find((f) => f.path === "assets/mi-fondo.svg")
      .content.startsWith("data:image/svg+xml;base64,"),
    blur: p.parameters.find((p) => p.binding === "blur").value,
    dim: p.parameters.find((p) => p.binding === "dim").value,
  };
});
console.log("BACKGROUND PASS:", persisted);
await page.screenshot({ path: ".local/background-native.png" });
await writeFile(
  ".local/background-results.json",
  JSON.stringify(persisted, null, 2),
);
await native.close();
