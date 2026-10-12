# 08 - Physics cross-review (Agent G, pass 2)

Scope: re-verification of the implementer's response to `03-physics.md`, sign-off on copy and impact numbers in `07-creative-direction-v2.md` (chapter A and E.4), remaining mode/regime-driven visuals.
Evidence: `src/sim/review/crossreview.test.ts` (new; 5 asserting tests + print block, `AUDIT_PRINT=1 npx vitest run src/sim/review/crossreview.test.ts --disableConsoleIntercept`), existing review tests, `visual-coupling.sh`, code reading of `src/sim`, `src/state`, `src/motion`, `src/viz3d/effects`, `src/sections`.
State at review time (2026-10-12 19:11): `npx vitest run` = 11 files passed, 112 tests passed, 0 failed, 0 `it.fails` left; `npx tsc -b --noEmit` clean. I edited nothing in `src/sim/*.ts`.

## 0. Verdict

The physics layer is now sound and honestly framed. No P0 remains in `src/sim`. All seven earlier P0/P1 items are fixed in code; four P2 items remain. The impact numbers in 07 chapter E are computed correctly from the sim **but the headline claim and the "every panel has a heat load all year" assumption are not honest enough to ship** (section 3). Fixes are copy plus one new input, not a model change.

## 1. Independent verification of the model changes

Method: I re-implemented the balance with a different unknown ordering (bisect on cell temperature T_p, nested bisection for the glass surface T_g, series conductance exactly as in `PHYSICS.md`) and compared over a 4 x 3 x 3 x 3 x 2 grid (G 0..1200, T_in 15..70, rain 0..60, wind 0..10, T_amb 15/32), pump forced on, both PVT and conventional.

- Agreement: max |dT_cell| < 0.05 K, max |dq_liquid|, |dP_e| < 0.05 W (test asserts it). So bisecting on T_g with explicit T_p = T_g + q_front/(A U_cg) is exact, not an approximation. The residual field is computed from returned values, so on its own it only proves bisection convergence (< 1e-6 W); the independent solver is the real check.
- Monotonicity (test): T_cell strictly increases with G (0..1200); q_liquid strictly decreases with T_in (10..80); rejection magnitude non-decreasing with rain (0..60). Unique root argument in PHYSICS.md holds (loss slope >= ~20 W/K/m2 versus beta*eta*G <= ~1 W/K/m2, dT_p/dT_g ~ 1.1).
- Sign and flow: existing grid test (sign(T_out - T_in) = sign(q), mass flow > 0 whenever pump on) passes.
- Presets (my numbers = PHYSICS.md section 7 = copy deck E.2):

| | Sunny | Rainy |
|---|---|---|
| regime | harvest | reject |
| T_cell / T_glass / stagnation | 45,9 / 44,9 / 74,6 C | 41,2 / 39,3 / 27,9 C |
| conventional PV cell | 56,1 C | 26,8 C |
| q_liquid | +686,9 W (eta_th 44,9 %) | -550,2 W (without rain -411,4 W) |
| P_e (PVT / conv) | 283,6 / 272,7 W | 38,5 / 40,5 W |
| pump | 3,2 W | 8,5 W |
| T_in -> T_out | 40 -> 45,0 C | 45 -> 42,3 C |
| net cooling benefit | n/a | +9,8 W_e (COP 30); +148,7 W_e if COP 3,5 |

