# 10 - Physics review of the rebuilt visuals and copy (Agent G, pass 3)

Scope: weather engine (`src/motion/**`), effects (`src/viz3d/effects/**`, `LiquidFlow`, `TempLabels`, `Schematic`), rendered copy and numbers against `simulate()`.
Evidence: `src/sim/review/visuals-pass3.test.ts` (new, 5 tests, `AUDIT_PRINT=1 npx vitest run src/sim/review/visuals-pass3.test.ts --disableConsoleIntercept` prints the frame table), `visual-coupling.sh`, Playwright on the production preview (Chrome, d3d11, 1440x900; scripts `g3-*.mjs` in the scratchpad), screenshots in the scratchpad `g3/`.
State: `npx vitest run` = 12 files passed, 0 failed; `npx tsc -b --noEmit` clean. I edited nothing in `src/` except the new test file.

## 0. Verdict

No P0. Engine and effects are physically honest: every intermediate frame is a computed state, direction follows sign(q), the pump hold adds no energy. Four P1 items remain, all in copy and ledger arithmetic (not in the sim): they overstate or hide small numbers on a page whose selling point is honesty. Sign-off for the engine/effects is granted below; sign-off for the copy and numbers is conditional on P1-1 to P1-4.

## 1. Weather engine

Method: sampled `inputsAt(plan, p)` + `simulate()` at 100 and 5000 steps for Cerah to Hujan and back; and sampled the rendered DOM every 20 ms (readouts, `data-statement`) during real transitions.

- Every frame is `simulate(visualInputs)`; energy-balance residual max 8.7e-8 W; no NaN; T_out - T_in has the sign of q and mass flow > 0 in all frames; exactly one sign change of q per transition; maximum cell temperature 45.9 C (stagnation would be 74.6 C), so the hold does prevent a fake overheating spike.
- Zero crossing: S>R at p* = 0.377 (1.2 s, so about 450 ms), R>S at p* = 0.623. The valuation flags switch inside the regime `negligible` band (|q| < 20 W, p 0.3686 to 0.3848, about 20 ms), so the flip is never visible as a mislabelled state: harvest (+19.8 W) then negligible then reject (-20.0 W).
- Pump hold: in 132 of 5000 frames (about 2.6 %, about 30 ms) the auto controller would have the pump OFF. In those frames the held state has net electricity lower than the auto state by up to 2.95 W (pump power outweighs the cooler-cell gain), never higher (test asserts it over 2 x 2001 frames). So no hidden gain. The held state is real (pump on, pump power charged), and the readouts say so ("Daya pompa"). Presentation is defensible.
- Rejection frames with net benefit < 0 (`PUMP_EXCEEDS_BENEFIT`) occur for about 1 frame after the crossing, because the COP is interpolated 3,5 to 30 along the way (see P2-3). Not visible after the statement debounce.
- Rendered check (S>R, DOM at 20 ms): Listrik 284, 281, 264, 225, 172, 126, 86, 57, 42, 39 W_e; Panas ke cairan 687, 679, 623, 496, 314, 154, 4 ("Belum sepadan"), then "Panas dibuang" 118, 205, 294 ... 550 W with the hint changing at the same sample. R>S mirrors. Arrows in screenshots flip amber-down to cyan-up in the same frame the readout flips (mont: frame 1 shows 498 W dibuang, cyan up arrows, rain already present).

## 2. Effects

| Element | Finding |
|---|---|
| Stack arrows (`targets.ts`) | dir from sign(qLiquidW) with pump on and abs(q) > 12 W; amplitude log-scaled and smoothstep 8..36 W so it fades through zero; the latch flips only when amplitude < 0.02 (about 100 to 140 ms after the sign change, a lag not a lead). Valuation flags only dim (x0.5). Correct. |
| Env (front-loss) arrows | from qFrontLossW + qRainW > 3 W only, never when the panel is cooler than ambient; tone cyan only while the liquid rejects. Correct. |
| Liquid | u parametrised by arc length, monotone inlet to outlet, wrap at scale 0, pump off eases speed and alpha to 0. Colour = ramp(T_in to T_out with the sim NTU profile), warm inlet to cooler outlet in rejection (screenshots: rainy inlet stub amber-brown, outlet grey; sunny the reverse). Correct. |
| Colour exaggeration | x4 about the loop mean, disclosed twice ("skala warna diperbesar" under the stage, "warna diperkuat" in the legend). Acceptable. |
| Electrical pulses | rate 0.10 + 0.45 x P_e/300 (floor, saturates at 300 W), brightness likewise; zero below 0.5 W. Monotone in P_e, not strictly proportional. P2-5. |
| Rain / sun | rain count from rain mm/h only; sun rays from G only; neither touches arrows. Correct. Sun rays and rain streaks look similar at a glance (P2-2). |
| Schematic (Lab) | direction from sign(q), front arrows from sign, uses the committed result (snaps, below the fold). Correct. |
| `visual-coupling.sh` | mode reads only in segmented controls, labels and DayHistory initial tab; no `regime`/`pumpOn` read in 3D effects. Clean. |

