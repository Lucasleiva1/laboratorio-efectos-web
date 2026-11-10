import { connectNative } from "./connect-native.mjs";
import { writeFile } from "node:fs/promises";
import { expect } from "@playwright/test";
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
const result = await page.evaluate(async () => {
  const library = await import("/src/services/library.ts");
  const { examples } = await import("/src/features/projects/examples.ts");
  await library.loadLibrary();
  const p = structuredClone(
    examples.find((p) => p.id === "03-particles-pixi-gsap"),
  );
  p.id = crypto.randomUUID();
  const id = await library.saveToLibrary(p, {
    name: "QA · Biblioteca",
    description: "Prueba de integridad",
    category: "QA",
    tags: ["prueba", "violeta"],
  });
  await library.updateLibraryItem(id, { favorite: true });
  await library.duplicateItem(id);
  await library.savePreset(p, "QA · Holograma violeta");
  p.parameters.find((p) => p.binding === "count").value = 100;
  const preset = library.useLibrary
    .getState()
    .data.presets.find((v) => v.projectId === p.id);
  const applied = library.applyPreset(p, preset);
  if (
    applied.project.parameters.find((p) => p.binding === "count").value !== 350
  )
    throw Error("Preset incorrecto");
  const r1 = await library.checkpoint(applied.project, "QA revisión 1");
  p.files[0].content += "\n<!-- QA revisión 2 -->";
  const r2 = await library.checkpoint(p, "QA revisión 2");
  if (r1.hash === r2.hash) throw Error("Hashes repetidos");
  const data = library.useLibrary.getState().data;
  const item = data.items.find((v) => v.id === id);
  if (!item.favorite || item.project.files.length !== p.files.length)
    throw Error("Biblioteca incompleta");
  const nativeText = await window.__TAURI_INTERNALS__.invoke("read_library");
  const saved = JSON.parse(nativeText);
  if (!saved.items.some((v) => v.id === id && v.favorite))
    throw Error("No persistió en disco");
  return {
    itemId: id,
    projectId: p.id,
    hashes: [r1.hash, r2.hash],
    files: item.project.files.length,
    preset: true,
    favoriteOnDisk: true,
    revisionRecovery: true,
  };
});
console.log("LIBRARY PASS:", result);
await writeFile(".local/library-results.json", JSON.stringify(result, null, 2));
await native.close();
