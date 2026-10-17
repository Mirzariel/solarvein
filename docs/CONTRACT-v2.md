# SolarVein v2 — Team Contract (lead-owned)

Concept: **Adaptive Solar Thermal Recovery for Low-Carbon Hospitality** (HORIZON 2026). Liquid PV/T collector
→ value-ranked adaptive thermal router → hotel DHW preheat (primary, quantified) + desiccant regeneration
(research hypothesis, "Hipotesis riset · belum divalidasi") + buffer tank + bypass. KPI: net CO₂e avoided,
net energy and economics vs baselines B1 conventional hotel, B2 PV + HPWH + efficient HVAC, B3 PV/T DHW only,
B4 AC-condenser heat recovery for DHW. The approved plan is the source of truth for scope.

The old `docs/CONTRACT.md` (dual-mode Cerah/Hujan) is history: the v1 code was removed at the cutover.

## Binding interfaces
- Collector: `src/sim/model.ts` `simulate(SimInputs, CollectorConfig)` (configs: `'pvt-liquid'` harvest-only, `'conventional-pv'`).
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

## Wave 2 (UI) interface — lead-owned
- State: `src/state/system.ts` (`useSystemStore`: sys, hotelPreset, scenario, strategy, hour, modeTarget, dayView,
  desiccantRegenC, regenAir, presentation, scene + actions). The v1 store was removed at the cutover; per-stage 3D viewer state lives in `src/viz3d/stage.tsx`.
- Selectors: `src/state/systemSelectors.ts` — `useSystem, useSystemView, useDeferredSystemView, useDay, useStep,
  useRouterSnapshot, useYear, useBaselines, useAreaSweep, useDesiccantSweep, useHeatUses`. Views call only these.
- View helpers & labels: `src/sim/system/views.ts`, `labels.ts` (LABELS, DESICCANT_STATUS, SIM_BADGE, DESICCANT_NOT_BENEFICIAL).
- Section registry: `src/sections/nav.ts` (SECTIONS, SECTION, HASH_ALIASES, resolveHash, PRESENTATION_SCENES).
  Each section renders `<section id={…}>` with the id from nav.ts and `SectionHeader index={{n, label}}`.
- `App.tsx`, `nav.ts`, `index.css`, `src/ui/**`, `charts/{theme,format,ChartCard}`, `state/system.ts`,
  `state/systemSelectors.ts`, `sim/system/index.ts` are LEAD-ONLY. Need a change? Put it in your report.
- Styling: Tailwind utilities + existing tokens only. Section-specific CSS goes in a co-located `<Section>.css`
  imported by that section — never edit index.css. No new colours; follow .claude/skills/sv-visual-identity.
- Copy: Indonesian, EYD V, rules in .claude/skills/sv-content-reduction. Numbers through `src/ui/numberFormat.ts`.
- Every number on screen carries its evidence tag (see sv-visual-identity evidence dots) where it is first shown.
