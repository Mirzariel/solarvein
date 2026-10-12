import { useEffect, useRef } from 'react';
import { weather } from './engine';
import { clamp01 } from './spring';
import type { VisualFrame } from './weather';

/**
 * The weather outside the window: a sunny and a rainy sky gradient (design tokens `sky-sunny`, `sky-rainy`) stacked,
 * cross-faded by the VISUAL frame (never by a mode flag), so it moves with the same staggered interpolation as the
 * lighting in the 3D stage and the numbers.
 *
 *   t   = clamp((G - 120) / 780)               -> opacity of the sunny layer (Cerah t = 1, Hujan t = 0)
 *   sat = 1 - 0.5 * clamp(rain / 30)           -> the rainy layer thins toward paper as rain rises (0.75 at 15 mm/h)
 *
 * Writes `style.opacity` straight to two DOM nodes from the engine subscription: no React render per frame.
 * Decorative (aria-hidden). Place as the first, absolutely positioned child of a `relative` band.
 */
export function WeatherSky({ className }: { className?: string }) {
  const sun = useRef<HTMLDivElement>(null);
  const rain = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const apply = (f: VisualFrame): void => {
      const t = clamp01((f.inputs.irradiance - 120) / 780);
      const sat = 1 - 0.5 * clamp01(f.inputs.rainMmH / 30);
      if (sun.current) sun.current.style.opacity = t.toFixed(3);
      if (rain.current) rain.current.style.opacity = sat.toFixed(3);
    };
    apply(weather.frame());
    return weather.subscribe(apply, 0);
  }, []);

  return (
    <div aria-hidden="true" className={className}>
      <div ref={rain} className="sky-rainy absolute inset-0" />
      <div ref={sun} className="sky-sunny absolute inset-0" />
    </div>
  );
}
