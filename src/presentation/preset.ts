/**
 * URL presets: `?skenario=terik|lembap|malam[&jam=13]` (also berawan, hujan, hujan-3-hari).
 * Pure parsing here; applying lives in earlyPreset.ts (imported before the motion engine so the first frame snaps).
 *  - terik  -> condition A (hari terik, 13:00)
 *  - lembap -> condition B (hari hujan, 15:00)
 *  - malam  -> condition C (hari terik, 22:00)
 * With `jam` the scenario is set directly and the hour overrides the preset hour (the mode target becomes 'custom').
 */
import type { DayScenarioId, ModeTarget } from '../sim/system';

export type UrlPreset =
  | { kind: 'target'; target: ModeTarget }
  | { kind: 'custom'; scenario?: DayScenarioId; hour?: number };

const TARGET: Record<string, ModeTarget> = { terik: 'A', lembap: 'B', malam: 'C' };
const SCENARIO: Record<string, DayScenarioId> = {
  terik: 'terik',
  lembap: 'hujan',
  malam: 'terik',
  berawan: 'berawan',
  hujan: 'hujan',
  'hujan-3-hari': 'hujan-3-hari',
  '3hari': 'hujan-3-hari',
};

export function parsePreset(search: string): UrlPreset | null {
  const q = new URLSearchParams(search);
  const name = q.get('skenario')?.toLowerCase().trim();
  const jamRaw = q.get('jam')?.trim().replace(',', '.');
  const hour = jamRaw !== undefined && jamRaw !== '' && Number.isFinite(Number(jamRaw)) ? Number(jamRaw) : undefined;
  const t = name ? TARGET[name] : undefined;
  if (t && hour === undefined) return { kind: 'target', target: t };
  const scenario = name ? SCENARIO[name] : undefined;
  if (scenario === undefined && hour === undefined) return null;
  return { kind: 'custom', scenario, hour };
}
