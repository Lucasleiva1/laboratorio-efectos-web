import { connectNative } from "./connect-native.mjs";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const native = await connectNative();
try {
  const page = native.contexts().flatMap(c => c.pages()).find(p => p.url().includes("1420"));
  if (!page) throw Error("No se encuentra la ventana nativa de Effect Lab");
  await page.bringToFront();
  await page.reload();
  await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
  await page.getByRole("button", { name: "Nuevo", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Nombre del experimento", exact: true });
  if (!(await name.isVisible())) {
    await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  }
  await name.fill("Proyecto desde cero");
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await page.getByRole("textbox", { name: "Tipo de proyecto: html o react", exact: true }).fill("html");
  await page.getByRole("button", { name: "Crear", exact: true }).click();
  await expect(page.locator(".breadcrumb")).toContainText("Proyecto desde cero");
  await page.getByRole("button", { name: "Modo libre", exact: true }).click();
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando", { timeout: 30000 });
  const frame = page.frameLocator('iframe[title="Vista previa del efecto"]');
  await expect(frame.locator("body")).toHaveText("");
  await expect(frame.locator("canvas, img, button, h1")).toHaveCount(0);
  const result = await page.evaluate(async () => {
    const { useLab } = await import("/src/stores/lab.ts");
    const { parseProject, createProject } = await import("/packages/core/project.ts");
    const { examples } = await import("/src/features/projects/examples.ts");
    const project = parseProject(JSON.stringify(useLab.getState().project));
    const react = createProject("React vacío", "react");
    if (!react.files[0].content.includes("return null")) throw Error("React contiene una demo");
    const invoke = window.__TAURI_INTERNALS__.invoke;
    return {
      name: project.name, files: project.files.map(f => f.path),
      emptyJS: project.files.find(f => f.path === "main.js").content === "",
      parameters: project.parameters.length,
      examples: examples.map(p => ({ id: p.id, name: p.name })),
      visible: await invoke("plugin:window|is_visible", { label: "main" }),
      minimized: await invoke("plugin:window|is_minimized", { label: "main" }),
      size: await invoke("plugin:window|outer_size", { label: "main" }),
      errors: useLab.getState().logs.filter(l => l.level === "error"),
    };
  });
  expect(result.emptyJS).toBe(true);
  expect(result.parameters).toBe(0);
  expect(result.errors).toEqual([]);
  expect(result.examples.some(p => p.id === "03-particles-pixi-gsap")).toBe(true);
  expect(result.examples.some(p => p.id === "05-parallax-scroll")).toBe(true);
  expect(result.visible).toBe(true);
  expect(result.minimized).toBe(false);
  expect((await fetch("http://127.0.0.1:1420")).status).toBe(200);
  await page.screenshot({ path: ".local/proyecto-vacio-v0.1.0.png" });
  await writeFile(".local/empty-project-results.json", JSON.stringify(result, null, 2));
  console.log("PASS: proyecto creado desde Nuevo, nombre conservado, preview vacía y ejemplos disponibles", result);
} finally {
  await native.close();
}
