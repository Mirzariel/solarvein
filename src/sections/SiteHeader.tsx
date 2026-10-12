import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ButtonLink, Logo, cx } from '../ui';

/**
 * Header: transparan di atas foto pembuka (#awal), lalu kertas padat setelah gulir (transisi halus).
 * Tautan: Pengalaman · Di dalam · Dampak · Lab · Perbandingan. Garis bawah geser mengikuti bagian aktif.
 * Scroll-spy memakai posisi (bukan IntersectionObserver) agar bagian yang dimuat malas tetap terdeteksi.
 */
const NAV = [
  { id: 'pengalaman', label: 'Pengalaman' },
  { id: 'di-dalam', label: 'Di dalam' },
  { id: 'dampak', label: 'Dampak' },
  { id: 'lab', label: 'Lab' },
  { id: 'perbandingan', label: 'Perbandingan' },
] as const;

const HEADER_H = 56;

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const [overPhoto, setOverPhoto] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  // Scroll-spy + "over the photo" detection, throttled with rAF.
  useEffect(() => {
    let raf = 0;
    const read = () => {
      raf = 0;
      const vh = window.innerHeight;
      let cur = '';
      for (const n of NAV) {
        const el = document.getElementById(n.id);
        if (el && el.getBoundingClientRect().top <= vh * 0.38) cur = n.id;
      }
      setActive(cur);
      const opening = document.getElementById('awal');
      // Transparan hanya di puncak halaman (scrollY ≤ 64) selama foto pembuka ada; lalu kertas padat.
      setOverPhoto(opening ? window.scrollY <= 64 && opening.getBoundingClientRect().bottom > HEADER_H : false);
      setScrolled(window.scrollY > 8);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Lazy sections appear after first paint: re-read when the document grows.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Sliding underline under the active desktop link.
  const measure = useCallback(() => {
    const nav = navRef.current;
    const el = active ? itemRefs.current[active] : null;
    if (!nav || !el) {
      setBar(null);
      return;
    }
    setBar({ x: el.offsetLeft, w: el.offsetWidth });
  }, [active]);
  useLayoutEffect(measure, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // The page opens on paper: the bar is transparent at the very top and turns into frosted paper once content passes under it.
  const bare = overPhoto && !scrolled && !open;
  const solid = true;

  return (
    <header
      data-over-photo="false"
      className={cx(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,color,backdrop-filter] duration-[200ms] ease-ui',
        bare ? 'border-transparent bg-transparent text-ink' : 'border-line/80 bg-paper/80 text-ink backdrop-blur-xl backdrop-saturate-150',
      )}
    >
      <div className="page-wrap flex h-14 items-center justify-between gap-4">
        <a
          href="#awal"
          className="flex min-h-11 items-center gap-3 rounded-sm"
          aria-label="SolarVein, kembali ke atas"
          onClick={(e) => {
            if (document.getElementById('awal')) return;
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <Logo className="text-[17px] text-ink" />
        </a>

        <nav ref={navRef} aria-label="Navigasi utama" className="relative hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const on = active === n.id;
            return (
              <a
                key={n.id}
                ref={(el) => {
                  itemRefs.current[n.id] = el;
                }}
                href={`#${n.id}`}
                aria-current={on ? 'location' : undefined}
                className={cx(
                  'flex h-14 items-baseline px-3 pt-[18px] text-button transition-colors duration-[220ms] ease-ui',
                  solid ? (on ? 'text-ink' : 'text-ink-2 hover:text-ink') : on ? 'text-white' : 'text-white/90 hover:text-white',
                )}
              >
                {n.label}
              </a>
            );
          })}
          <span
            aria-hidden="true"
            className={cx(
              'pointer-events-none absolute bottom-0 left-0 h-px transition-[transform,width,opacity,background-color] duration-[220ms] ease-ui',
              solid ? 'bg-ink' : 'bg-white',
              bar ? 'opacity-100' : 'opacity-0',
            )}
            style={{ width: bar?.w ?? 0, transform: `translateX(${bar?.x ?? 0}px)` }}
          />
        </nav>

        <div className="flex items-center gap-3">
          {active !== 'pengalaman' ? (
            <ButtonLink href="#pengalaman" variant="primary" size="sm" className="max-lg:hidden text-surface!">
              Coba simulasinya
            </ButtonLink>
          ) : null}
          <button
            ref={btnRef}
            type="button"
            className={cx(
              '-mr-3 inline-flex min-h-11 items-center rounded-sm px-3 text-button transition-colors duration-[220ms] md:hidden',
              solid ? 'text-ink hover:text-ink-2' : 'text-white hover:text-white/80',
            )}
            aria-expanded={open}
            aria-controls="menu-mobile"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Tutup' : 'Menu'}
          </button>
        </div>
      </div>

      <nav
        id="menu-mobile"
        aria-label="Navigasi utama (seluler)"
        hidden={!open}
        className="border-t border-line bg-paper text-ink md:hidden"
      >
        <ul className="page-wrap m-0 list-none py-2">
          {NAV.map((n) => (
            <li key={n.id}>
              <a
                href={`#${n.id}`}
                aria-current={active === n.id ? 'location' : undefined}
                onClick={() => setOpen(false)}
                className={cx(
                  'flex min-h-12 items-center rounded-sm px-3 py-3 text-prose transition-colors duration-[150ms]',
                  active === n.id ? 'bg-sunken text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                {n.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
