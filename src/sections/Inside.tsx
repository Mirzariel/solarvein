import { useMemo, useRef } from 'react';
import { useMediaQuery, useWebGLAvailable } from '../hooks';
import { ScrollTrigger, useScrollScene } from '../motion';
import { SISTEM_DALAM } from '../content/sistem';
import { SectionIndex, cx } from '../ui';
import { PARTS, type PartId } from '../viz3d/parts';
import { createStageStore, useStageState } from '../viz3d/stage';
import CollectorStage from '../viz3d/CollectorStage';
import { PartList } from './inside/PartList';
import { UnitText } from './inside/UnitText';
import { usePartValue, useReferenceCondition } from './inside/usePartValue';

/**
 * 02 - Di dalam SolarVein: the page steps into the product. A graphite chapter rises over the paper with rounded
 * shoulders. On desktop the chapter pins for a few screens: the panel separates into its layers, then scrolling walks
 * through the four parts one by one (the stage dims everything else, the list on the left reads the part's one
 * sentence and its live value). Clicking a part still works at any time. Mobile / reduced motion / no WebGL: no pin,
 * the stage explodes on view and the parts are a plain list.
 */
export default function Inside() {
  const store = useMemo(() => createStageStore({ exploded: false }), []);
  const webgl = useWebGLAvailable();
  const wide = useMediaQuery('(min-width: 1024px)', true);
  const sm = useMediaQuery('(min-width: 640px)', true);
  const focus = useStageState(store, (s) => s.focusPart);
  const valueOf = usePartValue();
  const reference = useReferenceCondition();
  const root = useRef<HTMLElement>(null);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)', false);
  const scrolly = wide && webgl !== false && !reduce;

  useScrollScene(
    root,
    ({ desktop }) => {
      if (!desktop || !scrolly) return;
      const steps: (PartId | null)[] = [null, ...PARTS.map((p) => p.id)];
      let last = -1;
      const st = ScrollTrigger.create({
        trigger: '[data-pin]',
        start: 'top top',
        end: '+=200%',
        pin: true,
        pinSpacing: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
          const s = store.getState();
          const exploded = p > 0.08;
          if (s.exploded !== exploded) s.setExploded(exploded);
          // 0.08–0.2: separated, nothing selected; then four equal steps.
          const i = p < 0.2 ? 0 : Math.min(steps.length - 1, 1 + Math.floor(((p - 0.2) / 0.8) * PARTS.length));
          if (i !== last) {
            last = i;
            s.setFocusPart(steps[i] ?? null);
          }
          root.current?.style.setProperty('--inside-p', p.toFixed(3));
        },
      });
      return () => st.kill();
    },
    [scrolly],
  );

  const sel = PARTS.find((p) => p.id === focus) ?? null;

  return (
    <section
      ref={root}
      id="sistem-dalam"
      aria-labelledby="sistem-dalam-title"
      className="relative z-10 -mt-10 scroll-mt-[5rem] rounded-t-[32px] bg-stage-0 text-stage-ink shadow-[0_-40px_80px_-40px_rgb(17_18_20/0.35)] lg:-mt-16 lg:rounded-t-[48px]"
    >
      <div data-pin className={cx('page-wrap', scrolly ? 'flex h-svh items-center pb-8 pt-24' : 'pb-6 pt-20 sm:pb-8 sm:pt-28')}>
        <div className={cx('w-full', scrolly && 'grid grid-cols-12 items-center gap-10')}>
          <div className={cx(scrolly ? 'col-span-5' : '')}>
            <SectionIndex n={SISTEM_DALAM.index.n} label={SISTEM_DALAM.index.label} inverse />
            <h2 id="sistem-dalam-title" className="mt-4 text-h2 text-white lg:text-[44px] lg:leading-[48px] min-[1400px]:text-[52px] min-[1400px]:leading-[56px]">
              <span className="block">{SISTEM_DALAM.title[0]}</span> <span className="block">{SISTEM_DALAM.title[1]}</span>
            </h2>

            {scrolly ? (
              <ol className="mt-8 min-h-[18.5rem] list-none space-y-1 p-0" aria-label={SISTEM_DALAM.listLabel}>
                {PARTS.map((p) => {
                  const on = p.id === focus;
                  const v = valueOf(p.id);
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => store.getState().setFocusPart(on ? null : p.id)}
                        className={cx(
                          'group w-full rounded-2xl px-4 py-3 text-left transition-[background-color,color] duration-[300ms] ease-ui',
                          on ? 'bg-white/[0.06] text-white' : 'text-stage-ink-2 hover:text-stage-ink',
                        )}
                      >
                        <span className="flex items-baseline gap-4">
                          <span className={cx('num text-[13px]', on ? 'text-sun' : 'text-stage-ink-2')}>0{p.index}</span>
                          <span className="text-body-l">{p.label}</span>
                          {on ? (
                            <span className="num ml-auto text-[15px] text-white">
                              {v.value}
                              <span className="ml-1 text-stage-ink-2">
                                <UnitText unit={v.unit} />
                              </span>
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={cx(
                            'grid pl-[38px] transition-[grid-template-rows,opacity] duration-[400ms] ease-ui',
                            on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0',
                          )}
                        >
                          <span className="min-h-0 overflow-hidden">
                            <span className="block pt-2 text-body text-stage-ink-2">{p.sentence}</span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : null}
            {scrolly ? (
              <div aria-hidden="true" className="mt-6 h-px w-full bg-white/10">
                <div className="h-px origin-left bg-sun" style={{ transform: 'scaleX(var(--inside-p, 0))' }} />
              </div>
            ) : null}
            {scrolly ? <p className="mt-4 text-small text-stage-ink-2">{SISTEM_DALAM.hint(reference)}</p> : null}
            <p className="sr-only" aria-live="polite">
              {sel ? `${sel.label}: ${sel.sentence}` : ''}
            </p>
          </div>

          <div
            data-tone="stage"
            className={cx(
              'overflow-hidden rounded-[20px] border border-stage-line bg-stage-0',
              scrolly ? 'col-span-7 h-[min(78svh,760px)]' : 'mt-10 h-[clamp(360px,62svh,440px)] md:h-[520px]',
            )}
          >
            <CollectorStage variant="inspect" store={store} compactAnnotations={scrolly || !sm} zoomButtons={sm} explodeOnView={!scrolly} />
          </div>
        </div>
      </div>

      {scrolly ? null : (
        <div className="page-wrap pb-16 pt-2 [&_.text-ink]:text-white [&_.text-ink-2]:text-stage-ink-2 [&_.border-ink]:border-white">
          <PartList store={store} focus={focus} valueOf={valueOf} />
          <p className="mt-4 text-small text-stage-ink-2">{SISTEM_DALAM.hint(reference)}</p>
        </div>
      )}
    </section>
  );
}
