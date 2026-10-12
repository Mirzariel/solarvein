import gsap from 'gsap';
import { useRef } from 'react';
import { useScrollScene } from '../motion';
import { ArrowIcon, ButtonLink, LogoMark, Picture } from '../ui';

/**
 * Closing (#penutup): a calm daylight ending. The mark, one confident line, one honest sentence and the two actions,
 * centred on the paper; under them a wide rooftop photograph that settles from a slight zoom as it enters.
 */
export default function Closing() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, ({ desktop }) => {
    gsap.fromTo(
      '[data-closing-photo]',
      { scale: desktop ? 0.88 : 0.95, borderRadius: desktop ? 40 : 24 },
      { scale: 1, borderRadius: desktop ? 28 : 20, ease: 'none', scrollTrigger: { trigger: '[data-closing-photo]', start: 'top bottom', end: 'top 25%', scrub: 0.6 } },
    );
    gsap.fromTo('[data-closing-photo] img', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '[data-closing-photo]', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('[data-closing-copy] > *', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '[data-closing-copy]', start: 'top 80%', once: true } });
  });

  return (
    <section ref={root} id="penutup" aria-labelledby="penutup-judul" className="daylight relative overflow-clip border-t border-line pb-20 pt-28 lg:pb-28 lg:pt-40">
      <div data-closing-copy className="page-wrap flex flex-col items-center text-center">
        <LogoMark className="h-12 w-auto text-ink lg:h-14" />
        <h2 id="penutup-judul" className="mt-10 text-display-xl text-ink">
          <span className="block">Atap yang sama.</span> <span className="block text-ink-3">Dua manfaat.</span>
        </h2>
        <p className="mt-8 max-w-[40ch] text-lead text-ink-2">SolarVein masih sebuah simulasi, dibuat supaya idenya bisa diuji, dihitung, dan dibantah.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-4">
          <ButtonLink href="#pengalaman" variant="primary" size="lg" className="text-surface!">
            Kembali ke simulasi
          </ButtonLink>
          <a href="#lab-rincian" className="group inline-flex min-h-11 items-center gap-2 text-button text-ink">
            Baca asumsi dan batasnya
            <ArrowIcon size={16} className="transition-transform duration-[220ms] ease-ui group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>

      <div className="page-wrap mt-20 lg:mt-28">
        <div data-closing-photo className="relative h-[clamp(300px,60svh,680px)] overflow-hidden rounded-[20px] will-change-transform lg:rounded-[28px]">
          <Picture fill name="roof-array" alt="Ilustrasi konteks: atap industri yang dipenuhi panel surya di bawah langit cerah." position="50% 55%" />
        </div>
      </div>
    </section>
  );
}
