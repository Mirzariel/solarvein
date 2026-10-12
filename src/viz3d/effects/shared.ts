import type { MutableRefObject } from 'react';
import { LAYERS, type LayerSpec } from '../dims';
import type { ExplodeFactorRef } from '../useExplodeFactor';
import type { EffectTargets } from './targets';

/** Props every effect receives. Refs are mutated outside React; effects read them inside useFrame. */
export interface EffectProps {
  targets: MutableRefObject<EffectTargets>;
  /** Increments whenever `targets.current` was refilled (a new visual frame or a viewer toggle). */
  version: MutableRefObject<number>;
  explode: ExplodeFactorRef;
  reduced: boolean;
}

const spec = (id: LayerSpec['id']): LayerSpec => {
  const s = LAYERS.find((l) => l.id === id);
  if (!s) throw new Error(`Unknown layer ${id}`);
  return s;
};

export const GLASS = spec('glass');
export const CELLS = spec('cells');
export const CHANNEL = spec('channel');

/** Y of the sunward glass surface for an explode factor. */
export const glassTopY = (e: number): number => GLASS.y + GLASS.explodeOffset * e + GLASS.thickness / 2;

/** Direction TOWARD the key light (matches the studio key at [-2.2, 3.6, 2.0]). */
const KX = -2.2;
const KY = 3.6;
const KZ = 2.0;
const KL = Math.hypot(KX, KY, KZ);
export const TO_SUN = { x: KX / KL, y: KY / KL, z: KZ / KL } as const;
