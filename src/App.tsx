import { Suspense, lazy, useEffect, type ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import SiteHeader from './sections/SiteHeader';
import SiteFooter from './sections/SiteFooter';
import Opening from './sections/Opening';
import Hero from './sections/Hero';
import Closing from './sections/Closing';
import { startSmoothScroll } from './motion/smoothScroll';

/**
 * Urutan: Opening (#awal) → Hero (#pengalaman) → Inside (#di-dalam) → Interlude (jeda video) → Impact (#dampak) → Lab (#lab)
 * → Comparison (#perbandingan) → Closing (#penutup) → Footer.
 * Bagian di bawah lipatan dimuat malas dan dipra-muat saat peramban menganggur, supaya tautan jangkar tetap halus.
 */
const loadInside = () => import('./sections/Inside');
const loadInterlude = () => import('./sections/Interlude');
const loadImpact = () => import('./sections/Impact');
const loadLab = () => import('./sections/Lab');
const loadComparison = () => import('./sections/Comparison');
const Inside = lazy(loadInside);
const Interlude = lazy(loadInterlude);
const Impact = lazy(loadImpact);
const Lab = lazy(loadLab);
const Comparison = lazy(loadComparison);

/** Menahan tinggi selagi potongan dimuat; membawa id bagian agar tautan jangkar tidak patah. */
function SectionFallback({ id, label, minH }: { id: string; label: string; minH: string }) {
  return (
    <section id={id} aria-busy="true" aria-label={label} className="grid place-items-center" style={{ minHeight: minH }}>
      <p role="status" className="text-small text-ink-2">
        Memuat {label}
      </p>
    </section>
  );
}

function Lazy({ id, label, minH, children }: { id: string; label: string; minH: string; children: ReactNode }) {
  return (
    <ErrorBoundary label={label}>
      <Suspense fallback={<SectionFallback id={id} label={label} minH={minH} />}>{children}</Suspense>
    </ErrorBoundary>
  );
}

export default function App() {
  useEffect(() => startSmoothScroll(), []);

  // Pra-muat potongan di bawah lipatan setelah halaman pertama tenang (tidak bersaing dengan model 3D di Pengalaman).
  useEffect(() => {
    const preload = () => {
      void loadInside();
      void loadInterlude();
      void loadImpact();
      void loadLab();
      void loadComparison();
    };
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
        <ErrorBoundary label="Model 3D">
          <Hero />
        </ErrorBoundary>
        <Lazy id="di-dalam" label="Di dalam SolarVein" minH="80svh">
          <Inside />
        </Lazy>
        <Lazy id="jeda" label="Jeda" minH="100svh">
          <Interlude />
        </Lazy>
        <Lazy id="dampak" label="Dampak" minH="80svh">
          <Impact />
        </Lazy>
        <Lazy id="lab" label="Lab rekayasa" minH="80svh">
          <Lab />
        </Lazy>
        <Lazy id="perbandingan" label="Perbandingan" minH="60svh">
          <Comparison />
        </Lazy>
        <ErrorBoundary label="Penutup">
          <Closing />
        </ErrorBoundary>
      </main>
      <SiteFooter />
    </ErrorBoundary>
  );
}
