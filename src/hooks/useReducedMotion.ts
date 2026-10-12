import { useMediaQuery } from './useMediaQuery';

/** True when the user asked the OS/browser for reduced motion. Updates live. */
export function useReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', false);
}
