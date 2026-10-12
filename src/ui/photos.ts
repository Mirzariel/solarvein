import manifest from '../../public/images/photos/manifest.json';

/** Photo set in /public/images/photos (manifest.json is generated with the files: widths, aspect, average colour, LQIP). */
export type PhotoName = keyof typeof manifest;

export interface PhotoMeta {
  aspect: number;
  avg: string;
  widths: readonly number[];
  /** ~200-byte base64 WebP, blurred up as a background while the real image loads. */
  lqip: string;
}

export const PHOTO_BASE = '/images/photos';

const META = manifest as unknown as Record<string, PhotoMeta>;

export function hasPhoto(name: string): name is PhotoName {
  return Object.prototype.hasOwnProperty.call(META, name);
}

export interface PhotoSet {
  /** srcset for the AVIF `<source>` ("/images/photos/x-960.avif 960w, …"). */
  avif: string;
  webp: string;
  /** Fallback `<img src>` (WebP, ≤ 1600 w). */
  src: string;
  lqip: string;
  avg: string;
  aspect: number;
  widths: number[];
}

/** Build the responsive sources of a photo from the manifest. `maxWidth` drops the larger files (e.g. 1600 for cards). */
export function photoSet(name: PhotoName, maxWidth = Infinity): PhotoSet {
  const meta = META[name] as PhotoMeta;
  const all = [...meta.widths].sort((a, b) => a - b);
  const widths = all.filter((w) => w <= maxWidth);
  if (widths.length === 0) widths.push(all[0] as number);
  const set = (ext: 'avif' | 'webp') => widths.map((w) => `${PHOTO_BASE}/${name}-${w}.${ext} ${w}w`).join(', ');
  const mid = [...widths].reverse().find((w) => w <= 1600) ?? (widths[widths.length - 1] as number);
  return {
    avif: set('avif'),
    webp: set('webp'),
    src: `${PHOTO_BASE}/${name}-${mid}.webp`,
    lqip: meta.lqip,
    avg: meta.avg,
    aspect: meta.aspect,
    widths,
  };
}
