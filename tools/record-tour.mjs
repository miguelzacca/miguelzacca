import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const directory = `.tmp-redesign/${process.argv[2] || "tour"}`;
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width: 1366, height: 768 },
  recordVideo: { dir: directory, size: { width: 1366, height: 768 } },
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:4173");
await page.waitForFunction(
  () => document.querySelector("#signature-canvas").dataset.morph === "1.000",
);
await page.waitForTimeout(2100);
await page.locator("[data-assembly-toggle]").click();
await page.waitForTimeout(1500);
await page.locator("[data-assembly-toggle]").click();
await page.waitForTimeout(1700);
async function travel(selector, pause = 850, centered = false) {
  // A deliberately slow, scripted scroll exposes intermediate shapes in the
  // recording. The application itself does not intercept or animate scrolling.
  const target = await page.locator(selector).evaluate((el, centered) => {
    const r = el.getBoundingClientRect();
    return (
      r.top +
      window.scrollY +
      (centered ? r.height / 2 - window.innerHeight * 0.5 : -110)
    );
  }, centered);
  await page.evaluate(
    (target) =>
      new Promise((resolve) => {
        const start = window.scrollY;
        const end = Math.min(
          target,
          document.documentElement.scrollHeight - window.innerHeight,
        );
        const duration = Math.min(
          3100,
          Math.max(1500, Math.abs(end - start) * 2.4),
        );
        const began = performance.now();
        function tick(now) {
          const p = Math.min(1, (now - began) / duration);
          window.scrollTo({
            top: start + (end - start) * p * p * (3 - 2 * p),
            behavior: "instant",
          });
          if (p < 1) requestAnimationFrame(tick);
          else resolve();
        }
        requestAnimationFrame(tick);
      }),
    target,
  );
  await page.waitForTimeout(pause);
}
await travel(".assembly__space", 1000, true);
for (const selector of [
  "#conectei",
  "#pesquisa",
  "#rotina",
  "#precificacao",
  "#rotina",
  "#precificacao",
  "#fluxo",
  "#engenharia",
  ".engineering-explorer",
])
  await travel(selector);
for (const node of ["aplicacao", "dados", "servicos"]) {
  await page.locator(`[data-node="${node}"]`).click();
  await page.waitForTimeout(1500);
}
for (const selector of ["#capacidades", "#sobre", "#contato"])
  await travel(selector, 1300);
await travel(".contact-emblem", 2000, true);
await page.screenshot({ path: `${directory}/contact.png` });
const video = page.video();
await page.close();
await video.saveAs(`${directory}/portfolio-tour.webm`);
await context.close();
await browser.close();
console.log(`${directory}/portfolio-tour.webm`);