## 3. Copy and numbers (rendered page vs simulate)

Verified equal to `simulate()` / 08: hero sunny 284 W_e, 687 W_th, 40,0 to 45,0 C, 45,9 C; rainy 38 W_e, 550 W, 45,0 to 42,3 C, 41,2 C; Dampak at f = 50 %: 19,2 GWh_th, 14,9 GWh_e, 4.934 t CO2e (08 quoted about 4.930; rounding), 373 kWh / 481 kWh / 123 kg per panel, 44 kg LPG; "hampir seperlima" (18,5 %) and "hampir separuh" (44,9 %) are chosen by `share()` from the computed fractions; 559 W "sisanya"; payback 1,5 y (180/123,4); dry-cooler net about 10 W (see P1-3); Lab energy bands sum to 1.530 W; conventional PV wins when load and source are both off (verified in the page: verdict "panel PV konvensional adalah pilihan yang lebih baik", badge on PV biasa; sunny no-load 253 W vs 273 W, 74,6 vs 56,1 C).

Hero sign decision: keep the unsigned magnitude in the hero ("Panas dibuang 550 W_th" with up arrow, cool tint, hint "Pembuangan panas"). The label itself flips with the sign and carries the direction, so "-550" under "dibuang" would be a double negative for a lay reader; the spoken label is explicit; the convention appears signed (+687 / -550, "panen"/"buang") in the Lab strip and in "Konvensi tanda dan satuan". Condition: do not show a bare unsigned thermal number without a direction word anywhere else (none found).

Dry cooler vs chiller: correct and consistent on the page (Lab help 20-40 vs 3-4, Rincian rekayasa text, Comparison shows 18,3 W_e dry cooler vs 157,2 W_e chiller, Scaler toggle "Dry cooler, COP 30").

Startup voice: no overclaim found. grep of `src/` finds no "dunia", "mengubah dunia", "revolusi", "terobosan", "gratis", "selamatkan". Opening lead conditions the reversal ("Bila ada loop hangat..."); Dampak is labelled "Perkiraan kasar dari simulasi, bukan prediksi"; closing says "masih sebuah simulasi ... dibantah". Only wording nits (P2-6).

## 4. Prioritised list

### P1

1. **Dampak ledger row does not add up.** `src/sections/impact/Details.tsx` `ImpactLedger`: `elecDiffKg = (p.dual.electricalW - p.conv.electricalW) * h * grid` ignores the load fraction (it is the f = 100 % value, +12,2 kg). Rows 12,2 + 130,1 + 0 - 1,8 = 140,5 but "Total" shows +123,4. Correct row is -4,9 kg (the no-load hours lose 19,8 W). It also hides the no-load penalty the disclosure above it describes. Fix: `const elecDiffKg = (p.kWhElectricGross - p.conv.electricalW * h) * a.gridKgPerKWh;` (test: gross diff = -4,9 kg).
2. **Sign of the electricity difference hidden.** `src/sections/impact/Scaler.tsx` note of "Listrik per tahun": `Math.abs(e2.value)` prints "selisih 338 MWh" although SolarVein's net electricity is 338 MWh BELOW plain PV at the default (pump plus hot no-load hours). Fix: `Termasuk listrik yang juga dihasilkan PV biasa. Dibanding PV biasa: ${sign}${n} ${unit} (pompa dan jam tanpa beban).` with the real minus (MINUS) when negative.
3. **Rejection net benefit overstated by about 25 %.** `src/charts/verdict.ts` (headline "sekitar 10 W", reason "Manfaat bersih: +9,8 W") and `Details.tsx` ("sekitar 10 W listrik per panel") use `netCoolingBenefitW = avoided - pump` and omit the 2,1 W PV penalty. The same page's explicit conversion gives 48,3 - 40,5 = +7,8 W; 08 item 6 asked for 7,8. Fix: `net = dual.avoidedCoolingElecW + dual.netElectricalW - conv.netElectricalW` (headline "sekitar 8 W", reason "Manfaat bersih setelah pompa dan penurunan daya PV: +7,8 W"). Test `visuals-pass3.test.ts` pins 7,8 vs 9,8.
4. **"unggul" badge contradicts the verdict in the default state.** `src/sections/Comparison.tsx` `winnerOf` uses `>=` for the harvest tie, so in Cerah the SolarVein column gets "unggul" although PV + pendingin cairan is identical (687 W_th, 280,4 W_e), and the same card says "Mode ganda tidak dianggap unggul secara bawaan" and "setara dengan PVT hanya-panen". Fix: when both PVT columns differ by less than EPS, badge both columns "unggul" (or "setara"), never only the dual-mode one.

### P2

