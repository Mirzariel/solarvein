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
const loadDesiccant = () => import('./sections/Desiccant');
const loadImpact = () => import('./sections/Impact');
const loadLab = () => import('./sections/Lab');
const loadValidation = () => import('./sections/Validation');
const Inside = lazy(loadInside);
const Interlude = lazy(loadInterlude);
const RouterSection = lazy(loadRouter);
const DayAtHotel = lazy(loadDay);
const Desiccant = lazy(loadDesiccant);
const Impact = lazy(loadImpact);
const Lab = lazy(loadLab);
const Validation = lazy(loadValidation);
const PRELOAD = [loadInside, loadInterlude, loadRouter, loadDay, loadDesiccant, loadImpact, loadLab, loadValidation];

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
      <Suspense fallback={<SectionFallback id={id} label={label} minH={minH} />}>{children}</Suspense>
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
      <main id="konten" tabIndex={-1} className="outline-none">
        <ErrorBoundary label="Pembuka">
          <Opening />
        </ErrorBoundary>
        <ErrorBoundary label="Masalah">
          <Masalah />
        </ErrorBoundary>
        <ErrorBoundary label="Sistem">
          <Hero />
        </ErrorBoundary>
        <Lazy id="sistem-dalam" minH="80svh">
          <Inside />
        </Lazy>
        <Lazy id="jeda" minH="100svh">
          <Interlude />
        </Lazy>
        <Lazy id="router" minH="100svh">
          <RouterSection />
        </Lazy>
        <Lazy id="sehari" minH="90svh">
          <DayAtHotel />
        </Lazy>
        <Lazy id="desikan" minH="80svh">
          <Desiccant />
        </Lazy>
        <Lazy id="dampak" minH="80svh">
          <Impact />
        </Lazy>
        <Lazy id="lab" minH="80svh">
          <Lab />
        </Lazy>
        <Lazy id="validasi" minH="60svh">
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
