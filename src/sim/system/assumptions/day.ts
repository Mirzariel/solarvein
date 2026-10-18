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
    title: 'Hari pemanasan sampai tangki hampir periodik',
    body: 'Setiap tipe hari didahului hari-hari pemanasan dengan cuaca yang sama: sampai 3 hari dengan langkah dua kali lebih panjang, dengan ekstrapolasi sisa relaksasi eksponensial suhu tangki, lalu sampai 2 hari pada langkah sebenarnya. Berhenti bila perubahan panas tersimpan dalam sehari di bawah 0,2 % kebutuhan air panas harian. Hanya hari terakhir yang dicatat, sehingga hasil tidak bergantung pada suhu tangki awal. Pada kasus yang sangat lambat (tangki besar, kebutuhan kecil) sisa perubahan panas tersimpan dilaporkan di total dan tidak disembunyikan. Untuk skenario hujan 3 hari, pemanasannya hari-hari berawan, karena hujan panjang biasanya didahului hari yang lebih cerah.',
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
    title: 'Pompa mengikuti termostat diferensial dengan satu sensor',
    body: 'Sensor kolektor adalah suhu sel/absorber: suhu diam (dari simulasi pompa mati) saat pompa mati dan suhu sel saat pompa berjalan. Pompa menyala bila sensor melebihi acuan kembali sebesar ΔT hidup, dan mati bila selisihnya turun di bawah ΔT mati; ambang yang sama dipakai untuk memulai dan menghentikan, tidak bergantung pada laju alir. Acuan kembali adalah suhu kembali terendah yang tersedia: dasar tangki bila tangki dapat menerima panas, atau suhu kembali desikan/bypass bila tidak. Agar pompa tidak hidup-mati terlalu sering, pompa tidak boleh berhenti karena termostat selama 30 menit pertama setelah menyala; kolektor yang tidak lagi memberi panas tetap menghentikan pompa.',
    value: 'Mulai/henti: suhu sel − acuan kembali > ΔT hidup / ≤ ΔT mati · waktu jalan minimum 30 menit',
    tag: 'usulan',
  },
  {
    id: 'hari-rantai-air-panas',
    title: 'Rantai penukar panas seri untuk air panas',
    body: 'Air minum melewati rantai seri: air jaringan, lalu penukar panas dari sumber yang lebih dingin (bagian atas tangki atau fluida kolektor), lalu dari sumber yang lebih panas, lalu pemanas yang sudah ada. Tiap tahap memindahkan ε·C·(T_sumber − T_masuk), dibatasi agar suhu air keluar tidak melebihi suhu sumber maupun titik setel (hukum kedua). Panas surya yang dikreditkan adalah C·(T_keluar − T_jaringan); sisanya ditutup pemanas, sehingga kebutuhan tak terpenuhi bernilai nol. Efektivitas ε = 0,7 (asumsi).',
    value: 'ε = 0,7 per tahap',
    tag: 'asumsi',
  },
  {
    id: 'hari-penerimaan-tangki',
    title: 'Tangki menerima panas hanya bila layak',
    body: 'Tangki menerima panas bila fluida pengisi lebih panas daripada dasar tangki lebih dari 1 K dan masih ada ruang panas (dibatasi oleh ruang tersisa dalam satu langkah). Bila tidak, panas yang tersisa dari air panas langsung dialihkan ke desikan atau bypass, sehingga cabang ini dapat dicapai walau suhu maksimum tangki jauh di atas suhu kolektor.',
    value: 'Margin 1 K',
    tag: 'asumsi',
  },
  {
    id: 'hari-bypass-pendingin',
    title: 'Bypass sebagai pembuang panas (dry cooler) yang mendinginkan sel',
    body: 'Bypass berarti panas sengaja dibuang lewat pembuang panas (dry cooler) dengan suhu kembali ambien + 8 K agar sel lebih dingin; nilainya adalah tambahan listrik PV. Pompa pembuangan hanya dijalankan bila tambahan listrik PV (setelah derating) lebih besar daripada daya pompa; jika tidak, pompa mati dan kolektor diam.',
    value: 'Kembali = ambien + 8 K',
    tag: 'asumsi',
  },
  {
    id: 'hari-alasan-bypass',
    title: 'Dua alasan panas dibuang ke pembuang panas',
    body: 'Alasan "tangki penuh" dipakai hanya bila tangki hampir penuh pada skala berguna (keadaan muat 0,9 atau lebih antara air jaringan dan titik setel, atau suhu atas di dekat batas maksimum). Bila tangki belum penuh tetapi cairan kolektor belum cukup panas untuk mengisinya (kurang dari 1 K di atas dasar tangki), alasannya "cairan belum cukup panas".',
    value: 'Penuh: keadaan muat ≥ 0,9',
    tag: 'asumsi',
  },
  {
    id: 'hari-neraca-panas',
    title: 'Neraca panas kolektor: tidak ada selisih yang tak berlabel',
    body: 'Panas yang dikumpulkan sama dengan panas surya untuk air panas, ditambah bypass, ditambah panas ke desikan, ditambah rugi diam tangki, ditambah perubahan panas tersimpan di tangki. Dengan pemanasan yang hampir periodik, suku terakhir kecil dan dilaporkan sebagai perubahan tangki di total; selisih sekitar 8 kWh_th per tahun pada hitungan sebelumnya adalah suku ini, bukan hilang.',
    tag: 'simulasi',
  },
  {
    id: 'hari-gerbang-nilai-desikan',
    title: 'Gerbang nilai untuk desikan pada strategi adaptif',
    body: 'Pada strategi adaptif, panas sisa baru dikirim ke desikan bila penghematan listrik bersihnya per kWh_th (dari evaluateDesiccant pada kondisi saat itu) lebih besar daripada tambahan listrik PV per kWh_th bila panas dibuang lewat bypass (dihitung dari dua simulasi pada suhu masuk berbeda). Bila tidak, panas dibuang. Jalur desikan pada setelan bawaan tidak lolos gerbang ini, sehingga angka adaptif sama dengan prioritas air panas kecuali ada surplus dan asumsi desikan yang lebih optimistis. Evaluasi desikan di-cache per (suhu regenerasi dibulatkan 1 K, suhu udara 0,25 K, rasio kelembapan 2e-4) agar cepat; galat pembulatan jauh di bawah ketidakpastian model.',
    tag: 'hipotesis',
  },
  {
    id: 'hari-soc-tangki',
    title: 'Keadaan muat tangki dinormalkan ke titik setel air panas',
    body: 'Keadaan muat dinyatakan antara suhu air jaringan (0) dan titik setel air panas (1), dengan suhu rata-rata kedua simpul. Kolektor tanpa kaca tidak mencapai suhu maksimum tangki, sehingga normalisasi ke suhu maksimum membuat penunjuk tidak pernah penuh.',
    value: '0 pada 28 °C · 1 pada 60 °C',
    tag: 'asumsi',
  },
  {
    id: 'hari-derating-pv',
    title: 'Derating sistem PV',
    body: 'Listrik PV/T dan PV biasa sama-sama dikalikan faktor derating sistem (inverter, kabel, kotoran, ketidakcocokan, sudut datang) dari parameter susunan. Daya pompa tidak diderating. Hasil PV biasa harus jatuh pada rentang hasil spesifik yang wajar untuk lokasi.',
    value: '0,84 (bawaan)',
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
