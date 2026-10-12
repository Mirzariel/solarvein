# SolarVein Liquid - QA pass 3 (adversarial, production preview)

Target: http://localhost:4173 (production build, served as-is, no rebuild). Browser: system Chrome, WebGL on the real GPU
(ANGLE / AMD Radeon 780M, Direct3D11). All FPS/rAF numbers are GPU, not SwiftShader. Widths 1440/1280/768/390/360.
Evidence folder: `docs/audit/qa-pass3/` (PNG + JSON). Scripts: scratchpad `*.mjs` (rapid, lab, threed, inspect, impact, dead, touch, kbd, nogl, charts, states).

## Release verdict: NOT PASS

One P1 (stage hint lies about zoom) blocks a PASS under the skill rule. Everything else is P2/P3. No P0.
No console errors, no page errors, no 4xx/failed requests, no horizontal overflow at any width, no NaN/undefined/Infinity,
no dead control found, font preload works. The P1 is a copy fix (and/or implement the promised gesture).

## Defect table

| ID | Sev | Location | Repro | Expected vs actual | Evidence |
|---|---|---|---|---|---|
| D-01 | **P1** | Hero stage hint `src/sections/Hero.tsx` ("Seret untuk memutar. Gulir untuk memperbesar." / "Geser ... Cubit untuk memperbesar.") | Desktop: mouse over the stage, plain wheel. Touch tablet 768: two-finger pinch. | Hint promises wheel zoom and pinch zoom. Actual: plain wheel scrolls the PAGE (scrollY 764 -> 1064, camera delta 0 px); only Ctrl/Cmd+wheel, the +/- buttons or keys zoom. Pinch is not implemented (CameraRig has no multi-pointer code; `touch-action: pan-y`), and below 1024 px there are no zoom buttons, so tablets cannot zoom at all. The hint also shows in the no-WebGL fallback where nothing can be dragged or zoomed. (Sr-only description is correct: "Tahan Ctrl sambil menggulir".) | `3d-hero.json` plainWheel / hintText; `nogl-1440-pengalaman-rainy.png`; `pinch.mjs` (768): hint "Cubit untuk memperbesar" |
| D-02 | P2 | `ui/SegmentedControl.tsx` (touch) + text links | `hasTouch` 390: measure targets | Expected >= 44 px. Segmented radios (Hero, Dampak, Lab preset/pump/Pita-Batang, Perbandingan) are 38 px high (track 48 px, buttons 38 px inside 4 px padding). Text links: header logo 68x20, "Lihat di dalamnya" 114x20, "Baca asumsi dan batasnya" 169x20 (no padded hit area). Switches and InfoTips are fine (hit area grown to >= 44). | `touch-390.json` targetsBelow44_rect / effectiveTargetFailuresBySection |
| D-03 | P2 | Stage T_in / T_out labels `viz3d/TempLabels.tsx`, widths <= 768 | Load at 390, 360 or 768 | T_out label text is overprinted by the T_in leader line and the T_in anchor dot lands on its "degC". Desktop fine. | `stage-390.png`, `stage-768.png`, `base/360-sunny-pengalaman.png` |
| D-04 | P2 | Hero statement vs live readouts during Cerah<->Hujan (`hero/Statement.tsx` debounce) | Click Hujan, sample every 40 ms | Headline must follow the live sign. Actual: readout says "Panas dibuang" (q = -15 ... -542 W, up-arrows) while the headline still reads "Panel memanen panas." for ~560 ms (t=8719 -> 9277 ms); reverse direction: q = +8 ... +687 W while headline reads "Panel membuang panas..." for ~600 ms. The 160 ms debounce never settles because the regime key flips several times. Transient physics contradiction. | `rapid.json` rawRain, rainToSun.series_q |
| D-05 | P2 | Weather transition values (`motion/weather.ts` staggered inputs) | Click Hujan / Cerah, sample cell, T_out | Task spec: readouts stay between the endpoints. Actual: P, G, W_e, T_in, q stay inside; **T_sel and T_out undershoot both endpoints** by up to 3.4 degC (Cerah->Hujan: T_out 45.0 -> 38.9 -> 42.3, T_sel 45.9 -> 38.5 -> 41.2; same on the way back). Cause: irradiance collapses before T_in rises (real simulate() states, by design). Needs a Motion/Physics decision; harmless if accepted, but not "between endpoints". | `rapid.json` sunToRain.over (worstOvershoot tout 3.4, cell 2.7), rainToSun.over |
| D-06 | P2 | Rapid Cerah<->Hujan x20 (100-150 ms) | 20 alternating clicks, sample statement | No "Pompa dimatikan manual" / forced-off advisory ever shown (checked in statement + advisory list at 40 ms): PASS. But the statement flashes `neg-small` and `not-beneficial` ("Pendinginan tidak menguntungkan pada kondisi ini.") mid-interruption although both end states are harvest/reject. Final state correct (matches last click; values equal steady state; hero + Lab + Dampak switches agree). | `rapid.json` rapid.statements = [harvest, neg-small, not-beneficial, reject]; `rapid2.mjs` output |
| D-07 | P2 | No-WebGL fallback (`viz3d/Schematic`) | Stub getContext -> null, 1440 and 390 | Fallback renders and stays interactive (mode switch, 4 part buttons, Lab sliders, no errors): PASS. Defects: (a) D-01 hint still shown; (b) at 390 the 02 schematic scales down to ~6 px labels (illegible); (c) at 1440 the 02 stage is a 560 px black box with a small diagram and a large empty area. | `nogl-390-di-dalam.png`, `nogl-1440-di-dalam.png`, `nogl-rm.json` |
| D-08 | P2 | Comparison verdict, Hujan scenario (`charts/verdict.ts`) for Physics Reviewer | Perbandingan -> Hujan | Headline "Manfaat bersih sekitar 10 W listrik" = avoided cooling 18.3 - pump 8.5 = 9.8 W. The table shows SolarVein net 30 W vs conventional 41 W because the warmer panel loses 2.5 W of PV; the like-for-like benefit is 30 + 18.3 - 41 = 7.3 W. Headline overstates by about a third (third reason bullet does state the -11 W). | `base/1440-rainy-perbandingan.png` |
| D-09 | P3 | Sun rays (`viz3d/effects/Sunlight.tsx`) | Cerah, any width | Seven grey dashed diagonal streaks at 900 W/m2 read as rain in a sunny scene (esp. 768 and 390). | `stage-1024.png`, `base/768-sunny-pengalaman.png` |
| D-10 | P3 | Layers menu (inspect stage) | Open Lapisan, uncheck some, click "Tampilkan semua" (becomes disabled), press Esc | Focus falls to `body`, Esc no longer closes the menu (closes on outside click only). | `3d-inspect.json` layers.closedByEsc=false, focusAfterEsc=null |
| D-11 | P3 | Dampak "Dari mana angkanya" table | Load share 0 % | "Listrik pompa -0,0 kWh" (minus sign on a rounded zero). | `impact-load0.png`, `impact-disclosures-open.png` |
| D-12 | P3 | Console (production) | Any load | 2x `THREE.Clock deprecated` and 2x ANGLE `X4122` shader warnings. No errors. | `inventory` run output / probe.mjs |
| D-13 | P3 | 02 part list on phones (`inside/PartList.tsx`) | 390 / 360 | Row scrolls sideways with hidden scrollbar; 3rd item cut at the edge, 4th ("Insulasi & rangka") invisible with no cue except the clipped third. | `base/390-sunny-di-dalam.png` |
| D-14 | P3 | Hero statement block on phones | 390 | 9.25 rem reserved height leaves a ~70 px blank band between a 1-2 line statement and the readouts. | `base/390-sunny-pengalaman.png` |
| D-15 | P3 | Stage labels under camera extremes | Ctrl+wheel to max zoom; drag fully down | T_out label clipped at the right stage edge when zoomed in; in top-down view it sits across the panel frame; inspect leaders cross when orbited. | `3d-zoom-in-max.png`, `3d-drag-down-extreme2.png`, `inspect-orbited.png` |
| D-16 | P3 | Spec deviation (info) | 1440x900 / 390x844 first viewport | CONTRACT: 3D collector fills the first viewport. Now the Opening photo is first; stage card shows only ~60 px at 1440x900 and starts below the fold at 390x844. Intentional per creative direction v2; flag for the lead. | `base/1440-sunny-hero.png`, `base/390-sunny-hero.png` |
| D-17 | note | Physics reviewer | Lab: Cerah, G = 0, T_in 10, pump on | Headline "Panel memanen panas. Panasnya siap dipakai." at 0 W/m2 (heat drawn from ambient air through the panel). Model-consistent but the wording suggests solar harvest. | `lab-extremes.json` combo "Cerah, G 0, T_in 10" |

