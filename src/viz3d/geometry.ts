/**
 * Geometry for the collector model, built once per stage and disposed with it.
 * REAL proportions (units = metres): 1.70 x 1.00 m module, 35 mm anodised frame with a true extruded profile
 * (mitred corners, glass slot, top lip, drain groove), 3.2 mm glass, 9 mm copper tube, 15 mm headers.
 * Panel in the XZ plane, +Y = sun side, inlet/outlet stubs leave through the -Z end.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  BACKSHEET_T,
  BACKSHEET_Z0,
  FOAM_TOP_Y,
  FRAME_DEPTH,
  FRAME_LIP_T,
  FRAME_LIP_W,
  FRAME_WALL_T,
  LAYERS,
  PANEL_LENGTH,
  PANEL_WIDTH,
  TUBE_RADIUS,
} from './dims';
import { CELL_FIELD_L, CELL_FIELD_W } from './textures';
import { buildSerpentineRibbon, buildSerpentineTube } from './tubeGeometry';
import { CHANNEL_Y, STUB_LENGTH, getSerpentineLength } from './serpentine';

export const W = PANEL_WIDTH;
export const L = PANEL_LENGTH;
export { CELL_FIELD_L, CELL_FIELD_W };
export const GLASS_TOP = FRAME_DEPTH - FRAME_LIP_T;
export const HEADER_R = 0.0075;
export const HOSE_LEN = 0.115;
export const NUT_LEN = 0.022;
/** Liquid radius inside the clear hose / inside the serpentine. */
export const LIQUID_STUB_R = 0.0058;
export const LIQUID_R = 0.0036;
export const RAIL_H = 0.045;
export const RAIL_Y = -RAIL_H / 2;
/** Top of the roof slab (rails stand on it). */
export const ROOF_Y = -0.045;
export const JBOX = { x: 0.3, y: -0.007, z: 0.2 } as const;
export const RAIL_Z = 0.46;

export const spec = (id: string) => {
  const s = LAYERS.find((l) => l.id === id);
  if (!s) throw new Error(`Unknown layer ${id}`);
  return s;
};

// ── frame ────────────────────────────────────────────────────────────────────────────────────
/** Profile (u inward from the outer face, v up), CCW-agnostic (ExtrudeGeometry normalises). */
const PROFILE: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [0, 0.02],
  [0.0012, 0.0205], // drain groove
  [0.0012, 0.0235],
  [0, 0.024],
  [0, FRAME_DEPTH - 0.0015],
  [0.0015, FRAME_DEPTH],
  [FRAME_LIP_W, FRAME_DEPTH],
  [FRAME_LIP_W, FRAME_DEPTH - FRAME_LIP_T],
  [FRAME_WALL_T, FRAME_DEPTH - FRAME_LIP_T], // glass slot ceiling
  [FRAME_WALL_T, 0.0262],
  [0.0085, 0.0262], // glass shelf
  [0.0085, 0.0235],
  [FRAME_WALL_T, 0.0235],
  [FRAME_WALL_T, 0.003],
  [0.016, 0.003], // rear flange
  [0.016, 0],
];

/** One mitred frame bar: outer face at x = 0, interior towards -x, length along z centred on 0. */
function frameBar(len: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  PROFILE.forEach(([u, v], i) => (i === 0 ? shape.moveTo(-u, v) : shape.lineTo(-u, v)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false, steps: 1 });
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const d = -pos.getX(i); // inward distance from the outer face
    const z = pos.getZ(i);
    if (z < len * 0.5) pos.setZ(i, d);
    else pos.setZ(i, len - d); // 45 degree mitre
  }
  g.translate(0, 0, -len / 2);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

// ── helpers ──────────────────────────────────────────────────────────────────────────────────
const cyl = (r: number, len: number, seg: number, rotZ = true): THREE.BufferGeometry => {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  if (rotZ) g.rotateX(Math.PI / 2); // axis along Z
  return g;
};

