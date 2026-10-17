# SolarVein v2 — Team Contract (lead-owned)

Concept: **Adaptive Solar Thermal Recovery for Low-Carbon Hospitality** (HORIZON 2026). Liquid PV/T collector
→ value-ranked adaptive thermal router → hotel DHW preheat (primary, quantified) + desiccant regeneration
(research hypothesis, "Hipotesis riset · belum divalidasi") + buffer tank + bypass. KPI: net CO₂e avoided,
net energy and economics vs baselines B1 conventional hotel, B2 PV + HPWH + efficient HVAC, B3 PV/T DHW only,
B4 AC-condenser heat recovery for DHW. The approved plan is the source of truth for scope.

The old `docs/CONTRACT.md` (dual-mode Cerah/Hujan) stays valid for v1 code until the cutover commit.

## Binding interfaces
- Collector: `src/sim/model.ts` `simulate(SimInputs, CollectorConfig)` (W1 adds `'pvt-liquid'`).
- System: **`src/sim/system/contract.ts`** — read it fully before writing code. It lists every public
  function signature per module at the bottom.
- Barrel: `src/sim/system/index.ts` (lead only).

## Golden rules (v2)
1. Every displayed number comes from `src/sim/**` (pure TS). Views never compute physics.
2. η_th is never constant — always from `simulate()` at the actual inlet (tank/return) temperature.
3. kWh_th, kWh_e and kWh_fuel are distinct branded types; never added without a displayed factor.
4. Controller modes A/B/C are computed states (conditions), never clock labels; labels name conditions, not outcomes.
5. Service guarantee: existing heater + AC are always the backup → unmet demand = 0 in every scenario.
6. Rainy days are not zero-sun (diffuse irradiance); night has no collection.
7. Desiccant benefit = reference coil electricity − (after-cooler + fans + pump + PV penalty). Adsorption is ~isenthalpic;
   "latent removed" alone is not a saving. Verdict layak / marginal / tidak-layak is computed, never asserted.
8. Every user-facing claim carries an `EvidenceTag`; published values carry a `refId` from `src/sim/references.ts`.
9. B2 (and B4) may beat SolarVein; the verdict sentence is generated from numbers, no default winner.
10. Potable water is never stored at 25–45 °C (closed buffer loop + external HX; heater top ≥ 60 °C).
11. User-facing text: natural Indonesian, EYD V, no "kami", no hype.

## Workflow
- Each worker works in its own git worktree `C:\Users\LENOVO\Downloads\solarvein\wt\<name>` on branch `wt/<name>`,
  with `node_modules` junctioned to the lead's install. **Never run `npm install`.**
- Edit only the files you own (see plan ownership table). Need a change elsewhere? Report it; do not edit.
- Before reporting: `npx tsc -b` and `npx vitest run <your test paths>` must pass; the full `npx vitest run` must
  not regress. Commit on your branch (message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Do not push.
