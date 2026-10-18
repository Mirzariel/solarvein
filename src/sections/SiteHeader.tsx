import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SIM_BADGE } from '../sim/system';
import { ButtonLink, EvidenceDot, Logo, cx } from '../ui';
import { getLenis } from '../motion';
import { SECTION, SECTIONS, resolveHash } from './nav';

/**
 * Header: transparan di atas foto pembuka (#awal), lalu kertas padat setelah gulir (transisi halus).
 * Tautan dan urutannya dari nav.ts (SECTIONS dengan nav: true); tombol Lab di kanan; lencana "Simulasi · belum ada data ukur"
 * selalu terlihat (lengkap di layar lebar, ringkas di layar sempit). Garis bawah geser mengikuti bagian aktif.
 * Scroll-spy membaca posisi elemen yang disimpan (tanpa hit-testing) dan menyegarkan daftarnya saat dokumen bertambah; bagian tanpa
 * tautan: Di dalam kolektor menyorot Sistem; Jeda, Desikan dan Penutup tidak menyorot apa pun (bukan bagian dari tautan
 * mana pun); Lab menyorot tombol Lab. Di atas bagian gelap, header memakai warna gelap yang tenang.
 */
const NAV = SECTIONS.filter((s) => s.nav);

const HEADER_H = 56;

/** Lazy section chunks in page order (the same modules App.tsx lazy-loads; the module cache dedupes). */
const LOADERS = [
  () => import('./Inside'),
  () => import('./Interlude'),
  () => import('./RouterSection'),
  () => import('./DayAtHotel'),
  () => import('./InterludeHumid'),
  () => import('./Desiccant'),
  () => import('./Impact'),
  () => import('./Validation'),
  () => import('./Lab'),
];

/** Any of these means the visitor is driving: the cold-load deep-link correction stands down. */
const TAKEOVER = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

interface SpyCache {
  sections: { id: string; el: HTMLElement }[];
  dark: HTMLElement[];
}

/** Section and dark-band elements, looked up once and refreshed only when the document grows (lazy chunks mounting). */
function buildCache(): SpyCache {
  const sections: SpyCache['sections'] = [];
  for (const s of SECTIONS) {
    const el = document.getElementById(s.id);
    if (el) sections.push({ id: s.id, el });
  }
  return { sections, dark: Array.from(document.querySelectorAll<HTMLElement>('section.bg-stage-0, footer.bg-stage-0, [data-dark-band]')) };
}

/** Active nav id: the last section whose top passed the reading line (rects of cached elements only, no hit-testing). */
function readActive(c: SpyCache, vh: number): string {
  let cur = '';
  for (const { id, el } of c.sections) {
    if (el.getBoundingClientRect().top > vh * 0.38) continue;
    const def = SECTION[id];
    if (def?.nav || id === 'lab') cur = id;
    else if (id === 'sistem-dalam') cur = 'sistem';
    else cur = '';
  }
  return cur;
}

/** A dark chapter is directly under the bar. */
function readDark(c: SpyCache): boolean {
  const y = HEADER_H + 4;
  return c.dark.some((el) => {
    const r = el.getBoundingClientRect();
    return r.top <= y && r.bottom > y;
  });
}

