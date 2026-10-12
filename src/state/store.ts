/**
 * Global UI/state store (zustand v5).
 *
 * Owns ONLY inputs + view state. Derived physics lives in `src/sim` and is
 * exposed through the memoised hooks in `./selectors.ts`.
 */
import { create } from 'zustand';
import {
  CARBON_HOURS_GUIDANCE,
  DEFAULT_CARBON,
  PRESETS,
  clampInputs,
  type CarbonAssumptions,
  type SimInputs,
} from '../sim';
import { LAYERS, type LayerId } from '../viz3d/dims';

export type AppMode = 'sunny' | 'rainy' | 'lab';
export type ComparisonScenario = 'current' | 'sunny' | 'rainy';
/** Skenario cuaca untuk pemindai dampak (Impact): preset saja, bukan masukan Lab. */
export type ImpactScenario = 'sunny' | 'rainy';

/** Label UI untuk mode: 'lab' ditampilkan sebagai "Kustom" (keadaan pasif, bukan tombol). */
export const MODE_LABEL: Record<AppMode, string> = { sunny: 'Cerah', rainy: 'Hujan', lab: 'Kustom' };

/** Skala jumlah atap: slider memakai log10(N), default 10.000 atap. */
export const IMPACT_LOG_DEFAULT = 4;
/** Panel per atap awal (≈ 6,8 m², atap rumah dengan pemanas air). */
export const IMPACT_PANELS_DEFAULT = 4;
/** Porsi jam dengan beban panas awal (rumah biasa 20–30 %, hotel/kos/binatu mendekati 100 %). */
export const IMPACT_LOAD_DEFAULT = 0.5;
/** Jam setara per tahun awal untuk tiap skenario (CARBON_HOURS_GUIDANCE.typical). */
export const IMPACT_HOURS_DEFAULT: Record<ImpactScenario, number> = {
  sunny: CARBON_HOURS_GUIDANCE.sunny.typical,
  rainy: CARBON_HOURS_GUIDANCE.rainyHeavy.typical,
};

export type LayerVisibility = Record<LayerId, boolean>;

export const allLayersVisible = (): LayerVisibility =>
  Object.fromEntries(LAYERS.map((l) => [l.id, true])) as LayerVisibility;

/** Viewer defaults (also used by `reset`). */
export const VIEWER_DEFAULTS = {
  exploded: false,
  crossSection: false,
  showFlow: true,
  showHeatArrows: true,
  autoRotate: false,
} as const;

export interface ViewerState {
  exploded: boolean;
  crossSection: boolean;
  layerVisibility: LayerVisibility;
  showFlow: boolean;
  showHeatArrows: boolean;
  autoRotate: boolean;
  /** Layer currently inspected / highlighted (null = none). */
  focusLayer: LayerId | null;
}

export interface AppState extends ViewerState {
  mode: AppMode;
  /** Always clamped. Replaced immutably (reference identity = change signal). */
  inputs: SimInputs;
  carbon: CarbonAssumptions;
  comparisonScenario: ComparisonScenario;
  /** Pemindai dampak: skenario, log10(jumlah atap), jam setara per skenario. */
  impactScenario: ImpactScenario;
  impactLogRoofs: number;
  /** Jumlah panel per atap (1–20). */
  impactPanels: number;
  /** Porsi jam setara dengan beban panas (0–1), skenario Cerah. Bawaan 50 %: bukan 100 %, jam tanpa beban tidak netral. */
  impactLoadFraction: number;
  impactHours: Record<ImpactScenario, number>;

  // -- input actions --
  /** 'sunny'/'rainy' load that preset; 'lab' keeps the current inputs. */
  setMode: (mode: AppMode) => void;
  /** Clamps; flips to 'lab' when the value departs from the active preset. */
  setInput: <K extends keyof SimInputs>(key: K, value: SimInputs[K]) => void;
  /** Patch several inputs at once (same lab-switch rule). */
  setInputs: (patch: Partial<SimInputs>) => void;
  /** Re-load the preset of the current mode (no-op in 'lab'). */
  resetInputsToMode: () => void;
  /** Everything back to defaults: sunny preset, viewer, carbon, scenario. */
  reset: () => void;

  // -- viewer actions --
  setExploded: (v: boolean) => void;
  toggleExploded: () => void;
  setCrossSection: (v: boolean) => void;
  toggleCrossSection: () => void;
  setLayerVisible: (id: LayerId, visible: boolean) => void;
  toggleLayer: (id: LayerId) => void;
  showAllLayers: () => void;
  setShowFlow: (v: boolean) => void;
  toggleShowFlow: () => void;
  setShowHeatArrows: (v: boolean) => void;
  toggleShowHeatArrows: () => void;
  setAutoRotate: (v: boolean) => void;
  toggleAutoRotate: () => void;
  setFocusLayer: (id: LayerId | null) => void;
  resetViewer: () => void;

