import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import { AdditiveBlending, Color, InstancedMesh, Object3D, Vector3 } from 'three';
import { PANEL_WIDTH } from '../dims';
import { layerY } from '../serpentine';
import { clamp01, smoothstep } from '../../motion/spring';
import { noRaycast } from './fxMath';
import { CELLS, type EffectProps } from './shared';

/**
 * Electrical output: warm-white hairline pulses run along three busbar lines across the cell field toward the
 * +X edge where the module cables leave. Rate and brightness follow the visual P_e (0 W = none). Distinct from
 * heat (amber/cyan flat arrows) and liquid (round packets in the pipe); never lime.
 * Reduced motion: static pulses at equal spacing, brightness still follows P_e.
 */
const WARM_WHITE = new Color('#F1EDE4');
const LINES_Z = [-0.52, -0.16, 0.2] as const;
const PER_LINE = 4;
const X0 = -PANEL_WIDTH / 2 + 0.04;
const X1 = PANEL_WIDTH / 2 - 0.02;
const RUN = X1 - X0;
const PULSE_LEN = 0.04;
const PULSE_R = 0.0022;
const MAX_W = 300;

/**
 * The two module cables of the 3D model run from the junction box (rear, x 0.3, z 0.2) out past the +X edge to the MC4
 * connectors (same control points as viz3d/geometry.ts). Pulses follow the polyline through them, so the electrical cue
 * ends where the model's real cable ends instead of drawing hardware of its own.
 */
const CABLE_DZ = [-0.022, 0.022] as const;
const CABLE_PTS = [
  [0.36, -0.01, 1],
  [0.44, -0.017, 1.5],
  [0.53, -0.03, 1.9],
  [0.58, -0.035, 2],
  [0.6, -0.035, 2],
] as const;
const CABLE_PULSES = 2;
const CABLE_Z0 = 0.2;
const REAR_Y0 = layerY('insulation', 0);
const AXIS_Y = new Vector3(0, 1, 0);
const tmpDir = new Vector3();
const segLen: number[] = [];
let cableLen = 0;
for (let i = 1; i < CABLE_PTS.length; i++) {
  const a = CABLE_PTS[i - 1]!;
  const b = CABLE_PTS[i]!;
  const l = Math.hypot(b[0] - a[0], b[1] - a[1], (b[2] - a[2]) * 0.022);
  segLen.push(l);
  cableLen += l;
}

export function ElectricPulses({ targets, version, explode, reduced }: EffectProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const tint = useMemo(() => new Color(), []);
  const s = useRef({ phase: 0, drawn: -1, ex: -1 });

  useFrame((fs, dt0) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const w = targets.current.electricalW;
    const level = clamp01(w / MAX_W);
    const on = w > 0.5;
    if (!on) mesh.count = 0;
    if (!on) {
      s.current.drawn = -1;
      return;
    }
    const st = s.current;
    const animate = !reduced;
    // distance units per second: 0.10 at a trickle, 0.55 at full output
    if (animate) st.phase += (Math.min(dt0, 0.1) * (0.1 + 0.45 * level)) / RUN;
    const e = explode.current;
    if (!animate && st.drawn === version.current && st.ex === e) return;
    st.drawn = version.current;
    st.ex = e;

    const y = layerY(CELLS.id, e) + CELLS.thickness / 2 + 0.002;
    let k = 0;
    for (let l = 0; l < LINES_Z.length; l++) {
      const z = LINES_Z[l] ?? 0;
      for (let j = 0; j < PER_LINE; j++, k++) {
        const u = animate ? (((st.phase + j / PER_LINE + l * 0.19) % 1) + 1) % 1 : (j + 0.5) / PER_LINE;
        dummy.position.set(X0 + u * RUN, y, z);
        dummy.rotation.set(0, 0, Math.PI / 2);
        dummy.scale.set(PULSE_R, PULSE_LEN, PULSE_R);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
        const edge = smoothstep(0, 0.06, u) * smoothstep(1, 0.92, u);
        tint.copy(WARM_WHITE).multiplyScalar((0.05 + 0.2 * level) * edge);
        mesh.setColorAt(k, tint);
      }
    }
    // cable pulses (rear assembly moves with the exploded layers)
    const rearDy = layerY('insulation', e) - REAR_Y0;
    for (let c = 0; c < CABLE_DZ.length; c++) {
      const dz = CABLE_DZ[c] ?? 0;
      for (let j = 0; j < CABLE_PULSES; j++, k++) {
        const u = animate ? (((st.phase * 1.4 + j / CABLE_PULSES + c * 0.31) % 1) + 1) % 1 : (j + 0.5) / CABLE_PULSES;
        let d = u * cableLen;
        let i = 0;
        while (i < segLen.length - 1 && d > (segLen[i] ?? 0)) {
          d -= segLen[i] ?? 0;
          i++;
        }
        const f = Math.min(1, d / (segLen[i] ?? 1));
        const a = CABLE_PTS[i]!;
        const b = CABLE_PTS[i + 1]!;
        const ax = a[0], ay = a[1], az = CABLE_Z0 + dz * a[2];
        const bx = b[0], by = b[1], bz = CABLE_Z0 + dz * b[2];
        dummy.position.set(ax + (bx - ax) * f, ay + (by - ay) * f + rearDy, az + (bz - az) * f);
        tmpDir.set(bx - ax, by - ay, bz - az).normalize();
        dummy.quaternion.setFromUnitVectors(AXIS_Y, tmpDir);
        dummy.scale.set(PULSE_R * 1.1, PULSE_LEN * 0.8, PULSE_R * 1.1);
        dummy.updateMatrix();
        mesh.setMatrixAt(k, dummy.matrix);
        tint.copy(WARM_WHITE).multiplyScalar((0.08 + 0.2 * level) * smoothstep(0, 0.1, u) * smoothstep(1, 0.9, u));
        mesh.setColorAt(k, tint);
      }
    }
    mesh.count = k;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    if (animate) fs.invalidate();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, LINES_Z.length * PER_LINE + CABLE_DZ.length * CABLE_PULSES]}
      frustumCulled={false}
      raycast={noRaycast}
      renderOrder={9}
      name="fx-electric"
    >
      <cylinderGeometry args={[1, 1, 1, 6, 1]} />
      <meshBasicMaterial color="#ffffff" transparent depthTest={false} depthWrite={false} blending={AdditiveBlending} toneMapped={false} fog={false} />
    </instancedMesh>
  );
}
