import { useEffect, useMemo, useRef, useState } from 'react';
import { getSystemView, type SystemView } from '../../sim/system';
import { useSystemStore } from '../../state/system';

/**
 * Tier berat (tahunan, pembanding) hanya dihitung (a) setelah geseran berhenti `ms` milidetik dan (b) bila pembacanya
 * terlihat (`enabled`). Selama menggeser, angka lama tetap tampil dan `pending` true. `useDeferredValue` tidak cukup:
 * perhitungan sinkron yang sudah mulai tidak bisa disela, jadi setiap tick menahan thread utama.
 */
export function useSettledView(ms = 280, enabled = true): { view: SystemView; pending: boolean } {
  const sys = useSystemStore((s) => s.sys);
  const [settled, setSettled] = useState(sys);
  useEffect(() => {
    if (!enabled || sys === settled) return;
    const id = window.setTimeout(() => setSettled(sys), ms);
    return () => window.clearTimeout(id);
  }, [sys, settled, ms, enabled]);
  const view = useMemo(() => getSystemView(settled), [settled]);
  return { view, pending: settled !== sys };
}

/**
 * Menghitung `fn` pada waktu senggang (requestIdleCallback, batas 800 ms) dan mempertahankan nilai terakhir sampai
 * hasil baru siap: dua tier berat tidak menumpuk dalam satu tugas panjang.
 */
export function useIdleMemo<T>(fn: () => T, deps: readonly unknown[]): T | undefined {
  const [value, setValue] = useState<T>();
  const latest = useRef(fn);
  latest.current = fn;
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let cancelled = false;
    const run = () => {
      if (!cancelled) setValue(latest.current());
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(run, { timeout: 800 });
      return () => {
        cancelled = true;
        w.cancelIdleCallback?.(id);
      };
    }
    const id = window.setTimeout(run, 60);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}
