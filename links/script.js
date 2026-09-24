(() => {
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const lifetime = new AbortController();
  const listen = (element, type, handler, options = {}) =>
    element.addEventListener(type, handler, {
      ...options,
      signal: lifetime.signal,
    });
  const header = document.querySelector(".site-header");
  const progress = document.querySelector(".reading-progress span");
  const study = document.querySelector(".signature-study");
  const stage = document.querySelector(".signature-stage");
  const canvas = document.querySelector("#links-signature");
  const assemblyButton = document.querySelector(".assembly-toggle");
  const marquee = document.querySelector(".marquee");
  const track = document.querySelector(".marquee__track");
  const marqueeButton = document.querySelector(".marquee__toggle");
  const cards = [...document.querySelectorAll(".link-card")];
  const animations = new Set();
  const observers = [];
  let signature;
  let loading = false;
  let failed = false;
  let disposed = false;
  let sceneInView = false;
  let marqueeInView = true;
  let marqueePaused = false;
  let scrollFrame = 0;
  let assemblyFrame = 0;
  let assembly = 0;
  let assemblyTarget = 1;
  let size = { width: 1, height: 1 };
  const pointer = { x: 0, y: 0 };

  document.querySelector("[data-year]").textContent = String(
    new Date().getFullYear(),
  );

  function updateScroll() {
    scrollFrame = 0;
    const available =
      document.documentElement.scrollHeight - window.innerHeight;
    const amount = available > 0 ? window.scrollY / available : 0;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`;
    header.classList.toggle("is-scrolled", window.scrollY > 20);
  }

  function syncSignature() {
    if (!signature || disposed) return;
    const released = 1 - assembly;
    signature.update({
      mode: "journey",
      fromPose: "exploded",
      toPose: "resolved",
      morph: assembly,
      frameAspect: 1.74,
      crossSection: 1,
      unitScale: Math.min(
        size.width / (6.7 + released * 1.6),
        size.height / (5.2 + released * 1.4),
      ),
      rotation: [
        0.14 + released * 0.1,
        -0.52 + released * 0.7,
        -0.04 - released * 0.12,
      ],
      pointerStrength: 3,
      pointer,
      opacity: 1,
      active: sceneInView && !document.hidden && !reducedMotion.matches,
      reducedMotion: reducedMotion.matches,
      bounds: { x: size.width / 2, y: size.height / 2, ...size },
    });
  }

  function measure() {
    if (disposed) return;
    size = { width: stage.clientWidth, height: stage.clientHeight };
    syncSignature();
    signature?.resize(size.width, size.height);
    updateScroll();
  }

  function assemble(target, duration = 1400) {
    cancelAnimationFrame(assemblyFrame);
    assemblyFrame = 0;
    assemblyTarget = target;
    if (reducedMotion.matches || document.hidden || !sceneInView) {
      assembly = target;
      syncSignature();
      return;
    }
    const start = performance.now();
    const from = assembly;
    const tick = (time) => {
      const elapsed = Math.min(1, (time - start) / duration);
      assembly = from + (target - from) * (1 - (1 - elapsed) ** 3);
      syncSignature();
      assemblyFrame = elapsed < 1 ? requestAnimationFrame(tick) : 0;
    };
    assemblyFrame = requestAnimationFrame(tick);
  }

  function finishAssembly() {
    cancelAnimationFrame(assemblyFrame);
    assemblyFrame = 0;
    assembly = assemblyTarget;
    syncSignature();
  }

  function failSignature() {
    failed = true;
    finishAssembly();
    study.classList.remove("has-signature");
    assemblyButton.hidden = true;
    // A constructor error can occur before its return value is assigned.
    setTimeout(() => {
      signature?.dispose();
      signature = undefined;
    }, 0);
  }

  async function loadSignature() {
    if (loading || signature || failed || disposed || reducedMotion.matches)
      return;
    loading = true;
    try {
      const { createSignature } = await import("/assets/signature.js");
      if (disposed || reducedMotion.matches) return;
      signature = createSignature(canvas, {
        onReady() {
          if (disposed || reducedMotion.matches) return;
          study.classList.add("has-signature");
          assemblyButton.hidden = false;
          assemble(1, 1750);
        },
        onError: failSignature,
      });
      if (!failed) measure();
    } catch {
      failSignature();
    } finally {
      loading = false;
    }
  }

  listen(assemblyButton, "click", () => {
    const separated = assemblyButton.getAttribute("aria-pressed") !== "true";
    assemblyButton.setAttribute("aria-pressed", String(separated));
    assemblyButton.firstElementChild.textContent = separated
      ? "Reunir peças"
      : "Separar peças";
    assemble(separated ? 0 : 1);
  });
  listen(
    stage,
    "pointermove",
    (event) => {
      if (
        reducedMotion.matches ||
        !finePointer.matches ||
        event.pointerType === "touch"
      )
        return;
      const bounds = stage.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.y = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
      syncSignature();
    },
    { passive: true },
  );
  listen(stage, "pointerleave", () => {
    pointer.x = pointer.y = 0;
    syncSignature();
  });

  function syncMarquee() {
    track.style.animationPlayState =
      marqueePaused ||
      !marqueeInView ||
      document.hidden ||
      reducedMotion.matches
        ? "paused"
        : "running";
    marqueeButton.hidden = reducedMotion.matches;
    marquee.classList.toggle("is-paused", marqueePaused);
    marqueeButton.setAttribute("aria-pressed", String(marqueePaused));
    marqueeButton.setAttribute(
      "aria-label",
      marqueePaused ? "Retomar faixa animada" : "Pausar faixa animada",
    );
  }
  listen(marqueeButton, "click", () => {
    marqueePaused = !marqueePaused;
    syncMarquee();
  });

  if ("IntersectionObserver" in window) {
    const sceneObserver = new IntersectionObserver(
      ([entry]) => {
        sceneInView = entry.isIntersecting;
        if (sceneInView) {
          loadSignature();
          syncSignature();
        } else finishAssembly();
      },
      { threshold: 0.01 },
    );
    sceneObserver.observe(stage);
    const marqueeObserver = new IntersectionObserver(([entry]) => {
      marqueeInView = entry.isIntersecting;
      syncMarquee();
    });
    marqueeObserver.observe(marquee);
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          revealObserver.unobserve(entry.target);
          if (reducedMotion.matches) return;
          const animation = entry.target.animate(
            [
              { opacity: 0.25, transform: "translateY(24px)" },
              { opacity: 1, transform: "translateY(0)" },
            ],
            { duration: 750, easing: "cubic-bezier(.22,1,.36,1)" },
          );
          animations.add(animation);
          animation.finished
            .then(() => animations.delete(animation))
            .catch(() => animations.delete(animation));
        });
      },
      { threshold: 0.08 },
    );
    cards.forEach((card) => revealObserver.observe(card));
    observers.push(sceneObserver, marqueeObserver, revealObserver);
  } else {
    sceneInView = true;
    loadSignature();
  }

  cards.forEach((card) => {
    listen(
      card,
      "pointermove",
      (event) => {
        if (
          reducedMotion.matches ||
          !finePointer.matches ||
          event.pointerType === "touch"
        )
          return;
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        card.style.setProperty("--glow-x", `${x * 100}%`);
        card.style.setProperty("--glow-y", `${y * 100}%`);
        card.style.setProperty("--tilt-x", `${(0.5 - y) * 2}deg`);
        card.style.setProperty("--tilt-y", `${(x - 0.5) * 2}deg`);
      },
      { passive: true },
    );
    listen(card, "pointerleave", () => {
      card.style.setProperty("--tilt-x", "0deg");
      card.style.setProperty("--tilt-y", "0deg");
    });
  });

  listen(
    window,
    "scroll",
    () => {
      if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  listen(window, "resize", measure, { passive: true });
  const resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(stage);
  observers.push(resizeObserver);
  listen(reducedMotion, "change", () => {
    finishAssembly();
    animations.forEach((animation) => animation.cancel());
    study.classList.toggle(
      "has-signature",
      !reducedMotion.matches && canvas.dataset.ready === "true",
    );
    assemblyButton.hidden =
      reducedMotion.matches || canvas.dataset.ready !== "true";
    syncMarquee();
    if (!reducedMotion.matches && sceneInView) loadSignature();
  });
  listen(document, "visibilitychange", () => {
    if (document.hidden) finishAssembly();
    else syncSignature();
    syncMarquee();
  });
  listen(window, "pagehide", (event) => {
    finishAssembly();
    signature?.update({ active: false });
    if (event.persisted) return;
    disposed = true;
    cancelAnimationFrame(scrollFrame);
    animations.forEach((animation) => animation.cancel());
    observers.forEach((observer) => observer.disconnect());
    signature?.dispose();
    lifetime.abort();
  });
  listen(window, "pageshow", () => {
    measure();
    syncMarquee();
  });
  document.fonts.ready.then(measure);
  measure();
  syncMarquee();
})();
