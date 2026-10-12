# 07 — Creative Direction v2 (Agent A, Phase 3b + 3c)

Supersedes the austere parts of `05-creative-direction.md` (no giant headings, no photography, no shadows, no gradients, light-only page). Keeps its good bones: tokens, semantic colour (amber = heat harvest, blue = rejection, ink = electrical), IBM Plex Mono for instruments, honest physics, 4 px rhythm, left alignment, accent budget. Where 05 and this file disagree, **this file wins**.

Audience: Motion Director (`Hero`, effects), UX Architect (section skeletons, copy), Design Systems (`index.css`, `src/ui`), 3D Engineer (stage mood), QA.

Status of deliverables (all on disk):
- Photos: `public/images/photos/*` (8 photos, AVIF + WebP, `manifest.json` with aspect, average colour and 24 px LQIP). Credits: `docs/CREDITS.md`.
- Type specimen evidence (real renders): `docs/audit/creative/type-specimen-*.png`.
- Chapter order in this file: **A Copy deck · B Typeface decision and type spec · C Narrative structure and wireframes · D Depth system · E Dampak band · F Photo map · G Anti-AI checklist v2 · H Handoff notes**.

---

# A. Copy deck (Indonesian, final unless the lead objects)

Voice: confident, warm, specific. Say the concrete thing, then stop. A person could repeat any headline to a friend. Honest verbs ("bisa", "berpotensi", "di model ini"). No hype words (revolusioner, terobosan, canggih, inovatif, game-changer, solusi masa depan), no exclamation marks, no stacked rhetorical questions, no "kami bangga". Pronoun: avoid; if unavoidable use "kamu", never "Anda". Every headline <= 6 words per line of the pattern; max two sentences per supporting line.

Placeholders `{...}` are filled from `src/sim` (never typed by hand). `NBSP` rules are in chapter B.6. A string marked **[SCIENCE]** must stay verbatim (or be produced by `src/sim`).

## A.0 Global

| Key | String | Note |
|---|---|---|
| wordmark | SolarVein | Instrument Sans 600, 18/20, tracking -0.02em. No logo mark yet. |
| nav.pengalaman | Pengalaman | `#pengalaman` |
| nav.di-dalam | Di dalam | `#di-dalam` (NBSP between words) |
| nav.dampak | Dampak | `#dampak` |
| nav.lab | Lab | `#lab` |
| nav.perbandingan | Perbandingan | `#perbandingan` |
| header.cta | Coba simulasinya | Button, >= 1024 px only, scrolls to `#pengalaman`. Hidden while `#pengalaman` is in view. No sign-up, no price. |
| menu.open / menu.close | Menu / Tutup | Mobile sheet |
| skip | Lompat ke konten | Skip link |
| section numerals | 01, 02, 03, 04 | Mono 12/16 `ink-3`, only on the four engineering rooms. Dampak and Penutup are unnumbered. |

## A.1 Opening (full-bleed photo `rooftops-golden`)

Opening headline: three candidates, **pick = B**.

| | Headline (hand-set break) | Why |
|---|---|---|
| A | Atap yang bekerja / dua arah. | Elegant but abstract; the friend asks "dua arah apa?". Keep as an alternate for the Pengalaman bridge if needed. |
| **B (pick)** | **Matahari memberi dua hal. / Ambil keduanya.** | Concrete (sun gives two things: electricity and heat), repeatable, rhythm of one long and one short sentence. Honest: the sunny preset delivers both ({pe} W and {q} W). The "dua arah" idea arrives in the supporting line and in 01. |
| C | Panas di atap / tak perlu terbuang. | Honest, a little defensive; reads as a pitch for efficiency, not a discovery. |

| Key | String |
|---|---|
| opening.h1 | Matahari memberi dua hal.⏎Ambil keduanya. |
| opening.lead | Listrik dan panas dari satu panel. Saat hujan, arah panasnya bisa berbalik. |
| opening.cta.primary | Coba simulasinya |
| opening.cta.secondary | Lihat di dalamnya |
| opening.caption | Ilustrasi konteks: panel surya di atap bangunan saat matahari terbenam. Foto: Nuno Marques, Unsplash. |

"bisa berbalik" is deliberate: the model, not a mode flag, decides the direction (see sign convention). No scroll hint text; the stage peeking under the fold does the job.

## A.2 01 Pengalaman

| Key | String |
|---|---|
| s01.h2 | Satu panel. Dua arah panas. |
| s01.line | Ganti cuacanya. Ikuti ke mana panas pergi. |
| mode.label (aria) | Cuaca |
| mode.sunny / mode.rainy | Cerah / Hujan |
| mode.custom | Kustom |
| mode.custom.tip | Masukan diubah di Lab. Pilih Cerah atau Hujan untuk kembali ke preset. |
| link.lab | Buka Lab |
| hint.drag (desktop) | Seret untuk memutar. Gulir untuk memperbesar. |
| hint.drag (touch) | Geser untuk memutar. Cubit untuk memperbesar. |
| tool.reset | Kembali ke sudut awal |
| tool.fullscreen / tool.fullscreen.exit | Layar penuh / Keluar layar penuh |
| tool.legend | Arti simbol |
| tool.autorotate | Putar otomatis |
| rule (caption under stage, always visible, 13/20) **[SCIENCE]** | Cairan selalu mengalir dari masuk ke keluar. Yang bisa berbalik hanya arah panasnya. |
| readout.electric | Listrik, `{pe}` W<sub>e</sub> |
| readout.thermal.harvest | Panas ke cairan, `↓ {q}` W<sub>th</sub> |
| readout.thermal.reject | Panas dibuang, `↑ {q}` W<sub>th</sub> (show magnitude, glyph carries the sign) |
| readout.thermal.other | Panas ke cairan, `{q}` W<sub>th</sub> |
| annot.tin / annot.tout | Cairan masuk `{T_in}` °C / Cairan keluar `{T_out}` °C |
| annot.pe | Listrik `{pe}` W |
| annot.g | Sinar matahari `{G}` W/m² |
| loading | Memuat model 3D |
| no-webgl | Peramban ini tidak bisa menampilkan model 3D. Skema penampang di bawah memuat informasi yang sama. |

Regime statements (the single sentence slot; label line = mode text with 6 px dot; `{...}` from `SimResult`). One sentence + one short detail line. Only `not-beneficial.headline` is verbatim-critical; every other string keeps the same *meaning* as `src/sections/hero/regime.ts`.

