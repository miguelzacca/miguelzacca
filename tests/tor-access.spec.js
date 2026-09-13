import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const onion =
  "http://hdwlsilq4x73cpco4wpn73tylmfuswdfzrlk5wisgu247wff3om7emad.onion";
const download = "https://download.torproject.org/";
const installing =
  "https://support.torproject.org/tor-browser/getting-started/installing/";

async function openGuide(page) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#outra-rota");
  const trigger = page.locator("[data-tor-access]");
  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await trigger.click();
  const dialog = page.locator("#tor-access-dialog");
  await expect(dialog).toBeVisible();
  return { trigger, dialog };
}

test("Onion activation always opens the guide without navigation, popup or network probe", async ({
  page,
  context,
}) => {
  const unexpected = [];
  page.on("request", (request) => {
    if (
      new URL(request.url()).origin !==
      new URL(test.info().project.use.baseURL).origin
    )
      unexpected.push(request.url());
  });
  const { trigger, dialog } = await openGuide(page);
  const originalURL = page.url();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  for (const activation of [
    "keyboard",
    "space",
    "control",
    "shift",
    "middle",
  ]) {
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    if (activation === "keyboard") await page.keyboard.press("Enter");
    else if (activation === "space") await page.keyboard.press("Space");
    else if (activation === "middle") await trigger.click({ button: "middle" });
    else
      await trigger.click({
        modifiers: [activation === "control" ? "Control" : "Shift"],
      });
    await expect(dialog).toBeVisible();
    expect(page.url()).toBe(originalURL);
    expect(context.pages()).toHaveLength(1);
  }
  expect(unexpected).toEqual([]);
  await dialog.locator("[data-tor-close]").click();
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  expect(page.url()).toBe(originalURL);
});

test("native modal isolates background and cycles focus through every action", async ({
  page,
}) => {
  const { trigger, dialog } = await openGuide(page);
  const close = dialog.locator("[data-tor-close]");
  await expect(close).toBeFocused();
  await expect(page.locator("body")).toHaveCSS("overflow", "hidden");
  await page.locator(".footer-name").evaluate((el) => el.focus());
  await expect(close).toBeFocused();
  const actions = [
    "[data-tor-download]",
    `a[href="${installing}"]`,
    "[data-tor-destination]",
    "[data-tor-copy]",
    "[data-tor-close]",
  ];
  for (const selector of actions) {
    await page.keyboard.press("Tab");
    await expect(dialog.locator(selector)).toBeFocused();
    await expect(dialog.locator(selector)).toBeInViewport();
    await expect(dialog.locator(selector)).toHaveCSS("outline-style", "solid");
  }
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.locator("[data-tor-copy]")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("body")).not.toHaveCSS("overflow", "hidden");

  await page.setViewportSize({ width: 390, height: 844 });
  const menuTrigger = page.locator("[data-menu-open]");
  await menuTrigger.click();
  await expect(page.locator("#site-menu")).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toBeFocused();
});

test("explicit exit links open only their exact destinations in separate tabs", async ({
  page,
  context,
}) => {
  // Intercept outbound navigation locally: never contact the Onion service.
  await context.route(
    (url) => [download, installing, `${onion}/`].includes(url.href),
    (route) =>
      route.fulfill({ contentType: "text/html", body: "Destination verified" }),
  );
  const { dialog } = await openGuide(page);
  const originalURL = page.url();
  for (const href of [download, installing, onion]) {
    const link = dialog.locator(`a[href="${href}"]`);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    const popupPromise = page.waitForEvent("popup");
    await link.click();
    const popup = await popupPromise;
    await popup.waitForURL(href === onion ? `${href}/` : href);
    await expect(popup.locator("body")).toHaveText("Destination verified");
    await popup.close();
    await expect(dialog).toBeVisible();
    expect(page.url()).toBe(originalURL);
  }
});

for (const mode of ["modern", "missing", "denied"]) {
  test(`dialog copies the complete exact address with Clipboard API ${mode}`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    if (mode !== "modern")
      await page.addInitScript((mode) => {
        window.readClipboardForTest = navigator.clipboard.readText.bind(
          navigator.clipboard,
        );
        Object.defineProperty(navigator, "clipboard", {
          value:
            mode === "missing"
              ? undefined
              : {
                  writeText: () =>
                    Promise.reject(new Error("Permission denied")),
                },
        });
      }, mode);
    const { dialog } = await openGuide(page);
    const button = dialog.locator("[data-tor-copy]");
    await button.focus();
    await page.keyboard.press("Space");
    await expect(button).toHaveText("Copiado");
    const copied = await page.evaluate(() =>
      window.readClipboardForTest
        ? window.readClipboardForTest()
        : navigator.clipboard.readText(),
    );
    expect(copied).toBe(onion);
    await expect(button).toBeFocused();
    await expect(dialog.locator("[data-tor-copy-status]")).toHaveText(
      "Copiado // pronto para colar.",
    );
    await expect(dialog.locator("[data-tor-copy-status]")).toHaveAttribute(
      "aria-live",
      "polite",
    );
    await expect(page.locator("textarea")).toHaveCount(0);
    await expect(button).toHaveText("Copiar endereço", { timeout: 5000 });
  });
}

