import gsap from 'gsap';
import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { useMediaQuery, useReducedMotion } from '../hooks';
import { ScrollTrigger, WeatherSky, useScrollScene } from '../motion';
import { LABELS, MODE_TARGETS, type ModeTarget } from '../sim/system';
import { useStep } from '../state/systemSelectors';
import { useSystemStore } from '../state/system';
import { SISTEM } from '../content/sistem';
import { createStageStore } from '../viz3d/stage';
import { Evidence, InfoTip, SectionHeader, SegmentedControl, type SegmentedOption } from '../ui';
import { DetailPanel } from './hero/DetailPanel';
import { ElectricReadout, HeatReadout } from './hero/LiveReadout';
import { SplitLine } from './hero/SplitLine';
import { Statement } from './hero/Statement';
import { describeStep } from './hero/regime';
import { useAnnouncement } from './hero/useAnnouncement';

// three + r3f load on demand; the switch, the statement and the readouts render immediately.
const CollectorStage = lazy(() => import('../viz3d/CollectorStage'));

/** A / B / C are CONDITIONS (scenario + time); the labels name them, the controller computes the real mode. */
const TARGETS = Object.keys(MODE_TARGETS) as ModeTarget[];
const OPTIONS: readonly SegmentedOption<ModeTarget>[] = TARGETS.map((k) => ({ value: k, label: LABELS.modeTarget[k] }));
/** Narrow screens: the first word of the same label (full label stays in the tooltip / accessible name). */
const OPTIONS_SHORT: readonly SegmentedOption<ModeTarget>[] = TARGETS.map((k) => ({
  value: k,
  label: LABELS.modeTarget[k].split(/[ &]/)[0] ?? LABELS.modeTarget[k],
  description: LABELS.modeTarget[k],
}));

/** While the 3D chunk loads, show a still rendered from the same model (public/images/renders) instead of an empty box. */
function StageFallback() {
  return (
    <div role="status" className="relative h-full w-full overflow-hidden bg-stage-0">
      <img
        src="/images/renders/hero-golden-1600.webp"
        srcSet="/images/renders/hero-golden-960.webp 960w, /images/renders/hero-golden-1600.webp 1600w, /images/renders/hero-golden-2400.webp 2400w"
        sizes="(min-width: 1280px) 1280px, 100vw"
        alt=""
        className="absolute inset-0 h-full w-full object-cover opacity-80"
        decoding="async"
      />
      <span className="absolute bottom-4 left-4 rounded-sm bg-stage-0/70 px-3 py-1.5 text-small text-stage-ink-2">Memuat model 3D</span>
    </div>
  );
}

/**
 * Screen-reader announcer, a leaf of its own: it speaks the COMPUTED mode and reason when either changes (never per
 * tick, never for numbers) and keeps Hero and the 3D stage from re-rendering with the step.
 */
function Announcer() {
  const s = describeStep(useStep());
  const spoken = useMemo(() => `${s.pill}. ${s.headline}`, [s.pill, s.headline]);
  const announcement = useAnnouncement(s.key, spoken);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}

/** The A/B/C condition switch. 'custom' (time or scenario changed elsewhere) shows no selection. */
function ModeSwitch({ wide }: { wide: boolean }) {
  const target = useSystemStore((s) => s.modeTarget);
  const setModeTarget = useSystemStore((s) => s.setModeTarget);
  const custom = target === 'custom';
  const sm = useMediaQuery('(min-width: 640px)', true);
  const tone = wide ? 'stage' : 'page';
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SegmentedControl
        ariaLabel={SISTEM.switchLabel}
        options={sm ? OPTIONS : OPTIONS_SHORT}
        value={custom ? 'A' : target}
        noSelection={custom}
        onChange={setModeTarget}
        tone={tone}
        size="md"
        fullWidth={!wide}
        className={wide ? undefined : 'w-full'}
      />
      {custom ? (
        <span className={`inline-flex items-center gap-2 text-label ${wide ? 'text-stage-ink' : 'text-ink'}`}>
          Kondisi kustom
          <InfoTip tone={tone} label="Tentang kondisi kustom" side="top">
            Waktu atau hari diubah di bagian lain. Pilih salah satu kondisi untuk kembali ke preset.
          </InfoTip>
        </span>
      ) : null}
    </div>
  );
}

/**
 * 02 Sistem: the product moment. The head sits above the stage so the instruction arrives before the control; the
 * stage is a graphite card (shadow-4) with the A/B/C switch inside it (desktop) or directly below it (mobile); the
 * computed mode with its reason, the two array readouts (Listrik, Panas) and the one-line router split form the strip.
 * Everything live reads the v2 DayStep at the store hour; the camera is never touched by a condition change.
 *
 * Pull-back: the stage store's framing (0 = panel, 1 = hotel roof) is scrubbed by this section's scroll, so the camera
 * opens on the collector and retreats to the hotel roof as the card reaches the eye line. A/B/C never moves the camera.
 * Reduced motion: no scrub, the stage rests on the hotel framing.
 */
