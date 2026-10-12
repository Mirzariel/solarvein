/**
 * Per-stage state + context. Two WebGL stages can live on the page (01 experience, 02 inspect);
 * everything that used to be global viewer state (explode, cross-section, layer visibility, focus)
 * is stage-local here, so selecting a part in 02 never dims the hero model.
 *
 *  - `createStageStore()` is a vanilla zustand store (no React re-render per frame; DOM chrome
 *    subscribes with `useStageState`).
 *  - `StageContext` is bridged into the R3F <Canvas> (r3f v9 bridges React contexts).
 *  - `explode` is a plain ref-like object advanced once per frame by `StageDriver`; the Motion
 *    Director's effects read it through `useExplodeFactor()`.
 *  - `mood` is the studio light target (0..1 sun, 0..1 rain). Left alone, the studio derives it from the
 *    committed sim result; set `mood.current.driven = true` and write sun/rain every frame to take over.
 *  - `projection` is the sink that receives screen positions of the 3D anchors each rendered frame
 *    (annotation overlays update their DOM transforms from it - no React renders).
 */
import { createContext, useContext, type MutableRefObject } from 'react';
import { useStore as useZustand } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { LAYERS, type LayerId } from './dims';
import type { PartId } from './parts';
import type { ViewerApi } from './viewerApi';

export type StageVariant = 'experience' | 'inspect';
/** 'transparent' = alpha canvas (no sweep, no haze) so the stage can float over photography. */
export type StageBackground = 'graphite' | 'transparent';
/** 'roof' = concrete roof slab with rails anchored to it (scale cue, experience stage); 'none' = clean (inspect). */
export type StageContextKind = 'roof' | 'none';
export type LayerVisibility = Record<LayerId, boolean>;

export interface StageState {
  exploded: boolean;
  crossSection: boolean;
  layerVisibility: LayerVisibility;
  /** Selected part (inspect) - dims every other part. */
  focusPart: PartId | null;
  /** Pointer-hovered part (inspect). */
  hoverPart: PartId | null;
}

export interface StageActions {
  setExploded: (v: boolean) => void;
  toggleExploded: () => void;
  setCrossSection: (v: boolean) => void;
  toggleCrossSection: () => void;
  toggleLayer: (id: LayerId) => void;
  showAllLayers: () => void;
  setFocusPart: (id: PartId | null) => void;
  setHoverPart: (id: PartId | null) => void;
}

export type StageStore = StoreApi<StageState & StageActions>;

const allVisible = (): LayerVisibility =>
  Object.fromEntries(LAYERS.map((l) => [l.id, true])) as LayerVisibility;

export interface StageDefaults {
  exploded?: boolean;
  focusPart?: PartId | null;
}

export function createStageStore(defaults: StageDefaults = {}): StageStore {
  return createStore<StageState & StageActions>()((set) => ({
    exploded: defaults.exploded ?? false,
    crossSection: false,
    layerVisibility: allVisible(),
    focusPart: defaults.focusPart ?? null,
    hoverPart: null,
    setExploded: (exploded) => set({ exploded }),
    toggleExploded: () => set((s) => ({ exploded: !s.exploded })),
    setCrossSection: (crossSection) => set({ crossSection }),
    toggleCrossSection: () => set((s) => ({ crossSection: !s.crossSection })),
    toggleLayer: (id) => set((s) => ({ layerVisibility: { ...s.layerVisibility, [id]: !s.layerVisibility[id] } })),
    showAllLayers: () => set({ layerVisibility: allVisible() }),
    setFocusPart: (focusPart) => set({ focusPart }),
    setHoverPart: (hoverPart) => set((s) => (s.hoverPart === hoverPart ? s : { hoverPart })),
  }));
}

export function useStageState<T>(store: StageStore, selector: (s: StageState & StageActions) => T): T {
  return useZustand(store, selector);
}

export interface ProjectedAnchor {
  id: string;
  /** Pixels inside the canvas. */
  x: number;
  y: number;
  /** In front of the camera and inside the clip volume. */
  visible: boolean;
}

export type ProjectionSink = (points: readonly ProjectedAnchor[], width: number, height: number) => void;

export interface MoodState {
  /** 0 overcast .. 1 full sun. */
  sun: number;
  /** 0 dry .. 1 heavy rain. */
  rain: number;
  /** true = somebody else (Motion engine) writes sun/rain every frame; the studio only applies them. */
  driven: boolean;
}

export interface ExplodeRef {
  current: number;
}

export interface StageCtx {
  variant: StageVariant;
  background: StageBackground;
  context: StageContextKind;
  store: StageStore;
  /** performance.now() until which the render loop must run uncapped (camera / explode / pointer activity). */
  boost: { current: number };
  explode: ExplodeRef;
  mood: MutableRefObject<MoodState>;
  projection: MutableRefObject<ProjectionSink | null>;
  api: MutableRefObject<ViewerApi | null>;
  /** Filled by the canvas: ask for a frame (safe to call from DOM code). */
  wake: MutableRefObject<(() => void) | null>;
}

export const StageContext = createContext<StageCtx | null>(null);

export function useStage(): StageCtx {
  const c = useContext(StageContext);
  if (!c) throw new Error('useStage must be used inside <CollectorStage>');
  return c;
}

export function useStageOptional(): StageCtx | null {
  return useContext(StageContext);
}
