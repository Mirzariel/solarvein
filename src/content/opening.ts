/** Opening (#awal) copy. L1 only: one headline, one lead sentence, two actions, the video-card note. */
export const OPENING = {
  /** Two masked lines; the second one is set in ink-3. */
  h1: ['Panas surya', 'untuk air hotel.'] as const,
  lead: 'Panel PV/T di atap hotel menghasilkan listrik dan panas; panasnya diarahkan ke air panas lebih dulu.',
  ctaPrimary: { label: 'Lihat masalahnya', href: '#masalah' },
  ctaSecondary: { label: 'Coba sistemnya', href: '#sistem' },
  videoAlt: 'Ilustrasi konteks: deretan panel surya di bawah langit pagi yang cerah.',
  cardLine: 'Satu atap, dua hasil: listrik dan panas.',
  cardCaption: 'Hotel 100 kamar (ilustrasi) · hasil simulasi · video ilustrasi, bukan dokumentasi proyek',
  stats: {
    fraction: 'Air panas dari surya, setahun',
    netCo2: 'CO₂e bersih dihindari dibanding PV + pompa kalor (B2)',
  },
} as const;
