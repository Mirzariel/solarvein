import { useMemo, useRef, useState } from 'react';
import { useInView, useMediaQuery } from '../hooks';
import { ScrollTrigger, getLenis, useScrollScene } from '../motion';
import { DESICCANT_STATUS, LABELS, MODE_TARGETS, routerSnapshot, stepAt, type ModeTarget } from '../sim/system';
import { useSystemStore } from '../state/system';
import { useDay, useSystemView } from '../state/systemSelectors';
import { Evidence, SectionIndex, SegmentedControl, cx, typo } from '../ui';
import Bands, { type Band } from './router/Bands';
import LayerToggles from './router/LayerToggles';
import PriorArt from './router/PriorArt';
import RouterDiagram, { type LayerId } from './router/RouterDiagram';
import RouterMobile from './router/RouterMobile';
import { routerSentence } from './router/captions';
import { useRouterView } from './router/useRouterView';
import './router/router.css';

const ORDER: ModeTarget[] = ['A', 'B', 'C'];
const TAB_LABEL: Record<ModeTarget, string> = { A: 'A Terik', B: 'B Lembap', C: 'C Malam' };

/**
 * 03 — Cara kerja. One flat system diagram (thermal / electrical / air layers) whose branch widths follow the
 * router's valves. Desktop: the scene pins for ~300 % and three scroll bands set the A/B/C TARGET; the engine
 * (and the diagram's own glide) does the time-based transition, so scroll never scrubs physics.
 * < 1024 px or reduced motion: no pin, A/B/C tabs, and below 1024 a purpose-built vertical diagram.
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
  const strategy = useSystemStore((s) => s.strategy);
  const sysView = useSystemView();
  const { view, target, step } = useRouterView(inView && !reduce);
  const refDay = useDay('terik');
  const electricalRefW = useMemo(() => Math.max(1, ...refDay.steps.map((s) => s.collector.electricalW)), [refDay]);

  // One computed sentence per preset, from the same cached days the diagram reads.
  const bands = useMemo<Band[]>(
    () =>
      ORDER.map((m) => {
        const t = MODE_TARGETS[m];
        const st = stepAt(sysView.day(t.scenario, strategy), t.hour);
        const snap = routerSnapshot(st);
        const backupShare = st.dhw.demandW > 1 ? st.dhw.backupW / st.dhw.demandW : 0;
        return { m, computed: snap.mode, sentence: routerSentence({ mode: snap.mode, pumpOn: snap.pumpOn, reason: snap.reason, valves: snap.valves, backupShare }) };
      }),
    [sysView, strategy],
  );
  const liveSentence = routerSentence({
    mode: target.mode,
    pumpOn: target.pumpOn,
    reason: target.reason,
    valves: { bypass: target.n.vBypass, dhw: target.n.vDhw, tank: target.n.vTank, desiccant: target.n.vDesiccant },
    backupShare: step.dhw.demandW > 1 ? step.dhw.backupW / step.dhw.demandW : 0,
  });

  useScrollScene(
    root,
    ({ desktop }) => {
      if (!desktop) return;
      let last = -1;
      const apply = (p: number) => {
        const i = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2;
        if (i !== last) {
          last = i;
          setModeTarget(ORDER[i] as ModeTarget);
        }
        root.current?.style.setProperty('--router-p', p.toFixed(3));
      };
      const st = ScrollTrigger.create({
        trigger: '[data-router-pin]',
        start: 'top top',
        end: '+=300%',
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

  const select = (m: ModeTarget) => {
    const st = stRef.current;
    if (pinned && st) {
      const y = st.start + (st.end - st.start) * ((ORDER.indexOf(m) + 0.5) / 3);
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(y, { duration: 1.2 });
      else window.scrollTo({ top: y, behavior: 'smooth' });
      return;
    }
    setModeTarget(m);
  };
  const toggleLayer = (id: LayerId) => setLayers((l) => ({ ...l, [id]: !l[id] }));

  const legend = (
    <p className="m-0 flex flex-wrap items-center gap-x-5 gap-y-1 text-label text-ink-2">
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-4 bg-heat" />
        Panas dalam cairan
      </span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-ink-2" />
        Putus-putus: {DESICCANT_STATUS.toLowerCase()}
      </span>
      <span className="inline-flex items-center gap-2">
        <span aria-hidden="true" className="h-2 w-4 bg-loss" />
        Tidak dipakai
      </span>
      <span className="inline-flex items-center gap-2">
        <Evidence tag="simulasi" />
        Semua angka di bagian ini: hasil simulasi
      </span>
    </p>
  );

  const heading = (
    <div>
      <SectionIndex n="03" label="Cara kerja" />
      <h2 id="router-judul" className={cx('mt-4 text-h2', pinned && 'lg:text-[40px] lg:leading-[44px]')}>
        {typo('Panas diarahkan ke pemakai yang paling bernilai.')}
      </h2>
    </div>
  );

  return (
    <section ref={root} id="router" aria-labelledby="router-judul" className="relative scroll-mt-14">
      {pinned ? (
        <div data-router-pin className="router-pin page-wrap flex h-svh flex-col gap-3 pb-5 pt-[68px]">
          <div className="flex items-end justify-between gap-6">
            {heading}
            <LayerToggles layers={layers} onToggle={toggleLayer} />
          </div>
          <div className="router-progress" aria-hidden="true">
            <span />
          </div>
          <div ref={inViewRef} className="flex min-h-0 flex-1 items-center justify-center">
            <RouterDiagram className="h-full w-full [&_svg]:mx-auto [&_svg]:h-full" view={view} target={target} layers={layers} electricalRefW={electricalRefW} moving={inView && !reduce} />
          </div>
          {legend}
          <Bands bands={bands} active={modeTarget} onSelect={select} />
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
            <span className="num mr-3 text-[13px] text-ink-2">{LABELS.modeTarget[(modeTarget === 'custom' ? target.mode : modeTarget) as ModeTarget]}</span>
            {typo(liveSentence)}
          </p>
          <div ref={inViewRef} className="mt-8">
            {wide ? (
              <RouterDiagram view={view} target={target} layers={layers} electricalRefW={electricalRefW} moving={false} />
            ) : (
              <RouterMobile view={view} target={target} layers={layers} electricalRefW={electricalRefW} />
            )}
          </div>
          <div className="mt-6">{legend}</div>
        </div>
      )}

      <div className="page-wrap pb-20 pt-12 sm:pb-28 sm:pt-16">
        <p className="max-w-[64ch] text-body text-ink-2">
          {typo('Layanan tidak bergantung pada matahari: saat malam atau hujan panjang, pemanas dan AC hotel menutup kebutuhan, dan yang turun hanya penghematan. Garis putus-putus ke pompa kalor adalah opsi riset, belum divalidasi.')}
        </p>
        <div className="mt-16">
          <PriorArt />
        </div>
      </div>
    </section>
  );
}
