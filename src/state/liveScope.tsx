import { createContext, useContext, type ReactNode } from 'react';
import { useInView } from '../hooks/useInView';

/**
 * Off-screen sections must not recompute the simulation on every Lab edit. Each top-level section is wrapped in
 * <LiveWhenVisible>; the v2 selector hooks read this flag and keep their last system snapshot while the section is
 * far from the viewport (more than one viewport away). On approach they catch up once.
 */
const LiveContext = createContext(true);

export const useLive = (): boolean => useContext(LiveContext);

export function LiveWhenVisible({ children, margin = '100% 0px' }: { children: ReactNode; margin?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: margin });
  return (
    <div ref={ref}>
      <LiveContext.Provider value={inView}>{children}</LiveContext.Provider>
    </div>
  );
}
