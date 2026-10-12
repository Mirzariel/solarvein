import { MODEL_CONSTANTS as K } from './model';
import { DEFAULT_CARBON } from './carbon';

export const ASSUMPTIONS: { id: string; title: string; body: string; value?: string }[] = [
  {
    id: 'steady-lumped',
    title: 'Model steady-state, satu node panel',
    body: 'Sel PV dan pelat penyerap diperlakukan sebagai satu node isotermal yang berada dalam kesetimbangan energi pada setiap kondisi masukan. Massa termal panel diabaikan, sehingga profil harian bersifat kuasi-steady dan hanya ilustratif.',
  },
  {
    id: 'hardware-class',
    title: 'Kelas perangkat keras: laminasi tanpa celah udara',
    body: 'Panel dimodelkan sebagai laminasi PV berkaca depan tanpa celah udara (kaca ± 3,2 mm menempel pada sel lewat EVA), sehingga berperilaku seperti kolektor kelas tanpa kaca penutup berongga ("unglazed"): permukaan depan langsung bertukar panas dengan udara dan langit. Kolektor berkaca dengan celah udara tertutup justru penukar panas ke lingkungan yang jauh lebih lemah dan akan membuang panas jauh lebih sedikit (kira-kira 80–85 % lebih kecil pada skenario hujan), sehingga hasil pembuangan panas di sini tidak berlaku untuk jenis tersebut.',
  },
  {
    id: 'glass-resistance',
    title: 'Resistansi seri kaca dan laminasi',
    body: 'Sel dan permukaan kaca dipisahkan resistansi seri (kaca + EVA). Konveksi, radiasi ke langit, dan pendinginan hujan bekerja pada suhu permukaan kaca T_g, bukan pada suhu sel: T_sel = T_g + (Q_depan + Q_hujan)/(A·U_cg). Akibatnya sel sedikit lebih panas dan aliran panas ke lingkungan sedikit lebih kecil dibanding model tanpa resistansi ini.',
    value: 'U_cg = 200 W/(m²·K)',
  },
  {
    id: 'optics',
    title: 'Penyerapan cahaya',
    body: 'Energi surya yang diserap = τα × G × A. Sisanya (pantulan dan transmisi) dihitung sebagai rugi optik. Daya listrik diambil dari energi yang diserap, bukan ditambahkan di atasnya.',
    value: `τα = ${K.tauAlpha}`,
  },
  {
    id: 'pv-temp',
    title: 'Efisiensi PV turun terhadap suhu',
    body: 'η = η_ref × [1 − β (T_sel − 25 °C)], dibatasi tidak negatif. Nilai η_ref dan β dapat diubah di mode Lab (silikon kristalin: β ≈ 0,35–0,45 %/K).',
    value: 'η_ref = 20 %, β = 0,35 %/K',
  },
  {
    id: 'front-loss',
    title: 'Rugi panas permukaan depan',
    body: 'Konveksi mengikuti korelasi angin Watmuff (hanya komponen konveksi), radiasi inframerah dihitung terpisah menuju suhu langit efektif. Suhu langit lebih rendah dari udara saat cerah dan hampir sama dengan udara saat hujan/berawan.',
    value: `h_konv = ${K.hConvA} + ${K.hConvB}·v W/(m²·K); ε = ${K.emissivityFront}; depresi langit ${K.skyDepressionDryK} K (kering) → ${K.skyDepressionRainK} K (hujan ≥ ${K.rainSkySaturationMmH} mm/jam)`,
  },
  {
    id: 'rain',
    title: 'Pendinginan oleh hujan (pendekatan)',
    body: 'Tetes hujan dianggap bersuhu sekitar bola basah (suhu udara dikurangi 1 K) dan sebagian tetes menyerap panas dari permukaan kaca secara sensibel: q = ε_hujan × ṁ″ × c_air × A × (T_kaca − T_hujan). Ini pendekatan rekayasa, bukan korelasi universal yang tervalidasi. Penguapan dari lapisan air TIDAK dimodelkan: potensinya sebanding dengan suku sensibel (bergantung pada selisih tekanan uap antara permukaan basah dan udara, bukan pada kelembapan udara saja), sehingga kemungkinan besar pendinginan hujan sedikit dianggap terlalu kecil dan ketidakpastiannya besar. Pada preset hujan, ε_hujan 0,3–1,0 menghasilkan aliran panas dari cairan ≈ 485–690 W (nilai tengah ≈ 550 W; tanpa hujan ≈ 410 W): hujan menyumbang kurang dari sepertiga, selebihnya berasal dari angin dan radiasi ke langit.',
    value: `ε_hujan = ${K.rainEffectiveness} (pita 0,3–1,0); ΔT bola basah = ${K.rainTempOffsetK} K`,
  },
  {
    id: 'back',
    title: 'Sisi belakang panel',
    body: 'PVT diinsulasi sehingga rugi belakang kecil dan tetap; PV konvensional terbuka sehingga melepas panas lewat konveksi dan radiasi di sisi belakang. Karena itu, PVT yang pompanya mati (stagnasi) bisa lebih panas daripada PV konvensional.',
    value: `U_belakang PVT = ${K.uBackInsulated} W/(m²·K)`,
  },
  {
    id: 'exchanger',
    title: 'Penukar panas ε–NTU',
    body: 'Panel isotermal terhadap aliran cairan: NTU = U_pf·A/(ṁ·c_p), efektivitas ε = 1 − exp(−NTU), Q_cairan = ε·ṁ·c_p·(T_panel − T_in). Arah aliran cairan selalu masuk → keluar; hanya tanda Q yang berubah. Air: c_p = 4180 J/(kg·K), ρ bergantung suhu.',
  },
  {
    id: 'pump',
    title: 'Daya pompa',
    body: 'Rugi tekan diskalakan dengan kuadrat debit dari nilai acuan pada 2 L/mnt (aliran turbulen). Daya listrik = ΔP·V̇/η_pompa ditambah elektronik tetap saat pompa berjalan. Panas gesekan pompa pada fluida diabaikan.',
    value: `ΔP ∝ V̇²; daya tetap = ${K.pumpFixedW} W`,
  },
  {
    id: 'controller',
    title: 'Logika pengendali (mode Otomatis)',
    body: `Panen: pompa menyala bila ada beban panas, panas ke cairan > ${K.minHeatFlowW} W, dan bahan bakar yang dihemat ≥ ${K.harvestToPumpRatio}× daya listrik pompa. Buang (hanya SolarVein): ada sumber panas, cairan lebih hangat dari panel (Q < −${K.minHeatFlowW} W), dan listrik pendingin yang dihemat lebih besar dari daya pompa ditambah penurunan daya PV akibat panel lebih panas. Selain itu pompa mati.`,
  },
  {
    id: 'valuation',
    title: 'Penilaian manfaat',
    body: 'Panas yang dipanen hanya bernilai bila ada beban panas (dikonversi ke bahan bakar dengan efisiensi pemanas). Panas yang dibuang hanya bernilai bila ada sumber panas nyata (dikonversi ke listrik pendingin dengan COP peralatan yang digantikan). Pembandingnya menentukan nilainya: untuk loop hanya ±20 K di atas udara sekitar, pembanding realistis adalah dry cooler berkipas (COP ≈ 20–40) atau menara pendingin (≈ 15–30), bukan chiller (≈ 3–4); dengan chiller manfaat tampak 10 kali lebih besar. Pilihan pembanding selalu ditampilkan dan dapat diubah. Watt termal dan watt listrik tidak pernah dijumlahkan menjadi satu angka tanpa konversi yang ditampilkan.',
    value: 'η_pemanas = 85 %; COP pembanding = 30 (dry cooler; chiller 3,5 sebagai opsi)',
  },
  {
    id: 'carbon',
    title: 'Asumsi karbon',
    body: 'Kredit karbon memakai kondisi sesaat yang diekstrapolasi dengan jam setara beban penuh per tahun. Faktor emisi grid dan LPG adalah perkiraan dan dapat diubah. Penghematan pendinginan hanya dihitung bila pengguna menyatakan secara eksplisit bahwa pendingin mekanis memang digantikan. Emisi tertanam unit tidak pernah nol. Jam setara per tahun bergantung skenario: 1400 jam wajar untuk snapshot cerah, tetapi hujan deras (±15 mm/jam) hanya terjadi ±120–250 jam per tahun (1400 jam × 15 mm/jam = 21 m hujan, jauh di atas curah hujan tahunan ±2 m), sehingga untuk skenario hujan gunakan jam yang jauh lebih sedikit. Selain total, tersedia buku besar inkremental terhadap PV konvensional pada kondisi yang sama, dengan emisi tertanam tambahan (penukar panas, insulasi, pompa) ±180 kgCO2e (kisaran 100–250).',
    value: `grid ${DEFAULT_CARBON.gridKgPerKWh} kgCO2e/kWh; LPG ${DEFAULT_CARBON.fuelKgPerKWh} kgCO2e/kWh; ${DEFAULT_CARBON.hoursPerYear} jam/tahun (cerah), 120–250 jam/tahun (hujan deras); tertanam ${DEFAULT_CARBON.embodiedKg} kgCO2e, tambahan ${DEFAULT_CARBON.incrementalEmbodiedKg} kgCO2e`,
  },
];

