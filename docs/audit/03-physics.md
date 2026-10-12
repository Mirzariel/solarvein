# 03 - Physics and scientific audit (Agent G, devil's advocate)

Scope: `src/sim/*`, `docs/PHYSICS.md`, visual mapping (`src/viz3d/**`, `src/sections/hero/**`), charts, Comparison, Carbon, Seasons, Principle.
Method: code reading plus my own numerical experiments. Reproduce them with
`AUDIT_PRINT=1 npx vitest run src/sim/review/audit-numbers.test.ts --disableConsoleIntercept`.
Regression/known-gap tests: `src/sim/review/physics-review.test.ts` (4 `it.fails` = documented gaps; flip to `it` when fixed).
Suite state: `npx vitest run` = 6 files passed, 70 tests passed, 4 expected-fail (my known gaps), 9 skipped (print-only); `tsc -b --noEmit` clean.
No file under `src/sim/*.ts` (other than the new `review/` folder) was modified. No screenshots were taken; visual claims below come from code and from the existing `docs/audit/critic/d1440-{sunny,rainy}-hero.png` frames.

## 0. Verdict in one paragraph

The core thermodynamics is sound and honest in structure: single-node balance closes to 1e-10 W, liquid never reverses, the sign convention is consistent everywhere, `W_th`/`W_e` are separated in every UI string I checked, and the model refuses to invent heat (no hot source = no credit). `viz3d/**` and `charts/**` never read the mode flag (grep: zero hits), and particles, pulses, sunlight, rain and arrow magnitude all derive from the computed state. The weak points are not the equations but the **framing and the baselines**: (1) the rejection benefit is valued against a chiller (COP 3.5, UI-clamped at 10) for a loop only 20 K above ambient, where a fan-only dry cooler is the real alternative; (2) rain is presented as the enabler of rejection while it supplies about 36 % of the rainy-preset duty; (3) a few arrows are gated by valuation flags instead of the sign of `qLiquidW`; (4) the cell-to-glass resistance is shown in the profile but missing from the balance; (5) carbon extrapolates a 15 mm/h snapshot over 1400 h/yr.

## 1. Prioritised issues

### P0 (physically wrong or misleading)

**P0-1. Rejection value uses a straw-man baseline (chiller, COP 3.5, max 10) for a 45 C loop in 25 C air.**
- Evidence: rainy preset: `heatRejectedW` = 698 W, pump 8.5 W, avoided cooling 199.4 W_e, `netCoolingBenefitW` = +190.9 W_e (`model.ts:243-245`, `presets.ts:40`). The loop is only 20 K above ambient; such a loop is normally cooled by a dry cooler/fin-fan or free cooling, whose electrical cost is fan only (order of 2-5 % of the heat moved, i.e. COP of ~20-50; my estimate, not a datasheet). With COP 30 the same 698 W_th avoids 23 W_e, net after pump and the 1.9 W PV penalty = +12.9 W_e; with COP 40, +7 W_e. That is a 15-25x smaller benefit than the headline. `INPUT_LIMITS.coolingCOP.max = 10` (`presets.ts:106-109`) makes the honest baseline impossible to enter (`clampInputs` silently clamps; I verified COP 20/30/50 all return 69.8 W avoided).
- Consequences: Comparison verdict `kind: 'rejection'` "hanya SolarVein yang memberi manfaat pembuangan panas" (`verdict.ts:63-68`) compares only the three panel configs, never against "PV + a dry cooler". Carbon "Kredit pendingin" (`Carbon.tsx:129-136`) is 223 kgCO2e/yr at COP 3.5. Net electricity of SolarVein in the rainy preset is 30.1 W_e vs 40.6 W_e for conventional PV (-10.5 W_e); the model reports that correctly, but the headline +191 W_e overshadows it.
- Panel is also a weak radiator: effective conductance panel-to-ambient = 698 / (45-25) = 34.9 W/K = 20.5 W/(m2 K). A finned coil with fan achieves the same UA with roughly 0.05-0.1 m2 of face area (order-of-magnitude estimate), i.e. 20-40x less area than the 1.7 m2 panel.
- Fix: (a) `INPUT_LIMITS.coolingCOP`: `min 1, max 60, step 0.5`; (b) add a second displayed baseline: "dry cooler, COP ~ 30" next to "chiller, COP 3.5", and make the verdict/Comparison line read the benefit under both; (c) rainy preset: set `coolingCOP` to 30 (or keep 3.5 but only when `inletC - ambientC < 10` K, because below that a chiller is the realistic device); (d) reword `verdict.ts:66` to "Pada kondisi ini hanya konfigurasi dua mode yang membuang panas; nilainya bergantung pada pendingin yang digantikan (chiller vs dry cooler)"; (e) `INPUT_LIMITS.coolingCOP.help`: replace "chiller kecil ≈ 3-4" with "chiller ≈ 3-4; dry cooler/fan saja ≈ 20-50".

