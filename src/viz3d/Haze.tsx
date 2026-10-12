/**
 * Atmospheric backdrop of the graphite stage: a screen-space gradient + soft light bloom BEHIND the model.
 * It comes from the sky, not decoration: sunny = warm sun haze glowing from the upper right, overcast/rain =
 * cool flat haze. Driven by the same `stage.mood` (sun/rain) as the studio lights, so Motion's interpolation
 * moves the haze with the light. One full-screen triangle, no post-processing, no texture.
 */
import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useStage } from './stage';

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}`;

const FRAG = /* glsl */ `
uniform vec3 uBase;
uniform vec3 uTop;
uniform vec3 uGlow;
uniform vec2 uCentre;
uniform float uGlowK;
uniform float uAspect;
uniform float uGrain;
varying vec2 vUv;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  vec3 c = mix(uBase, uTop, smoothstep(0.15, 1.0, vUv.y));
  vec2 d = (vUv - uCentre) * vec2(uAspect, 1.0);
  float g = exp(-dot(d, d) * 2.4);
  c += uGlow * g * uGlowK;
  // vignette keeps the edges on the base graphite so the stage still reads as a framed window
  vec2 e = vUv - 0.5;
  c = mix(c, uBase, smoothstep(0.35, 0.95, length(e * vec2(0.9, 1.15))) * 0.7);
  c += (hash(gl_FragCoord.xy) - 0.5) * uGrain;
  gl_FragColor = vec4(c, 1.0);
  #include <colorspace_fragment>
}`;

const BASE = new THREE.Color('#0E1114');
const TOP_SUN = new THREE.Color('#1D2023');
const TOP_OVERCAST = new THREE.Color('#17222B');
const GLOW_SUN = new THREE.Color('#5A5348');
const GLOW_OVERCAST = new THREE.Color('#2C4A60');

export function Haze() {
  const stage = useStage();
  const mat = useRef<THREE.ShaderMaterial>(null);
  const last = useRef({ sun: Number.NaN, rain: Number.NaN, aspect: 0 });
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3));
    return g;
  }, []);
  const uniforms = useMemo(
    () => ({
      uBase: { value: BASE.clone() },
      uTop: { value: TOP_OVERCAST.clone() },
      uGlow: { value: GLOW_OVERCAST.clone() },
      uCentre: { value: new THREE.Vector2(0.72, 0.7) },
      uGlowK: { value: 0.5 },
      uAspect: { value: 1.6 },
      uGrain: { value: 0.012 },
    }),
    [],
  );

  useFrame(({ size }) => {
    const m = stage.mood.current;
    const aspect = size.width / Math.max(1, size.height);
    const l = last.current;
    if (l.sun === m.sun && l.rain === m.rain && l.aspect === aspect) return;
    l.sun = m.sun;
    l.rain = m.rain;
    l.aspect = aspect;
    const s = Math.min(1, Math.max(0, m.sun));
    uniforms.uTop.value.copy(TOP_OVERCAST).lerp(TOP_SUN, s);
    uniforms.uGlow.value.copy(GLOW_OVERCAST).lerp(GLOW_SUN, s);
    uniforms.uGlowK.value = 0.55 + 0.75 * s;
    uniforms.uCentre.value.set(0.5 + 0.22 * s, 0.62 + 0.1 * s); // the sun glow sits upper right, overcast is centred
    uniforms.uAspect.value = aspect;
  });

  return (
    <mesh geometry={geometry} frustumCulled={false} renderOrder={-10} raycast={() => undefined}>
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
