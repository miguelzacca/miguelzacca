import { test, expect } from "@playwright/test";

async function settleAt(page, selector, fraction = 0.5) {
  await page.locator(selector).evaluate((el, fraction) => {
    const r = el.getBoundingClientRect();
    window.scrollTo({
      top:
        r.top + window.scrollY + r.height / 2 - window.innerHeight * fraction,
      behavior: "instant",
    });
  }, fraction);
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 834, height: 1112 },
  { width: 1366, height: 600 },
  { width: 390, height: 844 },
]) {
  test(`the same canvas travels, frames real content and reverses at ${viewport.width}x${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const canvas = page.locator("#signature-canvas");
    await expect(canvas).toHaveAttribute("data-ready", "true");
    await expect(canvas).toHaveAttribute("data-mode", "journey");
    await canvas.evaluate((c) => {
      c.dataset.instanceCheck = "original";
    });
    for (const selector of [
      ".assembly__space",
      ".engineering-map",
      ".about-monogram",
      ".contact-emblem",
      ".about-monogram",
      ".engineering-map",
      ".assembly__space",
    ]) {
      await settleAt(
        page,
        selector,
        selector === ".engineering-map"
          ? 0.51
          : selector === ".about-monogram"
            ? 0.45
            : 0.48,
      );
      await expect(canvas).toHaveAttribute("data-instance-check", "original");
      const state = await page.evaluate(async () => {
        const { createJourney } = await import("/journey.js");
        const director = createJourney();
        director.measure();
        return director.state(window.scrollY, 1, false);
      });
      for (const value of [
        state.unitScale,
        state.bounds.x,
        state.bounds.y,
        ...state.rotation,
      ])
        expect(Number.isFinite(value)).toBe(true);
      expect(state.unitScale).toBeGreaterThan(0);
      expect(state.bounds.x).toBeGreaterThanOrEqual(-20);
      expect(state.bounds.x).toBeLessThanOrEqual(viewport.width + 20);
      if (selector === ".engineering-map")
        expect([state.fromPose, state.toPose]).toContain("network");
      if (selector === ".about-monogram")
        expect([state.fromPose, state.toPose]).toContain("resolved");
    }
    if (viewport.width > 1000 && viewport.height >= 650) {
      await page.locator(".product-story").evaluate((el) =>
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - 60,
          behavior: "instant",
        }),
      );
    } else await settleAt(page, '[data-screen="0"] .screen-button');
    await expect(canvas).toHaveAttribute("data-to-pose", "frame");
    const alignment = await page.evaluate(async () => {
      const { createJourney } = await import("/journey.js");
      const d = createJourney();
      d.measure();
      const s = d.state(window.scrollY, 1, false);
      const r = document
        .querySelector('[data-screen="0"] .screen-button')
        .getBoundingClientRect();
      return {
        x: s.bounds.x - (r.left + r.width / 2),
        y: s.bounds.y - (r.top + r.height / 2),
        aspect: s.frameAspect,
        actual:
          (r.width + (window.innerWidth <= 700 ? 8 : 22)) /
          (r.height + (window.innerWidth <= 700 ? 8 : 22)),
      };
    });
    expect(Math.abs(alignment.x)).toBeLessThan(1);
    expect(Math.abs(alignment.y)).toBeLessThan(1);
    expect(alignment.aspect).toBeCloseTo(alignment.actual, 3);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("html")).not.toHaveClass(/has-journey/);
    await expect(
      page.locator(".contact-emblem .signature-fallback"),
    ).toBeVisible();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await expect(page.locator("html")).toHaveClass(/has-journey/);
    await expect(canvas).toHaveAttribute("data-instance-check", "original");
    expect(
      await canvas.evaluate(
        (c) => getComputedStyle(c.parentElement).pointerEvents,
      ),
    ).toBe("none");
  });
}

test("blocked choreography keeps the full case and direct contact available", async ({
  page,
}) => {
  await page.route("**/journey.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator(".story-figure")).toHaveCount(3);
  await expect(page.locator(".scale-number")).toHaveText("750mil+");
  await expect(
    page.locator('#contato a[href="mailto:contato@conecteimob.com.br"]'),
  ).toBeVisible();
});

test("a short touch opening defers the graphics until its sculpture enters view", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 320 });
  await page.goto("/");
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((r) => r.name.endsWith("/signature.js")),
    ),
  ).toBe(false);
  await page.locator(".identity-study").scrollIntoViewIfNeeded();
  await expect(page.locator("#signature-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
});

test("a delayed graphics download never flashes the assembled fallback before the first exploded frame", async ({
  page,
}, testInfo) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/assets/signature.js", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const fallback = page.locator(".hero__sculpture .signature-fallback");
  await expect(page.locator("html")).toHaveClass(/signature-pending/);
  await expect(fallback).toBeHidden();
  await page.evaluate(() => {
    const canvas = document.querySelector("#signature-canvas");
    const observer = new MutationObserver(() => {
      if (canvas.dataset.ready === "true") {
        window.firstSignatureFrame = { ...canvas.dataset };
        observer.disconnect();
      }
    });
    observer.observe(canvas, {
      attributes: true,
      attributeFilter: ["data-ready"],
    });
  });
  await page.waitForTimeout(1200);
  await expect(fallback).toBeHidden();
  await expect(page.locator(".signature-scene")).toHaveCSS("opacity", "0");
  await page.screenshot({
    path: testInfo.outputPath("before-graphics-no-flash.png"),
  });
  release();
  await expect(page.locator("#signature-canvas")).toHaveAttribute(
    "data-ready",
    "true",
  );
  const first = await page.evaluate(() => window.firstSignatureFrame);
  expect(first.fromPose).toBe("exploded");
  expect(first.toPose).toBe("resolved");
  expect(Number(first.morph)).toBe(0);
  await expect(fallback).toBeHidden();
  await expect(page.locator("html")).not.toHaveClass(/signature-pending/);
  await expect(page.locator("#signature-canvas")).toHaveAttribute(
    "data-morph",
    "1.000",
  );
});

test("a blocked main module restores the deliberate static mark", async ({
  page,
}) => {
  await page.route("**/script.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/signature-pending/);
  await expect(
    page.locator(".hero__sculpture .signature-fallback"),
  ).toBeVisible();
});
