import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

// Eight machined members. The same material, geometry and joints persist through
// the exploded letterform, the product aperture and the resolved monogram.
const HERO = [
  [
    [-2.3, -1.57, 0.28],
    [-2.3, 1.65, 0.28],
  ],
  [
    [-2.12, 1.55, 0.67],
    [-0.79, -0.02, 0.67],
  ],
  [
    [-0.76, -0.16, -0.16],
    [0.54, 1.53, -0.16],
  ],
  [
    [0.63, 1.52, -0.39],
    [0.63, -1.62, -0.39],
  ],
  [
    [0.17, 1.9, -0.56],
    [2.72, 1.9, -0.56],
  ],
  [
    [2.49, 1.26, 0.41],
    [0.69, -1.38, 0.41],
  ],
  [
    [0.82, -1.98, 0.71],
    [3.0, -1.98, 0.71],
  ],
  [
    [-2.6, -1.24, -0.78],
    [-0.89, -1.24, -0.78],
  ],
];

const FRAME = [
  [
    [-3.06, 0, 0],
    [-3.06, 1.76, 0],
  ],
  [
    [-3.06, 1.76, 0],
    [0, 1.76, 0],
  ],
  [
    [0, 1.76, 0],
    [3.06, 1.76, 0],
  ],
  [
    [3.06, 1.76, 0],
    [3.06, 0, 0],
  ],
  [
    [3.06, 0, 0],
    [3.06, -1.76, 0],
  ],
  [
    [3.06, -1.76, 0],
    [0, -1.76, 0],
  ],
  [
    [0, -1.76, 0],
    [-3.06, -1.76, 0],
  ],
  [
    [-3.06, -1.76, 0],
    [-3.06, 0, 0],
  ],
];

const RESOLVED = [
  [
    [-2.34, -1.47, 0],
    [-2.34, 1.47, 0],
  ],
  [
    [-2.3, 1.45, 0.12],
    [-1.01, -0.11, 0.12],
  ],
  [
    [-1.01, -0.11, 0.12],
    [0.23, 1.45, 0.12],
  ],
  [
    [0.24, 1.47, 0],
    [0.24, -1.47, 0],
  ],
  [
    [0.74, 1.47, 0],
    [2.83, 1.47, 0],
  ],
  [
    [2.69, 1.35, 0.12],
    [0.77, -1.34, 0.12],
  ],
  [
    [0.63, -1.47, 0],
    [2.83, -1.47, 0],
  ],
  [
    [-2.34, -1.47, -0.45],
    [0.24, -1.47, -0.45],
  ],
];

const WIDTHS = [0.43, 0.54, 0.46, 0.34, 0.39, 0.49, 0.43, 0.23];
const DEPTHS = [0.65, 0.34, 0.57, 0.55, 0.48, 0.59, 0.46, 0.3];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const ease = (value) => value * value * (3 - 2 * value);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const center = new THREE.Vector3();
const quat = new THREE.Quaternion();
const euler = new THREE.Euler();

function poseFromEndpoints(endpoints) {
  const a = new THREE.Vector3(...endpoints[0]);
  const b = new THREE.Vector3(...endpoints[1]);
  const direction = b.clone().sub(a);
  return {
    position: a.add(b).multiplyScalar(0.5),
    quaternion: new THREE.Quaternion().setFromUnitVectors(
      Y_AXIS,
      direction.clone().normalize(),
    ),
    length: direction.length(),
  };
}

const POSES = [HERO, FRAME, RESOLVED].map((poses) =>
  poses.map(poseFromEndpoints),
);

/**
 * A viewport-sized, transparent, orthographic scene. Bounds are CSS pixels and
 * remain controlled by the document; neither scrolling nor content depends on it.
 */
