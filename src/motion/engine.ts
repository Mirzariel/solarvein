/**
 * The app-wide visual clock (singleton), now bound to the v2 system store by an external subscription (the store
 * needs no change). Components only read `weather.frame()` / the hooks; this is a deliberate exception to "views
 * never call the sim directly": the engine calls simulate() on every animation step.
 *
 * The v1 `createWeatherEngine` (weather.ts) is kept for its tests and the v1 helpers until the cutover; nothing
 * mounts it any more, so the v1 Cerah / Hujan switch no longer drives the stage.
 */
import { bindSystemEngine, targetFromState } from '../state/systemEngineBinding';
import { useSystemStore } from '../state/system';
import { createSystemEngine } from './systemEngine';

export const weather = createSystemEngine(targetFromState(useSystemStore.getState()));

const unbind = bindSystemEngine(weather, useSystemStore);

const onVisibility = (): void => {
  if (typeof document !== 'undefined' && !document.hidden) weather.snap();
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  const st = useSystemStore.getState;
  /** Dev-only handle for screenshots and the console: `__sv.setModeTarget('C')`, `__sv.setHour(7.5)`. */
  (window as unknown as { __sv?: unknown }).__sv = {
    engine: weather,
    store: useSystemStore,
    frame: () => weather.frame(),
    setModeTarget: (m: 'A' | 'B' | 'C') => st().setModeTarget(m),
    setScenario: (s: Parameters<ReturnType<typeof st>['setScenario']>[0]) => st().setScenario(s),
    setStrategy: (s: Parameters<ReturnType<typeof st>['setStrategy']>[0]) => st().setStrategy(s),
    setHour: (h: number) => st().setHour(h),
  };
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbind();
    document.removeEventListener('visibilitychange', onVisibility);
    weather.dispose();
  });
}
