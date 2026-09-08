import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const sections = ["inicio", "conectei", "capacidades", "sobre", "contato"];
const viewports = [
  { name: "wide-desktop", width: 1920, height: 1080 },
  { name: "desktop", width: 1440, height: 1000 },
  { name: "notebook", width: 1280, height: 800 },
  { name: "tablet", width: 834, height: 1112 },
  { name: "mobile", width: 390, height: 844 },
  { name: "small-mobile", width: 320, height: 740 },
  { name: "mobile-landscape", width: 844, height: 390 },
];

async function checkHorizontalOverflow(page) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    return {
      width,
      scrollWidth: document.documentElement.scrollWidth,
      offenders: [
        ...document.querySelectorAll(
          "main h1, main h2, main h3, main p, main a, main button, header",
        ),
      ]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return (
            style.visibility !== "hidden" &&
            rect.width > 0 &&
            (rect.right > width + 1 || rect.left < -1)
          );
        })
        .slice(0, 8)
        .map((element) => ({
          tag: element.tagName,
          class: element.className,
          text: element.textContent.trim().slice(0, 80),
        })),
    };
  });
  expect(result.scrollWidth, JSON.stringify(result)).toBeLessThanOrEqual(
    result.width + 1,
  );
  expect(
    result.offenders,
    "Readable content must stay inside the viewport.",
  ).toEqual([]);
}

async function expectReadableHeading(locator) {
  const hiddenText = await locator.evaluate((heading) => {
    const walker = document.createTreeWalker(heading, 4);
    const hidden = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!node.textContent.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const rect = range.getBoundingClientRect();
      let parent = node.parentElement;
      while (parent) {
        const style = getComputedStyle(parent);
        const bounds = parent.getBoundingClientRect();
        const transparent =
          Number(style.opacity) === 0 ||
          style.visibility === "hidden" ||
          style.display === "none";
        const clipped =
          ["hidden", "clip"].includes(style.overflowY) &&
          (rect.bottom <= bounds.top || rect.top >= bounds.bottom);
        if (transparent || clipped) {
          hidden.push(node.textContent.trim());
          break;
        }
        parent = parent.parentElement;
      }
    }
    return hidden;
  });
  expect(
    hiddenText,
    "Text must not remain transparent or outside a clipping mask.",
  ).toEqual([]);
}

for (const viewport of viewports) {
  test(`layout and all chapters remain readable: ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    for (const id of sections) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await checkHorizontalOverflow(page);
      await expect(
        page.locator(`#${id}`).locator("h1, h2").first(),
      ).toBeVisible();
    }
    await page.locator("#inicio").scrollIntoViewIfNeeded();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: testInfo.outputPath(`${viewport.name}.png`),
      fullPage: true,
    });
  });
}

test("local resources, semantic content, and runtime load without errors", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (
      response.url().startsWith("http://127.0.0.1:4173") &&
      response.status() >= 400
    ) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });
  await page.goto("/");
  await expect(page.locator('[data-ready="true"]')).toBeAttached();
  await expect(page.locator("h1")).toHaveCount(1);
  for (const id of sections) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
  }
  for (const image of await page.locator("main img").all()) {
    if (await image.isVisible()) await image.scrollIntoViewIfNeeded();
  }
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((image) => !image.complete || image.naturalWidth === 0)
            .map((image) => image.src),
        ),
    )
    .toEqual([]);
  expect(errors).toEqual([]);
});

test("mobile navigation releases focus and scroll on Escape and resize", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const trigger = page.locator("[data-menu-open]");
  const menu = page.locator(".site-menu");
  await trigger.click();
  await expect(menu).toHaveAttribute("open", "");
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await menu.locator('a[href="#conectei"]').click();
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(page).toHaveURL(/#conectei$/);
  await trigger.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(menu).not.toHaveAttribute("open", "");
  expect(await page.locator("main").evaluate((main) => main.inert)).toBe(false);
  expect(
    await page
      .locator("body")
      .evaluate((body) => getComputedStyle(body).overflowY),
  ).not.toBe("hidden");
  await page.locator("#contato").scrollIntoViewIfNeeded();
  await expect(page.locator("#contato h2")).toBeInViewport();
});

test("keyboard can skip navigation and open and close real product screenshots", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.locator(".skip-link")).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#conteudo$/);
  const opener = page.locator("[data-image-open]").first();
  await opener.scrollIntoViewIfNeeded();
  await opener.focus();
  await page.keyboard.press("Enter");
  const dialog = page.locator("dialog[open]");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() => dialog.locator("img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThanOrEqual(1000);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(opener).toBeFocused();
});