## What was verified (and passed)

**Baseline sweep** (`base.json`, `rm.json`): 1440/1280/768/390/360 x sunny/rainy + sections + checks; reduced motion 1440/390. Zero console errors, zero overflow offenders (scrollWidth == viewport everywhere), 0 broken numbers. I opened and looked at the hero, 02, Dampak, Lab, Perbandingan, Penutup shots at 1440 (both states), 390 (hero, Pengalaman both states, 02, Dampak, Lab, Perbandingan, Penutup), 360, 768 and 1280 samples. Pixel diff vs `docs/audit/after/lead`: <= 2.7 % in any shot (only live 3D differences), i.e. no regression against the lead's last render. Versus `docs/audit/before` this is a full redesign: removed by design = Lab-manual mode, per-layer/flow/heat/electric toggles on the main stage, rotate buttons (keys remain), "Jalur panas" strip; all functions needed are reachable (layers/explode/section in 02, sliders in Lab).

**Rapid switching** (hero, 100-150 ms x20, then 2.5 s; Lab preset x49 incl. mid-transition slider edit + Setel ulang; pump radio x30; hot-source x30): final state always equals the last click; hero, Lab and Dampak readouts agree; 0 errors. (see D-04, D-05, D-06 for transition artefacts.)

**Slider extremes** (Lab, all 14 incl. "Lanjutan"; Dampak 4 + 3 assumption sliders): Home/End respond, values clamp, no NaN. Text fields: "abc" and "" revert, "1e9" clamps; "-5", "99999" clamp; "12,5" parsed (id-ID). Combos (all 19 in `lab-extremes.json`): hot source on + T_in 10/30/36 below panel -> verbatim "Pendinginan tidak menguntungkan pada kondisi ini." appears (statement) in Hujan and in Cerah with load off; load on + T_in 10 -> harvest; forced-on pump + T_in 10 -> advisory list contains the verbatim sentence; pump Mati -> "Pompa mati, panel stagnan 88,8-99,5 degC" + critical advisory; flow 10 L/min -> controller holds pump ("Pompa menunggu"). Heat arrows follow the sign (screenshots `state-*.png`). Stage reads "Kustom" after Lab edits; Cerah/Hujan restores the preset.

