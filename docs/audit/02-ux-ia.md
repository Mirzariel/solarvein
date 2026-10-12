# 02 — UX / Information Architecture audit + spec (Agent E, Phase 1)

Scope: read-only audit of `src/**`; no source edits. Binding inputs: `docs/REDESIGN_BRIEF.md` (lead decisions), `docs/CONTRACT.md` (golden physics rules).
Evidence: live DOM at http://localhost:5190 (desktop 1440 wide, default Cerah state, `<details>` closed) plus code reading. Existing screenshots reviewed: `docs/audit/before/d-hero.png`, `m-hero.png`. No new screenshots taken.

Word-count method (use the same one for the "after" measurement): `innerText` of each section root, whitespace-split, includes SVG text, numbers, units, button labels; excludes the content of closed `<details>`/disclosures and tooltips. Sub-component counts marked "≈" are from code reading, not DOM.

---

## 1. Copy audit

### 1.1 Words per section, current (measured)

| Section (id) | Visible now | Hidden in closed `<details>` | Notes |
|---|---:|---:|---|
| Header nav | 2 (wordmark; 7 links not counted) | – | 7 nav items |
| Hero `#model` (Cerah) | 223 (Hujan 250, **Lab mode 599**) | – | header 35, stage 73 (toolbar + two legends + pills), right column 105 |
| Prinsip `#prinsip` | 354 | – | 2 static SVG cross-sections + 3 blocks that say the same thing |
| Instrumentasi `#instrumentasi` | 593 | 69 | 8 metrics, 4 charts, advisories repeated from Hero |
| Perbandingan `#perbandingan` | 482 | – | verdict 77, bars 18, conversion panel 101 |
| Musim `#musim` | 357 | – | 2 SVG scenes + cards + checks + diagram + non-claims |
| Karbon `#karbon` | 479 | – | formulas 80, 4 caveat bullets |
| Asumsi `#asumsi` | 688 | 477 (11 accordions) | equations 121, limitations 204, validation 193 |
| Footer | 92 | – | |
| **Total page** | **≈ 3 275** | **≈ 546** | `document.body.innerText` = 3 275 |

Additional text that is not in the count but exists: `INPUT_LIMITS[*].help` 17 strings (~330 words, shown under every Lab slider), `LIMITATIONS` 10 (~230), `ASSUMPTIONS` 11 bodies (~450), advisory messages in `model.ts` (15-40 words each, up to 4 shown), `CutawayFallback` SVG labels (~40), `ViewerToolbar` labels + Layers menu (~45).

The primary experience a visitor sees without opening anything (Hero + Prinsip) is 577 words; the whole page is ~3 300.

### 1.2 Redundancy (things said 2+ times; ranked by cost)

| # | What is repeated | Where (count) | ≈ words wasted | Verdict |
|---|---|---|---:|---|
| R1 | "Cairan selalu masuk → keluar; yang berbalik hanya arah panas" | Hero RegimeStatement footnote; StageLegend "Cairan (selalu masuk ke keluar)"; Principle title; Principle StateCard list ×2; Principle SVG label ×2 + caption; Principle invariant headline + body + `<dl>` table; ControlPanel Group hint; Instrumentation Badge note; `SignConvention` ×2 (Instrumentation, Comparison); Assumptions sign convention + exchanger assumption; Seasons captions ×2 | ≈ 15 occurrences, 170 | Keep ONE callout on the 3D fluid path ("Cairan selalu masuk → keluar") + one line in the L3 convention note |
| R2 | Disclaimer "konseptual / edukasi / bukan CFD tervalidasi / ilustratif" | Footer ×2 paragraphs; Assumptions disclaimer panel; `LIMITATIONS[0]`; Principle "fisika PVT mapan" aside; Carbon "Hanya ilustratif"; DayHistory note; assumption `steady-lumped` | ≈ 8 occurrences, 150 | Footer one-liner + first line of the L3 "Rincian rekayasa" |
| R3 | W_th vs W_e never summed / sign convention | `SignConvention` component ×2 (Instrumentation, Comparison), Assumptions sign convention, Instrumentation lead, Comparison "Cara membaca" + conversion panel intro, DayHistory totals note + Q caption, PowerDistribution footnote + swatches, EnergyFlow footer, ChartCard subtitles, assumption `valuation`, verdict reasons | ≈ 10 occurrences, 200 | Colour/unit chips carry W_e vs W_th everywhere; the full convention lives once in L3; a 5-word tag in Perbandingan |
| R4 | Static SVG cross-sections re-draw what the 3D model + Cerah/Hujan switch already show | Principle `CrossSection` ×2 (harvest/reject) + legend of 8 swatches; Seasons `SeasonScene` ×2 | ≈ 4 diagrams, 120 SVG words + 250 prose | Delete. The live model is the diagram |
| R5 | Hero viewport says "panen panas" / heat path six times | mode button "Cerah · Panen panas"; status pill; headline "Panel memanen panas…"; detail "Panas mengalir dari sel dan absorber ke cairan…"; PathwayStrip chain + caption "Panas dari matahari menuju beban panas…"; readout hint "Panen panas"; 3D arrows | ≈ 7 channels, 60 | One channel in text (statement) + the animation |
| R6 | T_in / T_out numbers | statement headline "masuk 30,0 °C, keluar 36,2 °C"; on-model pills "Masuk 30,0 / Keluar 36,2"; Readouts "Cairan masuk/keluar" | 3× | Pills on the model (L1) only; Readouts keep them at L2 |
| R7 | Advisories rendered twice | Hero `AdvisoryList` and Instrumentation "Catatan dari model" show the same `result.advisories`; `NO_HEAT_LOAD`/`NO_HOT_SOURCE` restate the Lab toggle descriptions | ≈ 80 | One advisory component; L1 shows ≤ 1 warning/critical chip |
| R8 | Chart cards narrate themselves | Every `ChartCard` has a 25-35 word subtitle + footer; EnergyFlow `liquidState` sentence restates which side the liquid band is on; PowerDistribution duplicates EnergyFlow (same quantities, bars vs bands); ComparisonBars duplicates the comparison table; bar legend `Konv.` = `Panel PV konvensional` | ≈ 200 | Titles only; one view per quantity; reading hints in an ⓘ popover |
| R9 | Decision conditions (T_panel > T_fluid + load; T_fluid > T_panel + source; else not beneficial) | Principle StateCard "Syarat" ×2 + "Aturan keputusan" ×3; Seasons `CHECKS` ×8; Comparison verdict rule; assumption `controller`; Lab toggle descriptions | ≈ 6 expressions, 190 | One 3-row rule table (01 L2); `controller` assumption stays in L3 as the formal version |
| R10 | Carbon caveats | Carbon lead; "Baca dengan hati-hati" 4 bullets; slider help texts; "Hanya ilustratif"; assumption `carbon` | ≈ 5, 140 | Two callouts inside the disclosure + slider ⓘ |
| R11 | Two legends on the stage | `StageLegend` under the canvas AND the in-canvas "Legenda" (Aliran cairan / panas / Listrik) | 2 | Keep only the in-canvas one, 3 entries |
| R12 | Section header ritual | Every section: eyebrow + title + 1-3 sentence lead (≈ 30-45 words) ×7 | ≈ 250 | Eyebrow (number + name) + one-sentence H2 |
| R13 | Layer names defined twice | `dims.ts LAYERS.label` ("Kaca pelindung") vs `CutawayFallback FX.short` ("Kaca"); English `detail` strings in the Layers menu ("Tempered low-iron glass", "Mono-Si cells, EVA", "PU foam + back sheet") | – | Single Indonesian source for part names |
| R14 | Mode name asserts the outcome | Mode buttons "Cerah · Panen panas" / "Hujan · Pembuangan panas" while `describeRegime` may say "Tidak menguntungkan" in Hujan | – | Mode = input preset only: "Cerah", "Hujan". The computed regime is a separate status. (Consistent with golden rule 6 and "model determines direction, not a mode flag") |

