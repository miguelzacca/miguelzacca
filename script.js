(function () {
  "use strict";

  var root = document.documentElement;
  var body = document.body;
  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* --------------------------------------------------------------------------
     Opening sequence
     -------------------------------------------------------------------------- */

  var loaderCount = document.querySelector(".loader__count");
  var loadStartedAt = performance.now();
  var loaderFinished = false;
  var loaderFinishing = false;

  function updateLoaderCount() {
    if (!loaderCount || loaderFinished) return;
    var elapsed = performance.now() - loadStartedAt;
    var value = Math.min(99, Math.round((elapsed / 1250) * 100));
    loaderCount.textContent = String(value).padStart(3, "0");
    requestAnimationFrame(updateLoaderCount);
  }

  function finishLoading() {
    if (loaderFinished || loaderFinishing) return;
    loaderFinishing = true;
    var elapsed = performance.now() - loadStartedAt;
    var wait = reduceMotion ? 0 : Math.max(0, 1250 - elapsed);

    window.setTimeout(function () {
      loaderFinished = true;
      if (loaderCount) loaderCount.textContent = "100";
      body.classList.add("is-loaded");
      root.classList.add("ready");
    }, wait);
  }

  if (reduceMotion) {
    finishLoading();
  } else {
    requestAnimationFrame(updateLoaderCount);
    window.addEventListener("load", finishLoading, { once: true });
    window.setTimeout(finishLoading, 2400);
  }

  /* --------------------------------------------------------------------------
     Split type and reveal choreography
     -------------------------------------------------------------------------- */

  var splitTitles = document.querySelectorAll("[data-split]");
  splitTitles.forEach(function (title) {
    var text = title.textContent;
    title.setAttribute("aria-label", text);
    title.textContent = "";

    Array.from(text).forEach(function (character, index) {
      var span = document.createElement("span");
      span.className = "char";
      span.setAttribute("aria-hidden", "true");
      span.textContent = character === " " ? "\u00A0" : character;
      span.style.transitionDelay = String(index * 55) + "ms";
      title.appendChild(span);
    });
  });

  var revealItems = Array.from(
    document.querySelectorAll(".reveal, [data-split]"),
  );

  if (!reduceMotion && "IntersectionObserver" in window) {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -7% 0px",
      },
    );

    revealItems.forEach(function (item, index) {
      if (item.classList.contains("reveal")) {
        item.style.transitionDelay = String((index % 3) * 70) + "ms";
      }
      revealObserver.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  /* --------------------------------------------------------------------------
     Page progress, header state and manifesto line focus
     -------------------------------------------------------------------------- */

  var progressBar = document.querySelector(".page-progress span");
  var header = document.querySelector("[data-header]");
  var hero = document.querySelector(".hero");
  var highlightLines = Array.from(
    document.querySelectorAll("[data-highlight] > span"),
  );
  var scrollTicking = false;

  function updateScrollScene() {
    var scrollY = window.scrollY || window.pageYOffset;
    var maxScroll = Math.max(
      1,
      document.documentElement.scrollHeight - window.innerHeight,
    );
    var progress = Math.min(1, Math.max(0, scrollY / maxScroll));

    if (progressBar) {
      progressBar.style.transform = "scaleX(" + progress.toFixed(4) + ")";
    }

    if (header) {
      header.classList.toggle("is-scrolled", scrollY > 36);
    }

    if (hero && !reduceMotion) {
      var heroProgress = Math.min(1, scrollY / Math.max(1, hero.offsetHeight));
      hero.style.setProperty("--hero-progress", heroProgress.toFixed(3));
    }

    highlightLines.forEach(function (line) {
      var rect = line.getBoundingClientRect();
      var focusPoint = window.innerHeight * 0.58;
      var lineCenter = rect.top + rect.height / 2;
      line.classList.toggle(
        "is-active",
        Math.abs(lineCenter - focusPoint) < window.innerHeight * 0.25,
      );
    });

    if (chapters && chapters.length) {
      updateStoryScene();
    }

    scrollTicking = false;
  }

  function requestScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(updateScrollScene);
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate, { passive: true });
  updateScrollScene();

  /* --------------------------------------------------------------------------
     Animated figures
     -------------------------------------------------------------------------- */

  var counters = document.querySelectorAll("[data-count]");

  function animateCounter(element) {
    if (element.dataset.counted === "true") return;
    element.dataset.counted = "true";

    var target = Number(element.dataset.count);
    var duration = reduceMotion ? 1 : 1500;
    var startTime = performance.now();
    var formatter = new Intl.NumberFormat("pt-BR");

    function frame(now) {
      var progress = Math.min(1, (now - startTime) / duration);
      var eased = 1 - Math.pow(1 - progress, 4);
      element.textContent = formatter.format(Math.round(target * eased));

      if (progress < 1) requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  if ("IntersectionObserver" in window) {
    var counterObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          animateCounter(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.55 },
    );

    counters.forEach(function (counter) {
      counterObserver.observe(counter);
    });
  } else {
    counters.forEach(animateCounter);
  }

  /* --------------------------------------------------------------------------
     Product scroll story
     -------------------------------------------------------------------------- */

  var chapters = Array.from(document.querySelectorAll("[data-story-chapter]"));
  var storyImages = Array.from(document.querySelectorAll("[data-story-image]"));
  var storyCounter = document.querySelector("[data-story-counter]");
  var storyLabel = document.querySelector("[data-story-label]");
  var activeStoryIndex = -1;
  var storyLabels = ["Descoberta", "Inteligência", "Operação"];

  function setStoryScene(index) {
    if (index === activeStoryIndex) return;
    activeStoryIndex = index;

    chapters.forEach(function (chapter, chapterIndex) {
      chapter.classList.toggle("is-active", chapterIndex === index);
    });

    storyImages.forEach(function (image, imageIndex) {
      image.classList.toggle("is-active", imageIndex === index);
    });

    if (storyCounter) {
      storyCounter.textContent = "0" + String(index + 1) + " / 03";
    }

    if (storyLabel) {
      storyLabel.textContent = storyLabels[index];
    }
  }

  function updateStoryScene() {
    var activationPoint = window.innerHeight * 0.5;
    var activeIndex = 0;

    chapters.forEach(function (chapter, chapterIndex) {
      if (chapter.getBoundingClientRect().top <= activationPoint) {
        activeIndex = chapterIndex;
      }
    });

    setStoryScene(activeIndex);
  }

  if (chapters.length) {
    requestScrollUpdate();
  }

  /* --------------------------------------------------------------------------
     Navigation
     -------------------------------------------------------------------------- */

  var menuButton = document.querySelector(".menu-toggle");
  var mobileMenu = document.querySelector(".mobile-menu");
  var mobileLinks = mobileMenu ? mobileMenu.querySelectorAll("a") : [];
  var pageMain = document.querySelector("main");
  var pageFooter = document.querySelector(".site-footer");
  var lastFocusedElement = null;

  function setMobileMenu(open) {
    if (!menuButton || !mobileMenu) return;
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    mobileMenu.setAttribute("aria-hidden", String(!open));
    mobileMenu.classList.toggle("is-open", open);
    body.classList.toggle("menu-open", open);
    if (pageMain && "inert" in pageMain) pageMain.inert = open;
    if (pageFooter && "inert" in pageFooter) pageFooter.inert = open;

    if (open) {
      lastFocusedElement = document.activeElement;
      window.setTimeout(function () {
        var firstLink = mobileMenu.querySelector("a");
        if (firstLink) firstLink.focus();
      }, 350);
    } else if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  }

  if (menuButton) {
    menuButton.addEventListener("click", function () {
      setMobileMenu(menuButton.getAttribute("aria-expanded") !== "true");
    });
  }

  mobileLinks.forEach(function (link) {
    link.addEventListener("click", function () {
      setMobileMenu(false);
    });
  });

  var commandDialog = document.getElementById("command-menu");
  var commandOpen = document.querySelector("[data-command-open]");
  var commandClose = document.querySelector("[data-command-close]");
  var commandLinks = document.querySelectorAll("[data-command-link]");

  function openCommand() {
    if (!commandDialog) return;
    body.classList.add("command-open");
    if (typeof commandDialog.showModal === "function") {
      if (!commandDialog.open) commandDialog.showModal();
    } else {
      commandDialog.setAttribute("open", "");
    }
  }

  function closeCommand() {
    if (!commandDialog) return;
    body.classList.remove("command-open");
    if (typeof commandDialog.close === "function" && commandDialog.open) {
      commandDialog.close();
    } else {
      commandDialog.removeAttribute("open");
    }
  }

  if (commandOpen) commandOpen.addEventListener("click", openCommand);
  if (commandClose) commandClose.addEventListener("click", closeCommand);
  commandLinks.forEach(function (link) {
    link.addEventListener("click", closeCommand);
  });

  if (commandDialog) {
    commandDialog.addEventListener("close", function () {
      body.classList.remove("command-open");
    });

    commandDialog.addEventListener("click", function (event) {
      if (event.target === commandDialog) closeCommand();
    });
  }

  document.addEventListener("keydown", function (event) {
    var target = event.target;
    var isTyping =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable);

    if (
      event.key === "/" &&
      !isTyping &&
      !body.classList.contains("menu-open")
    ) {
      event.preventDefault();
      openCommand();
    }

    if (
      event.key === "Escape" &&
      menuButton &&
      menuButton.getAttribute("aria-expanded") === "true"
    ) {
      setMobileMenu(false);
    }

    if (
      event.key === "Tab" &&
      menuButton &&
      mobileMenu &&
      menuButton.getAttribute("aria-expanded") === "true"
    ) {
      var focusableItems = [menuButton].concat(
        Array.from(mobileMenu.querySelectorAll("a[href]")),
      );
      var firstItem = focusableItems[0];
      var lastItem = focusableItems[focusableItems.length - 1];

      if (event.shiftKey && document.activeElement === firstItem) {
        event.preventDefault();
        lastItem.focus();
      } else if (!event.shiftKey && document.activeElement === lastItem) {
        event.preventDefault();
        firstItem.focus();
      }
    }
  });

  /* --------------------------------------------------------------------------
     Active section navigation
     -------------------------------------------------------------------------- */

  var navAnchors = Array.from(document.querySelectorAll(".desktop-nav a"));
  var observedSections = navAnchors
    .map(function (anchor) {
      return document.querySelector(anchor.getAttribute("href"));
    })
    .filter(Boolean);

  if ("IntersectionObserver" in window && observedSections.length) {
    var sectionObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navAnchors.forEach(function (anchor) {
            var active = anchor.getAttribute("href") === "#" + entry.target.id;
            if (active) {
              anchor.setAttribute("aria-current", "location");
            } else {
              anchor.removeAttribute("aria-current");
            }
          });
        });
      },
      {
        rootMargin: "-42% 0px -50% 0px",
        threshold: 0,
      },
    );

    observedSections.forEach(function (section) {
      sectionObserver.observe(section);
    });
  }

  /* --------------------------------------------------------------------------
     Magnetic controls and dimensional cards
     -------------------------------------------------------------------------- */

  if (finePointer && !reduceMotion) {
    document.querySelectorAll(".magnetic").forEach(function (element) {
      element.addEventListener("pointermove", function (event) {
        var rect = element.getBoundingClientRect();
        var x = (event.clientX - rect.left - rect.width / 2) * 0.16;
        var y = (event.clientY - rect.top - rect.height / 2) * 0.16;
        element.style.setProperty("--mx", x.toFixed(2) + "px");
        element.style.setProperty("--my", y.toFixed(2) + "px");
      });

      element.addEventListener("pointerleave", function () {
        element.style.setProperty("--mx", "0px");
        element.style.setProperty("--my", "0px");
      });
    });

    document.querySelectorAll("[data-tilt]").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        var xRatio = (event.clientX - rect.left) / rect.width;
        var yRatio = (event.clientY - rect.top) / rect.height;
        var rotateY = (xRatio - 0.5) * 7;
        var rotateX = (0.5 - yRatio) * 7;

        card.style.setProperty("--tilt-x", rotateX.toFixed(2) + "deg");
        card.style.setProperty("--tilt-y", rotateY.toFixed(2) + "deg");
        card.style.setProperty("--glow-x", (xRatio * 100).toFixed(1) + "%");
        card.style.setProperty("--glow-y", (yRatio * 100).toFixed(1) + "%");
      });

      card.addEventListener("pointerleave", function () {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
        card.style.setProperty("--glow-x", "50%");
        card.style.setProperty("--glow-y", "50%");
      });
    });

    var projectWindow = document.querySelector(".project-window");
    if (projectWindow) {
      projectWindow.addEventListener("pointermove", function (event) {
        var rect = projectWindow.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        projectWindow.style.setProperty(
          "--window-ry",
          (x * 3).toFixed(2) + "deg",
        );
        projectWindow.style.setProperty(
          "--window-rx",
          (-y * 3).toFixed(2) + "deg",
        );
      });

      projectWindow.addEventListener("pointerleave", function () {
        projectWindow.style.setProperty("--window-ry", "0deg");
        projectWindow.style.setProperty("--window-rx", "0deg");
      });
    }
  }

  /* --------------------------------------------------------------------------
     Custom cursor
     -------------------------------------------------------------------------- */

  if (finePointer && !reduceMotion) {
    var cursorDot = document.querySelector(".cursor--dot");
    var cursorRing = document.querySelector(".cursor--ring");
    var cursorLabel = cursorRing ? cursorRing.querySelector("span") : null;
    var pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    var ring = { x: pointer.x, y: pointer.y };
    var cursorVisible = false;

    function renderCursor() {
      ring.x += (pointer.x - ring.x) * 0.14;
      ring.y += (pointer.y - ring.y) * 0.14;

      if (cursorDot) {
        cursorDot.style.transform =
          "translate3d(" + (pointer.x - 3) + "px," + (pointer.y - 3) + "px,0)";
      }
      if (cursorRing) {
        var size = cursorRing.classList.contains("is-project")
          ? 88
          : cursorRing.classList.contains("is-link")
            ? 64
            : 44;
        cursorRing.style.transform =
          "translate3d(" +
          (ring.x - size / 2) +
          "px," +
          (ring.y - size / 2) +
          "px,0)";
      }

      requestAnimationFrame(renderCursor);
    }

    window.addEventListener(
      "pointermove",
      function (event) {
        pointer.x = event.clientX;
        pointer.y = event.clientY;

        if (!cursorVisible) {
          cursorVisible = true;
          if (cursorDot) cursorDot.style.opacity = "1";
          if (cursorRing) cursorRing.style.opacity = "1";
        }

        var target = event.target.closest("a, button, [data-cursor-label]");
        var projectTarget = event.target.closest("[data-cursor-label]");
        if (cursorRing) {
          cursorRing.classList.toggle(
            "is-link",
            Boolean(target) && !projectTarget,
          );
          cursorRing.classList.toggle("is-project", Boolean(projectTarget));
        }
        if (cursorLabel && projectTarget) {
          cursorLabel.textContent = projectTarget.dataset.cursorLabel || "VER";
        }
      },
      { passive: true },
    );

    document.addEventListener("mouseleave", function () {
      cursorVisible = false;
      if (cursorDot) cursorDot.style.opacity = "0";
      if (cursorRing) cursorRing.style.opacity = "0";
    });

    requestAnimationFrame(renderCursor);
  }

  /* --------------------------------------------------------------------------
     Responsive network canvas
     -------------------------------------------------------------------------- */

  function NetworkField(canvas, options) {
    if (!canvas || reduceMotion) return;

    var context = canvas.getContext("2d");
    if (!context) return;

    var settings = Object.assign(
      {
        desktopCount: 42,
        mobileCount: 20,
        distance: 150,
        speed: 0.12,
        color: "199, 169, 107",
        nodeColor: "216, 255, 106",
      },
      options || {},
    );

    var width = 0;
    var height = 0;
    var ratio = 1;
    var nodes = [];
    var visible = true;
    var pointerState = { x: -1000, y: -1000, active: false };
    var frameId = 0;

    function makeNode() {
      var angle = Math.random() * Math.PI * 2;
      var velocity = settings.speed * (0.45 + Math.random() * 0.8);
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        radius: 0.7 + Math.random() * 1.4,
        phase: Math.random() * Math.PI * 2,
      };
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      ratio = Math.min(window.devicePixelRatio || 1, 1.6);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);

      var desiredCount =
        width < 700 ? settings.mobileCount : settings.desktopCount;
      nodes = Array.from({ length: desiredCount }, makeNode);
    }

    function draw(time) {
      if (!visible) {
        frameId = requestAnimationFrame(draw);
        return;
      }

      context.clearRect(0, 0, width, height);

      for (var i = 0; i < nodes.length; i += 1) {
        var node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -5) node.x = width + 5;
        if (node.x > width + 5) node.x = -5;
        if (node.y < -5) node.y = height + 5;
        if (node.y > height + 5) node.y = -5;

        if (pointerState.active) {
          var pointerDx = node.x - pointerState.x;
          var pointerDy = node.y - pointerState.y;
          var pointerDistance = Math.sqrt(
            pointerDx * pointerDx + pointerDy * pointerDy,
          );

          if (pointerDistance < 130 && pointerDistance > 0) {
            var force = (130 - pointerDistance) / 130;
            node.x += (pointerDx / pointerDistance) * force * 0.65;
            node.y += (pointerDy / pointerDistance) * force * 0.65;
          }
        }

        for (var j = i + 1; j < nodes.length; j += 1) {
          var other = nodes[j];
          var dx = node.x - other.x;
          var dy = node.y - other.y;
          var distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < settings.distance) {
            var opacity = (1 - distance / settings.distance) * 0.22;
            context.beginPath();
            context.moveTo(node.x, node.y);
            context.lineTo(other.x, other.y);
            context.strokeStyle =
              "rgba(" + settings.color + ", " + opacity.toFixed(3) + ")";
            context.lineWidth = 0.7;
            context.stroke();
          }
        }

        var pulse = 0.75 + Math.sin(time * 0.001 + node.phase) * 0.25;
        context.beginPath();
        context.arc(node.x, node.y, node.radius * pulse, 0, Math.PI * 2);
        context.fillStyle = "rgba(" + settings.nodeColor + ", 0.48)";
        context.fill();
      }

      frameId = requestAnimationFrame(draw);
    }

    function updatePointer(event) {
      var rect = canvas.getBoundingClientRect();
      if (
        event.clientX >= rect.left &&
        event.clientX <= rect.right &&
        event.clientY >= rect.top &&
        event.clientY <= rect.bottom
      ) {
        pointerState.x = event.clientX - rect.left;
        pointerState.y = event.clientY - rect.top;
        pointerState.active = true;
      } else {
        pointerState.active = false;
      }
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });
    window.addEventListener("pointermove", updatePointer, { passive: true });

    if ("IntersectionObserver" in window) {
      var canvasObserver = new IntersectionObserver(
        function (entries) {
          visible = entries[0].isIntersecting;
        },
        { rootMargin: "100px" },
      );
      canvasObserver.observe(canvas);
    }

    frameId = requestAnimationFrame(draw);

    return function destroy() {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", updatePointer);
    };
  }

  NetworkField(document.getElementById("network-canvas"), {
    desktopCount: 50,
    mobileCount: 24,
    distance: 165,
    speed: 0.11,
  });

  NetworkField(document.getElementById("contact-canvas"), {
    desktopCount: 32,
    mobileCount: 16,
    distance: 190,
    speed: 0.08,
    color: "216, 255, 106",
    nodeColor: "199, 169, 107",
  });

  /* --------------------------------------------------------------------------
     Footer
     -------------------------------------------------------------------------- */

  var year = document.querySelector("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
