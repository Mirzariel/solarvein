import { useCallback } from 'react';
import { referenceResult } from '../../sim';
import { formatId } from '../../ui';
import { partValue, type PartId, type PartValue } from '../../viz3d/parts';

/**
 * The ONE place where the walk-through reads a part's value. parts.ts derives it from the single-module reference
 * SimResult (src/sim/reference.ts: the same state the inspect stage's labels show); if parts.ts moves to the v2 step
 * this adapter is the only line to change.
 */
export function usePartValue(): (id: PartId) => PartValue {
  return useCallback((id) => partValue(id, referenceResult()), []);
}

/** Label of the condition the part values belong to, from the same SimResult ("900 W/m², cairan 40→45 °C"). */
export function useReferenceCondition(): string {
  const r = referenceResult();
  return `${formatId(r.inputs.irradiance, 0)} W/m², cairan ${formatId(r.inletC, 0)}→${formatId(r.outletC, 0)} °C`;
}
