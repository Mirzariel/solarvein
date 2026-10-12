/**
 * Liquid flow: constant-spacing packets parametrised by ARC LENGTH along the analytic serpentine.
 *
 *  - Direction is ALWAYS inlet -> outlet (u grows monotonically); only the speed follows the flow.
 *  - Seamless wrap: each packet's scale is smoothstep-faded over the inlet stub and the outlet stub, so the
 *    outlet -> inlet wrap happens at scale 0 (nothing teleports, nothing pops).
 *  - Pump off: speed and visibility ease to 0 (never reverses, never freezes visibly mid-pipe).
 *  - Packet colour = the liquid ramp at the packet's own temperature (never heat/cool colours).
 *  - No allocations per frame; the instance matrices/colours are written straight into the buffers.
 *  - Reduced motion: no motion, static direction chevrons instead.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as THREE from 'three';
import type { SimResult } from '../sim';
import { noRaycast } from './materials';
import { PART_BY_ID } from './parts';
import { RAMP_LUT, RAMP_LUT_N, fluidProgress, rampPosition } from './palette';
import { getHeatedRange, getSerpentineLUT, getSerpentineLength } from './serpentine';
import { dampTo, smoothstep } from './spring';
import { useStage } from './stage';

const PACKETS = 120;
const CHEVRONS = 18;
/** Visual speed per L/min [scene units / s]. 2 L/min => 0.44 u/s (a pass is 1.37 long). */
const SPEED_PER_LPM = 0.22;

export interface FlowProps {
  live: MutableRefObject<SimResult>;
  reduced: boolean;
  clipPlanes: THREE.Plane[];
}

export function FlowPackets({ live, reduced, clipPlanes }: FlowProps) {
  const stage = useStage();
  const lut = useMemo(() => getSerpentineLUT(1200), []);
  const length = useMemo(() => getSerpentineLength(), []);
  const range = useMemo(() => getHeatedRange(), []);
  const fadeU = useMemo(() => 0.9 * (range.start || 0.02), [range.start]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const timer = useRef(0);
  const st = useRef({ phase: 0, flow: 0, act: 0, vis: 1, drawn: false });
  const invalidate = useThree((s) => s.invalidate);

  const geometry = useMemo(() => {
    const g = new THREE.CapsuleGeometry(0.003, 0.014, 3, 8);
    g.rotateX(Math.PI / 2); // axis along Z; rotated about Y per instance
    return g;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const im = mesh.current;
    if (!im) return;
    im.setColorAt(0, new THREE.Color('#ffffff')); // allocates instanceColor
    st.current.drawn = false;
    invalidate();
  }, [invalidate, reduced]);

  useFrame((state, delta) => {
    const im = mesh.current;
    if (!im || reduced) return;
    const dt = Math.min(delta, 0.05);
    const r = live.current;
    const s = st.current;
    const focus = stage.store.getState().focusPart;
    const visT = focus && !PART_BY_ID[focus].layers.includes('channel') ? 0 : 1;
    const flowT = r.pumpOn ? r.inputs.flowLpm : 0;
    const actT = r.pumpOn ? 1 : 0;
    s.flow = dampTo(s.flow, flowT, 4, dt);
    s.act = dampTo(s.act, actT, 6, dt);
    s.vis = dampTo(s.vis, visT, 10, dt);
    const moving = s.flow > 0.01;
    const fading = Math.abs(s.act - actT) > 0.004 || Math.abs(s.vis - visT) > 0.004;
    if (!moving && !fading && s.drawn) return;
    s.drawn = true;
    if (s.flow < 0.003) s.flow = 0;
    s.phase = (s.phase + (dt * SPEED_PER_LPM * s.flow) / length) % 1;

    const tin = r.inletC;
    const tout = r.outletC;
    const mean = (tin + tout) / 2;
    const ntu = r.coefficients.ntu;
    const span = range.end - range.start;
    const seg = lut.count - 1;
    const p = lut.positions;
    const tg = lut.tangents;
    const arr = im.instanceMatrix.array as Float32Array;
    const col = im.instanceColor ? (im.instanceColor.array as Float32Array) : null;
    const gain = s.act * s.vis;
    for (let i = 0; i < PACKETS; i++) {
      let u = i / PACKETS + s.phase;
      u -= Math.floor(u);
      const f = u * seg;
      const i0 = Math.min(Math.floor(f), seg - 1);
      const t = f - i0;
      const a = i0 * 3;
      const b = a + 3;
      const k = (smoothstep(0, fadeU / length, u) * smoothstep(1, 1 - fadeU / length, u)) * gain;
      const o = i * 16;
      // rotation about Y by theta = atan2(tx, tz)
      const tx = (tg[a] ?? 0) * (1 - t) + (tg[b] ?? 0) * t;
      const tz = (tg[a + 2] ?? 1) * (1 - t) + (tg[b + 2] ?? 1) * t;
      const inv = 1 / Math.max(1e-6, Math.hypot(tx, tz));
      const sn = tx * inv;
      const cs = tz * inv;
      arr[o] = cs * k;
      arr[o + 1] = 0;
      arr[o + 2] = -sn * k;
      arr[o + 3] = 0;
      arr[o + 4] = 0;
      arr[o + 5] = k;
      arr[o + 6] = 0;
      arr[o + 7] = 0;
      arr[o + 8] = sn * k;
      arr[o + 9] = 0;
      arr[o + 10] = cs * k;
      arr[o + 11] = 0;
      arr[o + 12] = (p[a] ?? 0) * (1 - t) + (p[b] ?? 0) * t;
      arr[o + 13] = (p[a + 1] ?? 0) * (1 - t) + (p[b + 1] ?? 0) * t;
      arr[o + 14] = (p[a + 2] ?? 0) * (1 - t) + (p[b + 2] ?? 0) * t;
      arr[o + 15] = 1;
      if (col) {
        const sFrac = Math.min(1, Math.max(0, (u - range.start) / span));
        const temp = tin + (tout - tin) * fluidProgress(sFrac, ntu);
        const li = Math.round(rampPosition(temp, mean) * (RAMP_LUT_N - 1)) * 3;
        // lighten 22 % toward white: packets read as highlights on the tube
        col[i * 3] = (RAMP_LUT[li] ?? 0) * 0.78 + 0.22;
        col[i * 3 + 1] = (RAMP_LUT[li + 1] ?? 0) * 0.78 + 0.22;
        col[i * 3 + 2] = (RAMP_LUT[li + 2] ?? 0) * 0.78 + 0.22;
      }
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    if (fading) state.invalidate();
    else if (moving && !timer.current) {
      // steady flow alone keeps the stage alive at ~30 fps (a static scene costs nothing)
      timer.current = window.setTimeout(() => {
        timer.current = 0;
        state.invalidate();
      }, 28);
    }
  });
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
    },
    [],
  );

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, PACKETS]}
      visible={!reduced}
      frustumCulled={false}
      raycast={noRaycast}
      renderOrder={3}
    >
      <meshBasicMaterial color="#ffffff" clippingPlanes={clipPlanes} />
    </instancedMesh>
  );
}

