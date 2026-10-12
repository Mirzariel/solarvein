/**
 * Memoised derived-physics hooks. Views NEVER call the sim directly.
 *
 * Results are cached per `inputs` object identity (the store replaces `inputs`
 * immutably), so any number of components share ONE computation per change.
 */
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  compareConfigurations,
  simulate,
  simulateDay,
  type CollectorConfig,
  type DayPoint,
  type DayScenario,
  type SimInputs,
  type SimResult,
} from '../sim';
import { useStore } from './store';

const simCache = new WeakMap<SimInputs, Map<CollectorConfig, SimResult>>();
const compareCache = new WeakMap<SimInputs, Record<CollectorConfig, SimResult>>();
const dayCache = new WeakMap<SimInputs, Map<string, DayPoint[]>>();

/** Pure, cached `simulate`. Safe to call outside React (tests, render loops). */
export function getSimResult(
  inputs: SimInputs,
  config: CollectorConfig = 'solarvein-dual',
): SimResult {
  let byConfig = simCache.get(inputs);
  if (!byConfig) simCache.set(inputs, (byConfig = new Map()));
  let r = byConfig.get(config);
  if (!r) byConfig.set(config, (r = simulate(inputs, config)));
  return r;
}

export function getComparison(inputs: SimInputs): Record<CollectorConfig, SimResult> {
  let r = compareCache.get(inputs);
  if (!r) compareCache.set(inputs, (r = compareConfigurations(inputs)));
  return r;
}

export function getDayProfile(
  inputs: SimInputs,
  scenario: DayScenario,
  config: CollectorConfig = 'solarvein-dual',
): DayPoint[] {
  let byKey = dayCache.get(inputs);
  if (!byKey) dayCache.set(inputs, (byKey = new Map()));
  const key = `${scenario}|${config}`;
  let r = byKey.get(key);
  if (!r) byKey.set(key, (r = simulateDay(inputs, scenario, config)));
  return r;
}

/** SolarVein-dual (default) result for the current inputs. */
export function useSimResult(config: CollectorConfig = 'solarvein-dual'): SimResult {
  const inputs = useStore((s) => s.inputs);
  return useMemo(() => getSimResult(inputs, config), [inputs, config]);
}

/** conventional-pv / pvt-harvest-only / solarvein-dual for the current inputs. */
export function useComparison(): Record<CollectorConfig, SimResult> {
  const inputs = useStore((s) => s.inputs);
  return useMemo(() => getComparison(inputs), [inputs]);
}

/** Hourly day profile (06-18) built from the current inputs as base. */
export function useDayProfile(
  scenario: DayScenario,
  config: CollectorConfig = 'solarvein-dual',
): DayPoint[] {
  const inputs = useStore((s) => s.inputs);
  return useMemo(() => getDayProfile(inputs, scenario, config), [inputs, scenario, config]);
}


// ── Pembaca di bawah lipatan: tidak boleh memblokir geseran slider ─────────────────────────────────────────────
// Satu geseran mengubah inputs; Hero dan 3D memakai nilai langsung, sedangkan bagian lain (grafik, perbandingan, rincian)
// memakai salinan yang ditunda (prioritas rendah, React boleh menyela) dan dibatasi lajunya.

/** Nilai yang mengikuti value paling sering tiap ms milidetik (tepi depan dan belakang). */
export function useThrottledValue<T>(value: T, ms = 120): T {
  const [out, setOut] = useState(value);
  const last = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => {
    const now = performance.now();
    const wait = ms - (now - last.current);
    if (timer.current) clearTimeout(timer.current);
    if (wait <= 0) {
      last.current = now;
      setOut(latest.current);
    } else {
      timer.current = setTimeout(() => {
        last.current = performance.now();
        setOut(latest.current);
      }, wait);
    }
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, ms]);
  return out;
}

/** inputs yang ditunda dan dibatasi (±8 Hz) untuk pembaca yang tidak perlu mengikuti jari. */
export function useLaggedInputs(ms = 120): SimInputs {
  const inputs = useStore((s) => s.inputs);
  return useThrottledValue(useDeferredValue(inputs), ms);
}

/** SolarVein-dual dari useLaggedInputs: untuk grafik dan rincian di bawah lipatan. */
export function useLaggedSimResult(config: CollectorConfig = 'solarvein-dual', ms = 120): SimResult {
  const inputs = useLaggedInputs(ms);
  return useMemo(() => getSimResult(inputs, config), [inputs, config]);
}

/** Tiga konfigurasi dari useLaggedInputs. */
export function useLaggedComparison(ms = 120): Record<CollectorConfig, SimResult> {
  const inputs = useLaggedInputs(ms);
  return useMemo(() => getComparison(inputs), [inputs]);
}

/** Profil harian dari useLaggedInputs. */
export function useLaggedDayProfile(scenario: DayScenario, config: CollectorConfig = 'solarvein-dual', ms = 200): DayPoint[] {
  const inputs = useLaggedInputs(ms);
  return useMemo(() => getDayProfile(inputs, scenario, config), [inputs, scenario, config]);
}