export function createSignature(
  canvas,
  { onReady = () => {}, onError = () => {} } = {},
) {
  let renderer;
  let environment;
  let disposed = false;
  let failed = false;
  let raf = 0;
  let previousTime = 0;
  let firstRender = true;
  let width = 1;
  let height = 1;
  let slowFrames = 0;
  let samples = 0;
  let settlingUntil = 0;
  let devicePixelRatio = 1;
  let renderedOpacity = 0;
  let lowQuality = false;
  let shadowCatcher;
  let state = {
    mode: "hero",
    progress: 0,
    opacity: 1,
    active: true,
    reducedMotion: false,
    pointer: { x: 0, y: 0 },
    bounds: { x: 0, y: 0, width: 640, height: 620 },
  };

  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  const instances = new Set();
  const shadowResources = new Set();
  const members = [];
  const boltInstances = [];
  const jointMatrix = new THREE.Matrix4();
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
  camera.position.z = 1800;
  const assembly = new THREE.Group();
  const sculpture = new THREE.Group();
  assembly.add(sculpture);
  scene.add(assembly);

  const ownGeometry = (geometry) => (geometries.add(geometry), geometry);
  const ownMaterial = (material) => (materials.add(material), material);

  function fail(error) {
    if (failed || disposed) return;
    failed = true;
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.dataset.ready = "false";
    onError(error);
  }

  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      failIfMajorPerformanceCaveat: true,
    });
    renderer.setClearColor(0xeee9df, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    // A local studio supplies long, quiet reflections without remote HDR assets.
    const room = new RoomEnvironment();
    const generator = new THREE.PMREMGenerator(renderer);
    environment = generator.fromScene(room, 0.05);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.82;
    room.dispose();
    generator.dispose();

    scene.add(new THREE.HemisphereLight(0xfbf8ee, 0x373b37, 1.4));
    const key = new THREE.DirectionalLight(0xfffbef, 3.0);
    key.position.set(-260, 450, 1600);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -1000,
      right: 1000,
      top: 850,
      bottom: -850,
      near: 1,
      far: 2400,
    });
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.15;
    key.shadow.radius = 5;
    key.shadow.camera.updateProjectionMatrix();
    shadowResources.add(key.shadow);
    scene.add(key);
    const edge = new THREE.DirectionalLight(0xe4ebe4, 3.2);
    edge.position.set(650, 200, -400);
    scene.add(edge);
    const fill = new THREE.DirectionalLight(0xa6ad9d, 1.0);
    fill.position.set(-350, -500, 450);
    scene.add(fill);

    // Small variations in the roughness catch the studio light like brushed metal.
    const grainSize = 64;
    const grain = new Uint8Array(grainSize * grainSize * 4);
    let seed = 1947;
    for (let y = 0; y < grainSize; y += 1) {
      seed = (seed * 16807) % 2147483647;
      const line = 238 + Math.floor((seed / 2147483647) * 12);
      for (let x = 0; x < grainSize; x += 1) {
        const i = (y * grainSize + x) * 4;
        grain[i] = grain[i + 1] = grain[i + 2] = line;
        grain[i + 3] = 255;
      }
    }
    const roughnessMap = new THREE.DataTexture(
      grain,
      grainSize,
      grainSize,
      THREE.RGBAFormat,
    );
    roughnessMap.wrapS = roughnessMap.wrapT = THREE.RepeatWrapping;
    roughnessMap.repeat.set(1, 16);
    roughnessMap.magFilter = THREE.LinearFilter;
    roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
    roughnessMap.generateMipmaps = true;
    roughnessMap.needsUpdate = true;
    textures.add(roughnessMap);

    const graphite = ownMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x252b26,
        metalness: 0.74,
        roughness: 0.41,
        roughnessMap,
        envMapIntensity: 0.9,
      }),
    );
    const aluminum = ownMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xa6aa9b,
        metalness: 0.87,
        roughness: 0.32,
        roughnessMap,
        envMapIntensity: 1.08,
      }),
    );
    const darkInset = ownMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x171d19,
        metalness: 0.4,
        roughness: 0.5,
      }),
    );
    const brass = ownMaterial(
      new THREE.MeshStandardMaterial({
        color: 0xaf8850,
        metalness: 0.83,
        roughness: 0.31,
        envMapIntensity: 0.85,
      }),
    );
    const insetAluminum = ownMaterial(
      new THREE.MeshStandardMaterial({
        color: 0x62685b,
        metalness: 0.78,
        roughness: 0.39,
      }),
    );
    const palette = [
      graphite,
      aluminum,
      graphite,
      aluminum,
      aluminum,
      graphite,
      aluminum,
      graphite,
    ];
    shadowCatcher = new THREE.Mesh(
      ownGeometry(new THREE.PlaneGeometry(7.6, 6.0)),
      ownMaterial(
        new THREE.ShadowMaterial({
          opacity: 0.045,
          color: 0x323a2b,
          depthWrite: false,
        }),
      ),
    );
    shadowCatcher.position.z = -1.5;
    shadowCatcher.receiveShadow = true;
    assembly.add(shadowCatcher);
    const boltGeometry = ownGeometry(
      new THREE.CylinderGeometry(0.039, 0.039, 0.018, 12),
    );
    boltGeometry.rotateX(Math.PI / 2);
    boltGeometry.translate(0, 0, 0.006);
    const socketGeometry = ownGeometry(
      new THREE.CylinderGeometry(0.051, 0.051, 0.008, 16),
    );
    socketGeometry.rotateX(Math.PI / 2);
    const slotGeometry = ownGeometry(
      new THREE.BoxGeometry(0.026, 0.006, 0.003),
    );
    slotGeometry.rotateZ(Math.PI / 4);
    slotGeometry.translate(0, 0, 0.017);
    for (const [geometry, material] of [
      [socketGeometry, darkInset],
      [boltGeometry, brass],
      [slotGeometry, darkInset],
    ]) {
      const mesh = new THREE.InstancedMesh(geometry, material, 14);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.frustumCulled = false;
      sculpture.add(mesh);
      boltInstances.push(mesh);
      instances.add(mesh);
    }

    for (let i = 0; i < HERO.length; i += 1) {
      const part = new THREE.Group();
      const beam = new THREE.Group();
      const nominalLength = POSES[0][i].length;
      const beamWidth = WIDTHS[i];
      const depth = DEPTHS[i];

      const body = new THREE.Mesh(
        ownGeometry(
          new RoundedBoxGeometry(beamWidth, nominalLength, depth, 2, 0.035),
        ),
        palette[i],
      );
      body.castShadow = true;
      body.receiveShadow = true;
      beam.add(body);

      // A recessed, dark side channel gives each member a manufactured section.
      // It stays within the silhouette; no decorative floating lines or particles.
      const channel = new THREE.Mesh(
        ownGeometry(
          new RoundedBoxGeometry(
            0.012,
            nominalLength * 0.8,
            depth * 0.35,
            1,
            0.004,
          ),
        ),
        palette[i] === graphite ? darkInset : insetAluminum,
      );
      channel.position.set(beamWidth / 2 + 0.003, 0, 0);
      beam.add(channel);

      // Thin end inserts and countersunk joints hold up at close framing.
      const inserts = new THREE.InstancedMesh(
        ownGeometry(
          new THREE.BoxGeometry(beamWidth * 0.72, 0.012, depth * 0.79),
        ),
        brass,
        2,
      );
      inserts.setMatrixAt(
        0,
        jointMatrix.makeTranslation(0, -(nominalLength / 2 - 0.07), 0),
      );
      inserts.setMatrixAt(
        1,
        jointMatrix.makeTranslation(0, nominalLength / 2 - 0.07, 0),
      );
      inserts.instanceMatrix.needsUpdate = true;
      instances.add(inserts);
      beam.add(inserts);
      part.add(beam);
      const initial = POSES[0][i];
      part.position.copy(initial.position);
      part.quaternion.copy(initial.quaternion);
      sculpture.add(part);
      members.push({ part, beam, depth, nominalLength, length: nominalLength });
    }
  } catch (error) {
    fail(error);
  }

  function updateSculpture(delta, immediate) {
    const p = ease(clamp(Number(state.progress) || 0, 0, 1));
    const chapter =
      state.mode === "contact" ? 2 : state.mode === "product" ? 1 : 0;
    const from = chapter === 2 ? POSES[1] : POSES[0];
    const to = chapter === 2 ? POSES[2] : chapter === 1 ? POSES[1] : POSES[0];
    const blend = chapter === 0 ? 0 : p;
    const damping = immediate ? 1 : 1 - Math.exp(-delta * 8.5);

    for (let i = 0; i < members.length; i += 1) {
      const { part, beam, depth, nominalLength } = members[i];
      center.lerpVectors(from[i].position, to[i].position, blend);
      quat.copy(from[i].quaternion).slerp(to[i].quaternion, blend);
      const targetLength = THREE.MathUtils.lerp(
        from[i].length,
        to[i].length,
        blend,
      );
      part.position.lerp(center, damping);
      part.quaternion.slerp(quat, damping);
      members[i].length = THREE.MathUtils.lerp(
        members[i].length,
        targetLength,
        damping,
      );
      beam.scale.y = members[i].length / nominalLength;
      part.updateMatrix();
      if (i !== 7) {
        for (let endIndex = 0; endIndex < 2; endIndex += 1) {
          const end = endIndex === 0 ? -1 : 1;
          jointMatrix.makeTranslation(
            0,
            end * (members[i].length / 2 - 0.18),
            depth / 2 + 0.006,
          );
          jointMatrix.premultiply(part.matrix);
          for (const bolts of boltInstances)
            bolts.setMatrixAt(i * 2 + endIndex, jointMatrix);
        }
      }
    }
    for (const bolts of boltInstances) bolts.instanceMatrix.needsUpdate = true;

    const pointerX = state.reducedMotion
      ? 0
      : clamp(state.pointer.x || 0, -1, 1);
    const pointerY = state.reducedMotion
      ? 0
      : clamp(state.pointer.y || 0, -1, 1);
    const heroRotation = v1.set(0.16, -0.52, -0.085);
    const frameRotation = v2.set(0.025, -0.025, 0);
    if (chapter === 2) {
      heroRotation.copy(frameRotation);
      frameRotation.set(-0.13, -0.23, -0.018);
    }
    heroRotation.lerp(frameRotation, chapter === 0 ? 0 : p);
    const interaction = chapter === 1 ? 1 - p * 0.85 : 1;
    euler.set(
      heroRotation.x + pointerY * 0.026 * interaction,
      heroRotation.y + pointerX * 0.039 * interaction,
      heroRotation.z,
    );
    quat.setFromEuler(euler);
    sculpture.quaternion.slerp(quat, damping);

    const bounds = state.bounds;
    const frameAmount = chapter === 2 ? 1 - p : chapter === 1 ? p : 0;
    const nominalWidth = THREE.MathUtils.lerp(6.15, 6.64, frameAmount);
    const nominalHeight = THREE.MathUtils.lerp(5.2, 4.1, frameAmount);
    const scale = Math.max(
      0.01,
      Math.min(bounds.width / nominalWidth, bounds.height / nominalHeight),
    );
    const targetX = bounds.x - width / 2;
    const targetY = height / 2 - bounds.y;
    // Viewport positioning is immediate so the canvas stays aligned with DOM
    // through resize and restored scroll positions. Only the sculpture is damped.
    assembly.position.set(targetX, targetY, 0);
    assembly.scale.setScalar(scale);
    renderedOpacity = THREE.MathUtils.lerp(
      renderedOpacity,
      clamp(state.opacity, 0, 1),
      damping,
    );
    canvas.style.opacity = String(renderedOpacity);
  }

  function canAnimate() {
    return (
      !disposed &&
      !failed &&
      state.active &&
      state.opacity > 0 &&
      !document.hidden
    );
  }

  function setShadowQuality(enabled) {
    // A disabled shadow map can leave its last sampled texture on a compiled
    // ShadowMaterial. Hide the receiver and invalidate shader variants together.
    if (shadowCatcher) shadowCatcher.visible = enabled;
    if (renderer.shadowMap.enabled === enabled) return;
    renderer.shadowMap.enabled = enabled;
    materials.forEach((material) => {
      material.needsUpdate = true;
    });
  }

  function draw(time = performance.now(), once = false) {
    raf = 0;
    if (!canAnimate()) return;
    const delta = previousTime
      ? Math.min((time - previousTime) / 1000, 0.05)
      : 1 / 60;
    previousTime = time;
    const settled = !firstRender && time >= settlingUntil;
    try {
      updateSculpture(
        delta,
        firstRender || state.reducedMotion || once || settled,
      );
      renderer.render(scene, camera);
      if (firstRender) {
        firstRender = false;
        settlingUntil = performance.now() + 1800;
        canvas.dataset.ready = "true";
        onReady();
      }
      // Sustained slow frames lower pixel count once; brief tab/scroll stalls do not.
      if (!state.reducedMotion && !once && samples < 60) {
        samples += 1;
        if (delta > 0.032) slowFrames += 1;
        if (samples === 48 && slowFrames > 18) {
          lowQuality = true;
          devicePixelRatio = Math.min(devicePixelRatio, 1);
          setShadowQuality(false);
          renderer.setPixelRatio(devicePixelRatio);
          renderer.setSize(width, height, false);
        }
      }
    } catch (error) {
      fail(error);
      return;
    }
    if (!state.reducedMotion && !once && !settled && canAnimate())
      raf = requestAnimationFrame(draw);
  }

  function requestDraw() {
    if (!canAnimate()) return;
    // Scroll and pointer input open a short settling window. A still sculpture
    // schedules no frames; the final render snaps remaining subpixel differences.
    settlingUntil = performance.now() + 1800;
    if (raf) return;
    previousTime = 0;
    raf = requestAnimationFrame(draw);
  }

  function visibilityChange() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
      previousTime = 0;
    } else requestDraw();
  }

  function contextLost(event) {
    event.preventDefault();
    fail(new Error("WebGL context lost"));
  }

  document.addEventListener("visibilitychange", visibilityChange);
  canvas.addEventListener("webglcontextlost", contextLost);

  return {
    update(nextState = {}) {
      if (disposed || failed) return;
      state = {
        ...state,
        ...nextState,
        pointer: { ...state.pointer, ...nextState.pointer },
        bounds: { ...state.bounds, ...nextState.bounds },
      };
      canvas.dataset.mode = state.mode;
      if (!canAnimate()) {
        cancelAnimationFrame(raf);
        raf = 0;
        previousTime = 0;
        renderedOpacity = clamp(state.opacity, 0, 1);
        canvas.style.opacity = String(renderedOpacity);
        return;
      }
      requestDraw();
    },

    resize(nextWidth, nextHeight) {
      if (disposed || failed) return;
      width = Math.max(1, nextWidth);
      height = Math.max(1, nextHeight);
      const mobile = width < 760 || (navigator.hardwareConcurrency || 8) <= 4;
      setShadowQuality(!mobile && !lowQuality);
      devicePixelRatio = Math.min(
        window.devicePixelRatio || 1,
        mobile ? 1.25 : 1.5,
      );
      if (lowQuality) devicePixelRatio = Math.min(devicePixelRatio, 1);
      renderer.setPixelRatio(devicePixelRatio);
      renderer.setSize(width, height, false);
      camera.left = -width / 2;
      camera.right = width / 2;
      camera.top = height / 2;
      camera.bottom = -height / 2;
      camera.updateProjectionMatrix();
      requestDraw();
    },

    dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", visibilityChange);
      canvas.removeEventListener("webglcontextlost", contextLost);
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
      instances.forEach((mesh) => mesh.dispose());
      shadowResources.forEach((shadow) => shadow.dispose());
      environment?.dispose();
      renderer?.dispose();
      scene.clear();
    },
  };
}
