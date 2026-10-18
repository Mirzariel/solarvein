# SolarVein

**Adaptive Solar Thermal Recovery for Low-Carbon Hospitality** — an interactive engineering demo for
HORIZON 2026 (KAMASE UGM national essay competition; final presentation 20 November, Yogyakarta).

> Status: **sedang dibangun (v2)**. This is a development version of the HORIZON 2026 entry; where it differs from
> the submitted essay, the page says so. All numbers are simulation results. There is no measured data yet.

Idea: a liquid PV/T collector on a hotel roof makes electricity and heat at once. A **value-ranked adaptive thermal
router** sends that heat where it is worth most:

1. **Hotel hot-water preheating** (primary, quantified);
2. **Desiccant regeneration** for AC dehumidification (a research hypothesis, "Hipotesis riset · belum divalidasi",
   evaluated honestly with the net HVAC balance, which can end as "tidak layak");
3. a **buffer tank** (carry-over to evening, morning and prolonged rain);
4. **bypass** when nothing is worth the heat.

The hotel never depends on the sun: the existing water heater and AC are always the backup, so only the savings
change at night or in long rain. The KPI is **net CO₂e avoided** (with energy and economics) against four baselines
at equal service: **B1** conventional hotel, **B2** PV + heat-pump water heater + efficient HVAC, **B3** PV/T hot
water only, **B4** PV + AC-condenser heat recovery. B2 or B4 may win; the page says so from the numbers.

The earlier "SolarVein Liquid" concept (one panel that collects heat when sunny and rejects heat when rainy,
Cerah/Hujan) survives only as an "evolusi ide" note in the Validasi section.

All user-facing copy is Indonesian (EYD V); references are APA 7.

## Run it

Requirements: Node 20+ (tested with Node 22). No API keys, no backend, no network at runtime.

```bash
npm install
```

```bash
npm run dev
```

