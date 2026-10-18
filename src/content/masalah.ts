import type { RefId } from '../sim/system';

/**
 * Masalah (#masalah) copy. Every number here is PUBLISHED, not simulated (tag 'terbit' + refId from
 * src/sim/references.ts). Values were read from the cited sources (docs/research/data-indonesia.md); the audit
 * figures come from ONE hotel audit and one quoted government profile, so the copy never calls them national.
 */
export interface MasalahLoad {
  id: 'air-panas' | 'udara-lembap';
  name: string;
  sentence: string;
  /** Mono statistic, already formatted (decimal comma, thousands dot). */
  stat: string;
  statUnit: string;
  statCaption: string;
  refId: RefId;
}

export const MASALAH = {
  index: { n: '01', label: 'Masalah' },
  title: 'Dua beban hotel tropis.',
  lead: 'Panas atap terbuang; hotel membeli panas untuk air.',
  inclusive: 'Berlaku sama untuk hotel besar maupun penginapan kecil.',
  loads: [
    {
      id: 'air-panas',
      name: 'Air panas',
      sentence: 'Air mandi dan dapur dipanaskan setiap hari dengan bahan bakar atau listrik.',
      stat: '382.160',
      statUnit: 'kamar',
      statCaption: 'di 4.129 hotel berbintang, Indonesia 2023',
      refId: 'bps-hotel-2023',
    },
    {
      id: 'udara-lembap',
      name: 'Udara luar lembap',
      sentence: 'AC juga menanggung udara luar yang lembap.',
      stat: '48,5–71,3',
      statUnit: '%',
      statCaption: 'bagian listrik hotel untuk AC (profil ESDM 2000; audit satu hotel di Semarang)',
      refId: 'ariwibowo2011-hotel-audit',
    },
  ] satisfies MasalahLoad[],
  statement: 'Angka di bagian ini dari publikasi, bukan simulasi.',
  picture: {
    alt: 'Ilustrasi konteks: deretan panel surya di atap datar.',
    caption: 'Ilustrasi, bukan dokumentasi proyek',
  },
  disclosure: {
    title: 'Sumber dan batas angka',
    items: [
      {
        refId: 'bps-hotel-2023' as RefId,
        text: 'BPS (2023): 4.129 hotel berbintang dengan 382.160 kamar; bersama akomodasi lain 29.005 usaha dan 747.066 kamar.',
      },
      {
        refId: 'ariwibowo2011-hotel-audit' as RefId,
        text: 'Audit satu hotel di Semarang: pendingin ruangan 71,3 % dan pemanas air 4,44 % dari listrik; bahan bakar pemanas air tidak termasuk. Angka 48,5 % mengutip profil ESDM (2000). Ini bukan rata-rata nasional.',
      },
      {
        refId: 'jcm-id-ef-2022' as RefId,
        text: 'Faktor emisi listrik Jawa–Madura–Bali 0,87 tCO₂/MWh (basis 2019, kompilasi sekunder JCM). Model memakai angka ini untuk listrik yang tergantikan.',
      },
    ],
  },
} as const;
