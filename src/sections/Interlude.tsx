import gsap from 'gsap';
import { useRef } from 'react';
import { useScrollScene } from '../motion';
import { presetPair } from '../state';
import { AmbientVideo, formatId } from '../ui';

/**
 * Cinematic pause between the product (02) and its consequences (Dampak): a full-screen macro of cell surfaces.
 * Desktop pins it for a screen and a half while two lines arrive one after the other; the second carries the number
 * from the model. Mobile / reduced motion: the two lines simply sit over the still.
 */
export default function Interlude() {
  const root = useRef<HTMLElement>(null);
  const { dual } = presetPair('sunny');
  const notElectric = formatId(100 - (dual.electricalW / dual.solarInputW) * 100, 0);

  useScrollScene(root, ({ desktop }) => {
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: desktop
        ? { trigger: '[data-frame]', start: 'top top', end: '+=150%', pin: true, scrub: 0.6, anticipatePin: 1 }
        : { trigger: '[data-frame]', start: 'top 70%', end: 'bottom 60%', scrub: 0.6 },
    });
    tl.fromTo('[data-media]', { scale: 1.18 }, { scale: 1, duration: 1 }, 0)
      .fromTo('[data-l1]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.05)
      .fromTo('[data-l2]', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.3 }, 0.4)
      .to('[data-l1]', { autoAlpha: 0.35, duration: 0.2 }, 0.5);
  });

  return (
    <section ref={root} aria-label="Jeda: ke mana cahaya pergi" className="relative bg-stage-0 text-white">
      <div data-frame className="relative h-svh min-h-[560px] overflow-hidden">
        <div data-media className="absolute inset-0 will-change-transform">
          <AmbientVideo src="/videos/cell-macro.mp4" poster="cell-macro" alt="Ilustrasi konteks: permukaan sel surya dari dekat." />
        </div>
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(120%_80%_at_30%_60%,rgb(14_17_20/0.75)_0%,rgb(14_17_20/0.35)_60%,rgb(14_17_20/0.6)_100%)]" />
        <div className="page-wrap relative flex h-full flex-col justify-center">
          <p data-l1 className="max-w-[18ch] text-display-l text-white">
            Di siang cerah, sebagian besar cahaya tidak pernah jadi listrik.
          </p>
          <p data-l2 className="mt-8 max-w-[32ch] text-display-l text-white">
            <span className="num">{notElectric}%</span> berubah jadi panas atau terpantul. <span className="text-white/60">Bila ada yang memakai air hangat, SolarVein menangkap sebagian.</span>
          </p>
        </div>
      </div>
    </section>
  );
}
