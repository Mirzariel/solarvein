# 09 - Independent Visual Critic, Pass 3 (Agent F)

Target: production preview http://localhost:4173 (rebuilt site, Phase 3b/3c), GPU rendering (ANGLE/D3D11).
Evidence (all real screenshots, all read): `docs/audit/critic-pass3/` (`<w>-<state>-<section>.png` from `scripts/qa/visual-qa.mjs`, widths 1440/1280/768/390/360, sunny + rainy), `docs/audit/critic-pass3/scroll/` (sequential viewport scroll-through at 1440 and 390), `docs/audit/critic-pass3/close/` (2x headline, 2x stage sunny/rainy, mode-switch frames at 150/350/650/1000/1600 ms, Dampak card). Before: `docs/audit/before/d-hero.png`, `m-hero.png`, etc.
QA tooling: no console errors, no horizontal overflow at any width, no NaN/undefined text; about 3,700-3,800 words (before about 3,300, so the page is wordier, mostly photo-band copy plus the Dampak scaler and ten disclosures).
Stills cannot show motion; the motion notes rely on 5 timed frames of the Cerah-to-Hujan switch and are marked as such.

---

## 1. The 12 Visual QA answers (before -> now)

| # | Question | Before (Phase 1) | Now | Evidence |
|---|---|---|---|---|
| 1 | Designed product vs template | No, template-leaning | **Mostly designed.** Photo-led opening and closing, one sans plus mono, hand-set display type, asymmetric Dampak. Remaining tells: every H2 is the same 56 px block with an empty right half; the dark 3D stage with orange arrows still looks like a dev-tool demo. | `1440-sunny-awal.png`, `scroll/1440-sunny-s02.png` |
| 2 | Clear focal point | Partly | **Yes** in opening (headline over photo) and 01/02 (stage). Weak in Lab and Perbandingan (no single hero element). | `scroll/1440-sunny-s01.png`, `-s06.png` |
| 3 | Too many cards | Yes (about 57) | **No.** Only the stage, the Dampak card and the Lab control card. | `scroll/1440-sunny-s04.png` |
| 4 | Intentional whitespace | No | **Partly.** Photo bands and the Dampak card are intentional. Dead air remains: right half of every section head, about 200 px under the 01 head, empty lower third of the stage strip, left column under the Lab readouts, 450 px gutter in the comparison table. | `scroll/1440-sunny-s02.png`, `-s07.png`, `-s10.png` |
| 5 | Verbose text | Yes | **Better in headlines, still verbose in support text.** Ten accordions, the Perbandingan verdict, Dampak lead (3 sentences at 22 px), Lab Sankey caption. | `scroll/1440-sunny-s04.png`, `-s08.png`, `-s09.png` |
| 6 | Accent overuse | Yes (6 hues) | **No.** Amber or blue is the only colour; photos carry the rest. Orange arrows on a brown stage are the one loud spot. | `1440-sunny-pengalaman.png` |
| 7 | Icon/type consistency | Mostly no | **Mostly yes.** Remaining: raw underscores (`T_in`, `T_out`, `W_th` as text) on the stage and Lab schematic; mono digits dropped into sans prose (`1 . 530 W`, `10.000`); `50 %`/`±7 %` with a space; two disclosure idioms. | `close/stage-sunny-2x.png`, `close/dampak-card.png` |
| 8 | Believable 3D | Not yet | **Better, still not convincing.** It now reads as a PV module with frame, rails and hoses; it does not read as a photographed object (no reflection, no glint, dark brown cells, floating in a void). | `close/stage-sunny-2x.png`, `close/stage-rainy-2x.png` |
| 9 | Polished micro-interactions | Cannot confirm | **Adequate.** Switch thumb slides; the whole scene is already near the final state by 650 ms (brief: 700-1200 ms) and the T_in label jumps 40,0 to 45,0 rather than tweening. Hover/focus not capturable here. | `close/switch-150ms.png`, `close/switch-650ms.png` |
| 10 | Each section adds new info | No | **Yes.** Experience / inside / impact / lab / comparison are distinct. | all scroll shots |
| 11 | Deliberate mobile | No | **Largely.** Bottom switch, full-width scaler with stacked numbers, closing stack are good. Stage model is still small and labels collide; layer index clips; Lab schematic text is about 6 px. | `scroll/390-sunny-s01.png`, `-s03.png`, `-s07.png` |
| 12 | Understandable without reading | Partly | **Yes** on desktop in about 5 s (orange down = harvest, blue up = reject). The sunny scene has stray diagonal streaks that read as rain and weaken the "sun" cue. | `close/stage-sunny-2x.png` |

