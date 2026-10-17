import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { flag } from '../presentation/appMode';
import { DayFigure } from './DayFigure';
import { DesiccantFigure } from './DesiccantFigure';
import { KpiFigure } from './KpiFigure';
import { LegendFigure } from './LegendFigure';
import { RouterFigure } from './RouterFigure';
import './export.css';

/**
 * `?static=1` makes every component see `prefers-reduced-motion: reduce` (no scroll-in animations, bars fully built).
 * Runs at import, before the first render; this module is only loaded in export mode.
 */
function forceReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  const real = window.matchMedia.bind(window);
  window.matchMedia = (query: string): MediaQueryList => {
    if (!/prefers-reduced-motion:\s*reduce/.test(query)) return real(query);
    return {
      matches: true,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList;
  };
}
if (flag(location.search, 'static')) forceReducedMotion();

/** Every exportable figure, in page order. Ids are the file names the script writes. */
export const EXPORTS: readonly { id: string; label: string; render: () => ReactNode }[] = [
  { id: 'router-diagram', label: 'Router, 16:9', render: () => <RouterFigure id="router-diagram" ratio="16x9" /> },
  { id: 'router-diagram-4x5', label: 'Router, 4:5', render: () => <RouterFigure id="router-diagram-4x5" ratio="4x5" /> },
  { id: 'kpi-baselines', label: 'CO₂e bersih vs B1–B4, 16:9', render: () => <KpiFigure id="kpi-baselines" ratio="16x9" /> },
  { id: 'kpi-baselines-4x5', label: 'CO₂e bersih vs B1–B4, 4:5', render: () => <KpiFigure id="kpi-baselines-4x5" ratio="4x5" /> },
  { id: 'day-chart', label: 'Hari terik, 16:9', render: () => <DayFigure id="day-chart" scenario="terik" ratio="16x9" /> },
  { id: 'day-chart-4x5', label: 'Hari terik, 4:5', render: () => <DayFigure id="day-chart-4x5" scenario="terik" ratio="4x5" /> },
  { id: 'day-chart-hujan-3-hari', label: 'Tiga hari hujan, 16:9', render: () => <DayFigure id="day-chart-hujan-3-hari" scenario="hujan-3-hari" ratio="16x9" /> },
  { id: 'desiccant-chart', label: 'Desikan, 16:9', render: () => <DesiccantFigure id="desiccant-chart" ratio="16x9" /> },
  { id: 'desiccant-chart-4x5', label: 'Desikan, 4:5', render: () => <DesiccantFigure id="desiccant-chart-4x5" ratio="4x5" /> },
  { id: 'evidence-legend', label: 'Penanda bukti, 16:9', render: () => <LegendFigure id="evidence-legend" ratio="16x9" /> },
  { id: 'evidence-legend-4x5', label: 'Penanda bukti, 4:5', render: () => <LegendFigure id="evidence-legend-4x5" ratio="4x5" /> },
];

/**
 * Figure export page (`?export=1&static=1`). No header, Lenis or 3D canvas. Each figure is a fixed-size light-paper
 * frame marked `[data-export="<id>"]`; scripts/export/figures.mjs captures them. Optional `&only=id1,id2` filters.
 */
export default function ExportPage() {
  const root = useRef<HTMLDivElement>(null);
  const only = new URLSearchParams(location.search).get('only')?.split(',').map((s) => s.trim()).filter(Boolean);
  const list = EXPORTS.filter((e) => !only || only.includes(e.id));

  // Reused section figures carry their own data-export (Waterfall: "kpi-baselines"): keep only the frame's, so each id is unique.
  useLayoutEffect(() => {
    root.current?.querySelectorAll<HTMLElement>('[data-export] [data-export]').forEach((el) => {
      el.setAttribute('data-export-inner', el.getAttribute('data-export') ?? '');
      el.removeAttribute('data-export');
    });
  });

  return (
    <div ref={root} className="export-root" data-export-ready="true">
      <main className="export-stack">
        {list.map((e) => (
          <div key={e.id}>
            <p className="export-label">
              {e.id} · {e.label}
            </p>
            {e.render()}
          </div>
        ))}
      </main>
    </div>
  );
}
