/**
 * 3D anchors for DOM annotations + the in-canvas projector that turns them into pixel positions every
 * rendered frame (no React render: the overlays write DOM transforms from the stage's projection sink).
 */
import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import * as THREE from 'three';
import { TUBE_RADIUS } from './dims';
import { layerY, INLET_POSITION, OUTLET_POSITION, getPassLayout } from './serpentine';
import { useStage, type ProjectedAnchor } from './stage';

export interface AnchorDef {
  id: string;
  /** Model-space position for an explode factor 0..1. */
  local: (explode: number, out: THREE.Vector3) => THREE.Vector3;
  /** When true the dot is mirrored to the kept half (z < 0) while the cross-section is on. */
  mirrorOnCut?: boolean;
}

export const EXPERIENCE_ANCHORS: readonly AnchorDef[] = [
  { id: 'inlet', local: (e, o) => o.set(INLET_POSITION.x, layerY('channel', e) + 0.014, INLET_POSITION.z) },
  { id: 'outlet', local: (e, o) => o.set(OUTLET_POSITION.x, layerY('channel', e) + 0.014, OUTLET_POSITION.z) },
];

const PASS_X = getPassLayout().passX;
const LAST_X = PASS_X[PASS_X.length - 1] ?? 0.42;

/** One dot per annotated part, on the side/top surface facing the home camera. */
export const INSPECT_ANCHORS: readonly AnchorDef[] = [
  { id: 'pv', mirrorOnCut: true, local: (e, o) => o.set(0.4, layerY('cells', e) + 0.004 * (1 + 3.5 * e), 0.3) },
  { id: 'absorber', mirrorOnCut: true, local: (e, o) => o.set(0.4, layerY('absorber', e) + 0.0035 * (1 + 3.5 * e), 0.05) },
  { id: 'channel', mirrorOnCut: true, local: (e, o) => o.set(LAST_X, layerY('channel', e) + TUBE_RADIUS, 0.45) },
  { id: 'insulation', mirrorOnCut: true, local: (e, o) => o.set(0.5, layerY('insulation', e) + 0.017, 0.5) },
];

/** Projects the anchors; runs after the driver (explode) and the camera rig, before the render. */
export function Projector({ anchors }: { anchors: readonly AnchorDef[] }) {
  const stage = useStage();
  const pts = useMemo<ProjectedAnchor[]>(() => anchors.map((a) => ({ id: a.id, x: 0, y: 0, visible: false })), [anchors]);
  const v = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, size }) => {
    const sink = stage.projection.current;
    if (!sink) return;
    const e = stage.explode.current;
    const cut = stage.store.getState().crossSection;
    for (let i = 0; i < anchors.length; i++) {
      const a = anchors[i];
      const p = pts[i];
      if (!a || !p) continue;
      a.local(e, v);
      if (cut && a.mirrorOnCut && v.z > 0) v.z = -v.z;
      v.project(camera);
      p.x = ((v.x + 1) / 2) * size.width;
      p.y = ((1 - v.y) / 2) * size.height;
      p.visible = v.z < 1 && v.z > -1;
    }
    sink(pts, size.width, size.height);
  }, -1);
  return null;
}
