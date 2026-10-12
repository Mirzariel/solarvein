import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { RefObject } from 'react';
import { ScrollTrigger } from './gsapConfig';

gsap.registerPlugin(useGSAP);

export interface SceneContext {
  /** ≥ 1024 px: the full choreography (pins, long scrubs). Below: lighter, unpinned versions. */
  desktop: boolean;
}

/**
 * One scroll scene per section. `build` runs inside a scoped gsap.context + matchMedia, so every tween and
 * ScrollTrigger it creates is reverted on unmount or breakpoint change. Under prefers-reduced-motion it never runs:
 * the section's static layout is the reduced-motion design.
 */
export function useScrollScene(scope: RefObject<HTMLElement | null>, build: (ctx: SceneContext) => void | (() => void), deps: unknown[] = []) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        {
          desktop: '(min-width: 1024px) and (prefers-reduced-motion: no-preference)',
          mobile: '(max-width: 1023px) and (prefers-reduced-motion: no-preference)',
        },
        (c) => build({ desktop: Boolean(c.conditions?.desktop) }),
      );
      // Lazy sections change the document height after first layout.
      const id = window.setTimeout(() => ScrollTrigger.refresh(), 400);
      return () => {
        window.clearTimeout(id);
        mm.revert();
      };
    },
    { scope, dependencies: deps },
  );
}
