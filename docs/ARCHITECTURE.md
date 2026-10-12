# SolarVein Liquid - Architecture

> **Post-redesign update.** Sections are now Opening → 01 Pengalaman (Hero) → 02 Di dalam (Inside) → Dampak (Impact)
> → 03 Lab → 04 Perbandingan → Penutup. New since this document was written: `src/motion/` (weather engine: a GSAP
> timeline interpolates the sim inputs and runs `simulate()` per frame into a `VisualFrame` consumed by 3D effects and
> throttled readouts — the one sanctioned place outside selectors that calls the sim), `src/state/impact.ts`
> (Dampak scaler), per-stage 3D stores (`src/viz3d/stage.tsx`), `Schematic` (SVG cross-section reused in the Lab and
> as the no-WebGL fallback). Recharts sections receive a deferred/throttled input copy so slider drags stay cheap;
> off-screen WebGL stages render 0 frames. See README.md and MOTION_SYSTEM.md for the current picture.

Interactive engineering site for a dual-mode photovoltaic-thermal (PVT) collector.
Stack: Vite 8, React 19, TypeScript 5.9 (strict, `noUncheckedIndexedAccess`), Tailwind v4,
three + React Three Fiber 9 + drei 10, recharts 3, zustand 5, vitest 5.

## 1. Stack rationale

**React Three Fiber for the centerpiece (not SVG).** The collector is a layered object
(glass, cells, interface, absorber, serpentine channel, insulation) that users orbit, explode and
cut in cross-section. That needs real depth, occlusion, lighting and per-frame animated flow
(particles along a 3D serpentine). Doing this in SVG means faking projection by hand and
re-rendering thousands of DOM nodes. R3F gives a declarative scene graph that composes with React
state, and drei supplies controls, helpers and `<Html>` labels.
**Fallback:** `useWebGLAvailable()` feature-detects WebGL once. When it is `false` (or the 3D chunk
fails), Hero renders a static/animated SVG cross-section driven by the same store and `SimResult`,
so no information is lost.

**zustand for state.** The state is small, global and read from distant places (3D canvas, control
panel, charts). zustand gives selector-based subscriptions (no provider re-render storms), works
outside React (render loops, tests in a node environment via `useStore.getState()`), and needs no
boilerplate. Context would re-render every consumer on each slider tick; Redux is excessive here.

**recharts for 2D data.** Declarative, React-native, SVG output (accessible, themeable with CSS
variables), adequate for the volume of data (13 hourly points, a handful of bars). It lives in
lazy chunks so it never blocks first paint.

**Tailwind v4** (CSS-first tokens in `src/index.css`) for styling; design primitives live in `src/ui`.

## 2. Folder map

```
src/
  sim/            Pure physics. No React, no DOM. Owner: physics. (types.ts is the contract.)
  state/          zustand store (store.ts), memoised derived hooks (selectors.ts), tests.
  hooks/          useReducedMotion, useWebGLAvailable, useInView, useMediaQuery.
  viz3d/          R3F scene, geometry contract (dims.ts), effects/ (flow, heat arrows).
  charts/         recharts wrappers for instrumentation/comparison/carbon.
  ui/             Design-system primitives (buttons, sliders, cards, readouts).
  sections/       Page sections in page order; one file per section (+ hero/ subfolder).
  ErrorBoundary.tsx, App.tsx, main.tsx
docs/             CONTRACT.md (binding), ARCHITECTURE.md, PHYSICS.md, DESIGN.md
```

## 3. Data flow

```
 UI controls (ControlPanel, mode switcher)
        |  setMode / setInput
        v
 zustand store  --  inputs: SimInputs   (always clamped)
        |            mode: sunny | rainy | lab
        |  clampInputs()  (src/sim/model.ts)  inside every write
        v
 selectors.ts   getSimResult / getComparison / getDayProfile   (WeakMap cache keyed by `inputs` reference)
        |  simulate(), compareConfigurations(), simulateDay(), computeCarbon()
        v
 hooks: useSimResult()  useComparison()  useDayProfile(s)  useCarbonResult()
        v
 views: Hero (3D + readouts) | Instrumentation | Comparison | Carbon | Assumptions
```