| key | mode label (dot) | headline | detail |
|---|---|---|---|
| harvest | Panen panas (amber) | Panel memanen panas. | Cairan masuk {tIn} °C, keluar {tOut} °C. Panasnya siap dipakai. |
| reject | Pembuangan panas (blue) | Panel membuang panas ke udara dan hujan. | Cairan masuk {tIn} °C, keluar {tOut} °C. Panas pindah dari cairan ke panel, lalu ke lingkungan. |
| not-beneficial **[SCIENCE]** | Tidak menguntungkan | Pendinginan tidak menguntungkan pada kondisi ini. | Cairan {tIn} °C, panel {cell} °C. Cairan belum cukup hangat dibanding panel, jadi panas yang bisa dibuang tidak sepadan dengan listrik pompa. |
| neg-noload | Tanpa beban panas | Pompa menyala, tapi tak ada beban yang memakai panasnya. | Cairan menerima ±{q} W. Tanpa beban panas, ini tidak dihitung sebagai manfaat. |
| neg-nosource | Tanpa sumber panas | Cairan lebih hangat dari panel, tapi tak ada panas yang perlu dibuang. | Pembuangan tidak dihitung sebagai manfaat tanpa sumber hangat yang nyata. |
| neg-small | Pertukaran kecil | Pertukaran panasnya terlalu kecil untuk berarti. | Aliran ke cairan hanya {q} W, sebanding dengan daya pompa {pump} W. |
| idle-off | Pompa mati | Pompa dimatikan. Cairan diam. | Panel stagnan di {cell} °C. Panas tertahan insulasi dan daya listrik ikut turun. |
| idle-none | Pompa mati | Pompa mati. Tak ada yang perlu dipanen atau dibuang. | Tanpa beban panas dan tanpa sumber panas, pompa tidak diperlukan. |
| idle-auto | Pompa menunggu | Pompa menahan diri. | Pengendali menahan pompa: panas yang bisa dipanen belum sepadan dengan listrik pompa. Panel {cell} °C. |

Advisories (`SimResult.advisories[].message`) are rendered verbatim from `src/sim`; do not rewrite them.

## A.3 02 Di dalam SolarVein

| Key | String |
|---|---|
| s02.h2 | Empat lapisan, satu pertukaran panas. |
| s02.line | Pilih sebuah lapisan. (touch: Ketuk sebuah lapisan.) |
| btn.explode / btn.assemble | Urai / Satukan |
| btn.section / btn.section.off | Potong penampang / Tutup potongan |
| layer.1 | **Sel surya**: Mengubah cahaya jadi listrik. Makin panas, makin turun hasilnya. Spec: `η acuan {etaRef}%` · `β −{beta}%/K` |
| layer.2 | **Absorber**: Pelat logam yang memindahkan panas dari sel ke saluran cairan. Spec: `U_pf {uPlateFluid} W/(m²·K)` |
| layer.3 | **Saluran cairan**: Air mengalir dari masuk ke keluar, selalu searah. Yang berubah arah adalah panasnya, bukan alirannya. Spec: `{flow} L/min` · `T_in {tIn} °C` |
| layer.4 | **Bagian belakang**: Insulasi menahan panas supaya tidak lari lewat belakang panel. Spec: `U_belakang {uBack} W/(m²·K)` |

## A.4 Dampak (id `dampak`, unnumbered, image-led band)

No eyebrow. Headline then lead, then the scaler. Numbers come from `simulate(PRESETS.sunny)`, `computeCarbon(...)` and the user's scaler inputs (chapter E has the arithmetic and the computed defaults).

| Key | String |
|---|---|
| dampak.h2 | Sekitar seperlima jadi listrik. Sisanya jadi panas. |
| dampak.lead | Pada siang cerah satu panel menerima {solarInput} W. Sekitar {pe} W jadi listrik, dan {q} W lainnya bisa ditangkap sebagai air hangat. |
| dampak.photo.caption | Ilustrasi konteks: atap padat di Jakarta Selatan. Foto: Voicu Horațiu, Unsplash. |
| scaler.h3 | Bayangkan {n} atap. |
| scaler.sub | Perkiraan kasar dari simulasi, bukan prediksi. |
| scaler.in.roofs | Jumlah atap |
| scaler.in.panels | Panel per atap |
| scaler.in.hours | Jam setara per tahun (dengan bantuan: 1.200 sampai 1.600 untuk iklim tropis) |
| out.heat | {E_th_total} GWh panas per tahun. Untuk air hangat dan proses. |
| out.elec | {E_e_total} GWh listrik bersih per tahun. Sudah dikurangi listrik pompa. |
| out.co2 | {co2_total} ton CO<sub>2</sub>e lebih sedikit per tahun. Dibanding PV biasa dan pemanas LPG. |
| out.perpanel | Per panel: {E_e} kWh listrik bersih, {E_th} kWh panas, {co2} kg CO<sub>2</sub>e lebih sedikit per tahun. |
| out.lpg | Panas itu setara sekitar {lpg_kg} kg LPG per panel per tahun, kira-kira {tabung} tabung 12 kg. |
| scaler.assump (one visible line) | Siang cerah (900 W/m², udara 32 °C), 1.400 jam setara per tahun, panas dipakai penuh menggantikan LPG. |
| scaler.assump.link | Lihat asumsi dan batasnya |
| disc.1.title | Apa yang belum dihitung |
| disc.1.b1 | Angka ini batas atas: setiap panel dianggap selalu punya beban air panas selama jam setara. |
| disc.1.b2 | Pada hari hujan SolarVein tidak mengurangi emisi di sini. Pembuangan panas baru berguna bila ada pendingin yang digantikan. |
| disc.1.b3 | Emisi pembuatan tambahan ({embodiedInc} kg CO<sub>2</sub>e per panel) sudah dihitung: balik modal emisi {payback} tahun. |
| disc.1.b4 | Biaya, usia pakai, perawatan, dan perpipaan di lokasi belum dimodelkan. |
| disc.1.b5 | Simulasi konseptual. Bukan hasil uji lapangan. |
| disc.2.title | Konteks El Niño dan La Niña |
| disc.2.body | Kemarau yang lebih panjang berarti lebih banyak jam cerah; musim yang lebih basah berarti lebih banyak jam hujan. Ubah jam setara per tahun untuk melihat selisihnya. |
| disc.3.title | Faktor emisi dan nilai kalor |
| disc.3.body | Listrik jaringan {grid} kg CO<sub>2</sub>e/kWh, LPG {fuel} kg CO<sub>2</sub>e/kWh bahan bakar, nilai kalor LPG 46 MJ/kg (12,8 kWh/kg), efisiensi pemanas LPG {boilerEff}%. Semuanya bisa diubah di Lab. |

## A.5 03 Lab rekayasa

Calmer register, denser. Keep every existing `INPUT_LIMITS` label/help string from `src/sim/presets.ts`.

| Key | String |
|---|---|
| s03.h2 | Atur kondisinya. Baca hasilnya. |
| s03.line | Geser sebuah nilai, dan semua angka dihitung ulang dari model yang sama. |
| lab.group.weather / fluid / panel / pump / loads | Cuaca / Cairan / Panel / Pompa / Beban dan sumber panas |
| lab.reset | Setel ulang |
| lab.preset.* | Cerah / Hujan / Kustom (same as mode) |
| chart.energy | Aliran energi |
| chart.profile | Suhu dari depan ke belakang |
| chart.power | Ke mana daya pergi |
| chart.day | Satu hari, jam demi jam (toggle: Hari cerah / Hari hujan) |
| chart.table | Lihat sebagai tabel |
| disc.formula | Rumus yang dipakai. Hint: Untuk yang ingin memeriksa. |
| disc.assump | Asumsi |
| disc.limits | Batas model |
| input.error | Isi angka antara {min} dan {max} {unit}. |
| input.baku | baku (hover on default tick) |

## A.6 04 Perbandingan kinerja

