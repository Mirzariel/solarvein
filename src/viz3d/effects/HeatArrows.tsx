import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, InstancedMesh, Object3D, Shape, type ShaderMaterial } from 'three';
import { lerp, smoothstep } from '../../motion/spring';
import { layerY } from '../serpentine';
import { addAlphaAttribute, createAlphaMaterial } from './alphaMaterial';
import { CELLS, CHANNEL, glassTopY, type EffectProps } from './shared';
import { halton, noRaycast } from './fxMath';

/**
 * Heat harvest arrows (the key visual of v2 = harvest only): flat notched block arrows on a regular grid aligned to
 * the channel pitch (0.12 u), 4 x 3 = 12 slots, all pointing DOWN from the cell layer into the liquid.
 *
 *  - Source: `targets.harvest` (0..1, log-ish in the live qLiquidW, 0 when the pump is off / at night / q <= 12 W).
 *    There is no reject flip, no cyan, no second "environment" field: the stage never draws heat leaving the liquid.
 *  - Magnitude is carried by WIDTH (head 0.016 -> 0.034 u), OPACITY (0.35 -> 0.95), LENGTH (+-15 %) and by how many
 *    of the twelve are lit (5..12, centre first). They fade out continuously with q, so nothing pops.
 *  - Each arrow breathes (1.2 s cycle, staggered by column) and travels 0.06 u down; it fades in and out (15 %).
 *    Reduced motion: static poses.
 */

const CYCLE_S = 1.2;
const COLUMN_STAGGER_S = 0.1;
const TRAVEL = 0.06;
const HEAT = '#F0A05C';

type Slot = readonly [number, number, number]; // x, z, column

function grid(xs: number[], zs: number[], order: ReadonlyArray<readonly [number, number]>): Slot[] {
  return order.map(([c, r]) => [xs[c] ?? 0, zs[r] ?? 0, c] as const);
}
// centre first: with few arrows lit they cluster in the middle of the panel
const SLOTS = grid(
  [-0.36, -0.12, 0.12, 0.36],
  [-0.5, 0, 0.5],
  [[1, 1], [2, 1], [1, 2], [2, 0], [0, 1], [3, 1], [1, 0], [2, 2], [0, 0], [3, 2], [0, 2], [3, 0]],
);

/** Notched block arrow, unit height along +Y from the tail, head width 1, flat (extruded 1 along Z). */
function buildArrowGeometry(): ExtrudeGeometry {
  const sw = 0.15;
  const hw = 0.5;
  const headY = 0.58;
  const notch = 0.1;
  const s = new Shape();
  s.moveTo(-sw, 0);
  s.lineTo(0, notch);
  s.lineTo(sw, 0);
  s.lineTo(sw, headY);
  s.lineTo(hw, headY);
  s.lineTo(0, 1);
  s.lineTo(-hw, headY);
  s.lineTo(-sw, headY);
  s.closePath();
  const g = new ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

interface FieldState {
  amp: number;
  phase: number;
  drawnVersion: number;
  ex: number;
  cam: number;
  shown: boolean;
}

export function HeatArrows({ targets, version, explode, reduced }: EffectProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = buildArrowGeometry();
    addAlphaAttribute(g, SLOTS.length);
    return g;
  }, []);
  const mat = useMemo<ShaderMaterial>(() => createAlphaMaterial(HEAT, false), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const dummy = useMemo(() => {
    const o = new Object3D();
    o.rotation.order = 'YXZ';
    return o;
  }, []);
  const state = useRef<FieldState>({ amp: 0, phase: 0, drawnVersion: -1, ex: -1, cam: 0, shown: false });
  const initDone = useRef(false);

  useFrame((fs, dt0) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(dt0, 0.1);
    const s = state.current;
    const t = targets.current;
    const wantAmp = t.showArrows ? t.harvest : 0;

    if (!initDone.current) {
      initDone.current = true;
      s.amp = wantAmp;
    }
    const prevAmp = s.amp;
    if (reduced) s.amp = wantAmp;
    else {
      // 120 ms catch-up on the (already continuous) amplitude to absorb any residual pop
      s.amp = wantAmp + (s.amp - wantAmp) * Math.exp(-22 * dt);
      if (Math.abs(s.amp - wantAmp) < 0.0005) s.amp = wantAmp;
    }
    const animate = !reduced && s.amp > 0.004;
    if (animate) s.phase += dt / CYCLE_S;

    if (s.amp <= 0.004) {
      mesh.count = 0; // stays in the scene (program warmed by gl.compile), draws nothing
      s.shown = false;
      if (Math.abs(s.amp - prevAmp) > 0.0005) fs.invalidate();
      return;
    }

    const e = explode.current;
    const cam = fs.camera.position;
    const camSig = cam.x * 7 + cam.z * 13;
    if (!animate && s.shown && s.drawnVersion === version.current && s.ex === e && s.cam === camSig && s.amp === prevAmp) return;
    s.shown = true;
    s.drawnVersion = version.current;
    s.ex = e;
    s.cam = camSig;

    // vertical centre of the travel: just above the glass (assembled) or in the gap between cell layer and channel
    const yAsm = glassTopY(0) + 0.085;
    const yExp = 0.5 * (layerY(CELLS.id, e) + layerY(CHANNEL.id, e)) + 0.01;
    const y0 = lerp(yAsm, yExp, e);

    const amp = s.amp;
    const nFrac = lerp(5, 12, amp);
    const len = 0.085 * (0.85 + 0.3 * smoothstep(0, 1, amp));
    const headW = lerp(0.016, 0.034, Math.sqrt(amp));
    const thick = 0.0045;
    const mag = lerp(0.35, 0.95, Math.sqrt(amp));
    const alpha = geo.getAttribute('aAlpha') as import('three').InstancedBufferAttribute;

    for (let i = 0; i < SLOTS.length; i++) {
      const slot = SLOTS[i];
      if (!slot) continue;
      const w = Math.min(1, Math.max(0, nFrac - i));
      const [x, z, col] = slot;
      const jitter = halton(i + 1, 5) * 0.37; // fixed per-slot offset so the field does not pulse in lock-step
      const p = animate ? (((s.phase - col * (COLUMN_STAGGER_S / CYCLE_S) - jitter) % 1) + 1) % 1 : 0.5;
      const life = animate ? smoothstep(0, 0.15, p) * smoothstep(1, 0.85, p) : 1;
      // the arrow travels `TRAVEL` downwards; its tip leads
      const off = (p - 0.5) * TRAVEL;
      const tailY = y0 - off + len;
      const yaw = Math.atan2(cam.x - x, cam.z - z);
      dummy.position.set(x, tailY, z);
      dummy.rotation.set(0, yaw, Math.PI);
      dummy.scale.set(headW, len, thick);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      alpha.setX(i, mag * w * (0.25 + 0.75 * life));
    }
    mesh.count = SLOTS.length;
    mesh.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = true;
    if (animate || Math.abs(s.amp - prevAmp) > 0.0005) fs.invalidate();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, SLOTS.length]}
      frustumCulled={false}
      raycast={noRaycast}
      renderOrder={12}
      name="fx-heat-harvest"
    />
  );
}
