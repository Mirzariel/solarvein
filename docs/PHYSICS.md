# SolarVein Liquid — Physics Model

> **v1 (historis).** Dokumen ini menggambarkan konsep lama "dual-mode Cerah/Hujan" (panen panas + pembuangan panas)
> yang sudah dihapus dari kode pada cutover v2. Disimpan sebagai riwayat; jangan dipakai sebagai kontrak.
> Kontrak berlaku: [CONTRACT-v2.md](CONTRACT-v2.md). Fisika berlaku: [physics/collector.md](physics/collector.md),
> [physics/desiccant.md](physics/desiccant.md), [physics/carbon.md](physics/carbon.md). Neraca energi, ε-NTU, pompa, stagnasi, dan batas kondensasi di `src/sim/model.ts` tetap berlaku; bagian pembuangan panas, atribusi hujan, dan pendingin pengganti dihapus.

Source of truth: `src/sim/model.ts` (constants in `MODEL_CONSTANTS`). This document describes what the code does and why.
It is an **educational conceptual model**, not validated CFD and not field data.

## 1. Scope and sign convention

One collector node, one liquid circuit, two possible directions of **heat** flow.

| Quantity | Sign |
|---|---|
| `qLiquidW > 0` | panel → liquid (**harvest**) |
| `qLiquidW < 0` | liquid → panel → environment (**rejection**) |
| `qFrontLossW`, `qRainW`, `qBackLossW > 0` | heat leaves the panel to the environment |

The liquid **always** flows inlet → outlet (`massFlowKgS > 0` whenever the pump runs). Only the sign of `qLiquidW`
(and therefore of `T_out − T_in`) changes. Thermal W and electrical W are never summed without an explicit
conversion (boiler efficiency, cooling COP).

## 2. Energy balance (steady state, lumped node)

**Hardware class.** The modelled collector is a PV laminate with a glass front **bonded to the cells with no air
gap** (3.2 mm glass + EVA), i.e. an *unglazed-class* PVT ("kelas tanpa kaca penutup berongga"): the front surface
exchanges heat directly with air and sky. A truly glazed collector (glass cover with a sealed air gap in front of an
absorber) is a much weaker radiator/convector to the environment — with a two-surface gap (h_gap ≈ 3 + 5.7 W/m²K)
the preset-rainy rejection would be ≈ 80–85 % smaller (≈ −100 W instead of −550 W, audit estimate). Results
for rejection in this document do **not** apply to glazed flat-plate PVT.

Unknown: panel/cell temperature `T_p` (PV cells and absorber treated as one isothermal node) and the glass outer
surface temperature `T_g`, linked by the series resistance of glass + EVA (`U_cg = 200 W/m²K`):

```
T_p = T_g + (Q_conv(T_g) + Q_rad(T_g) + Q_rain(T_g)) / (A·U_cg)        ← front heat flows cell → glass → environment
S − P_e(T_p) − Q_front(T_g) − Q_rain(T_g) − Q_back(T_p) − Q_liq(T_p) = 0
```

`T_g ↦ T_p` is explicit and strictly increasing (front heat is increasing in `T_g`), so there is **no nested solve**:
the balance is solved by **bisection on `T_g ∈ [−60, 400] °C`** (≈ 39 halvings to 1e-9 K; one `simulate()` ≈ 0.02 ms
including the pump-on, pump-off and dry-attribution solves). The left-hand side is strictly decreasing in `T_g`
(loss slopes ≥ ~20 W/K per m² dominate the +β·η·G term ≤ ~1 W/K per m²), so the root exists, is unique and the solver
cannot return NaN. `energyBalanceResidualW` is reported as `S − (P_e + Q_liq + Q_front + Q_rain + Q_back)` evaluated
from the returned values (typically ≤ 1e-7 W). `T_g` is the `glass` node in the profile and the cell temperature
`cellC = T_p` is `(Q_front + Q_rain)/(A·U_cg)` ≈ 1–3 K above it.

### 2.1 Absorbed power and PV output

- `S = (τα)·G·A`, **τα = 0.88** (glass-front laminate; Duffie & Beckman give 0.80–0.92 for covered absorbers).
  `opticalLossW = G·A − S`.
- `P_e = max(0, η_ref·[1 − β(T_p − 25)])·G·A` (linear temperature model, Skoplaki & Palyvos 2009, with
  `η_ref` at STC and `β ≈ 0.35 %/K` for crystalline silicon; their review gives 0.004–0.005 /K). The electrical
  energy is taken out of the absorbed energy (`S > P_e` always since `η_ref ≤ 0.24 < τα`).
