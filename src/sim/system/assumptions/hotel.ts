import type { AssumptionEntry } from '../contract';

/**
 * Asumsi hotel, iklim sintetis dan ukuran sistem bawaan (W2a).
 * refId bertanda TODO(R0) adalah penanda sumber yang akan diisi R0; sampai itu terjadi nilainya berstatus asumsi.
 *
 * Perhitungan ukuran larik (hotel 100 kamar):
 *   Beban   : 100 kamar x 0,70 hunian x 80 L/kamar-terisi/hari = 5.600 L/hari pada 60 C.
 *             Energi = 5.600 x 0,99 kg/L x 4,186 kJ/(kg.K) x (60 - 28) K / 3.600 = 206 kWh_th/hari (75 MWh_th/tahun).
 *   Larik   : 50 modul x 1,7 m2 = 85 m2.
 *   Hasil   : simulate() pada suhu masuk 38 C (balik dasar tangki), 85 m2: hari terik 195, berawan 82,
 *             hujan 3 kWh_th/hari (sebelum rugi tangki).
 *   Bobot   : 140 terik / 130 berawan / 95 hujan hari per tahun (ilustrasi; bobot resmi milik day.ts).
 *             (195x140 + 82x130 + 3x95) / 365 = 105 kWh_th/hari = 51 % dari 206 kWh_th.
 *   Bersih  : kurangi rugi tangki (7-8 kWh/hari) dan pemanfaatan sebagian: 35-50 % dari kebutuhan, di dalam rentang 30-60 %.
 *   Tangki  : 85 m2 x 60 L/m2 = 5.100 L; UA = U 0,5 W/(m2.K) x luas selimut = 8,3 W/K.
 */
export const HOTEL_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'hotel-okupansi',
    title: 'Hunian hotel ilustrasi',
    body: 'Hotel ilustrasi 100 kamar di dataran rendah Indonesia dengan hunian rata-rata tahunan 70 %. Angka ini contoh untuk skenario, bukan data satu hotel tertentu.',
    value: '70 % (rentang 65–75 %)',
    tag: 'asumsi',
  },
  {
    id: 'hotel-air-panas-per-kamar',
    title: 'Air panas per kamar terisi',
    body: 'Pemakaian air panas pada titik penggunaan 60 °C diambil di tengah rentang literatur hotel (kira-kira 50–150 L per kamar terisi per hari). Hotel bintang tinggi dengan bak mandi dapat jauh di atasnya.',
    value: '80 L/kamar-terisi/hari pada 60 °C (rentang 50–150)',
    tag: 'asumsi',
    refId: 'cibse-hotel-hot-water', // TODO(R0): ASHRAE Handbook, Service Water Heating, tabel hotel
  },
  {
    id: 'hotel-suhu-set-air-pasok',
    title: 'Suhu set dan air pasok',
    body: 'Pemanas yang sudah ada tetap menjaga air panas di 60 °C atau lebih (pengendalian Legionella). Air pasok dataran rendah berkisar 27–29 °C.',
    value: '60 °C set; 28 °C air pasok (rentang 27–29)',
    tag: 'asumsi',
  },
  {
    id: 'hotel-pemanas-lpg',
    title: 'Pemanas pengganti',
    body: 'Hotel ilustrasi memakai pemanas LPG dengan efisiensi 85 %. Penginapan kecil diasumsikan memakai pemanas listrik tahanan dengan efisiensi 95 %. Pemanas ini selalu menjadi cadangan, sehingga layanan air panas tidak bergantung pada matahari.',
    value: 'LPG η 0,85; listrik tahanan η 0,95',
    tag: 'asumsi',
  },
  {
    id: 'hotel-udara-segar',
    title: 'Udara segar kamar',
    body: 'Laju udara segar mengikuti pola ASHRAE 62.1 untuk kamar tamu (per orang ditambah per luas lantai), sekitar 12–14 L/s per kamar terisi untuk 2 orang di kamar ±30 m². Kamar kosong diasumsikan dikurangi alirannya.',
    value: '1,1 kg/s udara kering (70 kamar terisi × 12–14 L/s)',
    tag: 'asumsi',
    refId: 'ashrae621-addendum-z-2018', // TODO(R0): ASHRAE Standard 62.1, tabel laju ventilasi
  },
  {
    id: 'hotel-titik-embun-suplai',
    title: 'Titik embun udara suplai',
    body: 'Koil pendingin acuan harus mendinginkan udara segar sampai titik embun sekitar 10–12 °C agar kelembapan ruang terkendali. Nilai ini dipakai sebagai beban acuan jalur desikan.',
    value: '11 °C (rentang 10–13)',
    tag: 'asumsi',
  },
  {
    id: 'hotel-iklim-sintetis',
    title: 'Cuaca harian sintetis',
    body: 'Empat tipe hari dibangkitkan secara analitik dan deterministik. Hari hujan bukan nol matahari: cahaya difus 80–400 W/m² selama beberapa jam. Iradiansi harian pada bidang panel: terik ±6,1, berawan ±3,9, hujan ±2,0 kWh/m²/hari; tiga hari hujan beruntun ±1,8, 1,6 dan 2,4 kWh/m²/hari.',
    value: 'GHI terik ≈ 6,1 · berawan ≈ 3,9 · hujan ≈ 2,0 kWh/m²/hari',
    tag: 'asumsi',
    refId: 'nasa-power-denpasar', // TODO(R0): bandingkan dengan NASA POWER / PVGIS untuk satu kota bernama
  },
  {
    id: 'hotel-profil-penarikan',
    title: 'Profil penarikan air panas',
    body: 'Puncak pagi pukul 6–9 dan puncak sore pukul 18–22, dengan penarikan kecil malam hari. Profil dinormalkan sehingga jumlah harian tepat sama dengan kamar × hunian × liter per kamar.',
    value: 'Jam puncak ≈ 10 % dari volume harian per jam',
    tag: 'asumsi',
  },
  {
    id: 'hotel-ukuran-larik',
    title: 'Ukuran larik PV/T hotel 100 kamar',
    body: 'Kebutuhan 206 kWh_th/hari. Larik 50 modul × 1,7 m² = 85 m². Pada suhu masuk ±38 °C, simulasi memberi ±195 (terik), ±82 (berawan) dan ±3 (hujan) kWh_th/hari. Dengan bobot ilustrasi 140/130/95 hari, rata-ratanya ±105 kWh_th/hari; setelah rugi tangki dan pemanfaatan sebagian, cakupan tahunan sekitar 35–50 %.',
    value: '85 m² (50 modul) · 5.100 L tangki (60 L/m²) · cakupan sasaran 30–60 %',
    tag: 'simulasi',
  },
  {
    id: 'hotel-ekonomi-sementara',
    title: 'Parameter ekonomi sementara',
    body: 'Tarif listrik bisnis ±1.700 IDR/kWh, LPG nonsubsidi ±17.500 IDR/kg, capex PV/T 2,5–5,5 juta IDR/m², BOS 150–400 juta IDR, unit desikan 100–400 juta IDR, O&M 1,5 % per tahun. Semuanya rentang ilustrasi, bukan penawaran harga.',
    value: '1.700 IDR/kWh · 17.500 IDR/kg · capex PV/T 2,5–5,5 juta IDR/m²',
    tag: 'asumsi',
  },
];
