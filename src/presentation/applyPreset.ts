import { useSystemStore } from '../state/system';
import { parsePreset } from './preset';

let applied = false;

/** Apply `?skenario=` / `?jam=` once to the system store. Safe to call repeatedly. Returns true when something was applied. */
export function applyUrlPreset(search: string = typeof location !== 'undefined' ? location.search : ''): boolean {
  if (applied) return false;
  const p = parsePreset(search);
  if (!p) return false;
  applied = true;
  const st = useSystemStore.getState();
  if (p.kind === 'target') {
    st.setModeTarget(p.target);
  } else {
    if (p.scenario) st.setScenario(p.scenario);
    if (p.hour !== undefined) st.setHour(p.hour);
  }
  return true;
}
