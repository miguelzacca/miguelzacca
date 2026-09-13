import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const output = `.tmp-redesign/${process.argv[2] || "onion-review"}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const results = [];
for (const [width, height] of [
  [1440, 900],
  [1920, 1080],
  [390, 844],
  [375, 812],
]) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 600,
    hasTouch: width < 600,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173/");
  await page.evaluate(() => document.fonts.ready);
  for (const [name, selector, offset] of [
    ["transition", ".network-threshold", 310],
    ["entrance", ".network-meta", 120],
    ["console", ".network-console", 130],
    ["guide", ".network-guide", 130],
  ]) {
    await page.locator(selector).evaluate((el, offset) => {
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - offset,
        behavior: "instant",
      });
    }, offset);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${output}/${width}x${height}-${name}.png` });
  }
  // Expose every one-shot entrance before taking a stitched section capture.
  await page.locator(".network-meta").evaluate((el) => {
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - 110,
      behavior: "instant",
    });
  });
  await page.waitForTimeout(1200);
  await page
    .locator(".network-layer")
    .screenshot({ path: `${output}/${width}x${height}-section.png` });
  results.push({
    width,
    height,
    errors,
    ...(await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      address: document.querySelector("[data-onion-link]").getAttribute("href"),
      canonical: document.querySelector('[rel="canonical"]').href,
    }))),
  });
  await context.close();
}
await browser.close();
await writeFile(`${output}/review.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
