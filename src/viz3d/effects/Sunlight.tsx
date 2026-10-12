import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  ShaderMaterial,
  Vector3,
} from 'three';
import { smoothstep } from '../../motion/spring';
import { noRaycast } from './fxMath';
import { TO_SUN, glassTopY, type EffectProps } from './shared';

/**
 * Sunlight, unmistakably light and never streaks (QA F3-02: the old dashed rays read as rain):
 *  1. four broad, soft, warm light SHAFTS falling onto the panel along the key-light direction. Each is a feathered quad
 *     (soft edges, brightest where it meets the glass, fading to nothing before it ends, so there is no hard cut-off),
 *     billboarded around the shaft axis so it keeps its volume from every orbit angle;
 * Intensity follows the visual irradiance G (zero below ~60 W/m2, so under overcast there is no sun at all).
 * Additive, depth-tested, no particles. Reduced motion: shafts static. (The glare on the glass comes from the stage sky-dome reflection; a glint plane made faceted blobs and was removed.)
 */
const SHAFTS = [
  { x: -0.4, z: -0.05, w: 0.3 },
  { x: -0.13, z: 0.12, w: 0.24 },
  { x: 0.14, z: -0.1, w: 0.3 },
  { x: 0.41, z: 0.08, w: 0.22 },
] as const;
const SHAFT_LEN = 1.05;

const SHAFT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  vec3 p = position;
  p.x *= 1.0 + 0.55 * position.y; // the beam widens a little as it travels
  gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(p, 1.0);
}`;
const SHAFT_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uA;
uniform float uT;
varying vec2 vUv;
void main() {
  float cx = (vUv.x * 2.0 - 1.0) * 1.8;
  float edge = exp(-cx * cx); // smooth gaussian across the shaft, no hard polygon edge
  // zero at the glass end (never touches or cuts the glass), soft peak, then a long fade to nothing
  float along = smoothstep(0.0, 0.4, vUv.y) * pow(1.0 - vUv.y, 1.3);
  float shimmer = 0.9 + 0.1 * sin(uT * 0.8 + vUv.x * 5.0 + vUv.y * 3.0);
  float a = uA * edge * along * shimmer;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}`;
const SHAFT_COLOR = new Color('#FFD9A0');
const tmpX = new Vector3();
const tmpZ = new Vector3();
const tmpV = new Vector3();
const tmpA = new Vector3(TO_SUN.x, TO_SUN.y, TO_SUN.z);
const tmpM = new Matrix4();

export function Sunlight({ targets, version, explode, reduced }: EffectProps) {
  const shaftRef = useRef<InstancedMesh>(null);
  const shaftGeo = useMemo(() => {
    const g = new PlaneGeometry(1, 1);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  const shaftMat = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uColor: { value: SHAFT_COLOR }, uA: { value: 0 }, uT: { value: 0 } },
        vertexShader: SHAFT_VERT,
        fragmentShader: SHAFT_FRAG,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
      }),
    [],
  );
  useEffect(
    () => () => {
      shaftGeo.dispose();
      shaftMat.dispose();
    },
    [shaftGeo, shaftMat],
  );
  const st = useRef({ t: 0, drawn: -1, ex: -1, cam: 0 });

  useFrame((fs, dt0) => {
    const shafts = shaftRef.current;
    if (!shafts) return;
    const g = targets.current.irradiance;
    const vis = smoothstep(60, 320, g);
    const s = st.current;
    if (vis < 0.002) {
      shafts.count = 0;
      s.drawn = -1;
      return;
    }
    const animate = !reduced;
    if (animate) s.t += Math.min(dt0, 0.1);
    const e = explode.current;
    const cam = fs.camera.position;
    const camSig = cam.x * 7 + cam.z * 13 + cam.y * 3;
    if (!animate && s.drawn === version.current && s.ex === e && s.cam === camSig) return;
    s.drawn = version.current;
    s.ex = e;
    s.cam = camSig;

    const level = vis * (0.4 + 0.6 * Math.min(1.2, g / 900));
    shaftMat.uniforms.uA!.value = 0.2 * level;
    shaftMat.uniforms.uT!.value = animate ? s.t : 0;

    const topY = glassTopY(e) + 0.05; // shafts start above the glass and are zero at their base: no intersection

    for (let i = 0; i < SHAFTS.length; i++) {
      const sh = SHAFTS[i]!;
      // centre of the shaft's footprint on the glass; billboard around the shaft axis (tmpA)
      tmpV.set(cam.x - sh.x, cam.y - topY, cam.z - sh.z);
      tmpX.crossVectors(tmpA, tmpV).normalize();
      tmpZ.crossVectors(tmpX, tmpA).normalize();
      tmpM.makeBasis(tmpX.multiplyScalar(sh.w), tmpV.copy(tmpA).multiplyScalar(SHAFT_LEN), tmpZ);
      tmpM.setPosition(sh.x, topY, sh.z);
      shafts.setMatrixAt(i, tmpM);
    }
    shafts.count = SHAFTS.length;
    shafts.instanceMatrix.needsUpdate = true;
    if (animate) fs.invalidate();
  });

  return (
    <group name="fx-sunlight">
      <instancedMesh ref={shaftRef} args={[shaftGeo, shaftMat, SHAFTS.length]} frustumCulled={false} raycast={noRaycast} renderOrder={4} />
    </group>
  );
}
