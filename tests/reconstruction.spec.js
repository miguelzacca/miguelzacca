import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("a notebook opening includes identity, proposition and both next steps", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const selector of [
    ".hero__pretitle",
    "h1",
    ".hero__description",
    ".hero__actions",
  ]) {
    await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
  }
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .some((entry) => entry.name.endsWith("/signature.js")),
    ),
  ).toBe(false);
});

test("the product sequence reverses and survives moving between desktop and touch compositions", async ({
  page,
}) => {
  await page.goto("/#pesquisa");
  for (const index of [0, 1, 2, 1, 0]) {
    await page.locator(`[data-step="${index}"]`).scrollIntoViewIfNeeded();
    const figure = page.locator(`[data-screen="${index}"]`);
    await expect(figure).toHaveClass(/is-active/);
    await expect(figure.locator("a")).not.toHaveAttribute("inert");
    await expect
      .poll(() => figure.locator("img").evaluate((img) => img.naturalWidth))
      .toBe(1440);
    await expect(
      page.locator(".story-stage .story-figure:not(.is-active)"),
    ).toHaveCount(2);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".story-stage figure")).toHaveCount(0);
  for (const step of await page.locator(".story-step").all()) {
    await expect(step.locator("figure")).toBeVisible();
    await expect(step.locator("figure")).not.toHaveAttribute("aria-hidden");
  }
  await page.setViewportSize({ width: 1366, height: 600 });
  await expect(page.locator(".story-stage figure")).toHaveCount(0);
  await page.setViewportSize({ width: 1366, height: 768 });
  await expect(page.locator(".story-stage figure")).toHaveCount(3);
});

test("engineering responds to keyboard and exposes each responsibility without losing focus", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#engenharia");
  await page.locator('[data-node="interface"]').focus();
  for (const key of ["aplicacao", "dados", "servicos", "interface"]) {
    await page.keyboard.press("ArrowRight");
    const button = page.locator(`[data-node="${key}"]`);
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(`[data-detail="${key}"]`)).toBeVisible();
    await expect(page.locator("[data-detail]:not([hidden])")).toHaveCount(1);
    const audit = await new AxeBuilder({ page })
      .include(".engineering-explorer")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
  await page.goto("/#detail-dados");
  await expect(page.locator("#detail-dados")).toBeVisible();
});

test("menu traps keyboard focus and authorized channels have real labelled destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.locator("[data-menu-open]").click();
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() =>
        Boolean(document.activeElement.closest("#site-menu")),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  const destinations = [
    "https://wa.me/5547997431069",
    "mailto:contato@conecteimob.com.br",
    "https://www.instagram.com/mz_miguelzacca/",
    "https://www.instagram.com/conectei.imob/",
  ];
  for (const href of destinations) {
    const link = page.locator(`#contato a[href="${href}"]`);
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText(/\S+/);
  }
});

test("assembly can be separated and reunited without changing document layout", async ({
  page,
}) => {
  await page.goto("/");
  const button = page.locator("[data-assembly-toggle]");
  await expect(button).toBeVisible();
  const before = await page.locator(".identity-study").boundingBox();
  await button.click();
  await expect(button).toHaveText(/Reunir peças/);
  await expect(button).toHaveAttribute("aria-pressed", "true");
  await page.waitForTimeout(1600);
  expect(await page.locator(".identity-study").boundingBox()).toEqual(before);
  await button.click();
  await expect(button).toHaveText(/Separar peças/);
  await expect(button).toHaveAttribute("aria-pressed", "false");
});