| Key | String |
|---|---|
| s04.h2 | Tiga susunan, satu kondisi. |
| s04.line | Hasilnya bergantung cuaca. Kadang PV biasa yang menang. |
| switch | Kondisi saat ini / Cerah / Hujan |
| col.1 | PV biasa. Sub: tanpa penukar panas |
| col.2 | PV + pendingin cairan. Sub: hanya memanen panas |
| col.3 | SolarVein. Sub: memanen dan membuang panas |
| row.elec | Listrik bersih (W<sub>e</sub>) |
| row.heat | Panas terpakai (W<sub>th</sub>) |
| row.cell | Suhu sel (°C) |
| row.pump | Listrik pompa (W<sub>e</sub>) |
| row.cool | Pendingin yang digantikan (W<sub>e</sub>) |
| marker | lebih tinggi / setara (text, never colour alone) |
| list.win.title / list.lose.title | Unggul di / Terbatas di |
| list.win.1 | Panas terpakai saat ada beban air panas |
| list.win.2 | Pembuangan panas saat ada sumber panas yang nyata |
| list.win.3 | Sel lebih sejuk saat cerah ({cellSV} °C lawan {cellPV} °C di kondisi ini), jadi listrik sedikit lebih tinggi |
| list.lose.1 | Perlu pompa, penukar panas, dan insulasi |
| list.lose.2 | Tanpa beban panas, manfaat panasnya nol |
| list.lose.3 | Hujan tanpa sumber panas: setara PV biasa |
| list.lose.4 | Biaya dan perpipaan di lokasi belum dimodelkan |

Verdict headlines/reasons stay as produced by `src/charts/verdict.ts` (already honest; do not soften).

## A.7 Closing (full-bleed photo `jakarta-dusk`) and footer

| | Closing headline | Why |
|---|---|---|
| A | Matahari sudah di atap. / Tinggal dipakai penuh. | Warm, but "tinggal" undersells the engineering. |
| **B (pick)** | **Atap yang sama. / Dua manfaat.** | Bookends the opening (two things), shortest, factual: electricity and heat from one roof. |
| C | Bayangkan atap-atap kota / bekerja dua kali. | Aspirational ("bayangkan" keeps it a vision) but "dua kali" implies 2x output. |

| Key | String |
|---|---|
| closing.h2 | Atap yang sama.⏎Dua manfaat. |
| closing.line | SolarVein masih sebuah simulasi, dibuat supaya ide ini bisa diuji, dihitung, dan dibantah. |
| closing.cta.primary | Kembali ke simulasi (`#pengalaman`) |
| closing.cta.secondary | Baca asumsi dan batasnya (`#lab` disclosure) |
| closing.caption | Ilustrasi konteks: Jakarta saat matahari terbenam. Foto: Yusuf Habibi, Unsplash. |
| footer.disclaimer **[SCIENCE]** | Simulasi konseptual untuk edukasi. Bukan hasil CFD, belum divalidasi di lapangan, dan bukan produk bersertifikat. |
| footer.credits | Kredit foto (opens a list from `docs/CREDITS.md`) |
| footer.right (mono 12) | SolarVein, simulasi konseptual |

## A.8 Copy review log (what was cut and why)

- Removed "Panas ke cairan: ..." explanations that repeat the arrows; labels are nouns, not sentences.
- Every headline contains a concrete noun (matahari, panel, atap, lapisan, kondisi). No abstract words (solusi, ekosistem, transformasi).
- Numbers appear in copy only when produced by `src/sim` (Dampak lead, regime details, per-panel and scaler outputs).
- The earlier "Dampak" idea of a headline about "masa depan" was dropped: a claim without a number is the first thing a sceptic reads as hype.

---

# B. Typeface decision and type spec (Phase 3c)

## B.1 Evidence

Real renders in headless Chrome, same copy, same photo, same scrim (`docs/audit/creative/type-specimen-*.png`):

| Specimen | Stack | What I saw | Verdict |
|---|---|---|---|
| A (`type-specimen-A.png`) | Inter (opsz) 600 + Inter + Plex Mono | Crisp, very tight display, solid numerals. Looks like every product site generated in the last three years. | Fallback only |
| B | Geist 600 + Geist Mono | Wide, geometric, "developer-tool" voice (Vercel DNA); tnum ok. In the same cluster as Inter for generated pages. | Rejected |
| C | Inter Tight 600 + Inter | Inter with tighter metrics. At -0.04em, specimen A already matches it. No real gain. | Rejected |
| D | Instrument Serif (opening) + Inter Tight + Inter | Beautiful and warm, but (1) accenting one phrase in italic is a documented AI tell, (2) serif display on a warm photo is the most common "tasteful AI" combination, (3) in Indonesian lowercase (y, g, j, p, k) the italic collided with itself ("bekerja dua arah" overlapped), (4) it splits the brand voice into two registers. | Rejected |
| E | Instrument Sans 600 + Hanken Grotesk | Instrument Sans display is characterful; Hanken body is friendly but see F-G. | Partial |
| F / G / H (`type-specimen-2-*.png`) | One family each: Instrument Sans / Hanken / Inter, with big numbers, mixed numerals, labels, buttons | **Hanken has no tabular figures** (width test: `tnum` changes nothing), so a column of data would jitter; it also reads rounder and less exact. Instrument Sans has `tnum`, a distinct y/g/a, and a wide body that stays readable at 13 px. Inter is the most precise but the most generic. | Instrument Sans wins |
| J / K / L / M (`type-specimen-3-width.png`) | Instrument Sans display at wdth 100/92/88/85, weight 600-700, 88 px | wdth 100 breaks "Atap yang bekerja dua arah." into three lines at 640 px; **wdth 92 / 600 / -0.035em** holds two lines and is the best balance of tight and legible; wdth 85-88 at 650-700 closes the word spaces and looks cramped. | wdth 92 / 600 |
| Mono comparison (inside F) | Plex Mono 500 vs Instrument Sans tnum for a 104 px "10.000" | Mono at display size looks like a terminal prompt (wide dot, hard zero). The sans in tnum looks human. | Rule below |

## B.2 Decision

- **One sans: Instrument Sans Variable** (OFL-1.1, `@fontsource-variable/instrument-sans`, v5.3.0, file `wdth.css`: wght 400-700, stretch 75-100%). Display, UI, body, big editorial numbers. Latin subset 56 KB.
- **One mono: IBM Plex Mono** 400 and 500 (OFL-1.1, already installed, 14-15 KB each). **Instrument readouts only** (stage readouts, Lab outputs, axis ticks, annotation values, section numerals, formulas).
- **No serif.** Drop Inter and JetBrains Mono from `index.css` imports (saves bytes, removes the generic default).
- Rule for big numbers: editorial numbers over 56 px (Dampak) are set in Instrument Sans 600 with `tabular-nums`; mono is for numbers up to 40 px. Measured numbers keep unit in `ink-2`.
- Lead action: `npm i @fontsource-variable/instrument-sans` (do not install Inter Tight, Geist, Instrument Serif or Hanken).

```css
@import '@fontsource-variable/instrument-sans/wdth.css';  /* family 'Instrument Sans Variable' */
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';
@theme {
  --font-sans: 'Instrument Sans Variable', ui-sans-serif, system-ui, 'Segoe UI', sans-serif;
  --font-mono: 'IBM Plex Mono', ui-monospace, 'Cascadia Mono', monospace;
}
```
Perf agent: preload the latin `wdth` woff2 only (`<link rel="preload" as="font" type="font/woff2" crossorigin>`), `font-display: swap`, and tune a size-adjusted fallback face (not measured here).

