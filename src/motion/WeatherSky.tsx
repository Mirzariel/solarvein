import { useEffect, useRef } from 'react';
import { weather } from './engine';
import { skyLevels } from './sky';
import type { VisualFrame } from './weather';

/**
 * The weather outside the window, from the v2 VISUAL frame (never from a mode flag), so it moves with the same
 * staggered interpolation as the 3D stage and the numbers: dawn glow, clear noon, humid grey, rainy grey, night.
 * Layers and their opacity rules: `sky.ts`. Colours: the `sky-sunny` / `sky-rainy` design tokens and `ink` only.
 *
 * Writes `style.opacity` straight to four DOM nodes from the engine subscription: no React render per frame.
 * Decorative (aria-hidden). Place as the first, absolutely positioned child of a `relative` band.
 */
const DAWN_BG = 'linear-gradient(0deg, var(--sky-sunny-0) 0%, var(--sky-sunny-1) 38%, transparent 88%)';

export function WeatherSky({ className }: { className?: string }) {
  const rain = useRef<HTMLDivElement>(null);
  const dawn = useRef<HTMLDivElement>(null);
  const sun = useRef<HTMLDivElement>(null);
  const night = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (f: VisualFrame): void => {
      const c = f.climate;
      const L = skyLevels(f.inputs.irradiance, f.inputs.rainMmH, c ? c.rh : 0.6, f.hourOfDay ?? 12);
      if (rain.current) rain.current.style.opacity = L.rain.toFixed(3);
      if (dawn.current) dawn.current.style.opacity = L.dawn.toFixed(3);
      if (sun.current) sun.current.style.opacity = L.sun.toFixed(3);
      if (night.current) night.current.style.opacity = L.night.toFixed(3);
    };
    apply(weather.frame());
    return weather.subscribe(apply, 0);
  }, []);

  return (
    <div aria-hidden="true" className={className}>
      <div ref={rain} className="sky-rainy absolute inset-0" />
      <div ref={dawn} className="absolute inset-0 opacity-0" style={{ backgroundImage: DAWN_BG }} />
      <div ref={sun} className="sky-sunny absolute inset-0" />
      <div ref={night} className="absolute inset-0 bg-ink opacity-0" />
    </div>
  );
}
