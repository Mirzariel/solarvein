import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Color, CylinderGeometry, InstancedBufferAttribute, InstancedMesh, Object3D, ShaderMaterial } from 'three';
import { PANEL_LENGTH, PANEL_WIDTH } from '../dims';
import { clamp, smoothstep } from '../../motion/spring';
import { hash01, noRaycast } from './fxMath';
import { glassTopY, type EffectProps } from './shared';

/**
 * Rain: fine, sparse, angled, desaturated. At most 160 streaks (1 px, 0.12 u), constant fall speed 1.6 u/s, lean
 * 8 deg + 1.6 deg per m/s of wind, normal blending (no additive), opacity <= 0.35, no ripples. Streaks end ON the
 * glass and shrink over the last stretch; each fades in at the top, so nothing pops in mid-air.
 * The streak count follows the visual rain intensity continuously: the fractional part of the count is a
 * per-instance alpha ramp (the 161st streak fades in instead of popping).
 */
const MAX_STREAKS = 160;
const FALL_H = 1.1;
const FALL_SPEED = 1.6; // u/s
const STREAK_LEN = 0.12;
const MARGIN = 0.4;
const MAX_ALPHA = 0.35;
const HALF_W = PANEL_WIDTH / 2 + MARGIN;
const HALF_L = PANEL_LENGTH / 2 + MARGIN;
const CYCLE_S = (FALL_H + STREAK_LEN) / FALL_SPEED;
const COLOR = new Color('#9FB2BF');

const SEED = new Float32Array(MAX_STREAKS);
for (let i = 0; i < MAX_STREAKS; i++) SEED[i] = hash01(i * 7 + 3);

const VERT = /* glsl */ `
attribute float aAlpha;
varying float vA;
void main() {
  vA = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  gl_FragColor = vec4(uColor, vA);
  #include <colorspace_fragment>
}`;

/** Number of streaks (continuous) for a rain intensity in mm/h: 15 mm/h gives ~110, 60 mm/h ~160. */
export const streakCount = (mmH: number): number => (mmH < 0.05 ? 0 : MAX_STREAKS * (1 - Math.exp(-mmH / 11)));

export function Rain({ targets, version, explode, reduced }: EffectProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const geo = useMemo(() => {
    const g = new CylinderGeometry(0.0017, 0.0017, 1, 4, 1, true);
    g.setAttribute('aAlpha', new InstancedBufferAttribute(new Float32Array(MAX_STREAKS), 1));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: COLOR } },
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  const st = useRef({ phase: 0, drawn: -1, ex: -1 });

  useFrame((fs, dt0) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = targets.current;
    const nFrac = streakCount(t.rainMmH);
    const on = nFrac > 0.001;
    if (!on) mesh.count = 0; // never `visible = false`: the program must exist for gl.compile warm-up
    if (!on) {
      st.current.drawn = -1;
      return;
    }
    const s = st.current;
    const animate = !reduced;
    if (animate) s.phase += Math.min(dt0, 0.1) / CYCLE_S;
    const e = explode.current;
    if (!animate && s.drawn === version.current && s.ex === e) return;
    s.drawn = version.current;
    s.ex = e;

    const n = Math.min(MAX_STREAKS, Math.ceil(nFrac));
    const topY = glassTopY(e);
    const lean = ((8 + 1.6 * clamp(t.windMs, 0, 10)) * Math.PI) / 180;
    const slant = Math.tan(lean);
    const alpha = geo.getAttribute('aAlpha') as InstancedBufferAttribute;

    for (let i = 0; i < n; i++) {
      const raw = (animate ? s.phase : 0.3) + (SEED[i] ?? 0);
      const cycle = Math.floor(raw);
      const f = raw - cycle;
      const hx = (hash01(i * 131 + cycle * 17 + 1) - 0.5) * 2 * HALF_W;
      const hz = (hash01(i * 131 + cycle * 17 + 2) - 0.5) * 2 * HALF_L;
      const remaining = (1 - f) * (FALL_H + STREAK_LEN) - STREAK_LEN; // height of the leading (lower) end above the glass
      const lowEnd = Math.max(0, remaining);
      const len = Math.min(STREAK_LEN, remaining + STREAK_LEN);
      const w = clamp(nFrac - i, 0, 1);
      if (len <= 0.002) {
        dummy.scale.set(0, 0, 0);
        alpha.setX(i, 0);
      } else {
        const c = lowEnd + len / 2;
        dummy.position.set(hx - slant * c, topY + c, hz);
        dummy.rotation.set(0, 0, lean);
        dummy.scale.set(1, len, 1);
        // fade in over the first 12 % of the fall, fade out over the last 0.1 u above the glass
        alpha.setX(i, MAX_ALPHA * w * smoothstep(0, 0.12, f) * smoothstep(0, 0.1, remaining + 0.02));
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = true;
    if (animate) fs.invalidate();
  });

  return <instancedMesh ref={meshRef} args={[geo, mat, MAX_STREAKS]} frustumCulled={false} raycast={noRaycast} renderOrder={5} name="fx-rain" />;
}
