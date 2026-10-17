import { useEffect, useMemo, useState } from 'react';
import { getSystemView, type SystemView } from '../../sim/system';
import { useSystemStore } from '../../state/system';

/**
 * Tier berat (tahunan, pembanding: ratusan milidetik, sinkron) hanya dihitung setelah geseran berhenti `ms` milidetik.
 * Selama menggeser, angka lama tetap tampil dan `pending` true. `useDeferredValue` tidak cukup di sini: satu
 * perhitungan sinkron yang sudah mulai tidak bisa disela, jadi setiap tick akan menahan thread utama.
 */
export function useSettledView(ms = 280): { view: SystemView; pending: boolean } {
  const sys = useSystemStore((s) => s.sys);
  const [settled, setSettled] = useState(sys);
  useEffect(() => {
    if (sys === settled) return;
    const id = window.setTimeout(() => setSettled(sys), ms);
    return () => window.clearTimeout(id);
  }, [sys, settled, ms]);
  const view = useMemo(() => getSystemView(settled), [settled]);
  return { view, pending: settled !== sys };
}