export interface CollectorGeometries {
  glass: THREE.BufferGeometry;
  laminate: THREE.BufferGeometry;
  cellTop: THREE.BufferGeometry;
  tim: THREE.BufferGeometry;
  absorber: THREE.BufferGeometry;
  backsheet: THREE.BufferGeometry;
  foam: THREE.BufferGeometry;
  /** Merged static parts (one draw call per material): mitred frame, rails, junction box + connectors, cables, rubber bits. */
  frame: THREE.BufferGeometry;
  rails: THREE.BufferGeometry;
  plasticBits: THREE.BufferGeometry;
  rubberBits: THREE.BufferGeometry;
  cableBits: THREE.BufferGeometry;
  copperInner: THREE.BufferGeometry;
  header: THREE.BufferGeometry;
  nut: THREE.BufferGeometry;
  hose: THREE.BufferGeometry;
  barb: THREE.BufferGeometry;
  liquidIn: THREE.BufferGeometry;
  liquidMid: THREE.BufferGeometry;
  liquidOut: THREE.BufferGeometry;
  groove: THREE.BufferGeometry;
  channelHit: THREE.BufferGeometry;
  plane: THREE.BufferGeometry;
  ringDisc: THREE.BufferGeometry;
  disc: THREE.BufferGeometry;
  /** Arc-length fractions where the stub parts end. */
  uStub: number;
  dispose: () => void;
}

