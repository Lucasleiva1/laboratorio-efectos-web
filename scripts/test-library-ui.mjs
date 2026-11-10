import { connectNative } from "./connect-native.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { expect } from "@playwright/test";
const evidence = JSON.parse(
  await readFile(".local/library-results.json", "utf8"),
);
const native = await connectNative();
const page = native
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
await page.reload();
await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
const revisions = await page.evaluate(async (projectId) => {
  const library = await import("/src/services/library.ts");
  const { useLab } = await import("/src/stores/lab.ts");
  await library.loadLibrary();
  const list = library.useLibrary
    .getState()
    .data.revisions.filter((r) => r.projectId === projectId);
  const first = list.find((r) => r.note === "QA revisión 1"),
    second = list.find((r) => r.note === "QA revisión 2");
  useLab.getState().load(structuredClone(second.project));
  useLab.getState().update((p) => {
    p.files[0].content += "\n<!-- QA estado anterior a restaurar -->";
  });
  return {
    first: { id: first.id, project: first.project },
    secondId: second.id,
  };
}, evidence.projectId);
await page.getByRole("button", { name: "Biblioteca", exact: true }).click();
await page.getByRole("button", { name: "Historial", exact: true }).click();
const article = page.locator(`[data-revision-id="${revisions.first.id}"]`);
await article.getByRole("button", { name: "Comparar", exact: true }).click();
await expect(page.locator(".monaco-diff-editor")).toBeVisible({
  timeout: 30000,
});
await expect(page.locator(".diff-overlay")).toContainText(/QA\s+revisión\s+2/);
await page
  .getByRole("button", { name: "Cerrar comparación", exact: true })
  .click();
await article.getByRole("button", { name: "Restaurar", exact: true }).click();
await page.getByRole("button", { name: "Confirmar", exact: true }).click();
await expect(page.locator(".library-modal")).toHaveCount(0);
const result = await page.evaluate(
  async ({ projectId, original, secondId }) => {
    const { useLab } = await import("/src/stores/lab.ts");
    const library = await import("/src/services/library.ts");
    const active = useLab.getState();
    const revisions = library.useLibrary
      .getState()
      .data.revisions.filter((r) => r.projectId === projectId);
    if (JSON.stringify(active.project.files) !== JSON.stringify(original.files))
      throw Error("No se restauraron los archivos");
    if (!revisions.some((r) => r.id === secondId))
      throw Error("Se perdió una revisión posterior");
    if (!revisions.some((r) => r.note.startsWith("Antes de restaurar")))
      throw Error("Falta checkpoint de recuperación");
    if (!active.dirty)
      throw Error("La restauración debe quedar pendiente de guardar");
    return {
      revisionRecovery: true,
      diffReviewed: true,
      futurePreserved: true,
      checkpointCreated: true,
    };
  },
  {
    projectId: evidence.projectId,
    original: revisions.first.project,
    secondId: revisions.secondId,
  },
);
await writeFile(
  ".local/library-results.json",
  JSON.stringify({ ...evidence, ...result }, null, 2),
);
console.log("LIBRARY UI PASS:", result);
await native.close();
