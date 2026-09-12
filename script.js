/* Progressive enhancement: every chapter and product capture starts in the HTML. */
import { createJourney } from "./journey.js";

(() => {
  const root = document.documentElement;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const desktopStory = matchMedia(
    "(min-width: 1000px) and (min-height: 650px)",
  );
  const mobile = matchMedia("(max-width: 700px)");
  const finePointer = matchMedia("(pointer: fine)");
  const narrow = matchMedia("(max-width: 800px)");
  const lifetime = new AbortController();
  const listen = (el, type, handler, options = {}) =>
    el?.addEventListener(type, handler, {
      ...options,
      signal: lifetime.signal,
    });
  const header = document.querySelector(".site-header");
  const menu = document.querySelector(".site-menu");
  const menuTrigger = document.querySelector("[data-menu-open]");
  const imageDialog = document.querySelector("#image-dialog");
  const study = document.querySelector(".identity-study");
  const canvas = document.querySelector("#signature-canvas");
  const sceneLayer = document.querySelector(".signature-scene");
  const assemblyButton = document.querySelector("[data-assembly-toggle]");
  const progress = document.querySelector(".reading-progress span");
  const steps = [...document.querySelectorAll(".story-step")];
  const stage = document.querySelector(".story-stage");
  const figures = steps.map((step) => step.querySelector(".story-figure"));
  const journey = createJourney();
  const animations = new Set();
  let signature, opener, layout;
  let scheduled = 0,
    introFrame = 0;
  let loading = false,
    failed = false,
    disposed = false;
  let assemblyProgress = motion.matches ? 1 : 0;
  let activeStep = -1;
  const pointer = { x: 0, y: 0 };
  const clamp = (value, min = 0, max = 1) =>
    Math.max(min, Math.min(max, value));

  function animate(element, frames, options = {}) {
    if (motion.matches || !element?.animate) return;
    const animation = element.animate(frames, {
      duration: 850,
      easing: "cubic-bezier(.22,1,.36,1)",
      ...options,
    });
    animations.add(animation);
    animation.finished
      .catch(() => {})
      .finally(() => animations.delete(animation));
  }

  function updateStoryLayout() {
    // Reparent the same figures; no duplicated content or screenshots for assistive tech.
    root.classList.toggle("has-story", desktopStory.matches);
    figures.forEach((figure, index) => {
      if (desktopStory.matches) stage.append(figure);
      else {
        steps[index].append(figure);
        figure.inert = false;
        figure.removeAttribute("aria-hidden");
      }
    });
    activeStep = -1;
    measure();
  }

  function selectStep(index) {
    if (index === activeStep) return;
    activeStep = index;
    document.querySelectorAll(".story-navigation a").forEach((link, i) => {
      if (i === index) link.setAttribute("aria-current", "step");
      else link.removeAttribute("aria-current");
    });
    steps.forEach((step, i) => step.classList.toggle("is-active", index === i));
    figures.forEach((figure, i) => {
      figure.classList.toggle("is-active", i === index);
      if (desktopStory.matches) {
        figure.inert = i !== index;
        figure.setAttribute("aria-hidden", String(i !== index));
      }
    });
  }

  function measure() {
    if (disposed) return;
    const y = window.scrollY;
    layout = {
      width: window.innerWidth,
      height: window.innerHeight,
      maxScroll: Math.max(1, root.scrollHeight - window.innerHeight),
      steps: steps.map((step) => step.getBoundingClientRect().top + y),
      chapters: [...document.querySelectorAll("main section[id]")].map(
        (section) => ({
          id: section.id,
          top: section.getBoundingClientRect().top + y,
        }),
      ),
    };
    journey.measure();
    signature?.resize(layout.width, layout.height);
    requestUpdate();
  }

  function update() {
    scheduled = 0;
    if (!layout || disposed) return;
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 20);
    progress.style.transform = `scaleX(${clamp(y / layout.maxScroll)})`;
    let chapter = "inicio";
    layout.chapters.forEach((item) => {
      if (item.top < y + window.innerHeight * 0.35) chapter = item.id;
    });
    document.querySelectorAll(".desktop-nav a").forEach((link) => {
      if (link.hash === `#${chapter}`)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
    let next = 0;
    layout.steps.forEach((top, index) => {
      if (top <= y + window.innerHeight * 0.47) next = index;
    });
    selectStep(next);
    const sculptureState = journey.state(y, assemblyProgress, motion.matches);
    const active =
      sculptureState.active &&
      !document.hidden &&
      !menu.open &&
      !imageDialog.open &&
      !motion.matches;
    if (active && !motion.matches && !signature && !loading && !failed)
      loadSignature();
    signature?.update({
      ...sculptureState,
      active,
      pointer,
      focusIndex: ["interface", "aplicacao", "dados", "servicos"].indexOf(
        selectedNode,
      ),
    });
  }

  function requestUpdate() {
    if (!scheduled && !disposed) scheduled = requestAnimationFrame(update);
  }

  function failScene() {
    failed = true;
    cancelAnimationFrame(introFrame);
    root.classList.remove("has-signature", "has-journey", "signature-pending");
    sceneLayer.classList.remove("is-ready");
    canvas.dataset.ready = "false";
    setTimeout(() => {
      signature?.dispose();
      signature = undefined;
    }, 0);
  }

  function assemble(target, duration = 1250) {
    cancelAnimationFrame(introFrame);
    if (motion.matches) {
      assemblyProgress = target;
      requestUpdate();
      return;
    }
    const from = assemblyProgress;
    const start = performance.now();
    function tick(time) {
      if (disposed || document.hidden) {
        assemblyProgress = target;
        return;
      }
      const p = clamp((time - start) / duration);
      assemblyProgress = from + (target - from) * (1 - (1 - p) ** 3);
      requestUpdate();
      if (p < 1) introFrame = requestAnimationFrame(tick);
    }
    introFrame = requestAnimationFrame(tick);
  }

  async function loadSignature() {
    loading = true;
    try {
      const { createSignature } = await import("./assets/signature.js");
      if (disposed) return;
      signature = createSignature(canvas, {
        onReady() {
          root.classList.add("has-signature", "has-journey");
          root.classList.remove("signature-pending");
          sceneLayer.classList.add("is-ready");
          if (window.scrollY < 100) assemble(1, 1800);
          else assemblyProgress = 1;
          requestUpdate();
        },
        onError: failScene,
      });
      // Seed the exploded pose before resize schedules the first render. The
      // canvas only becomes visible after this exact pose has been drawn.
      const initialPose = journey.state(
        window.scrollY,
        assemblyProgress,
        motion.matches,
      );
      signature.update({
        ...initialPose,
        pointer,
        active:
          initialPose.active &&
          !document.hidden &&
          !menu.open &&
          !imageDialog.open &&
          !motion.matches,
      });
      signature.resize(layout.width, layout.height);
      requestUpdate();
    } catch {
      failScene();
    }
  }

  listen(assemblyButton, "click", () => {
    const separated = assemblyButton.getAttribute("aria-pressed") !== "true";
    assemblyButton.setAttribute("aria-pressed", String(separated));
    assemblyButton.firstChild.textContent = separated
      ? "Reunir peças "
      : "Separar peças ";
    assemble(separated ? 0 : 1);
  });
  listen(
    study,
    "pointermove",
    (event) => {
      if (
        motion.matches ||
        !finePointer.matches ||
        event.pointerType === "touch"
      )
        return;
      const bounds = study.getBoundingClientRect();
      pointer.x = clamp(
        ((event.clientX - bounds.left) / bounds.width - 0.5) * 2,
        -1,
        1,
      );
      pointer.y = clamp(
        ((event.clientY - bounds.top) / bounds.height - 0.5) * 2,
        -1,
        1,
      );
      requestUpdate();
    },
    { passive: true },
  );
  listen(study, "pointerleave", () => {
    pointer.x = pointer.y = 0;
    requestUpdate();
  });

  function closeMenu() {
    menu.close();
  }
  listen(menuTrigger, "click", () => {
    menu.showModal();
    menuTrigger.setAttribute("aria-expanded", "true");
    requestUpdate();
    animate(
      menu.querySelector("nav"),
      [
        { transform: "translateY(20px)", opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 450 },
    );
  });
  listen(document.querySelector("[data-menu-close]"), "click", closeMenu);
  listen(menu, "close", () => {
    menuTrigger.setAttribute("aria-expanded", "false");
    requestUpdate();
  });
  menu
    .querySelectorAll("a")
    .forEach((link) => listen(link, "click", closeMenu));
  listen(narrow, "change", () => {
    if (!narrow.matches) closeMenu();
  });

  const screens = {
    search: { path: "product-search", title: "Pesquisa imobiliária" },
    dashboard: { path: "product-dashboard", title: "Visão geral da operação" },
    valuation: {
      path: "product-valuation-report",
      title: "Relatório de precificação",
    },
  };
  document.querySelectorAll("[data-image-open]").forEach((link) =>
    listen(link, "click", (event) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      )
        return;
      event.preventDefault();
      const screen = screens[link.dataset.imageOpen];
      const img = imageDialog.querySelector("img");
      img.src = `assets/${screen.path}${mobile.matches ? "-mobile" : ""}.webp`;
      img.alt = link.querySelector("img").alt;
      img.width = mobile.matches ? 390 : 1440;
      img.height = mobile.matches ? 844 : 900;
      document.querySelector("#image-dialog-title").textContent =
        `Conectei / ${screen.title}`;
      opener = link;
      imageDialog.showModal();
      imageDialog.querySelector(".image-dialog__scroll").scrollTop = 0;
      requestUpdate();
    }),
  );
  listen(document.querySelector("[data-image-close]"), "click", () =>
    imageDialog.close(),
  );
  listen(imageDialog, "close", () => {
    opener?.focus({ preventScroll: true });
    requestUpdate();
  });
  [menu, imageDialog].forEach((dialog) =>
    listen(dialog, "click", (event) => {
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
  // Keep Tab navigation inside an open overlay, including the first/last edge.
  [menu, imageDialog].forEach((dialog) =>
    listen(dialog, "keydown", (event) => {
      if (event.key !== "Tab") return;
      const targets = [
        ...dialog.querySelectorAll('a[href], button, [tabindex="0"]'),
      ].filter(
        (element) => !element.disabled && element.getClientRects().length,
      );
      const first = targets[0];
      const last = targets.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }),
  );
  root.classList.add("has-navigation");

  const nodeButtons = [...document.querySelectorAll("[data-node]")];
  const nodeDetails = [...document.querySelectorAll("[data-detail]")];
  const trace = document.querySelector(".map-trace");
  const paths = {
    interface: "M140 130H320V240H500",
    aplicacao: "M500 130H320V240H140",
    dados: "M140 350H320V240H500",
    servicos: "M500 350H320V240H140",
  };
  let selectedNode;
  function selectNode(key, animatePanel = true) {
    if (key === selectedNode) return;
    selectedNode = key;
    nodeButtons.forEach((button) => {
      const selected = button.dataset.node === key;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    nodeDetails.forEach((panel) => {
      panel.hidden = panel.dataset.detail !== key;
    });
    trace?.setAttribute("d", paths[key]);
    if (animatePanel) {
      animate(
        document.querySelector(`[data-detail="${key}"]`),
        [
          { opacity: 0.4, transform: "translateY(12px)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 450 },
      );
      animate(
        trace,
        [
          { strokeDasharray: "600", strokeDashoffset: "600" },
          { strokeDasharray: "600", strokeDashoffset: "0" },
        ],
        { duration: 850 },
      );
    }
    requestUpdate();
  }
  if (nodeButtons.length) {
    root.classList.add("has-explorer");
    selectNode("interface", false);
    nodeButtons.forEach((button, index) => {
      listen(button, "click", () => selectNode(button.dataset.node));
      listen(button, "focus", () => selectNode(button.dataset.node));
      listen(button, "keydown", (event) => {
        const delta = {
          ArrowRight: 1,
          ArrowLeft: -1,
          ArrowDown: 2,
          ArrowUp: -2,
        }[event.key];
        if (delta !== undefined) {
          event.preventDefault();
          nodeButtons[
            (index + delta + nodeButtons.length) % nodeButtons.length
          ].focus();
        }
      });
    });
    document
      .querySelectorAll("[data-select-node]")
      .forEach((link) =>
        listen(link, "click", () => selectNode(link.dataset.selectNode)),
      );
    const revealDetailHash = () => {
      const key = location.hash.replace("#detail-", "");
      if (!paths[key]) return;
      selectNode(key, false);
      document
        .querySelector(location.hash)
        ?.scrollIntoView({ behavior: "instant", block: "start" });
    };
    listen(window, "hashchange", revealDetailHash);
    revealDetailHash();
  }

  // Only selected structural elements enter once. Reading copy remains stable.
  const observer = new IntersectionObserver(
    (entries) =>
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        observer.unobserve(target);
        if (target.matches(".assembly-route")) {
          target
            .querySelectorAll("i")
            .forEach((line, i) =>
              animate(
                line,
                [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
                { duration: 900, delay: i * 180 },
              ),
            );
        } else if (target.matches(".project__heading")) {
          animate(
            target.querySelector("h2"),
            [
              { clipPath: "inset(0 100% 0 0)", transform: "translateX(-20px)" },
              { clipPath: "inset(0)", transform: "none" },
            ],
            { duration: 1000 },
          );
        } else {
          animate(
            target,
            [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0)" }],
            { duration: 950 },
          );
        }
      }),
    { threshold: 0.2 },
  );
  document
    .querySelectorAll(
      ".assembly-route, .project__heading, .engineering-map, .contact-line",
    )
    .forEach((el) => observer.observe(el));
  if (window.scrollY < 40 && !location.hash) {
    document.querySelectorAll(".hero-line").forEach((line, i) =>
      animate(
        line,
        [
          {
            transform: `translateY(${20 + i * 7}px)`,
            clipPath: "inset(0 0 100% 0)",
          },
          { transform: "none", clipPath: "inset(0)" },
        ],
        { delay: i * 90, duration: 850 },
      ),
    );
  }

  listen(window, "scroll", requestUpdate, { passive: true });
  listen(window, "resize", measure, { passive: true });
  listen(window, "pageshow", measure);
  listen(window, "hashchange", requestUpdate);
  listen(document, "visibilitychange", requestUpdate);
  listen(desktopStory, "change", updateStoryLayout);
  listen(motion, "change", () => {
    animations.forEach((animation) => animation.cancel());
    cancelAnimationFrame(introFrame);
    assemblyProgress =
      assemblyButton.getAttribute("aria-pressed") === "true" ? 0 : 1;
    pointer.x = pointer.y = 0;
    const enabled = Boolean(signature) && !failed && !motion.matches;
    if (motion.matches) root.classList.remove("signature-pending");
    root.classList.toggle("has-signature", enabled);
    root.classList.toggle("has-journey", enabled);
    sceneLayer.classList.toggle("is-ready", enabled);
    measure();
  });
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(document.querySelector("main"));
  document.fonts?.ready.then(measure);
  listen(window, "pagehide", (event) => {
    if (event.persisted) {
      signature?.update({ active: false });
      return;
    }
    disposed = true;
    cancelAnimationFrame(scheduled);
    cancelAnimationFrame(introFrame);
    observer.disconnect();
    resizeObserver.disconnect();
    animations.forEach((animation) => animation.cancel());
    signature?.dispose();
    lifetime.abort();
  });
  document.querySelector("[data-year]").textContent = new Date().getFullYear();
  updateStoryLayout();
})();
