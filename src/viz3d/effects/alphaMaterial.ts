import { Color, InstancedBufferAttribute, ShaderMaterial, type BufferGeometry } from 'three';

/**
 * Flat-colour instanced material with a PER-INSTANCE alpha (attribute `aAlpha`), so effects can fade each element in
 * and out without changing its size, and without alpha-fading through additive washout. Normal blending.
 */
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

export function createAlphaMaterial(color: string, depthTest = true): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { uColor: { value: new Color(color) } },
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthWrite: false,
    depthTest,
  });
}

export function addAlphaAttribute(geo: BufferGeometry, count: number): InstancedBufferAttribute {
  const a = new InstancedBufferAttribute(new Float32Array(count), 1);
  geo.setAttribute('aAlpha', a);
  return a;
}
