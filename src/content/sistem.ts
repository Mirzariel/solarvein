/** Sistem (#sistem) and Sistem-dalam (#sistem-dalam) copy. Numbers are never written here: they come from the v2 hooks. */
export const SISTEM = {
  index: { n: '02', label: 'Sistem' },
  title: ['Panel memanen.', 'Pengendali memilih tujuan.'] as const,
  lead: 'Pilih kondisinya, lalu lihat ke mana panas dialirkan.',
  switchLabel: 'Kondisi',
  statement: 'Semua angka di bagian ini: hasil simulasi, hotel 100 kamar ilustrasi.',
  computedLabel: 'Mode terhitung',
  /** Short names for the one-line split (full names live in LABELS.sink). */
  split: {
    dhw: 'Air panas',
    tank: 'Tangki',
    desiccant: 'Desikan',
    bypass: 'Tidak dipakai',
  },
  splitLabel: 'Pembagian panas',
  /** Always-visible clarification (one line under the stage). */
  note: 'Mode A/B/C dihitung pengendali dari sinar, suhu kolektor, dan tangki, bukan dari jam. Pemanas dan AC yang ada tetap menjamin layanan.',
  detail: { title: 'Detail', hint: 'Suhu, pompa, aturan mode' },
  rules: [
    { k: 'A', t: 'Panas tersedia: kolektor lebih hangat dari dasar tangki, pompa menyala.' },
    { k: 'B', t: 'Sinar lemah: pompa jarang menyala, air panas diambil dari simpanan tangki.' },
    { k: 'C', t: 'Tanpa sinar: tidak ada pengumpulan; tangki melepas panas simpanan.' },
  ],
} as const;

export const SISTEM_DALAM = {
  index: { n: '02', label: 'Di dalam kolektor' },
  title: ['Empat lapis.', 'Satu jalur cairan.'] as const,
  hint: 'Nilai dari kondisi yang dipilih di Sistem. Tampilan terurai, bukan skala.',
  listLabel: 'Bagian kolektor',
  emptyPick: 'Pilih satu bagian untuk melihat perannya.',
} as const;