- `etaElectrical = P_e/(G·A)` (0 when G = 0).

### 2.2 Front surface (air + sky)

- Convection: `h_conv = 2.8 + 3.0·v` W/(m²K) (Watmuff, Charters & Proctor 1977; Duffie & Beckman §3).
  **Deviation from the brief:** the McAdams value `5.7 + 3.8·v` already contains the radiative exchange of the test
  plate, so adding a separate radiation term would double-count. Watmuff's form is the convective part only.
- Convection, radiation and rain all act on the **glass surface temperature `T_g`**, not on the cell:
  `Q_conv = A·h_conv·(T_g − T_amb)`.
- Radiation: `Q_rad = A·ε·σ·(T_g⁴ − T_sky⁴)`, `ε = 0.90`. Reported as an effective
  `h_rad = Q_rad / (A·(T_g − T_sky))` (≈ 4εσT³ ≈ 5–7 W/m²K). The exact fourth-power form keeps the balance monotone.
- Glass/encapsulant: `U_cg = 200 W/m²K` (3.2 mm glass k ≈ 1 W/mK → 313; EVA 0.5 mm k ≈ 0.35 → 700; series ≈ 215),
  exposed as `coefficients.uCellGlass` (optional field).
- Effective sky temperature `T_sky = T_amb − ΔT_sky`. Dry: **6 K** (humid tropical sky; clear dry skies can reach
  10–20 K, Swinbank-type correlations). Rain (and the accompanying cloud cover) reduces it linearly to **1 K** at
  `R ≥ 5 mm/h` (cloud base ≈ ambient). Documented simplification: dry-but-overcast conditions are treated as clear sky.

### 2.3 Rain (sensible heat only)

```
ṁ''_rain = R[mm/h] / 3600            [kg/(m²s)]   (1 mm = 1 kg/m²)
T_rain   = T_amb − 1.0 K              (≈ wet-bulb temperature of a drop in air of RH ≈ 90–95 %)
Q_rain   = ε_rain · ṁ''_rain · c_w · A · (T_g − T_rain),   ε_rain = 0.5
h_rain   = ε_rain · ṁ''_rain · c_w    (exposed in coefficients.hRain; 8.7 W/m²K at 15 mm/h; full-equilibration bound 17.4)
```

`ε_rain` is the fraction of the drop heat capacity that equilibrates with the glass (thin film, short contact, runoff,
splash). This is an engineering approximation, **not a universal validated correlation**.

**Evaporation is not modelled, and the reason is not that it is negligible.** Evaporation from a wet film depends on
the vapour-pressure difference between the *wet surface* and the air, not on the air's relative humidity alone: a film
at 40 °C (p_sat ≈ 7.4 kPa) in 25 °C / 95 % air (p_v ≈ 3.0 kPa) has a large driving potential (hundreds of W/m² by the
Lewis analogy at the given h_conv); the real film is cooler than the panel, so the actual flux is much smaller, but it
can be of the same order as the sensible term. Omitting it therefore most likely **under-estimates** rain cooling and adds
uncertainty on top of ε_rain. Also not modelled: splash/film-flow enhancement of convection, drop impact, panel tilt
(rain taken as normal to the surface). Rain falls on the front only.

**Uncertainty band (rainy preset, pump on).** Varying only ε_rain (0.3 → 1.0) gives `q_liquid` ≈ −485 W … −692 W around the
central −550 W (ε = 0.5), i.e. −12 % / +26 %; the same inputs with rain = 0 give −411 W. Rain is thus responsible for
about one quarter of the rainy-preset rejection; the rest comes from wind (3 m/s) and radiation to the sky (and exists at
night/dry). Hence `SimResult.qLiquidNoRainW` (optional): `q_liquid` recomputed with `rainMmH = 0`, same pump state,
everything else equal — one extra solve, only when `rain > 0` and the pump runs. The rain contribution is
`qLiquidW − qLiquidNoRainW`.

### 2.4 Back surface

- PVT (`pvt-harvest-only`, `solarvein-dual`): insulated, `Q_back = A·U_back·(T_p − T_amb)`, **U_back = 1.0 W/m²K**
  (≈ 50 mm mineral wool, k ≈ 0.04 → 0.8, plus edge losses).
- `conventional-pv`: open rear, `Q_back = A·[0.8·h_conv·(T_p − T_amb) + ε_b·σ·(T_p⁴ − T_amb⁴)]`, ε_b = 0.85
  (rear convection reduced to 80 % of the front value for the sheltered side; rear radiates to ground/ambient).
  The effective U_back is then ≈ 10–12 W/m²K.