**Dampak scaler**: roofs log slider 1 -> 100.000 (12 stops, "Bayangkan N atap", all finite, linear in N), panels 1-20, hours 50-2000, heat share 0-100 % (0 % -> "Panas 0,00", CO2e "lebih banyak ... PV biasa lebih baik"), Cerah/Hujan, cooling toggle (Hujan: lebih banyak -> lebih sedikit), "Lihat asumsi dan batasnya" opens disclosure, 4 disclosures + 3 assumption sliders. Narrative numbers check: 284/1530 = "hampir seperlima", 687/1530 = "hampir separuh", remainder 559 W. 0 broken numbers (apart from D-11).

**Dead-control sweep** (1440 and 390; `dead-1440.json`, `dead-390.json`): all 13 in-page anchors (header 5 + logo + "Coba simulasinya" x2, "Lihat di dalamnya", "Buka Lab", "Kembali ke simulasi", "Baca asumsi dan batasnya", footer "Asumsi dan keterbatasan" - twice, second click with unchanged hash still opens Rincian) land the target at the right offset below the header; Kredit foto disclosure + 16 external links (https, target=_blank, rel noopener); 33 disclosures open and are not inert; 3 Lab tabs (+ arrow/Home/End), Pita|Batang, Hari cerah|Hujan, "Lihat sebagai tabel" (flow + day tables), all 8 radio groups, 3 switches, 20 InfoTips (tooltip on focus, in viewport, Esc hides), chart hover tooltips, Perbandingan scenario (independent from hero), "Tampilkan semua baris", Setel ulang, skip link. Mobile menu (390): opens, 5 links 48 px, link navigates and closes, Esc closes and returns focus to the button.

