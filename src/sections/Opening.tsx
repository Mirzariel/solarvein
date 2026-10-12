import gsap from 'gsap';
import { useRef, type CSSProperties } from 'react';
import { useScrollScene } from '../motion';
import { presetPair } from '../state';
import { AmbientVideo, ArrowIcon, ButtonLink, formatId } from '../ui';

/**
 * Opening (#awal): daylight, not dusk. The headline sits on the warm paper in ink; below it a wide video card of a
 * panel array under a clear sky. On load the headline lines unmask upward and the card rises. While scrolling, the
 * card opens from an inset rounded frame to full bleed (clip-path, scrubbed), the clip drifts slower than the frame
 * and the headline lifts away: the page "walks into" the picture before 01 begins.
 * Reduced motion: nothing animates, the card is simply a full-width rounded frame with the still poster.
 */
export default function Opening() {
  const root = useRef<HTMLElement>(null);
  // Shares of the incoming sun on the sunny preset, from the same model as everything else on the page.
  const { dual } = presetPair('sunny');
  const pct = (w: number) => formatId((w / dual.solarInputW) * 100, 0);

  const d = (s: number) => ({ '--d': `${s}s` }) as CSSProperties;

  useScrollScene(root, ({ desktop }) => {
    const card = root.current?.querySelector<HTMLElement>('[data-card]');
    const media = root.current?.querySelector<HTMLElement>('[data-media]');
    if (!card || !media) return;
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter-x')) || 24;
    const inset = () => Math.max(gutter, (window.innerWidth - 1280) / 2);
    const r = desktop ? 28 : 20;
    gsap.fromTo(
      card,
      { clipPath: () => `inset(0px ${inset()}px 0px ${inset()}px round ${r}px)` },
      {
        clipPath: 'inset(0px 0px 0px 0px round 0px)',
        ease: 'none',
        // From the very top of the page until the card reaches the header: always starts at rest, whatever the viewport height.
        scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${Math.max(200, card.offsetTop - window.innerHeight * 0.08)}`, scrub: 0.6, invalidateOnRefresh: true },
      },
    );
    gsap.fromTo(media, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.to('[data-head]', { y: desktop ? -80 : -40, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${Math.max(200, card.offsetTop)}`, scrub: true, invalidateOnRefresh: true } });
    gsap.fromTo(
      '[data-card-note]',
      { autoAlpha: 0, y: 24 },
      { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top 45%', end: 'top 5%', scrub: true } },
    );
  });

  return (
    <section ref={root} id="awal" aria-labelledby="awal-judul" className="daylight relative isolate overflow-clip pb-16 pt-28 sm:pt-36 lg:pb-24 lg:pt-40">
      <div data-head className="page-wrap">
        <h1 id="awal-judul" className="text-display-xl text-ink">
          <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
            <span data-line className="intro-line block" style={d(0.1)}>
              Matahari memberi dua hal.
            </span>
          </span>{' '}
          <span className="block overflow-hidden pb-[0.2em] -mb-[0.2em]">
            <span data-line className="intro-line block text-ink-3" style={d(0.2)}>
              Ambil keduanya.
            </span>
          </span>
        </h1>
        <div className="mt-8 flex flex-col gap-8 sm:mt-10 md:flex-row md:items-end md:justify-between">
          <p data-fade className="intro-fade max-w-[34ch] text-lead text-ink-2" style={d(0.5)}>
            Listrik dan air hangat dari satu panel. Saat hujan, panel bisa membuang panas dari air yang perlu didinginkan.
          </p>
          <div data-fade className="intro-fade flex flex-wrap items-center gap-x-6 gap-y-3" style={d(0.6)}>
            <ButtonLink href="#pengalaman" variant="primary" className="min-h-12 rounded-full px-6 text-surface!">
              Coba simulasinya
            </ButtonLink>
            <a href="#di-dalam" className="group inline-flex min-h-11 items-center gap-2 text-button text-ink">
              Lihat di dalamnya
              <ArrowIcon size={16} className="transition-transform duration-[220ms] ease-ui group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>

      {/* the picture: inset card → full bleed while scrolling */}
      <div
        data-card
        style={{ ...d(0.4), '--rise': '64px' } as CSSProperties}
        className="intro-fade relative mt-14 h-[clamp(380px,74svh,860px)] overflow-hidden bg-sunken [clip-path:inset(0_var(--gutter-x)_0_var(--gutter-x)_round_20px)] sm:mt-16 lg:[clip-path:inset(0_max(var(--gutter-x),calc((100vw-1280px)/2))_0_max(var(--gutter-x),calc((100vw-1280px)/2))_round_28px)]"
      >
        <div data-media className="absolute inset-0 will-change-transform">
          <AmbientVideo
            src="/videos/hero-array.mp4"
            poster="hero-array"
            priority
            position="60% 40%"
            alt="Ilustrasi konteks: deretan panel surya di bawah langit pagi yang cerah."
          />
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(17_18_20/0)_55%,rgb(17_18_20/0.45)_100%)]" />
        <div data-card-note className="page-wrap absolute inset-x-0 bottom-0 pb-8 text-white sm:pb-12">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="max-w-[24ch] text-h3 text-white">Cahaya jadi listrik dan air hangat. Sisanya hilang jadi panas.</p>
              <p className="mt-2 text-small text-white/70">Per panel, siang cerah, ada beban air panas · video ilustrasi, bukan produk SolarVein</p>
            </div>
            <dl className="flex gap-8 sm:gap-12">
              <div>
                <dt className="text-small text-white/70">Jadi listrik</dt>
                <dd className="num m-0 text-readout-l text-white">{pct(dual.electricalW)}%</dd>
              </div>
              <div>
                <dt className="text-small text-white/70">Jadi air hangat</dt>
                <dd className="num m-0 text-readout-l text-stage-heat">{pct(dual.usefulHeatW)}%</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
