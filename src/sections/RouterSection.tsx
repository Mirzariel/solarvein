import { useMemo, useRef, useState } from 'react';
import { useInView, useMediaQuery } from '../hooks';
import { ScrollTrigger, getLenis, targetAt, useScrollScene, useVisualSelect, weather, type VisualFrame } from '../motion';
import { LABELS, getSystemView, stepAt, type ControllerMode, type ModeTarget } from '../sim/system';
import { useSystemStore } from '../state/system';
import { useDay } from '../state/systemSelectors';
import { Disclosure, SectionIndex, SegmentedControl, cx, typo } from '../ui';
import DayStrip, { DAY_T0, bandsOf } from './router/DayStrip';
import LayerToggles from './router/LayerToggles';
import PriorArt from './router/PriorArt';
import RouterDiagram, { type LayerId } from './router/RouterDiagram';
import RouterMobile from './router/RouterMobile';
import { routerSentence } from './router/captions';
import { useRouterView } from './router/useRouterView';
import './router/router.css';

const ORDER: ModeTarget[] = ['A', 'B', 'C'];
const TAB_LABEL: Record<ModeTarget, string> = { A: 'A Terik', B: 'B Lembap', C: 'C Malam' };
/** The scrubbed day runs from first light to late evening. */
const HOUR_END = 23.5;
const hourOf = (p: number): number => Math.round((DAY_T0 + p * (HOUR_END - DAY_T0)) * 20) / 20;

/** Live sentence of the computed router state (updates only when the words change). */
function sentenceOf(f: VisualFrame): string {
  const r = f.router;
  if (!r) return '';
  const st = useSystemStore.getState();
  const step = stepAt(getSystemView(st.sys).day(st.scenario, st.strategy), f.hour ?? st.hour);
  const backupShare = step.dhw.demandW > 1 ? step.dhw.backupW / step.dhw.demandW : 0;
  return routerSentence({ mode: r.mode, pumpOn: r.pumpOn, reason: r.reason, backupShare });
}

function Mobile({ layers, electricalRefW, animate }: { layers: Record<LayerId, boolean>; electricalRefW: number; animate: boolean }) {
  const { view, target } = useRouterView(animate);
  return <RouterMobile view={view} target={target} layers={layers} electricalRefW={electricalRefW} />;
}

/**
 * 03 — Cara kerja. One flat system diagram (thermal / electrical / air layers) whose branch widths follow the
 * router's valves. Desktop: the scene pins for ~220 % and SCROLL PROGRESS IS THE CLOCK of the day (05–23.30):
 * the system engine follows the hour, so modes A, B and C appear as the computed day passes. The engine (not
 * scroll) integrates every visual quantity; the diagram paints straight into the DOM per engine frame.
 * < 1024 px or reduced motion: no pin, A/B/C tabs + a draggable day strip, and below 1024 px a purpose-built
 * vertical diagram.
 */
