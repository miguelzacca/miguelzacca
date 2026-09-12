import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const phase = process.argv[2] || "after";
const productOnly = process.argv.includes("--product-only");
const directory = `.tmp-redesign/${phase}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const sizes = [
  ["wide", 1920, 1080],
  ["notebook", 1366, 768],
  ["tablet", 834, 1112],
  ["mobile", 390, 844],
  ["narrow", 320, 740],
  ["short", 1366, 600],
];
const results = [];
for (const [name, width, height] of sizes) {
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("http://127.0.0.1:4173");
  await page.waitForTimeout(3100);
  if (!productOnly) {
    await page.screenshot({ path: `${directory}/${name}-hero.png` });
    for (const [label, selector, fraction] of [
      ["assembly", ".assembly__space", 0.48],
      ["map", ".engineering-map", 0.51],
      ["structure", ".capabilities-sculpture", 0.5],
      ["signature", ".contact-emblem", 0.58],
    ]) {
      await page.locator(selector).evaluate((el, fraction) => {
        const r = el.getBoundingClientRect();
        window.scrollTo({
          top:
            r.top +
            window.scrollY +
            r.height / 2 -
            window.innerHeight * fraction,
          behavior: "instant",
        });
      }, fraction);
      await page.waitForTimeout(1950);
      await page.screenshot({ path: `${directory}/${name}-${label}.png` });
    }
  }
  for (const step of await page.locator(".story-step").all()) {
    await step.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1950);
    await page.screenshot({
      path: `${directory}/${name}-${await step.getAttribute("id")}.png`,
    });
  }
  if (!productOnly) {
    for (const id of ["engenharia", "sobre", "contato"]) {
      const section = page.locator(`#${id}`);
      if (await section.count()) {
        await section.evaluate((el) =>
          window.scrollTo({
            top: el.getBoundingClientRect().top + window.scrollY - 100,
            behavior: "instant",
          }),
        );
        await page.waitForTimeout(1950);
        await page.screenshot({ path: `${directory}/${name}-${id}.png` });
      }
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `${directory}/${name}-full.png`,
      fullPage: true,
    });
    await page.locator("#conectei").evaluate((el) =>
      window.scrollTo({
        top: el.getBoundingClientRect().top + window.scrollY - 100,
        behavior: "instant",
      }),
    );
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${directory}/${name}-case.png` });
  }
  results.push({
    name,
    width,
    height,
    errors,
    ...(await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth,
      pageHeight: document.documentElement.scrollHeight,
    }))),
  });
  await page.close();
}
await writeFile(
  `${directory}/${productOnly ? "product-results" : "capture-results"}.json`,
  JSON.stringify(results, null, 2),
);
await browser.close();
console.log(JSON.stringify(results));
