# Mode presentasi dan ekspor gambar

Untuk demo langsung di final HORIZON 2026 (Yogyakarta, 20 Nov) dan untuk gambar infografis/PPT (tenggat 12 Nov).
Semua angka di situs adalah hasil simulasi; baca angkanya dari layar, jangan dari catatan ini.

## 1. Membuka mode presentasi

| URL | Hasil |
|---|---|
| `/?presentasi=1` | Mode presentasi: header disembunyikan, huruf lebih besar, rel HUD di atas, gulir roda tanpa peredam |
| `/?presentasi=1&skenario=terik` | Buka langsung pada kondisi A (hari terik, 13.00) |
| `/?presentasi=1&skenario=lembap` | Kondisi B (hari hujan, 15.00) |
| `/?presentasi=1&skenario=malam` | Kondisi C (hari terik, 22.00) |
| `/?presentasi=1&skenario=terik&jam=9,5` | Skenario langsung + jam sendiri (`jam` menimpa jam bawaan; boleh juga `berawan`, `hujan`, `hujan-3-hari`) |

`skenario` dan `jam` juga bekerja di situs biasa (tanpa `presentasi`). Esc keluar dari mode presentasi tanpa memuat ulang.

Proyektor 1280 × 720 pada skala 125 % setara jendela 1024 × 576 piksel CSS. Semua pemeriksaan tata letak dilakukan pada
1280 × 720 dan 1024 × 576.

## 2. Peta tombol

| Tombol | Aksi |
|---|---|
| `→`, `PageDown`, `Spasi` | Adegan berikutnya. Jalur demo BERHENTI di Dampak (adegan 4; HUD menulis "akhir jalur · Q&A: tekan 5–9"); tidak berputar ke Cara kerja |
| `←`, `PageUp`, `Shift+Spasi` | Adegan sebelumnya (dari adegan cadangan pertama kembali ke Dampak) |
| `1`–`8` | Lompat ke adegan 1–8 (urutan `PRESENTATION_SCENES` di `src/sections/nav.ts`) |
| `9` | Adegan cadangan "Bagaimana jika hujan 3 hari?" (Sehari di hotel, tampilan 72 jam) |
| `0`, `Home` | Kembali ke pembuka |
| `A` `B` `C` | Pilih kondisi (terik siang, lembap & mendung, malam); selalu kembali ke tampilan 24 jam |
| `R` | Setel ulang: sistem bawaan, kondisi A, tampilan 24 jam |
| `L` | Buka Lab › Rincian (`#lab-rincian`) |
| `H`, `?` | Tampilkan/sembunyikan petunjuk tombol (hilang sendiri setelah 9 detik) |
| `Esc` | Di dalam slider atau kolom isian: lepas fokus. Di luar itu: keluar dari mode presentasi |

Adegan: 1 Masalah · 2 Sistem · 3 Sehari di hotel · 4 Dampak (jalur demo) · 5 Cara kerja · 6 Jalur riset desikan · 7 Lab · 8 Validasi
· 9 Hujan 3 hari (cadangan tanya jawab).

Aturan agar tidak bentrok dengan kontrol:

- Tombol diabaikan saat fokus ada di `input`, `textarea`, `select`, atau slider (panah dan PageDown menggerakkan slider seperti biasa).
  Tekan `Esc` sekali untuk melepas fokus, lalu tombol adegan hidup lagi.
- Klik mouse pada tombol, radio, atau tab melepas fokusnya, sehingga `Spasi` dan panah tetap memindahkan adegan.
- `Ctrl`, `Alt`, dan `Cmd` tidak pernah ditangkap (pintasan peramban tetap jalan).
- Adegan = lompatan instan ke bagian atas seksi, atau ke pameran utamanya bila ditandai `data-presentasi-focus` (Sistem: panggung 3D dengan pemilih A/B/C tepat di bawah HUD). Di dalam adegan cadangan (5–9), ← dan → berpindah antar adegan cadangan.
- Menggulir dengan tangan tetap sah: penghitung adegan ikut mengikuti posisi.

## 3. Jalur demo, sekitar 3 menit

Urutan tombol: `→` (Masalah) · `→` (Sistem) · `A` `B` `C` · `→` (Sehari) · `→` (Dampak).

| Waktu | Adegan | Tunjukkan | Kalimat kunci |
|---|---|---|---|
| 0:00 | Pembuka | Layar judul | Satu kalimat konsep: panas dari atap dipakai untuk air panas hotel. |
| 0:10 | 1 Masalah | Dua beban hotel tropis: air panas dan udara lembap | Hotel membeli panas untuk air, sementara panas atap terbuang. |
| 0:40 | 2 Sistem | Panggung 3D. `A` terik siang → `B` lembap & mendung → `C` malam | Panel memanen; pengendali memilih tujuan panas. Mode dihitung dari kondisi, bukan jam. |
| 1:30 | 3 Sehari di hotel | Grafik 24 jam: ke mana panas pergi, kebutuhan air panas, jam digeser | Layanan air panas tidak pernah bergantung pada matahari; pemanas cadangan selalu siap. |
| 2:15 | 4 Dampak | Kalimat hasil dan aliran CO₂e terhadap B2 (pembanding utama yang jujur) | Terhadap B2 hemat karbonnya lebih kecil, dan tidak balik modal; tunjukkan apa adanya. |
| 3:00 | Selesai | | Tawarkan pertanyaan; Q&A pakai adegan 5–9. |