export const LIMITATIONS: string[] = [
  'Ini simulasi konseptual untuk edukasi, bukan CFD dan bukan data lapangan yang tervalidasi.',
  'Model steady-state: tidak ada massa termal, sehingga respons terhadap awan lewat atau hujan singkat tidak ditangkap.',
  'Koefisien pendinginan hujan adalah pendekatan sederhana: penguapan dari lapisan air tidak dimodelkan (kemungkinan besar membuat pendinginan hujan sedikit terlalu kecil) dan efektivitas tetes dipatok 0,5. Dengan ε 0,3–1,0 hasil pada preset hujan berkisar ≈ 485–690 W; hasil kuantitatifnya bisa meleset signifikan di lapangan.',
  'Perangkat keras yang dimodelkan adalah laminasi berkaca depan tanpa celah udara (kelas tanpa kaca penutup berongga). Kolektor berkaca dengan celah udara adalah penukar panas ke lingkungan yang jauh lebih lemah dan akan membuang panas ±80–85 % lebih sedikit.',
  'Satu node panel: gradien suhu di dalam panel dan sepanjang aliran dalam kanal tidak diselesaikan. Suhu penyerap dan permukaan belakang pada profil hanya estimasi diagnostik; suhu kaca berasal dari resistansi seri kaca–sel (U_cg = 200 W/m²K).',
  'Sifat air tetap (c_p konstan) dan tidak ada risiko beku, pembentukan uap, atau pertumbuhan biofilm yang dimodelkan; suhu stagnasi di atas 100 °C hanya diberi peringatan, bukan dimodelkan sebagai pendidihan.',
  'Pengendali bersifat steady-state tanpa histeresis; pada dunia nyata diperlukan selisih suhu hidup/mati agar pompa tidak sering berpindah.',
  'Nilai pembuangan panas bergantung penuh pada peralatan pendingin yang digantikan: dengan dry cooler (COP ≈ 20–40) manfaat listriknya hanya puluhan watt dan kecil dibanding daya pompa; hanya chiller (COP ≈ 3–4) yang memberi manfaat besar.',
  'Pembuangan panas menguntungkan hanya bila ada sumber panas nyata yang lebih hangat dari panel; tanpa itu, SolarVein tidak membuat panas dan tidak mengklaim manfaat pendinginan.',
  'Pada musim kering atau saat tidak ada beban panas, PVT tanpa pompa lebih panas daripada PV konvensional dan dapat menghasilkan listrik lebih sedikit; PV konvensional kadang merupakan pilihan terbaik.',
  'Pompa yang dipaksa menyala tanpa beban/sumber panas dihitung dengan T_in masukan; pada sistem tertutup nyata T_in akan menyesuaikan diri mendekati suhu panel.',
  'Angka karbon bergantung pada faktor emisi, jam operasi, dan emisi tertanam yang diasumsikan; angka bawaan hanya perkiraan orde besar.',
  'Intensitas hujan dianggap jatuh tegak lurus pada permukaan panel (sudut miring dan efek angin pada lintasan tetes diabaikan).',
];
