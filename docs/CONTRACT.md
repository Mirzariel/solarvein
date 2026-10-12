# SolarVein Liquid — Team Contract (lead-owned)

Stack (pre-installed, do not change versions): Vite 8, React 19, TypeScript 5.9 strict
(`noUncheckedIndexedAccess` on), Tailwind CSS v4 (CSS-first, `@import 'tailwindcss'` in `src/index.css`),
three 0.186 + @react-three/fiber 9 + @react-three/drei 10, recharts 3, zustand 5, vitest 5.

Commands: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`.

## Golden physics rules (every module)
1. One panel, one liquid circuit, two possible directions of **heat** flow.
2. Liquid **always** flows inlet → outlet. Never reverse flow animation when heat reverses.
3. Sign convention: `qLiquidW > 0` panel→liquid (harvest); `< 0` liquid→panel→environment (rejection).
4. Never add W_th and W_e into one number without an explicit, displayed conversion.
5. Rejection only counts when `hotSourceAvailable` and liquid is meaningfully warmer than the panel.
   Otherwise show: **"Pendinginan tidak menguntungkan pada kondisi ini."**
6. Modes (Cerah / Hujan) are input **presets**, not separate physics. Same equations always.
7. No fake numbers: every displayed number comes from `src/sim/*`.
8. All user-facing text in natural Indonesian (standard English engineering terms allowed).

## Public module API (signatures are binding)

`src/sim/types.ts` — lead-owned contract (read it first).

`src/sim/presets.ts` (Agent 1)
- `DEFAULT_INPUTS: SimInputs`
- `PRESETS: Record<'sunny' | 'rainy', SimInputs>`
- `type NumericInputKey` = numeric keys of `SimInputs`
- `INPUT_LIMITS: Record<NumericInputKey, { min: number; max: number; step: number; unit: string; label: string; help: string }>`

`src/sim/model.ts` (Agent 1)
- `clampInputs(i: SimInputs): SimInputs`
- `simulate(i: SimInputs, config?: CollectorConfig /* default 'solarvein-dual' */): SimResult`
- `compareConfigurations(i: SimInputs): Record<CollectorConfig, SimResult>`

`src/sim/day.ts` (Agent 1)
- `type DayScenario = 'cerah' | 'hujan'`
- `simulateDay(base: SimInputs, scenario: DayScenario, config?: CollectorConfig): DayPoint[]` (hourly 6..18)

`src/sim/carbon.ts` (Agent 1)
- `DEFAULT_CARBON: CarbonAssumptions`
- `computeCarbon(r: SimResult, a: CarbonAssumptions): CarbonResult`

`src/sim/assumptions.ts` (Agent 1)
- `ASSUMPTIONS: { id: string; title: string; body: string; value?: string }[]` (Indonesian)
- `LIMITATIONS: string[]` (Indonesian)

`src/sim/index.ts` (Agent 1) — barrel re-exporting all of the above + types.

`src/state/store.ts` (Agent 2) — zustand store: `mode: 'sunny' | 'rainy' | 'lab'`, `inputs`,
viewer state (exploded, cross-section, per-layer visibility, show flow/heat), carbon assumptions,
actions (`setMode`, `setInput`, `reset`, …) + `useSimResult()` memoised selector hook.

`src/viz3d/dims.ts` — geometry contract (Agent 4 owns after creation).

## File ownership (only edit files you own; read anything)
| Owner | Files |
|---|---|
| Lead | `src/sim/types.ts`, `docs/CONTRACT.md`, `package.json` scripts, `vite.config.ts`, final README |
| Agent 1 Physics | `src/sim/**` (except types.ts), `docs/PHYSICS.md` |
| Agent 2 Architecture | `src/state/**`, `src/hooks/**`, `src/App.tsx`, `src/main.tsx`, `tsconfig*.json`, `docs/ARCHITECTURE.md`, stub files for wave-2 sections (overwritten later by their owners) |
| Agent 3 Creative | `src/index.css`, `src/ui/**`, `src/sections/SiteHeader.tsx`, `src/sections/Principle.tsx`, `src/sections/Seasons.tsx`, `src/sections/SiteFooter.tsx`, `docs/DESIGN.md` |
| Agent 4 3D | `src/viz3d/**` except `src/viz3d/effects/**` |
| Agent 5 Motion | `src/viz3d/effects/**`, `src/sections/Hero.tsx`, `src/sections/hero/**`, `src/sections/ControlPanel.tsx` |
| Agent 6 Data viz | `src/sections/Instrumentation.tsx`, `src/sections/Comparison.tsx`, `src/sections/Carbon.tsx`, `src/sections/Assumptions.tsx`, `src/charts/**` |

Dependencies: do not hand-edit package.json. If you truly need a new package, run `npm install <pkg>`
and mention it in your report. Avoid running `npm install` while another agent may be doing so.

## Page structure (top → bottom)
1. `SiteHeader` — slim nav.
2. `Hero` — interactive 3D collector occupies most of the first viewport + mode switcher
   (Cerah / Hujan / Lab Manual) + regime statement + key readouts; in Lab mode the `ControlPanel`
   sits beside the model so sliders and model are visible together.
3. `Principle` — the one insight: same exchanger, heat direction set by temperatures + load.
4. `Instrumentation` — live metrics, energy-flow diagram, temperature gradient, power distribution, day history.
5. `Comparison` — conventional PV vs PVT harvest-only vs SolarVein dual.
6. `Seasons` — El Niño / La Niña mechanism diagrams.
7. `Carbon` — configurable decarbonisation analysis.
8. `Assumptions` — engineering assumptions & limitations.
9. `SiteFooter` — disclaimer (educational conceptual simulation, not validated CFD/field data).