  // -- carbon / comparison --
  setCarbon: (partial: Partial<CarbonAssumptions>) => void;
  resetCarbon: () => void;
  setComparisonScenario: (s: ComparisonScenario) => void;
  setImpactScenario: (s: ImpactScenario) => void;
  setImpactLogRoofs: (v: number) => void;
  setImpactPanels: (n: number) => void;
  setImpactLoadFraction: (f: number) => void;
  setImpactHours: (scenario: ImpactScenario, hours: number) => void;
}

const sameInputs = (a: SimInputs, b: SimInputs): boolean =>
  (Object.keys(a) as (keyof SimInputs)[]).every((k) => a[k] === b[k]);

const viewerDefaults = (): ViewerState => ({
  ...VIEWER_DEFAULTS,
  layerVisibility: allLayersVisible(),
  focusLayer: null,
});

/** Decide the mode after inputs changed: leave a preset as soon as inputs depart from it. */
const modeAfterEdit = (mode: AppMode, next: SimInputs): AppMode => {
  if (mode === 'lab') return 'lab';
  return sameInputs(next, clampInputs(PRESETS[mode])) ? mode : 'lab';
};

export const useStore = create<AppState>()((set, get) => ({
  mode: 'sunny',
  inputs: clampInputs(PRESETS.sunny),
  carbon: { ...DEFAULT_CARBON },
  comparisonScenario: 'current',
  impactScenario: 'sunny',
  impactLogRoofs: IMPACT_LOG_DEFAULT,
  impactPanels: IMPACT_PANELS_DEFAULT,
  impactLoadFraction: IMPACT_LOAD_DEFAULT,
  impactHours: { ...IMPACT_HOURS_DEFAULT },
  ...viewerDefaults(),

  setMode: (mode) =>
    set((s) => {
      if (mode === 'lab') return s.mode === 'lab' ? s : { mode: 'lab' };
      return { mode, inputs: clampInputs(PRESETS[mode]) };
    }),

  setInput: (key, value) =>
    set((s) => {
      const next = clampInputs({ ...s.inputs, [key]: value });
      if (next[key] === s.inputs[key]) return s; // nothing changed (e.g. clamped to the same value)
      return { inputs: next, mode: modeAfterEdit(s.mode, next) };
    }),

  setInputs: (patch) =>
    set((s) => {
      const next = clampInputs({ ...s.inputs, ...patch });
      if (sameInputs(next, s.inputs)) return s;
      return { inputs: next, mode: modeAfterEdit(s.mode, next) };
    }),

  resetInputsToMode: () => {
    const { mode } = get();
    if (mode === 'lab') return;
    set({ inputs: clampInputs(PRESETS[mode]) });
  },

  reset: () =>
    set({
      mode: 'sunny',
      inputs: clampInputs(PRESETS.sunny),
      carbon: { ...DEFAULT_CARBON },
      comparisonScenario: 'current',
      impactScenario: 'sunny',
      impactLogRoofs: IMPACT_LOG_DEFAULT,
      impactPanels: IMPACT_PANELS_DEFAULT,
      impactLoadFraction: IMPACT_LOAD_DEFAULT,
      impactHours: { ...IMPACT_HOURS_DEFAULT },
      ...viewerDefaults(),
    }),

  setExploded: (exploded) => set({ exploded }),
  toggleExploded: () => set((s) => ({ exploded: !s.exploded })),
  setCrossSection: (crossSection) => set({ crossSection }),
  toggleCrossSection: () => set((s) => ({ crossSection: !s.crossSection })),
  setLayerVisible: (id, visible) =>
    set((s) => ({ layerVisibility: { ...s.layerVisibility, [id]: visible } })),
  toggleLayer: (id) =>
    set((s) => ({ layerVisibility: { ...s.layerVisibility, [id]: !s.layerVisibility[id] } })),
  showAllLayers: () => set({ layerVisibility: allLayersVisible() }),
  setShowFlow: (showFlow) => set({ showFlow }),
  toggleShowFlow: () => set((s) => ({ showFlow: !s.showFlow })),
  setShowHeatArrows: (showHeatArrows) => set({ showHeatArrows }),
  toggleShowHeatArrows: () => set((s) => ({ showHeatArrows: !s.showHeatArrows })),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setFocusLayer: (focusLayer) => set({ focusLayer }),
  resetViewer: () => set(viewerDefaults()),

  setCarbon: (partial) => set((s) => ({ carbon: { ...s.carbon, ...partial } })),
  resetCarbon: () => set({ carbon: { ...DEFAULT_CARBON } }),
  setComparisonScenario: (comparisonScenario) => set({ comparisonScenario }),
  setImpactScenario: (impactScenario) => set({ impactScenario }),
  setImpactLogRoofs: (v) => set({ impactLogRoofs: Math.min(5, Math.max(0, v)) }),
  setImpactLoadFraction: (f) => set({ impactLoadFraction: Math.min(1, Math.max(0, f)) }),
  setImpactPanels: (n) => set({ impactPanels: Math.min(20, Math.max(1, Math.round(n))) }),
  setImpactHours: (scenario, hours) =>
    set((s) => ({ impactHours: { ...s.impactHours, [scenario]: Math.max(0, hours) } })),
}));
