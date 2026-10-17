/**
 * Hotel roof for the experience stage (v2): a graphite plinth (the roof deck) with a low parapet, a small plant-room
 * box against the back parapet and two faded neighbour modules in the hero's row. It is a scale + place cue
 * ("a 1.7 m module on a hotel roof"), not scenery: no city, no ground clutter, nothing taller than the plant room, and
 * everything past the deck falls into the graphite sweep. The deck receives the key-light shadow so the hero is
 * grounded. Layout constants live in hotel.ts (shared with the 'hotel' camera framing). Not used on the inspect
 * stage (kept clean).
 */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROOF_Y } from './geometry';
import { HOTEL } from './hotel';
import type { QualityTier } from './quality';
import { concreteTexture } from './textures';

const noRay = (): void => undefined;

const box = (w: number, h: number, d: number, x: number, y: number, z: number): THREE.BufferGeometry => {
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  return g;
};

/** Faded neighbour module: a 1.0 x 1.7 m slab on two rails (same footprint and height as the hero), edges only. */
const GHOST_H = 0.036;
const GHOST_RAIL_H = 0.045;

export function RoofContext({ tier }: { tier: QualityTier }) {
  const res = useMemo(() => {
    const { deck, parapet: p, plant: pl } = HOTEL;
    const dw = deck.x1 - deck.x0;
    const dd = deck.z1 - deck.z0;
    const cx = (deck.x0 + deck.x1) / 2;

    const tex = concreteTexture().clone();
    tex.repeat.set(dw / 1.3, dd / 1.3);
    tex.needsUpdate = true;
    const deckMat = new THREE.MeshStandardMaterial({ map: tex, color: '#5d6369', metalness: 0, roughness: 0.95, envMapIntensity: 0.4 });
    const parapetMat = new THREE.MeshStandardMaterial({ color: '#2d3237', metalness: 0, roughness: 0.9, envMapIntensity: 0.45 });
    const plantMat = new THREE.MeshStandardMaterial({ color: '#272c31', metalness: 0.05, roughness: 0.85, envMapIntensity: 0.5 });
    const doorMat = new THREE.MeshStandardMaterial({ color: '#171b1f', metalness: 0.2, roughness: 0.6, envMapIntensity: 0.5 });
    const ghostMat = new THREE.MeshBasicMaterial({ color: '#1b2025', transparent: true, opacity: 0.4, depthWrite: false, toneMapped: false });
    const lineMat = new THREE.LineBasicMaterial({ color: '#59636c', transparent: true, opacity: 0.55, toneMapped: false });
    const edgeMat = new THREE.LineBasicMaterial({ color: '#434b53', transparent: true, opacity: 0.6, toneMapped: false });

    const deckGeo = new RoundedBoxGeometry(dw, deck.thick, dd, 2, 0.01);
    deckGeo.translate(cx, ROOF_Y - deck.thick / 2, 0);

    // parapet: four bars on the deck edge (one merged draw call)
    const py = ROOF_Y + p.h / 2;
    const parapetGeo = mergeGeometries([
      box(dw, p.h, p.t, cx, py, deck.z0 + p.t / 2),
      box(dw, p.h, p.t, cx, py, deck.z1 - p.t / 2),
      box(p.t, p.h, dd - 2 * p.t, deck.x0 + p.t / 2, py, 0),
      box(p.t, p.h, dd - 2 * p.t, deck.x1 - p.t / 2, py, 0),
    ]);
    const parapetEdges = new THREE.EdgesGeometry(parapetGeo, 30);

    // plant room: body + slightly proud cap + a door on the side facing the hotel's service stair (+x)
    const plantBody = box(pl.w, pl.h, pl.d, pl.cx, ROOF_Y + pl.h / 2, pl.cz);
    const plantCap = box(pl.w + 0.08, 0.06, pl.d + 0.08, pl.cx, ROOF_Y + pl.h + 0.03, pl.cz);
    const plantGeo = mergeGeometries([plantBody, plantCap]);
    const plantEdges = new THREE.EdgesGeometry(plantGeo, 30);
    const doorGeo = new THREE.PlaneGeometry(0.62, 0.86);
    doorGeo.rotateY(Math.PI / 2);
    doorGeo.translate(pl.cx + pl.w / 2 + 0.004, ROOF_Y + 0.43, pl.cz + 0.2);

    // same base as the hero (panel frame sits at y = 0), so the slab is at the hero's height
    const ghostGeo = box(1.0, GHOST_H, 1.7, 0, GHOST_H / 2, 0);
    const ghostRails = mergeGeometries([box(1.2, GHOST_RAIL_H, 0.042, 0, -GHOST_RAIL_H / 2, 0.46), box(1.2, GHOST_RAIL_H, 0.042, 0, -GHOST_RAIL_H / 2, -0.46)]);
    const ghostEdges = new THREE.EdgesGeometry(ghostGeo);
    const ghostRailEdges = new THREE.EdgesGeometry(ghostRails);

    const geos: THREE.BufferGeometry[] = [deckGeo, parapetGeo, parapetEdges, plantGeo, plantEdges, doorGeo, ghostGeo, ghostRails, ghostEdges, ghostRailEdges];
    const mats: THREE.Material[] = [deckMat, parapetMat, plantMat, doorMat, ghostMat, lineMat, edgeMat];
    return { tex, geos, mats, deckGeo, parapetGeo, parapetEdges, plantGeo, plantEdges, doorGeo, ghostGeo, ghostRails, ghostEdges, ghostRailEdges, deckMat, parapetMat, plantMat, doorMat, ghostMat, lineMat, edgeMat };
  }, []);
  useEffect(
    () => () => {
      res.tex.dispose();
      res.geos.forEach((g) => g.dispose());
      res.mats.forEach((m) => m.dispose());
    },
    [res],
  );
  const shadows = tier !== 'low';
  return (
    <group name="roof-context">
      <mesh geometry={res.deckGeo} material={res.deckMat} receiveShadow={shadows} raycast={noRay} />
      <mesh geometry={res.parapetGeo} material={res.parapetMat} receiveShadow={shadows} raycast={noRay} />
      <lineSegments geometry={res.parapetEdges} material={res.edgeMat} raycast={noRay} />
      <mesh geometry={res.plantGeo} material={res.plantMat} receiveShadow={shadows} raycast={noRay} />
      <lineSegments geometry={res.plantEdges} material={res.edgeMat} raycast={noRay} />
      <mesh geometry={res.doorGeo} material={res.doorMat} raycast={noRay} />
      {HOTEL.ghosts.map((g) => (
        <group key={g.x} position={[g.x, 0, g.z]}>
          <mesh geometry={res.ghostGeo} material={res.ghostMat} renderOrder={1} raycast={noRay} />
          <mesh geometry={res.ghostRails} material={res.ghostMat} renderOrder={1} raycast={noRay} />
          <lineSegments geometry={res.ghostEdges} material={res.lineMat} raycast={noRay} />
          <lineSegments geometry={res.ghostRailEdges} material={res.lineMat} raycast={noRay} />
        </group>
      ))}
    </group>
  );
}
