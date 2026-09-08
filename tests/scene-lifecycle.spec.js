import { test, expect } from "@playwright/test";

test("scene rests after settling and stops frames offscreen, in a hidden tab, on reduced motion and after disposal", async ({
  page,
}) => {
  await page.route("**/scene-check", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="pt-BR"><title>Scene lifecycle test</title><canvas id="test-canvas"></canvas></html>',
    }),
  );
  await page.goto("/scene-check");
  await page.evaluate(async () => {
    window.frameCount = 0;
    window.sceneErrors = [];
    window.testHidden = false;
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => window.testHidden,
    });
    const request = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) =>
      request((time) => {
        window.frameCount += 1;
        callback(time);
      });
    const { createSignature } = await import("/assets/signature.js");
    window.testScene = createSignature(document.querySelector("canvas"), {
      onError: (error) => window.sceneErrors.push(error.message),
    });
    window.testScene.resize(900, 700);
    window.testScene.update({
      bounds: { x: 450, y: 350, width: 650, height: 600 },
    });
  });
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  await expect
    .poll(() => page.evaluate(() => window.frameCount))
    .toBeGreaterThan(2);

  await page.waitForTimeout(2300);
  const restingAt = await page.evaluate(() => window.frameCount);
  await page.waitForTimeout(250);
  expect(
    await page.evaluate(() => window.frameCount),
    "Idle sculpture must stop drawing after settling.",
  ).toBe(restingAt);
  await page.evaluate(() =>
    window.testScene.update({ pointer: { x: 0.5, y: 0.2 } }),
  );
  await expect
    .poll(() => page.evaluate(() => window.frameCount))
    .toBeGreaterThan(restingAt);

  for (const reason of ["inactive", "hidden", "reduced"]) {
    await page.evaluate((mode) => {
      if (mode === "inactive") window.testScene.update({ active: false });
      if (mode === "hidden") {
        window.testHidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
      }
      if (mode === "reduced") window.testScene.update({ reducedMotion: true });
    }, reason);
    // A pending frame may finish once; continued animation must then cease.
    await page.waitForTimeout(150);
    const stoppedAt = await page.evaluate(() => window.frameCount);
    await page.waitForTimeout(220);
    expect(await page.evaluate(() => window.frameCount), reason).toBe(
      stoppedAt,
    );
    await page.evaluate(() => {
      window.testHidden = false;
      window.testScene.update({ active: true, reducedMotion: false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect
      .poll(() => page.evaluate(() => window.frameCount))
      .toBeGreaterThan(stoppedAt);
  }

  await page.evaluate(() => window.testScene.dispose());
  const disposedAt = await page.evaluate(() => window.frameCount);
  await page.evaluate(() => {
    window.testScene.update({ mode: "contact", progress: 1 });
    window.testScene.resize(500, 800);
    window.testScene.dispose();
  });
  await page.waitForTimeout(220);
  expect(await page.evaluate(() => window.frameCount)).toBe(disposedAt);
  expect(await page.evaluate(() => window.sceneErrors)).toEqual([]);
});
