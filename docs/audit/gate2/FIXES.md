# Gate 2: consolidated fix list

Council members: visual/motion, physics, UX/copy/juror, QA (QA findings are appended at the end).

Evidence (screenshots and probes): `C:\Users\LENOVO\Downloads\solarvein\audit-gate2\{visual,physics,ux,qa}\`

Priority levels:
- **P0:** must fix.
- **P1:** fix before the demo on 20 Nov.
- **P2:** fix if time allows.

## Rules for every section owner

### Visible text budget
- Keep each section to about 45 visible words or fewer, not counting chart tick labels.
- On demo-path sections (Masalah, Sistem, Sehari, Dampak), the headline plus subheading on screen must be 12 words or fewer.
- Move everything else into a `Disclosure` ("Lihat perhitungan" / "Rincian").
- Current counts: Dampak 691 · Validasi 682 · Sehari 457 · Desikan 380 · Router 358 · Sistem-dalam 94 · Masalah 87.

### Locked glossary (use exactly these terms)

| Concept | Use | Notes |
|---|---|---|
| Existing heater | pemanas cadangan | |
| Hardware | panel PV/T | |
| Thermal side only | kolektor | |
| Router | router | Use "pengendali" once, as a gloss. |
| Bypass | tidak dipakai (bypass) | First use. Afterwards: tidak dipakai. |
| Where bypassed heat goes | pembuang panas (dry cooler) | Cells stay cooler. Never write "panas tidak diambil". |
| Solar heat | panas surya | Not "kalor surya". |
| Outdoor air | udara luar | Not "ambien" or "sekitar". |
| Desiccant bed | unggun desikan | |
| After-cooler | pendingin lanjutan (after-cooler) | |
| Desiccant, first use on the page | desikan (bahan penyerap uap air) | First use is the Router diagram. |
| Preheat exchanger, first use | penukar kalor prapemanasan | |

Spelling and number style:
- "tidak", not "tak"; "menjadi", not "jadi"; "sekitar", not "~"; "terhadap", not "vs".
- Percent: always "45 %" with a non-breaking space, the same as other units.
- Time in prose: "pukul 13.00". The instrument scrubber may keep "13:00".
- Ranges use an en dash: "48,5–71,3 %".

### Units
- Never print "_th" or "_e" literally. Use the typo/subscript helper: W<sub>th</sub>, kWh<sub>th</sub>, kW<sub>e</sub>.

### Banned self-praise and outcome claims
Do not use:
- "jujur"
- "pembanding utama yang jujur"
- "diuji jujur"
- "AC tetap nyaman"
- "Kebutuhan air panas terpenuhi" (allowed only when solar covers 100 %)

Use instead:

| Instead of | Write |
|---|---|
| "pembanding utama yang jujur" | "pembanding terkuat" |
| "AC tetap nyaman" | "Koil AC tetap menangani udara lembap." |
| "Kebutuhan air panas terpenuhi" | "Air panas langsung dilayani dulu; sisa panas mengisi tangki." |

### Repetition
- "Ilustrasi, bukan dokumentasi proyek" appears only in image captions and the footer credits.
- "Semua angka di bagian ini: hasil simulasi" is already in the header badge. Keep at most one quiet line per section, and never next to an identical tag.
- Each headline number appears once per section.

### Evidence dots (lead updates `ui/Evidence`)
- Dots are 8 px, aligned to the x-height of the text.
- Show the label text once per block.
- Drop the "↗" repeated on every bullet. Keep the citation marker only where a single cited number stands alone.

### Present honest negatives as rigour

| Section | Text |
|---|---|
| Validasi, heading | "Yang bisa membantah SolarVein" |
| Validasi, subheading | "Tiap risiko punya angka simulasi sekarang dan percobaan yang mengujinya." |
| Dampak | "Pembanding terkuat (B2, B4) bisa menang; hasilnya ditampilkan apa adanya." |
| Desikan | "Desikan baru layak bila rasio COP ≥ {impas udara luar} (udara luar) atau ≥ {impas udara buangan} (udara buangan hotel); fase 3 mengukurnya." The thresholds come from the hooks. |

### Novelty and theme statements
- **Novelty**, visible in the Router subheading or in Sistem: "Kebaruan: satu aliran panas bersuhu rendah dibagi ke tujuan menurut CO₂e yang dihindari per kWh<sub>th</sub>, lalu diuji terhadap empat pembanding."
- **Theme and inclusivity**, in Penutup plus one clause in Masalah: "Mengisi daya masa depan: listrik dan panas dari atap yang sama, untuk hotel besar maupun penginapan kecil."

### Mode label B
- Label: "B · Pompa diam, pakai simpanan".
- Why: mode B means daylight with the pump stopped. That also happens in strong sun once the tank is hot, so "Sinar lemah" was wrong.

### Rhythm
After #desikan the page runs about 12 000 px of plain paper and tables. To break it up:
- Give Dampak one dark beat: the net number at number-xl (96 px).
- Fold most of Desikan behind one disclosure.
- Collapse the Validasi risks and legend into rows.

### Console error
- "Maximum update depth exceeded" appears twice, on load and on scroll. The owner needs to trace it; see the QA notes at the end.

## Fixes by owner

### Lead (`ui/**`, labels, store, App)
- **Labels:**
  - Set `LABELS.mode.B` to "B · Pompa diam, pakai simpanan".
  - With W2b: split the router reason into `tangki-penuh-bypass` and a new `fluida-belum-cukup-panas`.
- **Evidence dot:** fix sizing.
- **Store:** reset to mode A when a Sistem switch is clicked, so "Kondisi kustom" no longer appears after scrubbing the router.

### W2b (`router.ts`, `day.ts`)
- **Split the reason:**
  - `tangki-penuh-bypass`: only when the tank cannot accept heat because it is full (SoC near maximum).
  - `fluida-belum-cukup-panas` (new): when the charge fluid is not warm enough to charge the tank, so the heat goes to the dry cooler.
- **Docs:** name the dump sink "pembuang panas (dry cooler)".
- **Attribution:** collected heat minus the sum of all uses leaves 8 kWh<sub>th</sub> unlabelled. Find it and attribute it.

### W3 (`desiccant.ts`)
- **`perKgWater`:** the current figures (1,00 vs 1,00 kWh<sub>e</sub>/kg) are inflated because the 50 °C ambient case divides the full fresh-air coil's electricity (15,1 kW<sub>e</sub>) by only the 15 kg/h the bed removes. Divide the coil's electricity by the REQUIRED moisture removal, the same duty (48 kg/h ≈ 0,3 kWh<sub>e</sub>/kg), or remove the line.
- **"≈ impas" band:** add a verdict band for |net| < 2 % of the coil reference, or expose a flag the UI can show.

### W7 (Opening, Masalah, Sistem, Sistem-dalam, Jeda, Closing, header/footer)

**Sistem**
- Label the readouts "susunan 85 m²" (they are for the whole array).
- Mode A statement: "Air panas langsung dilayani dulu; sisa panas mengisi tangki."
- The bypass state must name the dry cooler.
- With the pump off, show inlet/outlet as "–" / "diam".
- The screen-reader live text in `CollectorStage` reads v1; it must read the v2 frame. That file belongs to W6, so coordinate.
- At scene start the hero collector should fill about 70 % of the stage width. It fills about 20 % now. Start in 'panel' framing and pull back later in the scroll.
- At 1280×720 the switch and readout must not sit under the header.

**Sistem-dalam**
- The retired legend entry belongs to W6 (see below).
- The heading must not jump between steps: top-align it, or give the list a fixed min-height.
- Set scroll-margin to at least header height + 24 px at 1280×720.
- Label the reference condition: 900 W/m², 40→45 °C.
- Fix the "24 W_th" subscript.
- Remove the 110 px gap above the part list on mobile.

**Masalah**
- Card 2 wording: "AC juga menanggung udara luar yang lembap". The 48,5–71,3 % figure is the AC share of hotel electricity, not dehumidification.
- Fix the mobile footnote overlap.
- Add the inclusivity clause.
- Hero stat label: "CO₂e bersih dihindari dibanding PV + pompa kalor (B2)", so B2 is defined in place.

**Opening / Penutup**
- Crop the grey band in the video (`object-position`).
- Add the theme line to Penutup.
- Remove the dead #ecebe7 band between the opened video card and Masalah: fade it or pull Masalah up.

**Header**
- Over dark sections, use a quiet dark tint instead of flat mid-grey.
- On #desikan the nav highlights "Sehari"; fix the active state.

### W6 (`viz3d`)
- Remove the legend entry "↑ Panas dari cairan" (cool-blue, the retired reversed-heat arrow).
- Make the screen-reader live text read the v2 frame (`CollectorStage.tsx:84` reads v1 `useSimResult`).

### W8a (Router)

**Make the scene cinematic**
- Drive the hour continuously from pin progress, so the scrub covers the whole day.
- Replace the legend row with a sun-arc/clock strip (irradiance curve plus playhead).
- Bring the H2 to the 52/64 scale used by the other pinned scene.
- Cut the pin to about 220 %.
- Scale the diagram to the 80–1360 grid. It is currently centred near x≈195.
- Optional: a graphite band for night.

**Fix scrub jank**
- Measured: 95th-percentile frame time 50 ms, worst 150 ms at mode flips.
- Fix: per-frame updates via `useFrameListener` and direct DOM writes, with no React re-render per tick.

**Diagram and copy**
- The bypass branch must end at a labelled "pembuang panas (dry cooler)" node, not at the diagram edge.
- Dim the cool-coloured supply-air line to ink-2 outside mode B.
- The aria-label reads "0 persen" for every allocation; fix it.
- Move the PriorArt panel into a Disclosure.
- Put the novelty line under the H2.
- Replace the literal "kWh_th" with the subscript form.
- Do not highlight the heat-pump ghost route at night unless that option is enabled.

**Mobile**
- "SoC 79 %" collides with "Air panas hotel": add wrapping or a gap.
- Write "isi tangki" instead of "SoC" in visible text.

### W8b (Sehari, Desikan)

**Sehari**
- Subheading: "Geser jam: air panas dari kolektor, tangki, atau pemanas cadangan."
- Keep exactly one adaptive line: "Pada atap ini router memilih air panas dan menolak desikan; keputusan itu dihitung, bukan diasumsikan."
- Move the strategy table, area sweep and rain-panel details into a Disclosure.
- Keep one rain line visible: "3 hari hujan: pemanas cadangan menutup X %; layanan tetap 100 %."
- The 72 h solar figure includes heat already stored in the tank; say "termasuk simpanan awal".
- Replace "AC tetap nyaman" with "Koil AC tetap menangani udara lembap."
- Remove the duplicate simulation line.

**Desikan**
- Keep visible: the status, the falsifiable-threshold sentence and one chart.
- Move the T_regen table, ledger, levers and value table into a single "Lihat perhitungan" disclosure.
- Terms: "Bed" becomes "unggun"; "after-cooler" becomes "pendingin lanjutan (after-cooler)".
- Remove "diuji jujur" from the title.
- Fix the per-kg line using W3's change, or remove it.
- Show the "≈ impas" band.

### W9a (Dampak, Validasi)

**Dampak (P0)**
- The visible text is ONE sentence, with the net number as the hero at number-xl 96 px, optionally on a dark beat.
- Move both verdict paragraphs into a Disclosure titled "Ringkasan per pembanding".
- Merge the two B4 break-even mentions into one.
- Replace "pembanding utama yang jujur" with "pembanding terkuat".
- Apply the 0,267 Panas factor only on rows for heat actually used.
- Write "Rp448–995 juta", not "448 juta–Rp995 juta".
- On mobile the table clips "+Rp76 jut" and "−Rp34 juta": stack or wrap the cells.
- The preset switch must show a pending state while recomputing. Compute lazily or defer to avoid freezing the main thread.
- Replace "Dibuang lewat bypass" with "Dilepas lewat pembuang panas (bypass)".

**Validasi**
- Show risks as compact rows (title plus "Kini"), each with its own disclosure.
- Heading: "Yang bisa membantah SolarVein".
- Make the legend compact.
- Replace "buku besar" with "tabel emisi di Dampak".
- On mobile the KPI cells clip "tidak b…": allow wrapping.

### W9b (Lab), in progress
- Remove every v1 leftover:
  - Cerah/Hujan modes
  - "sumber hangat"
  - "COP pendingin"
  - rain cooling
  - the old 0,8 / 0,23 / 1 400 h values
  - "tanpa histeresis"
- Take the section number 07 from `nav.ts`.
- Scenario names: Terik siang / Lembap & mendung / Malam.
