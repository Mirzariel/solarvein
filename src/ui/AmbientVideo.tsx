import { useEffect, useRef, useState } from 'react';
import { cx } from './cx';
import { Picture } from './Picture';
import type { PhotoName } from './photos';

export interface AmbientVideoProps {
  /** MP4 (H.264) path in /public. */
  src: string;
  /** Poster photo key from the manifest: shown first, and instead of the video under reduced motion / data saver. */
  poster: PhotoName;
  /** Honest description; the clip itself is muted and decorative. */
  alt: string;
  position?: string;
  priority?: boolean;
  className?: string;
}

function prefersStill(): boolean {
  if (typeof window === 'undefined') return true;
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return (
    window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
    window.matchMedia('(prefers-reduced-data: reduce)').matches ||
    Boolean(conn?.saveData)
  );
}

/**
 * Muted, looping background clip over its own poster. The file is requested only when the frame nears the viewport,
 * plays while visible and pauses off-screen. Reduced motion, reduced data and Save-Data keep the still poster.
 * Fills the positioned parent.
 */
export function AmbientVideo({ src, poster, alt, position = '50% 50%', priority, className }: AmbientVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [still] = useState(prefersStill);
  const [armed, setArmed] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (still || !v || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting) {
          setArmed(true);
          requestAnimationFrame(() => void v.play().catch(() => {}));
        } else v.pause();
      },
      { rootMargin: '200px 0px' },
    );
    io.observe(v);
    return () => io.disconnect();
  }, [still]);

  return (
    <div className={cx('absolute inset-0 overflow-hidden', className)} role="img" aria-label={alt}>
      <Picture fill name={poster} alt="" position={position} priority={priority} />
      {still ? null : (
        <video
          ref={ref}
          className={cx('absolute inset-0 h-full w-full object-cover transition-opacity duration-[900ms] ease-ui', playing ? 'opacity-100' : 'opacity-0')}
          style={{ objectPosition: position }}
          src={armed ? src : undefined}
          muted
          loop
          playsInline
          autoPlay={armed}
          preload="none"
          aria-hidden="true"
          disablePictureInPicture
          onPlaying={() => setPlaying(true)}
        />
      )}
    </div>
  );
}
