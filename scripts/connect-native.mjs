import { chromium } from "@playwright/test";
export async function connectNative() {
  let error;
  for (let i = 0; i < 100; i++) {
    try {
      return await chromium.connectOverCDP("http://127.0.0.1:9223", {
        timeout: 1500,
      });
    } catch (e) {
      error = e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw error;
}
