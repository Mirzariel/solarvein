/**
 * The app-wide weather engine, bound to the store by an external subscription (the store needs no change).
 * Note: this is a deliberate exception to "views never call the sim directly": the engine calls simulate()
 * on every animation step; components only read `weather.frame()` / the hooks.
 */
import { useStore } from '../state/store';
import { createWeatherEngine } from './weather';

export const weather = createWeatherEngine(useStore.getState().inputs);

const unsubscribe = useStore.subscribe((s, prev) => {
  if (s.inputs !== prev.inputs) weather.setTarget(s.inputs);
});

const onVisibility = (): void => {
  if (typeof document !== 'undefined' && !document.hidden) weather.setTarget(useStore.getState().inputs, { instant: true });
};
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);

if (import.meta.env?.DEV && typeof window !== 'undefined') {
  (window as unknown as { __svWeather?: unknown }).__svWeather = weather;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unsubscribe();
    document.removeEventListener('visibilitychange', onVisibility);
    weather.dispose();
  });
}
