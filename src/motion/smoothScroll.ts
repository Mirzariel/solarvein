import { resolveHash } from '../sections/nav';
import gsap from 'gsap';
import Lenis from 'lenis';
import { ScrollTrigger } from './gsapConfig';

/**
 * Inertial page scroll (Lenis) driven by the GSAP ticker, so ScrollTrigger scenes and the scroll position move on the
 * same frame. Off under prefers-reduced-motion (native scroll, native anchor jumps). In-page anchor links are routed
 * through Lenis so they glide with the same easing and clear the fixed header.
 */
let lenis: Lenis | null = null;

export function getLenis(): Lenis | null {
  return lenis;
}

const HEADER_OFFSET = -56;

/** Scroll to an element, selector or y position; falls back to native scrolling when Lenis is off. */
export function scrollToTarget(target: string | HTMLElement | number, opts: { offset?: number; immediate?: boolean } = {}) {
  const offset = opts.offset ?? HEADER_OFFSET;
  if (lenis) {
    lenis.scrollTo(target, { offset, immediate: opts.immediate, duration: 1.4 });
    return;
  }
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : typeof target === 'number' ? null : target;
  const y = typeof target === 'number' ? target : el ? el.getBoundingClientRect().top + window.scrollY + offset : 0;
  window.scrollTo({ top: y, behavior: opts.immediate ? 'auto' : 'smooth' });
}

export function startSmoothScroll(): () => void {
  if (typeof window === 'undefined' || lenis) return () => {};
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};

  const instance = new Lenis({ lerp: 0.09, wheelMultiplier: 0.95, smoothWheel: true });
  lenis = instance;
  document.documentElement.classList.add('lenis-on');
  instance.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => instance.raf(time * 1000);
  gsap.ticker.add(tick);

  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest?.('a[href^="#"]') as HTMLAnchorElement | null;
    if (!a) return;
    const hash = a.getAttribute('href') ?? '';
    if (hash.length < 2) return;
    const el = document.getElementById(resolveHash(decodeURIComponent(hash.slice(1)))) ?? document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    if (window.location.hash !== hash) history.pushState(null, '', hash);
    // Always announce: sections that open on their hash (Lab › Rincian) must react to a repeated click too.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    instance.scrollTo(el, { offset: hash === '#awal' ? 0 : HEADER_OFFSET, duration: 1.4 });
  };
  document.addEventListener('click', onClick);

  return () => {
    document.removeEventListener('click', onClick);
    gsap.ticker.remove(tick);
    instance.destroy();
    document.documentElement.classList.remove('lenis-on');
    lenis = null;
  };
}
