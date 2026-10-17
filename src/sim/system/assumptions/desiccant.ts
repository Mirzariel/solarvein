/**
 * Documented assumptions of the desiccant research path (W3). Indonesian, EYD V, no hype.
 * The whole path is "Hipotesis riset · belum divalidasi"; individual entries carry their own tag.
 */
import type { AssumptionEntry } from '../contract';

export const DESICCANT_ASSUMPTIONS: AssumptionEntry[] = [
  {
    id: 'desiccant.status',
    title: 'Status jalur desikan',
    body: 'Jalur desikan adalah hipotesis riset. Model memberi putusan layak, marginal, atau tidak layak dari neraca listrik bersih; putusan itu bukan hasil uji lapangan.',
    tag: 'hipotesis',
  },
  {
    id: 'desiccant.isotherm',
    title: 'Isoterm silika-gel RD–air',
    body: 'Kelembapan relatif setimbang sebagai polinomial derajat empat dari kandungan air (kg/kg) hasil fit data produsen, pada suhu acuan 25 °C. Batas serapan maksimum 0,40 kg/kg. Parameter isoterm Tóth atau Henry dari Chua dkk. (2002) dan Ng dkk. (2001) belum diverifikasi dari teks aslinya dan tidak dipakai.',
    value: 'RH = 0,0078 − 0,05759 W + 24,16554 W² − 124,478 W³ + 204,226 W⁴',
    tag: 'terbit',
    refId: 'pesaran-mills-1987',
  },
  {
    id: 'desiccant.heatOfAdsorption',
    title: 'Kalor adsorpsi',
    body: 'Kalor adsorpsi air pada silika-gel RD turun dengan kandungan air dan selalu melebihi kalor penguapan. Selisihnya (kalor pembasahan) membuat udara kering keluar lebih panas daripada kasus isentalpi murni.',
    value: '3500 − 12400 W kJ/kg (W ≤ 0,05); 2950 − 1400 W kJ/kg (W > 0,05)',
    tag: 'terbit',
    refId: 'pesaran-mills-1987',
  },
  {
    id: 'desiccant.temperatureShift',
    title: 'Pengaruh suhu pada isoterm',
    body: 'Polinomial hanya berlaku pada suhu acuan. Pengaruh suhu ditambahkan dengan hubungan Clausius–Clapeyron pada kandungan air tetap, memakai kalor pembasahan (kalor adsorpsi dikurangi kalor penguapan 2442 kJ/kg). Ini ekstrapolasi, bukan hasil pengukuran.',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.cycleEffectiveness',
    title: 'Efektivitas siklus',
    body: 'Hanya sebagian selisih serapan setimbang yang tercapai dalam satu siklus. Faktor yang sama juga membatasi kekeringan udara keluar terhadap kondisi setimbang bed yang sudah diregenerasi. Rentang 0,3–0,6; nilai bawaan ditentukan di parameter sistem.',
    value: '0,3–0,6 (bawaan model 0,45)',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.bedTemperature',
    title: 'Suhu bed saat menyerap',
    body: 'Bed adiabatik menghangat oleh kalor adsorpsi. Batas kekeringan udara keluar dihitung pada suhu rata-rata bed, yaitu rata-rata suhu udara masuk dan keluar, sehingga kapasitas pengeringan turun saat penyerapan besar.',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.regenAir',
    title: 'Udara regenerasi',
    body: 'Pilihan udara ambien atau udara buang hotel. Udara buang diasumsikan sekitar 25 °C dan rasio kelembapan 0,010 kg/kg. Ketersediaan debit udara buang pada gedung nyata belum diperiksa.',
    value: '25 °C; w = 0,010 kg/kg',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.regenHeat',
    title: 'Panas regenerasi tidak dihitung dua kali',
    body: 'Panas yang dikirim pemanas ke udara regenerasi (dari suhu masuk ke suhu regenerasi) sudah mencakup panas desorpsi dan pemanasan ulang bed, karena keduanya diambil dari udara itu. Sisanya keluar sebagai udara buang panas. Jika udara tidak cukup membawa panas atau uap, pelepasan air dikurangi.',
    tag: 'mapan',
  },
  {
    id: 'desiccant.bedSensible',
    title: 'Pemanasan ulang bed dan logam',
    body: 'Pada tiap pergantian fase bed beserta logam penyangganya dipanaskan ulang dari suhu keluar udara proses ke suhu regenerasi, tanpa pemulihan panas. Massa logam diasumsikan 0,5 kg per kg desikan (cp 0,9 kJ/kg·K). Sebesar 40 % kelebihan panas bed diserahkan kembali ke udara proses.',
    value: '0,5 kg logam/kg desikan; 40 % carry-over',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.supplyState',
    title: 'Kondisi udara suplai',
    body: 'Kedua rute (koil acuan dan desikan) berakhir pada kondisi yang sama: titik embun suplai dari parameter hotel dan suhu kering 5 K di atasnya. Pemanasan ulang diabaikan.',
    value: 'T suplai = titik embun + 5 K',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.copPair',
    title: 'COP koil acuan dan after-cooler',
    body: 'Koil acuan bersuhu penguapan rendah dan after-cooler bersuhu penguapan tinggi memakai COP dari parameter karbon. Hasil sangat peka terhadap rasio keduanya: bila after-cooler tidak lebih efisien daripada koil, rute kompresor tidak pernah kalah. Bawaan: koil acuan 3,0 dan after-cooler 3,9 (rasio 1,3, karena suhu penguapan after-cooler sekitar 8–10 K lebih tinggi); rasio yang lebih besar akan terlalu menguntungkan desikan.',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.stagingCredit',
    title: 'Kredit pendinginan sensibel',
    body: 'Pendinginan sensibel udara kering dari suhu ambien ke suhu suplai dikreditkan ke after-cooler hanya sebanding dengan bagian beban kelembapan yang benar-benar dihilangkan desikan. Bed yang tidak bekerja tidak mendapat kredit apa pun.',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.fans',
    title: 'Kipas dan pompa',
    body: 'Daya kipas dihitung untuk kedua aliran (proses dan regenerasi): debit volume dikali penurunan tekanan dibagi efisiensi, dengan massa jenis udara 1,15 kg/m³. Daya pompa dan penalti PV akibat kolektor lebih panas diberikan sebagai masukan; bila tidak diberikan nilainya 0 sehingga hasil bersih menjadi batas atas.',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.verdict',
    title: 'Kriteria putusan',
    body: 'Tidak layak bila selisih serapan kurang dari 0,01 kg/kg atau penghematan listrik bersih nol atau negatif. Marginal bila penghematan kurang dari 15 % listrik koil acuan atau COP termal kurang dari 0,3. Layak untuk selebihnya. Material komposit tidak pernah mendapat putusan layak.',
    value: '< 0,01 kg/kg · < 15 % · COP termal < 0,3',
    tag: 'asumsi',
  },
  {
    id: 'desiccant.heatValue',
    title: 'Nilai panas regenerasi',
    body: 'Neraca listrik bersih tidak memasukkan panas regenerasi sebagai biaya. Panas yang sama dapat memanaskan air (DHW) atau dilepas agar sel PV lebih dingin. Perbandingan nilai per kWh termal ada pada keluaran penghematan listrik per kWh termal.',
    tag: 'simulasi',
  },
  {
    id: 'desiccant.composite',
    title: 'Desikan komposit garam-dalam-matriks',
    body: 'Belum ada isoterm tervalidasi yang dapat dipakai. Angka untuk material ini memakai kurva silika-gel sebagai acuan saja dan diberi label hipotesis; bukan prakiraan kinerja komposit.',
    tag: 'hipotesis',
  },
];