**3D (hero, 1440)** `3d-hero.json`: drag orbit works with inertia (settles in <1.6 s); azimuth +/-55 deg and polar 30-78 deg bounds hold (no under-floor view, `3d-drag-*`); zoom range 0.69x - 1.64x via Ctrl+wheel and buttons (identical bounds); double-click and Reset View return to exactly the home pose in ~1.1 s with zero overshoot (monotone); mode change never moves the camera (delta 0 px at home and when orbited, both directions); keyboard (arrows, +, -, 0) works. **3D inspect (02)** `3d-inspect.json`: Urai (aria-pressed true->false->true, canvas changes), Potongan, Lapisan (6 layers, all hide/restore), zoom/reset/dblclick, 4 annotations by mouse, Enter and Space (label expands with one sentence + live value), toggle on second click, focus ring 2 px.

**Touch** (390 and 768 with `hasTouch`, CDP touch events): vertical swipe over the stage scrolls the page (225 of 240 px) and leaves the camera alone; horizontal swipe orbits (117 px label shift) without scrolling; diagonal swipe scrolls; tap on Reset, Hujan, menu OK; Lab slider thumb drag on touch works (900 -> 1160); Lab sticky schematic 247 px of 844 px, focused controls never hidden behind it (Tab-through at 390/768); no overflow at 360/390.

**Keyboard**: skip link works and is visible; Tab cycle (83 stops, wraps, no trap); every stop shows a focus ring (range inputs draw it on the thumb, verified in `keyboard-slider-focus.png`); segmented radios ArrowRight/Left/Home/End move and select (roving tabindex); sliders Arrow/PageUp/PageDown; switch Space/Enter; disclosure Enter/Space; stage group has arrow/+/-/0 keys.

**Reduced motion**: stage idle = 0 rAF in 2 s sunny and rainy at 1440 and 390 (normal motion 120 rAF/2 s = 60 fps; off-screen stage 0), no running animations/transitions, mode switch snaps (single sampled value, no intermediate). 02 settles to 0 rAF after ~3 s (18 frames while the explode snaps in). Static rainy/sunny poses still show direction (up blue arrows / down amber arrows): `rm-1440-rainy-stage.png`.

**Fonts / network**: `<link rel=preload>` for Instrument Sans latin is fetched once (initiator `link`, 57 kB, no duplicate fetch), IBM Plex Mono 400/500 latin loaded by CSS; no 404, no failed request, no "preloaded but not used" warning. Copy scan: all user-facing text is Indonesian (only "zoom"/panel/technical symbols).

## Not covered / limits
GPU only (no SwiftShader run, no low-end device); real iOS/Android devices not used (Chrome mobile emulation + CDP touch); screen-reader output not tested; I did not rebuild or restart anything.

---

# Pass 5 (final regression round)

Build: production preview http://localhost:4173 (new bundle `index-dyqfzXO5.js`). Same method, GPU (ANGLE D3D11, AMD 780M). Evidence in `docs/audit/qa-pass5/` (`base/`, `rm/`, `*.json`, PNGs). The scratchpad was shared with another agent; my pass-5 scripts live in `scratchpad/qa5/` (inspect, pinch, overlap, tips, negzero, cons, rm3).