Viewer state (exploded, cross-section, layer visibility, flow/heat toggles, auto-rotate,
`focusLayer`) lives in the same store but is independent of physics; changing it never triggers a
simulation.

## 4. State ownership

| State | Owner | Notes |
|---|---|---|
| `mode`, `inputs` | store | `setMode('sunny'/'rainy')` loads a preset; `'lab'` keeps current inputs. `setInput` clamps and flips to `'lab'` as soon as inputs depart from the active preset. |
| viewer (`exploded`, `crossSection`, `layerVisibility`, `showFlow`, `showHeatArrows`, `autoRotate`, `focusLayer`) | store | Read by `viz3d` and by the control panel / legend. |
| `carbon` | store | `CarbonAssumptions`; edited in the Carbon section. |
| `comparisonScenario` | store | `'current' | 'sunny' | 'rainy'`. |
| Derived physics | selectors | Never stored; recomputed once per `inputs` reference and shared. |
| Ephemeral UI (hover, open accordions, tooltips) | component `useState` | Not global. |

Rules: store state is replaced immutably (reference identity is the change signal); components
subscribe to slices (`useStore(s => s.exploded)`), never to the whole store.

## 5. Integration boundaries

- `src/sim` is pure and UI-free: no imports from React, DOM, three or the store. It is the single
  source of every displayed number (golden rule 7).
- Views never compute physics. They call the selector hooks and format the result.
- `viz3d` receives data via props or store slices; it does not import `sim` internals.
- The store imports only `sim` (inputs, presets, clamp, carbon defaults) and the `LayerId` /
  `LAYERS` constants from `viz3d/dims.ts` (pure data, no three import).
- Section files are default exports with a stable section id (`hero`, `prinsip`, `instrumentasi`,
  `perbandingan`, `musim`, `karbon`, `asumsi`) for header anchors.

## 6. Performance strategy

- **Code splitting:** Instrumentation, Comparison, Carbon are `React.lazy` + `Suspense` (they pull
  recharts). The three/R3F code is loaded by Hero (itself lazy-loading the Canvas). Recommended
  `manualChunks`: `three` (three, @react-three/fiber, @react-three/drei) and `recharts`
  (recharts + d3-*).
- **Memoised physics:** one `simulate` per inputs change, shared by all consumers
  (WeakMap cache in `selectors.ts`).
- **3D:** `dpr={[1, 2]}` cap, `frameloop="demand"` when idle/reduced-motion, pause the render loop
  when Hero is offscreen (`useInView`), instanced/merged geometry for flow particles, no
  per-frame allocations.
- **Charts:** disable animation when offscreen or reduced motion; mount only when in view.
- **Reduced layout shift:** lazy sections show a min-height placeholder.

## 7. Accessibility strategy

- "Lewati ke konten utama" skip link; `<main id="konten">` is focusable.
- Semantic landmarks (header, main, footer) and one `h1` (Hero).
- `useReducedMotion()` disables auto-rotate, flow particles and chart animation; static states
  still convey regime via text.
- The 3D canvas is not the only carrier of information: the regime statement, readouts and an SVG
  or table equivalent are always in the DOM; the canvas has an `aria-label`.
- All controls are native inputs with labels, keyboard operable, visible focus rings.
- Colour is never the only signal (regime has text and icon).
- User-facing text is Indonesian (`lang="id"`).
- `ErrorBoundary` shows an Indonesian `role="alert"` fallback with retry.

## 8. Testing strategy

- `vitest` in a node environment (`src/**/*.test.ts`).
- `src/sim/*.test.ts`: physics invariants (energy balance, sign convention, flow direction,
  monotonic trends, preset sanity).
- `src/state/store.test.ts`: preset loading, clamping, lab switching, reset, viewer toggles,
  selector cache identity. Uses zustand directly via `useStore.getState()`, no DOM.
- Visual/interaction behaviour is verified manually in the browser; `npm run typecheck` and
  `npm run build` gate every change.
