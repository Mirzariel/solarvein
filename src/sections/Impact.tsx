import gsap from 'gsap';
import { useRef, useState } from 'react';
import { scrollToTarget, useScrollScene } from '../motion';
import { presetPair } from '../state';
import { Disclosure, Picture, SectionIndex, formatId } from '../ui';
import { Enso } from './impact/Enso';
import { ImpactFactors, ImpactLedger, ImpactLimits } from './impact/Details';
import { Scaler } from './impact/Scaler';

/**
 * Dampak: back into daylight. The paper rises over the interlude with rounded shoulders; the heading is followed by
 * the one picture that matters here, the sunny-preset energy split, as three large instrument numbers that count up
 * once and a single proportional bar under them. Then a bright rooftop photograph with the "Bayangkan N atap" scaler
 * floating over its lower edge. All numbers come from simulate() on the preset; the limits stay one click away.
 */
export default function Impact() {
  const { dual } = presetPair('sunny');
  const lost = Math.max(0, dual.solarInputW - dual.electricalW - dual.usefulHeatW);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const root = useRef<HTMLElement>(null);

  const share = (w: number) => w / dual.solarInputW;
  const rows = [
    { key: 'in', label: 'Cahaya yang masuk', value: dual.solarInputW, tone: 'text-ink-3', sub: '' },
    { key: 'el', label: 'Listrik PV (sebelum pompa)', value: dual.electricalW, tone: 'text-ink', sub: 'e' },
    { key: 'th', label: 'Jadi air hangat', value: dual.usefulHeatW, tone: 'text-heat-ink', sub: 'th' },
  ] as const;

  useScrollScene(root, ({ desktop }) => {
    root.current?.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
      const to = Number(el.dataset.count);
      const o = { v: 0 };
      gsap.to(o, {
        v: to,
        duration: 1.6,
        ease: 'power3.out',
        scrollTrigger: { trigger: '[data-stats]', start: 'top 80%', once: true },
        onUpdate: () => {
          el.textContent = formatId(o.v, 0);
        },
        onComplete: () => {
          el.textContent = formatId(to, 0);
        },
      });
    });
    gsap.fromTo('[data-bar] > span', { scaleX: 0 }, { scaleX: 1, transformOrigin: '0 50%', duration: 1.4, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '[data-stats]', start: 'top 75%', once: true } });
    gsap.fromTo('[data-photo]', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '[data-photo-frame]', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('[data-float]', { y: desktop ? 120 : 40 }, { y: 0, ease: 'none', scrollTrigger: { trigger: '[data-photo-frame]', start: 'top 80%', end: 'bottom 60%', scrub: 0.6 } });
  });

  const openLimits = () => {
    setLimitsOpen(true);
    requestAnimationFrame(() => scrollToTarget('#dampak-asumsi', { offset: -120 }));
  };

  return (
    <section
      ref={root}
      id="dampak"
      aria-labelledby="dampak-title"
      className="relative z-10 -mt-10 scroll-mt-14 rounded-t-[32px] bg-paper pt-24 shadow-[0_-40px_80px_-40px_rgb(17_18_20/0.4)] lg:-mt-16 lg:rounded-t-[48px] lg:pt-36"
    >
      <div className="page-wrap">
        <SectionIndex n="03" label="Dampak" />
        <h2 id="dampak-title" className="mt-5 max-w-[16ch] text-h2 text-ink">
          Dari 1 panel, dua hasil yang bisa dipakai.
        </h2>

        <div data-stats className="mt-16 lg:mt-24">
          <dl className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {rows.map((r) => (
              <div key={r.key} className="border-t border-line pt-5">
                <dt className="text-body text-ink-2">{r.label}</dt>
                <dd className={`m-0 mt-3 flex items-baseline gap-2 ${r.tone}`}>
                  <span data-count={Math.round(r.value)} className="num text-stat">
                    {formatId(r.value, 0)}
                  </span>
                  <span className="num text-readout-m text-ink-3">
                    W{r.sub ? <sub className="text-[0.6em]">{r.sub}</sub> : null}
                  </span>
                </dd>
                {r.key !== 'in' ? (
                  <p className="mt-2 text-small text-ink-3">
                    <span className="num">{formatId(share(r.value) * 100, 0)}%</span> dari cahaya yang masuk
                  </p>
                ) : (
                  <p className="mt-2 text-small text-ink-3">siang cerah, satu panel</p>
                )}
              </div>
            ))}
          </dl>

          {/* one proportional bar: electricity · useful heat · the rest (lost or not absorbed) */}
          <div data-bar aria-hidden="true" className="mt-12 flex h-3 w-full gap-1 overflow-hidden rounded-full">
            <span className="block rounded-full bg-ink" style={{ flexGrow: share(dual.electricalW) }} />
            <span className="block rounded-full bg-heat" style={{ flexGrow: share(dual.usefulHeatW) }} />
            <span className="block rounded-full bg-line-strong" style={{ flexGrow: share(lost) }} />
          </div>
          <p className="mt-4 text-small text-ink-3">
            Sisanya, <span className="num">{formatId(lost, 0)}</span> W, hilang ke udara, terpantul, atau tidak terserap. Air masuk{' '}
            <span className="num">{formatId(dual.inputs.inletC, 0)}</span> °C, dan panasnya hanya berguna bila ada yang memakai air hangat itu.
          </p>
        </div>
      </div>

      {/* bright rooftop band + the floating scaler */}
      <div className="page-wrap mt-24 lg:mt-36">
        <div data-photo-frame className="relative h-[clamp(320px,62svh,640px)] overflow-hidden rounded-[20px] lg:rounded-[28px]">
          <div data-photo className="absolute inset-x-0 -inset-y-[10%] will-change-transform">
            <Picture fill name="roof-aisle" alt="Ilustrasi konteks: deretan panel surya di atap bangunan industri pada siang cerah." position="50% 60%" />
          </div>
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgb(246_245_242/0)_40%,rgb(246_245_242/0.0)_70%,rgb(17_18_20/0.25)_100%)]" />
        </div>
        <div data-float className="relative z-10 mx-auto -mt-28 w-[calc(100%-2rem)] rounded-[24px] border border-line/70 bg-surface p-6 shadow-3 sm:-mt-40 sm:w-[calc(100%-4rem)] sm:p-8 lg:-mt-56 lg:w-[calc(100%-8rem)] lg:p-12">
          <Scaler onOpenAssumptions={openLimits} />
        </div>
      </div>

      <div className="page-wrap pb-24 pt-12 sm:pt-16 lg:pb-32">
        <div id="dampak-asumsi" className="max-w-4xl">
          <Disclosure title="Apa yang belum dihitung" level={3} open={limitsOpen} onOpenChange={setLimitsOpen}>
            <ImpactLimits />
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-label text-ink">Konteks iklim: El Niño dan La Niña</p>
              <Enso />
            </div>
          </Disclosure>
          <Disclosure title="Faktor emisi dan cara hitung" level={3}>
            <ImpactFactors />
            <div className="mt-6 border-t border-line pt-5">
              <ImpactLedger />
            </div>
          </Disclosure>
        </div>
      </div>
    </section>
  );
}