**P0-2. Rain is framed as the enabler of rejection; in the model it contributes about one third.**
- Evidence (my runs, rainy preset, only `rainMmH` and `irradiance` varied):

  | case | q_liquid [W] |
  |---|---|
  | rain 15 mm/h, G 120 (preset) | -698 |
  | rain 0, G 120 | -450 |
  | rain 0, G 0 (dry night), wind 3 m/s | -566 |
  | rain 0, G 0, wind 0 | -345 |
  | rain 15, G 0 | -801 |

  Rain adds +248 W net (rain term 347 W minus 96 W lost because rain also lifts T_sky from -6 K to -1 K). So 64 % of the "Hujan" rejection is wind (3 m/s vs 1.5 m/s in the sunny preset) plus IR to sky and happens in dry weather and at night. The Day history "Hari hujan" even shows -578 W at 06:00 with zero rain (`day.ts`, hours 6-12 dry).
- Copy that over-attributes: `Hero.tsx:69-70` "membuang panas saat hujan"; mode labels `Hero.tsx:20-21` "Hujan · Pembuangan panas"; `Principle.tsx:230` pill "Hujan" plus a static diagram with rain only and no wind; `Seasons.tsx:256` "Kolektor yang terbuka memang dapat berperan sebagai permukaan pelepas panas" (fine), but "La Nina" scene suggests mechanism = rain.
- Fix (copy): "...membuang panas bila cairan lebih hangat dari panel, terutama saat berangin, malam, atau hujan." Hero label `Hujan · Pembuangan panas` -> `Hujan/berangin · Pembuangan panas` (or keep the name "Hujan" but add the tooltip "hujan menambah ±35 %"). Fix (physics output): expose an attribution in the sim (or compute in the UI by calling `simulate` with `rainMmH: 0`): `rainContributionW = q(rain) - q(rain=0)`; show "hujan menyumbang +250 W (36 %)" in the Lab/Instrumentation. Constraint for the maths: `q(rain=0)` must also use the dry sky depression (it does).

### P1 (questionable / overstated)

**P1-1. Some arrows are gated by valuation flags, not by the computed sign of `qLiquidW` (violates brief rule "the model determines direction, not a mode flag").**
- `targets.ts:34-50`: `stackDir` is derived from `r.regime`, and `regime` depends on `heatLoadAvailable`/`hotSourceAvailable` (`model.ts:236-240`). Reproduced: sunny + forced pump + no heat load: q = +865 W but `regime='negligible'` -> `stackDir=0`, no stack arrows although 865 W flows into the liquid. Rainy + forced pump + no hot source: q = -698 W, no stack arrows, and the 813 W leaving the glass is drawn as faint amber "ordinary loss" (`envTone` flips to cyan only when `regime==='reject'`, `targets.ts:44-46`). Same physical flow, two colours, chosen by a valuation flag. Tested by `it.fails` x2.
- Counter-point (why not P0): in presets and auto mode the direction is right; the text statement (`regime.ts:69-91`) explains the no-credit case; magnitudes are log |q| (`fxMath.ts:24-27`).
- Fix: in `deriveTargets`: `if (r.pumpOn && Math.abs(r.qLiquidW) > MODEL_CONSTANTS.minHeatFlowW) { stackDir = r.qLiquidW > 0 ? -1 : 1; stackStrength = heatStrength(r.qLiquidW); }` ; `envTone = (r.pumpOn && r.qLiquidW < -minHeatFlowW) ? 'cool' : 'heat'`. Use `regime`/credit only to dim (opacity x0.5, dashed shaft) when `usefulHeatW === 0 && heatRejectedW === 0`, with the "no credit" text already in place. In reject, set `envStrength = heatStrength(r.qFrontLossW + r.qRainW)` (today it reuses the liquid strength, 0.83 vs 0.88 here; harmless but not "from the state").
- Check done on zero crossing: `HeatArrows.tsx:93-102` fades through zero before flipping (good); the 20 W dead band means arrows vanish between -20 and +20 W (acceptable, matches the regime).

