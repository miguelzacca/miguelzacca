import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const onion =
  "http://hdwlsilq4x73cpco4wpn73tylmfuswdfzrlk5wisgu247wff3om7emad.onion";
const download = "https://download.torproject.org/";
const installing =
  "https://support.torproject.org/tor-browser/getting-started/installing/";

async function showConsole(page) {
  await page.locator(".network-console").scrollIntoViewIfNeeded();
  await expect(
    page.getByRole("button", { name: "Copiar endereço" }),
  ).toBeVisible();
}

test("alternate destination stays exact, static and outside primary SEO", async ({
  page,
}) => {
  const onionRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith(".onion"))
      onionRequests.push(request.url());
  });
  await page.goto("/");
  await showConsole(page);
  await expect(page.locator("[data-onion-link]")).toHaveAttribute(
    "href",
    onion,
  );
  await expect(page.locator("#onion-address")).toHaveText(onion.slice(7));
  for (const url of [onion, download, installing]) {
    const link = page.locator(`.network-layer a[href="${url}"]`);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  await expect(page.locator('[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://miguelzacca.dev/",
  );
  await expect(page.locator('[property="og:url"]')).toHaveAttribute(
    "content",
    "https://miguelzacca.dev/",
  );
  expect(await readFile("sitemap.xml", "utf8")).not.toContain(".onion");
  expect(await readFile("dist/sitemap.xml", "utf8")).not.toContain(".onion");
  expect(await readFile("dist/index.html", "utf8")).toContain(
    `href="${onion}"`,
  );
  expect(await readFile("README.md", "utf8")).toContain(`\`${onion}\``);
  expect(onionRequests).toEqual([]);
});

test("keyboard copies the real address through Clipboard API and retains focus", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await showConsole(page);
  const button = page.locator("[data-copy-onion]");
  await button.focus();
  await page.keyboard.press("Space");
  await expect(button).toHaveText("Copiado");
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(onion);
  await expect(button).toBeFocused();
  await expect(button).toHaveCSS("outline-style", "solid");
  await expect(page.locator("[data-copy-status]")).toHaveText(
    "Copiado // pronto para colar.",
  );
  for (const href of [onion, download, installing]) {
    await page.keyboard.press("Tab");
    const link = page.locator(`.network-layer a[href="${href}"]`);
    await expect(link).toBeFocused();
    await expect(link).toBeInViewport();
    await expect(link).toHaveCSS("outline-style", "solid");
  }
  await page.keyboard.press("Tab");
  await expect(page.locator(".footer-name")).toBeFocused();
});

for (const mode of ["missing", "denied"]) {
  test(`clipboard fallback copies with the modern API ${mode}`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((mode) => {
      window.readClipboardForTest = navigator.clipboard.readText.bind(
        navigator.clipboard,
      );
      Object.defineProperty(navigator, "clipboard", {
        value:
          mode === "missing"
            ? undefined
            : {
                writeText: () => Promise.reject(new Error("Permission denied")),
              },
      });
    }, mode);
    await page.goto("/");
    await showConsole(page);
    const button = page.locator("[data-copy-onion]");
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(button).toHaveText("Copiado");
    expect(await page.evaluate(() => window.readClipboardForTest())).toBe(
      onion,
    );
    await expect(button).toBeFocused();
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(button).toHaveText("Copiar endereço", { timeout: 5000 });
  });
}

test("blocked clipboard methods offer manual selection without a false success", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
    document.execCommand = () => false;
  });
  await page.goto("/");
  await showConsole(page);
  await page.getByRole("button", { name: "Copiar endereço" }).click();
  await expect(page.locator("[data-copy-status]")).toHaveText(
    "Selecione e copie o endereço acima.",
  );
  await expect(page.locator("#onion-address")).toBeFocused();
  expect(await page.evaluate(() => window.getSelection().toString())).toBe(
    onion.slice(7),
  );
  await expect(
    page.getByRole("button", { name: "Copiar endereço" }),
  ).toBeVisible();
});

