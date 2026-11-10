import { connectNative } from "./connect-native.mjs";
import { chromium, expect } from "@playwright/test";
const browser = await connectNative();
const page = browser
  .contexts()
  .flatMap((c) => c.pages())
  .find((p) => p.url().includes("1420"));
if (!page) throw Error("Effect Lab no está abierto");
await page.reload();
await page.getByRole("button", { name: "Nuevo", exact: true }).waitFor();
page.on("dialog", (d) => d.accept());
page.on("pageerror", (e) => console.log("PAGE ERROR:", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE:", m.text().slice(0, 500));
});
for (const name of [
  "Halo · Luz que te sigue",
  "Orbital · React interactivo",
  "Nebula · Partículas luminosas",
  "Prisma · Geometría en movimiento",
]) {
  await page.evaluate(async (name) => {
    const { useLab } = await import("/src/stores/lab.ts");
    const { examples } = await import("/src/features/projects/examples.ts");
    useLab
      .getState()
      .load(structuredClone(examples.find((p) => p.name === name)));
  }, name);
  await page.getByRole("button", { name: "Ejecutar", exact: true }).click();
  try {
    await expect(page.locator(".runtime-state")).toHaveText("Ejecutando", {
      timeout: 60000,
    });
  } catch (e) {
    console.log(await page.locator(".console-lines").innerText());
    throw e;
  }
  const frame = page.frameLocator('iframe[title="Vista previa del efecto"]');
  if (name.startsWith("Halo")) {
    await expect(frame.locator(".halo")).toBeVisible();
    await page.getByRole("slider", { name: "Tamaño", exact: true }).fill("300");
    await expect(frame.locator(".halo")).toHaveCSS("width", "300px");
  }
  if (name.startsWith("Orbital")) {
    await frame.getByRole("button", { name: "Experimentar · 0" }).click();
    await expect(
      frame.getByRole("button", { name: "Experimentar · 1" }),
    ).toBeVisible();
  }
  if (name.startsWith("Nebula")) {
    await expect(frame.locator("canvas")).toHaveAttribute(
      "data-particles",
      "350",
      { timeout: 30000 },
    );
    await page
      .getByRole("slider", { name: "Cantidad de partículas", exact: true })
      .fill("100");
    await expect(frame.locator("canvas")).toHaveAttribute(
      "data-particles",
      "100",
    );
  }
  if (name.startsWith("Prisma"))
    await expect(frame.locator("canvas")).toBeVisible({ timeout: 30000 });
  const child = page.frames().find((f) => f.parentFrame());
  console.log(name, {
    tauri: await child.evaluate(() => typeof window.__TAURI_INTERNALS__),
    html: await child.locator("body").innerText(),
  });
  if (name.startsWith("Halo"))
    console.log(
      "ISOLATION:",
      await child.evaluate(async () => {
        try {
          return await Promise.race([
            window.__TAURI_INTERNALS__?.invoke("read_library"),
            new Promise((r) => setTimeout(() => r("timeout"), 2000)),
          ]);
        } catch (e) {
          return String(e);
        }
      }),
    );
  await page.screenshot({
    path: ".local/" + name.split(" ")[0].toLowerCase() + ".png",
  });
  console.log("PASS:", name);
}
await browser.close();
