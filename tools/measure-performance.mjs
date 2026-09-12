import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { brotliCompressSync } from "node:zlib";

const output = `.tmp-redesign/${process.argv[2] || "performance"}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const runs = [];
for (const profile of ["desktop-local", "mobile-throttled"]) {
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({
      viewport:
        profile === "desktop-local"
          ? { width: 1366, height: 768 }
          : { width: 390, height: 844 },
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (profile === "mobile-throttled") {
      await cdp.send("Network.emulateNetworkConditions", {
        offline: false,
        latency: 150,
        downloadThroughput: 1_600_000 / 8,
        uploadThroughput: 750_000 / 8,
      });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await page.addInitScript(() => {
      window.portfolioLab = { lcp: 0, cls: 0, longTasks: [], entries: [] };
      new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.portfolioLab.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          if (!entry.hadRecentInput) window.portfolioLab.cls += entry.value;
      }).observe({ type: "layout-shift", buffered: true });
      new window.PerformanceObserver((list) => {
        for (const entry of list.getEntries())
          window.portfolioLab.longTasks.push({
            start: entry.startTime,
            duration: entry.duration,
          });
      }).observe({ type: "longtask", buffered: true });
    });
    await page.goto("http://127.0.0.1:4173/");
    await page.waitForTimeout(5500);
    const result = await page.evaluate(() => {
      const data = window.portfolioLab;
      const navigation = performance.getEntriesByType("navigation")[0];
      const resources = performance.getEntriesByType("resource");
      const longTasks = data.longTasks.filter((task) => task.start < 5000);
      return {
        fcpMs: performance.getEntriesByName("first-contentful-paint")[0]
          ?.startTime,
        lcpMs: data.lcp,
        cls: data.cls,
        longTaskExcessFirst5sMs: longTasks.reduce(
          (total, task) => total + Math.max(0, task.duration - 50),
          0,
        ),
        longestTaskFirst5sMs: Math.max(
          0,
          ...longTasks.map((task) => task.duration),
        ),
        transferredBytes:
          navigation.transferSize +
          resources.reduce((total, entry) => total + entry.transferSize, 0),
        requests: resources.length + 1,
        sceneReady: document.querySelector("canvas").dataset.ready === "true",
        userAgent: navigator.userAgent,
      };
    });
    runs.push({ profile, run, ...result });
    console.log(JSON.stringify(runs.at(-1)));
    await context.close();
  }
}
const assetSizes = [];
for (const file of [
  "index.html",
  "styles.css",
  "script.js",
  "assets/signature.js",
]) {
  const content = await readFile(file);
  assetSizes.push({
    file,
    bytes: content.length,
    brotliBytes: brotliCompressSync(content).length,
  });
}
await writeFile(
  `${output}/lab.json`,
  JSON.stringify(
    {
      date: new Date().toISOString(),
      conditions:
        "Chromium, SwiftShader, local uncompressed HTTP, cold cache, 3 runs per profile. Mobile: 390x844, 150 ms RTT, 1.6 Mbps down, 750 Kbps up, CPU 4x. Long-task excess is not Lighthouse TBT or field INP.",
      runs,
      assetSizes,
    },
    null,
    2,
  ),
);
await browser.close();