Aturan bicara: tidak ada klaim "PV/T menghasilkan listrik lebih banyak" (selisihnya hampir nol; nilainya ada di panas). Desikan selalu
disebut "Hipotesis riset · belum divalidasi".

## 4. Cadangan tanya jawab

| Pertanyaan yang mungkin | Tombol | Jawaban dari layar |
|---|---|---|
| Bagaimana jika hujan tiga hari? | `9` | Sehari di hotel, tampilan 72 jam. Kebutuhan tak terpenuhi nol (pemanas cadangan menutup); fraksi surya turun tajam; hasil karbon bersih bisa lebih buruk dari B1 dan situs menyatakannya. |
| Bagaimana router memutuskan? | `5` | Cara kerja: aturan prioritas air panas → tangki → desikan → bypass, dengan gerbang nilai. |
| Mengapa desikan tidak dipakai? | `6` | Router menolak desikan karena nilainya lebih rendah; titik impas rasio COP ada di bagian itu. Status: hipotesis riset. |
| Asumsi apa yang dipakai? | `L` | Lab › Rincian, tiap asumsi berpenanda bukti dan rujukan. |
| Bisa digeser angkanya? | `7` | Lab: slider (klik slider, geser, `Esc` untuk lanjut ke adegan). |
| Apa yang belum terbukti? | `8` | Validasi: risiko berperingkat, peta jalan eksperimen. |

Setelah menjawab, `R` mengembalikan sistem ke bawaan.

## 5. Menjalankan offline

```bash
npm run build && npm run preview        # http://localhost:4173
# lalu buka  http://localhost:4173/?presentasi=1&skenario=terik
```

Tidak ada permintaan jaringan saat berjalan: font (Geist) dan foto/video dilayani dari `dist/`. Tetap periksa: buka DevTools › Network,
centang Offline, muat ulang, dan gulir seluruh jalur demo sekali.

Daftar siap panggung (H-1 dan 30 menit sebelum naik):

- [ ] `npm run build` sukses pada laptop presentasi; `npm run preview` berjalan di jendela terminal terpisah.
- [ ] Tampilan layar 1280 × 720 skala 125 % (atau jendela 1024 × 576 CSS); Chrome layar penuh (`F11`); zoom peramban 100 %.
- [ ] Mode pesawat / Wi-Fi mati; notifikasi, pembaruan, dan penghemat daya dimatikan; laptop dicolok ke listrik.
- [ ] Satu putaran penuh: `1`…`9`, `A B C`, `R`, `L`, `Esc`, tanpa galat di konsol.
- [ ] GPU/WebGL berfungsi (panggung 3D tampil); bila tidak, situs jatuh ke gambar statis, tetap bisa dipresentasikan.
- [ ] Tab kedua sudah terbuka pada `/?presentasi=1&skenario=malam&jam=22` untuk lompat cepat bila perlu.

## 6. Cadangan bila situs gagal (rekaman layar)

- [ ] Rekam jalur demo 60 detik pada 1280 × 720 (Xbox Game Bar `Win+G` atau OBS), tanpa suara, H.264 MP4.
- [ ] Urutan rekaman: Masalah → Sistem (A, B, C) → Sehari (geser jam) → Dampak. Tahan tiap adegan sekitar 10–15 detik.
- [ ] Simpan di tiga tempat: laptop presentasi (desktop), flash disk, ponsel/laptop kedua. Putar sekali pada proyektor yang sama.
- [ ] Sisipkan rekaman di PPT pada slide terakhir sebagai slide cadangan; siapkan juga PDF PPT.
- [ ] Cetakan atau PNG dari `docs/exports/` (router, grafik sehari, desikan, KPI) untuk menjawab bila layar mati sama sekali.
- [ ] Putuskan sebelumnya siapa yang memberi aba-aba beralih ke rekaman dan pada detik berapa (patokan: bila situs belum tampil setelah 20 detik).

## 7. Ekspor gambar untuk infografis dan PPT

Halaman ekspor: `/?export=1&static=1`. Tanpa header, Lenis, atau kanvas 3D; tiap gambar diberi bingkai kertas terang ukuran tetap
(16:9 = 1600 × 900, 4:5 = 1200 × 1500) dengan kaki data: jenis bukti, rujukan, dan "Hasil simulasi SolarVein v2 · asumsi ilustratif".
`static=1` memaksa gerak berkurang, sehingga semua batang dan grafik sudah penuh. `&only=day-chart,router-diagram` menyaring.

Satu perintah node (tanpa `npm`), situs harus sudah berjalan di `--url`:

```bash
node scripts/export/figures.mjs --url http://localhost:4173   # situs hasil `npm run build && npm run preview`
node scripts/export/figures.mjs --url http://localhost:5180   # atau server dev integrasi
node scripts/export/figures.mjs --scale 2 --only day-chart --no-svg --out some/dir
```

