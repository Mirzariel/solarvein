import type { AssumptionEntry } from '../contract';

/** Router assumptions (Indonesian). Thresholds mirror the constants exported by ../router.ts. */
export const ROUTER_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'router-pompa-histeresis',
    title: 'Pompa dengan histeresis (pengendali aman)',
    body:
      'Pompa kolektor menyala bila suhu keluar kolektor melebihi suhu dasar tangki sebesar ΔT hidup, dan baru mati ketika selisihnya turun di bawah ΔT mati. Kolektor yang lebih dingin dari tangki tidak pernah mendinginkan tangki.',
    value: 'ΔT hidup/mati dari parameter pengendali (contoh 8 K / 3 K)',
    tag: 'usulan',
  },
  {
    id: 'router-mode-keadaan',
    title: 'Mode A/B/C adalah keadaan, bukan jam',
    body:
      'Mode A: pompa berjalan dan ada panas berguna. Mode B: ada cahaya siang tetapi tidak ada pengumpulan berguna, sehingga hanya panas simpanan yang dipakai. Mode C: iradians di bawah ambang, tidak ada pengumpulan. Jam hanya dibaca oleh strategi jadwal tetap.',
    value: 'Ambang iradians 20 W/m²',
    tag: 'asumsi',
  },
  {
    id: 'router-peringkat-nilai',
    title: 'Urutan prioritas berdasarkan nilai per kWh_th',
    body:
      'Strategi adaptif mengurutkan tujuan panas menurut nilai karbon per kWh_th: air panas langsung (menggantikan pemanas LPG, sekitar 0,27 kgCO₂e/kWh_th) lebih tinggi dari tangki (nilai sama, dikurangi rugi simpan), lalu desikan (kurang dari sekitar 0,1 kgCO₂e/kWh_th dan sering nol atau negatif), lalu bypass (nol). Angka tersebut akan diverifikasi oleh keluaran modul desikan dan karbon.',
    value: 'DHW > tangki > desikan > bypass',
    tag: 'usulan',
  },
  {
    id: 'router-desikan-suhu-min',
    title: 'Desikan hanya dialiri panas di atas suhu regenerasi minimum',
    body:
      'Pada strategi adaptif, panas ke desikan hanya diberikan bila desikan membutuhkannya dan suhu keluar kolektor mencapai suhu regenerasi minimum; jika tidak, bagian itu dialihkan ke bypass dengan alasan "desikan terlalu dingin". Strategi jadwal tetap sengaja tidak memeriksa suhu sehingga panasnya terbuang.',
    value: 'Suhu regenerasi minimum dari parameter pengendali',
    tag: 'hipotesis',
  },
  {
    id: 'router-desikan-histeresis',
    title: 'Histeresis desikan',
    body:
      'Setelah desikan menyala, regenerasi berlanjut sampai suhu keluar kolektor turun 2 K di bawah suhu regenerasi minimum. Pita ini mencegah desikan berpindah hidup-mati berulang di sekitar ambang.',
    value: 'Pita 2 K',
    tag: 'asumsi',
  },
  {
    id: 'router-tangki-penuh',
    title: 'Tangki dianggap penuh mendekati suhu maksimum',
    body:
      'Tangki berhenti menerima panas bila suhu bagian atas sudah dekat suhu maksimum; panas sisa dialihkan ke desikan (bila layak) atau bypass.',
    value: 'T atas ≥ T maks − 1 K',
    tag: 'asumsi',
  },
  {
    id: 'router-jadwal-tetap',
    title: 'Jadwal tetap sebagai pembanding naif',
    body:
      'Strategi jadwal tetap mengirim seluruh panas ke desikan pada pukul 11.00–15.00 bila desikan membutuhkannya, tanpa melihat suhu atau permintaan air panas. Strategi ini dipakai sebagai pembanding untuk menunjukkan nilai pengendalian adaptif.',
    value: '11.00–15.00 waktu setempat',
    tag: 'asumsi',
  },
  {
    id: 'router-bukan-carbon-aware',
    title: 'Value-ranked, bukan carbon-aware real-time',
    body:
      'Peringkat bersifat statis menurut nilai per kWh_th, bukan mengikuti faktor emisi jaringan per jam. Indonesia belum memiliki faktor emisi jaringan per jam yang terbuka untuk publik, sehingga pengendalian carbon-aware real-time belum dapat dipertanggungjawabkan.',
    tag: 'usulan',
  },
  {
    id: 'router-simpanan-berguna',
    title: 'Panas simpanan dianggap berguna di atas suhu air jaringan',
    body:
      'Alasan "lepas simpanan" dipakai saat ada permintaan air panas dan suhu atas tangki di atas batas ini, yang kira-kira suhu air jaringan ditambah beberapa kelvin.',
    value: '32 °C',
    tag: 'asumsi',
  },
];
