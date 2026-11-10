import { connectNative } from "./connect-native.mjs";
import { expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const native = await connectNative();
const page = native.contexts().flatMap(c => c.pages()).find(p => p.url().includes("1420"));
if (!page) throw Error("No se encuentra Effect Lab");
const original = await page.evaluate(async () => (await import("/src/stores/lab.ts")).useLab.getState().project);
const frame = () => page.frameLocator('iframe[title="Vista previa del efecto"]');
const boot = () => frame().locator("body").getAttribute("data-boot");
const wait = ms => page.waitForTimeout(ms);
const stopped = async () => {
  await expect(page.locator(".runtime-state")).toHaveText("Detenido");
  await expect(page.locator('iframe[title="Vista previa del efecto"]')).toHaveCount(0);
};
const edit = () => page.evaluate(async () => {
  const s = (await import("/src/stores/lab.ts")).useLab.getState();
  s.edit("main.js", s.project.files.find(f => f.path === "main.js").content + "\n// edit " + crypto.randomUUID());
});
try {
  await page.bringToFront();
  await page.reload();
  await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
  await page.evaluate(async () => {
    const { createProject } = await import("/packages/core/project.ts");
    const { useLab } = await import("/src/stores/lab.ts");
    const p = createProject("QA · Ejecución persistente");
    p.files.find(f => f.path === "main.js").content = `
document.body.dataset.boot = crypto.randomUUID();
document.body.innerHTML = '<output id="value"></output>';
window.lab.register([{id:'speed',binding:'speed',label:'Velocidad',widget:'slider',value:1,defaultValue:1,min:0,max:10,step:1}], p => document.querySelector('#value').textContent=String(p.speed));
let ticks=0;const timer=setInterval(()=>document.body.dataset.ticks=String(++ticks),50);
window.lab.onDispose(()=>clearInterval(timer));`;
    useLab.getState().load(p);
  });
  const auto = page.getByRole("checkbox", { name: "Auto", exact: true });
  await auto.check();
  await wait(1100);
  await expect(page.locator('iframe[title="Vista previa del efecto"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando");
  const first = await boot();
  await wait(1800);
  expect(await boot()).toBe(first);
  await expect.poll(() => frame().locator("body").getAttribute("data-ticks").then(Number)).toBeGreaterThan(10);
  await page.evaluate(async () => (await import("/src/stores/lab.ts")).useLab.getState().parameter("speed", 3));
  await expect(frame().locator("#value")).toHaveText("3");
  await wait(1600);
  expect(await boot()).toBe(first);
  console.log("PASS: Ejecutar permanece activo; registro y controles no reinician el iframe");
  await edit();
  await expect.poll(async () => { const id = await boot(); return Boolean(id && id !== first); }).toBe(true);
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando");
  const second = await boot();
  await wait(1600);
  expect(await boot()).toBe(second);
  console.log("PASS: Auto recarga una sola vez al cambiar código");
  await edit();
  await page.getByRole("button", { name: "Detener", exact: true }).click();
  await wait(1800);
  await stopped();
  await edit();
  await wait(1400);
  await stopped();
  console.log("PASS: Detener cancela recarga pendiente y no se reinicia al editar con Auto");
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await page.getByRole("button", { name: "Detener", exact: true }).click();
  await wait(1600);
  await stopped();
  console.log("PASS: detener una ejecución recién solicitada invalida resultados pendientes");
  await auto.uncheck();
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando");
  const third = await boot();
  await edit();
  await wait(1300);
  expect(await boot()).toBe(third);
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect.poll(async () => { const id = await boot(); return Boolean(id && id !== third); }).toBe(true);
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando");
  console.log("PASS: sin Auto sigue ejecutándose y solo reinicia al pulsar Ejecutar");
  await writeFile(".local/playback-results.json", JSON.stringify({ persistentRun: true, controlsPreserveFrame: true, autoReloadOnce: true, stopCancelsPending: true, stoppedEditsStayStopped: true, manualRestart: true }, null, 2));
} catch (error) {
  console.log(await page.evaluate(async () => ({ status: document.querySelector('.runtime-state')?.textContent, logs: (await import('/src/stores/lab.ts')).useLab.getState().logs.slice(-12) })));
  throw error;
} finally {
  await page.getByRole("checkbox", { name: "Auto", exact: true }).uncheck();
  await page.evaluate(async p => (await import("/src/stores/lab.ts")).useLab.getState().load(p), original);
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  await expect(page.locator(".runtime-state")).toHaveText("Ejecutando");
  await native.close();
}
