# SolarVein Liquid

**Satu panel. Dua arah panas.** An interactive engineering experience for a dual-mode
photovoltaic-thermal (PVT) collector: the same PV panel and rear liquid heat exchanger either
**collect** heat (sunny: sun → PV/absorber → liquid → useful heat load) or **reject** heat (a warm
process-water loop → liquid → panel → air, sky and rain) — depending on the temperatures and the
thermal load, never on a mode flag.

SolarVein is a conceptual implementation of established PVT physics, not a new discovery. The site is an
**educational conceptual simulation** — not CFD, not field-validated, not a certified performance tool.

All user-facing copy is Indonesian.

## Run it

Requirements: Node 20+ (tested with Node 22). No API keys, no backend, no network at runtime.

```bash
npm install
```

```bash
npm run dev
```

Then open the printed URL (the project's launch config uses port 5190).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Strict type-check (`tsc -b`) + production build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | Type-check only |
| `npm test` | Vitest: physics model, carbon, day profile, store, motion engine, review regressions |
| `npm run qa` | Playwright visual + functional QA (see below) |

## What's on the page

| Section | Purpose |
|---|---|
| Pembuka (`#awal`) | Cinematic opening photo + the one idea |
| 01 Pengalaman (`#pengalaman`) | The interactive 3D collector on a roof; Cerah/Hujan switch; live statement and L1 readouts |
| 02 Di dalam SolarVein (`#di-dalam`) | Exploded inspection stage with four clickable parts and live values |
| Dampak (`#dampak`) | "Jika N atap…" scenario scaler, computed from the simulation, incremental vs. conventional PV |
| 03 Lab rekayasa (`#lab`) | Every input as a precision slider, live schematic, energy flow, temperature profile, day history, engineering details on demand |
| 04 Perbandingan kinerja (`#perbandingan`) | Conventional PV vs. PV + liquid cooling vs. SolarVein, with an honest computed verdict |
| Penutup (`#penutup`) | Closing line |

Progressive disclosure: level 1 (regime, heat direction, W_e, W_th) is always visible; level 2 (inlet/outlet,
pump, advisories) on interaction; level 3 (equations, assumptions, coefficients, carbon ledger, limitations) in
disclosures.

## Architecture (short)

```
src/
  sim/        Pure physics (no React/DOM): model.ts, presets.ts, day.ts, carbon.ts, assumptions.ts, types.ts (contract)
  state/      zustand store, memoised selectors, impact (Dampak) calculations
  motion/     Weather engine: GSAP timeline interpolates the sim INPUTS, simulate() per frame → VisualFrame
  viz3d/      React Three Fiber stage: collector, roof context, studio lighting, flow, labels, Schematic (SVG)
    effects/  Heat arrows, rain, sunlight, electrical pulses, ambient mood — all driven by the VisualFrame
  charts/     Energy flow (Sankey), temperature profile, day history, comparison bars, verdict logic
  ui/         Design-system primitives (SegmentedControl, Slider, Readout, Disclosure, Picture, …)
  sections/   Page sections in order (Opening, Hero, Inside, Impact, Lab, Comparison, Closing, header/footer)
```

Data flow: `inputs → clampInputs → simulate() → selectors / weather engine → views`. Views never compute
physics. During a Cerah↔Hujan change the engine interpolates the inputs (staggered, ~0.75–1.1 s) and runs
`simulate()` every frame (~0.02 ms), so every intermediate visual is a real computed state; heat arrows fade
out through q = 0 and reappear reversed only when the computed sign flips.

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md),
[MOTION_SYSTEM.md](MOTION_SYSTEM.md), [docs/PHYSICS.md](docs/PHYSICS.md).

## Physics model and assumptions

Steady-state, single lumped panel node solved by bisection on the energy balance
`S − P_e − Q_front − Q_rain − Q_back − Q_liquid = 0`, with:

- `P_e = G·A·η_ref·[1 − β(T_cell − 25)]`, τα = 0.88.
- Front losses act on the solved glass-surface temperature through a laminate resistance U_cg ≈ 200 W/m²K;
  Watmuff wind convection `h = 2.8 + 3.0·v`; exact radiation to an effective sky temperature.
