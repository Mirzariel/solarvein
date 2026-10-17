import { useCallback } from 'react';
import { useSimResult } from '../../state/selectors';
import { partValue, type PartId, type PartValue } from '../../viz3d/parts';

/**
 * The ONE place where the walk-through reads a part's live value. Today parts.ts derives it from the v1 SimResult
 * (single-module collector, the same one the 3D stage draws); when W6 moves parts.ts to the v2 step this adapter is
 * the only line that changes.
 */
export function usePartValue(): (id: PartId) => PartValue {
  const result = useSimResult();
  return useCallback((id) => partValue(id, result), [result]);
}