**P1-2. Transitions are not sequences of real computed states (brief's implementation hint not followed).**
- `store.ts:109-113` jumps `inputs` to the preset in one step. Effects then `damp()` their own scalars (Sunlight/Rain/Arrows/Mood, `SCENE_RATE` 3.3) while Collector re-renders at once: liquid vertex colours, Masuk/Keluar labels and cell tint switch instantly (`Collector.tsx:358-376`, `:579-585`); readouts tween each number separately over 500 ms (`useAnimatedNumber.ts`), so intermediate frames can show `T_out < T_in` with a positive `Q` hint, or ΔT sublabel (raw, `Readouts.tsx:30`) disagreeing with tweened T_in/T_out. During the 0.9 s the arrows, rain and light are at one stage and the liquid colour at another; none of those frames is a state the model could produce.
- Fix: keep `inputs` as target; add `displayInputs` interpolated in a rAF loop (1.0 s, ease `cubic-bezier(.22,1,.36,1)`) for G, T_amb, rain, wind, T_in, flow; run `simulate(displayInputs)` per tick (cheap: 3 bisections of ~45 steps) and feed Hero readouts, 3D effects and liquid colours from that `displayResult`; charts below can keep the settled result.

**P1-3. Cell-to-glass resistance is in the profile but not in the balance (internal inconsistency).**
- `terms()` evaluates convection, IR and rain at `T_p` (`model.ts:163-166`) while the profile reports `glass = T_p - (q_front+q_rain)/(A*200)` (`model.ts:261`), 2.4 K colder in the rainy preset (glass 37.8 C, cell 40.2 C). With a series conductance U_cg = 200 W/m2K (3 mm glass + EVA is ~230 by my arithmetic, so 200 is a fair value) my own solver gives q = -617 W instead of -698 W (-12 %), T_cell +0.5 K; in harvest/stagnation I estimate +1-3 K on T_cell (glass drop = q/U_cg ~ 600 W/m2 / 200 = 3 K near stagnation; not run through the model). NOCT check would move 44.1 -> ~46 C (estimate), still inside 42-48.
- Fix (nested monotone solve inside `f(T_p)`): find `T_s` with `A*U_cg*(T_p - T_s) = A*[ h_c(T_s - T_a) + eps*sigma*(T_s^4 - T_sky^4) + h_rain(T_s - T_rain) ]` (bisection on `T_s in [T_sky-20, T_p]`), then use that heat as `qFront+qRain` (split by term at `T_s`), `U_cg = 200`. Profile glass = `T_s`. `it.fails` "glass" test flips green when done. Update PHYSICS.md section 2.2/4 and the sanity numbers (rainy q about -617 W).

**P1-4. "Glass cover" wording hides which collector class this is; a true glazed PVT would reject about 6x less.**
- 3D layers (`dims.ts:32-37`): glass -> cells (laminate) -> TIM -> plate -> tube -> foam: **no air gap**. So it is a laminated-module (unglazed-class) PVT, and treating the front like an unglazed absorber (h_c + IR to sky, ~18 W/m2K at 3 m/s, plausible for an unglazed collector) is **consistent**, not wrong. But `PHYSICS.md:35` says "glass-covered module", `assumptions.ts` "kaca depan", `dims.ts` "Kaca pelindung": a reader will assume a covered flat-plate collector.
- Quantified (own solver, same rainy preset): glazed with a 2-surface air gap (h_gap = 3 + 5.7 = 8.7 W/m2K, outer as model): q = -116 W with 15 mm/h rain and -98 W without; unglazed laminate: -698 / -450 W. Rain adds only +18 W in the glazed case because the gap, not the outer film, is the bottleneck. A glazed PVT would be a poor radiator (U_top ~ 6-7 W/m2K vs 18-30).
- Fix: label the hardware "laminasi PV tanpa celah udara (kelas unglazed)" in `PHYSICS.md`, Assumptions (`optics`/`front-loss`) and the layer tooltip; add one limitation line: "Kolektor berkaca dengan celah udara akan membuang panas ±85 % lebih sedikit". Optional parameter `coverGapAir: boolean` using the series model above.

**P1-5. Sunny preset flatters the thermal side (T_in = 30 C).**
- Sunny table (G 900, 32 C, 1.5 m/s, 2 L/min): T_in 30 -> q 865 W, eta_th 56.5 %, cell 37.4, P_e 292.7 (conv 273.7); T_in 40 -> 667 W, 43.6 %, 45.7 C; 50 -> 462 W, 30.2 %; 60 -> 252 W, 16.5 %, P_e 266.2 < conv 273.7; 70 -> 36 W. The PV advantage (+19 W) is gone by ~52 C and heat collapses with a warming tank. A DHW preheat loop rarely holds 30 C; eta_th 57 % is also ~10 % above commercial unglazed PVT zero-loss values (0.50-0.55, from memory; tau-alpha 0.88 and U_pf 150 sit at the optimistic end).
- Carbon inherits it: 865 W x 1400 h = 1.21 MWh_th/yr (712 kWh_th per m2 per year) at a constant 30 C.
- Fix: preset `inletC: 40` (heat 667 W, eta_th 44 %, PV gain over conventional +10 W instead of +19 W) and show the efficiency-vs-T_in table (or a mini curve) in the Lab; keep 30 C reachable. Optionally `tauAlpha` 0.88 -> 0.85.

**P1-6. Rain term is unvalidated and its justification for neglecting evaporation is wrong.**
- Numbers: 15 mm/h = 4.17e-3 kg/(m2 s); full equilibration bound h_rain = 17.4 W/m2K; model 12.2 (eps 0.7). Rain term 347 W = 43 % of the 813 W leaving through the front (convection 305 W, IR 161 W, rain 347 W). Sensitivity (own solver, other inputs fixed): eps 0 -> -414 W; 0.3 -> -544; 0.7 -> -698; 1.0 -> -804. So the uncertainty of the rain coefficient alone is about -22 % / +15 %; it is **not** the dominant error.
- `PHYSICS.md:63-64` and `assumptions.ts:31`: "evaporation neglected because RH is 95-100 %". Evaporation depends on the vapour-pressure difference between the wet surface and the air, not on air RH: a wet film at 40 C (p_sat 7.5 kPa) in 25 C / 95 % air (3.0 kPa) has a potential of ~800 W/m2 (Lewis analogy, h_m from h_c = 11.8 W/m2K). The real film is cooler than the panel, so the actual flux is much lower, but it can be of the same order as the sensible term. Omission is likely "conservative" in magnitude yet physically unjustified, while eps = 0.7 for splash/runoff is not evidenced; `T_rain = T_amb - 1.5 K` (`model.ts:134`) corresponds to ~90 % RH (95 % gives about -0.8 K).
- Fix: keep the formula, change wording: "Penguapan dari lapisan air tidak dimodelkan; potensinya sepadan dengan suku sensibel, sehingga hasil hujan dapat meleset ±50 %", central `rainEffectiveness 0.7 -> 0.5` (judgement) and present the result as a band (eps 0.3-1.0 => -544...-804 W). The existing validation step "Pengukuran perpindahan panas oleh hujan" (`Assumptions.tsx:21`) stays.
- Not wrong: rain is correctly treated as sensible heat only, drop temperature below ambient, rain applied to front only, zero rain => zero term, monotonic (test exists).

**P1-7. Carbon section: gross PV credit and rainy extrapolation overstate what SolarVein adds.**
- `carbon.ts:29` credits all `electricalW`; `PHYSICS.md:164` notes this, the UI (`Carbon.tsx:146`) only footnotes it. Sunny preset: 328 kg (electricity) + 328 kg (heat) = 652 kg/yr, payback 0.69 yr. Versus conventional PV (which gives most of that electricity anyway): incremental = (292.7 - 3.2 - 273.7) W x 1.4 kh x 0.8 = 17.7 kg + heat 327.7 kg = 345 kg/yr. A conventional 1.7 m2 PV alone has a 0.7 yr carbon payback on a 200 kg module, so the displayed payback mostly reflects PV, not the exchanger.
- Rainy snapshot x 1400 h/yr (`Carbon.tsx:35`, `carbon.ts:11`) means 15 mm/h for 1400 h = 21 m of rain per year (Jakarta is about 2 m/yr; 15 mm/h matches 2 m in ~130 h). With "Pendinginan dimodelkan" on: cooling credit 223 kg, net 257 kg, payback 1.75 yr (default off: net 34 kg, payback 13.3 yr). The cooling credit also inherits P0-1.
- Positive: default `coolingDisplacementModeled=false`, embodied never zero, all factors editable, caveats present.
- Fix: add a toggle/line "Tambahan terhadap PV konvensional" computing `(P_e - P_pump - P_e,conv)*h*EF_grid + heat + cooling` and use it for payback with an incremental embodied default (HX + insulation + pump, 100-250 kg); for a rainy snapshot cap `hoursPerYear` to 120-250 h and label "jam hujan/yr" (separate default per preset).

### P2 (wording, minor physics, polish)

- `ui/Metric.tsx:74` hint chooses "Panen panas"/"Pembuangan panas" from the sign only, while the statement may say "Tanpa beban panas". Pass `regime` or use "Panas ke cairan" / "Panas dari cairan".
- `materials.ts:34` `CONTRAST = 4` exaggerates the liquid colour gradient 4x (3.4 K drop looks like 14 K). Direction and NTU-shaped profile are right (`palette.ts:42-46` matches the isothermal-plate solution for either sign, inlet warm -> outlet cooler in rejection, verified from code); add a legend note "skala warna diperbesar".
- `TemperatureProfile.tsx:41-52` draws heat arrows between every adjacent pair, including sky->ambient and fluid->back, which are not conduction links in the model (back temperature is fed by `qBack` from the panel node, not from the fluid). Hide those two links or label "diagnostik".
- Natural-convection floor: `h_conv = 2.8` at v = 0 is low (4-6 W/m2K typical); at calm wind the rejection is understated (-345 W at v 0 vs -566 W at v 3). Optional `max(2.8+3v, 4.5)`.
- P_e uses `eta_ref` at all irradiances: no low-light derating (about 3-8 % relative at 100-200 W/m2), so rainy P_e = 38.6 W is slightly generous.
- Stagnation: `STAGNATION_HOT` (critical > 95 C) is right (G1200, 45 C, calm: 111.7 C, conventional 85.5 C), but no mention that water would boil/steam; add "air/glikol, tekanan" to the message. Controller has no hysteresis (steady-state only); say so in limitations.
- `Principle.tsx` static "Hujan" diagram has rain but no wind arrows (see P0-2); `Seasons.tsx:256` "kolektor yang terbuka" should read "kolektor tanpa celah udara (laminasi)".
- Pump: `dP ∝ V^2` is fine at 2-3 L/min (Re ~ 4000+) but at 0.3 L/min flow is laminar (~ V), so pump power there is under-stated; negligible in absolute terms.
- `Hero.tsx:65` H1 "Dua arah aliran panas" is fine; the lead sentence needs the P0-2 edit.
- Electrical pulses: `level = W/300` saturates near peak output; fine. Colour is pale lime (design brief wanted no lime): design lead's call.

## 2. Answers to the specific questions

### 2.1 Thermodynamics
- **Energy balance / signs**: closed (residual 1e-10 W; test grid in `model.test.ts` plus my 3 x 4 x 3 x 3 x 3 grid with sign(T_out-T_in) = sign(q) and `massFlowKgS >= 0`). Pump-off: q = 0, T_out = T_in, consistent.
- **Heat vs liquid direction**: liquid never reverses (`massFlowKgS` is `|.|`, `LiquidFlow.tsx:67` only scales speed with `flowLpm`, direction fixed by LUT order).
- **eps-NTU**: correct form, `T_out = T_in + Q/(m cp)`, isothermal-plate shape used for colours. `rainy`: NTU 1.23, eps 0.71, so a high-flow rejection duty cannot exceed `eps*mcp*(T_in - T_p)`; fine. Assumption `T_p` uniform with `U_pf = 150` is optimistic for a laminate with TIM (U_ca = 400 only in the profile).
- **PV temperature coefficient**: 0.35 %/K default (range 0.25-0.5) and `eta_ref = 20 %` plausible; +19 W (+6.9 %) for -18 K matches beta*dT = 6.3 %.
- **Sky radiation**: exact T^4 form; dry depression 6 K is conservative for a humid clear sky (Swinbank gives ~11 K at 32 C); rain 1 K OK. Dry overcast treated as clear (documented).
- **Rain h_rain ~ 12 W/m2K at 15 mm/h**: arithmetic correct (0.7 x 17.4), upper bound 17.4. Plausible order of magnitude for film runoff; evaporation argument flawed (P1-6). Overstated? Possibly by 30-40 % if drops bounce/run off; understated if evaporation matters. Present as a band.
- **Is -698 W / ~410 W/m2 credible?** As an unglazed laminate at 3 m/s: yes order-of-magnitude (20 W/m2K x 20 K = 410 W/m2; wind and IR alone give 265 W/m2). For a glazed collector with an air gap: no (about 70 W/m2). It is credible for a laminate and only 36 % rain-driven (P0-2, P1-4).
- **Conventional PV rear loss**: U_back effective 10-12 W/m2K, NOCT test 44.1 C. OK.
- **Stagnation**: 71.6 C in the sunny preset, 111.7 C at extreme conditions, flagged. OK.
- **Pump / controller**: pump numbers recomputed (3.2 W at 2 L/min, 8.5 W at 3 L/min) match. Controller rules are sensible and include the PV-penalty term; their quality depends on the COP baseline (P0-1) and they ignore hysteresis/dynamics.

### 2.2 Claims
- **Novelty**: Principle and Footer already say "bukan penemuan baru" (good). Add a pointer to prior art so no reader infers novelty from the H1: PVT used as night-sky/convective cooler (e.g. Eicker and Dalibard, "Photovoltaic-thermal collectors for night radiative cooling of buildings", Solar Energy 85, 2011; please cite-check before publishing) and glazed/unglazed PVT reviews. Not a defect; a one-line addition.
- **"Useful cooling"**: only valid with a hot source (guaranteed by `heatRejectedW = 0` otherwise) and a valued baseline (P0-1).
- **El Nino / La Nina**: statements are qualitative and accurate (drier/clearer vs wetter/cloudier, non-uniform by region and month), the page explicitly disclaims mode-by-calendar. The only quantitative linkage is the rainy preset, which is not an ENSO claim. Wording nit: "modul lebih panas" in El Nino is mostly irradiance, acceptable.
- **Comparison fairness**: grid of 128 cases (G x T_in x rain x load x source) gives conventional-better 66, harvest 42, rejection 20; dual never claimed to win by default and `electrical-only` ties are handled. Gaps: no external baselines (P0-1), the sunny preset T_in (P1-5), and the net-electricity penalty in rejection is shown but not headlined.
- **Carbon**: see P1-7.

### 2.3 Visual-physics mapping (what derives from what)

| Visual | Source | Verdict |
|---|---|---|
| Stack arrow direction/strength | `regime` + log|qLiquid| (`targets.ts:34-40`) | magnitude OK; direction gated by flags (P1-1) |
| Env arrows (front/rain loss) | `regime==='reject'` -> cyan, else `qFront+qRain > 3 W` amber | tone is flag-gated (P1-1) |
| Arrow crossing zero | fades to 0, flips, fades in (`HeatArrows.tsx:93-102`) | good |
| Liquid colour along path | `T_in`, `T_out`, `ntu` (`Collector.tsx:352-376`) | correct direction in both regimes; instant not tweened (P1-2); 4x contrast (P2) |
| Particles | `pumpOn && showFlow`, speed ∝ `flowLpm`, fixed direction | correct |
| Electric pulses | `electricalW` (speed, brightness) | correct (gross P_e) |
| Sunlight shafts / mood | `irradiance`, rain | correct |
| Rain count / slant | `rainMmH`, `windMs` | correct (decorative slant from wind) |
| Cell tint | `cellC - ambientC` | correct, but not tweened |
| Hero mode labels, statement, pathway | `AppMode` label only for the segmented control; statement/pathway from `SimResult` + input flags (`regime.ts:33-36`) | OK; store leaves 'sunny/rainy' as soon as an input differs from the preset (`store.ts:97-100`), so labels cannot lie |
| Principle / Seasons SVGs | static illustrations of the two stated cases | acceptable, flagged in P0-2/P2 |

### 2.4 Labels, units, signs
Checked: Metric auto-tags `W_th`/`W_e` (`Metric.tsx:33-37`), `PowerDistribution`, `EnergyFlow` tags, Comparison rows, DayHistory, Carbon all consistent. ΔT = T_out - T_in in K with hints "memanas/mendingin" (`Instrumentation.tsx:81-89`). `ṁ` in kg/s derived next to L/min (`ControlPanel.tsx:126`), `betaPerK` shown as %/K while the unit string says 1/K (display overridden, fine). No mixing of °C and K for differences found. Issues only: P2 hint (Metric) and `Readouts.tsx:30` raw ΔT beside tweened values. The Sankey places incident radiation tagged `th` next to `e`; acceptable because tags are explicit.

### 2.5 Rainy-mode usefulness (honest answer)
- Physically real but modest: 698 W_th from 1.7 m2 (410 W_th/m2) at 20 K ITD and 3 m/s wind; 64 % of that exists without rain.
- Against a dry cooler it saves ~7-15 W_e after pump and PV penalty, while electrical yield is 10 W_e lower than conventional PV (30.1 vs 40.6 W_e net). It only makes sense (a) when a cooling load already exists on the roof side, (b) when the displaced device really is a chiller (return water close to or below ambient + 8 K), or (c) as a free bonus on a system that has the exchanger anyway.
- Is this communicated honestly today? Mostly in text deep down (Seasons "Yang tidak diklaim", Carbon toggle default off, `NOT_BENEFICIAL` message), but the Hero/Comparison headline numbers do not carry that caveat. See P0-1, P0-2.

## 3. Recommended physics/parameter changes (exact)

1. `presets.ts`: `coolingCOP` limits `{min: 1, max: 60, step: 0.5}`; rainy preset `coolingCOP: 30` (dry cooler) with an optional chiller toggle at 3.5; sunny `inletC: 40`.
2. `model.ts` front side: nested solve for `T_s` with `U_cg = 200` as in P1-3; profile glass = `T_s`.
3. `model.ts`: `rainEffectiveness 0.7 -> 0.5`, `rainTempOffsetK 1.5 -> 1.0`; show band eps 0.3-1.0.
4. `model.ts`: `hConv = max(2.8 + 3.0 v, 4.5)` (optional).
5. `model.ts`/UI: export attribution `q(rain=0)` for the "hujan menyumbang" line.
6. `targets.ts`: direction from `sign(qLiquidW)` when `pumpOn && |q| > minHeatFlowW`; env tone from sign; flags only dim.
7. Store/Hero: interpolate inputs and re-run `simulate()` per animation step; feed all visuals from the displayed result.
8. `carbon.ts`/`Carbon.tsx`: incremental-vs-conventional ledger, incremental embodied, rainy hours 120-250 h.
9. Copy: Hero lead and mode label (P0-2), `verdict.ts:66`, PHYSICS.md/assumptions evaporation sentence and "laminasi tanpa celah udara", Metric hints.

## 4. What I verified is right (so nobody "fixes" it)
- Optical bookkeeping: absorbed = tau-alpha G A, P_e taken out of it, `S > P_e` always; residual 1e-10.
- No heat invented without a hot source; no benefit without a load; the 5x pump margin and PV penalty are in the controller.
- Rain falls only on the front; negative terms (cold panel, warm rain) properly become sources in `EnergyFlow`.
- `waterDensity` check: 990.2 kg/m3 at 45 C (matches tables).
- Sign convention text is identical everywhere (`SignConvention`, Assumptions, Principle).
