/**
 * The 3D PVT collector, built from LAYERS in dims.ts at REAL proportions (docs/audit/05-creative-direction.md 6.2).
 *
 *  - Every layer lives in its own <group>; the explode animation only changes group.position.y (driven by the
 *    stage's explode factor, no React re-render per frame). FLAT plates (glass, laminate, cells, TIM, absorber)
 *    also thicken with the explode factor so the exploded view stays legible; round parts never scale.
 *  - Materials/geometries are shared per stage (materials.ts / geometry.ts) and disposed with it.
 *  - Cross-section: all materials share ONE per-stage clipping plane; flat cut-face caps sit at the plane.
 *  - Focus (inspect): selecting a part fades the other parts (opacity springs, no shader recompiles).
 *  - Nothing here computes physics: temperatures/flow come from the live SimResult ref.
 */
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { memo, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../hooks';
import type { SimResult } from '../sim';
import { FlowChevrons, FlowPackets } from './LiquidFlow';
import { BACKSHEET_T, BACKSHEET_Z0, EXPLODE_THICKEN, FOAM_TOP_Y, FRAME_DEPTH, FRAME_WALL_T, type LayerId } from './dims';
import {
  CELL_FIELD_W,
  HOSE_LEN,
  L,
  NUT_LEN,
  W,
  createCollectorGeometries,
  spec,
  type CollectorGeometries,
} from './geometry';
import { COLORS, createStageMaterials, noRaycast, type StageMaterials } from './materials';
import { PART_BY_ID, partOfLayer } from './parts';
import { RAMP_LUT, RAMP_LUT_N, fluidProgress, rampPosition } from './palette';
import { useQuality } from './quality';
import { CHANNEL_Y, STUB_LENGTH, getHeatedRange, getPassLayout, getSerpentineLUT } from './serpentine';
import { Spring, dampTo } from './spring';
import { useStage, useStageState, type StageCtx } from './stage';
import { useVisualResultRef } from '../motion/useVisualResultRef';

type Live = MutableRefObject<SimResult>;

interface LayerProps {
  mats: StageMaterials;
  geos: CollectorGeometries;
  cross: boolean;
  shadows: boolean;
}

// ── cross-section caps ───────────────────────────────────────────────────────────────────────
const CAP_Z = -0.0006;

function Cap({ geos, mats, w, h, y, x = 0, color }: { geos: CollectorGeometries; mats: StageMaterials; w: number; h: number; y: number; x?: number; color: string }) {
  return <mesh geometry={geos.plane} material={mats.cap(color)} position={[x, y, CAP_Z]} scale={[w, h, 1]} userData={{ flat: true, sy: h }} raycast={noRaycast} />;
}

// ── layers ───────────────────────────────────────────────────────────────────────────────────
function GlassLayer({ mats, geos, cross }: LayerProps) {
  const s = spec('glass');
  return (
    <>
      <mesh geometry={geos.glass} material={mats.glass} position={[0, s.y, 0]} renderOrder={4} userData={{ flat: true }} />
      {cross ? <Cap geos={geos} mats={mats} w={W - 0.008} h={s.thickness} y={s.y} color={COLORS.cutGlass} /> : null}
    </>
  );
}

function CellsLayer({ mats, geos, cross, live, shadows }: LayerProps & { live: Live }) {
  const s = spec('cells');
  const tint = useRef({ v: 0 });
  const hot = useMemo(() => new THREE.Color('#3A2418'), []);
  const cold = useMemo(() => new THREE.Color('#10243A'), []);

  // Surface temperature tint: <= ~6 % shift toward warm brown when hot / cool blue when cold (damped).
  useFrame((state, dt) => {
    const r = live.current;
    const target = Math.max(-1, Math.min(1, (r.cellC - r.inputs.ambientC) / 35));
    const t = tint.current;
    if (Math.abs(t.v - target) > 0.002) {
      t.v = dampTo(t.v, target, 3.3, Math.min(dt, 0.1));
      state.invalidate();
    } else t.v = target;
    const m = mats.cellTop;
    m.emissive.copy(t.v >= 0 ? hot : cold);
    m.emissiveIntensity = Math.abs(t.v) * 0.6;
  });

  return (
    <>
      <mesh geometry={geos.laminate} material={mats.laminate} position={[0, s.y, 0]} castShadow={shadows} userData={{ flat: true }} />
      <mesh
        geometry={geos.cellTop}
        material={mats.cellTop}
        position={[0, s.y + s.thickness / 2 + 0.0003, 0]}
        userData={{ flatTop: { cy: s.y, half: s.thickness / 2, eps: 0.0003 } }}
      />
      {cross ? <Cap geos={geos} mats={mats} w={CELL_FIELD_W} h={s.thickness} y={s.y} color={COLORS.cutCell} /> : null}
    </>
  );
}

function InterfaceLayer({ mats, geos, cross }: LayerProps) {
  const s = spec('interface');
  return (
    <>
      <mesh geometry={geos.tim} material={mats.tim} position={[0, s.y, 0]} userData={{ flat: true }} />
      {cross ? <Cap geos={geos} mats={mats} w={W - 0.016} h={s.thickness} y={s.y} color={COLORS.cutTim} /> : null}
    </>
  );
}

function AbsorberLayer({ mats, geos, cross, shadows }: LayerProps) {
  const s = spec('absorber');
  return (
    <>
      <mesh geometry={geos.absorber} material={mats.absorber} position={[0, s.y, 0]} castShadow={shadows} userData={{ flat: true }} />
      {cross ? <Cap geos={geos} mats={mats} w={W - 0.016} h={s.thickness} y={s.y} color={COLORS.cutAbsorber} /> : null}
    </>
  );
}

/** Rear assembly: back sheet, PU foam with the tube groove, mitred anodised frame, mounting rails, junction box + cables. */
function InsulationLayer({ mats, geos, cross, shadows }: LayerProps) {
  const sideX = W / 2 - FRAME_WALL_T / 2;
  const foamH = FOAM_TOP_Y - (BACKSHEET_Z0 + BACKSHEET_T);
  return (
    <>
      <mesh geometry={geos.backsheet} material={mats.backsheet} position={[0, BACKSHEET_Z0 + BACKSHEET_T / 2, 0]} />
      <mesh geometry={geos.foam} material={mats.foam} position={[0, BACKSHEET_Z0 + BACKSHEET_T + foamH / 2, 0]} />
      <mesh geometry={geos.groove} material={mats.groove} renderOrder={1} />
      {/* mitred anodised-aluminium frame (true extruded profile), rails, junction box + MC4 cables: merged, 1 call each */}
      <mesh geometry={geos.frame} material={mats.frame} castShadow={shadows} />
      <mesh geometry={geos.rails} material={mats.rail} castShadow={shadows} />
      <mesh geometry={geos.plasticBits} material={mats.plastic} castShadow={shadows} />
      <mesh geometry={geos.rubberBits} material={mats.rubber} />
      <mesh geometry={geos.cableBits} material={mats.cable} castShadow={shadows} />

      {cross ? (
        <>
          <Cap geos={geos} mats={mats} w={W - 0.012} h={BACKSHEET_T} y={BACKSHEET_Z0 + BACKSHEET_T / 2} color={COLORS.cutFrame} />
          <Cap geos={geos} mats={mats} w={W - 0.012} h={foamH} y={BACKSHEET_Z0 + BACKSHEET_T + foamH / 2} color={COLORS.cutFoam} />
          <Cap geos={geos} mats={mats} w={0.012} h={FRAME_DEPTH} y={FRAME_DEPTH / 2} x={sideX} color={COLORS.cutFrame} />
          <Cap geos={geos} mats={mats} w={0.012} h={FRAME_DEPTH} y={FRAME_DEPTH / 2} x={-sideX} color={COLORS.cutFrame} />
        </>
      ) : null}
    </>
  );
}

// ── channel: copper tube + liquid + packets ──────────────────────────────────────────────────
interface Crossing {
  x: number;
  u: number;
}

/** Where the serpentine passes cross z = 0 (section discs). */
function useCrossings(): Crossing[] {
  return useMemo(() => {
    const lut = getSerpentineLUT(1200);
    const out: Crossing[] = [];
    const seg = lut.count - 1;
    for (let k = 0; k < seg; k++) {
      const z0 = lut.positions[k * 3 + 2] ?? 0;
      const z1 = lut.positions[(k + 1) * 3 + 2] ?? 0;
      if ((z0 <= 0 && z1 > 0) || (z0 >= 0 && z1 < 0)) {
        const t = z0 / (z0 - z1);
        const x = (lut.positions[k * 3] ?? 0) * (1 - t) + (lut.positions[(k + 1) * 3] ?? 0) * t;
        out.push({ x, u: (k + t) / seg });
      }
    }
    return out;
  }, []);
}

const STAGNANT = new THREE.Color('#6d7479');

function ChannelLayer({ mats, geos, cross, live, reduced, shadows }: LayerProps & { live: Live; reduced: boolean }) {
  const range = useMemo(() => getHeatedRange(), []);
  const crossings = useCrossings();
  const { passX } = useMemo(() => getPassLayout(), []);
  const x0 = passX[0] ?? -0.42;
  const x1 = passX[passX.length - 1] ?? 0.42;
  const discMats = useRef<(THREE.MeshBasicMaterial | null)[]>([]);
  const paint = useRef({ tin: Number.NaN, tout: Number.NaN, ntu: Number.NaN, act: 1 });
  const liqGeos = useMemo(() => [geos.liquidIn, geos.liquidMid, geos.liquidOut], [geos]);
  const aUs = useMemo(() => liqGeos.map((g) => g.getAttribute('aU').array as Float32Array), [liqGeos]);

  useFrame((state, dt0) => {
    const r = live.current;
    const p = paint.current;
    const dt = Math.min(dt0, 0.1);

    // pump-state tint (stagnant liquid goes grey, eased)
    const actT = r.pumpOn ? 1 : 0;
    if (Math.abs(p.act - actT) > 0.004) {
      p.act = dampTo(p.act, actT, 6, dt);
      state.invalidate();
    } else p.act = actT;
    mats.liquid.color.setRGB(1, 1, 1).lerp(STAGNANT, 1 - p.act);

    const tin = r.inletC;
    const tout = r.outletC;
    const ntu = r.coefficients.ntu;
    if (Math.abs(tin - p.tin) < 0.05 && Math.abs(tout - p.tout) < 0.05 && Math.abs(ntu - p.ntu) < 0.02) return;
    p.tin = tin;
    p.tout = tout;
    p.ntu = ntu;
    const mean = (tin + tout) / 2;
    const span = range.end - range.start;
    liqGeos.forEach((g, k) => {
      const aU = aUs[k] as Float32Array;
      const attr = g.getAttribute('color') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      for (let i = 0; i < aU.length; i++) {
        const sFrac = Math.min(1, Math.max(0, ((aU[i] ?? 0) - range.start) / span));
        const li = Math.round(rampPosition(tin + (tout - tin) * fluidProgress(sFrac, ntu), mean) * (RAMP_LUT_N - 1)) * 3;
        arr[i * 3] = RAMP_LUT[li] ?? 0;
        arr[i * 3 + 1] = RAMP_LUT[li + 1] ?? 0;
        arr[i * 3 + 2] = RAMP_LUT[li + 2] ?? 0;
      }
      attr.needsUpdate = true;
    });
    for (let i = 0; i < crossings.length; i++) {
      const m = discMats.current[i];
      const c = crossings[i];
      if (!m || !c) continue;
      const sFrac = Math.min(1, Math.max(0, (c.u - range.start) / span));
      const li = Math.round(rampPosition(tin + (tout - tin) * fluidProgress(sFrac, ntu), mean) * (RAMP_LUT_N - 1)) * 3;
      m.color.setRGB(RAMP_LUT[li] ?? 0, RAMP_LUT[li + 1] ?? 0, RAMP_LUT[li + 2] ?? 0);
    }
    state.invalidate();
  });

  // header pieces: inlet/outlet stubs along -Z (tip at z = -L/2 - STUB_LENGTH)
  const tipZ = -L / 2 - STUB_LENGTH;
  const headerLen = STUB_LENGTH + 0.02 - HOSE_LEN - NUT_LEN;
  const stubPieces = (x: number, key: string) => (
    <group key={key} position={[x, CHANNEL_Y, 0]}>
      <mesh geometry={geos.hose} material={mats.hose} position={[0, 0, tipZ + HOSE_LEN / 2]} renderOrder={2} raycast={noRaycast} />
      <mesh geometry={geos.barb} material={mats.plastic} position={[0, 0, tipZ + 0.007]} raycast={noRaycast} castShadow={shadows} />
      <mesh geometry={geos.nut} material={mats.copperSolid} position={[0, 0, tipZ + HOSE_LEN + NUT_LEN / 2]} raycast={noRaycast} castShadow={shadows} />
      <mesh geometry={geos.header} material={mats.copperSolid} position={[0, 0, tipZ + HOSE_LEN + NUT_LEN + headerLen / 2]} raycast={noRaycast} castShadow={shadows} />
    </group>
  );

  return (
    <>
      <mesh geometry={geos.copperInner} material={mats.copperInner} renderOrder={2} raycast={noRaycast} castShadow={shadows} />
      <mesh geometry={geos.liquidIn} material={mats.liquid} renderOrder={1} raycast={noRaycast} />
      <mesh geometry={geos.liquidMid} material={mats.liquid} renderOrder={1} raycast={noRaycast} />
      <mesh geometry={geos.liquidOut} material={mats.liquid} renderOrder={1} raycast={noRaycast} />
      {stubPieces(x0, 'in')}
      {stubPieces(x1, 'out')}

      <FlowPackets live={live} reduced={reduced} clipPlanes={mats.clipPlanes} />
      <FlowChevrons visible={reduced} live={live} clipPlanes={mats.clipPlanes} />

      {/* hover/click target for the whole channel layer (tube meshes are not raycast: too dense) */}
      <mesh geometry={geos.channelHit} position={[0, CHANNEL_Y, 0]}>
        <meshBasicMaterial visible={false} />
      </mesh>

      {/* section: copper rings + liquid discs at every pass */}
      {cross ? (
        <group position={[0, CHANNEL_Y, CAP_Z]}>
          {crossings.map((c, i) => (
            <group key={i} position={[c.x, 0, 0]}>
              <mesh geometry={geos.ringDisc} material={mats.cap(COLORS.cutCopper)} raycast={noRaycast} />
              <mesh geometry={geos.disc} raycast={noRaycast}>
                <meshBasicMaterial
                  ref={(m) => {
                    discMats.current[i] = m;
                    if (m) paint.current.tin = Number.NaN; // repaint on mount
                  }}
                  color={COLORS.liquidMid}
                  polygonOffset
                  polygonOffsetFactor={1}
                  polygonOffsetUnits={1}
                />
              </mesh>
            </group>
          ))}
        </group>
      ) : null}
    </>
  );
}

// ── layer group (explode + flat-plate thickening + focus dim + pointer) ──────────────────────
interface Pointer {
  over: (id: LayerId, e: ThreeEvent<PointerEvent>) => void;
  out: (id: LayerId) => void;
  click: (id: LayerId, e: ThreeEvent<MouseEvent>) => void;
}

interface FlatInfo {
  mesh: THREE.Object3D;
  top: { cy: number; half: number; eps: number } | null;
}

interface LayerGroupProps {
  id: LayerId;
  stage: StageCtx;
  mats: StageMaterials;
  pointer: Pointer | null;
  children: ReactNode;
}

const LayerGroup = memo(function LayerGroup({ id, stage, mats, pointer, children }: LayerGroupProps) {
  const ref = useRef<THREE.Group>(null);
  const offset = spec(id).explodeOffset;
  const dim = useRef(new Spring(1));
  const flats = useRef<FlatInfo[]>([]);
  const inspect = stage.variant === 'inspect';

  useLayoutEffect(() => {
    const g = ref.current;
    if (!g) return;
    const list: FlatInfo[] = [];
    g.traverse((o) => {
      if (o.userData.flat) list.push({ mesh: o, top: null });
      else if (o.userData.flatTop) list.push({ mesh: o, top: o.userData.flatTop as FlatInfo['top'] });
    });
    flats.current = list;
  });

  useFrame((state, dt0) => {
    const g = ref.current;
    if (!g) return;
    const e = stage.explode.current;
    g.position.y = offset * e;
    const k = 1 + EXPLODE_THICKEN * e;
    for (const f of flats.current) {
      if (f.top) f.mesh.position.y = f.top.cy + k * f.top.half + f.top.eps;
      else f.mesh.scale.y = ((f.mesh.userData.sy as number | undefined) ?? 1) * k;
    }
    if (!inspect) return;
    const focus = stage.store.getState().focusPart;
    const target = focus && !PART_BY_ID[focus].layers.includes(id) ? 0.14 : 1;
    const d = dim.current;
    if (Math.abs(d.x - target) > 0.003) {
      d.x = dampTo(d.x, target, 12, Math.min(dt0, 0.1));
      mats.dimLayer(id, d.x);
      state.invalidate();
    } else if (d.x !== target) {
      d.x = target;
      mats.dimLayer(id, target);
    }
  });

  return (
    <group
      ref={ref}
      name={`layer-${id}`}
      onPointerOver={pointer ? (e) => pointer.over(id, e) : undefined}
      onPointerOut={pointer ? () => pointer.out(id) : undefined}
      onClick={pointer ? (e) => pointer.click(id, e) : undefined}
    >
      {children}
    </group>
  );
});

// ── root ─────────────────────────────────────────────────────────────────────────────────────
export default function Collector() {
  const stage = useStage();
  const live = useVisualResultRef();
  const reduced = useReducedMotion();
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const tier = useQuality();
  const shadows = tier !== 'low';
  const inspect = stage.variant === 'inspect';
  const crossSection = useStageState(stage.store, (s) => s.crossSection);
  const visibility = useStageState(stage.store, (s) => s.layerVisibility);

  const mats = useMemo(() => createStageMaterials(inspect), [inspect]);
  const geos = useMemo(() => createCollectorGeometries(), []);
  useEffect(() => () => mats.dispose(), [mats]);
  useEffect(() => () => geos.dispose(), [geos]);

  useLayoutEffect(() => {
    mats.setCrossSection(crossSection);
    invalidate();
  }, [crossSection, mats, invalidate]);

  // Wet glass follows the stage mood (rain 0..1).
  useFrame(() => {
    mats.setWetness(stage.mood.current.rain);
  });

  const pointer = useMemo<Pointer | null>(() => {
    if (!inspect) return null;
    const st = stage.store;
    const canvas = gl.domElement;
    /** In a section, the clipped half is invisible and must not react to the pointer. */
    const clipped = (p: THREE.Vector3): boolean => st.getState().crossSection && p.z > 0.002;
    return {
      over: (id, e) => {
        if (clipped(e.point)) return;
        e.stopPropagation();
        canvas.style.cursor = 'pointer';
        st.getState().setHoverPart(partOfLayer(id));
      },
      out: () => {
        canvas.style.cursor = '';
        st.getState().setHoverPart(null);
      },
      click: (id, e) => {
        if (clipped(e.point) || e.delta > 6) return;
        e.stopPropagation();
        const cur = st.getState().focusPart;
        const part = partOfLayer(id);
        st.getState().setFocusPart(cur === part ? null : part);
      },
    };
  }, [inspect, stage.store, gl]);

  const common = { mats, geos, cross: crossSection, shadows };
  const grp = (id: LayerId, node: ReactNode) =>
    visibility[id] ? (
      <LayerGroup key={id} id={id} stage={stage} mats={mats} pointer={pointer}>
        {node}
      </LayerGroup>
    ) : null;

  return (
    <group name="collector">
      {grp('insulation', <InsulationLayer {...common} />)}
      {grp('channel', <ChannelLayer {...common} live={live} reduced={reduced} />)}
      {grp('absorber', <AbsorberLayer {...common} />)}
      {grp('interface', <InterfaceLayer {...common} />)}
      {grp('cells', <CellsLayer {...common} live={live} />)}
      {grp('glass', <GlassLayer {...common} />)}
    </group>
  );
}