test("responsive address, touch targets and accessible guide from 320px to ultrawide", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920, 2560]) {
    await page.setViewportSize({ width, height: 900 });
    await showConsole(page);
    const result = await page.locator(".network-layer").evaluate((section) => {
      const viewport = document.documentElement.clientWidth;
      const code = section.querySelector("code");
      const range = document.createRange();
      range.selectNodeContents(code);
      return {
        overflow: document.documentElement.scrollWidth > viewport,
        textOverflow: [...range.getClientRects()].some(
          (r) => r.right > viewport || r.left < 0,
        ),
        smallTargets: [...section.querySelectorAll("a, button")]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width < 44 || r.height < 44;
          })
          .map((el) => el.textContent),
      };
    });
    expect(result, `viewport ${width}`).toEqual({
      overflow: false,
      textOverflow: false,
      smallTargets: [],
    });
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.locator(".network-guide").scrollIntoViewIfNeeded();
    const audit = await new AxeBuilder({ page })
      .include(".network-layer")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});

test("entrances pause offscreen, end after settling and respect motion changes", async ({
  page,
}) => {
  await page.goto("/");
  expect(
    await page
      .locator(".network-layer")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await showConsole(page);
  await expect(page.locator(".network-console")).toHaveClass(/is-revealed/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".network-layer")
      .evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
  await expect(page.locator(".network-terminal__end")).toHaveCSS(
    "opacity",
    "1",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.locator("#inicio").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator(".network-layer")
        .evaluate(
          (el) =>
            el
              .getAnimations({ subtree: true })
              .filter((a) => a.playState === "running").length,
        ),
    )
    .toBe(0);
  await showConsole(page);
  await expect
    .poll(
      () =>
        page
          .locator(".network-console")
          .evaluate(
            (el) =>
              el
                .getAnimations({ subtree: true })
                .filter((a) => a.playState === "running").length,
          ),
      { timeout: 6000 },
    )
    .toBe(0);
});

test("no JavaScript leaves the destination, downloads and guide usable", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 740 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/#outra-rota`);
  await expect(page.locator("#network-title")).toBeVisible();
  await expect(page.locator("#onion-address")).toHaveText(onion.slice(7));
  await expect(page.locator("[data-copy-onion]")).toBeHidden();
  await expect(page.locator(`a[href="${download}"]`)).toBeVisible();
  await expect(page.locator(".network-guide")).toContainText(
    "Não existe Tor Browser oficial para iOS",
  );
  await context.close();
});

test("adding the epilogue preserves the original sculpture score and lets it exit", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  const comparison = await page.evaluate(async () => {
    const { createJourney } = await import("/journey.js");
    const section = document.querySelector(".network-layer");
    const parent = section.parentElement;
    const withEpilogue = createJourney();
    withEpilogue.measure();
    const positions = [
      0,
      ...[".assembly__space", ".about-monogram", ".contact-emblem"].map(
        (selector) => {
          const r = document.querySelector(selector).getBoundingClientRect();
          return (
            r.top + window.scrollY + r.height / 2 - window.innerHeight * 0.48
          );
        },
      ),
    ];
    const actual = positions.map((y) => withEpilogue.state(y, 1, false));
    section.remove();
    const withoutEpilogue = createJourney();
    withoutEpilogue.measure();
    const expected = positions.map((y) => withoutEpilogue.state(y, 1, false));
    parent.append(section);
    return { actual, expected };
  });
  expect(comparison.actual).toEqual(comparison.expected);
  await page.locator(".network-guide").scrollIntoViewIfNeeded();
  await expect(page.locator("#signature-canvas")).toHaveCSS("opacity", "0");
  await page.locator(".about-monogram").scrollIntoViewIfNeeded();
  await expect(page.locator("#signature-canvas")).toHaveCSS("opacity", "1");
});
