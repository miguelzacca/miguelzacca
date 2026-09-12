/* The sculpture's score, in document coordinates. Scroll remains entirely native. */
const clamp = (value) => Math.max(0, Math.min(1, value));
const mix = (a, b, p) => a + (b - a) * p;
const smooth = (p) => p * p * (3 - 2 * p);
const rect = (el) => {
  const r = el.getBoundingClientRect();
  return {
    x: r.left + r.width / 2,
    y: r.top + window.scrollY + r.height / 2,
    width: r.width,
    height: r.height,
    top: r.top + window.scrollY,
    bottom: r.bottom + window.scrollY,
  };
};
const form = {
  resolved: { cross: 1, angle: [0.14, -0.52, -0.04] },
  exploded: { cross: 0.9, angle: [0.3, 0.55, -0.2] },
  helix: { cross: 0.78, angle: [0.48, 1.2, 0.24] },
  spine: { cross: 0.8, angle: [0.2, -0.65, 0.12] },
  frame: { cross: 0.24, angle: [0, 0, 0] },
  corners: { cross: 0.23, angle: [0, 0, 0] },
  network: { cross: 0.25, angle: [0, 0, 0] },
};

export function createJourney() {
  let keys = [],
    w = 1,
    h = 1,
    mobile = false;
  const hero = document.querySelector(".hero__sculpture");
  const bridge = document.querySelector(".assembly__space");
  const map = document.querySelector(".engineering-map");
  const screens = [
    ...document.querySelectorAll(".story-figure .screen-button"),
  ];
  const steps = [...document.querySelectorAll(".story-step")];
  const end = document.querySelector(".contact-emblem");
  const about = document.querySelector(".about-monogram");
  const rail = document.querySelector(".capabilities-sculpture");
  let heroRect;

  function measure() {
    w = window.innerWidth;
    h = window.innerHeight;
    mobile = w <= 700;
    heroRect = rect(hero);
    const bridgeRect = rect(bridge);
    const project = rect(document.querySelector("#conectei"));
    const heading = rect(document.querySelector(".project__heading"));
    const story = rect(document.querySelector(".product-story"));
    const flow = rect(document.querySelector(".connected-flow"));
    const engineering = rect(document.querySelector("#engenharia"));
    const mapRect = rect(map);
    const capabilities = rect(document.querySelector("#capacidades"));
    const railRect = rect(rail);
    const aboutRect = rect(about);
    const contact = rect(document.querySelector("#contato"));
    const endRect = rect(end);
    const edge = mobile ? w - 9 : w - 32;
    const unit = (r) => Math.min(r.width / 6.8, r.height / 5.2);
    const fixed = (x, y, scale) => ({ x, y, scale });
    const point = (r, at, scale = unit(r)) => fixed(r.x, r.y - at, scale);
    const add = (at, pose, bounds, options = {}) =>
      keys.push({
        at: Math.max(0, at),
        pose,
        ...form[pose],
        bounds,
        ratio: 1.74,
        ...options,
      });
    const frameBounds = (index) => {
      const r = screens[index].getBoundingClientRect();
      const gap = mobile ? 8 : 22;
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        scale: (r.width + gap) / 6.12,
        ratio: (r.width + gap) / (r.height + gap),
      };
    };
    keys = [];
    add(0, "resolved", point(heroRect, 0), { identity: true });
    // The mark first follows its page position, then lifts clear as the pieces release.
    const lift = Math.max(40, heroRect.top + heroRect.height * 0.12);
    add(lift, "resolved", point(heroRect, lift), { identity: true });
    const release = Math.max(lift + 120, bridgeRect.top - h * 0.72);
    add(release, "exploded", fixed(bridgeRect.x, h * 0.49, unit(bridgeRect)), {
      arc: -0.08,
    });
    const spiralAt = Math.max(release + 120, bridgeRect.y - h * 0.48);
    add(
      spiralAt,
      "helix",
      point(bridgeRect, spiralAt, unit(bridgeRect) * 1.04),
      { angle: [0.6, 1.9, -0.35] },
    );
    if (!mobile) {
      const headingAt = Math.max(spiralAt + 90, heading.y - h * 0.28);
      add(headingAt, "exploded", fixed(w * 0.77, h * 0.27, 30), {
        angle: [0.3, 2.7, 0.24],
        arc: 0.08,
      });
    }
    const marginAt = Math.max(spiralAt + 190, project.top + 390 - h * 0.3);
    add(marginAt, "spine", fixed(edge, h * 0.5, mobile ? 8 : 16), {
      angle: [0.1, 0.7, 0],
    });
    if (w >= 1000 && h >= 650) {
      const entry = story.top - h * 0.68;
      add(Math.max(marginAt + 60, entry), "corners", frameBounds(0), {
        live: () => frameBounds(0),
        arc: 0.03,
      });
      add(story.top - 80, "frame", frameBounds(0), {
        live: () => frameBounds(0),
      });
      steps.slice(1).forEach((step, i) => {
        const threshold = rect(step).top - h * 0.47;
        add(threshold - 95, "frame", frameBounds(i), {
          live: () => frameBounds(i),
        });
        add(threshold, "corners", frameBounds(i), {
          live: () => frameBounds(i),
        });
        add(threshold + 110, "frame", frameBounds(i + 1), {
          live: () => frameBounds(i + 1),
        });
      });
      add(story.bottom - h * 0.66, "frame", frameBounds(2), {
        live: () => frameBounds(2),
      });
    } else {
      // Inline screens can share a tall viewport. Their center-to-center
      // intervals prevent one frame's entrance from overtaking another's exit.
      const centers = screens.map((screen) => rect(screen).y - h * 0.5);
      screens.forEach((_, index) => {
        const at = centers[index];
        const previous = index ? centers[index - 1] : marginAt;
        const next = centers[index + 1] ?? flow.top - h * 0.2;
        const before = Math.max(60, at - previous);
        const after = Math.max(60, next - at);
        add(
          at - Math.min(h * 0.36, before * 0.35),
          "corners",
          frameBounds(index),
          {
            live: () => frameBounds(index),
          },
        );
        add(
          at - Math.min(h * 0.12, before * 0.15),
          "frame",
          frameBounds(index),
          {
            live: () => frameBounds(index),
          },
        );
        add(at + Math.min(h * 0.15, after * 0.2), "frame", frameBounds(index), {
          live: () => frameBounds(index),
        });
        add(
          at + Math.min(h * 0.34, after * 0.35),
          "spine",
          fixed(edge, h * 0.5, mobile ? 7 : 14),
        );
      });
    }
    add(flow.top - h * 0.2, "spine", fixed(edge, h * 0.5, mobile ? 7 : 16), {
      angle: [0.2, 2.3, 0.06],
    });
    add(
      engineering.top - h * 0.15,
      "helix",
      fixed(edge, h * 0.37, mobile ? 8 : 19),
      { angle: [0.65, 4.4, 0.14] },
    );
    // The screen frame becomes four open supports around the real HTML responsibilities.
    const mapAt = mapRect.y - h * 0.51;
    add(
      mapAt - h * 0.4,
      "exploded",
      fixed(mapRect.x, h * 0.75, unit(mapRect) * 0.75),
      { angle: [0.7, 5.8, -0.2] },
    );
    add(mapAt, "network", point(mapRect, mapAt, mapRect.width / 6.9), {
      ratio: mapRect.width / mapRect.height,
      live: () => {
        const r = map.getBoundingClientRect();
        return {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          scale: r.width / 6.9,
          ratio: r.width / r.height,
        };
      },
    });
    add(
      mapRect.bottom - h * 0.12,
      "network",
      point(mapRect, mapRect.bottom - h * 0.12, mapRect.width / 6.9),
      {
        ratio: mapRect.width / mapRect.height,
        live: () => {
          const r = map.getBoundingClientRect();
          return {
            x: r.left + r.width / 2,
            y: r.top + r.height / 2,
            scale: r.width / 6.9,
            ratio: r.width / r.height,
          };
        },
      },
    );
    add(
      capabilities.top - h * 0.25,
      "spine",
      fixed(mobile ? 10 : 30, h * 0.5, mobile ? 7 : 15),
      { angle: [0.2, 6.1, -0.1] },
    );
    const railAt = railRect.y - h * 0.5;
    add(railAt, "spine", point(railRect, railAt, mobile ? 8 : 27), {
      angle: [0.2, 6.8, -0.09],
    });
    const aboutAt = aboutRect.y - h * 0.45;
    add(
      aboutAt - h * 0.35,
      "helix",
      fixed(aboutRect.x, h * 0.62, unit(aboutRect)),
      { angle: [0.7, 8.2, -0.4] },
    );
    add(aboutAt, "resolved", point(aboutRect, aboutAt, unit(aboutRect) * 1.2), {
      angle: [0.14, 5.8, -0.04],
    });
    add(
      aboutRect.bottom - h * 0.08,
      "resolved",
      point(aboutRect, aboutRect.bottom - h * 0.08, unit(aboutRect) * 1.2),
      { angle: [0.14, 5.8, -0.04] },
    );
    add(
      contact.top - h * 0.1,
      "exploded",
      fixed(edge, h * 0.44, mobile ? 8 : 19),
      { angle: [0.45, 7.7, 0.3] },
    );
    const finale = endRect.y - h * 0.58;
    add(
      finale - h * 0.45,
      "helix",
      fixed(endRect.x, h * 0.77, unit(endRect) * 0.8),
      { angle: [0.65, 8.5, -0.2] },
    );
    add(finale, "resolved", point(endRect, finale, unit(endRect) * 1.1), {
      angle: [0.14, 5.9, -0.035],
    });
    add(
      document.documentElement.scrollHeight - h,
      "resolved",
      point(
        endRect,
        document.documentElement.scrollHeight - h,
        unit(endRect) * 1.1,
      ),
      { angle: [0.14, 5.9, -0.035] },
    );
    keys.sort((a, b) => a.at - b.at);
  }

  function state(scrollY, assemblyProgress, reducedMotion) {
    if (reducedMotion)
      return {
        mode: "journey",
        active: false,
        opacity: 0,
        reducedMotion: true,
      };
    let index = 0;
    while (index < keys.length - 2 && scrollY >= keys[index + 1].at) index++;
    const a = keys[index],
      b = keys[index + 1] || a;
    const raw = clamp((scrollY - a.at) / Math.max(1, b.at - a.at));
    const p = smooth(raw);
    const source = a.live ? a.live() : a.bounds;
    const target = b.live ? b.live() : b.bounds;
    const ratio = mix(source.ratio || a.ratio, target.ratio || b.ratio, p);
    const shape = {
      mode: "journey",
      fromPose: a.pose,
      toPose: b.pose,
      morph: p,
      unitScale: mix(source.scale, target.scale, p),
      frameAspect: ratio,
      crossSection: mix(a.cross, b.cross, p),
      rotation: a.angle.map((value, i) => mix(value, b.angle[i], p)),
      bounds: {
        x:
          mix(source.x, target.x, p) +
          Math.sin(raw * Math.PI) * w * (b.arc || 0),
        y: mix(source.y, target.y, p),
        width: w,
        height: h,
      },
      active: true,
      opacity: 1,
      reducedMotion: false,
      pointerStrength: a.pose === "resolved" && b.pose === "resolved" ? 1 : 0,
      score: index,
    };
    if (a.identity && b.identity) {
      shape.fromPose = "exploded";
      shape.toPose = "resolved";
      shape.morph = assemblyProgress;
    } else if (a.identity && assemblyProgress < 0.5) {
      shape.fromPose = "exploded";
    }
    // Include the widest formation and its shadow. Skip GPU work entirely when
    // this envelope is outside the viewport, including short mobile openings.
    const radius = shape.unitScale * Math.max(4.8, 3.06 / ratio + 1);
    shape.active = shape.bounds.y + radius > 0 && shape.bounds.y - radius < h;
    if (!shape.active) shape.opacity = 0;
    return shape;
  }
  return {
    measure,
    state,
    get size() {
      return { width: w, height: h };
    },
  };
}
