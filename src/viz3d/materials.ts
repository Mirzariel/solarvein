/**
 * Shared materials for one stage (docs/audit/05-creative-direction.md 6.2, real-product look).
 *
 * One `StageMaterials` per <Canvas>: it owns the clipping plane of that stage's cross-section (so the two
 * stages never clip each other) and every material. Layer materials are registered per layer so the focus
 * dimming can fade them without recompiling shaders: in the `dimmable` (inspect) variant they are created
 * `transparent` from the start (the shader variant never changes), in the experience variant they stay opaque.
 * Textures are procedural and cached at module level (textures.ts).
 *
 * `setWetness(0..1)` drives the rain look: droplet bump on the glass, lower glass roughness, darker cells.
 */
import * as THREE from 'three';
import type { LayerId } from './dims';
import { COLORS } from './palette';
import { brushedRough, cellTexture, copperRough, dropletBump, foamNormal, glassRough } from './textures';

export { COLORS };

/** Raycast that never hits (decorative meshes must not intercept pointer events). */
export const noRaycast = (): void => undefined;

/**
 * Make a transparent material keep its reflections: alpha is raised by a fresnel term and by the specular
 * energy, so a 14 %-opaque glass still shows the softbox streak and a bright rim, and translucent copper keeps
 * its highlights.
 */
