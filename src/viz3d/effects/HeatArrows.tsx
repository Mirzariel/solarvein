import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { ExtrudeGeometry, InstancedMesh, Object3D, Shape, type ShaderMaterial } from 'three';
import { ARROW } from '../../motion/tokens';
import { lerp, smoothstep } from '../../motion/spring';
import { layerY } from '../serpentine';
import { addAlphaAttribute, createAlphaMaterial } from './alphaMaterial';
import { CELLS, CHANNEL, glassTopY, type EffectProps } from './shared';
import { halton, noRaycast } from './fxMath';

/**
 * Heat-transfer arrows (the key visual): flat notched block arrows, ALL THE SAME SIZE, on a regular grid aligned to the
 * channel pitch (0.12 u), so they never overlap and read as one calm field.
 *
 *  - "stack" field (4 x 3 = 12): harvest (q > 0) amber pointing DOWN into the panel, rejection (q < 0) cyan pointing UP.
 *    Direction comes from the SIGN of the live qLiquidW only. Magnitude is carried by OPACITY and by how many of the
 *    twelve are lit (3..12), plus a +-15 % length change: no size family, no random placement.
 *    The amplitude fades to zero at the zero crossing; the direction latch flips only after the arrows have faded below
 *    ARROW.flipAmp and only when the computed sign is reversed with |q| > ARROW.flipMinW. Valuation flags only dim.
 *  - "env" field (2 x 2): heat leaving the glass to the environment (always up): cyan while rejecting, faint amber otherwise.
 *
 * Each arrow breathes (1.2 s cycle, staggered by column) and travels 0.06 u in the flow direction; it fades in and out
 * (15 %) so nothing teleports. Reduced motion: static poses (direction stays readable).
 */

const CYCLE_S = 1.2;
const COLUMN_STAGGER_S = 0.1;
const TRAVEL = 0.06;
const COLORS = { heat: '#F0A05C', cool: '#5FB3D6' } as const;

type Kind = 'stack' | 'env';
type Slot = readonly [number, number, number]; // x, z, column

function grid(xs: number[], zs: number[], order: ReadonlyArray<readonly [number, number]>): Slot[] {
  return order.map(([c, r]) => [xs[c] ?? 0, zs[r] ?? 0, c] as const);
}
// centre first: with few arrows lit they cluster in the middle of the panel
const STACK_SLOTS = grid(
  [-0.36, -0.12, 0.12, 0.36],
  [-0.5, 0, 0.5],
  [[1, 1], [2, 1], [1, 2], [2, 0], [0, 1], [3, 1], [1, 0], [2, 2], [0, 0], [3, 2], [0, 2], [3, 0]],
);
const ENV_SLOTS = grid([-0.43, 0.43], [-0.45, 0.45], [[0, 0], [1, 1], [1, 0], [0, 1]]);

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
  dir: -1 | 1;
  tone: 0 | 1;
  amp: number;
  phase: number;
  drawnVersion: number;
  ex: number;
  cam: number;
  shown: boolean;
}

