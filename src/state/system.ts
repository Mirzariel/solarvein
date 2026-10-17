/**
 * v2 system store (lead-owned interface; W5 may extend behind these names).
 * Holds ONLY user choices + view state. All numbers come from src/sim/system via ./systemSelectors.
 * Lives beside the v1 store (./store.ts) until the cutover.
 */
import { create } from 'zustand';
import {
  DEFAULT_SYSTEM,
  HOTEL_PRESETS,
  MODE_TARGETS,
  type DayScenarioId,
  type ModeTarget,
  type RegenAirSource,
  type RouterStrategy,
  type SystemInputs,
} from '../sim/system';

export type HotelPresetId = keyof typeof HOTEL_PRESETS | 'custom';
export type DayView = '24h' | '72h';

/** Deep-partial patch for SystemInputs (one level below the top keys is enough for the UI). */
export type SystemPatch = { [K in keyof SystemInputs]?: Partial<SystemInputs[K]> };

export interface SystemState {
  // ── system inputs ──
  sys: SystemInputs;
  hotelPreset: HotelPresetId;
  // ── scenario / time ──
  scenario: DayScenarioId;
  strategy: RouterStrategy;
  /** Hours since scenario start (0..24, or 0..72 for 'hujan-3-hari'). */
  hour: number;
  /** Last condition preset chosen (A/B/C) or 'custom' after manual scenario/hour edits. */
  modeTarget: ModeTarget | 'custom';
  dayView: DayView;
  // ── desiccant research view ──
  desiccantRegenC: number;
  regenAir: RegenAirSource;
  // ── presentation mode ──
  presentation: boolean;
  scene: number;

  // ── actions ──
  setSys: (patch: SystemPatch) => void;
  setHotelPreset: (id: Exclude<HotelPresetId, 'custom'>) => void;
  resetSys: () => void;
  setModeTarget: (m: ModeTarget) => void;
  setScenario: (s: DayScenarioId) => void;
  setStrategy: (s: RouterStrategy) => void;
  setHour: (h: number) => void;
  setDayView: (v: DayView) => void;
  setDesiccantView: (p: { regenC?: number; regenAir?: RegenAirSource }) => void;
  setPresentation: (on: boolean) => void;
  setScene: (n: number) => void;
}

const clone = (s: SystemInputs): SystemInputs => structuredClone(s);
const maxHour = (s: DayScenarioId) => (s === 'hujan-3-hari' ? 72 : 24);
const clampHour = (h: number, s: DayScenarioId) => Math.min(Math.max(h, 0), maxHour(s));

const INITIAL_TARGET: ModeTarget = 'A';

export const useSystemStore = create<SystemState>()((set) => ({
  sys: clone(DEFAULT_SYSTEM),
  hotelPreset: 'hotel-100',
  scenario: MODE_TARGETS[INITIAL_TARGET].scenario,
  strategy: DEFAULT_SYSTEM.controller.strategy,
  hour: MODE_TARGETS[INITIAL_TARGET].hour,
  modeTarget: INITIAL_TARGET,
  dayView: '24h',
  desiccantRegenC: 50,
  regenAir: DEFAULT_SYSTEM.desiccant.regenAir,
  presentation: false,
  scene: 0,

  setSys: (patch) =>
    set((st) => {
      const next = clone(st.sys);
      for (const k of Object.keys(patch) as (keyof SystemInputs)[]) {
        Object.assign(next[k] as object, patch[k]);
      }
      return { sys: next, hotelPreset: patch.hotel ? 'custom' : st.hotelPreset };
    }),
  setHotelPreset: (id) => set((st) => ({ sys: { ...clone(st.sys), hotel: { ...HOTEL_PRESETS[id] } }, hotelPreset: id })),
  resetSys: () => set({ sys: clone(DEFAULT_SYSTEM), hotelPreset: 'hotel-100', strategy: DEFAULT_SYSTEM.controller.strategy }),
  setModeTarget: (m) =>
    set((st) =>
      st.modeTarget === m && st.scenario === MODE_TARGETS[m].scenario && st.hour === MODE_TARGETS[m].hour
        ? st
        : { modeTarget: m, scenario: MODE_TARGETS[m].scenario, hour: MODE_TARGETS[m].hour },
    ),
  setScenario: (s) =>
    set((st) => ({ scenario: s, hour: clampHour(st.hour, s), modeTarget: 'custom', dayView: s === 'hujan-3-hari' ? '72h' : st.dayView })),
  setStrategy: (s) => set({ strategy: s }),
  // Dedupe: scroll-driven callers (pins, scrubbers) may call this every frame with the same hour.
  setHour: (h) =>
    set((st) => {
      const hour = clampHour(h, st.scenario);
      if (Math.abs(hour - st.hour) < 1e-6 && st.modeTarget === 'custom') return st;
      return { hour, modeTarget: 'custom' };
    }),
  setDayView: (v) =>
    set((st) => ({
      dayView: v,
      scenario: v === '72h' ? 'hujan-3-hari' : st.scenario === 'hujan-3-hari' ? 'terik' : st.scenario,
      hour: clampHour(st.hour, v === '72h' ? 'hujan-3-hari' : 'terik'),
    })),
  setDesiccantView: (p) =>
    set((st) => ({ desiccantRegenC: p.regenC ?? st.desiccantRegenC, regenAir: p.regenAir ?? st.regenAir })),
  setPresentation: (on) => set({ presentation: on }),
  setScene: (n) => set({ scene: Math.max(0, Math.round(n)) }),
}));