export function createCollectorGeometries(): CollectorGeometries {
  const glass = spec('glass');
  const cells = spec('cells');
  const itf = spec('interface');
  const abs = spec('absorber');
  const ch = spec('channel');
  const len = getSerpentineLength();
  const uStub = (STUB_LENGTH + 0.02) / len;

  const gGlass = new RoundedBoxGeometry(W - 0.008, glass.thickness, L - 0.008, 3, 0.0012);
  const gLam = new THREE.BoxGeometry(W - 0.009, cells.thickness, L - 0.009);
  const gCellTop = new THREE.PlaneGeometry(CELL_FIELD_W, CELL_FIELD_L);
  gCellTop.rotateX(-Math.PI / 2);
  const gTim = new THREE.BoxGeometry(W - 0.016, itf.thickness, L - 0.016);
  const gAbs = new RoundedBoxGeometry(W - 0.016, abs.thickness, L - 0.016, 2, 0.0006);
  const gBack = new THREE.BoxGeometry(W - 0.012, BACKSHEET_T, L - 0.012);
  const gFoam = new THREE.BoxGeometry(W - 0.012, FOAM_TOP_Y - (BACKSHEET_Z0 + BACKSHEET_T), L - 0.012);

  const gLong = frameBar(L);
  const gShort = frameBar(W);

  const gRail = new RoundedBoxGeometry(W + 0.2, RAIL_H, 0.042, 2, 0.003);
  const gJ = new RoundedBoxGeometry(0.115, 0.02, 0.078, 2, 0.004);
  const gJLid = new RoundedBoxGeometry(0.1, 0.004, 0.064, 1, 0.0015);

  // two PV cables from the junction box to dangling MC4 connectors past the +X edge
  const cables: THREE.BufferGeometry[] = [];
  for (const dz of [-0.022, 0.022]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.36, -0.01, 0.2 + dz),
      new THREE.Vector3(0.44, -0.017, 0.2 + dz * 1.5),
      new THREE.Vector3(0.53, -0.03, 0.2 + dz * 1.9),
      new THREE.Vector3(0.58, -0.035, 0.2 + dz * 2.0),
      new THREE.Vector3(0.6, -0.035, 0.2 + dz * 2.0),
    ]);
    cables.push(new THREE.TubeGeometry(curve, 28, 0.0036, 8, false));
  }
  const gMc4 = cyl(0.0072, 0.046, 14);
  gMc4.rotateY(Math.PI / 2); // axis along X (pointing out past the frame)
  const gMc4Nut = cyl(0.0092, 0.012, 14);
  gMc4Nut.rotateY(Math.PI / 2);

  // headers, hose, nuts
  const gCopperInner = buildSerpentineTube({ radius: TUBE_RADIUS, u0: uStub, u1: 1 - uStub, radial: 14, caps: true });
  // header pieces (inlet + outlet merged into one buffer geometry per kind is not needed: instanced by mesh pairs)
  const gHeader = cyl(HEADER_R, STUB_LENGTH - HOSE_LEN - NUT_LEN + 0.02, 18);
  const gNut = cyl(0.0108, NUT_LEN, 6);
  const gHose = cyl(HEADER_R, HOSE_LEN, 18);
  const gBarb = cyl(0.0088, 0.014, 16);
  const gGrommet = cyl(0.0125, 0.006, 20);

  const gLiqIn = buildSerpentineTube({ radius: LIQUID_STUB_R, u0: 0, u1: uStub, radial: 12, caps: true, colors: true });
  const gLiqMid = buildSerpentineTube({ radius: LIQUID_R, u0: uStub, u1: 1 - uStub, radial: 12, caps: false, colors: true });
  const gLiqOut = buildSerpentineTube({ radius: LIQUID_STUB_R, u0: 1 - uStub, u1: 1, radial: 12, caps: true, colors: true });

  const gGroove = buildSerpentineRibbon(0.0085, FOAM_TOP_Y + 0.0004);
  const gHit = new THREE.BoxGeometry(W - 0.03, ch.thickness * 2, L - 0.03);
  const gPlane = new THREE.PlaneGeometry(1, 1);
  const gRing = new THREE.RingGeometry(LIQUID_R, TUBE_RADIUS, 24);
  const gDisc = new THREE.CircleGeometry(LIQUID_R, 20);

  // ── merge static parts into few geometries (cuts draw calls; shadows double them) ──
  const placed = (geo: THREE.BufferGeometry, x: number, y: number, z: number, ry = 0): THREE.BufferGeometry => {
    const c = geo.index ? geo.toNonIndexed() : geo.clone();
    if (ry) c.rotateY(ry);
    c.translate(x, y, z);
    return c;
  };
  const merge = (parts: THREE.BufferGeometry[]): THREE.BufferGeometry => {
    const m = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (!m) throw new Error('geometry merge failed');
    return m;
  };
  const gFrame = merge([
    placed(gLong, W / 2, 0, 0),
    placed(gLong, -W / 2, 0, 0, Math.PI),
    placed(gShort, 0, 0, L / 2, -Math.PI / 2),
    placed(gShort, 0, 0, -L / 2, Math.PI / 2),
  ]);
  const foot = new THREE.BoxGeometry(0.1, 0.006, 0.075);
  const gRails = merge([
    placed(gRail, 0, RAIL_Y, -RAIL_Z),
    placed(gRail, 0, RAIL_Y, RAIL_Z),
    ...[-0.52, 0.52].flatMap((x) => [-RAIL_Z, RAIL_Z].map((z) => placed(foot, x, ROOF_Y + 0.003, z))),
  ]);
  foot.dispose();
  const mcZ = [0.2 - 0.044, 0.2 + 0.044];
  const gPlastic = merge([placed(gJ, JBOX.x, JBOX.y, JBOX.z), ...mcZ.map((z) => placed(gMc4, 0.627, -0.035, z))]);
  const gRubber = merge([
    placed(gJLid, JBOX.x, JBOX.y - 0.011, JBOX.z),
    ...mcZ.map((z) => placed(gMc4Nut, 0.627 - 0.026, -0.035, z)),
    ...[-0.42, 0.42].map((x) => placed(gGrommet, x, CHANNEL_Y, -L / 2 - 0.003)),
  ]);
  const gCableBits = merge(cables.map((c) => c.toNonIndexed()));

  const list: THREE.BufferGeometry[] = [
    gGlass, gLam, gCellTop, gTim, gAbs, gBack, gFoam, gFrame, gRails, gPlastic, gRubber, gCableBits,
    gCopperInner, gHeader, gNut, gHose, gBarb, gLiqIn, gLiqMid, gLiqOut, gGroove, gHit, gPlane, gRing, gDisc,
  ];
  return {
    glass: gGlass,
    laminate: gLam,
    cellTop: gCellTop,
    tim: gTim,
    absorber: gAbs,
    backsheet: gBack,
    foam: gFoam,
    frame: gFrame,
    rails: gRails,
    plasticBits: gPlastic,
    rubberBits: gRubber,
    cableBits: gCableBits,
    copperInner: gCopperInner,
    header: gHeader,
    nut: gNut,
    hose: gHose,
    barb: gBarb,
    liquidIn: gLiqIn,
    liquidMid: gLiqMid,
    liquidOut: gLiqOut,
    groove: gGroove,
    channelHit: gHit,
    plane: gPlane,
    ringDisc: gRing,
    disc: gDisc,
    uStub,
    dispose: () => list.forEach((g) => g.dispose()),
  };
}