- Energy shares sunny (G*A = 1530 W): electricity 18,5 %, liquid 44,9 %, optical loss 12,0 %, front+back loss 24,6 %.
- Sunny T_in sweep (q W / eta_th %): 30: 874/57; 40: 687/45; 50: 494/32; 60: 297/19; 70: 94/6; P_e falls 292,6 -> 256,9 W. T_in 40 C is a defensible DHW preheat return, and the PHYSICS note about 30 C being too flattering is correct.
- Cross-check of rain: eps 0,3 / 0,5 / 1,0 gives q = -485 / -550 / -692 W (-12 % / +26 %), as documented. Rain removed: -411 W. Rain contributes 139 W (25 %), wind + sky the rest. Because `qLiquidNoRainW` also restores the dry sky depression (6 K instead of 1 K), the 139 W is the net of the drop term and the cloud/sky change; with the sky held dry the drop term alone is 169 W (29 %). Both are "about a quarter"; the attribution is conservative. Acceptable; word it as "hujan (dan langit yang lebih tertutup)" if space allows.
- COP sensitivity (rainy): COP 3,5 / 10 / 20 / 30 / 40 / 60 -> avoided 157 / 55 / 27,5 / 18,3 / 13,8 / (pump idle) W_e; benefit after pump and PV penalty +147 / +45 / +17 / +7,8 / +3,2 / <0. At COP 60 the controller correctly refuses to run the pump.
- No heat load, sunny: pump off, T_cell 74,6 C (0,4 K under `STAGNATION_HOT`), P_e 252,9 W versus 272,7 W conventional (-19,8 W, -7,3 %). The insulated PVT is worse than plain PV when nobody uses the heat; the model reports it. Boiling advisory verified: G 1200, 35 C, calm, pump off -> 108,9 C -> `STAGNATION_BOILING` critical.
- No hot source, rainy: pump off, P_e 40,4 W versus 40,5 W conventional (equal within 0,1 W).

### Verdict per original item