### 2.5 Liquid circuit (ε–NTU, panel isothermal vs. stream)

```
ρ(T_in) = 1000 − 0.0178·|T_in − 4|^1.7     (±0.3 % for 10–80 °C),  c_p = 4180 J/kgK
ṁ = ρ·V̇,   NTU = U_pf·A / (ṁ c_p),   ε = 1 − exp(−NTU)
Q_liq = ε·ṁ·c_p·(T_p − T_in),            T_out = T_in + Q_liq/(ṁ c_p)
```

`Q_liq` is increasing in `T_p`, so it stays inside the monotone balance. For `T_in > T_p` it is negative: the liquid
heats the panel (rejection). Pump off ⇒ `Q_liq = 0`, `massFlow = 0`, `T_out := T_in`, `NTU := 0`.
The ε–NTU form assumes `T_p` uniform (infinite capacity stream on the panel side), which is a good approximation
for a high-conductance absorber plate with parallel risers.

### 2.6 Pump

```
ΔP = ΔP_ref·(V̇/V̇_ref)²,  V̇_ref = 2 L/min         (turbulent / minor-loss dominated loop)
P_pump = ΔP·V̇/η_pump + 1.0 W                        (fixed drive electronics/valve while running)
```

Pump off ⇒ 0 W (the always-on controller standby is *not* counted). Pump heat dissipated into the water is neglected
(< 3 W). At 10 L/min with the default 20 kPa reference, the quadratic law gives hundreds of W — intentionally
punishing, to show why flow must be moderate.

## 3. Configurations and controller

`stagnationC` = `T_p` for the same hardware with pump off (conventional: its own `T_p`).
The pump-on and pump-off cases are both solved for PVT; the controller compares them.

| Config | Hardware | Pump logic (`pumpControl = 'auto'`) |
|---|---|---|
| `conventional-pv` | no exchanger, open rear | never; regime `idle`, `qLiquidW = 0`; `'on'` is ignored (advisory) |
| `pvt-harvest-only` | PVT, insulated | on iff **harvest worthwhile**; never rejects |
| `solarvein-dual` | same PVT hardware | on iff harvest worthwhile **or** rejection worthwhile |

Thresholds (`MODEL_CONSTANTS`): `minHeatFlowW = 20 W`, `harvestToPumpRatio = 5`.

- **harvestWorth** = `heatLoadAvailable` ∧ `Q_liq > 20 W` ∧ `Q_liq/η_boiler ≥ 5·P_pump`
  (avoided fuel power vs pump electricity; the 5× margin reflects that electricity is a higher-value carrier than
  fuel heat and that thermal gains are less certain).
- **rejectWorth** = `hotSourceAvailable` ∧ `Q_liq < −20 W` ∧ `|Q_liq|/COP − P_pump > 0` ∧ the same net benefit
  *after* the PV loss caused by the panel running hotter (`(P_e,on − P_e,off) < 0`) is still positive.
  (`netCoolingBenefitW` in the result is the contract definition `avoidedCooling − pump`; the controller is stricter.)
  **The value depends on the displaced equipment (`coolingCOP`).** For a loop only ~20 K above ambient the realistic
  baseline is a fan-driven dry cooler (COP ≈ 20–40; cooling tower fan + pump ≈ 15–30), *not* a chiller (≈ 3–4). The
  rainy preset uses COP 30; at COP 3.5 the same rejected heat would look ~10× more valuable. `INPUT_LIMITS.coolingCOP`
  is 1–60 so the honest baseline can be entered.
- Forced `'on'`/`'off'` (Lab mode) overrides the controller.

**Regime** (pump on): `harvest` if load ∧ `Q > 20`; `reject` if hot source ∧ `Q < −20`; else `negligible`
(every `negligible` result carries a `NEGLIGIBLE_EXCHANGE` advisory plus the specific reason). Pump off ⇒ `idle`.

**Valuation:** `usefulHeatW = Q_liq` only if pump on ∧ load ∧ `Q > 0`; `heatRejectedW = −Q_liq` only if pump on ∧
hot source ∧ `Q < 0`. No hot source ⇒ `heatRejectedW = 0` always (heat is never invented).
`avoidedFuelW = usefulHeatW/η_boiler`; `avoidedCoolingElecW = heatRejectedW/COP`; `netCoolingBenefitW = avoidedCoolingElecW − pumpW`.