export default function Hero() {
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const tablet = useMediaQuery('(min-width: 768px)', true);
  const root = useRef<HTMLElement>(null);
  const store = useMemo(() => createStageStore({ exploded: false }), []);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) store.getState().setFraming('hotel');
  }, [reduce, store]);

  // Depth on entry: the stage card arrives slightly smaller and tilted back, and settles flat as it reaches the eye line.
  useScrollScene(root, ({ desktop }) => {
    gsap.fromTo(
      '[data-stage-card]',
      { scale: desktop ? 0.9 : 0.96, rotateX: desktop ? 9 : 0, y: desktop ? 40 : 16, transformPerspective: 1600, transformOrigin: '50% 100%' },
      { scale: 1, rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: '[data-stage-card]', start: 'top bottom', end: 'top 30%', scrub: 0.5 } },
    );
    // camera pull-back, scrubbed with the card's approach (continuous 0..1; the camera springs after it)
    ScrollTrigger.create({
      trigger: '[data-stage-card]',
      start: 'top 85%',
      end: 'top 15%',
      onUpdate: (self) => store.getState().setFraming(self.progress),
    });
    if (root.current?.querySelector('[data-strip]')) gsap.fromTo('[data-strip] > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '[data-stage-card]', start: 'top 45%', once: true } });
  });

  return (
    <section ref={root} id="sistem" aria-labelledby="sistem-judul" className="relative pb-20 pt-16 lg:pb-32 lg:pt-20">
      {/* the sky outside: continues the opening photo's sky */}
      <WeatherSky className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[1000px] [mask-image:linear-gradient(180deg,transparent_0,black_200px)]" />

      <div className="page-wrap">
        {/* the head comes first: the instruction arrives before the control. Phrases never split. */}
        <SectionHeader
          id="sistem-judul"
          index={SISTEM.index}
          title={SISTEM.title.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
          lead={SISTEM.lead}
        />

        {/* ── the stage card ── */}
        <div data-stage-card data-tone="stage" className="mt-10 overflow-hidden rounded-[20px] bg-stage-0 text-stage-ink shadow-4 will-change-transform lg:mt-14 lg:rounded-[28px]">
          <div className="relative h-[360px] sm:h-[480px] lg:h-[clamp(480px,calc(100svh-18rem),700px)]">
            <Suspense fallback={<StageFallback />}>
              <CollectorStage store={store} zoomButtons={tablet} hint>
                {wide ? (
                  <div className="absolute left-5 top-5 z-20 flex items-center gap-4 rounded-full bg-stage-0/80 py-1 pl-1 pr-5 shadow-e2 ring-1 ring-white/10">
                    <ModeSwitch wide />
                    <a
                      href="#lab"
                      className="inline-flex min-h-11 items-center text-small text-stage-ink underline decoration-stage-line underline-offset-4 transition-ui hover:decoration-stage-ink"
                    >
                      Buka Lab
                    </a>
                  </div>
                ) : null}
              </CollectorStage>
            </Suspense>
          </div>
          {wide ? (
            <div data-strip className="border-t border-stage-line px-8 py-6">
              <div className="grid grid-cols-12 items-start gap-8">
                <Statement tone="stage" className="col-span-6" />
                <div className="col-span-3">
                  <ElectricReadout size="lg" tone="stage" rule={false} />
                </div>
                <div className="col-span-3">
                  <HeatReadout size="lg" tone="stage" rule={false} />
                </div>
              </div>
              <SplitLine tone="stage" className="mt-6 border-t border-stage-line pt-5" />
            </div>
          ) : null}
        </div>

        {/* mobile: switch, sentence, instruments and split on the page, directly under the stage */}
        {wide ? null : (
          <div className="mt-4 space-y-5">
            <ModeSwitch wide={false} />
            <Statement tone="page" />
            <div className="grid grid-cols-2 gap-x-6">
              <ElectricReadout size="md" tone="page" rule={false} />
              <HeatReadout size="md" tone="page" rule={false} />
            </div>
            <SplitLine tone="page" className="border-t border-line pt-4" />
            <a
              href="#lab"
              className="inline-flex min-h-11 items-center text-small text-ink underline decoration-line-strong underline-offset-4 transition-ui hover:decoration-ink"
            >
              Buka Lab
            </a>
          </div>
        )}

        <p className="mt-5 flex max-w-[72ch] items-start gap-2 text-small text-ink-3">
          <Evidence tag="simulasi" className="mt-0.5" />
          <span>{SISTEM.statement}</span>
        </p>

        <div className="mt-6 max-w-[44rem]">
          <DetailPanel />
        </div>
      </div>

      <Announcer />
    </section>
  );
}