---

## 2. Prioritised defects

Severity: P0 = contradicts an explicit user demand or blocks credibility; P1 = visibly unfinished or inconsistent; P2 = polish.

### P0

| ID | Location | Problem | Concrete fix | Evidence |
|---|---|---|---|---|
| F3-01 | 01 and 02 stages (`src/viz3d/**` materials, lights, environment) | The user asked for "truly realistic, convincing 3D". The model has a correct anatomy (frame, cell grid, rails, hoses, copper stubs) but: the glass shows no sky reflection or specular glint, the cells are a murky brown-grey at about 15% value contrast, the whole stage is lit brown, and the module floats over an empty dark floor (no roof surface, no scale cue). Shadows exist but nothing reflects. It reads as a clean diagram of a panel, not hardware. | (a) Add a small studio HDRI/`Environment` (soft box strip) so the glass gets one long diagonal highlight that moves with orbit; clearcoat on glass plus a faint blue-black cell with visible silver busbars/fingers; anisotropic or brushed-metal frame highlight. (b) Neutralise the key light (warm-white, not brown fog), raise cell brightness. (c) Give the module a base: a short section of roof (corrugated tray or concrete slab) with the contact shadow and a rim of light, so scale reads. (d) Keep it graphite but with a real horizon gradient. | `close/stage-sunny-2x.png`, `close/stage-rainy-2x.png`, `1440-sunny-pengalaman.png` |
| F3-02 | Sunny scene effects (`src/viz3d/effects/**`) | Sun is encoded as 12 oversized orange arrows plus 8 pale diagonal streaks in the upper-left. The streaks look exactly like rain in a sunny scene (and stop abruptly at the canvas top), so "Cerah" shows rain-like marks and arrows overlap randomly (different sizes, some tiny and some larger than the cells). The product's core message is the sun-to-liquid path and it is the least refined thing on screen. | Replace the streaks with 3-4 broad soft light shafts (additive, low alpha, ending inside the canvas) or a lens-sun glare at the light's origin; make arrows a consistent size family on a regular grid with fade-in along the path, thinner shafts, smaller heads, and keep them at most one third of panel width. Rain stays neutral grey as it is now (good). | `close/stage-sunny-2x.png` (x 640-1100) |

### P1