Forced pump with no load and no source: a real closed loop would drift to the panel temperature. We keep the input
`T_in`, count zero benefit, and raise `LOOP_NO_ENDPOINT`.

### Advisories

`LOW_IRRADIANCE` (G < 150), `NO_EXCHANGER`, `PUMP_IGNORED`, `STAGNATION_HOT` (pump off, stagnation 75–100 °C;
critical > 95 °C), `STAGNATION_BOILING` (critical; pump off, stagnation > 100 °C — water may boil and build steam
pressure: use glycol/high-temperature fluid, a pressure relief valve, or keep the loop running), `PUMP_FORCED_OFF`, `NO_HOT_SOURCE`, `NO_HEAT_LOAD`, `REJECTION_NOT_BENEFICIAL`
("Pendinginan tidak menguntungkan pada kondisi ini."), `PUMP_EXCEEDS_BENEFIT`, `HARVEST_ONLY_NO_REJECTION`,
`LOOP_NO_ENDPOINT`, `NEGLIGIBLE_EXCHANGE`. Sorted critical → warning → info.

## 4. Temperature profile (diagnostic only; no feedback into the balance)

Order front → back: `sky, ambient, glass, cell, absorber, fluid, back` (conventional PV omits `absorber`/`fluid`).

- glass = `T_g` (the solved glass surface temperature; `T_p − (Q_front + Q_rain)/(A·U_cg)`, `U_cg = 200 W/m²K`).
- cell = `T_p`.
- absorber = `T_p − (Q_back + Q_liq)/(A·U_ca)`, `U_ca = 400 W/m²K` (hotter than the cell when rejecting).
- fluid = `(T_in + T_out)/2` pump on; = absorber pump off.
- back (PVT) = `T_amb + Q_back/(A·8)`; back (conventional) = `T_p − Q_back/(A·100)`.

## 5. Day profile (`simulateDay`)

Hourly points 6…18, each an independent steady solve (**quasi-steady**; thermal mass neglected, so it cannot represent
a passing cloud or the thermal lag of a hot panel). Illustrative only.

- `cerah`: `G = 900·sin(π(h−6)/12)`, ambient 26 °C (06) → 33 °C (14) → 29 °C (18) by half-cosine segments, no rain.
- `hujan`: peak 250 W/m² (cloud-attenuated), further × (1 − 0.35·min(1, R/15)) during rain; rain 6/14/22/10/4 mm/h
  at 13–17 h; ambient 24.5 → 27.5 (12 h) → 24 °C.
- Everything else (inlet, flow, area, load/source flags, wind…) comes from the `base` inputs.

## 6. Carbon

`electricity = P_e·h/1000·EF_grid`; `heat = avoidedFuelW·h/1000·EF_fuel`; `cooling = avoidedCoolingElecW·h/1000·EF_grid`
only if `coolingDisplacementModeled`; `pump = pumpW·h/1000·EF_grid`; `net = electricity + heat + cooling − pump`;
`payback = embodied/net` (∞ if net ≤ 0). Defaults: grid **0.8** kgCO2e/kWh (Indonesian grid ≈ 0.75–0.9 depending
on year/system), LPG **0.23** kgCO2e/kWh_fuel (≈ 63 kg/GJ), **1400 h/yr** full-load-equivalent, embodied
**450 kgCO2e** (range 400–600 for a ~1.7 m² PVT: PV module ~200, Cu/Al exchanger, insulation, pump, controller).
All user-adjustable, all approximate. Note `electricalW` is gross PV output.

**Incremental ledger.** `computeCarbon(r, a, baseline?)`: with `baseline` = the `conventional-pv` result for the same inputs,
`incrementalNetKgPerYear = net − (P_e,conv − 0)·h/1000·EF_grid` and
`incrementalPaybackYears = incrementalEmbodiedKg / incrementalNetKgPerYear` (∞ if ≤ 0), with
`incrementalEmbodiedKg` (default **180**, range 100–250: exchanger, insulation, pump, controller). This isolates what the
exchanger adds beyond the plain PV module, whose own credit dominates the gross total.

**Hours are scenario-dependent.** 1400 h/yr (default) is sensible for the sunny snapshot. A heavy-rain snapshot
(≈ 15 mm/h) occurs only ≈ 120–250 h/yr (1400 h × 15 mm/h would be 21 m of rain per year versus ≈ 2 m real);
`CARBON_HOURS_GUIDANCE` documents `sunny` 1400 (1200–1600) and `rainyHeavy` 180 (120–250).

## 7. Calibration and sanity numbers