Glyph coverage (from the package `unicode-range`, latin subset): present: `− (U+2212)`, `↑ ↓`, `° ± × – — “ ” ‘ ’ … NBSP U+00A0, NNBSP U+202F`. **Absent: `₂` (U+2082), `≈`, `→`.** Therefore: write subscripts with `<sub>` (W<sub>e</sub>, CO<sub>2</sub>e), write "sekitar" or "±" instead of "≈", and do not append "→" to links (also a template tell).

## B.3 Scale (all line-heights are multiples of 4; no `clamp()`; breakpoints 1280 / 1024 / 768 / 481)

| Token | >= 1280 | 1024-1279 | 768-1023 | 481-767 | <= 480 | Weight / wdth | Tracking | Use |
|---|---|---|---|---|---|---|---|---|
| `display-xl` | 88/84 | 72/72 | 60/60 | 52/52 | 44/44 | 600 / 92 | -0.035em | Opening and closing headline only |
| `display-l` | 56/56 | 52/56 | 44/48 | 40/44 | 36/40 | 600 / 94 | -0.03em | Section H2 |
| `number-xl` | 72/72 | 64/64 | 56/56 | 48/52 | 44/48 | 600 / 92, tnum | -0.04em | Dampak outputs inside the scaler card (unit 40%, weight 500, `ink-2`) |
| `h3` | 24/32 | 24/32 | 22/28 | 20/28 | 20/28 | 600 / 100 | -0.015em | Component titles, scaler title, verdict |
| `lead` | 22/32 | 22/32 | 20/28 | 18/28 | 18/28 | 400 / 100 | -0.01em | Supporting line under display (max 2 lines) |
| `body` | 18/28 | 18/28 | 17/28 | 16/24 | 16/24 | 400 / 100 | 0 | Prose, measure 56-64 ch |
| `body-s` | 15/24 | 15/24 | 15/24 | 15/24 | 15/24 | 400 | 0 | Disclosures, table labels |
| `ui` | 14/20 | | | | | 500 | 0 | Nav, buttons |
| `caption` | 13/20 | | | | | 400 | 0 | Rule line, photo credits, footers |
| `label` | 12/16 | | | | | 500 | +0.01em | Field labels, axis labels. Never below 12 |
| `readout-xl` | 40/44 | 40/44 | 36/40 | 32/36 | 32/36 | Plex Mono 500 | -0.01em | Stage readouts |
| `readout-l` / `-m` | 28/32, 20/24 | | | | | Plex Mono 500 | 0 | Lab outputs, slider values |
| `mono-s` / `mono-label` | 13/20, 12/16 | | | | | Plex Mono 400 | +0.02em on labels | Tables, ticks, numerals |

Weights used: Instrument Sans 400, 500, 600 (700 never; the variable axis is clamped at 600 to avoid the cramped look seen in specimens L/M). Plex Mono 400, 500. Hierarchy is carried by size and space, not colour: ink for all headings and numbers, `ink-2` for support, `ink-3` only for decoration and ticks.

On photos: text colour `#FFFFFF` for display, `rgba(255,255,255,.92)` for lead, `rgba(255,255,255,.72)` for captions; always on a scrim (chapter D). Display gets `text-shadow: 0 2px 28px rgba(14,17,20,.28)` (soft, not a glow).

## B.4 Display setting rules

- Hand-set line breaks on desktop only (>= 1024): headlines in chapter A carry `⏎` markers; implement as `<br class="hidden lg:block">`. Below 1024 the heading uses `text-wrap: balance`.
- No orphan word on the last line, no line shorter than 40% of the longest line. Check each headline at 1440, 1024, 768, 390.
- `margin-left: -0.04em` on `display-xl` (optical alignment of the capital "M"/"A" with the body edge). `hanging-punctuation: first` where supported (Safari); do not polyfill.
- `font-stretch: 92%` on `display-xl` and `number-xl`, 94% on `display-l`, 100% elsewhere. Add `word-spacing: 0.02em` on display (stretch + negative tracking tighten word gaps).
- Body: `text-wrap: pretty`, `max-width: 60ch`, `font-kerning: normal`, `font-optical-sizing: auto`, `-webkit-font-smoothing: antialiased`.

## B.5 OpenType and numerals

- Instrument Sans: use only the defaults plus `font-variant-numeric: tabular-nums` (the one feature I confirmed changes glyph widths). Do not rely on stylistic sets: none was detected, so none are assumed.
- Plex Mono: default dotted zero (distinct from capital O). Do not enable `zero`/slashed. Always `tabular-nums` is implicit.
- Proportional figures in prose and headlines. Tabular figures in every table, readout, slider value, axis tick and in `number-xl`.
- Indonesian number format everywhere via `Intl.NumberFormat('id-ID')`: decimal comma, dot grouping (1.400, 10.000, 15,9). The plex dot and comma glyphs are distinct enough to avoid en-US ambiguity at 12 px and above.
- True minus `−` (U+2212) for negatives, `±` for tolerance, `×` for products, `–` (en dash) for ranges (1.200–1.600). No spaced em dash anywhere in UI copy.
- Direction glyphs `↑ ↓` accompany heat numbers (never colour alone).

## B.6 Line-break and spacing rules (typo helper)

Recommend one `typo()` pass in `src/ui/numberFormat.ts` (Design Systems) applied to all static copy:
1. NBSP (U+00A0) between a number and its unit: `865 W`, `36,2 °C`, `1.400 jam`, `0,8 kg CO<sub>2</sub>e/kWh`. No space before `%`: `18%`.
2. NBSP after words of 3 letters or fewer when they are not the last word (di, ke, dan, itu, ini, yg): "Di dalam", "ke luar".
3. NBSP inside fixed pairs: `Di dalam`, `W th` never split from its subscript, `Hari cerah`.
4. Curly quotes “ ” and apostrophes ’; ellipsis `…` only for loading.
5. Sentence case everywhere. No uppercase transforms. No tracked small caps.
6. No double space after a full stop. No "!" in any string.

Vertical rhythm: 4 px baseline; space above a heading = 2x the space below it (e.g. 64 above, 24 below for `display-l`); lead 24 below the heading; CTA row 32 below the lead; paragraphs separated by 16.

---

# C. Narrative structure and wireframes

One story, seven bands. Each band has **one idea, one image or model, one headline, at most one supporting line**.

| # | Band | Idea | Visual | Height (desktop / mobile) |
|---|---|---|---|---|
| 0 | Opening | The sun gives two things | Photo `rooftops-golden`, headline, stage rising from the bottom edge | 100svh (min 720, max 980) / 100svh |
| 1 | 01 Pengalaman | One panel, two heat directions | The dark 3D stage, Cerah/Hujan, sky gradient behind it | stage 480-720 + head 200 / stage 336 + controls |
| 2 | 02 Di dalam | What is inside | Second 3D stage + layer index | stage 560 / 336 |
| 3 | Dampak | Why it matters (scale) | Photo `jakarta-dense` + floating scaler card | 720 / auto |
| 4 | 03 Lab rekayasa | For engineers | Narrow photo strip `heat-pipes`, then the instrument | auto |
| 5 | 04 Perbandingan | Honest comparison | No photo; table | auto |
| 6 | Closing | Same roof, two benefits | Photo `jakarta-dusk`, dark footer | 80svh (min 560) / 80svh |