Open the printed URL (the project's launch config uses port 5190).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Strict type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Type-check only |
| `npm test` | Vitest: collector model, system modules, contract, store, motion engine |
| `npm run gate` | `tsc -b && vitest run && vite build` — must be green before every merge |
| `npm run qa` | Playwright visual + functional QA (`scripts/qa/`) |

Presentation mode: `?presentasi=1` (keys ←/→, 1–8, R reset, L assumptions; `?skenario=terik|lembap|malam&jam=13`).
Export figures for the infographic/PPT: `/export?static=1`.

## What's on the page

| # | Section | Purpose |
|---|---|---|
| – | `#awal` | Opening: hotel rooftop with an array, the one idea |
| 01 | `#masalah` | Two loads of a tropical hotel: hot water and humid air, with cited numbers |
| 02 | `#sistem` | 3D collector, pull-back to the hotel roof, A/B/C switch; `#sistem-dalam` exploded walk-through |
| 03 | `#router` | Cara kerja: the router diagram (thermal, electrical, air layers) |
| 04 | `#sehari` | Sehari di hotel: 24 h scrubber, tank fill, four strategies, area sweep, "3 hari hujan" |
| 05 | `#desikan` | Jalur riset desikan: regeneration sweep, net HVAC ledger, honest verdict |
| 06 | `#dampak` | Net CO₂e waterfall vs B1–B4, energy, payback, hotel scaler |
| 07 | `#lab` | All inputs, live schematic, instrumentation, assumptions with sources |
| 08 | `#validasi` | Roadmap, KPIs, ranked risks, evidence legend, evolusi ide, references (`#pustaka`) |
| – | `#penutup` | Closing |

Progressive disclosure: L1 always visible (about 45 words per section), L2 on interaction, L3 in disclosures and the Lab.
Old hashes (`#pengalaman`, `#perbandingan`) are aliased. Below 1024 px, with reduced motion or without WebGL,
A/B/C tabs and a vertical layout replace the pinned scenes.

## Architecture (short)

```
src/
  sim/            Pure TypeScript (no React/DOM). Collector: model.ts (simulate), presets.ts, types.ts
    system/       v2 hotel system: contract.ts (public interfaces), psychro, hotel, tank, dhw, heatpump,
                  router, day (24 h / 72 h, strategies, area sweep), desiccant, carbon, economics, references
    assumptions/  documented assumptions per module, each with an evidence tag
  state/          zustand slices, memoised selectors, impact calculations
  motion/         Weather engine: interpolates sim INPUTS, runs the sim per frame -> VisualFrame
  viz3d/          React Three Fiber stage: collector on a hotel roof (one WebGL canvas)
  charts/         Day, desiccant, ledger/waterfall, baselines, energy flow
  ui/             Design-system primitives
  sections/       Page sections in order; router/tank/desiccant are flat instrument SVGs
```

Data flow: `inputs -> simulate() / simulateSystem() -> selectors / engine -> views`. Views never compute physics.
Modes A/B/C are controller states computed from irradiance, collector and tank temperature, and demand, not clock labels.
Contract: [docs/CONTRACT-v2.md](docs/CONTRACT-v2.md) and `src/sim/system/contract.ts`. Older docs
([ARCHITECTURE](docs/ARCHITECTURE.md), [PHYSICS](docs/PHYSICS.md), [DESIGN_SYSTEM](DESIGN_SYSTEM.md),
[MOTION_SYSTEM](MOTION_SYSTEM.md)) describe v1 until the cutover commit.

## Physics and accounting, in honest terms

- **η_th is never constant.** It comes from the collector model as a function of inlet (tank/return) temperature and
  irradiance. The illustrative 5 m² / 30 % / 18 % numbers appear only as a back-of-envelope check.
- **Router:** Σ allocation (hot water + desiccant + tank + bypass) = heat in the liquid, with bypass explicit.
  Static value-per-kWh_th ranking with hysteresis; it is not "carbon-aware" (Indonesia has no time-resolved grid EF).
- **Tank:** two nodes, first-law balance closes over 24 h. Standby loss is shown. Potable water is never stored at
  25–45 °C (closed buffer loop + external heat exchanger; backup keeps the top ≥ 60 °C).
- **Desiccant:** adsorption is roughly isenthalpic, so "latent removed minus heat" is not the benefit. Net =
  reference coil electricity − (after-cooler + fans on both streams + pump + PV penalty from a hotter collector).
  The verdict (layak / marginal / tidak layak) is computed, never asserted.
- **Units:** kWh_th, kWh_e and kWh_fuel are distinct types; they are never added without a displayed factor.
- **Carbon:** weighted day types for one named city (not a snapshot × hours), embodied emissions never zero for any
  case, zero collector area reproduces B1. Rainy days are not zero-sun; at night there is no collection.
- **Service:** unmet demand is 0 in every scenario. In 3 rainy days net CO₂e can be worse than B1, and the page says so.

Limitations: simulation only, no field data; an illustrative 100-room hotel and preset weather; desiccant and
heat-pump-source options are hypotheses; small differences between cases are not meaningful. Next validation steps are
in the Validasi section (5-phase roadmap, ranked risks, measurement plan).

## Quality checks

- `npm run gate` on every merge. New invariants: router sum = Q_liquid, tank closure, psychrometric round-trip,
  desiccant mass balance, night = no collection, ledger sums, zero area = B1, unit brands, ordering regression of heat uses.
- `npm run qa -- --url http://localhost:5190 --widths 1440,1280,768,390,360 --sections --checks`: real-browser screenshots,
  console errors, overflow, broken numbers, rapid switching, slider extremes, dead controls. Also check 1280×720 at 125 %.
- Copy audits: word count, evidence tags, EYD V, every number cited or tagged.

## Project skills and agents

Built with Claude Code subagents. Role definitions in `.claude/agents/`; project skills in `.claude/skills/`: the four
SolarVein skills (`sv-visual-identity`, `sv-content-reduction`, `sv-physics-validation`, `sv-adversarial-qa`) plus
installed third-party skills (frontend-design, web-design-guidelines, threejs-*, gsap-*; see `skills-lock.json`).

## Credits

Video and stills: Mixkit (Mixkit Free License), see [docs/CREDITS.md](docs/CREDITS.md). Images are illustrations
("Ilustrasi, bukan dokumentasi proyek"); no real installation or hotel brand is depicted. 3D renders come from this
project's own model. Fonts: Geist and Geist Mono (SIL OFL), self-hosted via Fontsource. Competition: HORIZON 2026,
KAMASE UGM. The site is `noindex` and labelled a development version of the entry.
