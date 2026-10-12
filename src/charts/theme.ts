/**
 * Warna grafik = token desain (src/index.css), dipakai sebagai nilai CSS var.
 * Maksimum 4 seri: ink (listrik W_e), heat (panen W_th +), cool (pembuangan W_th −), loss (rugi/pembanding).
 * Grafik hanya di latar terang; tanpa gradien, bayangan, atau warna di luar token.
 */
export const COLOR = {
  /** Listrik W_e — selalu ink pekat. */
  ink: 'var(--color-ink)',
  /** Panas dipanen / ke cairan. */
  heat: 'var(--color-heat-mark)',
  /** Panas dibuang / sisi cairan dingin. */
  cool: 'var(--color-cool)',
  /** Rugi, pembanding konvensional, "lainnya". */
  loss: 'var(--color-loss)',
  /** Sekunder netral (garis tipis, seri kedua listrik). */
  ink2: 'var(--color-ink-2)',
  ink3: 'var(--color-ink-3)',
  grid: 'var(--color-line)',
  axis: 'var(--color-line-strong)',
  surface: 'var(--color-surface)',
} as const;

/** Gaya teks sumbu: mono 12, ink-3, angka tabular. */
export const AXIS_TICK = {
  fill: 'var(--color-ink-2)',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
} as const;

export const AXIS_LINE = { stroke: 'var(--color-line-strong)' } as const;
export const GRID_LINE = { stroke: 'var(--color-line)' } as const;

/** Redup non-hover (hover highlight): 35%. */
export const DIM_OPACITY = 0.35;