Hasil masuk ke `docs/exports/` (ditimpa). Jalankan ulang setelah salinan atau tata letak situs berubah: semua gambar dibaca dari
komponen situs yang sama, jadi tidak ada yang digambar ulang dengan tangan. Server dev kadang memuat ulang halaman di tengah jalan;
skrip mengulang tangkapan sampai 3 kali. Untuk hasil paling stabil pakai `preview`. Berkas SVG lama yang tidak lagi dihasilkan
(mis. jumlah SVG per gambar berubah) perlu dihapus dengan tangan.

Opsi: `--url` (asal situs, bawaan `http://localhost:4173`), `--path`, `--out`, `--scale` (bawaan 3), `--only`, `--no-png`, `--no-svg`.
Skrip memakai Chrome/Edge sistem lewat `playwright-core` (sama seperti `scripts/qa`).

| id (nama berkas) | Isi | Varian |
|---|---|---|
| `router-diagram`, `-b`, `-c` | Diagram router situs (`RouterDiagram`, nada `paper`) pada kondisi A, B, C | 16:9 |
| `router-diagram-4x5` | Diagram yang sama, kondisi A dan B bertumpuk | 4:5 |
| `kpi-baselines` | CO₂e bersih per tahun terhadap B1–B4 plus rincian B2 (16:9 ringkas; 4:5 memakai komponen `Waterfall` situs) | 16:9, 4:5 |
| `day-chart` | Grafik sehari situs (`DayTracks`: mode, radiasi, pasokan air panas, tangki, PV), hari terik | 16:9, 4:5 |
| `day-chart-hujan-3-hari` | Sama, skenario 72 jam | 16:9 |
| `desiccant-chart` | Grafik desikan situs (`DesiccantChart`, rasio COP 1,5), dibesarkan; vonis dihitung | 16:9, 4:5 |
| `evidence-legend` | Enam penanda bukti, hanya bentuk (`EvidenceLegend`) | 16:9, 4:5 |

Keluaran: PNG pada 3× (4800 × 2700 atau 3600 × 4500 piksel); SVG untuk setiap `<svg>` sebaris selebar ≥ 300 px (satu atau lebih per gambar; `router-diagram-4x5` menghasilkan dua). SVG adalah upaya terbaik: gaya terhitung ditulis sebagai atribut (warna `rgb()`), kelas dibuang, dan subset Latin
Geist/Geist Mono disematkan sebagai `@font-face` base64. Karakter di luar Latin (subskrip ₂) jatuh ke font cadangan; untuk menyunting di
Illustrator/Figma pasang Geist dan Geist Mono. Semua angka dibaca dari hook `systemSelectors` pada masukan bawaan; mengubah asumsi bawaan
lalu menjalankan ulang skrip menghasilkan gambar baru tanpa menyentuh gambar.

Semua gambar memakai komponen situs yang sebenarnya; hanya ringkasan KPI 16:9 dan angka samping dibuat di `src/export`. Menambah gambar: buat komponen yang dibungkus `<Frame id="…" ratio="16x9" …>` (`src/export/Frame.tsx`), daftarkan di `EXPORTS`
(`src/export/ExportPage.tsx`). Bila bagian situs sudah punya komponen gambar sendiri, pakai ulang di dalam `Frame` (seperti `Waterfall`);
penanda `data-export` di dalam komponen itu otomatis dilepas supaya id tetap unik.

## 8. Catatan teknis (untuk pengembang)

- Kode: `src/presentation/` (`PresentationRoot`, `Hud`, `controller`, `keys`, `scenes`, `preset`, `appMode`, `presentasi.css`),
  `src/export/`, `scripts/export/figures.mjs`. Uji murni: `src/presentation/presentation.test.ts`.
- Pemasangan (lead): `App.tsx` memuat `<PresentationRoot />`; `main.tsx` memilih `ExportPage` bila `appMode() === 'export'` dan mengimpor
  `./presentation/earlyPreset` sebelum `./App` (agar `?skenario` sudah berlaku saat mesin gerak membaca target pertamanya: tanpa transisi 1 detik).
- Status toko: `presentation` (true selama mode aktif) dan `scene` (indeks adegan 0–8) diisi pengendali.
- Kelas `presentasi` pada `<html>` menaikkan token tipe (body, small, label, mono) dan menyembunyikan `header[data-over-photo]`.
- Lenis: `options.smoothWheel = false` selama mode aktif (Lenis tetap hidup untuk ScrollTrigger dan tautan jangkar), dipulihkan saat keluar.
- Fokus adegan: bagian yang ingin ditampilkan lebih dalam dari bagian atas seksi menandai pameran utamanya dengan `data-presentasi-focus`;
  lompatan menyelaraskan elemen itu tepat di bawah HUD. Cadangan bawaan: `[data-stage-card]` untuk `#sistem`.
- Posisi dikoreksi ulang selama ±2 detik setelah lompatan (potongan malas dan penyangga pin ScrollTrigger mengubah tata letak); roda atau sentuhan
  membatalkan koreksi.
