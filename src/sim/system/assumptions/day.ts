import type { AssumptionEntry, DayScenarioId } from '../contract';

/**
 * Hari per tahun untuk tiap tipe hari (asumsi ilustratif; jumlah 365).
 * TODO(R0): ganti dengan klasifikasi hari dari data iklim kota yang bersumber (BMKG/NASA POWER).
 */
export const ANNUAL_DAY_WEIGHTS: { scenario: Exclude<DayScenarioId, 'hujan-3-hari'>; days: number }[] = [
  { scenario: 'terik', days: 140 },
  { scenario: 'berawan', days: 130 },
  { scenario: 'hujan', days: 95 },
];

/** Panjang langkah waktu bawaan [jam]. */
export const DEFAULT_DT_H = 0.25;
/** Suhu air sumber pompa kalor pada mode sumber PV/T [°C] (fluida dingin di malam/hujan). */
export const HP_SOURCE_FLUID_C = 15;

export const DAY_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'hari-bobot-tahunan',
    title: 'Bobot tipe hari dalam setahun',
    body: 'Hasil tahunan dihitung dari tiga hari tipikal (terik, berawan, hujan) yang dikalikan jumlah harinya. Bobot ini ilustratif dan belum bersumber dari data iklim satu kota.',
    value: '140 hari terik · 130 hari berawan · 95 hari hujan',
    tag: 'asumsi',
    refId: 'iklim-kota', // TODO(R0)
  },
  {
    id: 'hari-pemanasan',
    title: 'Hari pemanasan sebelum hari yang dihitung',
    body: 'Setiap tipe hari didahului dua hari pemanasan (tiga hari pada hitungan tahunan) dengan cuaca yang sama, dan hanya hari terakhir yang dicatat, sehingga suhu tangki awal mendekati keadaan berulang dan tidak bergantung pada tebakan awal. Untuk skenario hujan 3 hari, pemanasannya adalah hari-hari berawan, karena hujan panjang biasanya didahului hari yang lebih cerah.',
    tag: 'asumsi',
  },
  {
    id: 'hari-langkah-waktu',
    title: 'Langkah waktu 15 menit, nilai di tengah langkah',
    body: 'Cuaca dan pemakaian air panas dievaluasi di titik tengah tiap langkah, lalu dianggap tetap selama langkah itu. Tangki diintegrasikan dengan sub-langkah satu menit sehingga hukum pertama terpenuhi.',
    value: 'Δt = 0,25 jam',
    tag: 'simulasi',
  },
  {
    id: 'hari-balik-kolektor',
    title: 'Suhu masuk kolektor sama dengan dasar tangki',
    body: 'Fluida kembali ke kolektor pada suhu dasar tangki, juga setelah melewati penukar panas air panas atau desikan. Ini menyederhanakan suhu balik sebenarnya yang bisa sedikit lebih rendah.',
    tag: 'asumsi',
  },
  {
    id: 'hari-air-panas-seri',
    title: 'Panas langsung dan panas tangki untuk satu pemakaian',
    body: 'Saat ada pemakaian, panas langsung dari kolektor diambil lebih dahulu (dibatasi efektivitas penukar panas), lalu kekurangannya diambil dari bagian atas tangki lewat penukar panas eksternal. Sisanya selalu ditutup pemanas yang sudah ada, sehingga kebutuhan tak terpenuhi bernilai nol dalam semua skenario.',
    tag: 'asumsi',
  },
  {
    id: 'hari-bypass-tolakan',
    title: 'Panas yang ditolak tangki dihitung sebagai bypass',
    body: 'Bagian panas yang dialokasikan ke tangki tetapi tidak bisa diterima (tangki penuh atau fluida tidak lebih panas) dipindahkan ke bypass pada langkah itu juga, sehingga jumlah alokasi tetap sama dengan panas yang tersedia.',
    tag: 'simulasi',
  },
  {
    id: 'hari-desikan-dibutuhkan',
    title: 'Kapan desikan membutuhkan regenerasi',
    body: 'Desikan dianggap membutuhkan regenerasi bila fitur aktif, kapasitas kering belum penuh, dan rasio kelembapan udara luar melebihi rasio kelembapan jenuh pada titik embun suplai AC.',
    tag: 'hipotesis',
  },
  {
    id: 'hari-desikan-adaptor',
    title: 'Jalur desikan masih adaptor netral',
    body: 'Sampai modul desikan tersambung, jalur ini hanya menghitung panas yang dialirkan dan pengisian kapasitas kering. Penyerapan uap air, listrik kipas, dan penghematan AC bernilai nol, sehingga tidak ada manfaat desikan yang ditampilkan.',
    tag: 'hipotesis',
  },
  {
    id: 'hari-pompa-kalor',
    title: 'Mode sumber pompa kalor',
    body: 'Bila diaktifkan, saat pengendali tidak mengumpulkan panas dan tangki tidak cukup menutup kebutuhan air panas, kolektor dialiri fluida 15 °C sebagai sumber pompa kalor. COP berasal dari fraksi Carnot dan panas kondensor dibatasi kebutuhan air panas yang tersisa. Panas kondensor dihitung sebagai panas surya bagi air panas, dan kerja kompresor dicatat terpisah sebagai listrik.',
    value: 'Fluida sumber 15 °C; nonaktif secara bawaan',
    tag: 'hipotesis',
  },
];