| ID | Location | Problem | Concrete fix | Evidence |
|---|---|---|---|---|
| F3-03 | Section order, 01 (`src/sections/Hero.tsx`/`App.tsx`) | The 01 head ("01 Pengalaman / Satu panel. Dua arah panas. / Ganti cuacanya...") comes after the stage, after the caption and a "Detail" accordion, then about 200 px of empty paper. The instruction "Ganti cuacanya" arrives after the user has already passed the control; the section number lands below its content. | Either move the head above the stage (the stage then peeks under the opening) or delete the 01 head and fold "Satu panel. Dua arah panas." into the stage strip. Remove the 200 px gap before 02. | `scroll/1440-sunny-s02.png`, `scroll/390-sunny-s02.png` |
| F3-04 | Display type, word spacing (`index.css` `display-xl/l`) | Computed: 88 px, tracking -3.08 px, wdth 92, word-spacing +1.76 px. Spaces collapse to roughly 0.17 em; in "memberi dua hal" the word gap is barely larger than the letter gap, and "yang sama" and "jadi listrik" run together. This is the exact "tight but word spaces intact" rule being missed. | `word-spacing: 0.07em` on display-xl and 0.05em on display-l (or tracking -0.028em at wdth 94). Re-check the three H2 lines in the 1440 shots. | `close/h1-zoom.png`, `1440-sunny-penutup.png`, `scroll/1440-sunny-s04.png` |
| F3-05 | Raw underscore labels (stage chips, Lab schematic, `src/viz3d/**`, `src/sections/lab/Schematic`) | `T_in 40,0 °C`, `T_out 45,0 °C`, `T sel`, `Panas ke cairan 687 W_th` show literal underscores in the most visible place on the page. The brief and design system say subscripts via `<sub>`; the rest of the page does this correctly. | Render `T<sub>in</sub>` as small-size offset text in the chip and in SVG `<tspan baseline-shift="sub" font-size="0.75em">`; or drop the symbol and say "Masuk 40,0 °C" / "Keluar 45,0 °C" (the copy deck's `annot.tin`). | `close/stage-sunny-2x.png`, `scroll/1440-sunny-s06.png` |
| F3-06 | Mobile 390/360 stage (`src/sections/hero/**`) | Panel is about 300 x 85 px in a 340 px high canvas; the T_in label sits on top of the T_out label and its leader dot strikes through "T_out 45,0 °C" (at 360 the same). About 60% of the stage is empty. | Mobile camera: portrait framing (rotate the default yaw about 35 degrees and dolly in until the panel is about 80% of width); stack the two chips left/right of the pipe ports or merge them into a single line below the stage ("Masuk 40,0 / Keluar 45,0 °C"). | `scroll/390-sunny-s01.png`, `360-rainy-pengalaman.png` |
| F3-07 | Mobile 02 layer index | The row "1 Sel PV & kaca  2 Pelat absorber  3 Saluran cair|" is clipped at the right edge without a scroll cue; layer 4 is never seen. | 2 x 2 grid (as specified in the copy deck), or a horizontally snapping row with a fade edge. | `scroll/390-sunny-s03.png` |
| F3-08 | H2 line breaks on small screens | "Satu panel. Dua / arah panas." breaks mid-phrase at 390 (the hand-set break is desktop-only and `balance` did not rescue it). | Wrap phrases in `white-space: nowrap` spans: `Satu panel.` / `Dua arah panas.` so each sentence is a unit. Same for "Atur kondisinya. / Baca hasilnya." (works only by luck at 390). | `scroll/390-sunny-s02.png` |
| F3-09 | Number typography in prose | The Dampak lead shows `1 . 530 W` (a mono face with a widened dot and gaps inside a 22 px sans line) and the scaler title `Bayangkan 10.000 atap.` uses mono digits inside a 24 px sans heading. The spec says editorial numbers are sans (tnum), mono only in instruments. Also `50 %` and `±7 %` use a space before the percent sign (spec: none). | Inline numbers in headings and leads: Instrument Sans `tabular-nums`; mono only for slider values and tables. Fix `formatWithUnit('%')` to a tight `50%`. | `close/dampak-card.png`, `scroll/1440-sunny-s04.png` |
| F3-10 | Copy voice (Jobs test) | Opening headline, closing headline, 02 and Dampak headline pass. The support layer fails: Opening lead "Bila ada loop hangat yang perlu didinginkan, arah panasnya bisa berbalik" (jargon "loop", conditional, 15 words; the deck had "Saat hujan, arah panasnya bisa berbalik"). Perbandingan verdict "Pada kondisi ini ada panas yang layak dipanen, sehingga PVT memberi manfaat termal yang tidak dimiliki PV konvensional." is a 20-word lab-report sentence under a label "Vonis dari angka". Dampak lead "Bila air masuk 40 °C dan ada yang memakainya..." and "Untuk pemanasan awal air (+/-45 °C)". Lab "Pita cairan ada di sisi keluar (amber): panel memanaskan cairan - panen panas". | Opening: "Listrik dan panas dari satu panel. Saat hujan, panasnya bisa berbalik arah." Verdict: "Hari ini ada panas untuk dipanen. SolarVein menangkapnya, PV biasa tidak." (the sentence is produced by `verdict.ts`; keep the logic, shorten the string). Dampak lead: three short sentences, one number each. Delete the Sankey caption (the colours say it). Rename accordion labels "Detail", "Lanjutan", "Rincian rekayasa", "Alasan vonis" to what is inside. | `1440-sunny-awal.png`, `scroll/1440-sunny-s09.png`, `-s04.png`, `-s08.png` |
| F3-11 | Perbandingan table (`src/sections/Comparison.tsx`) | A 450 px empty gutter separates row labels from numbers, so the eye cannot track a row; the three bars in "Listrik bersih" (273 / 280 / 280) and "Panas terpakai" (0 / 687 / 687) show that columns 2 and 3 are identical in the sunny state while the third column wears the "unggul" tag and the heaviest top rule. It looks like SolarVein is marketed above a result where it equals the cooled PV. | Put the numbers directly right of the labels (label column 40%, three columns 20% each) and draw the bar only where a column differs from the first (delta chips such as "+7 W", "+687 W"); mark "unggul" only on the metric where SolarVein is strictly higher than both, otherwise "setara". The honesty of the table is good; its layout hides it. | `1440-sunny-perbandingan.png`, `scroll/1440-sunny-s10.png` |
| F3-12 | Lab, mobile schematic and duplicate readouts | At 390 the SVG schematic scales to about 6 px labels ("Sel PV & kaca", "T_in"); a one-line readout ("Cerah 284 We +687 Wth") sits right under it and the full Mode/Arah/Listrik/Panas readouts repeat a screen later. | Mobile: render the schematic with a taller viewBox (labels at least 11 px effective) or hide labels and keep three callouts; delete the one-line readout. | `scroll/390-sunny-s07.png`, `-s09.png` |

### P2

| ID | Location | Problem | Fix | Evidence |
|---|---|---|---|---|
| F3-13 | Stage strip under the 3D canvas (1440) | 190 px strip with content in the upper half only; two of three readouts are 284 and 687; empty bottom third and right third. Regime text sits at far left, 400 px from the readouts. | Reduce strip height to about 120 px and align the three blocks on the same 12-col lines as the headings above; or float the readouts over the canvas bottom. | `scroll/1440-sunny-s01.png` |
| F3-14 | Opening details | The bright blurred sun disc at top-left reads as a smudge, not a sun; the caption is right-aligned, two lines, with an orphan "Nuno Marques, Unsplash." mid-photo; the stage peek is only about 60 px so the first viewport has no hint of interactivity except the toolbar. | Shift `object-position` so the sun sits under the nav or crop it out; one-line caption at the bottom-right, nowrap; raise the stage peek to 100 px. | `1440-sunny-awal.png` |
| F3-15 | Photo quality and cohesion | Closing (Jakarta dusk) and Dampak (Jakarta Selatan) photos are visibly soft/upscaled at 1440; the golden sky in the opening and closing is nice, the Dampak photo is grey-brown and the Lab strip is a busy red-brown pipe room. Three different colour temperatures in four bands. | Serve the 2400 px variant for the two full-bleed bands at 1440+; give the Dampak and Lab photos the same warm grade as the golden ones (or desaturate both to one family). | `scroll/1440-sunny-s11.png`, `-s04.png`, `-s06.png` |
| F3-16 | Dampak card on photo | The milky `paper-glass` shows blotches of the photo through the top 120 px and then flips to flat paper below the photo edge (hard seam at about y = 435 in `1440-sunny-dampak.png`): muddy rather than glass. The three 72 px numbers are a symmetric three-up row (acceptable as data). | Raise glass opacity to 0.96 or make the card solid with a stronger shadow; keep the photo edge hidden behind the card. | `close/dampak-card.png` |
| F3-17 | Lab layout | Sticky schematic is flat cream with a large empty tail under its readouts (left column about 160 px blank at y 590-780); Sankey's left "Radiasi surya" block is a 450 px light-grey slab with no information. | Pin the readout set to the schematic bottom, or enlarge the schematic; narrow the Sankey input node or rescale the diagram so the flows dominate. | `scroll/1440-sunny-s07.png`, `-s08.png` |
| F3-18 | Disclosures | About ten accordion rows (Detail, Lanjutan, Pembacaan dan grafik, Lihat sebagai tabel, Rincian rekayasa, Apa yang belum dihitung, El Nino, Faktor emisi, Dari mana angkanya, Alasan vonis, Konversi...). Triggers are `h3` at 400 weight, which also floods the heading outline. Two idioms (hairline rows vs underlined "Tampilkan semua baris"). | Merge Dampak's four into two; use buttons not `h3`; one idiom. | `scroll/1440-sunny-s05.png`, `-s10.png` |
| F3-19 | Motion | Frames at 150/650 ms: the thumb is done at 150 ms, arrows and readouts are essentially final by 650 ms (spec 700-1200 ms), the rain is full intensity by 650 ms and T_in snaps 40,0 to 45,0 (no tween). | Stretch the weather interpolation to about 1.0 s with a stagger (sky, then irradiance, then rain, then arrows) and tween the T_in label. | `close/switch-150ms.png`, `close/switch-650ms.png` |
| F3-20 | Footer | Light footer under a dark closing photo (the deck specified graphite). The photo meets the paper with a hard edge. | Graphite footer or a 120 px fade to paper; the one-line disclaimer is good. | `scroll/1440-sunny-s12.png` |

What is good and should not be touched: opening and closing headlines and layout, the unmasked left-aligned hand-set display type, the Dampak composition and its honest 50% heat-load assumption, the comparison honesty ("Terbatas di"), the Lab control card, the neutral grey rain with blue rejection arrows, the sliding segmented thumb, no overflow at any width.

---

## 3. Per-section verdict

| Section | Verdict | Why |
|---|---|---|
| Opening | **Strong, small fixes** | Real photo, 88 px headline, scrim legible, clear CTA pair. Tight word spaces (F3-04), smudge sun and orphan caption (F3-14), jargon lead (F3-10). |
| 01 Pengalaman | **Good bones, weakest 3D** | Switch, readouts and annotation are clear; the model is dim and floating (F3-01), sunny scene has rain-like streaks (F3-02), head placed after the stage (F3-03), underscore labels (F3-05), mobile framing (F3-06). |
| 02 Di dalam | **Strongest 3D moment** | The exploded stack with numbered leader labels is the most convincing view; same material limits as 01; mobile index clips (F3-07). |
| Dampak | **Best section** | Image-led, specific numbers with assumptions, floating card. Fix number fonts (F3-09), glass seam (F3-16), lead copy (F3-10), photo grade (F3-15). |
| 03 Lab | **Calm and credible, a little stiff** | Photo strip then instrument works. Sticky schematic good on desktop; empty areas, Sankey slab (F3-17); mobile schematic unreadable (F3-12). |
| 04 Perbandingan | **Honest but the stiffest** | Table layout hides the point (F3-11); verdict string is report-speak (F3-10). |
| Penutup | **Strong** | Bookends the opening ("Dua manfaat"), honest line "diuji, dihitung, dan dibantah". Soft photo, light footer (F3-15, F3-20). |
| Header / Footer | **Good** | Transparent-to-paper header with a sliding underline, one CTA; footer disclaimer concise; two small links are fine. |

---

## 4. Explicit answers

**Designed product from a real startup, or a generated template?** A designed product, about 75% of the way. The tells of the first audit are gone: no cards everywhere, no neon, no eyebrow caps or pills, real photography, one sans plus mono, left-aligned asymmetric layout. What still says "generated" is the repeated section-head pattern (hairline, numeral, 56 px H2, grey line, empty right half), the stage's orange-on-brown "dev-tool demo" look, and verdict/lab copy that reads like output. A design lead would say "good landing page, 3D not at the same level as the photography".

**Is it too stiff?** No longer at the edges: the opening, Dampak and closing are confident and warm. The stiffness lives in the middle (Perbandingan table and verdict, Lab captions, ten accordions, dead air after the 01 stage). Loosening is copy and layout work, not a new look.

**Does it convey "this could change the world" honestly?** Honestly, yes; with force, only partly. Every claim carries its assumption (50% heat-load, "bukan prediksi", "dibantah"), which is a credibility strength. The ambition lands once (Dampak: "Hampir seperlima jadi listrik. Hampir separuh jadi air hangat." plus 10.000 atap) and is absent from the opening and the closing, which are modest ("dua hal", "dua manfaat"). Move one scaler number (for example the 4.934 ton, labelled scenario) into the closing line or the opening lead, and make the 3D look like hardware (F3-01), and the story becomes believable and big at the same time.

---

# Pass 5 (final round) - re-critique of the rebuilt site

Evidence: `docs/audit/critic-pass5/` (visual-qa shots 1440/1280/768/390/360 sunny+rainy with sections), `critic-pass5/scroll/` (1440 and 390 scroll-through), `critic-pass5/close/` (2x stage sunny/rainy, h1 zoom, switch frames 150-1600 ms, 02 inspect default/selected/section-cut). All cited images were read. Real GPU (ANGLE/D3D11). No console errors, no horizontal overflow at any width, no broken text.

## Status of the Pass-3 items

| ID | Status | Note |
|---|---|---|
| F3-01 3D realism | **Mostly fixed** | Concrete roof slab, rails with sun shadow, near-black blue cells with silver busbars, soft sky reflection on the glass, neutral light. It now reads as a product render on a roof, not a diagram. Remaining: reflection is faceted blobs, sunny scene is flat grey (N3, N4). `close/stage-sunny-2x.png` |
| F3-02 sun streaks / arrows | **Fixed** | No diagonal streaks; equal-size arrow grid, orange down (sunny) and blue up (rainy) read at once. Shafts/glint are not visible at the default camera. `close/stage-rainy-2x.png` |
| F3-03 01 head after stage | **Mostly fixed** | Head, lead and stage are in the right order. About 180 px of dead paper and a half-width "Detail" accordion remain before 02. `scroll/1440-sunny-s02.png` |
| F3-04 display word spacing | **Fixed** | "memberi dua hal" and "Atap yang sama" breathe. `close/h1-zoom.png`, `scroll/1440-sunny-s12.png` |
| F3-05 raw underscores | **Partly** | Stage chips ("Masuk/Keluar") and the Lab schematic are clean. Lab slider label still says "Suhu cairan masuk (T_in)". `scroll/1440-sunny-s06.png` |
| F3-06 mobile stage | **Mostly fixed** | Panel is larger, labels clamped top-left, no collisions. The "Keluar 45,0 °C" unit is low contrast. `scroll/390-sunny-s01.png` |
| F3-07 layer index clip | **Fixed** | 2 x 2 grid. `scroll/390-sunny-s03.png` |
| F3-08 H2 breaks | **Fixed** | "Satu panel. / Dua arah panas." holds at 390 and 1440. |
| F3-09 mono digits in prose | **Fixed** | "Bayangkan 10.000 atap." and the lead are sans; "50%" is tight. `scroll/1440-sunny-s04.png` |
| F3-10 copy voice | **Mostly fixed** | Opening lead, verdict ("Ada panas untuk dipanen. PVT menangkapnya, PV konvensional tidak.") and Dampak lead are short and concrete. One new muddled line (N6). |
| F3-11 comparison table | **Partly** | Gutter tightened and ties read "setara". The table is only about 900 px wide and left-aligned, so its right 400 px is empty and it no longer shares the 1280 grid with the lists below it. `scroll/1440-sunny-s09.png` |
| F3-12 mobile Lab | **Fixed** | Compact schematic with readable labels, no duplicated readout. `scroll/390-sunny-s07.png` |
| F3-13 stage strip | **Partly** | Shorter and aligned; the right third is still empty. |
| F3-14 opening details | **Partly** | Caption is one tidy block at the left; the sun is still a blue-grey smudge at top-left; the stage peek is gone, so the first viewport has no cue that an interactive model sits below. `scroll/1440-sunny-s00.png` |
| F3-15 photo quality/grade | **Not fixed** | Closing and Dampak photos are still soft, three colour temperatures remain; the closing is now over-scrimmed (N5). |
| F3-16 Dampak card | **Fixed** | Solid card, no seam. |
| F3-17 Lab layout | **Not fixed** | Empty area under the sticky readouts and the grey Sankey slab remain. `scroll/1440-sunny-s07.png` |
| F3-18 disclosures | **Partly** | Better labels ("Parameter lain", "Mengapa hasilnya begini"); still about ten rows. |
| F3-19 motion | **Partly** | Label values now tween smoothly (40,0 to 44,6 to 45,0), but arrows and rain are essentially final by 650 ms. `close/switch-150ms.png`, `close/switch-650ms.png` |
| F3-20 footer | **Not fixed** | Light footer, hard photo edge. |

## New defects

| ID | Sev | Location | Problem | Fix | Evidence |
|---|---|---|---|---|---|
| N1 | P1 | Perbandingan row "Listrik pendingin yang digantikan" | Shows "pembanding COP 30,0"; Pass 3 showed "COP 3,5". Looks like a factor-10 formatting or input bug in front of an engineering audience. Needs the Physics Reviewer. | Verify against the `src/sim` default COP (3,5) and the formatter. | `scroll/1440-sunny-s09.png` (row "Listrik pendingin", y 817) |
| N2 | P1 | 02 "Potongan" (section cut) | The cut is visibly broken: layers are sliced diagonally, the selected layer's anchor dot floats in empty space away from the geometry, and a ghost outline of the slab remains. The default and selected exploded views are fine (selecting isolates the copper coil and expands a short caption). | Re-anchor annotations to the cut geometry, or hide the toggle until fixed. | `close/inspect-section.png` vs `close/inspect-selected.png` |
| N3 | P2 | Stage labels on concrete | "Keluar 45,0 °C" is grey on grey; the unit is nearly invisible (also at 390). | Dark label plate (stage-0 at 70%) behind the chips, or lighter ink. | `close/stage-sunny-2x.png` |
| N4 | P2 | Sunny scene | The glass reflection is a few hard-edged polygon blobs and the scene is neutral grey, so Cerah vs Hujan differ mainly by arrow colour and rain; the warm sun of the opening photo does not carry into the stage. | Smooth the sky texture, add a warm key and one soft shaft or glint at the default camera. | `close/stage-sunny-2x.png` |
| N5 | P2 | Closing | Scrim is so heavy that the golden sunset and skyline are lost (brown-black). The ambition line "Bayangkan ribuan atap kota memanen listrik dan panas dari matahari yang sama." is good. | Lighten the scrim outside the lower-left text zone. | `scroll/1440-sunny-s12.png` |
| N6 | P2 | Dampak middle note | "Sebagian besar listrik ini juga dihasilkan PV biasa. Selisihnya: −338 MWh, lebih rendah karena pompa dan jam tanpa beban." is muddled. | One plain sentence with both numbers from the sim. | `scroll/1440-sunny-s04.png` |

## The 12 answers, updated (Before -> Pass 3 -> Pass 5)

1. Designed vs template: No -> mostly -> **Yes, a designed product** (minor tells left).
2. Focal point: partly -> yes -> **Yes** in every band; Lab and Perbandingan still lack a hero element.
3. Too many cards: yes -> no -> **No**.
4. Intentional whitespace: no -> partly -> **Mostly**; dead zones remain before 02, under the Lab readouts, right of the comparison table.
5. Verbose text: yes -> better -> **Acceptable**; about ten accordions are the last bulk.
6. Accent overuse: yes -> no -> **No**.
7. Icon/type consistency: mostly no -> mostly yes -> **Yes**, one raw `T_in` left.
8. Believable 3D: not yet -> better -> **Credible**; a CG product on a roof, short of photographic (N3, N4).
9. Micro-interactions: cannot confirm -> adequate -> **Good**: sliding thumb, smooth label tween, layer isolate and caption expand; scene settles fast (F3-19).
10. Each section adds info: no -> yes -> **Yes**.
11. Deliberate mobile: no -> largely -> **Yes**.
12. Understandable without reading: partly -> yes -> **Yes** in about 5 s.

## Final verdict

**Does it look like a designed product from a real US climate-tech startup?** Yes, with caveats. It no longer looks AI-generated or stiff: photo-led bookends, hand-set tight display type, short human headlines, a solid Dampak card with honest assumptions, restrained colour. A design lead would still ask for a lighter closing scrim, a graphite footer, and for Lab and Perbandingan to use the full grid. It is not launch-grade until N1 (a COP of 30 shown to engineers) and N2 (broken section cut) are fixed.

**Is the 3D convincing next to the photography?** Much closer, not equal. The roof slab, blue cells and reflection make it a believable product render and the arrows are clear. Beside the golden opening photo it is cooler and flatter: faceted reflections and a grey scene with no visible sun. About 7 of 10; acceptable to ship once N1 and N2 are fixed.