export default function RouterSection() {
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const pinned = wide && !reduce;
  const root = useRef<HTMLElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [inViewRef, inView] = useInView<HTMLDivElement>({ rootMargin: '120px' });
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({ termal: true, listrik: true, udara: true });

  const modeTarget = useSystemStore((s) => s.modeTarget);
  const setModeTarget = useSystemStore((s) => s.setModeTarget);
  const day = useDay();
  const refDay = useDay('terik');
  const electricalRefW = useMemo(() => Math.max(1, ...refDay.steps.map((s) => s.collector.electricalW)), [refDay]);
  const sentence = useVisualSelect(sentenceOf, 10);
  const liveMode = useVisualSelect((f) => f.router?.mode ?? 'A', 10);
  const dayBands = useMemo(() => bandsOf(refDay), [refDay]);

  /** Drive the engine directly (no store write: other sections do not re-render while the day scrubs). */
  const scrubTo = (h: number) => {
    const st = useSystemStore.getState();
    weather.setTarget(targetAt(st.sys, 'terik', st.strategy, h), { kind: 'follow' });
  };

  useScrollScene(
    root,
    ({ desktop }) => {
      if (!desktop) return;
      let lastH = -1;
      const apply = (p: number) => {
        const h = hourOf(p);
        if (h !== lastH) {
          lastH = h;
          scrubTo(h);
        }
        root.current?.style.setProperty('--router-p', p.toFixed(3));
      };
      const reset = () => {
        lastH = -1;
        const st = useSystemStore.getState();
        st.setModeTarget('A');
        weather.setTarget(targetAt(st.sys, st.scenario, st.strategy, st.hour), { kind: 'scripted' });
      };
      const st = ScrollTrigger.create({
        trigger: '[data-router-pin]',
        start: 'top top',
        end: '+=220%',
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        onEnter: () => {
          useSystemStore.getState().setScenario('terik');
          apply(0);
        },
        onEnterBack: () => {
          useSystemStore.getState().setScenario('terik');
          apply(1);
        },
        onUpdate: (self) => apply(self.progress),
        onLeave: reset,
        onLeaveBack: reset,
      });
      stRef.current = st;
      return () => {
        st.kill();
        stRef.current = null;
      };
    },
    [pinned],
  );

  /** Pinned: move the scroll position; otherwise write the hour. */
  const toHour = (h: number) => {
    const st = stRef.current;
    if (pinned && st) {
      const y = st.start + (st.end - st.start) * ((h - DAY_T0) / (HOUR_END - DAY_T0));
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 1.1, offset: 0 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    useSystemStore.getState().setHour(h);
  };
  const jumpMode = (m: ControllerMode) => {
    const list = dayBands.filter((b) => b.mode === m);
    if (!list.length) return;
    const b = list.reduce((a, c) => (c.t1 - c.t0 > a.t1 - a.t0 ? c : a));
    toHour((Math.max(b.t0, DAY_T0) + Math.min(b.t1, HOUR_END)) / 2);
  };
  const toggleLayer = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }));

  const novelty = (
    <p className="m-0 mt-2 text-body-s text-ink-2">
      Kebaruan: satu aliran panas bersuhu rendah dibagi ke tujuan menurut CO₂e yang dihindari per kWh<sub>th</sub>, lalu diuji terhadap empat pembanding.
    </p>
  );
  const heading = (
    <div className="w-full">
      <div className="flex items-center justify-between gap-6">
        <SectionIndex n="03" label="Cara kerja" />
        {pinned ? <LayerToggles layers={layers} onToggle={toggleLayer} /> : null}
      </div>
      <h2 id="router-judul" className={cx('mt-3 max-w-none text-h2', pinned && 'lg:text-[52px] lg:leading-[56px]')}>
        {typo('Panas diarahkan ke pemakai yang paling bernilai.')}
      </h2>
      {novelty}
    </div>
  );
  const sentenceRow = (
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-2">
      <p className="m-0 min-h-[52px] max-w-[62ch] flex-1 text-body-l text-ink" aria-live="polite">
        {typo(sentence)}
      </p>
      <div role="group" aria-label="Loncat ke mode" className="flex items-center gap-1">
        {ORDER.map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={liveMode === m}
            onClick={() => jumpMode(m)}
            className={cx('min-h-9 border-b-2 px-3 text-ui transition-ui pointer-coarse:min-h-11', liveMode === m ? 'border-ink text-ink' : 'border-transparent text-ink-3 hover:text-ink')}
          >
            {LABELS.mode[m]}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <section ref={root} id="router" aria-labelledby="router-judul" className="relative scroll-mt-14">
      {pinned ? (
        <div data-router-pin className="router-pin page-wrap flex h-svh flex-col gap-3 pb-5 pt-[68px]">
          {heading}
          <div ref={inViewRef} className="flex min-h-0 flex-1 items-start">
            <RouterDiagram className="h-full w-full [&_svg]:h-full" layers={layers} electricalRefW={electricalRefW} moving={inView && !reduce} />
          </div>
          <DayStrip onHour={toHour} />
          {sentenceRow}
        </div>
      ) : (
        <div className="page-wrap py-16 sm:py-20">
          {heading}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <SegmentedControl
              ariaLabel="Kondisi"
              size="md"
              value={modeTarget === 'custom' ? 'A' : modeTarget}
              noSelection={modeTarget === 'custom'}
              onChange={(m) => setModeTarget(m)}
              options={ORDER.map((m) => ({ value: m, label: TAB_LABEL[m], description: LABELS.modeTarget[m] }))}
              className="w-full sm:w-auto"
              fullWidth
            />
            <LayerToggles layers={layers} onToggle={toggleLayer} />
          </div>
          <p className="mt-5 max-w-[60ch] text-body-l text-ink" aria-live="polite">
            {typo(sentence)}
          </p>
          <div ref={inViewRef} className="mt-8">
            {wide ? (
              <RouterDiagram layers={layers} electricalRefW={electricalRefW} moving={false} />
            ) : (
              <Mobile layers={layers} electricalRefW={electricalRefW} animate={inView} />
            )}
          </div>
          <div className="mt-6">
            <DayStrip onHour={toHour} compact={!wide} />
          </div>
          <p className="mt-2 text-small text-ink-2">
            Geser garis jam: mode A, B, C dihitung dari skenario {LABELS.scenario[day.scenario].toLowerCase()}.
          </p>
        </div>
      )}

      <div className="page-wrap pb-20 pt-10 sm:pb-28 sm:pt-14">
        <p className="m-0 flex max-w-[70ch] flex-wrap items-center gap-x-2 text-body text-ink-2">
          {typo('Layanan tidak bergantung pada matahari: saat malam atau hujan panjang, pemanas cadangan dan AC menutup kebutuhan, dan yang turun hanya penghematan. Garis putus-putus ke pompa kalor adalah opsi riset, belum divalidasi.')}
        </p>
        <Disclosure title="Apa yang sudah ada, apa yang baru" hint="Pustaka dan batas klaim" className="mt-10" level={3}>
          <PriorArt />
        </Disclosure>
      </div>
    </section>
  );
}
