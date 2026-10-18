import type { AssumptionEntry } from '../contract';

/** Asumsi prapemanas air panas lewat penukar panas eksternal (W2a). */
export const DHW_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'dhw-efektivitas-hx',
    title: 'Efektivitas penukar panas prapemanas',
    body: 'Sisi air minum menjadi sisi dengan kapasitas panas terkecil, sehingga Q = ε·ṁ·cp·(T_sumber − T_pasok). Air tidak pernah naik melebihi suhu sumber atau suhu set, dan sisa panas selalu ditambah pemanas yang ada.',
    value: 'ε = 0,7 (rentang 0,6–0,8)',
    tag: 'asumsi',
     // TODO(R0): korelasi ε-NTU untuk HX pelat
  },
  {
    id: 'dhw-legionella',
    title: 'Pengendalian Legionella',
    body: 'Air minum tidak disimpan pada 25–45 °C, rentang pertumbuhan Legionella. Penyimpanan panas surya ada di loop tertutup, sedangkan air minum hanya melewati penukar panas eksternal saat dipakai. Pemanas yang ada tetap menjaga penyimpanan air panas di 60 °C atau lebih.',
    value: 'Simpan ≥ 60 °C; hindari 25–45 °C',
    tag: 'terbit',
    refId: 'levesque2004-who-60c-summary', // TODO(R0): WHO, Legionella and the prevention of legionellosis
  },
  {
    id: 'dhw-ashrae-188',
    title: 'Manajemen risiko sistem air bangunan',
    body: 'Rencana manajemen risiko Legionella untuk sistem air bangunan mengikuti ANSI/ASHRAE 188. Model ini tidak menggantikan rencana tersebut, hanya menjaga agar rancangan tidak menyimpan air minum pada suhu berisiko.',
    tag: 'terbit',
    refId: 'hse-legionella-hot-cold', // TODO(R0)
  },
  {
    id: 'dhw-sifat-air',
    title: 'Sifat air',
    body: 'Kalor jenis air 4,186 kJ/(kg·K) dan massa jenis 0,99 kg/L (rata-rata pada ±45 °C) dipakai konstan; galat di rentang 25–60 °C di bawah 1 %.',
    value: '4,186 kJ/(kg·K) · 0,99 kg/L',
    tag: 'mapan',
  },
];