/** Static direction chevrons along the path: shown instead of motion when the user prefers reduced motion. */
export function FlowChevrons({ visible, live, clipPlanes }: { visible: boolean; live: MutableRefObject<SimResult>; clipPlanes: THREE.Plane[] }) {
  const lut = useMemo(() => getSerpentineLUT(1200), []);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const geometry = useMemo(() => new THREE.ConeGeometry(0.005, 0.016, 8), []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useLayoutEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const up = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3();
    const tan = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const one = new THREE.Vector3(1, 1, 1);
    const m = new THREE.Matrix4();
    const seg = lut.count - 1;
    for (let i = 0; i < CHEVRONS; i++) {
      const idx = Math.round(((i + 0.5) / CHEVRONS) * seg) * 3;
      pos.set(lut.positions[idx] ?? 0, lut.positions[idx + 1] ?? 0, lut.positions[idx + 2] ?? 0);
      tan.set(lut.tangents[idx] ?? 0, lut.tangents[idx + 1] ?? 0, lut.tangents[idx + 2] ?? 1);
      q.setFromUnitVectors(up, tan);
      m.compose(pos, q, one);
      im.setMatrixAt(i, m);
    }
    im.instanceMatrix.needsUpdate = true;
    invalidate();
  }, [lut, invalidate]);

  useFrame(() => {
    const im = mesh.current;
    if (im) im.visible = visible && live.current.pumpOn;
  });

  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, CHEVRONS]} visible={false} frustumCulled={false} raycast={noRaycast} renderOrder={3}>
      <meshBasicMaterial color="#C9D6DC" clippingPlanes={clipPlanes} />
    </instancedMesh>
  );
}