- **NOCT-like check** (test): conventional PV, G = 800, T_amb = 20 °C, v = 1 m/s ⇒ T_cell = 45.0 °C (target 42–48).
- **Sunny preset** (G 900, 32 °C, 1.5 m/s, T_in 40 °C (DHW preheat return), 2 L/min, 1.7 m²): regime harvest,
  T_cell 45.9 °C (stagnation 74.6 °C, conventional PV 56.1 °C), T_in 40 → T_out 45.0 °C, Q_liq ≈ 687 W (η_th ≈ 45 %),
  P_e ≈ 284 W (vs 273 W conventional), pump ≈ 3.2 W. (At T_in 30 °C: ≈ 57 % and a larger PV gain — too flattering for a
  DHW loop; the efficiency falls steeply as the tank warms.)
- **Rainy preset** (G 120, 25 °C, 15 mm/h, 3 m/s, T_in 45 °C, 3 L/min, displaced device = dry cooler COP 30): regime reject,
  T_cell 41.2 °C (glass 39.3 °C; stagnation 27.9 °C), T_in 45 → T_out 42.3 °C, Q_liq ≈ −550 W (without rain −411 W,
  rain term ≈ 226 W), P_e ≈ 38.5 W, pump ≈ 8.5 W, net cooling benefit ≈ **+10 W_e** at COP 30 (≈ +149 W_e if the baseline
  were a chiller at COP 3.5). The cell is *warmer* than its stagnation value: rejection raises PV temperature (small
  electrical penalty), and conventional PV out-produces the dual collector in electricity here; the point is cooling
  the process loop, and only if no cheaper way to do that already exists.

## 8. Parameter ranges (INPUT_LIMITS)

G 0–1200 W/m²; T_amb 10–45 °C; rain 0–60 mm/h; wind 0–10 m/s; T_in 10–80 °C; flow 0.3–10 L/min; A 0.5–4 m²;
U_pf 30–600 W/m²K (sheet-and-tube / roll-bond PVT plates ≈ 100–300 once fin efficiency and bond are included);
ΔP_ref 2–80 kPa; η_pump 0.1–0.6; η_ref 0.15–0.24; β 0.0025–0.005 /K; η_boiler 0.5–1.0; COP 1–60 (dry cooler ≈ 20–40, cooling tower ≈ 15–30, small chiller ≈ 3–4).

## 9. Limitations

1. Steady state, single node: no thermal mass, no gradients along the flow path or across the plate.
2. Rain cooling is a simple sensible-heat approximation (ε_rain = 0.5, band 0.3–1.0 ⇒ −485…−692 W on the rainy preset),
   evaporation (likely under-estimated cooling) and film enhancement omitted; quantitatively uncertain.
   Hardware is an unglazed-class laminate; glazed collectors with an air gap would reject ≈ 80–85 % less.
3. Dry overcast skies are treated as clear (ΔT_sky = 6 K); wind is taken as given at the panel.
4. Water properties fixed (c_p), density from a simple correlation; no freezing/biofilm, and stagnation above 100 °C is
   flagged (`STAGNATION_BOILING`) but not modelled as boiling.
5. τα, U_back, U_pf, U_cg, emissivities are typical values, not a specific product.
6. Rejection value depends on the assumed displaced device (`coolingCOP`: dry cooler 20–40 ≫ chiller 3–4 in kWh_e terms);
   without a real hot source there is no benefit.
7. In dry, load-less conditions an insulated PVT is hotter and produces less electricity than conventional PV —
   conventional PV can be the better choice, and the model reports it.
8. Controller thresholds (20 W, 5×) are engineering judgements, not optimised values.

## References

- Duffie, J. A. & Beckman, W. A., *Solar Engineering of Thermal Processes*, Wiley (ε–NTU/absorber, τα, loss coefficients).
- Skoplaki, E. & Palyvos, J. A., "On the temperature dependence of photovoltaic module electrical performance", *Solar Energy* 83 (2009) 614–624.
- Watmuff, J. H., Charters, W. W. S. & Proctor, D., "Solar and wind induced external coefficients for solar collectors", *Revue Internationale d'Héliotechnique* (2nd semester 1977) 56; McAdams, W. H., *Heat Transmission*, 3rd ed. (1954).
- NOCT definition: IEC 61215 / IEC 60904 (800 W/m², 20 °C, 1 m/s, open rack ⇒ typically 43–47 °C).
- Incropera & DeWitt, *Fundamentals of Heat and Mass Transfer* (ε–NTU, radiative exchange).
