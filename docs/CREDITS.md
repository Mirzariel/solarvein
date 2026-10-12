# Kredit media

Semua media di situs adalah **ilustrasi konteks**, bukan pemasangan SolarVein yang nyata. Kalimat "Ilustrasi konteks: …"
ada di `alt` setiap media; kredit tampil di footer ("Kredit foto & video", daftar di `src/sections/credits.ts`), tidak di
dalam komposisi.

## Video (Mixkit Free License: boleh dipakai, termasuk komersial, tanpa atribusi wajib)

| File | Dipakai di | Sumber |
|---|---|---|
| `public/videos/hero-array.mp4` | Pembuka (kartu video) | Mixkit 47875, <https://mixkit.co/free-stock-video/close-up-of-solar-panels-on-a-snow-field-47875/> |
| `public/videos/cell-macro.mp4` | Jeda sinematik | Mixkit 32520, <https://mixkit.co/free-stock-video/surface-of-a-solar-panel-32520/> |

## Foto diam (frame dari klip Mixkit, lisensi sama)

| Kunci manifest | Dipakai di | Asal |
|---|---|---|
| `hero-array` | poster video pembuka | frame 0,2 s klip 47875 |
| `cell-macro` | poster video jeda | frame 0,2 s klip 32520 |
| `roof-aisle` | Dampak (pita foto) | frame 22 s klip 47097, <https://mixkit.co/free-stock-video/view-of-a-solar-panel-farm-generating-sustainable-energy-47097/> |
| `roof-array` | Penutup | frame 3 s klip 47097 |

## Pengolahan

- Video: ffmpeg, H.264 High, CRF 25–27, tanpa audio, `+faststart`, 1280 × 720, ±1 MB per klip. Pembuka diberi grade
  ringan (sedikit lebih terang dan hangat).
- Foto: ffmpeg, AVIF (libaom, CRF 32) + WebP (q80) pada lebar 960 dan 1280, LQIP WebP 24 px, warna rata-rata dan rasio
  di `public/images/photos/manifest.json`.
- Render model 3D (`public/images/renders/hero-golden-*`) dibuat dari model situs sendiri (cadangan saat 3D dimuat).

## Font

Geist dan Geist Mono (SIL Open Font License), di-host sendiri lewat Fontsource.

Riwayat: sebelum redesign Oktober 2026 situs memakai delapan foto Unsplash; semuanya sudah dihapus.
