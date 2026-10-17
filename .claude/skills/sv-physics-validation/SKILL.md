---
name: sv-physics-validation
description: Validate that SolarVein v2's system model, labels and every visual tell the physical and accounting truth — collector η_th(T_in, G), controller modes A/B/C, router allocation, tank first-law closure, desiccant net HVAC balance, kWh_th/kWh_e/kWh_fuel factors, baselines B1–B4, embodied carbon, service guarantee, Legionella. Use this whenever src/sim/** changes, whenever an animation, arrow, colour, chart, verdict, statement or unit label touches heat, water, air, electricity or carbon, before approving any visual that depicts heat flow, and whenever someone claims a benefit (saving, carbon, efficiency, dehumidification) — even for "just a visual tweak".
---

# SolarVein physics validation (v2)

Concept: liquid PV/T on a hotel roof → value-ranked adaptive thermal router → DHW preheat (primary, quantified) +
desiccant regeneration (research hypothesis, "Hipotesis riset · belum divalidasi") + buffer tank + bypass. Hotel
service never depends on the sun. A jury member will look for: a constant efficiency, heat counted twice, kWh_th
added to kWh_e, a weak baseline, a desiccant "saving" that ignores the after-cooler, and animations that show heat
the model never computed. This skill is the checklist and the tooling to catch them.

## 1. Run the automated checks

```bash
npx vitest run src/sim                                              # model, system, router, tank, desiccant, carbon, contract
npx tsc -b --noEmit
bash .claude/skills/sv-physics-validation/scripts/visual-coupling.sh   # where visuals read mode/flag state instead of computed quantities
```

Residuals < 0.5 W (collector) and tank closure within tolerance; no NaN anywhere. `it.fails` tests document known
gaps; a fixed gap is flipped to `it`. The ordering regression (value per kWh_th: DHW ≥ PV→compressor > desiccant at
35–55 °C) is locked by a test: if it changes, the page states the new ordering and a human reviews.

## 2. Binding invariants (verify with numbers, not intuition)

**Collector**
- η_th is never constant. Thermal output comes from `simulate()` at the actual inlet (tank/return) temperature and
  irradiance. The illustrative 5 m² / 30 % / 18 % figures appear only as a back-of-envelope check next to the model's number.
- Energy conservation: absorbed = P_e + q_liquid + q_front + q_back. Second law: nothing leaves above T_out; HX duty ≤ ε·C_min·ΔT.
- Heat flows cell → liquid only (harvest). Liquid flows inlet → outlet. Harvest needs T_cell > T_liquid; T_in > T_glass gives no harvest.
- PV efficiency falls with temperature; hotter regeneration set-points cost PV electricity (ΔPV is a real term).
- ṁ → 0 or G = 0 → residual ≈ 0. Night = no collection (pump off, q_liquid = 0).

**Controller and router**
- Modes A/B/C are computed states from G, T_collector, T_tank and demand — never clock labels. A = heat available;
  B = weak sun/humid, stored heat only, desiccant usually unavailable; C = no collection, tank discharge only.
  Labels name conditions, not outcomes.
- Router: Σ allocation (dhw + desiccant + tank + bypass) = Q_liquid when the pump runs; bypass is an explicit
  sink, never a silent remainder. Valve fractions Σ = 1. Switches/day bounded (hysteresis).
- G = 0 or collector not warmer than tank + ΔT → pump off, no cooling of the tank through the collector.
- "Value-ranked" means a static ranking of value per kWh_th with hysteresis. Never call it "carbon-aware" (no time-resolved EF in Indonesia).

**Tank and DHW**
- Two-node tank, first-law closure over 24 h and 72 h: ΔU = charge − discharge − losses (|error| small, tested).
- Standby loss is real (≈ 1–2,5 kWh/day for 1–2 m³) and shown. Sunless worst case = B1 minus standby/parasitics.
- Service guarantee: unmet demand = 0 in every scenario; existing heater and AC are always the backup.
- Legionella: potable water is never stored at 25–45 °C. Closed buffer loop + external HX; backup keeps the top node ≥ 60 °C or pasteurises.
- DHW saving depends on the displaced heater (LPG / electric resistance / heat pump). Never quote one number without it.

**Desiccant (research path)**
- Adsorption is ~isenthalpic. "Latent removed − adsorption heat" is NOT the benefit.
- Net HVAC = coil_ref − (after-cooler + fans on both streams + regeneration pump + ΔPV from the hotter collector). All terms displayed.
- Reference = cooling coil to a dew point ≈ 10–12 °C at its (low-evaporating) COP; desiccant case = hot dry supply
  (+8–12 K) → high-temperature after-cooler at a higher COP.
