import gsap from 'gsap';
import { useRef } from 'react';
import { JEDA } from '../content/jeda';
import { useScrollScene } from '../motion';
import { AmbientVideo } from '../ui';

/**
 * Jeda (#jeda): a cinematic pause between the product (02) and how it decides (03): a full-screen macro of cell
 * surfaces and two lines that arrive one after the other while the frame passes through the viewport. It is NOT
 * pinned: the scrub runs on the frame's own travel through the screen, so the page never stops moving.
 * Reduced motion: the two lines simply sit over the still.
 */
export default function Interlude() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, () => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '[data-frame]', start: 'top 80%', end: 'bottom 45%', scrub: 0.6 },
    });
    tl.fromTo('[data-media]', { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
      .fromTo('[data-l1]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.1)
      .fromTo('[data-l2]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.45)
      .to('[data-l1]', { autoAlpha: 0.35, duration: 0.2 }, 0.6);
  });

  return (
    <section ref={root} id="jeda" aria-label={JEDA.label} className="relative bg-stage-0 text-white">
      <div data-frame className="relative h-[88svh] min-h-[520px] overflow-hidden">
        <div data-media className="absolute inset-0 will-change-transform">
          <AmbientVideo src="/videos/cell-macro.mp4" poster="cell-macro" alt={JEDA.alt} />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_60%,rgb(14_17_20/0.75)_0%,rgb(14_17_20/0.35)_60%,rgb(14_17_20/0.6)_100%)]" />
        <div className="page-wrap relative flex h-full flex-col justify-center">
          <p data-l1 className="max-w-[18ch] text-display-l text-white">
            {JEDA.lines[0]}
          </p>
          <p data-l2 className="mt-8 max-w-[18ch] text-display-l text-white/60">
            {JEDA.lines[1]}
          </p>
        </div>
      </div>
    </section>
  );
}
