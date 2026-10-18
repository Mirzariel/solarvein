import type { AssumptionEntry } from '../contract';

/** Asumsi tangki penyangga dua simpul (W2a). */
export const TANK_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'tangki-loop-tertutup',
    title: 'Tangki pada loop tertutup',
    body: 'Tangki menyimpan fluida loop kolektor (air atau campuran glikol), bukan air minum. Air minum tidak pernah disimpan pada 25–45 °C; panasnya dipindahkan lewat penukar panas eksternal hanya saat ada pemakaian, lalu pemanas yang ada menaikkan sisanya sampai 60 °C atau lebih.',
    value: 'Loop tertutup + HX eksternal',
    tag: 'mapan',
    refId: 'levesque2004-who-60c-summary', // TODO(R0)
  },
  {
    id: 'tangki-dua-simpul',
    title: 'Model dua simpul (atas dan bawah)',
    body: 'Tangki dibagi dua simpul bervolume sama, tercampur penuh di dalam simpul. Pengisian masuk ke simpul atas bila fluidanya lebih panas dari simpul atas, jika tidak ke simpul bawah. Pelepasan diambil dari simpul atas dan kembali ke simpul bawah. Hukum pertama terpenuhi pada setiap langkah waktu.',
    tag: 'simulasi',
  },
  {
    id: 'tangki-ukuran',
    title: 'Volume tangki per luas kolektor',
    body: 'Volume 50–75 L per m² kolektor adalah rentang praktik umum untuk penyangga prapemanas; nilai bawaan 60 L/m². Makin besar tangki, makin besar rugi diam sehingga manfaatnya menurun.',
    value: '60 L/m² (rentang 50–75)',
    tag: 'asumsi',
     // TODO(R0): pedoman ukuran tangki surya skala besar
  },
  {
    id: 'tangki-ua',
    title: 'Rugi panas tangki',
    body: 'UA dihitung dari luas selimut silinder (tinggi 1,5 × diameter) dikali koefisien perpindahan panas permukaan 0,5 W/(m²·K), mewakili insulasi tebal yang baik beserta sambungan. Hasil model: sekitar 1,7–3,4 kWh/hari untuk tangki 1–2 m³ (U 0,4–0,5) yang dijaga 60 °C di udara 28 °C; tangki bawaan 5,1 m³ sekitar 6 kWh/hari.',
    value: 'U = 0,5 W/(m²·K) (rentang 0,4–0,8)',
    tag: 'asumsi',
  },
  {
    id: 'tangki-suhu-maks',
    title: 'Suhu maksimum penyangga',
    body: 'Di atas 85 °C kolektor dialihkan ke bypass agar fluida, pipa dan sel PV terlindungi. Tangki tidak pernah diisi melebihi suhu fluida pengisi.',
    value: '85 °C',
    tag: 'asumsi',
  },
  {
    id: 'tangki-balik-hx',
    title: 'Suhu balik dari penukar panas',
    body: 'Fluida loop kembali ke simpul bawah pada suhu air pasok ditambah selisih pendekatan, dengan debit sisi loop diatur mengikuti beban.',
    value: 'air pasok + 4 K (rentang 3–6)',
    tag: 'asumsi',
  },
  {
    id: 'tangki-pencampuran',
    title: 'Pencampuran antarsimpul',
    body: 'Konduktansi antarsimpul dihitung dari konduksi air melalui penampang tangki dikali 5 untuk mewakili dinding dan port. Bila simpul bawah lebih panas dari atas, keduanya langsung bercampur.',
    tag: 'asumsi',
  },
];