function ArrowField({ kind, targets, version, explode, reduced }: EffectProps & { kind: Kind }) {
  const slots = kind === 'stack' ? STACK_SLOTS : ENV_SLOTS;
  const meshRef = useRef<InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = buildArrowGeometry();
    addAlphaAttribute(g, slots.length);
    return g;
  }, [slots.length]);
  const mat = useMemo<ShaderMaterial>(() => createAlphaMaterial(COLORS.heat, false), []);
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
  const state = useRef<FieldState>({
    dir: targets.current.stackDir === 1 ? 1 : -1,
    tone: targets.current.stackDir === 1 ? 1 : 0,
    amp: 0,
    phase: 0,
    drawnVersion: -1,
    ex: -1,
    cam: 0,
    shown: false,
  });
  const initDone = useRef(false);

  useFrame((fs, dt0) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const dt = Math.min(dt0, 0.1);
    const s = state.current;
    const t = targets.current;

    let wantDir: -1 | 0 | 1;
    let wantTone: 0 | 1;
    let wantAmp: number;
    if (kind === 'stack') {
      wantDir = t.stackDir;
      wantTone = t.stackDir === 1 ? 1 : 0;
      wantAmp = t.stackStrength;
    } else {
      wantDir = t.envStrength > 0.001 ? 1 : 0;
      wantTone = t.envTone === 'cool' ? 1 : 0;
      wantAmp = t.envStrength;
    }
    if (!t.showArrows || wantDir === 0) wantAmp = 0;

    if (!initDone.current) {
      initDone.current = true;
      if (wantDir !== 0) {
        s.dir = wantDir;
        s.tone = wantTone;
      }
      s.amp = wantAmp;
    }

    // Direction latch: only reverse after the arrows have faded out and the computed sign really is reversed.
    const mustFlip = wantDir !== 0 && (wantDir !== s.dir || wantTone !== s.tone);
    const prevAmp = s.amp;
    if (mustFlip) {
      s.amp = reduced ? 0 : s.amp * Math.exp(-22 * dt);
      if (s.amp < ARROW.flipAmp) {
        if (wantDir !== 0) s.dir = wantDir;
        s.tone = wantTone;
        s.amp = 0;
      }
    } else if (reduced) {
      s.amp = wantAmp;
    } else {
      // 120 ms catch-up on the (already continuous) amplitude to absorb any residual pop
      s.amp = wantAmp + (s.amp - wantAmp) * Math.exp(-22 * dt);
      if (Math.abs(s.amp - wantAmp) < 0.0005) s.amp = wantAmp;
    }
    const animate = !reduced && s.amp > 0.004;
    if (animate) s.phase += dt / CYCLE_S;

    if (s.amp <= 0.004) {
      mesh.count = 0; // stays in the scene (program warmed by gl.compile), draws nothing
      s.shown = false;
      if (Math.abs(s.amp - prevAmp) > 0.0005 || mustFlip) fs.invalidate();
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
    const y0 = kind === 'stack' ? lerp(yAsm, yExp, e) : glassTopY(e) + 0.07;

    const amp = s.amp;
    const nFrac = kind === 'stack' ? lerp(3, 12, amp) : lerp(1, 4, amp);
    // identical size for every arrow of a field; length only breathes +-15 % with the magnitude
    const len = (kind === 'stack' ? 0.085 : 0.055) * (0.85 + 0.3 * smoothstep(0, 1, amp));
    const headW = kind === 'stack' ? 0.03 : 0.02;
    const thick = kind === 'stack' ? 0.0045 : 0.0035;
    const down = s.dir < 0;
    const dim = kind === 'stack' && t.stackDim ? 0.5 : 1;
    const base = kind === 'stack' ? 0.95 : s.tone === 1 ? 0.7 : 0.3;
    const mag = (0.4 + 0.6 * Math.sqrt(amp)) * dim * base;
    (mat.uniforms.uColor!.value as { set: (c: string) => void }).set(s.tone === 1 ? COLORS.cool : COLORS.heat);
    const alpha = geo.getAttribute('aAlpha') as import('three').InstancedBufferAttribute;

    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      if (!slot) continue;
      const w = Math.min(1, Math.max(0, nFrac - i));
      const [x, z, col] = slot;
      const jitter = halton(i + 1, 5) * 0.37; // fixed per-slot offset so the field does not pulse in lock-step
      const p = animate ? (((s.phase - col * (COLUMN_STAGGER_S / CYCLE_S) - jitter) % 1) + 1) % 1 : 0.5;
      const life = animate ? smoothstep(0, 0.15, p) * smoothstep(1, 0.85, p) : 1;
      // the arrow travels `TRAVEL` along its direction; its tip leads
      const off = (p - 0.5) * TRAVEL;
      const tip = y0 + (down ? -off : off);
      const tailY = down ? tip + len : tip - len;
      const yaw = Math.atan2(cam.x - x, cam.z - z);
      dummy.position.set(x, tailY, z);
      dummy.rotation.set(0, yaw, down ? Math.PI : 0);
      dummy.scale.set(headW, len, thick);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      alpha.setX(i, mag * w * (0.25 + 0.75 * life));
    }
    mesh.count = slots.length;
    mesh.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = true;
    if (animate || Math.abs(s.amp - prevAmp) > 0.0005 || mustFlip) fs.invalidate();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, slots.length]}
      frustumCulled={false}
      raycast={noRaycast}
      renderOrder={12}
      name={`fx-heat-${kind}`}
    />
  );
}

export function HeatArrows(props: EffectProps) {
  return (
    <>
      <ArrowField kind="stack" {...props} />
      <ArrowField kind="env" {...props} />
    </>
  );
}
