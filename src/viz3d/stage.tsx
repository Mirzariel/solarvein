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
 *  - `mood` is the studio light target (sun 0..1, humid 0..1, night 0..1; `rain` is retired and always 0). Left alone,
 *    the studio derives it from the committed sim result; set `mood.current.driven = true` and write it every
 *    frame to take over (AmbientMood does, from `frame.climate`).
 *  - `framing` (0 = panel .. 1 = hotel roof) is the camera framing; it DEFAULTS to 0 = 'panel' (the collector fills
 *    ~70 % of the stage width). Sections drive it through the store:
 *      `setFraming('panel' | 'hotel')`  exact poses;
 *      `setFraming(p)` with a NUMBER = scroll progress 0..1 of the pull-back scene. The pull-back is held back: the
 *      stored framing is `framingFromProgress(p)` (smootherstep over p = 0.75..1), so the stage opens on the panel
 *      and only retreats to the hotel roof in the last quarter of the scroll window;
 *      `setFramingRaw(t)` sets the 0..1 blend directly (no delay).
 *    The camera springs to the pose (reduced motion: snaps); an A/B/C mode switch never touches it.
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
/** 'roof' = hotel roof (graphite plinth, parapet, plant room, ghost neighbour modules; experience stage); 'none' = clean (inspect). */
export type StageContextKind = 'roof' | 'none';
export type LayerVisibility = Record<LayerId, boolean>;

/** Camera framing: 'panel' = the hero collector (~70 % of the stage width), 'hotel' = pulled back to the roof. */
export type FramingName = 'panel' | 'hotel';

/** Scroll progress at which the pull-back starts (0.75 = the last quarter of the scroll window). */
export const FRAMING_DELAY = 0.75;
/** Scroll progress 0..1 -> stored framing 0..1: stays on 'panel' until FRAMING_DELAY, then smootherstep to 'hotel'. */
export function framingFromProgress(p: number): number {
  const t = Math.min(1, Math.max(0, (p - FRAMING_DELAY) / (1 - FRAMING_DELAY)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export interface StageState {
  /** Camera framing 0 = panel .. 1 = hotel roof (continuous so a scroll scene can scrub it). */
  framing: number;
  exploded: boolean;
  crossSection: boolean;
  layerVisibility: LayerVisibility;
  /** Selected part (inspect) - dims every other part. */
  focusPart: PartId | null;
  /** Pointer-hovered part (inspect). */
  hoverPart: PartId | null;
}

export interface StageActions {
  /** 'panel' | 'hotel' | scroll progress 0..1 (held back, see the file header). */
  setFraming: (v: FramingName | number) => void;
  /** Direct 0..1 blend between panel and hotel (no scroll delay). */
  setFramingRaw: (t: number) => void;
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
    framing: 0,
    exploded: defaults.exploded ?? false,
    crossSection: false,
    layerVisibility: allVisible(),
    focusPart: defaults.focusPart ?? null,
    hoverPart: null,
    setFraming: (v) => {
      const framing = v === 'panel' ? 0 : v === 'hotel' ? 1 : framingFromProgress(v);
      set((s) => (s.framing === framing ? s : { framing }));
    },
    setFramingRaw: (t) => {
      const framing = Math.min(1, Math.max(0, t));
      set((s) => (s.framing === framing ? s : { framing }));
    },
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
  /** Retired in v2 (no wet glass): always 0. Kept so older readers still compile. */
  rain: number;
  /** 0 dry air .. 1 saturated: flattens the light a little. */
  humid: number;
  /** 0 day .. 1 night: dims key, rim and exposure. */
  night: number;
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