Layers in every photo band, back to front: **L0** photo (parallax), **L1** scrims (D.3), **L2** grain + vignette (D.5), **L3** type (no parallax except a 4% drift on the opening), **L4** floating UI (shadow e3/e4), **L5** caption. Foreground UI never moves against the reader's scroll; only photos do.

## C.1 Opening (desktop 1440 x 900)

```
+--------------------------------------------------------------------------------------+ 0
| SolarVein        Pengalaman  Di dalam  Dampak  Lab  Perbandingan      [Coba simulasinya]| header 56 transparent, scrim S3
|  (sun, upper left of the photo)                                                        |
|                                                                                        | photo: rooftops-golden
|                                                                                        | object-position 30% 40%
|                                                                                        |
|  Matahari memberi dua hal.                                                             | y 440  display-xl 88/84 (white)
|  Ambil keduanya.                                                                       | y 524
|                                                                                        |
|  Listrik dan panas dari satu panel.                                                    | y 664  lead 22/32 (white .92)
|  Saat hujan, arah panasnya bisa berbalik.                                              | y 696
|  [ Coba simulasinya ]   Lihat di dalamnya                                              | y 768  button 48h r12 / text link
|                                    Ilustrasi konteks: panel surya di atap ... Unsplash | y 812  caption 13/20 right
|  +----------------------------- 3D stage (floating, e4) ----------------------------+ | y 840: top edge peeks 60 px
+--+------------------------------------------------------------------------------------+ 900   (stage continues in band 1)
```
- The text block is bottom-left on purpose. Measured on the real photo with scrim S1+S2 (method in D.3): headline p95 contrast 5.75:1 (p99 4.94), lead 12.6:1, CTA row 14.5:1. The same text placed at y 300-520 (upper left, where it sits in my specimens) reaches only 3.9:1, which fails for the lead. Do not move the block up.
- Stage overlap: the stage card starts 120 px above the photo's bottom edge. The photo dissolves into the 01 sky gradient with `mask-image: linear-gradient(180deg,#000 80%,transparent 100%)`, so there is no hard edge left and right of the stage.
- Orchestrated moment (the only one on the page): the two headline lines unmask upward (clip + translate 100% to 0), 700 ms `cubic-bezier(0.22,1,0.36,1)`, stagger 90 ms; lead and CTA fade 400 ms after. Reduced motion: none.
- Parallax: photo `translateY(scrollY * 0.18)` clamped to 120 px, fixed `scale(1.08)`; headline block drifts `-0.04 * scrollY`; stage 0.

Mobile 390 x 844:
```
+--------------------------+ 0
| SolarVein          Menu  | 56 transparent
|                          |
|  (photo, object-position |  rooftops-golden, sun left
|   22% 50%, bottom scrim) |
|                          |
| Matahari memberi         | y 396  display-xl 44/44
| dua hal. Ambil           | (text-wrap balance; no hand breaks < 1024)
| keduanya.                |
| Listrik dan panas dari   | y 540  lead 18/28
| satu panel. Saat hujan,  |
| arah panasnya bisa       |
| berbalik.                |
| [   Coba simulasinya   ] | y 676  48h full width, r12
|  Lihat di dalamnya       | y 736  text link
| +----------------------+ | y 788  stage peeks 56 px (e4)
+-+----------------------+-+ 844
```
The caption moves into the credits list at <= 480 (UX decision; the stage peek needs the space).

## C.2 01 Pengalaman

```
 sky gradient (sunny/rainy, D.4) behind everything, fades to paper at +720
+------------------------------ 1280 stage, r16, e4, graphite ------------------------------+
| [Cerah | Hujan]  Buka Lab                                      reset  full  ?  (toolbar)   |
|                  Cairan masuk 40,0 C --+                                                   |
|               +-----------------------------+                                              |
|              /  v  v  v  v  v  heat arrows  /|-- Cairan keluar 45,0 C                      |
|             +-----------------------------+  Listrik 283,6 W                               |
+------------------------------+------------------+----------------------------------------+
| (dot) Panen panas            | Listrik          | Panas ke cairan                        | strip 96
| Panel memanen panas.         | 283,6 We         | v 686,9 Wth                            |
+------------------------------+------------------+----------------------------------------+
 Cairan selalu mengalir dari masuk ke keluar. Yang bisa berbalik hanya arah panasnya.  (caption 13/20, cols 1-8)

 01   Satu panel. Dua arah panas.                                        (display-l 56, cols 1-8)
      Ganti cuacanya. Ikuti ke mana panas pergi.                         (lead, cols 1-6)
```
- The stage comes first, the statement second: show first, explain second. The one regime sentence (A.2) lives inside the stage strip as in 05.
- Section head: 1 px `line` hairline, then mono `01` and `display-l`. Section padding 96 / 64 / 48.
- Mobile: stage 336 high; the switch sits below the stage on the light page (44 px touch), then the regime sentence and two readouts, then the `display-l` head. The sky crossfade also applies on mobile.

## C.3 02 Di dalam SolarVein

```
 02   Empat lapisan, satu pertukaran panas.                    (display-l, cols 1-8)
      Pilih sebuah lapisan.                                    (lead)
+--------------------- stage cols 1-8, h560, e3 ----------+   1  Sel surya
|  exploded collector, 4 annotation indices 1-4            |   2  Absorber
|  [Urai]  [Potong penampang]                              |   3  Saluran cairan
+----------------------------------------------------------+   4  Bagian belakang
                                                               (selected row expands: name 20/28,
                                                                one sentence 15/24, <= 3 mono spec rows)
                                                               [copper-coil inset 4:3, optional, desktop only]
```
Mobile: stage 336, the four layers as a 2 x 2 grid below.

## C.4 Dampak (id `dampak`)

```
+------------------------------------ jakarta-dense, full-bleed, 720 high ---------------------------------+
| (L0 photo, scrim S4: cool graphite, D.3)                                                                  |
|                                                                                                           |
|  Sekitar seperlima jadi listrik.          +------------- scaler card, cols 7-12, e3, paper-glass -------+ |
|  Sisanya jadi panas.                      | Bayangkan 10.000 atap.                          h3 24/32   | |
|  (display-l 56, white, cols 1-6)          | Perkiraan kasar dari simulasi, bukan prediksi.   body-s    | |
|                                           | Jumlah atap      -----o----  10.000                        | |
|  Pada siang cerah satu panel menerima     | Panel per atap   --o-------       4                        | |
|  1.530 W. Sekitar 284 W jadi listrik,     | Jam setara/tahun ------o---   1.400                        | |
|  dan 687 W lainnya bisa ditangkap         | ---------------------------------------------              | |
|  sebagai air hangat. (lead, white .92)    | 38,5 GWh  panas per tahun. Untuk air hangat dan proses.    | |
|                                           | 15,7 GWh  listrik bersih per tahun.   (numbers 72/72)      | |
|  Ilustrasi konteks: atap padat di Jakarta | 10.754 ton CO2e lebih sedikit per tahun.                   | |
|  Selatan. Foto: Voicu Horatiu, Unsplash.  | Siang cerah (900 W/m2, 32 C), 1.400 jam, panas dipakai ... | |
|                                           | > Apa yang belum dihitung                                  | |
|                                           +------------------------------------------------------------+ |
+-----------------------------------------------------------------------------------------------------------+
```
- Asymmetric on purpose: narrow headline on the left over the photo's quiet haze, wide card on the right. The card bleeds 48 px below the photo's bottom edge (overlapping paper) so the depth reads.
- Mobile: photo banner 320 high with the headline over it (display-l 36/40, bottom scrim), lead below on paper, then the card at full width with 16 px margins (e3), outputs as stacked rows, numbers 44/48.
- Numbers and sliders: chapter E.

