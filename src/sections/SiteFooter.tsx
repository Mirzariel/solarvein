import { useState } from 'react';
import { SIM_BADGE } from '../sim/system';
import { LogoWordmark, cx } from '../ui';
import { CREDITS } from './credits';
import { SECTIONS } from './nav';

/** Footer links follow the header: the same numbered sections, from nav.ts. */
const LINKS = SECTIONS.filter((s) => s.nav).map((s) => ({ href: `#${s.id}`, label: s.label }));

/** Graphite footer: the honest statement, the section links, media credits on demand, and the wordmark set large. */
export default function SiteFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="overflow-hidden bg-stage-0 text-stage-ink">
      <div className="page-wrap pb-10 pt-16 lg:pt-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <div className="md:col-span-6">
            <p className="max-w-[44ch] text-body-l text-stage-ink">
              Simulasi konseptual untuk edukasi dan penelitian. Belum ada data ukur, bukan hasil CFD, dan bukan produk bersertifikat. Hotel dan cuaca dalam model adalah ilustrasi.
            </p>
            <p className="mt-4 max-w-[44ch] text-small text-stage-ink-2">
              Versi pengembangan entri HORIZON 2026 (KAMASE UGM); isinya dapat berbeda dari esai yang dikirim, dan perbedaannya dicatat di Validasi.
            </p>
          </div>
          <nav aria-label="Navigasi footer" className="md:col-span-3">
            <ul className="m-0 list-none space-y-1 p-0">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-flex min-h-9 pointer-coarse:min-h-11 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="m-0 list-none space-y-1 p-0 md:col-span-3">
            <li>
              <a href="#lab" className="inline-flex min-h-9 pointer-coarse:min-h-11 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white">
                Lab
              </a>
            </li>
            <li>
              <a href="#pustaka" className="inline-flex min-h-9 pointer-coarse:min-h-11 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white">
                Daftar pustaka
              </a>
            </li>
            <li>
              <button
                type="button"
                aria-expanded={open}
                aria-controls="kredit-media"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex min-h-9 pointer-coarse:min-h-11 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white"
              >
                Kredit foto & video
              </button>
            </li>
          </ul>
        </div>

        <div
          id="kredit-media"
          role="region"
          aria-label="Kredit foto dan video"
          inert={!open}
          className={cx('grid transition-[grid-template-rows,opacity] duration-[260ms] ease-ui', open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0')}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="pt-8 text-small text-stage-ink-2">
              <p className="max-w-[64ch]">Video dan foto dipakai sebagai ilustrasi konteks; bukan pemasangan SolarVein yang nyata.</p>
              <ul className="mt-3 grid list-none gap-x-8 gap-y-2 p-0 sm:grid-cols-2">
                {CREDITS.map((c) => (
                  <li key={c.file}>
                    <a href={c.source} target="_blank" rel="noopener noreferrer" className="text-stage-ink underline decoration-stage-line underline-offset-4 hover:decoration-stage-ink">
                      {c.title}
                    </a>
                    <span> · {c.provider}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <LogoWordmark className="mt-20 w-full text-white/90 lg:mt-28" />
        <p className="mt-6 text-small text-stage-ink-2">SolarVein · pemulihan panas surya adaptif untuk perhotelan rendah karbon · {SIM_BADGE}</p>
      </div>
    </footer>
  );
}
