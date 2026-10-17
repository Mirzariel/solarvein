/**
 * Local scene of the router section. While the section drives the visual clock (pinned scrub, or the unpinned
 * A/B/C tabs and day strip) it talks to the engine directly and records the scenario it uses here, so the
 * painter and the sentence read the right day WITHOUT writing hour/scenario into the global store. Leaving the
 * section restores the engine to the store state (`restoreEngine`), so Sistem and Sehari never see our clock.
 */
import { targetAt, weather } from '../../motion';
import type { DayScenarioId } from '../../sim/system';
import { useSystemStore } from '../../state/system';

let scenario: DayScenarioId | null = null;

export const getSceneScenario = (): DayScenarioId | null => scenario;
export const setSceneScenario = (s: DayScenarioId | null): void => {
  scenario = s;
};

/** Point the engine at (scenario, hour) of the CURRENT system; the store is not touched. */
export function driveEngine(sc: DayScenarioId, hour: number, kind: 'scripted' | 'follow'): void {
  const st = useSystemStore.getState();
  scenario = sc;
  weather.setTarget(targetAt(st.sys, sc, st.strategy, hour), { kind });
}

/** Give the engine back to the store (what Sistem / Sehari chose) and forget the local scenario. */
export function restoreEngine(): void {
  if (scenario === null) return;
  scenario = null;
  const st = useSystemStore.getState();
  weather.setTarget(targetAt(st.sys, st.scenario, st.strategy, st.hour), { kind: 'scripted' });
}