/** Permanent badge: every number on the site is simulated. Dot shape = simulation (half-filled). */
function SimBadge({ dark, className }: { dark?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 text-label', dark ? 'text-stage-ink-2' : 'text-ink-2', className)} title={SIM_BADGE} aria-label={SIM_BADGE}>
      <EvidenceDot tag="simulasi" />
      <span aria-hidden="true" className="hidden xl:inline">
        {SIM_BADGE}
      </span>
      <span aria-hidden="true" className="xl:hidden">
        Simulasi
      </span>
    </span>
  );
}

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>('');
  const [overPhoto, setOverPhoto] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);

  // Scroll-spy + "over the photo" detection, throttled with rAF.
  useEffect(() => {
    let raf = 0;
    let cache = buildCache();
    const read = () => {
      raf = 0;
      const vh = window.innerHeight;
      setActive(readActive(cache, vh));
      const opening = document.getElementById('awal');
      // Transparan hanya di puncak halaman (scrollY ≤ 64) selama foto pembuka ada; lalu kertas padat.
      setOverPhoto(opening ? window.scrollY <= 64 && opening.getBoundingClientRect().bottom > HEADER_H : false);
      setScrolled(window.scrollY > 8);
      // a dark chapter under the bar (Di dalam, Jeda, footer, dark beats) gets a quiet dark tint
      setDark(readDark(cache));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    // Lazy sections appear after first paint: re-read when the document grows.
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            cache = buildCache();
            onScroll();
          })
        : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Cold-load deep links (#dampak, #pustaka, old #perbandingan / #lab-rincian ...): lazy sections mount after first paint
  // and push the layout, so the target is re-scrolled until its position has been stable for ~500 ms (cap 6 s),
  // or until the visitor takes over by wheel, touch, key or pointer.
  useEffect(() => {
    const raw = decodeURIComponent(window.location.hash.slice(1));
    if (!raw) return;
    const id = resolveHash(raw);
    // the visitor asked for a place far down: every chunk is needed now, so load them all at once
    for (const load of LOADERS) void load().catch(() => {});
    const t0 = performance.now();
    let lastKey = '';
    let stableSince = 0;
    let done = false;
    let timer = 0;
    const stop = () => {
      done = true;
      window.clearTimeout(timer);
      for (const ev of TAKEOVER) window.removeEventListener(ev, stop);
    };
    for (const ev of TAKEOVER) window.addEventListener(ev, stop, { passive: true });
    const tick = () => {
      if (done) return;
      const now = performance.now();
      const el = document.getElementById(id);
      if (el) {
        if (id !== raw) history.replaceState(null, '', '#' + id);
        const offset = id === 'awal' ? 0 : -HEADER_H;
        const want = Math.max(0, el.getBoundingClientRect().top + window.scrollY + offset);
        const key = `${Math.round(want)}|${document.documentElement.scrollHeight}`;
        if (key !== lastKey || Math.abs(window.scrollY - want) > 2) {
          lastKey = key;
          stableSince = now;
          // absolute, immediate jump: Lenis' own element maths can lag behind a layout that is still moving
          const lenis = getLenis();
          if (lenis) lenis.scrollTo(want, { immediate: true, force: true });
          else window.scrollTo(0, want);
        } else if (now - stableSince >= 500 && !document.querySelector('[aria-busy="true"]')) {
          stop();
          return;
        }
      }
      if (now - t0 > 6000) {
        stop();
        return;
      }
      timer = window.setTimeout(tick, 100);
    };
    timer = window.setTimeout(tick, 0);
    return stop;
  }, []);

  // Staged warm-up of the lazy section chunks: one per idle slice (never all at once), starting right after first
  // paint, so the first scroll into Masalah/Sistem does not queue behind a burst of module evaluation.
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let i = 0;
    let t = 0;
    const next = () => {
      const load = LOADERS[i++];
      if (!load) return;
      void load().catch(() => {});
      t = window.setTimeout(schedule, 250);
    };
    const schedule = () => {
      if (w.requestIdleCallback) w.requestIdleCallback(next, { timeout: 1500 });
      else next();
    };
    t = window.setTimeout(schedule, 900);
    return () => window.clearTimeout(t);
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
  const solid = !dark;

  return (
    <header
      data-over-photo="false"
      className={cx(
        'fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,color,backdrop-filter] duration-[200ms] ease-ui',
        bare
          ? 'border-transparent bg-transparent text-ink'
          : dark
            ? 'border-stage-line bg-stage-0/85 text-white backdrop-blur-xl'
            : 'border-line/80 bg-paper/80 text-ink backdrop-blur-xl backdrop-saturate-150',
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
          <Logo className={cx('text-[17px]', dark ? 'text-white' : 'text-ink')} />
        </a>

        <nav ref={navRef} aria-label="Navigasi utama" className="relative hidden items-center gap-1 lg:flex">
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

        <div className="flex items-center gap-4">
          <SimBadge dark={dark} />
          <ButtonLink
            href="#lab"
            variant={dark ? 'stage' : 'secondary'}
            size="sm"
            aria-current={active === 'lab' ? 'location' : undefined}
            className={cx('max-lg:hidden', active === 'lab' && (dark ? 'bg-white/10' : 'bg-sunken'))}
          >
            Lab
          </ButtonLink>
          <button
            ref={btnRef}
            type="button"
            className={cx(
              '-mr-3 inline-flex min-h-11 items-center rounded-sm px-3 text-button transition-colors duration-[220ms] lg:hidden',
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
        className="border-t border-line bg-paper text-ink lg:hidden"
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
          <li>
            <a
              href="#lab"
              aria-current={active === 'lab' ? 'location' : undefined}
              onClick={() => setOpen(false)}
              className={cx(
                'flex min-h-12 items-center rounded-sm px-3 py-3 text-prose transition-colors duration-[150ms]',
                active === 'lab' ? 'bg-sunken text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              Lab
            </a>
          </li>
          <li className="px-3 py-3 text-small text-ink-2">{SIM_BADGE}</li>
        </ul>
      </nav>
    </header>
  );
}
