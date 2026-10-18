# SolarVein - Architecture (v2)

Interactive engineering site for **Adaptive Solar Thermal Recovery for Low-Carbon Hospitality** (liquid PV/T roof array
on a 100-room hotel -> adaptive thermal router -> DHW preheat, desiccant research path, buffer tank, bypass).
Contract: [CONTRACT-v2.md](CONTRACT-v2.md). Physics: [physics/](physics/). The v1 "dual-mode Cerah/Hujan" documents
(CONTRACT.md, PHYSICS.md) are history; the v1 code was removed at the cutover.

Stack: Vite 8, React 19, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), Tailwind v4, three + React Three Fiber 9 +
drei 10, recharts 3, zustand 5, GSAP + Lenis, vitest 5.

## Folder map

```
src/
  sim/                Pure TypeScript. No React, DOM or three.
    model.ts          Collector: simulate(SimInputs, 'pvt-liquid' | 'conventional-pv') -> SimResult
                      (energy balance, eps-NTU, pump, stagnation, condensation bound). types.ts = contract.
    presets.ts        DEFAULT_INPUTS, INPUT_LIMITS.   reference.ts = static reference state of the walk-through.
    system/           Hotel system: climate, tank, router, DHW, desiccant, carbon, economics, day/annual
                      simulation, views.ts (cached SystemView). Barrel: system/index.ts (lead only).
    __tests__/        Collector physics invariants.  system/__tests__/golden.test.ts pins the v2 numbers.
  state/
    system.ts         useSystemStore: user choices + view state only (sys, scenario, strategy, hour, mode target...).
    systemSelectors.ts  Memoised hooks over getSystemView(): useDay, useStep, useYear, useBaselines, ...
    systemEngineBinding.ts  Binds the store to the visual clock.
  motion/             systemEngine.ts = the app-wide visual clock (`weather` in engine.ts): springs/GSAP between
                      DayResult steps, calls simulate() per frame -> VisualFrame (frame.ts). hooks.ts = readers.
  viz3d/              R3F collector + hotel roof. stage.tsx = per-stage store (framing, exploded, layers, focus part).
                      Schematic.tsx = SVG cutaway, the no-WebGL fallback (reads the live frame).
  sections/           Page sections in page order (nav.ts has ids/numbering) + per-section subfolders.
  charts/ export/ presentation/ ui/ hooks/ content/
docs/                 CONTRACT-v2.md (binding), ARCHITECTURE.md, MOTION-v2.md, physics/*.md, audit/ (history)
```

## Data flow

```
 controls (Hero/Lab/Router...)  -- setModeTarget / setScenario / setHour / setSys -->  useSystemStore
        |                                                                                  |
        |                                              getSystemView(sys)  (LRU, simKey/fullKey caches)
        |                                                  simulateSystem / simulateYear / compareBaselines
        v                                                                                  v
  systemSelectors hooks  <---------------------------------------------------------  DayResult / AnnualResult
  (text, charts, tables)                                                                   |
                                                                                           v
                                               motion/systemEngine (store subscription): target = DayStep at `hour`
                                               -> VisualFrame { result: simulate(visual inputs), router, climate }
                                                                  |
                                          3D effects, DOM-painted readouts, Schematic fallback (no React render per frame)
```

Rules: views never compute physics; every displayed number comes from `src/sim/**`. The engine is the one sanctioned
caller of `simulate()` outside `sim/` (it runs on every animation step). Viewer state of a 3D stage (explode, cross
section, layer visibility, focus/hover part, framing) is stage-local (`createStageStore`), so two stages on one page
never interfere. Controller modes A/B/C are computed states, never clock labels.

## Performance

- `React.lazy` sections and a lazy WebGL chunk (three/R3F); recharts in lazy chunks.
- Annual and area-sweep simulations are cached per `simKey` and shared across views; sections that sit below the
  fold read a deferred system view so slider drags stay cheap.
- 3D: demand-driven frame loop, off-screen stages render 0 frames, no per-frame allocations in effects.
- Reduced motion snaps every transition; no-WebGL falls back to the SVG cutaway with the same live numbers.

## Testing

`npx tsc -b && npx vitest run && npx vite build` gate every change (`npm run gate`).
- `sim/system/__tests__/golden.test.ts`: v2 outputs (4 scenarios x 3 strategies, annual totals, B1..B4 ledgers,
  desiccant sweep, collector states) to 1e-6 relative. Never re-record it to make a refactor pass.
- `sim/__tests__/`: collector invariants (energy closure, flow vs heat direction, independent solver, glass series
  resistance, rain term bounds, eta_th vs T_in, pump, stagnation).
- Visual/interaction checks: `scripts/qa/*` (Playwright) and the `sv-adversarial-qa` skill.
