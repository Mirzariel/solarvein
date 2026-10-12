import { useState } from 'react';
import { LogoWordmark, cx } from '../ui';
import { CREDITS } from './credits';

const LINKS = [
  { href: '#pengalaman', label: 'Pengalaman' },
  { href: '#di-dalam', label: 'Di dalam' },
  { href: '#dampak', label: 'Dampak' },
  { href: '#lab', label: 'Lab' },
  { href: '#perbandingan', label: 'Perbandingan' },
] as const;

/** Graphite footer: the honest statement, the section links, media credits on demand, and the wordmark set large. */
export default function SiteFooter() {
  const [open, setOpen] = useState(false);

  return (
    <footer className="overflow-hidden bg-stage-0 text-stage-ink">
      <div className="page-wrap pb-10 pt-16 lg:pt-24">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-12">
          <p className="max-w-[40ch] text-body-l text-stage-ink md:col-span-6">
            Simulasi konseptual untuk edukasi. Bukan hasil CFD, belum divalidasi di lapangan, dan bukan produk bersertifikat.
          </p>
          <nav aria-label="Navigasi footer" className="md:col-span-3">
            <ul className="m-0 list-none space-y-1 p-0">
              {LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} className="inline-flex min-h-9 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <ul className="m-0 list-none space-y-1 p-0 md:col-span-3">
            <li>
              <a href="#lab-rincian" className="inline-flex min-h-9 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white">
                Asumsi dan keterbatasan
              </a>
            </li>
            <li>
              <button
                type="button"
                aria-expanded={open}
                aria-controls="kredit-media"
                onClick={() => setOpen((v) => !v)}
                className="inline-flex min-h-9 items-center text-body text-stage-ink-2 transition-colors duration-[200ms] hover:text-white"
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
        <p className="mt-6 text-small text-stage-ink-2">SolarVein Liquid · simulasi PVT dua arah</p>
      </div>
    </footer>
  );
}
