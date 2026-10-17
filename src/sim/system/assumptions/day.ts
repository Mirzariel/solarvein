import type { AssumptionEntry, DayScenarioId } from '../contract';

/**
 * Hari per tahun untuk tiap tipe hari (jumlah 365), dikalibrasi ke GHI tahunan Denpasar (NASA POWER 5,56 kWh/m²/hari).
 * GHI harian profil: terik 6,07 · berawan 3,90 · hujan 2,04 → rerata berbobot 5,34 (−4 %, konservatif).
 */
export const ANNUAL_DAY_WEIGHTS: { scenario: Exclude<DayScenarioId, 'hujan-3-hari'>; days: number }[] = [
  { scenario: 'terik', days: 255 },
  { scenario: 'berawan', days: 95 },
  { scenario: 'hujan', days: 15 },
];

/** Panjang langkah waktu bawaan [jam]. */
export const DEFAULT_DT_H = 0.25;
/** Suhu air sumber pompa kalor pada mode sumber PV/T [°C] (fluida dingin di malam/hujan). */
export const HP_SOURCE_FLUID_C = 15;

export const DAY_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'hari-bobot-tahunan',
    title: 'Bobot tipe hari dalam setahun',
    body: 'Hasil tahunan dihitung dari tiga hari tipikal (terik, berawan, hujan) yang dikalikan jumlah harinya. Bobot dipilih agar rerata iradiasi tahunan mendekati data Denpasar (NASA POWER 5,56 kWh/m²/hari); hasilnya 5,34, sedikit lebih rendah sehingga konservatif. Skenario hujan (2,0 kWh/m²/hari) adalah kasus berat: rerata hari hujan lebat di Denpasar sekitar 4,1 kWh/m²/hari menurut turunan data harian NASA POWER.',
    value: '255 hari terik · 95 hari berawan · 15 hari hujan berat (GHI rerata 5,34 kWh/m²/hari)',
    tag: 'asumsi',
    refId: 'nasa-power-denpasar',
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
    id: 'hari-termostat-diferensial',
    title: 'Pompa mengikuti termostat diferensial',
    body: 'Keputusan menyalakan pompa memakai sensor kolektor saat pompa mati (suhu kolektor yang diam, dari simulasi dengan pompa mati) dibandingkan dengan dasar tangki dan ambang ΔT hidup. Keputusan mematikan memakai suhu keluar kolektor saat pompa berjalan dan ambang ΔT mati. Aliran 2 L/menit per modul hanya menaikkan fluida beberapa kelvin, sehingga membandingkan suhu keluar saat pompa menyala saja tidak akan pernah memulai pompa. Agar pompa tidak hidup-mati terlalu sering di hari berawan, pompa tidak boleh berhenti karena termostat selama 30 menit pertama setelah menyala; kolektor yang tidak lagi memberi panas tetap menghentikan pompa.',
    value: 'Mulai: sensor pompa mati − dasar tangki > ΔT hidup · Henti: suhu keluar − dasar tangki ≤ ΔT mati · waktu jalan minimum 30 menit',
    tag: 'usulan',
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
    title: 'Pembukuan jalur desikan',
    body: 'Desikan dihitung dengan evaluateDesiccant pada suhu regenerasi sama dengan suhu keluar kolektor dikurangi 3 K. Kapasitas kering turun oleh uap air yang diserap dan naik oleh regenerasi sebatas panas yang dialirkan. Listrik kipas, after-cooler, dan penalti PV hanya masuk ke penghematan listrik AC bersih (bisa negatif, di luar angka utama) dan tidak ditambahkan ke listrik parasit; listrik parasit hanya pompa sirkulasi dan pengendali.',
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
