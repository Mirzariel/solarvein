import { useEffect, useMemo, useRef, useState } from 'react';
import { useInView, useMediaQuery } from '../hooks';
import { ScrollTrigger, getLenis, useScrollScene, useVisualSelect, type VisualFrame } from '../motion';
import { LABELS, MODE_TARGETS, getSystemView, stepAt, type ControllerMode, type DayScenarioId, type ModeTarget } from '../sim/system';
import { useSystemStore } from '../state/system';
import { useDay } from '../state/systemSelectors';
import { Disclosure, SectionIndex, SegmentedControl, cx, typo } from '../ui';
import DayStrip, { DAY_T0, bandsOf } from './router/DayStrip';
import LayerToggles from './router/LayerToggles';
import PriorArt from './router/PriorArt';
import RouterDiagram, { type LayerId } from './router/RouterDiagram';
import RouterMobile from './router/RouterMobile';
import { routerSentence } from './router/captions';
import { Glider, paintStateClose, stateFromFrame } from './router/paint';
import { driveEngine, getSceneScenario, restoreEngine } from './router/scene';
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
  const step = stepAt(getSystemView(st.sys).day(getSceneScenario() ?? st.scenario, st.strategy), f.hour ?? st.hour);
  const backupShare = step.dhw.demandW > 1 ? step.dhw.backupW / step.dhw.demandW : 0;
  return routerSentence({ mode: r.mode, pumpOn: r.pumpOn, reason: r.reason, backupShare });
}

/** Mobile diagram: engine frames → React state at ≤ 15 Hz, only when a number really changed. */
function Mobile({ layers, electricalRefW }: { layers: Record<LayerId, boolean>; electricalRefW: number }) {
  const glider = useRef(new Glider());
  const s = useVisualSelect((f) => stateFromFrame(f, glider.current), 15, paintStateClose);
  return s ? <RouterMobile s={s} layers={layers} electricalRefW={electricalRefW} /> : null;
}

/**
 * 03 — Cara kerja. One flat system diagram (thermal / electrical / air layers) whose branch widths follow the
 * router's valves. Desktop: the scene pins for ~220 % and SCROLL PROGRESS IS THE CLOCK of the day (05–23.30):
 * the system engine follows the hour, so modes A, B and C appear as the computed day passes. The engine (not
 * scroll) integrates every visual quantity; the diagram paints straight into the DOM per engine frame.
 * < 1024 px or reduced motion: no pin, A/B/C tabs + a draggable day strip, and below 1024 px a purpose-built
 * vertical diagram.
 *
 * The section never writes hour or scenario into the global store: it drives the engine directly through
 * `router/scene.ts` and hands the engine back to the store when it leaves the viewport.
 */