- Isotherm uptake × cycle-effectiveness (range 0,3–0,6 with source), bed sensible reheat, 10–30 min cycle,
  fresh air per ASHRAE 62.1. Regeneration air is an option (ambient vs exhaust ≈ 25 °C, lower w); T_regen sweep 35–70 °C
  shows where it starts to work. Mass balance ±1 %. Swing ≈ 0 at 35 °C with ambient regeneration air.
- Verdict (layak / marginal / tidak-layak) is computed from the net, never asserted or defaulted. The sentence
  "Desikan tidak menguntungkan pada kondisi ini." appears when net ≤ 0. Composite salt-in-matrix = hypothesis band, no number.
- Autonomy = bed mass × Δq / removal rate. A saturated bed → ordinary coil takes over; comfort holds, savings vanish.
- Status is always "Hipotesis riset · belum divalidasi". No phrase may imply the desiccant is proven.

**Units, baselines, carbon**
- kWh_th, kWh_e, kWh_fuel are branded; never added without a displayed factor (heater η, COP, EF). Each carbon row shows its factor.
- Baselines give equal service (same DHW at setpoint, same electricity demand, same humidity): B1 conventional hotel,
  B2 PV + HPWH + efficient HVAC, B3 PV/T DHW only, B4 PV + AC-condenser heat recovery. B2/B4 may beat SolarVein; the
  verdict sentence is generated from the numbers. B2 heat credit < B1 credit.
- Embodied carbon is never zero (PV/T per m², BOS, tank/HX, desiccant unit, and the baselines' HPWH/PV/refrigerant).
- Zero collector area reproduces B1 exactly. Ledger rows sum to the headline; the desiccant row is excluded from the
  headline until validated and labelled so.
- Annual numbers use ≥ 3 weighted day types for a named city (not snapshot × 1400 h). Rainy days are NOT zero-sun
  (diffuse ≈ 1,5–3,5 kWh/m²/day); report wet-season sensitivity.
- Multi-day rain: net CO₂e ≥ −(standby + parasitics + annualised embodied); the page says plainly it can be worse than B1.

**Heat-pump source option (night/rain)**
- Value it by work, not avoided fuel: Q_cond/COP; COP ≤ Carnot × fraction (0,4–0,5); work ≥ 0. Compare incrementally
  with B2's air-source HPWH (may be negative). Condensation is a bounded optional term, "upper bound, not validated".

## 3. Visual ↔ physics mapping (inspect each animated element)

| Element | Must be driven by | Must never |
|---|---|---|
| Router branch width | allocation W_th per sink, total width held ∝ Q_liquid; vanishes at night | stay "on" when Q_liquid = 0; exceed the total |
| Liquid packets | pump on/off + flow, inlet → outlet along arc length | move when the pump is off; reverse |
| Heat arrows (3D) | cell → liquid, length ∝ live q_liquid; absent at night | point out of the liquid; animate with no computed q |
| Valves / destination | `RouterState` fractions with actuator lag | snap from a mode flag or clock |
| Tank fill | `TankState.soc` from the cached day | be integrated per frame by the view |
| Desiccant branch | dashed (not validated); active only if regeneration > 0 | look solid/proven; run when T_regen < threshold |
| Dehumidified supply air | computed moisture removed | show when the bed is saturated |
| Electricity | P_e, pump/fan W_e, ink colour | share amber/cool colour or shape with heat |
| Sky / weather | `ClimatePoint` of the scenario | imply zero light on rainy days or heat with no G |
| Statements, verdicts | computed numbers, generated | assert a winner or a benefit the numbers don't show |

Colour = medium, shape = destination: amber = heat in the liquid; solid = delivered; tank outline + fill = stored;
**dashed = not yet validated** (desiccant, heat-pump source); grey = bypass; `cool` only for dehumidified supply
air and moisture; regeneration exhaust `ink-2`; electricity = ink. A mode switch interpolates inputs and re-runs the
sim every frame — every intermediate frame is a real state. No animation may show heat the sim does not compute.

## 4. Labels & units

kWh_th vs kWh_e vs kWh_fuel always distinguished and never silently summed; emission factor shown next to carbon;
ΔT in K; temperatures °C; decimal comma; every number carries an evidence tag; each section declares once that
numbers are simulation results; header badge "Simulasi · belum ada data ukur".

## Historical note

The v1 concept (Cerah/Hujan, heat rejection, rain cooling, dry-cooler valuation) is retired. Its physics survives in
`model.ts` only for the heat-pump-source option and the "evolusi ide" note. Do not reintroduce rejection as a claim.

## Report format

Prioritised list: P0 physically wrong / misleading · P1 questionable or overstated · P2 wording. Each item:
evidence (numbers from a script or test, file:line), why it matters to a jury reviewer, concrete fix (equation,
parameter or code change). Sign off explicitly when nothing P0/P1 remains.
