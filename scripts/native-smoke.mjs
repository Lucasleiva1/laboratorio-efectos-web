import { connectNative } from "./connect-native.mjs";
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await connectNative();
const pages = browser.contexts().flatMap((c) => c.pages());
console.log(
  "WebViews:",
  pages.map((p) => p.url()),
);
const page = pages.find(
  (p) => p.url().includes("1420") || p.url().includes("tauri.localhost"),
);
if (!page) throw Error("No se encuentra la ventana nativa");
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page
  .getByText("EFFECT", { exact: false })
  .first()
  .waitFor({ timeout: 60000 });
console.log("Título:", await page.title());
console.log(
  "Ventana:",
  await page.evaluate(() => ({
    width: outerWidth,
    height: outerHeight,
    tauri: !!window.__TAURI_INTERNALS__,
  })),
);
await mkdir(".local", { recursive: true });
await page.screenshot({ path: ".local/native-smoke.png" });
console.log("Errores:", errors);
await browser.close();