### 1.3 Paragraphs that should be callouts (placed next to what they explain)

- Principle "fisika PVT yang sudah mapan…" (aside) -> one sentence inside the 02 "Tentang rancangan ini" disclosure and footer.
- Comparison "Cara membaca" bullet 2 ("PVT berinsulasi tanpa sirkulasi cenderung lebih panas") -> footnote marker on the "Suhu sel" table cell it explains.
- ControlPanel Group hints ("Cairan selalu mengalir…", "Manfaat hanya dihitung bila…") -> tooltips on the group's toggles.
- Carbon "Baca dengan hati-hati" -> two callouts inside the carbon disclosure: "Panas buangan bukan listrik yang dihemat" and "Emisi tertanam tidak pernah nol".
- Seasons "Yang tidak diklaim" (3 items) -> three one-line callouts inside the ENSO disclosure.
- DayHistory scenario notes ("Masukan saat ini tidak punya sumber panas…") -> inline 1-line chip next to the scenario control.
- Instrumentation Badge note and ChartCard footers -> ⓘ popovers.

### 1.4 Other copy findings

- English strings inside Indonesian UI (`dims.ts` layer details). Brief allows English engineering terms, but whole phrases ("Aluminium heat-spreader plate", "PU foam + back sheet") should be Indonesian (proposed in 2.2).
- Advisory messages (`model.ts`) are 15-40 words and quote numbers already on screen. UI-layer fix: show a short label by `code` at L1 and the verbatim message at L2 (table in 2.4). Message rewrites would be a `src/sim` change (Physics Reviewer), not proposed here.
- Slider helps (~20 words each) are always visible under 17 sliders; they are reference text -> ⓘ popover.
- `RegimeStatement` has a reserved `min-h-[7.5rem]` for text that will shrink; the new single-sentence statement needs ~2 lines of reserved height only.
- `Readouts` shows 8 metrics at once; only 4 are Level 1 by lead decision.
- `describeRegime.headline` mixes numbers into the sentence, so the aria-live announcement changes with every T_in/T_out change; move numbers to the readouts' aria-labels and keep the live-region text numberless (it already only fires on regime-key change; keep that).
- Prohibited-by-contract wording is already correct and must stay verbatim: `NOT_BENEFICIAL_MESSAGE = "Pendinginan tidak menguntungkan pada kondisi ini."`.

---

## 2. IA spec: four sections

Levels: **L1** visible on load; **L2** on interaction (hover/tap/expand a panel); **L3** engineering detail inside a closed disclosure.
Disclosure pattern for all L2/L3: `button[aria-expanded]` + region, height/opacity 220-350 ms, `cubic-bezier(0.22,1,0.36,1)`, reduced-motion = instant. Do not rely on native `<details>` animation.

### 2.0 Page skeleton

```
SiteHeader (sticky, 56 px)           nav: 01 Pengalaman · 02 Di dalam SolarVein · 03 Lab rekayasa · 04 Perbandingan
#pengalaman    01 Pengalaman          H1 + sub, stage, L1 readouts
#di-dalam      02 Di dalam SolarVein  exploded view + 4 annotations
#lab           03 Lab rekayasa        controls + outputs + "Rincian rekayasa" (L3)
#perbandingan  04 Perbandingan kinerja  3-way table, verdict, [Konteks iklim], [Dampak karbon]
SiteFooter                            one line
```

`#model` -> `#pengalaman`, `#prinsip`/`#musim`/`#karbon`/`#asumsi`/`#instrumentasi` are removed as top-level ids (keep `#lab-rincian` and `#karbon` as in-section anchors that auto-expand their disclosure).

Open architecture question for the lead (affects 01-03): a **single persistent canvas** that docks per section (01 hero-size, 02 same canvas exploded, 03 sticky compact beside controls, 04 unmounted/hidden) fits "never replace the 3D scene, keep camera" best. Fallback: a second light canvas in 03 (`frameloop="demand"`, mounted only while in view). Section 03 needs the model visible while sliders move; do not push it to a text-only lab.

### 2.1 Section 01 — Pengalaman (`#pengalaman`)

Level / inventory:

