import gsap from 'gsap';
import { useRef } from 'react';
import { JEDA_LEMBAP } from '../content/jeda';
import { useScrollScene } from '../motion';
import { climateAt, dewPointC } from '../sim/system';
import { Evidence, Picture, formatId } from '../ui';

/**
 * Jeda B (#jeda-lembap): the humidity mood before the desiccant path. Graphite, short, unpinned: two lines and the one
 * pair of numbers that earns them, read from the same deterministic weather the sim uses (a rainy afternoon, 15:00).
 * The picture slot uses an existing photo, greyed and dimmed to near-black, until a condensation photograph is added
 * (swap `name` below; caption stays "Ilustrasi, bukan dokumentasi proyek").
 * NOT wired into App.tsx by this worker; the lead mounts it between #sehari and #desikan.
 */
export default function InterludeHumid() {
  const root = useRef<HTMLElement>(null);
  const c = climateAt('hujan', 15);
  const rh = c.rh * 100;
  const w = c.humidityRatio * 1000;
  const dew = dewPointC(c.humidityRatio);

  useScrollScene(root, () => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '[data-frame]', start: 'top 80%', end: 'bottom 50%', scrub: 0.6 },
    });
    tl.fromTo('[data-media]', { scale: 1.12, autoAlpha: 0.0 }, { scale: 1, autoAlpha: 0.35, duration: 1 }, 0)
      .fromTo('[data-l1]', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.1)
      .fromTo('[data-l2]', { autoAlpha: 0, y: 32 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.4)
      .fromTo('[data-nums]', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.25 }, 0.6);
  });

  return (
    <section ref={root} id="jeda-lembap" aria-label={JEDA_LEMBAP.label} className="relative bg-stage-0 text-white">
      <div data-frame className="relative flex min-h-[70svh] items-center overflow-hidden py-24">
        <div data-media aria-hidden="true" className="absolute inset-0 opacity-35 will-change-transform">
          <Picture fill name="cell-macro" alt="" position="50% 40%" maxWidth={1280} imgClassName="grayscale" />
        </div>
        <div className="page-wrap relative w-full">
          <p data-l1 className="max-w-[28ch] text-display-l text-white">
            {JEDA_LEMBAP.lines[0]}
          </p>
          <p data-l2 className="mt-6 max-w-[28ch] text-display-l text-white/60">
            {JEDA_LEMBAP.lines[1]}
          </p>
          <dl data-nums className="mt-12 flex flex-wrap items-end gap-x-12 gap-y-6">
            <div>
              <dt className="text-small text-white/70">Kelembapan relatif udara luar, hari hujan 15.00</dt>
              <dd className="num m-0 flex items-baseline gap-2 text-readout-l text-stage-cool">
                {formatId(rh, 0)}%
                <Evidence tag="simulasi" inverse className="self-center" />
              </dd>
            </div>
            <div>
              <dt className="text-small text-white/70">Kadar uap air</dt>
              <dd className="num m-0 text-readout-l text-stage-cool">
                {formatId(w, 1)}
                <span className="ml-1 text-mono-s text-white/70">g/kg udara kering</span>
              </dd>
            </div>
            <div>
              <dt className="text-small text-white/70">Titik embun</dt>
              <dd className="num m-0 text-readout-l text-white">
                {formatId(dew, 1)}
                <span className="ml-1 text-mono-s text-white/70">°C</span>
              </dd>
            </div>
          </dl>
          <p className="mt-8 text-small text-white/60">Ilustrasi, bukan dokumentasi proyek</p>
        </div>
      </div>
    </section>
  );
}