export default function RouterSection() {
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const short = useMediaQuery('(max-height: 820px)', false);
  const pinned = wide && !reduce;
  const root = useRef<HTMLElement>(null);
  const stRef = useRef<ScrollTrigger | null>(null);
  const [inViewRef, inView] = useInView<HTMLDivElement>({ rootMargin: '120px' });
  const [layers, setLayers] = useState<Record<LayerId, boolean>>({ termal: true, listrik: true, udara: true });

  const storeMode = useSystemStore((s) => s.modeTarget);
  const storeScenario = useSystemStore((s) => s.scenario);
  const refDay = useDay('terik');
  const electricalRefW = useMemo(() => Math.max(1, ...refDay.steps.map((s) => s.collector.electricalW)), [refDay]);
  const sentence = useVisualSelect(sentenceOf, 10);
  const liveMode = useVisualSelect((f) => f.router?.mode ?? 'A', 10);
  const dayBands = useMemo(() => bandsOf(refDay), [refDay]);
  const sentenceRef = useRef(sentence);
  sentenceRef.current = sentence;

  // ── local scene (no store writes) ──
  const [localScenario, setLocalScenario] = useState<DayScenarioId | null>(null);
  const [localMode, setLocalMode] = useState<ModeTarget | null>(null);
  const [announce, setAnnounce] = useState('');
  const active = useRef(false);
  const timer = useRef(0);

  const begin = (scenario: DayScenarioId, hour: number, kind: 'scripted' | 'follow') => {
    active.current = true;
    setLocalScenario((cur) => (cur === scenario ? cur : scenario));
    driveEngine(scenario, hour, kind);
  };
  const end = () => {
    if (!active.current) return;
    active.current = false;
    restoreEngine();
    setLocalScenario(null);
    setLocalMode(null);
  };
  const endRef = useRef(end);
  endRef.current = end;
  const beginRef = useRef(begin);
  beginRef.current = begin;

  // pinned: own the clock while the diagram is in view (initialised at the pin's start hour); release when it leaves
  useEffect(() => {
    if (!pinned) return;
    if (inView && !active.current) beginRef.current('terik', hourOf(stRef.current?.progress ?? 0), 'scripted');
    if (!inView) endRef.current();
  }, [pinned, inView]);
  // unpinned: release when the diagram leaves the viewport
  useEffect(() => {
    if (!pinned && !inView) endRef.current();
  }, [pinned, inView]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      endRef.current();
    },
    [],
  );
  // first entry: build the day models while the browser is idle (the 1st touch of a day costs tens of ms)
  useEffect(() => {
    const warm = () => {
      const st = useSystemStore.getState();
      const v = getSystemView(st.sys);
      v.day('terik', st.strategy);
      v.day('hujan', st.strategy);
    };
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(warm, { timeout: 2500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(warm, 1200);
    return () => window.clearTimeout(id);
  }, []);

  useScrollScene(
    root,
    ({ desktop }) => {
      if (!desktop) return;
      let lastH = -1;
      const apply = (p: number) => {
        const h = hourOf(p);
        if (h !== lastH) {
          lastH = h;
          if (active.current) driveEngine('terik', h, 'follow');
        }
        root.current?.style.setProperty('--router-p', p.toFixed(3));
      };
      const st = ScrollTrigger.create({
        trigger: '[data-router-pin]',
        start: 'top top',
        end: '+=220%',
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => apply(self.progress),
        onToggle: (self) => {
          if (self.isActive) apply(self.progress);
        },
      });
      stRef.current = st;
      return () => {
        st.kill();
        stRef.current = null;
      };
    },
    [pinned],
  );

  /** Announce the settled sentence once, after an explicit A/B/C action (the sentence itself is not a live region). */
  const announceLater = (label: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setAnnounce(`${label}: ${sentenceRef.current}`), 1400);
  };

  /** Pinned: move the scroll position; otherwise write the hour to the engine. */
  const toHour = (h: number) => {
    const st = stRef.current;
    if (pinned && st) {
      const y = st.start + (st.end - st.start) * ((h - DAY_T0) / (HOUR_END - DAY_T0));
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 1.1, offset: 0 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    setLocalMode(null);
    begin(localScenario ?? getSceneScenario() ?? useSystemStore.getState().scenario, h, 'follow');
  };
  const jumpMode = (m: ControllerMode) => {
    const list = dayBands.filter((b) => b.mode === m);
    if (!list.length) return;
    const b = list.reduce((a, c) => (c.t1 - c.t0 > a.t1 - a.t0 ? c : a));
    toHour((Math.max(b.t0, DAY_T0) + Math.min(b.t1, HOUR_END)) / 2);
    announceLater(LABELS.mode[m]);
  };
  const pickTab = (m: ModeTarget) => {
    setLocalMode(m);
    begin(MODE_TARGETS[m].scenario, MODE_TARGETS[m].hour, 'scripted');
    announceLater(LABELS.modeTarget[m]);
  };
  const toggleLayer = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }));

  const stripScenario: DayScenarioId = localScenario ?? storeScenario;
  const tabValue: ModeTarget | null = localMode ?? (storeMode === 'custom' ? null : storeMode);

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
      <p className={cx('m-0 max-w-[62ch] flex-1 text-ink', short ? 'min-h-[30px] text-body' : 'min-h-[52px] text-body-l')}>{typo(sentence)}</p>
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
      <p role="status" aria-live="polite" className="sr-only">
        {announce}
      </p>
      {pinned ? (
        <div data-router-pin className="router-pin page-wrap flex h-svh flex-col gap-3 pb-5 pt-[68px]">
          {heading}
          <div ref={inViewRef} className="flex min-h-0 flex-1 items-start">
            <RouterDiagram className="h-full w-full [&_svg]:h-full" layers={layers} electricalRefW={electricalRefW} moving={inView && !reduce} />
          </div>
          <DayStrip scenario={stripScenario} onHour={toHour} dense={short} />
          {sentenceRow}
        </div>
      ) : (
        <div className="page-wrap py-16 sm:py-20">
          {heading}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <SegmentedControl
              ariaLabel="Kondisi"
              size="md"
              value={tabValue ?? 'A'}
              noSelection={tabValue === null}
              onChange={pickTab}
              options={ORDER.map((m) => ({ value: m, label: TAB_LABEL[m], description: LABELS.modeTarget[m] }))}
              className="w-full sm:w-auto"
              fullWidth
            />
            <LayerToggles layers={layers} onToggle={toggleLayer} />
          </div>
          <p className="mt-5 min-h-[56px] max-w-[60ch] text-body-l text-ink">{typo(sentence)}</p>
          <div ref={inViewRef} className="mt-8">
            {wide ? <RouterDiagram layers={layers} electricalRefW={electricalRefW} moving={false} /> : <Mobile layers={layers} electricalRefW={electricalRefW} />}
          </div>
          <div className="mt-6">
            <DayStrip scenario={stripScenario} onHour={toHour} compact={!wide} />
          </div>
          <p className="mt-2 text-small text-ink-2">
            Geser garis jam: mode A, B, C dihitung dari skenario {LABELS.scenario[stripScenario].toLowerCase()}.
          </p>
        </div>
      )}

      <div className="page-wrap pb-20 pt-10 sm:pb-28 sm:pt-14">
        <p className="m-0 max-w-[70ch] text-body text-ink-2">
          {typo('Layanan tidak bergantung pada matahari: saat malam atau hujan panjang, pemanas cadangan dan AC menutup kebutuhan, dan yang turun hanya penghematan. Garis putus-putus ke pompa kalor adalah opsi riset, belum divalidasi.')}
        </p>
        <Disclosure title="Apa yang sudah ada, apa yang baru" hint="Pustaka dan batas klaim" className="mt-10" level={3}>
          <PriorArt />
        </Disclosure>
      </div>
    </section>
  );
}