| Level | Element | Source today | Notes |
|---|---|---|---|
| L1 | Eyebrow `01 · Pengalaman` | new | mono 12 px |
| L1 | H1 | Hero h1 | "Satu panel. Dua arah panas." |
| L1 | Sub (1 line) | Hero p | "Listrik surya dan pertukaran panas dua arah, divisualisasikan." |
| L1 | Switch **Cerah / Hujan** (+ passive "Kustom" chip when inputs differ from both presets) | `SegmentedControl` 3 modes | no outcome words in labels (R14). "Lab manual" option removed (Lab is section 03) |
| L1 | 3D stage (graphite) | `CollectorStage` | toolbar reduced to one control: Atur ulang tampilan |
| L1 | On-model callouts (in-canvas labels) | pills in canvas | "Masuk 30,0 °C", "Keluar 36,2 °C", "Cairan selalu masuk → keluar", heat-arrow label "Panen panas" or "Buang panas" (follows sign of Q) |
| L1 | In-canvas legend, 3 entries | canvas legend + `StageLegend` | "Cairan", "Arah panas ↓↑", "Listrik"; entries hidden when not drawn |
| L1 | **THE statement** (one sentence, live, regime-driven) + status pill | `RegimeStatement` | copy in 2.1.1 |
| L1 | Readout bar, 4 cells: **Mode** (the switch state), **Arah panas** (glyph ↓ / ↑ / — + word), **Listrik PV** `W_e`, **Panas** `W_th` (signed, direction glyph) | `Readouts` (8) | `W_e` in neutral-light electrical style, `W_th` in amber (harvest) or blue (reject); thin divider between, never a sum |
| L1 | ≤ 1 advisory chip, only `warning`/`critical` (e.g. stagnation) | `AdvisoryList` | top-left of stage; label table 2.4 |
| L2 | Expandable "Detail" under the readout bar: Irradiansi, Suhu sel, T masuk, T keluar (+ΔT), Daya pompa, Listrik bersih | `Readouts` (other 6) | 3x2 grid, 120-180 ms count interpolation |
| L2 | "Catatan sistem (n)" list of all advisories verbatim | `AdvisoryList` | collapsed count badge when n>0 |
| L2 | "Kapan arah berbalik?" 3-row rule table | Principle decision rules + StateCard "Syarat" + Seasons CHECKS | copy in 2.1.2 |
| L2 | ⓘ on `W_th`: sign convention one-liner | `SignConvention` | "+ = panas ke cairan (panen); − = dari cairan ke panel (buang). W_th dan W_e tidak dijumlahkan." |
| L2 | Link "Atur sendiri →" (#lab) | "Ubah parameter di Lab" button + helper sentence | text link, not a button |
| deleted | PathwayStrip (4-node chain + caption) | – | duplicates 3D arrows + statement; its chain text becomes the stage `aria-description` (sr-only), per regime |
| deleted | RegimeStatement `detail` sentence and fluid-direction footnote | – | animation + callout say it |
| deleted | StageLegend (second legend), "Radiasi matahari" swatch | – | |
| deleted | Hero eyebrow "Kolektor PVT dua arah" | – | lives in `<title>` / meta |
| deleted | In-hero Lab mode with embedded ControlPanel | – | moves to 03 |

#### 2.1.1 The statement (final Indonesian copy; ≤ 14 words, no numbers, numbers live in readouts)

| `regime`/key | Pill | Sentence |
|---|---|---|
| harvest | Panen panas | "Panel lebih panas dari cairan, jadi panas mengalir ke cairan." |
| reject | Pembuangan panas | "Cairan lebih hangat dari panel, jadi panas dibuang ke udara dan hujan." (rain = 0: "…dibuang ke udara sekitar.") |
| not-beneficial (both branches) | Tidak menguntungkan | "Pendinginan tidak menguntungkan pada kondisi ini." (**verbatim, mandatory**) |
| idle-off | Pompa mati | "Pompa dimatikan: tidak ada sirkulasi, panel stagnan." |
| idle-none | Pompa mati | "Pompa mati: tidak ada beban maupun sumber panas." |
| idle-auto | Pompa ditahan | "Pompa ditahan: panas yang didapat belum sepadan dengan listrik pompa." |
| neg-noload | Tanpa beban panas | "Cairan menerima panas, tetapi tidak ada beban yang memakainya." |
| neg-nosource | Tanpa sumber panas | "Cairan lebih hangat dari panel, tetapi tidak ada sumber panas yang perlu didinginkan." |
| neg-small | Pertukaran kecil | "Pertukaran panas terlalu kecil untuk bermanfaat." |

The "why" with numbers (the old `detail`, e.g. "Cairan 45,0 °C, panel 38,2 °C…") becomes the content of a small ⓘ on the pill (L2), generated from the same `describeRegime` data.

#### 2.1.2 L2 "Kapan arah berbalik?" (final copy)

| | Syarat | Hasil |
|---|---|---|
| Panen panas | `T_panel > T_cairan` dan ada beban panas | Pompa menyala; panas mengalir ke cairan. |
| Buang panas | `T_cairan` jauh di atas `T_panel` dan ada sumber panas nyata | Pompa menyala; panas dilepas ke udara dan hujan. |
| Selain itu | – | Pendinginan tidak menguntungkan pada kondisi ini. |

Footer line of the table (callout, 1 sentence): "Cairan selalu masuk → keluar; hanya arah panas yang berbalik." (this is the only prose sentence stating the invariant outside the stage callout.)

### 2.2 Section 02 — Di dalam SolarVein (`#di-dalam`)

H2 (ONE visible sentence): **"Urai panelnya dan sentuh tiap bagian untuk melihat perannya."**
No paragraphs. Same canvas, exploded; the existing explode/cross-section/focus logic is reused.

| Level | Element | Source today | Notes |
|---|---|---|---|
| L1 | Stage with exploded model; **Urai** toggle (animated, also scroll-linked is optional), **Potongan** toggle, **Atur ulang** | `ViewerToolbar` (11 controls) | visible toolbar = 3 buttons + "Tampilan ▾" |
| L1 | 4 clickable annotations (hotspot + leader + label) | `LAYERS` (6) grouped to 4, `focusLayer` | table below |
| L1 | Active-part card (desktop right column; mobile under stage): name, ONE sentence, ONE live value | new | selecting dims the other layers (existing `focusLayer`) |
| L2 | "Tampilan ▾" menu: Aliran cairan, Panah panas, Putar otomatis, Lapisan (6 checkboxes + "Sorot" per layer), camera rotate/zoom buttons | `ViewerToolbar` | rotate/zoom buttons stay in DOM for keyboard users, only in this menu |
| L3 | Disclosure "Tentang rancangan ini": 1 sentence honesty note + 1 sentence on same hardware | Principle aside + invariant panel | "Fisika PVT sudah mapan; yang diperagakan hanya satu sirkuit untuk dua arah panas. Perangkat kerasnya sama pada kondisi cerah maupun hujan." |
| deleted | Principle section entirely; Principle legend; Seasons SVG scenes | – | see R4 |

Annotations (final copy). Parts group `dims.ts` layers; live value comes from `SimResult`:

| # | Label | Layers | One sentence | Live value |
|---|---|---|---|---|
| 1 | Sel PV | glass + cells | "Mengubah cahaya jadi listrik; efisiensinya turun saat sel memanas." | `T sel` °C and `W_e` |
| 2 | Absorber | interface + absorber | "Pelat aluminium yang menghantar panas antara sel dan saluran, ke dua arah." | absorber node temp (`profile`) °C |
| 3 | Saluran cairan | channel | "Tabung tembaga serpentine; cairan selalu masuk lalu keluar." | `T masuk → T keluar` °C, ΔT |
| 4 | Insulasi & rangka | insulation | "Menahan rugi panas di sisi belakang." | `Q belakang` `W_th` (`qBackLossW`) |

Layers menu detail strings, Indonesian (replacing English `detail`): Kaca = "Kaca tempered rendah-besi"; Sel PV = "Sel mono-Si + EVA"; Antarmuka termal = "Bahan antarmuka (TIM)"; Absorber = "Pelat aluminium penyebar panas"; Saluran = "Tabung tembaga serpentine"; Insulasi = "Busa PU + lembar belakang". The WebGL-fallback `CutawayFallback` must take its names from the same table (R13).

Fallback (no WebGL): `CutawayFallback` keeps behaviour; keep its pills ("Masuk"/"Keluar") and the "Sisi matahari di atas" caption (its one hint). Its heat label is two lines ("Panen"/"panas" + `W_th`): use "Panen panas" / "Buang panas" to match the model callout.

### 2.3 Section 03 — Lab rekayasa (`#lab`)

H2 (ONE visible sentence): **"Atur kondisinya, lihat ke mana panas dan listrik mengalir."**

Layout: see 3.4. Controls are the single source of inputs (moving any slider sets the store mode to `lab`/"Kustom"; 01's switch shows the "Kustom" chip; "Muat preset" re-selects).

| Level | Element | Source today | Notes |
|---|---|---|---|
| L1 | Sticky compact stage + 4-cell readout strip (same 4 as 01) | Hero in Lab mode | so the effect is seen while dragging |
| L1/L2 | Controls, groups **open by default**: *Lingkungan* (G, T udara, hujan, angin); *Sirkuit cairan* (T masuk, debit); *Beban & sumber* (2 toggles); *Pompa* (3-way control) | `ControlPanel` | slider shows label, value, unit; **no visible help** |
| L2 | Controls in "Lanjutan ▾" (closed): U pelat–cairan, luas panel, rugi tekan, efisiensi pompa, η pemanas, COP, η_PV acuan, β | `ControlPanel` Groups + `<details>` | all 17 numeric inputs kept |
| L2 | Slider ⓘ popover = `INPUT_LIMITS.help` (trim to ≤ 14 words) | `Slider help` | table 2.5 |
| L2 | Actions: "Preset Cerah", "Preset Hujan", "Setel ulang" | `ControlPanel` buttons | same |
| L2 | Computed outputs: 8-metric grid | `Instrumentation` Metrics | no sublabels longer than 4 words; ΔT sublabel `T masuk → T keluar` stays |
| L2 | **Chart tabs** (one visible): **Aliran energi** (EnergyFlow, default) · **Profil suhu** (TemperatureProfile) · **Riwayat harian** (DayHistory with Cerah/Hujan day switch) | 4 `ChartCard`s stacked | chart titles only; ≤ 1 sentence "cara membaca" in ⓘ |
| L2 | EnergyFlow view toggle **Pita / Batang** | EnergyFlow + PowerDistribution | PowerDistribution merged into the toggle (same quantities, R8) |
| L2 | Advisories (same shared component as 01) | `AdvisoryList` | |
| L3 | **"Rincian rekayasa"** disclosure group (closed), 6 sub-panels: *Persamaan inti* (5 equations + balance residual), *Koefisien yang sedang dipakai* (7-row table), *Asumsi pemodelan* (11 accordions, verbatim `ASSUMPTIONS`), *Keterbatasan* (10, verbatim `LIMITATIONS`), *Langkah validasi* (7), *Konvensi tanda & satuan* | `Assumptions` entire + `SignConvention` | first line inside, once: "Simulasi konseptual untuk edukasi; bukan CFD tervalidasi, uji lapangan, atau alat penilai kinerja bersertifikat." |
| deleted | Instrumentation lead + regime Badge + liquid-direction note; Instrumentation advisories (duplicate); ChartCard subtitles/footers as prose; `EnergyFlow liquidState` sentence (becomes the ribbon label); separate `PowerDistribution` card; `SignConvention` panels (2 copies visible) | – | |
| deleted | ControlPanel intro paragraph, Group hints | – | tooltips |

Chart labels that must stay on the charts (callouts, not paragraphs): ribbon labels "Listrik W_e" / "Panas W_th"; "Ke cairan (panen)" / "Dari cairan (buang)"; temperature profile ΔK arrows; day-history legends ("+ panen", "− buang", "Jam lokal").

### 2.4 Advisories: L1 chip labels (UI layer; verbatim `message` stays the L2 text)

| code | severity | L1 chip (only warning/critical) | shown at L1? |
|---|---|---|---|
| STAGNATION_HOT | warning/critical | "Panel stagnan panas" | yes |
| PUMP_EXCEEDS_BENEFIT | warning | "Pompa lebih boros dari manfaat" | yes |
| LOW_IRRADIANCE | info | "Irradiansi rendah" | L2 only |
| NO_HEAT_LOAD | info | "Tanpa beban panas" | L2 only |
| NO_HOT_SOURCE | info | "Tanpa sumber panas" | L2 only |
| PUMP_FORCED_OFF, LOOP_NO_ENDPOINT, NEGLIGIBLE_EXCHANGE, HARVEST_ONLY_NO_REJECTION, NO_EXCHANGER, PUMP_IGNORED | info | – | L2 only |
| REJECTION_NOT_BENEFICIAL | info | – | never separately; it IS the statement (existing `hideCodes` behaviour, keep) |

### 2.5 Slider labels and help (final; replaces visible help text)

| key | Label | ⓘ help (≤ 14 words) |
|---|---|---|
| irradiance | Irradiansi G | "Daya matahari pada panel. Cerah ±800-1000, mendung tebal di bawah 200 W/m²." |
| ambientC | Suhu udara | "Menentukan rugi panas depan dan belakang." |
| rainMmH | Hujan | "0 = kering. Hujan lebat ±10-50 mm/jam." |
| windMs | Angin | "Makin kencang, makin besar pelepasan panas konveksi." |
| inletC | T masuk cairan | "Suhu balik dari beban air panas atau loop proses hangat." |
| flowLpm | Debit | "Debit besar menjaga ΔT kecil, tetapi daya pompa naik ≈ kuadrat debit." |
| areaM2 | Luas panel | "Modul rumah tangga ±1,6-2 m²." |
| uPlateFluid | U pelat–cairan | "Makin besar, penukar panas makin efektif (NTU naik)." |
| pressureDropKPa | Rugi tekan @ 2 L/mnt | "Diskalakan dengan kuadrat debit; menentukan daya pompa." |
| pumpEfficiency | Efisiensi pompa | "Listrik ke hidrolik; umumnya 0,2-0,4." |
| etaRef | η PV acuan | "Efisiensi pada 25 °C sel dan 1000 W/m²; modul modern 0,18-0,22." |
| betaPerK | β suhu daya | "Penurunan daya per K; silikon kristalin ≈ 0,35-0,45 %/K." |
| boilerEfficiency | η pemanas pengganti | "Mengubah panas yang dipanen menjadi bahan bakar yang dihemat." |
| coolingCOP | COP pendingin pengganti | "W panas dibuang per 1 W listrik; chiller kecil ≈ 3-4." |
Toggles: "Ada beban panas yang memakai panas" (help: "Mis. pemanas air. Tanpa beban, panas tidak dihitung bermanfaat.") and "Ada sumber cairan hangat yang perlu didinginkan" (help: "Mis. loop proses. Tanpa sumber, panel tidak membuang panas; panas tidak diada-adakan.").
Pump control options keep labels Otomatis / Paksa nyala / Mati; the three explanation sentences under it become option tooltips (the current status sentence "Saat ini pompa menyala dengan daya X W" duplicates the readout -> delete).

### 2.4b Section 04 — Perbandingan kinerja (`#perbandingan`)

H2 (ONE visible sentence): **"Tiga konfigurasi pada kondisi yang sama; vonisnya dihitung dari angka."**

| Level | Element | Source today | Notes |
|---|---|---|---|
| L1 | Scenario switch **Saat ini · Cerah · Hujan** (option descriptions as tooltips: "Memakai masukan di Lab", "Siang tropis cerah, ada beban air panas", "Mendung deras, ada loop proses hangat") | Comparison `SegmentedControl` | |
| L1 | Comparison as ONE table, 3 columns: **PV konvensional · PV + pendingin cairan · SolarVein dua mode** (header tooltip carries the long names from `CONFIG_META.full`) | `Comparison` table + `ComparisonBars` | rows with inline bars (bars become the visual layer of the cells; no separate small-multiples grid) |
| L1 rows | **Net listrik** `W_e`; **Panas berguna** `W_th`; **Panas dibuang** `W_th`; **Suhu sel** °C (footnote †) | `ROWS` | unsigned labels, so no sign convention needed here |
| L2 rows | Daya listrik PV; Konsumsi pompa; Status pompa | `ROWS` | behind "Tampilkan semua baris" |
| L1 | **Verdict sentence** (computed `computeVerdict().headline`, tone-coloured) + tag "W_e dan W_th tidak dijumlahkan." | verdict Panel | ≤ 20 words; unchanged logic |
| L2 | "Alasan" list (verdict reasons, verbatim), then "Aturan vonis" one sentence | verdict Panel | |
| L1 | Per-column honest line, 2 short bullets each (static caveats, see below) | new | required by the brief ("honest advantages & limitations") |
| L2 | Disclosure **"Konteks iklim: El Niño dan La Niña"** — *summary text visible:* "Konteks, bukan sakelar" | `Seasons` | 2.4c |
| L2 | Disclosure **"Dampak karbon"** — *summary text visible:* a live line "Net ±{X} kgCO₂e/tahun · payback {Y} tahun · ilustratif" | `Carbon` | 2.4d |
| L3 | "Konversi eksplisit ke energi primer" (3 formulas with live numbers) | Comparison conversion Panel | inside the table's "Rincian" |
| L3 | Sign convention + W_th/W_e note | `SignConvention`, "Cara membaca" | link to 03 L3 note rather than repeating |
| deleted | Params line "G 900 W/m² · T udara…" (duplicate of Lab; keep as tooltip of the scenario switch), table caption sentence, bar legend, "Cara membaca" panel (3 bullets moved as noted) | – | |

Static per-column lines (final copy, flag for Physics Reviewer sign-off):

| Column | Kelebihan | Batasan |
|---|---|---|
| PV konvensional | "Sederhana: tanpa pompa dan penukar panas." | "Tidak memanen maupun membuang panas." |
| PV + pendingin cairan | "Memanen panas bila ada beban panas." | "Tidak pernah membuang panas; tanpa sirkulasi lebih panas dari PV biasa." |
| SolarVein dua mode | "Satu sirkuit bisa memanen atau membuang panas." | "Pembuangan hanya bermanfaat bila ada sumber panas nyata; pompa memakai listrik." |

Footnote † on Suhu sel (callout at the cell): "Tanpa sirkulasi, PVT berinsulasi lebih panas dari PV konvensional, sehingga listriknya bisa lebih rendah."

#### 2.4c ENSO sub-part (inside 04, closed disclosure)

Visible summary: "Konteks iklim: El Niño dan La Niña — konteks, bukan sakelar."
Inside (replaces the whole Seasons section; no SVG scenes):

- Two chips, one line each (final copy):
  - **El Niño** — "Cenderung lebih kering dan cerah; panen panas dan suhu modul jadi relevan." Action: "Lihat Preset Cerah".
  - **La Niña** — "Cenderung lebih basah dan berawan; panas hanya dibuang bila ada sumber panas yang lebih hangat dari panel." Action: "Lihat Preset Hujan".
- One callout (the thesis): "Mode kerja mengikuti kondisi terukur, bukan kalender atau nama fenomena."
- "Yang tidak diklaim" (3 callouts, verbatim intent, tightened): "La Niña bukan hujan terus-menerus." · "Sistem ini tidak menyelesaikan banjir." · "Tidak ada pendinginan otomatis sepanjang musim hujan."
- Caption for the preset buttons: "Preset adalah contoh hari, bukan prakiraan musim."
No flood claim, no "always cooling" claim, ENSO never appears as a switch or as an input to the model.

#### 2.4d Carbon sub-part (inside 04, closed disclosure "Dampak karbon")

Summary line as above. Inside, in order: 5 assumption controls (grid EF, fuel EF, jam setara, emisi tertanam, toggle "Pendingin pengganti dimodelkan") with ⓘ helps (existing texts trimmed to one sentence), result metrics (kredit listrik/panas/pendingin, penalti pompa, net, payback), `CarbonWaterfall`, `CarbonPayback`, then L3 "Dari mana angkanya" (formulas with live numbers), then 2 callouts: "Panas buangan bukan listrik yang dihemat." and "Emisi tertanam tidak pernah nol." The other two current bullets ("Hanya ilustratif", "Faktor emisi dapat berubah") merge into the summary tag "ilustratif" and the slider ⓘ.

### 2.5b Footer

One line, left: **"Simulasi konseptual untuk edukasi — bukan CFD tervalidasi, uji lapangan, atau alat penilai kinerja bersertifikat."** Right: link "Asumsi dan keterbatasan" (expands `#lab-rincian`). Delete: "Tentang demonstrasi ini" heading, the "prinsip fisikanya sudah mapan" paragraph (moved to 02 L3), the 3-link nav, "Dibangun sebagai demonstrasi…".

---

## 3. Maps and specs

### 3.1 Old -> new map (every current section/component)

| Current | New home | Level | Action |
|---|---|---|---|
| SiteHeader nav (7) | SiteHeader nav (4) | L1 | rewrite |
| Hero header (eyebrow, h1, p) | 01 H1 + sub | L1 | rewrite shorter |
| Hero SegmentedControl 3 modes | 01 switch Cerah/Hujan (+Kustom chip) | L1 | change |
| `CollectorStage` / `CollectorCanvas` | 01 stage (shared with 02, 03) | L1 | keep |
| `ViewerToolbar` | 01: Atur ulang only · 02: Urai, Potongan, Atur ulang, Tampilan ▾ | L1/L2 | split by section |
| `StageLegend` | in-canvas legend | L1 | delete (merge) |
| `RegimeStatement` | 01 statement + pill | L1 | rewrite to 1 sentence; `detail` -> pill ⓘ (L2) |
| `PathwayStrip` | sr-only stage description | – | delete visual |
| `Readouts` (8) | 01 bar (4) + 01 L2 detail (6) | L1/L2 | split |
| `AdvisoryList` | 01 chip (≤ 1) + 01 L2 list + 03 L2 (shared) | L1/L2 | merge with Instrumentation list |
| Hero "Ubah parameter di Lab" + helper | link "Atur sendiri →" | L2 | shrink |
| `ControlPanel` (embedded in Hero Lab mode) | 03 controls | L1/L2 | move |
| `Principle` header/lead | – | – | delete |
| `Principle` CrossSection ×2, StateCards, legend | – | – | delete (live model replaces) |
| `Principle` conditions + decision rules | 01 L2 "Kapan arah berbalik?" | L2 | merge |
| `Principle` invariant panel + dl | stage callout + 1 sentence in rule table | L1/L2 | merge |
| `Principle` honesty aside | 02 L3 "Tentang rancangan ini" + footer | L3 | merge |
| `Instrumentation` lead | – | – | delete |
| `Instrumentation` Metrics (8) | 03 output grid | L2 | keep |
| `Instrumentation` regime Badge + notes | – | – | delete |
| `Instrumentation` advisories | shared advisory component | L2 | dedupe |
| `SignConvention` ×2 | 03 L3 "Konvensi tanda & satuan"; 01 ⓘ on `W_th` | L2/L3 | one copy |
| `EnergyFlow` | 03 chart tab 1 (Pita) | L2 | keep, trim copy |
| `PowerDistribution` | 03 chart tab 1 (Batang view) | L2 | merge |
| `TemperatureProfile` | 03 chart tab 2 | L2 | keep |
| `DayHistory` | 03 chart tab 3 | L2 | keep |
| `Comparison` scenario control | 04 switch | L1 | keep |
| `Comparison` verdict | 04 verdict sentence (L1) + reasons (L2) | L1/L2 | trim |
| `Comparison` table | 04 table | L1 | keep, 4 rows L1 |
| `ComparisonBars` | inline bars in table | L1 | merge |
| `Comparison` conversion Panel | 04 L3 | L3 | keep |
| `Seasons` | 04 disclosure "Konteks iklim" | L2 | compress; delete SVG scenes + CHECKS |
| `Carbon` | 04 disclosure "Dampak karbon" | L2/L3 | wrap |
| `Assumptions` (equations, coefficients, assumptions, limitations, validation, disclaimer) | 03 L3 "Rincian rekayasa" | L3 | wrap; content kept verbatim |
| `SiteFooter` | footer one-liner | L1 | cut |
| `CutawayFallback` | 02 fallback (names from shared table) | L1 | unify labels |
| `src/sim/presets.ts` labels/help | 03 ⓘ popovers (2.5) | L2 | trim |
| `src/sim/assumptions.ts` | 03 L3 | L3 | unchanged |
| `src/sim/model.ts` advisories | chip labels (2.4) | L1/L2 | UI-layer map |

### 3.2 Nothing scientifically necessary is lost (checklist)

| Must keep | New location |
|---|---|
| "Pendinginan tidak menguntungkan pada kondisi ini." | 01 statement (verbatim); 01 L2 rule row 3; 04 verdict reasons; unchanged `NOT_BENEFICIAL_MESSAGE` |
| Sign convention (`Q>0` panen, `Q<0` buang) | signed `W_th` readout + glyph; 01 ⓘ; 03 L3 convention; table avoids signs via "berguna/dibuang" |
| `W_th` vs `W_e` never summed | colour/unit chips everywhere; 04 tag; 03 L3; 01 ⓘ |
| Fluid always inlet -> outlet | stage callout "Cairan selalu masuk → keluar"; 01 L2 rule footer; 03 L3 |
| Heat direction set by model, not mode | switch labels without outcome (R14); statement computed |
| Hot source / heat load requirement | 01 L2 rules; Lab toggle labels; verdict; advisories |
| Disclaimer (educational, not CFD/field/certified) | footer one-liner; first line of 03 L3 |
| Assumptions + limitations + validation steps | 03 L3 verbatim |
| Equations + energy-balance residual + live coefficients | 03 L3 |
| ENSO caveats (context not switch; La Niña ≠ constant rain; no flood; no always-cooling) | 04 ENSO disclosure; summary line itself says "konteks, bukan sakelar" |
| Stagnation hot warning | 01 L1 chip |
| PV temperature derating (β) | 02 annotation 1; Lab slider β; 04 † footnote |
| Embodied carbon never zero; heat rejected ≠ electricity saved | 04 carbon callouts |
| "Heat is not invented" | Lab toggle ⓘ; verdict; advisory NO_HOT_SOURCE |
| Insulated PVT hotter without circulation | 04 † footnote; assumption `back`; limitation 7 |

### 3.3 Hero first 5 seconds (what the eye sees, in order)

1. **0-1 s** — motion on the model: panel on the graphite stage, amber heat arrows drifting down, fluid dashes moving along the serpentine. The stage is the largest, darkest, only moving object, so it wins the first fixation. No text competes with it.
2. **1-2 s** — H1 "Satu panel. Dua arah panas." (56-64 px, light page background, top-left), sub below at 16 px.
3. **2-3 s** — the Cerah/Hujan switch (the only high-contrast control above the fold; sits on the H1 baseline, right aligned on desktop). Hujan label has a small rain glyph so the affordance is read as "weather".
4. **3-4 s** — status line in the readout bar under the stage: amber dot + "Panen panas" + the one sentence.
5. **4-5 s** — the two numbers: `293 W_e` (neutral light) and `+865 W_th ↓` (amber). A one-off hint "Geser untuk memutar" fades out after the first drag or after 6 s.

On switching to Hujan the same eye path is reused: the stage changes (inputs interpolate), the statement text cross-fades (220-350 ms), numbers interpolate. No layout shift: the statement area reserves two lines.

#### Desktop wireframe (1440 x 900; 12-col, max 1280 content; sums to 900 px)

```
┌─ SiteHeader 56 ────────────────────────────────────────────────────────────────────────┐
│ ◧ SolarVein Liquid        01 Pengalaman  02 Di dalam SolarVein  03 Lab rekayasa  04 Perbandingan │
├────────────────────────────────────────────────────────────────────────────────────────┤  light #F7F8F6
│ 01 · PENGALAMAN                                                      (24 top gap)      │
│ Satu panel. Dua arah panas.                                [ ☀ Cerah | ☂ Hujan ]       │  H1 56px
│ Listrik surya dan pertukaran panas dua arah, divisualisasikan.                          │  16px, text-2
├────────────────────────────────────────────────────────────────────────────────────────┤  ~ 130
│┌──────────────────────── graphite stage, 12 cols, h = clamp(448, 100svh-56-130-96, 720)┐│
││ ⚠ Panel stagnan panas (only if warning)                                  [⟲ Atur ulang]││
││                                                                                        ││
││            ↓ ↓ ↓  (amber arrows, labelled "Panen panas")                               ││
││        ┌──────────── 3D panel (orbit, inertial) ─────────────┐                        ││
││ Masuk 30,0 °C ·····    Keluar 36,2 °C                                                   ││
││        └──────────────────────────────────────────────────────┘                        ││
││  — Cairan selalu masuk → keluar                                                        ││
││ ── Cairan   ↓↑ Arah panas   ─ Listrik                          Geser untuk memutar      ││
│└────────────────────────────────────────────────────────────────────────────────────────┘│
│ ● Panen panas  Panel lebih panas dari cairan, jadi panas mengalir ke cairan.     (ⓘ)      │
│ ┌───────────────┬───────────────────┬────────────────────┬──────────────────────┬──────┐│
│ │ MODE          │ ARAH PANAS        │ LISTRIK PV         │ PANAS KE CAIRAN ⓘ    │Detail▾││
│ │ Cerah         │ ↓ panel → cairan  │ 293 Wₑ             │ +865 Wₜₕ             │      ││
│ └───────────────┴───────────────────┴────────────────────┴──────────────────────┴──────┘│
│  (L2 on "Detail ▾": Irradiansi 900 · T sel 37,4 · T masuk 30,0 · T keluar 36,2 · Pompa 4,1 W · Net 289 Wₑ │
│   · Catatan sistem (0) · Kapan arah berbalik? · Atur sendiri →)                          │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
At 1280 x 720 the stage floor is 448 px; the readout bar stays in the first fold. At 1440 x 900 stage ≈ 618 px.

#### Mobile wireframe (390 x 844; bottom control area)

```
┌──────────────── 390 ────────────────┐
│ ◧ SolarVein Liquid             ☰    │ 56
├─────────────────────────────────────┤
│ 01 · PENGALAMAN                     │
│ Satu panel.                         │ H1 32px, 2 lines
│ Dua arah panas.                     │
│ Listrik surya dan pertukaran        │ sub 14-15px, 2 lines
│ panas dua arah, divisualisasikan.   │
│ ┌─────────────────────────────────┐ │
│ │ graphite stage 358 x ≈ 380      │ │  height = clamp(320, 100svh-56-150-132, 460)
│ │ Masuk 30,0°C   Keluar 36,2°C    │ │
│ │    (3D, touch drag, pinch)      │ │
│ │ ── Cairan ↓↑ Arah panas ─ Listrik│ │
│ │                        [⟲]      │ │
│ └─────────────────────────────────┘ │
├─ sticky bottom control area (sticks to bottom of section, safe-area padded) ─┤
│ [   ☀ Cerah    |    ☂ Hujan   ]    │ 44 px targets
│ ● Panen panas — Panel lebih panas   │ statement 14px, ≤ 2 lines
│   dari cairan, jadi panas mengalir  │
│   ke cairan.                        │
│ 293 Wₑ         +865 Wₜₕ ↓           │ 24px numerals
│ ──────  Detail ▴  ──────            │ handle opens the L2 sheet (max 60svh)
└─────────────────────────────────────┘
```
The sheet (L2) slides over the readout area, keeps the stage visible above, content = the 6 L2 metrics (2 columns), advisories, rules, "Atur sendiri →". Mode switch stays pinned in the sheet header. Landscape < 500 px height: stage fills, readouts become a one-line overlay.

### 3.4 Lab (03) layout wireframes

Desktop >= 1024:
```
03 · LAB REKAYASA
Atur kondisinya, lihat ke mana panas dan listrik mengalir.
┌──────────── cols 1-7 (sticky, top 72) ───────────┐ ┌──────── cols 8-12 ───────────┐
│ compact stage (h 320)                            │ │ Lingkungan                   │
│ Cerah|Hujan|Kustom   293 Wₑ  +865 Wₜₕ ↓  37,4 °C │ │  G ───●─── 900 W/m²   ⓘ      │
└──────────────────────────────────────────────────┘ │  T udara ──●── 32,0 °C       │
                                                      │ Sirkuit cairan  ...          │
                                                      │ Beban & sumber  [toggle] ... │
                                                      │ Pompa  (Otomatis|Paksa|Mati) │
                                                      │ Lanjutan ▾   [Preset ▾] Reset│
┌──────────────── full width ─────────────────────────────────────────────────────────┐
│ 8 outputs (4 x 2)                                                                    │
│ [Aliran energi] [Profil suhu] [Riwayat harian]            Pita | Batang              │
│ chart                                                                                │
│ ▸ Rincian rekayasa (L3): Persamaan · Koefisien · Asumsi · Keterbatasan · Validasi · Konvensi │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
Tablet (768): stage sticky on top (h 34svh) with the compact strip; controls below single column; outputs below.
Mobile: sticky top stack under the header = mini stage (h 28svh) + one-line strip (Wₑ, Wₜₕ); control groups are accordions (first two open).

### 3.5 Navigation spec

- **4 items**, in this order, labels and ids:
  `01 Pengalaman` -> `#pengalaman`; `02 Di dalam SolarVein` -> `#di-dalam`; `03 Lab rekayasa` -> `#lab`; `04 Perbandingan kinerja` -> `#perbandingan` (header shows "Perbandingan" if width < 1180).
- **Numbering style:** number in IBM Plex Mono 11-12 px, text-2 (`#66717C`), hairline gap, then label in Inter 13-14 px. Active item: label text colour `#171C22` + 1 px underline that slides between items (220 ms, ease `0.22,1,0.36,1`); inactive text-2. No accent colour on nav. Same pattern for section eyebrows (`01 · Pengalaman`, mono, uppercase tracking 0.08em).
- **Scroll-spy:** IntersectionObserver on the four ids (existing logic) with `aria-current="location"`; smooth scroll with reduced-motion fallback; scroll-margin-top 72 px.
- **Desktop >= 1024:** wordmark left, 4 items right, full labels with numbers. **768-1023:** numbers dropped, short labels (Pengalaman · Di dalam · Lab · Perbandingan). **< 768:** hamburger; sheet shows 4 rows (48 px), numbers visible, active row tinted; Escape closes; closes on selection.
- Skip link "Lewati ke konten utama" stays.
- **Footer:** single row, `border-t`, 12-13 px, text-2: disclaimer one-liner (left), "Asumsi dan keterbatasan" link (right); stacks on mobile. No second nav, no headings.

### 3.6 Word budgets (visible, default Cerah, desktop, disclosures closed)

| Section | Now | Target | Cut | What the target contains |
|---|---:|---:|---:|---|
| Header nav (labels) | ~16 (7 links) | 9 | -44 % | 4 labels incl. numbers |
| 01 Pengalaman (incl. stage text) | 223 | **70** | -69 % | H1 5, sub 8, switch 2, eyebrow 2, statement ≈ 11 + pill 2, readout labels ≈ 14 (+ units), on-model callouts ≈ 14, legend 5, Atur ulang 2, "Detail" 1 |
| (Principle) | 354 | 0 (merged) | -100 % | rules in 01 L2 |
| 02 Di dalam SolarVein | – (new) | **55** | – | eyebrow 4, H2 10, toolbar 5, 4 part names 8, active-card ≈ 20, value labels 8 |
| 03 Lab rekayasa (Instrumentation + Control + Assumptions headers) | 593 + (Lab-mode hero 599 → ~370 controls) + 688 | **230** | -87 % vs (593+688) | H2 10, group titles 5, slider labels ≈ 40 (no help), toggles ≈ 20, pump control 6, 8 output labels ≈ 20, tab labels 8, chart axis/labels ≈ 70, disclosure summaries 12 |
| 04 Perbandingan kinerja (Comparison + Seasons + Carbon) | 482 + 357 + 479 = 1 318 | **235** | -82 % | H2 11, scenario 5, table header 12 + 4 rows ≈ 30 + values, verdict ≈ 20, tag 5, 6 pro/con lines ≈ 60, † note 17, two disclosure summaries ≈ 25 |
| Footer | 92 | 28 | -70 % | one line + link |
| **Page** | **3 275** | **≈ 630** | **-81 %** | |

Primary experience (01 + 02, no interaction) = 125 words vs 577 today (Hero + Principle): -78 %.
L2 budgets: 01 Detail panel ≤ 90 words (6 metrics + rules table + advisory labels); 03 outputs/charts beyond L1 ≤ 120; 04 verdict reasons ≤ 110, ENSO ≤ 85, carbon ≤ 110. L3 content (assumptions, equations, limitations, validation) is kept verbatim (~1 150 words, closed by default).
Rule for every visible block: one sentence per idea, ≤ 20 words, no sentence that restates an animation, chart or number already on screen.

### 3.7 Dependencies, risks, and open points for the lead

1. **Shared/docked canvas** (2.0) — decision needed; spec assumes it. The Lab needs the model on screen.
2. **Mode store**: `AppMode` 'lab' must become "Kustom" (derived: inputs differ from both presets) rather than a button; `useStore.setMode('lab')` call sites (Hero, ControlPanel) change.
3. **New static copy** (04 pro/con lines, annotation sentences, ENSO chips) needs Physics Reviewer sign-off for wording; none introduces numbers.
4. **PowerDistribution merge** and **ComparisonBars into table** are the only component removals of real chart code; both keep data/aria summaries.
5. **`aria-live`**: keep the throttled announcement keyed on regime/advisory change; spoken text = pill + the new sentence (numberless).
6. Section ids change (`#model`, `#prinsip`, …); anything linking to them (footer, nav, tests) needs updating.
7. Not touched (out of scope for IA): sim copy in `model.ts`/`assumptions.ts`; the proposed chip labels are UI-side only.
