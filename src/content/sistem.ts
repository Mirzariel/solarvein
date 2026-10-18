/** Sistem (#sistem) and Sistem-dalam (#sistem-dalam) copy. Numbers are never written here: they come from the v2 hooks. */
export const SISTEM = {
  index: { n: '02', label: 'Sistem' },
  title: ['Panel memanen.', 'Router memilih tujuan.'] as const,
  lead: 'Pilih kondisi; router (pengendali) membagi panasnya.',
  switchLabel: 'Kondisi',
  statement: (rooms: number, areaM2: number) => `Hotel ${rooms} kamar (ilustrasi); angka listrik dan panas untuk seluruh susunan ${areaM2} m².`,
  computedLabel: 'Mode terhitung',
  /** Short names for the one-line split (full names live in LABELS.sink). */
  split: {
    dhw: 'Air panas',
    tank: 'Tangki',
    desiccant: 'Desikan',
    bypass: 'Tidak dipakai (bypass)',
  },
  splitLabel: 'Pembagian panas',
  /** Always-visible clarification (one line under the stage). */
  note: 'Mode A/B/C dihitung router dari sinar, suhu kolektor, dan tangki, bukan dari jam. Pemanas cadangan dan AC yang ada tetap menjamin layanan.',
  detail: { title: 'Detail', hint: 'Suhu, pompa, aturan mode' },
  rules: [
    { k: 'A', t: 'Panas tersedia: kolektor lebih hangat dari dasar tangki, pompa menyala.' },
    { k: 'B', t: 'Pompa diam walau ada cahaya: kolektor belum lebih hangat dari tangki, jadi air panas diambil dari simpanan.' },
    { k: 'C', t: 'Tanpa sinar: tidak ada pengumpulan; tangki melepas panas simpanan.' },
  ],
} as const;

export const SISTEM_DALAM = {
  index: { n: '02', label: 'Di dalam kolektor' },
  title: ['Empat lapis.', 'Satu jalur cairan.'] as const,
  hint: (ref: string) => `Satu modul, kondisi acuan ${ref}. Tampilan terurai, bukan skala.`,
  listLabel: 'Bagian kolektor',
  emptyPick: 'Pilih satu bagian untuk melihat perannya.',
} as const;