1. Statement lags the readout: debounce 160 ms plus a 220/140 ms cross-fade. Measured: readout "Panas dibuang" at 710 ms while statement "Panel memanen panas." stays until about 890 ms; the two sentences overlap and read garbled for about 150 ms (mont frame 1). Brief and inside a 1,2 s transition; shorten the hold to 80 ms or make the fade a pure opacity swap without overlap.
2. Sun rays (pale slanted dashes, 31 degrees) look like rain streaks in Cerah. Tint them warmer (`#FFE2B0`) or fewer; they are real G cues, not rain.
3. `presets.ts` SUNNY `coolingCOP: 3.5` vs RAINY 30. A user who starts from Cerah and turns on a hot source (e.g. T_in 80 C) gets rejection valued with a chiller (32 W_e avoided, +29 W net) and the Comparison row says "pembanding COP 3,5". Set both presets to 30 (physics sign-off given: default only). Also removes the COP interpolation in the transition.
4. Lab assumption text mixes decimal point and comma ("τα = 0.88", "ε = 0.9", "grid 0.8", "1400 jam"). Use id-ID formatting.
5. Electrical pulses are monotone in P_e, not proportional (floor 0,10, saturates at 300 W). Wording only: do not claim "proportional" in docs.
6. "Atap yang sama. Dua manfaat." and "Ambil keduanya." read as unconditional; the second benefit needs a heat load and the electricity is plain PV's. Optional: "Dua kegunaan." (uses, not benefits). Dampak h2 "jadi air hangat" is conditioned only by the lead below it.
7. Inside annotation "Rugi belakang N W_th" can be negative when the panel is below ambient; label "Panas lewat belakang" or show the sign with the convention.
8. Hero detail for the no-load idle case ("Pompa mati. Tak ada yang perlu dipanen") omits the stagnation penalty (74,6 C, -20 W_e); Comparison states it. Add "Panel stagnan 74,6 C" to the detail line.
9. Stage `aria-label` (CollectorStage:148) uses the committed result, so it announces the end state at once while visuals animate; acceptable, note only.

## 5. Sign-off

Weather engine, pump hold, arrows, liquid, pulses, Schematic: **signed off** (no P0/P1). Copy and Dampak/Comparison numbers: **not yet** - sign-off follows P1-1 to P1-4 (about 15 lines in `Details.tsx`, `Scaler.tsx`, `verdict.ts`, `Comparison.tsx`; no change to `src/sim`). After those, nothing P0/P1 remains.

## 6. Pass 4 (re-verification of the fixes)

Evidence: `npx vitest run` 126 passed / 0 failed, `tsc` clean, `visuals-pass3.test.ts` still green on the new windows (1,10 s transition, p* 0,372 / 0,628, residual 8e-8 W, one sign change, max cell 45,9 C, held-pump net electricity never above the controller's), `visual-coupling.sh` clean, Playwright DOM sampling (20 ms) and screenshots on the production preview.

- **P1-1 ledger:** rendered rows -4,9 / +130,1 / 0,0 / -1,8, Total +123,4 (sums exactly). Fixed.
- **P1-2 electricity note:** "Selisihnya: -338 MWh, lebih rendah karena pompa dan jam tanpa beban." Fixed.
- **P1-3 net rejection:** verdict, Dampak limits ("sekitar 8 W") and Comparison all show +7,8 W (dry cooler) / 146,6 W (chiller), after pump and PV penalty. Fixed.
- **P1-4 tie badge:** Cerah default now shows "setara"; "unggul" only in Hujan (single winner). Fixed.
- **P2-3 COP:** both presets 30. Fixed. The only side effect is that 7 frames in a transition now show a computed reject state with net benefit < 0; harmless and not surfaced.
- **P2-1 statement sync:** statement key flips in the same 20 ms sample as the readout in both directions (S>R at 702 ms, R>S at 799 ms). Fixed.
- Arrows: direction still `sign(q)` (`targets.ts:56`), equal-size grid, screenshots: Cerah amber down + 687 W, Hujan cyan up + 550 W. Sun shafts and glint no longer read as rain.
- **Copy:** Closing "Bayangkan ribuan atap kota memanen listrik dan panas dari matahari yang sama." is a potential, not a promise ("Bayangkan", plural roofs matching the Scaler's 10.000, followed at once by "masih sebuah simulasi ... dibantah"). Acceptable. Opening lead "Bila ada air hangat yang perlu didinginkan, panasnya bisa berbalik arah" is correct in substance; optional precision (P2): "air proses yang hangat" (it is a loop returning at about 45 C, not hot water for use).

Open P2 only: Lab decimal-point mix, Inside "Rugi belakang" sign, no-load hero detail omits stagnation penalty, stage aria-label uses the committed result, sun/arrow wording nits above.

**Sign-off: nothing P0/P1 remains. Engine, effects, copy and numbers are signed off.**
