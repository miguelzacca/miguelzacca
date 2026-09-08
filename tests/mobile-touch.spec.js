import { test, expect } from "@playwright/test";

test("touch input opens navigation, product details and readable mobile screenshots across orientation changes", async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    screen: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  expect(
    await page.evaluate(() => matchMedia("(pointer: coarse)").matches),
  ).toBe(true);
  await page.locator("[data-menu-open]").tap();
  await page.locator('.site-menu a[href="#conectei"]').tap();
  await expect(page).toHaveURL(/#conectei$/);
  await page.locator("[data-image-open]").first().tap();
  const dialog = page.locator("#image-dialog");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => dialog.locator("img").evaluate((image) => image.naturalWidth))
    .toBe(390);
  expect(
    await dialog
      .locator(".image-dialog__scroll")
      .evaluate((element) => element.scrollHeight > element.clientHeight),
  ).toBe(true);
  await page.setViewportSize({ width: 844, height: 390 });
  const dialogBounds = await dialog.boundingBox();
  expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.x + dialogBounds.width).toBeLessThanOrEqual(844);
  await page.locator("[data-image-close]").tap();
  await page.setViewportSize({ width: 390, height: 844 });
  const detail = page.locator(".product-depth details").first();
  await detail.locator("summary").tap();
  await expect(detail).toHaveAttribute("open", "");
  await expect(detail.locator("p")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.locator("#inicio").scrollIntoViewIfNeeded();
  // Native scrolling updates DOM on one frame and the independent canvas on the next.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({ path: testInfo.outputPath("touch-390.png") });
  await context.close();
});