## C.5 03 Lab rekayasa

```
+-- heat-pipes strip, full-bleed, 200 high (mobile 120), scrim S6 (uniform .55) -------------------+
| 03   Atur kondisinya. Baca hasilnya.                                         (display-l, white)   |
+---------------------------------------------------------------------------------------------------+
 +- controls card cols 1-4 (e2, overlaps the strip by 48) -+   readouts 4 x (cols 5-12) ... as in 05 s2.3
```
Calm register: no further photography, no shadow beyond e2, no gradients; this is the room for engineers. Mono and hairlines stay dominant.

## C.6 04 Perbandingan kinerja

Exactly as 05 s2.3 (table, two lists, no photo) with the A.6 copy. The only depth device is the SolarVein column header's 2 px ink top rule.

## C.7 Closing

```
+------------------------------------ jakarta-dusk, full-bleed, 80svh ------------------------------------+
|                                      (sun disc upper centre)                                             |
|                                                                                                          |
|  Atap yang sama.                                                      (display-xl 88/84 white)           |
|  Dua manfaat.                                                                                            |
|  SolarVein masih sebuah simulasi, dibuat supaya ide ini bisa diuji, dihitung, dan dibantah.   (lead)      |
|  [ Kembali ke simulasi ]   Baca asumsi dan batasnya                                                      |
|  scrim S5 fades to #0E1114 at the bottom edge                                                            |
+----------------------------------------------------------------------------------------------------------+ graphite
| Simulasi konseptual untuk edukasi. Bukan hasil CFD, belum divalidasi di lapangan, dan bukan produk ...    | stage-ink-2
| Kredit foto                                                           SolarVein, simulasi konseptual     |
+----------------------------------------------------------------------------------------------------------+
```
The page opens on a photo with the stage rising, and closes on a photo with a graphite footer: both bookends are dark, the middle is paper.

---

# D. Depth system

## D.1 Elevation (soft, tinted ink, never pure black, never a glow)

| Token | Value | Use |
|---|---|---|
| `--shadow-0` | none | Tables, readouts, hairline UI |
| `--shadow-1` | `0 1px 2px rgba(23,28,34,.06), 0 1px 1px rgba(23,28,34,.04)` | Segmented thumb on paper, small floating controls |
| `--shadow-2` | `0 2px 4px rgba(23,28,34,.05), 0 8px 24px rgba(23,28,34,.08)` | Lab controls card, popovers, tooltips |
| `--shadow-3` | `0 4px 8px rgba(14,17,20,.10), 0 16px 48px rgba(14,17,20,.18)` | Scaler card over a photo, mobile floating bar |
| `--shadow-4` | `0 8px 16px rgba(14,17,20,.18), 0 32px 80px rgba(14,17,20,.38)` | The stage floating over the opening photo and the sky gradient |

Over a warm photo the stage's far shadow layer may take `rgba(40,20,8,.40)` (warm bounce); otherwise keep the neutral value. Radii: stage 16, cards 12, buttons 12 (small controls 8), no pill CTAs.

Paper-glass (exactly two components: the scaler card and the mobile switch bar): `background: rgba(247,248,246,.90); backdrop-filter: blur(16px) saturate(1.05);` with a solid `rgba(247,248,246,.97)` fallback under `@supports not (backdrop-filter: blur(1px))` and on weak devices. No other backdrop blur except the sticky header (as in 05).

## D.2 Header over photos

Transparent at scrollY = 0 over the opening (white text, scrim S3); becomes paper 92% + 1 px line after 64 px of scroll (150 ms). Wordmark and nav colour flip with it.

## D.3 Scrims (text legibility on photos; gradients allowed because they model light)

All use `#0E1114` (= `stage-0`) so the page keeps one graphite.

| Token | Where | Stops |
|---|---|---|
| `S1` left | Opening, desktop | `linear-gradient(90deg, rgba(14,17,20,.62) 0%, rgba(14,17,20,.42) 28%, rgba(14,17,20,.10) 58%, rgba(14,17,20,0) 75%)` |
| `S2` bottom | Opening, desktop | `linear-gradient(0deg, rgba(14,17,20,.55) 0%, rgba(14,17,20,0) 38%)` |
| `S3` top | Opening header | `linear-gradient(180deg, rgba(14,17,20,.45) 0, rgba(14,17,20,0) 160px)` |
| `S1m` mobile | Opening, <= 768 | `linear-gradient(180deg, rgba(14,17,20,.50) 0%, rgba(14,17,20,.15) 28%, rgba(14,17,20,.55) 62%, rgba(14,17,20,.80) 100%)` (headline sits in the bottom 40%) |
| `S4` | Dampak (`jakarta-dense` is hazy mid-grey) | `linear-gradient(90deg, rgba(14,17,20,.72) 0%, rgba(14,17,20,.55) 40%, rgba(14,17,20,.30) 70%, rgba(14,17,20,.35) 100%)` plus `S2` at .35 |
| `S5` | Closing | `linear-gradient(0deg, #0E1114 0%, rgba(14,17,20,.85) 14%, rgba(14,17,20,.45) 42%, rgba(14,17,20,0) 70%)` plus `S1` at .5 |
| `S6` | Lab strip | uniform `rgba(14,17,20,.55)` |

Verification method used for S1 + S2 (reproducible): composite the scrim over the real 1440 x 900 cover-crop of `rooftops-golden-2400.webp` and take the 95th percentile luminance of each text rectangle; contrast of white text = 1.05 / (L + 0.05). Results: headline rect (64,440)-(760,660): p50 10.7, p95 5.75, p99 4.94; lead (64,680)-(600,740): p95 12.6; CTA row (64,770)-(420,812): p95 14.5. QA repeats this with the production scrims at 1440, 1024 and 390 (the mobile scrim and S4/S5 are not measured here).

## D.4 Atmospheric sky: Cerah and Hujan (page behind the 01 stage; 720 px tall, fades into paper)

The 3D stage stays graphite (05 s6). The sky gradient is the weather outside the window and follows the same logic as the stage lights, so page and stage agree.

| State | Stops (top to bottom) | Connected to |
|---|---|---|
| Sunny | `#F2D3A0 0%` (golden haze), `#F6E6CC 35%`, `#F7F2E8 70%`, `#F7F8F6 100%` | Stage key light `#FFF1DE`, the golden opening photo |
| Rainy | `#A9B7C1 0%` (overcast), `#CBD5DB 35%`, `#E4E9EB 70%`, `#F7F8F6 100%` | Stage key `#D8E3EC`, rim `#7FA8C0`, the rain-glass photo |