test("blocked copy methods select the full URL without false success", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: undefined });
    document.execCommand = () => false;
  });
  const { trigger, dialog } = await openGuide(page);
  await dialog.locator("[data-tor-copy]").click();
  await expect(dialog.locator("#tor-access-address")).toBeFocused();
  expect(await page.evaluate(() => window.getSelection().toString())).toBe(
    onion,
  );
  await expect(dialog.locator("[data-tor-copy-status]")).toHaveText(
    "Selecione e copie o endereço acima.",
  );
  await expect(dialog.locator("[data-tor-copy]")).not.toHaveAttribute(
    "data-copied",
  );
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
});

test("a delayed clipboard denial cannot reopen or steal focus from a closed guide", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: () =>
          new Promise((_, reject) => {
            window.rejectClipboardForTest = reject;
          }),
      },
    });
  });
  const { trigger, dialog } = await openGuide(page);
  await dialog.locator("[data-tor-copy]").click();
  await expect(dialog.locator("[data-tor-copy]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await page.keyboard.press("Escape");
  await page.evaluate(() =>
    window.rejectClipboardForTest(new Error("Permission denied")),
  );
  await expect(trigger).toBeFocused();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator("textarea")).toHaveCount(0);
  await trigger.click();
  await expect(dialog.locator("[data-tor-copy]")).not.toHaveAttribute(
    "aria-busy",
  );
  await expect(dialog.locator("[data-tor-copy-status]")).toHaveText(
    "Copie e cole no Tor Browser.",
  );
});

test("mobile scrolling, hostname, accessible dialog and reduced motion", async ({
  page,
}) => {
  const { dialog } = await openGuide(page);
  for (const [width, height] of [
    [320, 568],
    [375, 812],
    [390, 844],
    [430, 932],
    [768, 1024],
    [1024, 768],
    [1440, 900],
  ]) {
    await page.setViewportSize({ width, height });
    await dialog
      .locator(".tor-access__scroll")
      .evaluate((el) => (el.scrollTop = 0));
    const layout = await dialog.evaluate((el) => {
      const scroll = el.querySelector(".tor-access__scroll");
      const code = el.querySelector("code");
      const range = document.createRange();
      range.selectNodeContents(code);
      const r = el.getBoundingClientRect();
      return {
        overflow:
          el.scrollWidth > el.clientWidth ||
          scroll.scrollWidth > scroll.clientWidth ||
          document.documentElement.scrollWidth > window.innerWidth,
        clippedDialog: r.top < 0 || r.bottom > window.innerHeight,
        textOverflow: [...range.getClientRects()].some(
          (rect) => rect.left < r.left || rect.right > r.right,
        ),
        smallTargets: [...el.querySelectorAll("a, button")]
          .filter((item) => item.getBoundingClientRect().height < 44)
          .map((item) => item.textContent),
        animations: el.getAnimations({ subtree: true }).length,
        address: code.textContent,
      };
    });
    expect(layout, `viewport ${width}`).toEqual({
      overflow: false,
      clippedDialog: false,
      textOverflow: false,
      smallTargets: [],
      animations: 0,
      address: onion,
    });
    if (width === 320)
      await expect(dialog.locator("[data-tor-download]")).toBeInViewport({
        ratio: 1,
      });
    await dialog.locator("[data-tor-copy]").scrollIntoViewIfNeeded();
    await expect(dialog.locator("[data-tor-copy]")).toBeInViewport();
    await expect(dialog.locator("[data-tor-close]")).toBeInViewport();
  }
  await expect(dialog).toHaveAccessibleName("Essa rota precisa do Tor.");
  await expect(dialog).toHaveAccessibleDescription(
    /Endereços .onion existem na rede Tor/,
  );
  // Inspect the browser's accessibility tree: DOM snapshots do not account for
  // the implicit inertness of showModal() and can include the background.
  const session = await page.context().newCDPSession(page);
  const { nodes } = await session.send("Accessibility.getFullAXTree");
  const exposed = nodes.filter((node) => !node.ignored);
  const accessibleDialog = exposed.find(
    (node) => node.role?.value === "dialog",
  );
  expect(accessibleDialog.name.value).toBe("Essa rota precisa do Tor.");
  expect(
    accessibleDialog.properties.find((property) => property.name === "modal")
      .value.value,
  ).toBe(true);
  expect(
    exposed.some((node) => node.name?.value === "Navegação principal"),
  ).toBe(false);
  await session.detach();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});

test("without JavaScript the trigger stays navigable and primary SEO stays unchanged", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 320, height: 568 },
  });
  const page = await context.newPage();
  await page.goto(`${baseURL}/#outra-rota`);
  const trigger = page.locator("[data-tor-access]");
  await expect(trigger).toHaveAttribute("href", onion);
  await expect(trigger).not.toHaveAttribute("role", "button");
  await expect(trigger).toBeVisible();
  await expect(page.locator("#tor-access-dialog")).toBeHidden();
  await expect(
    page.locator(`.network-guide a[href="${download}"]`),
  ).toBeVisible();
  await expect(page.locator('[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://miguelzacca.dev/",
  );
  await expect(page.locator('[property="og:url"]')).toHaveAttribute(
    "content",
    "https://miguelzacca.dev/",
  );
  expect(await readFile("sitemap.xml", "utf8")).not.toContain(".onion");
  expect(await readFile("onion/index.html", "utf8")).not.toMatch(/<script\b/i);
  await context.close();
});