- Rain: sensible heat only, `h_rain = ε·(R/3600)·c_w` with ε = 0.5 (uncertainty band 0.3–1.0 shown in the Lab).
  Evaporation is neglected, which probably understates rain cooling. **Rain alone does not create useful cooling.**
- Liquid side: ε-NTU with `NTU = U_pf·A/(ṁ·c_p)`; `Q_liquid = ε·ṁ·c_p·(T_panel − T_in)`.
  Sign convention: `+` = heat into the liquid (harvest), `−` = heat out of the liquid to panel and environment
  (rejection). The liquid always flows inlet → outlet.
- Pump: `P = ΔP·V̇/η + 1 W`, ΔP ∝ V̇².
- Rejection is counted only when a real warm source exists and is worth more than its pump and PV penalty against
  the displaced cooling equipment. The default baseline is a fan-driven dry cooler (COP 30), **not** a chiller.
  Otherwise the page shows "Pendinginan tidak menguntungkan pada kondisi ini."
- Carbon: incremental vs. conventional PV, with configurable emission factors, hours and embodied emissions (never zero).

Sanity numbers (presets, 1.7 m² module):

| | Cerah (harvest) | Hujan (rejection, warm loop) |
|---|---|---|
| T_cell | 45,9 °C (stagnant 74,6; conventional PV 56,1) | 41,2 °C |
| T_in → T_out | 40 → 45,0 °C | 45 → 42,3 °C |
| Q_liquid | +687 W_th | −550 W_th (rain ≈ ¼ of it) |
| P_e | 284 W_e | 38,5 W_e |
| Net cooling benefit | — | ≈ +7,8 W_e vs. dry cooler incl. PV penalty (≈ +149 W_e only if a chiller were displaced) |

Conventional PV wins in realistic cases (low irradiance, no heat load, high pump ΔP), and the comparison
section says so.

### Limitations

Single-node steady state (no thermal mass except in the illustrative day profile); rain heat transfer is an
unvalidated approximation; the glass-front laminate behaves like an unglazed-class PVT (a glazed, air-gap
collector would reject roughly 80–85 % less); no low-light derate; no CFD, no field data. Full list:
[docs/PHYSICS.md §9](docs/PHYSICS.md) and the Lab's "Rincian rekayasa".

**Next validation steps:** an instrumented prototype (T_in/T_out, flow, irradiance, cell temperature), ISO 9806
thermal and IEC 61215 electrical testing, rain heat-transfer measurements on a wet glass laminate, long-term
monitoring of a real warm-water loop.

## Quality checks

- `npm test`: physics invariants (energy residual < 0.5 W over a > 10 000-case grid, no NaN, monotonicity, sign
  and flow-direction invariants, the not-beneficial state), carbon ledger, impact scaler, motion engine
  (monotone transitions, no overshoot), and independent reviewers' regression tests in `src/sim/review/`.
- `npm run qa -- --url http://localhost:5190 --widths 1440,1280,768,390,360 --states sunny,rainy --sections --checks`:
  real-browser screenshots (system Chrome/Edge via `playwright-core`; WebGL on the real GPU by default), console
  errors, overflow, broken numbers, rapid mode switching, slider extremes, dead controls.
- Audit trail: [docs/audit/](docs/audit/) (before/after screenshots, independent reviews), [DESIGN_AUDIT.md](DESIGN_AUDIT.md).

## Project skills and agents

Built with Claude Code subagents (Sonnet). Role definitions live in `.claude/agents/`; project skills in
`.claude/skills/` — the four SolarVein skills (`sv-visual-identity`, `sv-content-reduction`,
`sv-physics-validation`, `sv-adversarial-qa`) plus installed third-party skills (frontend-design,
web-design-guidelines, threejs-*, gsap-*; see `skills-lock.json`).

## Credits

Video and stills: Mixkit (Mixkit Free License) — see [docs/CREDITS.md](docs/CREDITS.md). Media are context
illustrations (stated in their alt text); no real SolarVein installation is depicted. 3D renders are made from this project's own model.
Fonts: Geist and Geist Mono (SIL OFL), self-hosted via Fontsource.
