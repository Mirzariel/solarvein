/**
 * Section registry (lead-owned): ids, numbering, nav labels, order, and old-hash aliases.
 * SiteHeader, App, presentation mode and deep links read from here — never hard-code ids elsewhere.
 */
export interface SectionDef {
  id: string;
  /** Mono index "01".."08"; undefined for un-numbered sections (opening, interludes, closing). */
  n?: string;
  /** Section name used in the index line and nav. */
  label: string;
  /** Shown in the header nav. */
  nav: boolean;
  /** Part of the ~3-minute presentation path (?presentasi=1). */
  demo: boolean;
}

export const SECTIONS: readonly SectionDef[] = [
  { id: 'awal', label: 'Pembuka', nav: false, demo: false },
  { id: 'masalah', n: '01', label: 'Masalah', nav: true, demo: true },
  { id: 'sistem', n: '02', label: 'Sistem', nav: true, demo: true },
  { id: 'sistem-dalam', label: 'Di dalam kolektor', nav: false, demo: false },
  { id: 'jeda', label: 'Jeda', nav: false, demo: false },
  { id: 'router', n: '03', label: 'Cara kerja', nav: true, demo: false },
  { id: 'sehari', n: '04', label: 'Sehari di hotel', nav: true, demo: true },
  { id: 'jeda-lembap', label: 'Jeda', nav: false, demo: false },
  { id: 'desikan', n: '05', label: 'Jalur riset desikan', nav: false, demo: false },
  { id: 'dampak', n: '06', label: 'Dampak', nav: true, demo: true },
  { id: 'lab', n: '07', label: 'Lab', nav: false, demo: false },
  { id: 'validasi', n: '08', label: 'Validasi', nav: true, demo: false },
  { id: 'penutup', label: 'Penutup', nav: false, demo: false },
] as const;

export const SECTION = Object.fromEntries(SECTIONS.map((s) => [s.id, s])) as Record<string, SectionDef>;

/** Old v1 hashes → new ids (deep links from the previous site keep working). */
export const HASH_ALIASES: Record<string, string> = {
  pengalaman: 'sistem',
  'di-dalam': 'sistem-dalam',
  perbandingan: 'dampak',
};

export const resolveHash = (id: string): string => HASH_ALIASES[id] ?? id;

/** Presentation scenes in order (keys 1–8 jump; ←/→ step). Backup scenes come after the demo path. */
export const PRESENTATION_SCENES: readonly string[] = [
  'masalah',
  'sistem',
  'sehari',
  'dampak',
  // Q&A backup
  'router',
  'desikan',
  'lab',
  'validasi',
];