The mix is computed from the interpolated inputs, not from a mode flag (same rule as the stage): `t = clamp((G - 120) / 780, 0, 1)`; stops interpolated in OKLab; saturation multiplier `1 - 0.5 * clamp(rainMmH / 30, 0, 1)`. At the Cerah preset (G 900, rain 0) t = 1; at Hujan (G 120, rain 15) t = 0 with saturation 0.75. Implementation: two stacked gradient layers cross-faded by opacity (cheap), or `@property --sky-0..3` tweened by GSAP over 1.0-1.2 s, staggered like the weather transition. Text on the sky is always `ink`; worst pair `ink` on `#A9B7C1` = 8.4:1.

## D.5 Grain and vignette (CSS only, photo bands only, static)

```css
.photo-band::after {                        /* grain, no animation */
  content:""; position:absolute; inset:0; pointer-events:none; mix-blend-mode:soft-light; opacity:.07;
  background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  1 0 0 0 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
.photo-band::before {                       /* vignette */
  content:""; position:absolute; inset:0; pointer-events:none;
  background:radial-gradient(120% 90% at 50% 40%, rgba(14,17,20,0) 55%, rgba(14,17,20,.32) 100%);
}
```
Never on paper bands, the stage or the Lab. Disable the grain on weak devices.

## D.6 Parallax budget

| Layer | Amount | Range | Notes |
|---|---|---|---|
| Opening photo | `0.18 * scrollY`, clamp 120 px, `scale(1.08)` | first 700 px of scroll | transform only; `will-change: transform` on this one layer |
| Opening headline | `-0.04 * scrollY` | same | drift, not slide |
| Opening stage | 0 | | the stage never moves against the scroll |
| Dampak photo | translateY -24 px to +24 px across the band (`view()` timeline), `scale(1.10)` | band in view | the card does not move |
| Lab strip, 04 | none | | the calm rooms |
| Closing photo | `0.12 * scrollY`, clamp 80 px, `scale(1.06)` | band in view | |

Reduced motion: all amounts 0, scale 1. Prefer `animation-timeline: scroll()/view()` where supported; where it is not, no parallax (no JS scroll handlers).

## D.7 How the dark stage sits

Chosen: **a floating card with a soft shadow, overlapping the opening photo** (not a full-bleed take-over). A full-bleed photo-to-stage morph needs a second full-viewport WebGL surface and a scroll-driven resize (jank risk; the brief caps stages at two and demands 60 fps). The floating card keeps the stage inset (05 s2.4), gains depth from `--shadow-4`, and lets the photo dissolve into the sky behind it. The stage keeps its 1 px `stage-line` edge; no outer glow; the shadow carries the lift.

---

# E. Dampak band: the scenario scaler (the "change the world" claim, with receipts)

Principle: the number is a **scenario computed from `src/sim`**, with the assumptions on the same card and the caveats one click away. It is a claim about arithmetic, not about the world.

## E.1 Computation (all inputs visible and editable)

Per panel, cached once from `simulate(PRESETS.sunny, 'solarvein-dual')`, `simulate(PRESETS.sunny, 'conventional-pv')` and `computeCarbon(sv, DEFAULT_CARBON, cv)`:

```
h        = hours per year           default DEFAULT_CARBON.hoursPerYear = 1400; range 800-1800; guidance 1200-1600
E_e      = netElectricalW * h / 1000     [kWh_e / panel / yr]   (electricalW minus pumpW)
E_th     = usefulHeatW   * h / 1000      [kWh_th / panel / yr]
CO2_inc  = incrementalNetKgPerYear       [kgCO2e / panel / yr]  (carbon.ts: vs conventional PV, with the displaced LPG)
LPG_kg   = avoidedFuelW * h / 1000 / 12.78   [kg LPG / panel / yr]  (46 MJ/kg = 12.78 kWh/kg)
N        = roofs * panelsPerRoof        defaults 10.000 x 4 = 40.000 panels
totals   = N * per-panel
```

## E.2 Defaults computed today (sunny preset, 1400 h; a node run against `src/sim` on 2026-10-12)

| Quantity | Per panel | 40.000 panels (10.000 atap x 4) |
|---|---|---|
| Solar input G x A | 1.530 W (900 W/m2 x 1,7 m2) | |
| P_e gross / net of pump | 283,6 W / 280,4 W (pump 3,2 W) | |
| Q_th to liquid (useful) | 686,9 W | |
| Share of incident power | electricity 18,5%; liquid heat 44,9% | |
| Electricity, net | 392,6 kWh/yr | 15,7 GWh/yr |
| Heat, useful | 961,7 kWh/yr | 38,5 GWh/yr |
| Avoided LPG (808,1 W x 1400 h = 1.131 kWh fuel) | 88,5 kg/yr (about 7 tabung 12 kg) | 3.540 ton/yr |
| Incremental CO2e vs conventional PV + LPG | 268,9 kg/yr | **10.754 ton/yr** |
| Incremental embodied emissions (added) | 180 kg; payback 0,67 yr at these assumptions | |
| Conventional PV | P_e 272,7 W, cell 56,1 C (SolarVein cell 45,9 C) | |
| Rainy preset (for the caveat) | P_e 38,5 W, rejection 550 W_th, pump 8,5 W, incremental CO2e -11,8 kg/yr at 1400 h (about -1,5 kg at 180 h of heavy rain) | |

These are reference values for QA; the page must compute them live and never hard-code them.

## E.3 What must stay visible next to the numbers (one line, always)

"Siang cerah (900 W/m², udara 32 °C), 1.400 jam setara per tahun, panas dipakai penuh menggantikan LPG." plus the link "Lihat asumsi dan batasnya", which opens the disclosure with the caveats in A.4. Never show the CO2e number without that line in the same viewport.

## E.4 Physics Reviewer sign-off requested before ship

1. Headline claim "Sekitar seperlima jadi listrik. Sisanya jadi panas." (18,5% is electricity; the remainder includes about 8% optical loss, so "jadi panas" is approximate).
2. The scaler's implicit assumption that every panel has a heat load for all 1.400 h (an upper bound). Decide whether to add a "porsi jam dengan beban panas" input (recommended: default 100% with the caveat shown, or a lower honest default such as 60% marked as an assumption).
3. The LPG constant 46 MJ/kg (12,78 kWh/kg) and the "tabung 12 kg" rounding (outside `src/sim`; if approved, put the constant beside the carbon assumptions).
4. Rain: heat rejection is not credited as an emissions benefit unless `coolingDisplacementModeled` is on; the card says so (disc.1.b2).

---

# F. Photo map (licences, alt text and captions are in `docs/CREDITS.md`)