| Item | Verdict | Evidence |
|---|---|---|
| P0-1 straw-man chiller baseline | **Fixed** | `INPUT_LIMITS.coolingCOP` 1..60; rainy preset COP 30; help text names dry cooler first; Comparison shows dry cooler and chiller side by side (`Comparison.tsx:149-151`, `CHILLER_COP`); Scaler toggle says "Dry cooler, COP 30" and defaults off. Residual P2: verdict headline "hanya SolarVein yang memberi manfaat" is true but the benefit is +7,8 W_e of 18,3 W gross (section 4, item 6). |
| P0-2 rain over-attributed | **Fixed** | `qLiquidNoRainW` (test equals independent no-rain run), Instrumentation line "Hujan menyumbang N W ... Sisanya angin dan pendinginan ke langit" (`Instrumentation.tsx:101`), eps 0,5 band 0,3-1,0, evaporation wording corrected in PHYSICS.md and `assumptions.ts:42`. Remaining copy hit: Opening lead (section 2). |
| P1-1 arrows gated by flags | **Fixed** | `targets.ts`: `stackDir` from sign(q) when pump on and |q| > flipMinW; `stackDim` carries valuation; `envTone` from sign. Review tests flipped to `it` and pass. |
| P1-2 transitions not real states | **Fixed** | `src/motion/weather.ts`: visual inputs interpolated, `result = simulate(visualInputs)` every step, pump held on across the zero crossing, flags switch at the computed q zero crossing, tests assert monotone q and endpoint exactness. Note for QA: during a preset switch the pump is forced on in the intermediate frames (a valid computed state, but not the controller's choice). |
| P1-3 U_cg missing from balance | **Fixed** | Series model in the balance, glass node = T_g, `coefficients.uCellGlass`; independent solver agrees. (My earlier -617 W estimate differs from -550 W only because eps and the drop temperature also changed.) |
| P1-4 glazed vs unglazed wording | **Fixed** (wording) | PHYSICS 2, `assumptions.ts:12,85`. The 80-85 % glazed estimate is carried over from my earlier solver, not re-derived on the new parameters; label it "audit estimate" (it already is). |
| P1-5 sunny T_in 30 C | **Fixed** | Preset T_in 40 C. The efficiency-versus-T_in table is in PHYSICS but I did not find a curve in the Lab UI (optional). |
| P1-6 rain / evaporation | **Fixed** | Wording and band as above. |
| P1-7 carbon gross / hours | **Fixed in sim, partly in UI** | `computeCarbon(r,a,baseline)` verified: incremental = heat credit + (P_e,sv - pump - P_e,conv) x h x EF (test, exact to 1e-6); rainy at 1400 h is negative (-11,8 kg), no fabricated benefit; `CARBON_HOURS_GUIDANCE` 1400 / 180. Impact scaler uses the incremental ledger. Gaps: (a) no heat-use fraction (section 3), (b) `useCarbonResult` (gross, no baseline) and `CarbonWaterfall` are no longer mounted; delete or switch to incremental so nobody revives the gross number. |

P2 status: Metric hint chosen from sign only (`LiveHeatReadout` `positiveHint="Panen panas"`, shown even when the statement says "Tanpa beban panas") - **not fixed**; colour-ramp contrast x4 legend note (`palette.ts RAMP_CONTRAST`) - **not fixed**; TemperatureProfile arrows between non-conduction pairs - **not fixed**; natural-convection floor and low-light PV derating - not applied (optional, documented neither way); stagnation boiling - **fixed**; hysteresis limitation - stated as steady-state only.

## 2. Copy deck (07 chapter A) - physics scan

Findings in priority order. "Fix" is the exact Indonesian line to use.

**P1**

1. `dampak.h2` "Sekitar seperlima jadi listrik. Sisanya jadi panas." - **wrong.** Sunny preset: electricity 18,5 %, liquid heat 44,9 %, optical loss 12,0 % (reflection/absorption outside the cell, not heat in the water), front + back loss 24,6 %. "Sisanya jadi panas" implies about 80 % usable heat. Also implemented in `Impact.tsx` ("Seperlima jadi listrik. Sisanya panas.").
   Fix: **"Hampir seperlima jadi listrik. Hampir separuh jadi air hangat."** (computed: 19 % and 45 %; the numbers must come from `simulate`, with the words chosen to match: 15-21 % = "hampir seperlima", 40-49 % = "hampir separuh", otherwise print percentages).
2. `dampak.lead` "...dan {q} W lainnya bisa ditangkap sebagai air hangat." - "lainnya" again means "the rest"; 1530 - 284 = 1246 W is not 687 W, and the 687 W needs 40 C inlet water and a load. Implemented in `Impact.tsx`.
   Fix: **"Pada siang cerah satu panel menerima {solarInput} W. Sekitar {pe} W jadi listrik. Bila air masuk {tIn} °C dan ada yang memakainya, sekitar {q} W bisa ditangkap sebagai air hangat. Sisanya, sekitar {lost} W, hilang ke udara atau tidak terserap."** (`lost = solarInput - pe - q` = 559 W.)
3. `opening.lead` "Saat hujan, arah panasnya bisa berbalik." (in `Opening.tsx`) - rain supplies about a quarter of the rainy-preset rejection; reversal needs warm liquid plus a real heat source, and also happens in dry windy weather and at night.
   Fix: **"Listrik dan panas dari satu panel. Bila ada loop hangat yang perlu didinginkan, arah panasnya bisa berbalik."**
4. Scaler assumption line "panas dipakai penuh menggantikan LPG" and `disc.1.b1` - see section 3 (the 100 % heat-use assumption). The line must state the used fraction.

**P2**

5. `reject` headline "Panel membuang panas ke udara dan hujan." (code: shown when rain > 0) - sky radiation and wind carry most of it. Fix: **"Panel membuang panas ke udara, langit, dan hujan."** (keep the dry variant "Panel membuang panas ke udara dan langit.").
6. Verdict `rejection`: "Pada kondisi ini hanya SolarVein yang memberi manfaat pembuangan panas." - true, but magnitude is small. Append the net number: **"... Manfaat bersih sekitar {net} W listrik, bergantung pada pendingin yang digantikan."** (7,8 W after PV penalty at COP 30).
7. `not-beneficial` detail "Cairan belum cukup hangat dibanding panel..." is correct only when |q| < 20 W. For the case q < -20 W but not worth it (`PUMP_EXCEEDS_BENEFIT`), use the advisory text already produced by `src/sim` instead of this detail line.
8. `out.heat` "Untuk air hangat dan proses." - outlet is 45 C; "proses" overclaims. Fix: **"Untuk pemanasan awal air (±45 °C)."** (Implemented as "Untuk air hangat dan proses." in `Scaler.tsx`.)
9. `out.elec` "listrik bersih ... " reads as SolarVein's contribution, but plain PV makes 97 % of it (15,3 of 15,7 GWh at f = 100 %). Fix: **"{E_e_total} GWh listrik bersih per tahun, termasuk listrik yang juga dihasilkan PV biasa (selisih {dE} GWh)."**
10. `list.win.3` "Sel lebih sejuk saat cerah ({cellSV} lawan {cellPV}), jadi listrik sedikit lebih tinggi" - true only while the pump runs for a load. Fix: **"Sel lebih sejuk saat pompa memanen panas ({cellSV} °C lawan {cellPV} °C), jadi listrik sedikit lebih tinggi"**.
11. `list.lose.2/3` "Tanpa beban panas, manfaat panasnya nol" / "Hujan tanpa sumber panas: setara PV biasa" - second is correct for the rainy preset (40,4 vs 40,5 W) but the sunny no-load case is worse than PV. Fix: **"Tanpa beban panas saat cerah: panel lebih panas dari PV biasa ({stag} °C lawan {cellPV} °C) dan listrik turun ±7 %"** and keep "Hujan tanpa sumber panas: setara PV biasa".
12. `row.cool` "Pendingin yang digantikan (W_e)" - add the baseline: **"Listrik pendingin yang digantikan (W_e), pembanding COP {cop}"**.
13. `list.win.2` "Pembuangan panas saat ada sumber panas yang nyata" - add **", nilainya bergantung pada pendingin yang digantikan"**.
14. `disc.1.b2` - add **"Dengan dry cooler sebagai pembanding, nilainya hanya sekitar {x} W listrik per panel."**
15. `disc.2.body` (El Nino/La Nina) - add **"Pengaruhnya berbeda tiap wilayah dan bulan."** Fine otherwise.
16. `hero/DetailPanel.tsx:56-58` "Selain itu: Pendinginan tidak menguntungkan pada kondisi ini." is wrong for the no-load case. Fix: **"Selain itu: panas tidak dihitung sebagai manfaat (tanpa beban atau sumber panas, atau pertukarannya terlalu kecil). Bila pembuangan tidak sepadan: Pendinginan tidak menguntungkan pada kondisi ini."**
17. `LiveHeatReadout` hints: pass the regime. Positive q with regime 'negligible' -> hint **"Tanpa beban panas"**; negative q with regime 'negligible' -> **"Panas keluar, tak dihitung"**.

**Checked, no change needed:** opening h1 and closing h2 ("Atap yang sama. Dua manfaat." - conditional on a heat load, which `closing.line` softens enough), `rule` caption (verbatim true), layer texts 1-4, `harvest` and `idle-*` statements, `neg-*`, `s04.line` ("Kadang PV biasa yang menang" is accurate and good), footer disclaimer. No "gratis", "hemat" without a baseline, "dua kali", "efisiensi ganda" or "pendinginan gratis" appear in the deck or in `src/`. LPG constants: 46 MJ/kg = 12,78 kWh/kg (code rounds to 12,8, 0,2 % difference, harmless; prefer `46 / 3.6`); 0,23 kg CO2e/kWh_fuel = 63 kg/GJ x 3,6 = 0,227, combustion only (say "pembakaran" in `disc.3`).

## 3. Chapter E.4 sign-off

| E.4 question | Answer |
|---|---|
| 1 "seperlima" | Electricity share 18,5 % is fine as "hampir seperlima". "Sisanya jadi panas" is not (see copy item 1). **Reject as written; use the corrected headline.** |
| 2 every panel always has a heat load | **Not acceptable as default.** 4 panels x 961 kWh_th/yr = 10,5 kWh_th/day average, which is 450-530 L/day heated by 17-20 K per roof. A typical house uses far less (order of 100 L/day = 2,3 kWh/day, about 20-25 % of this supply); hotels, kos, laundries can approach 100 %. The model also shows that no-load hours are not neutral: the idle insulated panel runs 74,6 C and makes 19,8 W less electricity than plain PV (-7 %). Add the input "Porsi jam dengan beban panas" **default 50 %** (slider 0-100 %, marks 25 / 50 / 100, 20-30 % noted for ordinary houses), apply it as below, and show it in the assumption line. |
| 3 LPG 46 MJ/kg and "tabung 12 kg" | **Approved.** 46 MJ/kg NCV is within the usual 45,5-46,4 range for propane/butane mixes; 12 kg per tabung is the common household size. The computed 88,5 kg/yr per panel at f = 100 % is 7,4 tabung; at f = 50 % 3,7 tabung. Keep the constant beside the carbon assumptions (`LPG_KWH_PER_KG` lives in `state/impact.ts`; move it to `sim/carbon.ts` and use 46/3,6). The LPG line must say "ekuivalen", never "hemat sebanyak". |
| 4 rain not credited | **Approved.** Rainy incremental CO2e is -11,8 kg/yr/panel at 1400 h and about -1,5 kg at 180 h (cooling credit off); with the credit on it is about +1 kg. Keep disc.1.b2 plus "Panas buangan bukan listrik yang dihemat". |

### Are the defaults honest?

- Incremental versus conventional PV, not gross: **yes** for CO2e (`computeCarbon` with baseline: 268,9 kg = heat 260,2 + electricity difference 8,6). 97 % of the figure is the displaced LPG; the electricity is essentially the same as plain PV. Say so (copy item 9).
- Heat counted only where a load exists: **no** (assumes 100 %).
- Hours: 1400 h at 900 W/m2 = 1.260 kWh/m2/yr, below Jakarta's roughly 1.600-1.800 kWh/m2/yr, so irradiation is conservative. But scaling a 900 W/m2 snapshot overstates heat per kWh of sunlight because efficiency drops at low G (eta_th 45 % at 900, 29 % at 400, 19 % at 300, pump off below ~250 W/m2 with T_in 40 C). Integrating the clear day with the same model gives 82 % of snapshot x equivalent hours (787 versus 962 kWh_th/panel on 1400 h). The two effects roughly offset, so **962 kWh_th/panel is a defensible upper bound only when a load takes every hour**. Label the hours "jam setara pada 900 W/m²" (the guidance 1.200-1.600 keeps).
- Dampak band as it stands also lets "Jam setara" suggest peak-sun-hours at 1000 W/m2; fix with the label above.

### Corrected arithmetic (add the load fraction f; f = share of equivalent hours with a heat load)

Per panel per year, h = 1400, sunny preset, values from `simulate`:

- Electricity net: `h*(f*280,4 + (1-f)*252,9)/1000` kWh (the no-load hours use the pump-off result).
- Heat: `f * 686,9 * h/1000` kWh_th. LPG: `f * 808,1 * h/1000 / 12,78` kg.
- Incremental CO2e: `f*(260,2 + 8,6) - (1-f)*22,2` kg (22,2 = 19,8 W x 1,4 kh x 0,8).
- Payback of 180 kg: `180 / CO2e`.

| f | kWh_th | kWh_e net | LPG kg | tabung | CO2e kg/panel | 40.000 panels: GWh_th / GWh_e / ton CO2e | payback |
|---|---|---|---|---|---|---|---|
| 100 % (old default) | 962 | 393 | 88,5 | 7,4 | 268,9 | 38,5 / 15,7 / 10.754 | 0,7 yr |
| **50 % (proposed)** | 481 | 373 | 44,3 | 3,7 | 123,3 | **19,2 / 14,9 / 4.930** | 1,5 yr |
| 30 % (typical house) | 289 | 366 | 26,6 | 2,2 | 65,1 | 11,5 / 14,6 / 2.600 | 2,8 yr |

Conventional PV for reference: 381,8 kWh_e per panel (15,3 GWh for 40.000). The 10.754 ton figure is arithmetically correct but is the 100 % upper bound; do not show it as the default.

### Exact replacement lines (Indonesian)

- `scaler.in.load` (new): **"Porsi jam dengan beban panas"**, help **"Berapa persen dari jam setara itu ada yang benar-benar memakai air hangatnya. Rumah biasa sekitar 20 sampai 30 persen; hotel, kos, atau binatu bisa mendekati 100 persen."**
- `scaler.in.hours`: **"Jam setara per tahun pada 900 W/m² (acuan 1.200 sampai 1.600 untuk iklim tropis)"**.
- `scaler.assump` (sunny): **"Siang cerah (900 W/m², udara 32 °C), 1.400 jam setara per tahun, {f} % jam dipakai untuk memanaskan air menggantikan LPG."**
- `disc.1.b1`: **"Panas hanya dihitung pada jam yang punya beban air panas ({f} % di sini). Pada jam tanpa beban, panel justru lebih panas dari PV biasa dan listriknya turun ±7 %. Angka 100 % adalah batas atas."**
- `out.co2` note: **"Dibanding PV biasa dan pemanas LPG. Hampir seluruhnya berasal dari LPG yang digantikan."**
- Rainy scenario assumption line: keep as implemented; add the load fraction only to the sunny scenario.

## 4. Remaining mode/regime-driven visuals

`visual-coupling.sh` output reviewed, files timestamped within minutes of the run (Hero, Impact, Instrumentation, effects/*, store modified 19:03-19:07), so other agents are mid-rebuild.

| Hit | What it does | Verdict | Status |
|---|---|---|---|
| `Hero.tsx:36,53` `mode` | label of the segmented control / "Kustom" | UI selection only, never feeds physics | final |
| `ControlPanel.tsx:87-108` | preset segmented value | UI selection only | final |
| `lab/LabStrip.tsx:22,71` `MODE_LABEL[mode]` | text "Cerah/Hujan/Kustom" beside readouts | A preset label that the store drops to "Kustom" as soon as any input departs (`store.ts modeAfterEdit`), so it cannot lie; direction glyph uses live `qLiquidW` (`:26`) | final |
| `charts/DayHistory.tsx:174-177` | initial day tab from mode | initial selection only | final |
| `CollectorStage.tsx:148` `REGIME_TEXT[result.regime]` | aria-label | Computed regime, not a mode flag; fine | final |
| `hero/regime.ts:65,74` | sign + flag combination for statements | Correct: the sign of q decides the sentence, the flag decides whether it is credited | final |
| `Instrumentation.tsx:47` | rain-attribution line gated by q < 0 and rainDelta < 0 | live values | final |

3D effects (`targets.ts`, `HeatArrows`, `Rain`, `Sunlight`, `ElectricPulses`, `Schematic`) read only `SimResult`/`inputs`, not `mode`; direction from sign(q). **In progress, re-verify after the rebuild lands:** `HeatArrows.tsx`, `Rain.tsx`, `Sunlight.tsx`, `ElectricPulses.tsx` (all modified 19:06), `Hero.tsx`/`Instrumentation.tsx`. Open P2s: `LiveHeatReadout` hints (copy item 17), `DetailPanel` "Selain itu" (item 16), colour-ramp contrast legend note, TemperatureProfile non-conduction arrows.

## 5. Remaining risks

1. The Dampak headline and the 100 % heat-use default are the only things I would block on; everything else is wording.
2. The glazed-collector penalty (80-85 %) and the rain band remain engineering estimates, not validated.
3. The weather engine forces the pump on between two pump-on presets; correct physics, but QA should confirm no frame shows "Pompa dimatikan manual" text for that hold.
4. Rain attribution folds in the sky/cloud change; harmless but should not be quoted as "the drops alone".
5. Consider a regression test that fails if the Dampak default heat fraction becomes 100 % again (add to `src/state/impact.test.ts` when the input lands).
