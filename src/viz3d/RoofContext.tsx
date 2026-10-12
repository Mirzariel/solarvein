/**
 * Scale cue for the experience stage: a section of weathered concrete roof slab (with a raised kerb behind the
 * module) that the mounting rails stand on. It receives the key-light shadow, so the module is grounded and a
 * stranger reads "a 1.7 m panel on a roof". Not used on the inspect stage (kept clean).
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ROOF_Y } from './geometry';
import type { QualityTier } from './quality';
import { concreteTexture } from './textures';

const noRay = (): void => undefined;

export function RoofContext({ tier }: { tier: QualityTier }) {
  const { slab, kerb, mat, tex } = useMemo(() => {
    const t = concreteTexture().clone();
    t.repeat.set(3, 2.5);
    t.needsUpdate = true;
    const m = new THREE.MeshStandardMaterial({ map: t, color: '#a9aaab', metalness: 0, roughness: 0.94, envMapIntensity: 0.5 });
    return {
      slab: new RoundedBoxGeometry(3.6, 0.14, 3.0, 2, 0.008),
      kerb: new RoundedBoxGeometry(0.16, 0.1, 3.0, 2, 0.01),
      mat: m,
      tex: t,
    };
  }, []);
  useEffect(
    () => () => {
      slab.dispose();
      kerb.dispose();
      mat.dispose();
      tex.dispose();
    },
    [slab, kerb, mat, tex],
  );
  const shadows = tier !== 'low';
  return (
    <group name="roof-context">
      <mesh geometry={slab} material={mat} position={[0, ROOF_Y - 0.07, 0]} receiveShadow={shadows} raycast={noRay} />
      <mesh geometry={kerb} material={mat} position={[-1.7, ROOF_Y + 0.05, 0]} receiveShadow={shadows} castShadow={shadows} raycast={noRay} />
    </group>
  );
}
