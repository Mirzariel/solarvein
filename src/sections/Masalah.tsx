import gsap from 'gsap';
import { useRef } from 'react';
import { MASALAH } from '../content/masalah';
import { useScrollScene } from '../motion';
import { Disclosure, Evidence, Picture, SectionHeader, StatusDot } from '../ui';
import './masalah/Masalah.css';

/**
 * 01 Masalah: the two loads a tropical hotel pays for (hot water, humid fresh air), each with ONE published number,
 * then the sentence that frames the opportunity. Restrained editorial layout on paper: hairline-topped columns, mono
 * statistics, one picture captioned as an illustration. Numbers here are published, not simulated (tag: terbit).
 */
export default function Masalah() {
  const root = useRef<HTMLElement>(null);

  useScrollScene(root, ({ desktop }) => {
    gsap.fromTo(
      '[data-load]',
      { autoAlpha: 0, y: 28 },
      { autoAlpha: 1, y: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '[data-loads]', start: 'top 80%', once: true } },
    );
    if (desktop) {
      gsap.fromTo('[data-masalah-photo] img', { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: '[data-masalah-photo]', start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  });

  return (
    <section ref={root} id="masalah" aria-labelledby="masalah-judul" className="relative py-24 lg:py-32">
      <div className="page-wrap">
        <SectionHeader id="masalah-judul" index={MASALAH.index} title={MASALAH.title} lead={MASALAH.lead} />

        <div className="mt-14 grid gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-16">
          <div data-loads className="grid gap-10 sm:grid-cols-2 sm:gap-8 lg:col-span-7">
            {MASALAH.loads.map((l) => (
              <article key={l.id} data-load className="masalah-load border-t border-line-strong pt-5">
                <h3 className="m-0 text-body font-medium text-ink">
                  <StatusDot tone={l.id === 'air-panas' ? 'heat' : 'cool'} className="text-body font-medium">
                    {l.name}
                  </StatusDot>
                </h3>
                <p className="mt-3 max-w-[34ch] text-body text-ink-2 sm:min-h-[6.5rem]">{l.sentence}</p>
                <p className="mt-6 flex flex-wrap items-baseline gap-x-2">
                  <span className="num text-readout-xl text-ink">{l.stat}</span>
                  <span className="num text-mono-s text-ink-2">{l.statUnit}</span>
                  <Evidence tag="terbit" refId={l.refId} className="self-center" />
                </p>
                <p className="mt-2 max-w-[30ch] text-small text-ink-2">{l.statCaption}</p>
              </article>
            ))}
          </div>

          <figure className="m-0 lg:col-span-5">
            <div data-masalah-photo className="relative aspect-[4/3] overflow-hidden rounded-[16px] lg:aspect-[4/5] lg:rounded-[20px]">
              <Picture fill name="roof-aisle" alt={MASALAH.picture.alt} position="50% 50%" sizes="(min-width: 1024px) 40vw, 100vw" maxWidth={1280} />
            </div>
            <figcaption className="mt-3 text-small text-ink-3">{MASALAH.picture.caption}</figcaption>
          </figure>
        </div>

        <p className="mt-12 flex max-w-[60ch] items-start gap-2 text-small text-ink-3">
          <Evidence tag="terbit" label className="mt-0.5 shrink-0" />
          <span>{MASALAH.statement}</span>
        </p>

        <div className="mt-6 max-w-[44rem]">
          <Disclosure title={MASALAH.disclosure.title} hint="BPS, audit hotel, faktor emisi" level={3}>
            <ul className="m-0 list-none space-y-4 p-0 text-small">
              {MASALAH.disclosure.items.map((it) => (
                <li key={it.refId} className="flex items-start gap-3">
                  <Evidence tag="terbit" refId={it.refId} className="mt-0.5 shrink-0" />
                  <span>{it.text}</span>
                </li>
              ))}
            </ul>
          </Disclosure>
        </div>
      </div>
    </section>
  );
}