## Release verdict: PASS (0 P0, 0 P1)

Every control exercised again (see list below), no console/page errors, no 4xx or failed requests, no overflow at 1440/1280/768/390/360 (sunny + rainy), no NaN/Infinity, reduced-motion 1440/390 clean. One new P2 (N-01) and a handful of P3 remain; none blocks release.

## Status of pass-3 defects

| ID | Status | Verification |
|---|---|---|
| D-01 (P1) stage hint | **Fixed** | Hint now "Seret untuk memutar · Ctrl + gulir untuk memperbesar" (mouse), "Geser satu jari untuk memutar · cubit untuk memperbesar" (touch). Plain wheel still scrolls the page (scrollY 748 -> 1048 -> 748, camera 0 px), Ctrl+wheel zooms 0.68x-1.65x, +/- identical. Two-finger pinch out/in zooms with no page scroll and no browser zoom (visualViewport.scale 1) at 768 and 390 (`pinch-768-*.png`, `pinch-390-*.png`). Zoom buttons now present at 768. Hint absent in the no-WebGL fallback. |
| D-02 segmented 44 px | **Fixed** | 390/360 touch: 0 failures in Pengalaman, 02, Dampak, Perbandingan, Penutup; Menu button 44, menu links 48. 21 InfoTips all hit-test 44x44 when in the clear (`qa5/tips.mjs`). (Lab tips under the sticky schematic are only a hit-test artefact of the sticky overlay.) |
| D-03 label collision | **Fixed** at 360/390 (stacked "Masuk / Keluar" pills), 1024, 1280, 1440; **but see N-01** |
| D-04 statement vs readout | **Improved, residual P3** | Lag fell from ~560-600 ms to ~310 ms (Cerah->Hujan: readout q crosses 0 at 6979 ms, headline flips at 7293 ms) and ~250 ms (Hujan->Cerah). Headline still reads the old regime for the first ~0.3 s once |q| is large (-91 ... -485 W). `qa-pass5/rapid.json` |
| D-05 undershoot | **Fixed** | worstOvershoot 0.0 for e, q, T_in, T_out, T_sel, G in both directions (was up to 3.4 degC). Rapid x20: 0.6 degC on T_out only. |
| D-06 flash during rapid | **Fixed (visible)** | Statement sequence in rapid x20 is now only harvest/reject, no neg-small / not-beneficial headline, no "Pompa dimatikan manual". The verbatim sentence was seen in one 40 ms sample inside the collapsed Detail advisory list (P3). Final state = last click, hero/Lab/Dampak agree (rapid2: 49 flips, mid-transition edit + Setel ulang). |
| D-07 no-WebGL | **Fixed** | 1440 and 390: fallback renders, mode switch, 4 part buttons, Lab slider work, 0 errors; 02 at 390 is a legible 2x2 list with a clear schematic; the stage hint is gone. |
| D-08 verdict wording | **Fixed** | Hujan headline "Manfaat bersihnya sekitar 8 W listrik"; body: "Setelah pompa (8,5 We) dan penurunan daya PV, manfaat bersihnya 7,8 We (dry cooler) atau 146,6 We (chiller)". Matches 30 + 18.3 - 41 = 7.3 within rounding of the displayed values (7,8 from unrounded model). |
| D-09 sun rays look like rain | **Fixed** (new rooftop scene has no streaks in Cerah) |
| D-10 Layers menu Esc | Open (P3): after "Tampilkan semua" focus drops to BODY, Esc no longer closes the menu |
| D-11 "-0,0" | Open (P3): still shown at Dampak, Cerah, load share 0 % |
| D-12 console warnings | Open (P3): 2x THREE.Clock deprecated + 1x ANGLE X4122 warning at load, no errors |
| D-13 part list off-screen | **Fixed** (2x2 grid at 390) |
| D-14 blank band under statement | **Fixed** (statement now sits directly above readouts at 390) |
| D-15 label clipping at extremes | Partial (P3): at max zoom-in "Keluar" is still cut at the right stage edge; in top-down view the label touches the panel frame (`3d-zoom-in-max.png`, `3d-drag-down-extreme2.png`) |
| D-16 first viewport | Unchanged (info): the first viewport is now the photo plus heading; the stage starts below the fold at 1440x900 and 390x844. Intentional per creative direction. |
| D-17 G = 0 wording | Unchanged (note): "Panel memanen panas. Panasnya siap dipakai." at 0 W/m2, T_in 10 |

