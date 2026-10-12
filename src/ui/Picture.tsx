import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { cx } from './cx';
import { hasPhoto, photoSet, type PhotoName } from './photos';

export interface PictureProps {
  /** Photo key from public/images/photos/manifest.json (srcset, LQIP, aspect and average colour come from it). */
  name?: PhotoName;
  /** Explicit sources (used when `name` is not given). */
  src?: string;
  avif?: string;
  webp?: string;
  srcSet?: string;
  lqip?: string;
  /** Average colour shown under the LQIP. */
  avg?: string;
  /** Drop manifest widths above this (cards: 1600). */
  maxWidth?: number;
  sizes?: string;
  /** Honest alt text ("Ilustrasi konteks: …"). "" only for purely decorative images. */
  alt: string;
  /** Aspect ratio (number or "16/9"). Defaults to the photo's own aspect. Ignored with `fill`. */
  ratio?: number | string;
  /** Fill the positioned parent instead of reserving an aspect-ratio box. */
  fill?: boolean;
  /** object-position, e.g. "30% 40%". */
  position?: string;
  /** Above the fold: eager + high priority. Everything else is lazy. */
  priority?: boolean;
  rounded?: boolean;
  className?: string;
  imgClassName?: string;
  /** Called once when the file cannot be loaded (parent may show its own placeholder). */
  onFail?: () => void;
}

/**
 * `<picture>` with AVIF → WebP → fallback, a fixed aspect ratio (no layout shift), LQIP blur-up from the manifest,
 * object-position, and lazy loading except when `priority`. If the file is missing it shows the LQIP / average
 * colour only (the alt text stays on the wrapper for assistive tech).
 */
export function Picture({
  name,
  src,
  avif,
  webp,
  srcSet,
  lqip,
  avg,
  maxWidth,
  sizes = '100vw',
  alt,
  ratio,
  fill,
  position,
  priority,
  rounded,
  className,
  imgClassName,
  onFail,
}: PictureProps) {
  const known = name && hasPhoto(name) ? photoSet(name, maxWidth) : null;
  const S = {
    src: src ?? known?.src,
    avif: avif ?? known?.avif,
    webp: webp ?? known?.webp,
    srcSet: srcSet ?? known?.webp,
    lqip: lqip ?? known?.lqip,
    avg: avg ?? known?.avg,
  };
  const aspect = ratio ?? known?.aspect;

  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(!S.src);
  const img = useRef<HTMLImageElement>(null);
  const fail = () => {
    setFailed(true);
    onFail?.();
  };
  // Cached images can finish before React attaches onLoad.
  useEffect(() => {
    const el = img.current;
    if (el?.complete && el.naturalWidth > 0) setLoaded(true);
  }, []);
  useEffect(() => {
    if (!S.src) onFail?.();
  }, [S.src, onFail]);

  const style: CSSProperties = {
    backgroundColor: S.avg,
    ...(fill || !aspect ? null : { aspectRatio: typeof aspect === 'number' ? String(aspect) : aspect.replace('/', ' / ') }),
  };

  return (
    <div
      className={cx('isolate overflow-hidden', fill ? 'absolute inset-0' : 'relative w-full', rounded && 'rounded-lg', className)}
      style={style}
      role={failed && alt ? 'img' : undefined}
      aria-label={failed && alt ? alt : undefined}
    >
      {S.lqip ? (
        <div
          aria-hidden="true"
          className={cx('absolute inset-0 scale-110 bg-cover bg-center blur-xl transition-opacity duration-[800ms] ease-ui', loaded ? 'opacity-0' : 'opacity-100')}
          style={{ backgroundImage: `url("${S.lqip}")` }}
        />
      ) : null}
      {failed ? null : (
        <picture>
          {S.avif ? <source type="image/avif" srcSet={S.avif} sizes={sizes} /> : null}
          {S.webp ? <source type="image/webp" srcSet={S.webp} sizes={sizes} /> : null}
          <img
            ref={img}
            src={S.src}
            srcSet={S.srcSet}
            sizes={sizes}
            alt={alt}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
            draggable={false}
            onLoad={() => setLoaded(true)}
            onError={fail}
            className={cx(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-[800ms] ease-ui',
              loaded ? 'opacity-100' : 'opacity-0',
              imgClassName,
            )}
            style={position ? { objectPosition: position } : undefined}
          />
        </picture>
      )}
    </div>
  );
}
