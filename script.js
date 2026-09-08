/* Native scrolling is the timeline. DOM remains complete if enhancement fails. */
(() => {
  "use strict";
  const root = document.documentElement;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(pointer: fine)");
  const mobile = matchMedia("(max-width: 600px)");
  const narrow = matchMedia("(max-width: 800px)");
  const header = document.querySelector(".site-header");
  const menu = document.querySelector(".site-menu");
  const menuTrigger = document.querySelector("[data-menu-open]");
  const imageDialog = document.querySelector("#image-dialog");
  const canvas = document.querySelector("#signature-canvas");
  const sceneLayer = document.querySelector(".signature-scene");
  const hero = document.querySelector(".hero");
  const assembly = document.querySelector(".assembly");
  const project = document.querySelector("#conectei");
  const frame = document.querySelector(".product-frame");
  const portal = document.querySelector(".product-portal");
  const contact = document.querySelector("#contato");
  const progressBar = document.querySelector(".reading-progress span");
  const sections = [...document.querySelectorAll("main section[id]")];
  const navLinks = [...document.querySelectorAll(".desktop-nav a")];
  const pointer = { x: 0, y: 0 };
  const animations = new Set();
  let signature;
  let sceneLoading = false;
  let sceneFailed = false;
  let disposed = false;
  let scheduled = 0;
  let layout;
  let imageOpener;
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const mix = (a, b, p) => a + (b - a) * p;
  const smooth = (p) => {
    const t = clamp(p);
    return t * t * (3 - 2 * t);
  };
  const bounds = (el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2,
      y: r.top + window.scrollY + r.height / 2,
      width: r.width,
      height: r.height,
    };
  };
  const blendBounds = (a, b, p) =>
    Object.fromEntries(
      ["x", "y", "width", "height"].map((key) => [key, mix(a[key], b[key], p)]),
    );

  function animate(element, keyframes, options = {}) {
    if (motion.matches || !element?.animate) return;
    const animation = element.animate(keyframes, {
      duration: 950,
      easing: "cubic-bezier(.22,1,.36,1)",
      ...options,
    });
    animations.add(animation);
    animation.finished
      .then(() => animations.delete(animation))
      .catch(() => animations.delete(animation));
  }

  // A directed opening: attribution, three typographic planes, then the invitation.
  // No fill:forwards or permanent opacity/transform styles; interrupted animations release content.
  if (window.scrollY < 80 && !location.hash && !motion.matches) {
    animate(
      document.querySelector(".hero__pretitle"),
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 700 },
    );
    document.querySelectorAll(".hero-line > span").forEach((line, i) => {
      animate(
        line,
        [
          { transform: `translateY(${i === 1 ? 105 : 112}%)` },
          { transform: "translateY(0)" },
        ],
        { delay: 80 + i * 155, duration: 1150, fill: "backwards" },
      );
    });
    animate(
      document.querySelector(".hero__foot"),
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 850, delay: 550, fill: "backwards" },
    );
  }

  // Different parts share timing and easing, not identical reveal choreography.
  const entrances = [
    [
      ".assembly h2, .editorial-heading h3, .flow-heading h3, .capabilities h2, .about h2",
      "mask",
    ],
    [".product-detail__copy, .ecosystem > div:first-child", "lateral"],
    [".capability-list article, .repo-list a", "line"],
    [".product-summary, .project-end, .contact__cta", "quiet"],
  ];
  const entranceTypes = new WeakMap();
  const entranceObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        const type = entranceTypes.get(target);
        if (type === "mask")
          animate(
            target,
            [
              { clipPath: "inset(0 0 100% 0)", transform: "translateY(14px)" },
              { clipPath: "inset(0)", transform: "none" },
            ],
            { duration: 1100 },
          );
        if (type === "lateral")
          animate(target, [
            { opacity: 0.2, transform: "translateX(-20px)" },
            { opacity: 1, transform: "none" },
          ]);
        if (type === "line")
          animate(
            target,
            [
              { opacity: 0.4, clipPath: "inset(0 15% 0 0)" },
              { opacity: 1, clipPath: "inset(0)" },
            ],
            { duration: 750 },
          );
        if (type === "quiet")
          animate(target, [{ opacity: 0.3 }, { opacity: 1 }], {
            duration: 900,
          });
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -5% 0px" },
  );
  entrances.forEach(([selector, type]) =>
    document.querySelectorAll(selector).forEach((el) => {
      entranceTypes.set(el, type);
      entranceObserver.observe(el);
    }),
  );

  function closeMenu() {
    if (menu.open) menu.close();
  }
  menuTrigger.addEventListener("click", () => {
    menu.showModal();
    menuTrigger.setAttribute("aria-expanded", "true");
    animate(
      menu,
      [
        { transform: "translateX(35px)", opacity: 0.6 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 550 },
    );
  });
  document
    .querySelector("[data-menu-close]")
    .addEventListener("click", closeMenu);
  menu.addEventListener("close", () => {
    menuTrigger.setAttribute("aria-expanded", "false");
    requestUpdate();
  });
  menu
    .querySelectorAll("a")
    .forEach((link) => link.addEventListener("click", closeMenu));
  narrow.addEventListener("change", () => {
    if (!narrow.matches) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key !== "/" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.target.closest("input, textarea, [contenteditable], dialog")
    )
      return;
    event.preventDefault();
    menuTrigger.click();
  });
  [menu, imageDialog].forEach((dialog) =>
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        dialog.close();
    }),
  );

  const screens = {
    dashboard: {
      path: "product-dashboard",
      title: "Conectei / Visão geral da operação",
    },
    search: {
      path: "product-search",
      title: "Conectei / Pesquisa imobiliária",
    },
    valuation: {
      path: "product-valuation-report",
      title: "Conectei / Relatório de precificação",
    },
  };
  document.querySelectorAll("[data-image-open]").forEach((button) =>
    button.addEventListener("click", (event) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      const screen = screens[button.dataset.imageOpen];
      const image = imageDialog.querySelector("img");
      image.src = `assets/${screen.path}${mobile.matches ? "-mobile" : ""}.webp`;
      image.alt = button.querySelector("img").alt;
      image.width = mobile.matches ? 390 : 1440;
      image.height = mobile.matches ? 844 : 900;
      document.querySelector("#image-dialog-title").textContent = screen.title;
      imageOpener = button;
      imageDialog.showModal();
      imageDialog.querySelector(".image-dialog__scroll").scrollTop = 0;
      requestUpdate();
    }),
  );
  document
    .querySelector("[data-image-close]")
    .addEventListener("click", () => imageDialog.close());
  imageDialog.addEventListener("close", () => {
    imageOpener?.focus({ preventScroll: true });
    requestUpdate();
  });
  root.classList.add("has-navigation");

  function measure() {
    const y = window.scrollY;
    layout = {
      width: window.innerWidth,
      height: window.innerHeight,
      hero: bounds(document.querySelector(".hero__sculpture")),
      heroEnd: hero.getBoundingClientRect().bottom + y,
      assemblyTop: assembly.getBoundingClientRect().top + y,
      assemblyHeight: assembly.offsetHeight,
      projectTop: project.getBoundingClientRect().top + y,
      projectBottom: project.getBoundingClientRect().bottom + y,
      frameTop:
        portal.getBoundingClientRect().top +
        y +
        parseFloat(getComputedStyle(portal).paddingTop),
      frameHeight: frame.offsetHeight,
      frameWidth: portal.clientWidth,
      frameX: portal.getBoundingClientRect().left + portal.clientWidth / 2,
      contact: bounds(document.querySelector(".contact__sculpture")),
      contactTop: contact.getBoundingClientRect().top + y,
      contactBottom: contact.getBoundingClientRect().bottom + y,
      maxScroll: Math.max(1, root.scrollHeight - window.innerHeight),
      chapters: sections.map((section) => ({
        id: section.id,
        top: section.getBoundingClientRect().top + y,
      })),
    };
    signature?.resize(layout.width, layout.height);
    requestUpdate();
  }

  function sceneState() {
    const y = window.scrollY;
    const { width: w, height: h } = layout;
    const small = mobile.matches;
    const heroBounds = { ...layout.hero, y: layout.hero.y - y * 0.28 };
    let state = {
      mode: "hero",
      progress: 0,
      opacity: 1,
      active: true,
      reducedMotion: motion.matches,
      pointer,
      bounds: heroBounds,
    };

    if (motion.matches) {
      // Reduced motion follows the actual document: no floating between chapters.
      state.bounds = { ...layout.hero, y: layout.hero.y - y };
      state.active = y < layout.heroEnd;
      state.opacity = state.active ? 1 : 0;
      if (layout.contactTop < y + h && layout.contactBottom > y) {
        state = {
          ...state,
          mode: "contact",
          progress: 1,
          bounds: { ...layout.contact, y: layout.contact.y - y },
          active: true,
          opacity: 1,
        };
      }
      return state;
    }

    if (small) {
      // Touch has its own framing. Sculptures follow the document, so no beam
      // floats through the copy or a touch target while the browser bar changes.
      const heroExit = layout.hero.y + layout.hero.height / 2 - 78;
      if (y < heroExit) {
        state.bounds = { ...layout.hero, y: layout.hero.y - y };
        state.opacity = clamp((heroExit - y) / 90);
      } else {
        const b = {
          x: w * 0.51,
          y: layout.assemblyTop + layout.assemblyHeight * 0.7 - y,
          width: w * 0.84,
          height: 345,
        };
        state = {
          ...state,
          mode: "product",
          bounds: b,
          progress: smooth(
            (y - layout.assemblyTop + h * 0.15) / (layout.assemblyHeight * 0.7),
          ),
          opacity:
            clamp((h - b.y + b.height / 2) / 140) *
            clamp((b.y + b.height / 2 - 76) / 100) *
            smooth((y - heroExit) / 120),
        };
      }
      state.active = state.opacity > 0.001;
      if (layout.contactTop < y + h && layout.contactBottom > y) {
        const reveal = smooth((y + h - layout.contactTop) / (h * 0.75));
        state = {
          ...state,
          mode: "contact",
          progress: reveal,
          opacity: reveal,
          active: reveal > 0.001,
          bounds: { ...layout.contact, y: layout.contact.y - y },
        };
      }
      return state;
    }

    const assemblyStart = layout.heroEnd - h * 0.68;
    const assemblyEnd = layout.assemblyTop + (small ? 180 : 80);
    const assemblyBounds = {
      x: w * (small ? 0.51 : 0.75),
      y: small
        ? layout.assemblyTop + layout.assemblyHeight * 0.7 - y
        : h * 0.48,
      width: w * (small ? 0.84 : 0.43),
      height: small ? 345 : h * 0.7,
    };
    const travel = smooth(
      (y - assemblyStart) / Math.max(1, assemblyEnd - assemblyStart),
    );
    state.bounds = blendBounds(heroBounds, assemblyBounds, travel);
    const morphStart =
      layout.assemblyTop + layout.assemblyHeight * (small ? 0.5 : 0.16);
    const morphEnd = layout.frameTop - h * 0.6;
    const morph = smooth((y - morphStart) / Math.max(1, morphEnd - morphStart));
    if (y > morphStart) {
      const target = {
        x: layout.frameX,
        y: layout.frameTop + layout.frameHeight / 2 - y,
        width: layout.frameWidth * 1.13,
        height: Math.min(layout.frameWidth * 0.66, layout.frameHeight * 1.25),
      };
      state = {
        ...state,
        mode: "product",
        progress: morph,
        bounds: blendBounds(
          assemblyBounds,
          target,
          smooth((morph - 0.45) / 0.55),
        ),
      };
      // Descend through the open right column before widening into the product.
      // This curved path keeps the opening frame clear of the editorial copy.
      state.bounds.y = mix(assemblyBounds.y, target.y, smooth(morph / 0.5));
      state.opacity =
        1 - smooth((y - (layout.frameTop - h * 0.5)) / (h * 0.45));
      state.active = state.opacity > 0.001;
    }
    if (y > layout.frameTop + layout.frameHeight)
      state = { ...state, opacity: 0, active: false };
    if (layout.contactTop < y + h && layout.contactBottom > y) {
      const reveal = smooth((y + h - layout.contactTop) / (h * 0.75));
      state = {
        ...state,
        mode: "contact",
        progress: reveal,
        opacity: reveal,
        active: reveal > 0.001,
        bounds: { ...layout.contact, y: layout.contact.y - y },
      };
    }
    return state;
  }

  function update() {
    scheduled = 0;
    if (disposed || !layout) return;
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 28);
    header.classList.toggle(
      "is-dark",
      y + 45 >= layout.projectTop && y + 45 < layout.projectBottom,
    );
    progressBar.style.transform = `scaleX(${clamp(y / layout.maxScroll)})`;
    let current = "inicio";
    for (const chapter of layout.chapters)
      if (chapter.top <= y + layout.height * 0.3) current = chapter.id;
    navLinks.forEach((link) => {
      if (link.hash === `#${current}`)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    const state = sceneState();
    state.active =
      state.active && !document.hidden && !menu.open && !imageDialog.open;
    signature?.update(state);
    if (!signature && !sceneLoading && !sceneFailed && state.active)
      loadSignature();

    // The same aperture settles into the DOM product plane. All text remains DOM.
    // Mobile keeps a straight, full-width product frame and natural touch scrolling.
    if (!motion.matches && !mobile.matches && !sceneFailed && signature) {
      const reveal = smooth(
        (y + layout.height * 0.9 - layout.frameTop) / (layout.height * 0.55),
      );
      frame.style.transform = `perspective(1500px) rotateX(${(1 - reveal) * 6}deg) scale(${mix(0.91, 1, reveal)})`;
      frame.style.clipPath = `inset(${(1 - reveal) * 13}% ${(1 - reveal) * 7}% ${(1 - reveal) * 13}%)`;
    } else {
      frame.style.removeProperty("transform");
      frame.style.removeProperty("clip-path");
    }
  }

  function requestUpdate() {
    if (!scheduled && !disposed) scheduled = requestAnimationFrame(update);
  }

  function fallback() {
    sceneFailed = true;
    root.classList.remove("has-signature");
    sceneLayer.classList.remove("is-ready");
    canvas.dataset.ready = "false";
    frame.style.removeProperty("transform");
    frame.style.removeProperty("clip-path");
    // onError can run inside construction; dispose on the next task after assignment.
    setTimeout(() => {
      signature?.dispose();
      signature = undefined;
    }, 0);
  }

  async function loadSignature() {
    sceneLoading = true;
    try {
      const { createSignature } = await import("./assets/signature.js");
      if (disposed) return;
      signature = createSignature(canvas, {
        onReady: () => {
          root.classList.add("has-signature");
          sceneLayer.classList.add("is-ready");
        },
        onError: fallback,
      });
      signature.resize(layout.width, layout.height);
      requestUpdate();
    } catch {
      fallback();
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  window.addEventListener("pageshow", measure);
  window.addEventListener("hashchange", requestUpdate);
  document.addEventListener("visibilitychange", requestUpdate);
  window.addEventListener(
    "pointermove",
    (event) => {
      if (
        motion.matches ||
        !finePointer.matches ||
        !signature ||
        event.pointerType === "touch"
      )
        return;
      pointer.x = clamp((event.clientX / layout.width) * 2 - 1, -1, 1);
      pointer.y = clamp((event.clientY / layout.height) * 2 - 1, -1, 1);
      requestUpdate();
    },
    { passive: true },
  );
  document.addEventListener("pointerleave", () => {
    pointer.x = 0;
    pointer.y = 0;
    requestUpdate();
  });
  motion.addEventListener("change", () => {
    animations.forEach((animation) => animation.cancel());
    pointer.x = 0;
    pointer.y = 0;
    measure();
  });
  // Lazy images, opened details and font swaps can change all later chapter positions.
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(document.querySelector("main"));
  document.fonts?.ready.then(measure);
  window.addEventListener("pagehide", (event) => {
    if (event.persisted) {
      signature?.update({ active: false });
      return;
    }
    disposed = true;
    cancelAnimationFrame(scheduled);
    entranceObserver.disconnect();
    resizeObserver.disconnect();
    animations.forEach((animation) => animation.cancel());
    signature?.dispose();
  });
  document.querySelector("[data-year]").textContent = new Date().getFullYear();
  measure();
})();
