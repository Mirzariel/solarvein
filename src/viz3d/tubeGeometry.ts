/**
 * Geometry builders for the planar serpentine path: adaptive-resolution tube (smooth bends, few
 * triangles on straights), flat ribbon (foam groove) and the arc-length `aU` attribute used to
 * colour the liquid. Frames are exact because the centre line is planar (XZ): normal = +Y.
 */
import * as THREE from 'three';
import { getAdaptiveSamples, pointAt, tangentAt } from './serpentine';

export interface TubeOptions {
  radius: number;
  /** Arc-length range 0..1 of the path to cover (default whole path). */
  u0?: number;
  u1?: number;
  radial?: number;
  /** Add end caps (flat discs at both tips). */
  caps?: boolean;
  /** Add a per-vertex `color` attribute (filled later by the liquid colouring). */
  colors?: boolean;
}

/** Tube along the serpentine. Attribute `aU` = arc-length fraction 0..1 of every vertex. */
export function buildSerpentineTube({ radius, u0 = 0, u1 = 1, radial = 14, caps = true, colors = false }: TubeOptions): THREE.BufferGeometry {
  const us = [u0, ...getAdaptiveSamples(20, 0.4).filter((u) => u > u0 + 1e-6 && u < u1 - 1e-6), u1];
  const rings = us.length;
  const ringVerts = radial + 1; // duplicated seam keeps normals simple
  const capVerts = caps ? 2 * (ringVerts + 1) : 0;
  const vcount = rings * ringVerts + capVerts;
  const pos = new Float32Array(vcount * 3);
  const nor = new Float32Array(vcount * 3);
  const aU = new Float32Array(vcount);
  const idx: number[] = [];

  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const B = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);

  for (let i = 0; i < rings; i++) {
    const u = us[i] as number;
    pointAt(u, P);
    tangentAt(u, T);
    B.crossVectors(T, UP).normalize(); // horizontal, perpendicular to the path
    for (let j = 0; j <= radial; j++) {
      const th = (j / radial) * Math.PI * 2;
      const c = Math.cos(th);
      const s = Math.sin(th);
      const nx = UP.x * c + B.x * s;
      const ny = UP.y * c + B.y * s;
      const nz = UP.z * c + B.z * s;
      const o = (i * ringVerts + j) * 3;
      pos[o] = P.x + nx * radius;
      pos[o + 1] = P.y + ny * radius;
      pos[o + 2] = P.z + nz * radius;
      nor[o] = nx;
      nor[o + 1] = ny;
      nor[o + 2] = nz;
      aU[i * ringVerts + j] = u;
    }
  }
  for (let i = 0; i < rings - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * ringVerts + j;
      const b = (i + 1) * ringVerts + j;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }

  if (caps) {
    for (let e = 0; e < 2; e++) {
      const u = e === 0 ? u0 : u1;
      const dir = e === 0 ? -1 : 1; // outward normal along the tangent
      pointAt(u, P);
      tangentAt(u, T);
      B.crossVectors(T, UP).normalize();
      const base = rings * ringVerts + e * (ringVerts + 1);
      const centre = base + ringVerts;
      for (let j = 0; j <= radial; j++) {
        const th = (j / radial) * Math.PI * 2;
        const c = Math.cos(th);
        const s = Math.sin(th);
        const o = (base + j) * 3;
        pos[o] = P.x + (UP.x * c + B.x * s) * radius;
        pos[o + 1] = P.y + (UP.y * c + B.y * s) * radius;
        pos[o + 2] = P.z + (UP.z * c + B.z * s) * radius;
        nor[o] = T.x * dir;
        nor[o + 1] = T.y * dir;
        nor[o + 2] = T.z * dir;
        aU[base + j] = u;
      }
      const oc = centre * 3;
      pos[oc] = P.x;
      pos[oc + 1] = P.y;
      pos[oc + 2] = P.z;
      nor[oc] = T.x * dir;
      nor[oc + 1] = T.y * dir;
      nor[oc + 2] = T.z * dir;
      aU[centre] = u;
      for (let j = 0; j < radial; j++) {
        if (dir > 0) idx.push(centre, base + j, base + j + 1);
        else idx.push(centre, base + j + 1, base + j);
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('aU', new THREE.BufferAttribute(aU, 1));
  if (colors) g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vcount * 3), 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

/** Flat horizontal ribbon (width = 2 * halfWidth) following the path at height `y`. */
export function buildSerpentineRibbon(halfWidth: number, y: number): THREE.BufferGeometry {
  const us = getAdaptiveSamples(20, 0.4);
  const n = us.length;
  const pos = new Float32Array(n * 2 * 3);
  const nor = new Float32Array(n * 2 * 3);
  const idx: number[] = [];
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const B = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const u = us[i] as number;
    pointAt(u, P);
    tangentAt(u, T);
    B.crossVectors(T, UP).normalize();
    for (let k = 0; k < 2; k++) {
      const sgn = k === 0 ? -1 : 1;
      const o = (i * 2 + k) * 3;
      pos[o] = P.x + B.x * halfWidth * sgn;
      pos[o + 1] = y;
      pos[o + 2] = P.z + B.z * halfWidth * sgn;
      nor[o + 1] = 1;
    }
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}