test("anchors, scroll reversal, restored position and resizing preserve the scene", async ({
  page,
}, testInfo) => {
  await page.goto("/#conectei");
  await expect(page.locator('[data-ready="true"]')).toBeAttached();
  await expect(page.locator("#conectei h2").first()).toBeInViewport();
  for (const id of ["contato", "sobre", "conectei", "inicio"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(
      page.locator(`#${id}`).locator("h1, h2").first(),
    ).toBeVisible();
  }
  const transition = page.locator("#conectei");
  const y = await transition.evaluate((element) => element.offsetTop);
  for (const [frame, position] of [
    ["before", y - 900],
    ["middle", y - 450],
    ["after", y + 100],
  ]) {
    await page.evaluate(
      (top) => window.scrollTo({ top, behavior: "instant" }),
      Math.max(0, position),
    );
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({
      path: testInfo.outputPath(`transition-${frame}.png`),
    });
  }
  await page.reload();
  await expect(page.locator('[data-ready="true"]')).toBeAttached();
  await page.setViewportSize({ width: 834, height: 1112 });
  await checkHorizontalOverflow(page);
});

test("without JavaScript the title, facts, navigation and product remain available", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator("h1")).toBeVisible();
  await expectReadableHeading(page.locator("h1"));
  for (const id of sections) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(
      page.locator(`#${id}`).locator("h1, h2").first(),
    ).toBeVisible();
  }
  const values = await page.locator("[data-count]").allTextContents();
  expect(values.every((value) => Number(value.replace(/[^\d]/g, "")) > 0)).toBe(
    true,
  );
  await expect(page.locator(".product-facts dd")).toHaveText([
    "01",
    "06",
    "1.700+",
    "600K+",
  ]);
  await expect(
    page.locator('a[href="https://github.com/miguelzacca"]').first(),
  ).toBeVisible();
  await checkHorizontalOverflow(page);
  await context.close();
});

test("blocked scene bundle leaves a composed and navigable fallback", async ({
  page,
}) => {
  await page.route("**/assets/signature.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator('[data-ready="true"]')).toHaveCount(0);
  await page
    .locator('a[href="#conectei"]')
    .filter({ visible: true })
    .first()
    .click();
  await expect(page).toHaveURL(/#conectei$/);
  await page.locator("#contato").scrollIntoViewIfNeeded();
  await expect(page.locator("#contato h2")).toBeVisible();
});

test("WebGL context loss restores the static sculpture and leaves navigation usable", async ({
  page,
}) => {
  await page.goto("/");
  const canvas = page.locator("#signature-canvas");
  await expect(canvas).toHaveAttribute("data-ready", "true");
  const supported = await canvas.evaluate((element) => {
    const context = element.getContext("webgl2");
    const extension = context?.getExtension("WEBGL_lose_context");
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(supported).toBe(true);
  await expect(canvas).toHaveAttribute("data-ready", "false");
  await expect(
    page.locator(".hero__sculpture .signature-fallback"),
  ).toBeVisible();
  await page.locator("#contato").scrollIntoViewIfNeeded();
  await expect(page.locator("#contato h2")).toBeVisible();
});

test("unavailable WebGL preserves a deliberate fallback", async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (
        kind === "webgl" ||
        kind === "webgl2" ||
        kind === "experimental-webgl"
      )
        return null;
      return original.call(this, kind, ...args);
    };
  });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(
    page.locator(".hero__sculpture .signature-fallback"),
  ).toBeVisible();
  await expect(page.locator('[data-ready="true"]')).toHaveCount(0);
});

test("blocked main script cannot hide the title or factual content", async ({
  page,
}) => {
  await page.route("**/script.js", (route) => route.abort("failed"));
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expectReadableHeading(page.locator("h1"));
  for (const id of sections) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(
      page.locator(`#${id}`).locator("h1, h2").first(),
    ).toBeVisible();
  }
});

test("reduced motion can be changed during the visit without hiding content", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('[data-ready="true"]')).toBeAttached();
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
  ).toBe("auto");
  for (const id of ["conectei", "contato", "inicio"]) {
    await page.locator(`#${id}`).scrollIntoViewIfNeeded();
    await expect(
      page.locator(`#${id}`).locator("h1, h2").first(),
    ).toBeVisible();
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("h1")).toBeVisible();
});

for (const viewport of [viewports[1], viewports[4]]) {
  test(`WCAG A/AA automated audit: ${viewport.name}`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    await testInfo.attach("axe-results.json", {
      body: JSON.stringify(results, null, 2),
      contentType: "application/json",
    });
    expect(
      results.violations.map((violation) => ({
        id: violation.id,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      })),
    ).toEqual([]);
  });
}