## New defects

| ID | Sev | Location | Repro | Expected vs actual | Evidence |
|---|---|---|---|---|---|
| N-01 | P2 | Stage "Masuk" label vs zoom buttons, stage width ~700-900 px | Load at 700, 768, 820 or 900 px wide, desktop pointer or tablet | Label must not overlap controls. Actual: "Masuk 40,0 degC" pill is printed over the +/- (and at 700 the reset) buttons (overlap 11x8 to 34x24 px). 640, 1024, 1180 clean. | `qa-pass5/pinch-768-0.png`, `stage-768.png`, `qa5/overlap.mjs` output |
| N-02 | P3 | Stage T_in/T_out labels, contrast | 1440 home view, rainy and sunny | Small grey mono label text on mid-grey concrete is faint (especially on the lighter rooftop in Cerah and at 390). Not measured with a contrast tool in this pass. | `base/1440-rainy-pengalaman.png`, `base/390-sunny-pengalaman.png` |

## Re-run coverage (all exercised, all pass unless listed above)

- Baseline sweep: 1440/1280/768/390/360 x sunny/rainy, `--sections --checks`, plus reduced motion 1440/390 (`qa-pass5/base.json`, `rm.json`). The report's "non-responsive slider" list is the 11 sliders inside collapsed disclosures (inert), exercised properly in the next items.
- Rapid switching with 40 ms readout sampling (single transitions both ways, x20 at 100-150 ms), Lab preset x49, pump x30, hot source x30.
- Lab: all 14 sliders Home/End (incl. "Parameter lain", renamed from "Lanjutan"), text-field abuse, 19 combos including every not-beneficial case (hot source on + T_in 10/30/36; Cerah load off; forced-on pump) - the verbatim "Pendinginan tidak menguntungkan pada kondisi ini." appears, pump Mati stagnation and critical advisory, flow extremes. No NaN.
- Dampak scaler: roofs 1 -> 100.000, panels, hours, heat share 0-100 %, scenario, cooling toggle, assumptions + disclosures, typed values. All finite.
- Dead-control sweep 1440 and 390: 13 anchors, footer anchor twice, Kredit foto, all disclosures, 3 tabs + keys, Pita|Batang, all radio groups, 3 switches, 20 InfoTips, annotations 1-4 by mouse/Enter/Space, Urai/Potongan/Lapisan/zoom/reset, header + mobile menu (open, navigate, Esc, focus return). ("Lihat sebagai tabel" check in the sweep script is a script artefact; verified open with 17 rows at 360 and 390 by touch.mjs and charts.mjs; Satu hari chart hover tooltips and Hari cerah/hujan work.)
- 3D hero: drag orbit + inertia, bounds (az +/-55, polar 30-78), double-click and Reset (home pose delta 0), mode change keeps camera (delta 0), keyboard arrows/+/-/0, Ctrl+wheel, pinch. 3D inspect: toggles, layers, orbit, reset, annotation focus.
- Touch 390/360: vertical swipe scrolls the page (225 px), horizontal swipe orbits without scrolling, diagonal scrolls, slider thumb drag, Reset/mode taps, no overflow.
- Keyboard: skip link, 83-stop Tab cycle with focus rings, segmented arrows/Home/End, sliders, switch, disclosure, no sticky-covered focus at 390/768.
- Reduced motion: 0 rAF at idle after settle (hero 14 frames in the first 1.5 s then 0; 02 same), mode switch snaps.
- Console/network: no errors, no 4xx/failed requests, font preload fetched once. Copy scan: Indonesian only.
