import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const directory = ".tmp-redesign/opening-fixed";
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  recordVideo: { dir: directory, size: { width: 1366, height: 768 } },
});
const page = await context.newPage();
await page.route("**/assets/signature.js", async (route) => {
  await new Promise((resolve) => setTimeout(resolve, 1700));
  await route.continue();
});
await page.goto("http://127.0.0.1:4173", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(800);
await page.screenshot({ path: `${directory}/before-scene.png` });
await page.locator('#signature-canvas[data-ready="true"]').waitFor();
await page.waitForFunction(
  () => document.querySelector("#signature-canvas").dataset.morph === "1.000",
);
await page.waitForTimeout(2100);
await page.screenshot({ path: `${directory}/assembled.png` });
const video = page.video();
await page.close();
await video.saveAs(`${directory}/opening.webm`);
await context.close();
await browser.close();
console.log(`${directory}/opening.webm`);
