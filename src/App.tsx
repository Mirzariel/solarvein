import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import SiteHeader from './sections/SiteHeader';
import SiteFooter from './sections/SiteFooter';
import Opening from './sections/Opening';
import Masalah from './sections/Masalah';
import Hero from './sections/Hero';
import Closing from './sections/Closing';
import { startSmoothScroll } from './motion/smoothScroll';
import { SECTION } from './sections/nav';
import PresentationRoot from './presentation/PresentationRoot';
import { LiveWhenVisible } from './state/liveScope';

/**
 * v2 order (src/sections/nav.ts is the registry): Pembuka (#awal) → 01 Masalah → 02 Sistem (+ #sistem-dalam)
 * → Jeda → 03 Cara kerja (#router) → 04 Sehari di hotel → 05 Jalur riset desikan → 06 Dampak → 07 Lab
 * → 08 Validasi → Penutup. Sections below the fold load lazily and are preloaded when the browser is idle.
 * Hero/Inside/Impact/Lab are still the v1 components until their Wave 2 owners replace them.
 */
const loadInside = () => import('./sections/Inside');
const loadInterlude = () => import('./sections/Interlude');
const loadRouter = () => import('./sections/RouterSection');
const loadDay = () => import('./sections/DayAtHotel');
const loadHumid = () => import('./sections/InterludeHumid');
const loadDesiccant = () => import('./sections/Desiccant');
const loadImpact = () => import('./sections/Impact');
const loadLab = () => import('./sections/Lab');
const loadValidation = () => import('./sections/Validation');
const Inside = lazy(loadInside);
const Interlude = lazy(loadInterlude);
const RouterSection = lazy(loadRouter);
const DayAtHotel = lazy(loadDay);
const InterludeHumid = lazy(loadHumid);
const Desiccant = lazy(loadDesiccant);
const Impact = lazy(loadImpact);
const Lab = lazy(loadLab);
const Validation = lazy(loadValidation);
const PRELOAD = [loadInside, loadInterlude, loadRouter, loadDay, loadHumid, loadDesiccant, loadImpact, loadLab, loadValidation];

/** Holds height while a chunk loads; carries the section id so anchor links never break. */
function SectionFallback({ id, label, minH }: { id: string; label: string; minH: string }) {
  return (
    <section id={id} aria-busy="true" aria-label={label} className="grid place-items-center" style={{ minHeight: minH }}>
      <p role="status" className="text-small text-ink-2">
        Memuat {label}
      </p>
    </section>
  );
}

function Lazy({ id, minH, children }: { id: string; minH: string; children: ReactNode }) {
  const label = SECTION[id]?.label ?? id;
  return (
    <ErrorBoundary label={label}>
      <Suspense fallback={<SectionFallback id={id} label={label} minH={minH} />}>
        <LiveWhenVisible>{children}</LiveWhenVisible>
      </Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  useEffect(() => startSmoothScroll(), []);

  useEffect(() => {
    const preload = () => PRELOAD.forEach((l) => void l());
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(preload, { timeout: 4000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(preload, 2500);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <ErrorBoundary label="Halaman">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2 focus:text-button focus:text-ink focus:shadow-e2"
      >
        Lompat ke konten
      </a>
      <SiteHeader />
      <PresentationRoot />
      <main id="konten" tabIndex={-1} className="outline-none">
        <ErrorBoundary label="Pembuka">
          <LiveWhenVisible>
            <Opening />
          </LiveWhenVisible>
        </ErrorBoundary>
        <ErrorBoundary label="Masalah">
          <Masalah />
        </ErrorBoundary>
        <ErrorBoundary label="Sistem">
          <Hero />
        </ErrorBoundary>
        <Lazy id="sistem-dalam" minH="clamp(1000px, calc(1000px + (100vw - 390px) * 1.6190), 2700px)">
          <Inside />
        </Lazy>
        <Lazy id="jeda" minH="clamp(743px, calc(743px + (100vw - 390px) * 0.0467), 792px)">
          <Interlude />
        </Lazy>
        <Lazy id="router" minH="clamp(1886px, calc(1886px + (100vw - 390px) * 1.2667), 3216px)">
          <RouterSection />
        </Lazy>
        <Lazy id="sehari" minH="clamp(1426px, calc(1936px + (100vw - 390px) * -0.4857), 1936px)">
          <DayAtHotel />
        </Lazy>
        <Lazy id="jeda-lembap" minH="clamp(600px, calc(600px + (100vw - 390px) * 0.0286), 630px)">
          <InterludeHumid />
        </Lazy>
        <Lazy id="desikan" minH="clamp(1146px, calc(1174px + (100vw - 390px) * -0.0267), 1174px)">
          <Desiccant />
        </Lazy>
        <Lazy id="dampak" minH="clamp(1993px, calc(2367px + (100vw - 390px) * -0.3562), 2367px)">
          <Impact />
        </Lazy>
        <Lazy id="lab" minH="clamp(4062px, calc(5831px + (100vw - 390px) * -1.6848), 5831px)">
          <Lab />
        </Lazy>
        <Lazy id="validasi" minH="clamp(1694px, calc(2406px + (100vw - 390px) * -0.6781), 2406px)">
          <Validation />
        </Lazy>
        <ErrorBoundary label="Penutup">
          <Closing />
        </ErrorBoundary>
      </main>
      <SiteFooter />
    </ErrorBoundary>
  );
}