| Photo | Band | Aspect | Widths | Focal point (`object-position`) | Parallax | Scrim |
|---|---|---|---|---|---|---|
| `rooftops-golden` | Opening | 1,478 | 2400/1600/960 | `30% 40%` desktop, `22% 50%` mobile | D.6 | S1+S2+S3 / S1m |
| `jakarta-rooftops` | 01 sky tint for Cerah (optional, 8% opacity under the gradient) | 1,5 | 1600/960 | `50% 60%` | none | n/a |
| `rain-glass` | 01 sky tint for Hujan (same treatment) | 1,5 | 1600/960 | `50% 40%` | none | n/a |
| `copper-coil` | 02 inset (desktop) | 1,5 | 960 | `50% 55%` | none | none |
| `jakarta-dense` | Dampak | 1,5 | 1600/960 | `35% 55%` | D.6 | S4 |
| `heat-pipes` | 03 strip | 1,5 | 1600/960 | `50% 35%` (gauge and valves) | none | S6 |
| `panel-macro` | spare (04 strip, or texture reference for the cell) | 1,5 | 1600/960 | `60% 50%` | none | S6 |
| `jakarta-dusk` | Closing | 1,5 | 1600/960 | `50% 35%` (keep the sun disc in the first 40%) | D.6 | S5 |

Delivery rules:
- Markup: `<picture>` with AVIF then WebP, `srcset` from the widths in `manifest.json`, explicit `width`/`height` from the aspect (no layout shift), `alt` from CREDITS.md. Opening: `fetchpriority="high"`, `loading="eager"`, preload the 1600 AVIF; everything else `loading="lazy"` and `decoding="async"`.
- Use the manifest `lqip` as the placeholder (blur 24 px, cross-fade 300 ms) and `avg` as the band's base colour.
- Alt policy: informative photos (opening, Dampak, closing) get the CREDITS alt; photos used as a tint or texture behind a gradient are `alt=""`.
- Captions only under the three big photos; every caption begins "Ilustrasi konteks:". Never "prototipe", "instalasi", "pelanggan", "mitra".

---

# G. Anti-AI checklist v2 (blocking items marked **B**)

Layout and structure
1. **B** Not everything is centred: every block is left-aligned on the 12-column grid; the asymmetric devices are deliberate (7/5 splits, the card overlapping the photo).
2. **B** No symmetric three-card feature row. The three Dampak numbers are rows of different lengths inside one card; the comparison is a table.
3. **B** No icon-in-box, no pill badges, no coloured left borders, no card-in-card, no emoji.
4. Numbered markers only on the four engineering rooms (a real sequence), never on bullets or features.
5. No tracked uppercase eyebrow above headings; no "WORD - fragment" labels; no spaced em dash; no arrow appended to links or buttons; no middle-dot-joined meta strings in headings.
6. Max one primary button per viewport; no gradient buttons; no pill CTAs; the secondary action is a text link with a 1 px underline.

Colour and depth
7. **B** No decorative gradients: blobs, mesh, purple-to-blue washes. The only gradients are scrims (light on photos), the weather sky, and the liquid temperature ramp.
8. **B** Accent budget unchanged: ink + the active thermal colour; electrical never coloured; no lime.
9. Shadows are tinted and tiered (e1-e4), not one grey `rgba(0,0,0,.1)` on every box. Glass blur on at most two components.
10. Radii are hierarchical (stage 16, cards 12, buttons 12, controls 8), not one radius everywhere.

Photography and honesty
11. **B** No smiling stock people, no hard-hat handshake, no AI-generated pictures, no lens-flare composites, no duotone overlays. Photos are real, lightly graded, captioned "Ilustrasi konteks".
12. **B** No fake social proof: no logo wall, testimonials, star ratings, "dipercaya oleh", counters, press quotes, waitlist numbers, pricing or sign-up.
13. **B** Every impact number comes from `src/sim` with assumptions on the same card; caveats one click away.

Type and copy
14. **B** One sans (Instrument Sans) and one mono; no serif; no italic accent on a phrase; no single word in a different colour in a headline.
15. Display tracking tight but word spaces intact (wdth 92, weight 600; never 700 at wdth <= 88).
16. **B** Banned words: revolusioner, terobosan, canggih, inovatif, game-changer, solusi, ekosistem, transformasi, memberdayakan, menghadirkan, "masa depan yang berkelanjutan", "kami bangga", "!"; no stacked rhetorical questions; no "unlock/elevate" calques.
17. Copy rhythm varies (long sentence, short sentence); each headline passes "would a friend repeat this?".

Motion
18. **B** One orchestrated moment (the opening headline unmask). No fade-up on every section, no hover lift on cards, no count-up odometers on the Dampak numbers (they update live as inputs change, like instrument readouts).
19. Parallax only on photos, small, transform-only, disabled under reduced motion.

Technical tells
20. No stock placeholders: blur-up only from `manifest.json`; no "lorem", no `#` links; every anchor resolves.

---

# H. Handoff notes

**Design Systems** (`src/index.css`, `src/ui`): install `@fontsource-variable/instrument-sans` (lead action); import `wdth.css`; remove the Inter and JetBrains imports; add tokens `--shadow-0..4`, scrims S1-S6, `--sky-sunny-*`, `--sky-rainy-*`, and the type tokens `display-xl`, `display-l`, `number-xl`, `lead`; add a `Picture` primitive (AVIF/WebP, LQIP, `object-position`, fixed aspect) and the `typo()` helper (B.6). `MediaFrame`/`FloatingPanel` can implement paper-glass and the photo band if they are free of the old dark tokens.

**Motion** (`Hero`, effects): the opening is the only choreographed entrance. The sky crossfade (D.4) rides the same staggered input interpolation as the weather. Parallax follows D.6 with `animation-timeline`, or none.

**UX** (`App`, sections, copy): use chapter A verbatim. Nav = Pengalaman, Di dalam, Dampak, Lab, Perbandingan (five items; numerals stay in the page, not the nav). The credits list opens from the footer. The scaler uses cached per-panel results (compute once, multiply on input; no re-simulation per keystroke).

**3D**: stage mood unchanged from 05 s6. The stage now carries `--shadow-4` and sits 120 px (56 px mobile) over the photo; its clear colour must equal `stage-0` so the card edge reads clean.

**Perf/A11y**: only the opening image is eager (one AVIF of 167 KB at 2400 or 81 KB at 1600). The photo set totals 3,38 MB on disk; a visitor downloads roughly 1 MB on desktop. Contrast checks: white on S1+S2 (D.3) and `ink` on the sky (D.4). Captions are real text. `alt` per CREDITS.md. Reduced motion: no parallax, no headline unmask, grain off.

**QA**: re-measure the scrim contrast (D.3 method) at 1440/1024/390; check headline breaks at 1440/1280/1024/768/390 (no orphan word); compare the live scaler with E.2; confirm no fallback glyphs for `₂`, `≈`, `→` (use `<sub>`); confirm the NBSP rules.

Open issues I could not close:
- The mobile opening scrim (S1m) and the Dampak and closing scrims (S4, S5) were not measured numerically; only the desktop opening was.
- `rooftops-golden` shows a roof in an unspecified (probably non-tropical) place; it is captioned as context only. A tropical rooftop-solar photo at golden hour that met the free-licence, no-logo, no-people rules was not found.
- `heat-pipes` has a microscopic manufacturer print on the gauge dial (CREDITS note).
- Instrument Sans features beyond `tnum` were not enumerated (only width-changing features were tested); no stylistic sets are assumed.
- Fallback-metric tuning for the font swap is left to Perf.

---
