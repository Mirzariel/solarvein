import { useCallback } from 'react';
import { useSimResult } from '../../state/selectors';
import { formatId } from '../../ui';
import { partValue, type PartId, type PartValue } from '../../viz3d/parts';

/**
 * The ONE place where the walk-through reads a part's live value. parts.ts derives it from the single-module
 * SimResult (the same one the 3D stage draws); if parts.ts moves to the v2 step this adapter is the only line to change.
 */
export function usePartValue(): (id: PartId) => PartValue {
  const result = useSimResult();
  return useCallback((id) => partValue(id, result), [result]);
}

/** Label of the condition the part values belong to, from the same SimResult ("900 W/m², cairan 40→45 °C"). */
export function useReferenceCondition(): string {
  const r = useSimResult();
  return `${formatId(r.inputs.irradiance, 0)} W/m², cairan ${formatId(r.inletC, 0)}→${formatId(r.outletC, 0)} °C`;
}