function reflectiveAlpha(m: THREE.MeshPhysicalMaterial | THREE.MeshStandardMaterial, _fresnel: number, spec: number, key: string): void {
  // premultiplied alpha: the body (diffuse) is only `opacity` opaque, but the specular / reflection part is added at
  // `spec` strength regardless of opacity, so a 14 %-opaque glass still carries the softbox streak and rim reflections.
  m.premultipliedAlpha = true;
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `vec3 svBody = totalDiffuse + totalEmissiveRadiance;
       vec3 svSpec = max(outgoingLight - svBody, vec3(0.0));
       gl_FragColor = vec4(svBody * diffuseColor.a + svSpec * ${spec.toFixed(3)}, diffuseColor.a);`,
    );
  };
  m.customProgramCacheKey = () => key;
}
/** Vertex-coloured liquid gets a small self-lit share of its own colour (reads in the shade). */
function selfLitVertexColour(m: THREE.MeshStandardMaterial, amount: number): void {
  m.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       totalEmissiveRadiance += diffuseColor.rgb * ${amount.toFixed(3)};`,
    );
  };
  m.customProgramCacheKey = () => 'sv-liquid-selflit';
}

function tiled(tex: THREE.Texture, rx: number, ry: number): THREE.Texture {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.needsUpdate = true;
  return t;
}

interface DimEntry {
  mat: THREE.Material;
  base: number;
  wasOpaque: boolean;
}

export interface StageMaterials {
  /** This stage's cross-section plane (normal -Z: the half z > constant is removed). */
  clip: THREE.Plane;
  clipPlanes: THREE.Plane[];
  setCrossSection: (enabled: boolean) => void;
  /** 0 dry .. 1 wet glass (droplets, lower roughness, darker cells). */
  setWetness: (w: number) => void;
  glass: THREE.MeshPhysicalMaterial;
  laminate: THREE.MeshStandardMaterial;
  cellTop: THREE.MeshPhysicalMaterial;
  tim: THREE.MeshStandardMaterial;
  absorber: THREE.MeshStandardMaterial;
  copperInner: THREE.MeshStandardMaterial;
  copperSolid: THREE.MeshStandardMaterial;
  hose: THREE.MeshPhysicalMaterial;
  liquid: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  rail: THREE.MeshStandardMaterial;
  backsheet: THREE.MeshStandardMaterial;
  foam: THREE.MeshStandardMaterial;
  groove: THREE.MeshStandardMaterial;
  rubber: THREE.MeshStandardMaterial;
  plastic: THREE.MeshStandardMaterial;
  cable: THREE.MeshStandardMaterial;
  /** Flat cut-face material for a colour (cached). */
  cap: (hex: string) => THREE.MeshBasicMaterial;
  /** Fade every material of a layer: k = 1 normal .. 0 almost invisible. Cheap, no recompiles. */
  dimLayer: (id: LayerId, k: number) => void;
  dispose: () => void;
}

const CLIP_OFF = 1e4;

export function createStageMaterials(dimmable: boolean): StageMaterials {
  const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), CLIP_OFF);
  const clipPlanes = [clip];
  const registry: Record<LayerId, DimEntry[]> = { glass: [], cells: [], interface: [], absorber: [], channel: [], insulation: [] };
  const all: THREE.Material[] = [];
  const owned: THREE.Texture[] = [];

  const reg = <M extends THREE.Material>(layer: LayerId, m: M, opaque: boolean): M => {
    registry[layer].push({ mat: m, base: m.opacity, wasOpaque: opaque });
    all.push(m);
    return m;
  };
  const solid = (layer: LayerId, p: THREE.MeshStandardMaterialParameters): THREE.MeshStandardMaterial =>
    reg(layer, new THREE.MeshStandardMaterial({ ...p, clippingPlanes: clipPlanes, transparent: dimmable, opacity: 1 }), true);
  const solidPhys = (layer: LayerId, p: THREE.MeshPhysicalMaterialParameters): THREE.MeshPhysicalMaterial =>
    reg(layer, new THREE.MeshPhysicalMaterial({ ...p, clippingPlanes: clipPlanes, transparent: dimmable, opacity: 1 }), true);
  const own = <T extends THREE.Texture>(t: T): T => {
    owned.push(t);
    return t;
  };

  // ── glass: ior 1.5, very low roughness with faint imperfections, fresnel-ish rim, droplet bump when wet ──
  const dropBump = own(tiled(dropletBump(), 1.6, 2.6) as THREE.Texture);
  const glass = reg(
    'glass',
    new THREE.MeshPhysicalMaterial({
      color: '#0c1115', // glass has no diffuse scatter: only reflections (specular) + a slight tint of what is behind it
      transparent: true,
      opacity: 0.1,
      roughness: 0.1,
      roughnessMap: glassRough(),
      metalness: 0,
      ior: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.35,
      bumpMap: dropBump,
      bumpScale: 0,
      depthWrite: false,
      clippingPlanes: clipPlanes,
    }),
    false,
  );
  reflectiveAlpha(glass, 0, 1.0, 'sv-glass');

  // ── PV laminate + mono-PERC cells ──
  const laminate = solid('cells', { color: '#080C16', metalness: 0, roughness: 0.62, envMapIntensity: 0.4 });
  const cellTop = solidPhys('cells', {
    map: cellTexture(),
    metalness: 0.02,
    roughness: 0.34,
    clearcoat: 0,
    envMapIntensity: 0.16,
    sheen: 0.18, // anti-reflective coating: a blue sheen toward grazing angles
    sheenColor: new THREE.Color('#4a74e0'),
    sheenRoughness: 0.45,
    emissive: '#000000',
    emissiveIntensity: 0,
  });

  const tim = solid('interface', { color: COLORS.tim, metalness: 0.05, roughness: 0.95 });
  const brushedAbs = own(tiled(brushedRough(), 3, 3));
  const absorber = solid('absorber', { color: '#7C858F', metalness: 0.92, roughness: 0.5, roughnessMap: brushedAbs, envMapIntensity: 0.42 });

  // ── copper: warm metal with slight oxidation variation ──
  const cuRough = copperRough();
  const copperInner = reg(
    'channel',
    new THREE.MeshStandardMaterial({
      color: COLORS.copper,
      metalness: 1,
      roughness: 0.34,
      roughnessMap: cuRough,
      transparent: dimmable,
      opacity: dimmable ? 0.45 : 1,
      depthWrite: !dimmable,
      clippingPlanes: clipPlanes,
    }),
    !dimmable,
  );
  if (dimmable) reflectiveAlpha(copperInner, 0, 0.55, 'sv-copper-cut');
  const copperSolid = solid('channel', { color: '#C77F49', metalness: 1, roughness: 0.3, roughnessMap: cuRough });

  const hose = reg(
    'channel',
    new THREE.MeshPhysicalMaterial({
      color: '#D7E0E4',
      transparent: true,
      opacity: 0.2,
      roughness: 0.18,
      metalness: 0,
      ior: 1.45,
      clearcoat: 0.6,
      depthWrite: false,
      clippingPlanes: clipPlanes,
    }),
    false,
  );
  reflectiveAlpha(hose, 0, 1.0, 'sv-hose');

  const liquid = reg(
    'channel',
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      color: '#ffffff',
      roughness: 0.3,
      metalness: 0,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      clippingPlanes: clipPlanes,
    }),
    false,
  );
  selfLitVertexColour(liquid, 0.24);

  // ── aluminium, polymers, foam ──
  const brushedFrame = own(tiled(brushedRough(), 1, 6));
  const frame = solid('insulation', { color: '#CCD3D9', metalness: 0.95, roughness: 0.36, roughnessMap: brushedFrame });
  const rail = solid('insulation', { color: '#40464D', metalness: 0.75, roughness: 0.5, roughnessMap: brushedFrame });
  const backsheet = solid('insulation', { color: '#20252A', metalness: 0.05, roughness: 0.62 });
  const foamN = own(tiled(foamNormal(), 14, 24));
  const foam = solid('insulation', { color: '#43484D', metalness: 0, roughness: 0.96, normalMap: foamN, normalScale: new THREE.Vector2(0.9, 0.9) });
  const groove = solid('insulation', { color: COLORS.groove, metalness: 0, roughness: 1 });
  const rubber = solid('insulation', { color: '#121416', metalness: 0, roughness: 0.82 });
  const plastic = solid('insulation', { color: '#1A1C20', metalness: 0.05, roughness: 0.5 });
  const cable = solid('insulation', { color: '#0C0D0F', metalness: 0, roughness: 0.55 });

  const caps = new Map<string, THREE.MeshBasicMaterial>();
  const cap = (hex: string): THREE.MeshBasicMaterial => {
    let m = caps.get(hex);
    if (!m) {
      m = new THREE.MeshBasicMaterial({ color: hex, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
      caps.set(hex, m);
      all.push(m);
    }
    return m;
  };

  const dimLayer = (id: LayerId, k: number): void => {
    for (const e of registry[id]) {
      e.mat.opacity = e.base * k;
      if (e.wasOpaque) e.mat.depthWrite = k > 0.55;
    }
  };

  let wet = -1;
  const setWetness = (w: number): void => {
    if (Math.abs(w - wet) < 0.004) return;
    wet = w;
    glass.bumpScale = 1.5 * w;
    glass.envMapIntensity = 1.35 - 0.7 * w;
    glass.roughness = 0.1 - 0.06 * w;
    glass.opacity = 0.1 + 0.04 * w;
    registry.glass[0]!.base = glass.opacity;
    cellTop.color.setScalar(1 - 0.3 * w);
    frame.roughness = 0.36 - 0.1 * w;
  };

  return {
    clip,
    clipPlanes,
    setCrossSection: (enabled) => {
      clip.constant = enabled ? 0 : CLIP_OFF;
    },
    setWetness,
    glass,
    laminate,
    cellTop,
    tim,
    absorber,
    copperInner,
    copperSolid,
    hose,
    liquid,
    frame,
    rail,
    backsheet,
    foam,
    groove,
    rubber,
    plastic,
    cable,
    cap,
    dimLayer,
    dispose: () => {
      for (const t of owned) t.dispose();
      for (const m of all) m.dispose();
    },
  };
}
