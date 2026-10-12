import gsap from 'gsap';
import { Suspense, lazy, useMemo, useRef } from 'react';
import { useMediaQuery } from '../hooks';
import { WeatherSky, useScrollScene } from '../motion';
import { useSimResult } from '../state/selectors';
import { useStore } from '../state/store';
import { InfoTip, RainIcon, SectionHeader, SegmentedControl, SunIcon, type SegmentedOption } from '../ui';
import { DetailPanel } from './hero/DetailPanel';
import { LiveHeatReadout, LiveReadout } from './hero/LiveReadout';
import { Statement } from './hero/Statement';
import { describeRegime } from './hero/regime';
import { useAnnouncement } from './hero/useAnnouncement';

// three + r3f load on demand; the switch, the statement and the readouts render immediately.
const CollectorStage = lazy(() => import('../viz3d/CollectorStage'));

const MODES: readonly SegmentedOption<'sunny' | 'rainy'>[] = [
  { value: 'sunny', label: 'Cerah', icon: <SunIcon size={16} />, dot: 'heat' },
  { value: 'rainy', label: 'Hujan', icon: <RainIcon size={16} />, dot: 'cool' },
];

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
 * Screen-reader announcer, a leaf of its own: it reads the COMMITTED result (a change is spoken once, never per tick)
 * and keeps Hero and the 3D stage children from re-rendering on every input change.
 */
function Announcer() {
  const committed = useSimResult();
  const statement = useMemo(() => describeRegime(committed), [committed]);
  const signature = `${statement.key}|${committed.advisories.map((a) => a.code).join(',')}`;
  const spoken = useMemo(() => {
    const important = committed.advisories.filter((a) => a.severity !== 'info' && a.code !== 'REJECTION_NOT_BENEFICIAL');
    return [statement.headline, ...important.map((a) => a.message)].join(' ');
  }, [statement, committed.advisories]);
  const announcement = useAnnouncement(signature, spoken);
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {announcement}
    </div>
  );
}

/**
 * 01 Pengalaman: the product moment (docs/audit/07-creative-direction-v2.md C.2, QA/critic pass 3).
 * The head sits above the stage so the instruction arrives before the control; the stage is a graphite card (shadow-4)
 * with the switch inside it (desktop) or directly below it (mobile); one live sentence and the two L1 instruments form
 * the strip. Behind everything the sky follows the interpolated weather. Everything live reads the weather engine's
 * visual frame; the camera is never touched by a mode change.
 */
export default function Hero() {
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const tablet = useMediaQuery('(min-width: 768px)', true);

  const custom = mode === 'lab';
  const root = useRef<HTMLElement>(null);

  // Depth on entry: the stage card arrives slightly smaller and tilted back, and settles flat as it reaches the eye line.
  useScrollScene(root, ({ desktop }) => {
    gsap.fromTo(
      '[data-stage-card]',
      { scale: desktop ? 0.9 : 0.96, rotateX: desktop ? 9 : 0, y: desktop ? 40 : 16, transformPerspective: 1600, transformOrigin: '50% 100%' },
      { scale: 1, rotateX: 0, y: 0, ease: 'none', scrollTrigger: { trigger: '[data-stage-card]', start: 'top bottom', end: 'top 30%', scrub: 0.5 } },
    );
    gsap.fromTo('[data-strip] > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.8, ease: 'power3.out', scrollTrigger: { trigger: '[data-stage-card]', start: 'top 45%', once: true } });
  });
  const tone = wide ? 'stage' : 'page';

  const modeSwitch = (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SegmentedControl
        ariaLabel="Cuaca"
        options={MODES}
        value={custom ? 'sunny' : mode}
        noSelection={custom}
        onChange={(v) => setMode(v)}
        tone={tone}
        size="md"
        fullWidth={!wide}
        className={wide ? undefined : 'w-full'}
      />
      {custom ? (
        <span className={`inline-flex items-center gap-2 text-label ${wide ? 'text-stage-ink' : 'text-ink'}`}>
          Kustom
          <InfoTip tone={tone} label="Tentang mode kustom" side="top">
            Masukan diubah di Lab. Pilih Cerah atau Hujan untuk kembali ke preset.
          </InfoTip>
        </span>
      ) : null}
    </div>
  );

  return (
    <section ref={root} id="pengalaman" aria-labelledby="pengalaman-judul" className="relative pb-20 pt-16 lg:pb-32 lg:pt-20">
      {/* the weather outside: continues the opening photo's sky */}
      <WeatherSky className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[1000px] [mask-image:linear-gradient(180deg,transparent_0,black_200px)]" />

      <div className="page-wrap">
        {/* the head comes first: the instruction arrives before the control. Phrases never split. */}
        <SectionHeader
          id="pengalaman-judul"
          index={{ n: '01', label: 'Pengalaman' }}
          title={
            <>
              <span className="block whitespace-nowrap">Satu panel.</span>
              <span className="block whitespace-nowrap">Dua arah panas.</span>
            </>
          }
          lead="Pilih cuacanya, lalu ikuti ke mana panas pergi."
        />

        {/* ── the stage card ── */}
        <div data-stage-card data-tone="stage" className="mt-10 overflow-hidden rounded-[20px] bg-stage-0 text-stage-ink shadow-4 will-change-transform lg:mt-14 lg:rounded-[28px]">
          <div className="relative h-[360px] sm:h-[480px] lg:h-[clamp(520px,calc(100svh-14rem),760px)]">
            <Suspense fallback={<StageFallback />}>
              <CollectorStage zoomButtons={tablet} hint>
                {wide ? (
                  <div className="absolute left-5 top-5 z-20 flex items-center gap-4 rounded-full bg-stage-0/80 py-1 pl-1 pr-5 shadow-e2 ring-1 ring-white/10">
                    {modeSwitch}
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
            <div data-strip className="grid grid-cols-12 items-start gap-8 border-t border-stage-line px-8 py-6">
              <Statement tone="stage" className="col-span-6" />
              <div className="col-span-3">
                <LiveReadout label="Listrik" select={(r) => r.electricalW} unit="W" kind="electrical" size="lg" tone="stage" rule={false} />
              </div>
              <div className="col-span-3">
                <LiveHeatReadout tone="stage" size="lg" />
              </div>
            </div>
          ) : null}
        </div>

        {/* mobile: switch, sentence and instruments on the page, directly under the stage */}
        {wide ? null : (
          <div className="mt-4 space-y-5">
            {modeSwitch}
            <Statement tone="page" />
            <div className="grid grid-cols-2 gap-x-6">
              <LiveReadout label="Listrik" select={(r) => r.electricalW} unit="W" kind="electrical" size="md" tone="page" rule={false} />
              <LiveHeatReadout tone="page" size="md" />
            </div>
            <a
              href="#lab"
              className="inline-flex min-h-11 items-center text-small text-ink underline decoration-line-strong underline-offset-4 transition-ui hover:decoration-ink"
            >
              Buka Lab
            </a>
          </div>
        )}

        <p className="mt-5 max-w-[72ch] text-small text-ink-3">
          Cairan selalu mengalir dari masuk ke keluar; yang berbalik hanya arah panasnya. Warna cairan = suhu (skala diperbesar).
        </p>

        <div className="mt-6 max-w-[44rem]">
          <DetailPanel />
        </div>
      </div>

      <Announcer />
    </section>
  );
}
