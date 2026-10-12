# 04 - Performance and accessibility audit (Agent H, Phase 1)

Scope: read-only audit. Evidence scripts are in the session scratchpad; screenshots are in `docs/audit/perf/`.

## 0. Method and caveats (read first)

- **Two builds were measured.** The codebase changed under the audit.
  - **v1 snapshot**: production build (`vite build`) of the pre-redesign source, served statically. Used for the full measurement matrix, the accessibility scans and the mobile scans.
  - **Current**: dev server `localhost:5190` after the design-system and 3D rebuild landed. Re-measured only the cheap things (frame intervals, renderer.info, offscreen behaviour, slider cost, reduced motion, touch-action, overflow at 390).
  - Each finding is tagged **[current]** (reproduced or still true in the current source) or **[superseded]** (fixed or removed by the rebuild).
- **SwiftShader numbers are CPU-rendered.** Headless Chrome ran software GL on a 16-thread laptop that was also running other agents (about 60% CPU load). The absolute FPS values (2 to 10 fps) say nothing about GPU hardware.
  - Use them only for relative comparisons and to find main-thread hotspots. The CDP ScriptDuration / TaskDuration / long-task numbers are main-thread JS and are meaningful.
  - Dev builds (jsxDEV, createTask, logComponentRender) inflate React cost roughly 2x. Where it matters, the v1 production build is quoted.
- **Instrumentation**, observation only, injected via `addInitScript`:
  - rAF interval recorder, PerformanceObserver (longtask, layout-shift), MutationObserver.
  - A fake React DevTools hook that counts commits for react-dom and R3F separately.
  - WebGL `draw*` wrappers (draw calls, triangles, rendered frames).
  - CDP `Performance.getMetrics`.
  - `renderer.info` via the dev-only `window.__sv3d` hook on the current build, and via a `Map.prototype.set` capture of the R3F store on v1.
- **Environment flake**: 1 of 3 cold loads under CPU contention landed in the SVG fallback instead of the 3D canvas. The probe context creation failed transiently and `detectWebGL()` cached `false` (see P2-7).

## 1. Measurements

### 1.1 Frame cadence, 5 s windows, 1440x900, DPR 1

SwiftShader, relative only. `GL fps` is frames where a draw call happened.

| Scenario | Build | rAF fps | p50 / p95 / max ms | GL fps | draws / tris per frame | Main busy | Long tasks (n / ms) | React commits/s (dom / r3f) | Hero DOM mutations/s |
|---|---|---|---|---|---|---|---|---|---|
| Idle hero, sunny | v1 prod | 7.8 | 133 / 150 / 150 | 8.0 | 32 / 40.9k | 12% | 0 | 0 / 0 | 3.2 |
| Idle hero, sunny | current dev | 2.4 | 283 / 317 / 317 | 2.6 | 73 / 36.9k | 14% | 0 | 0.2 / 0.2 | 10.3 |
| Idle hero, rainy (rain, flow, arrows) | v1 prod | 7.7 | 133 / 133 / 150 | 7.9 | 35 / 48.6k | 10% | 0 | 0 / 0 | 4.2 |
| Idle hero, rainy | current dev | 2.4 | 217 / 300 / 300 | 2.6 | 75 / 43.9k | 21% | 0 | 0.2 / 0.2 | 10.3 |
| Orbit drag on canvas | v1 prod | 6.4 | 150 / 167 / 517 | 6.6 | 33 / 39.8k | 13% | 0 | 0.4 / 1.0 | 20.9 |
| Orbit drag on canvas | current dev | 3.8 | 267 / 317 / 317 | 4.0 | 49 / 28.9k | 9% | 0 | 0 / 0 | 23.9 |
| Rapid Cerah<->Hujan every 300 ms | v1 prod | 2.8 | 250 / 967 / 967 | 3.0 | 59 / 33k | 45% | 11 / 1674 | 9.2 / 2.1 | 109 |
| Rapid Cerah<->Hujan every 300 ms | current dev | 0.5 | 833 / 1033 / 1033 | 0.6 | 107 / 38k | 66% | **10 / 7683** | 2.0 / 0.9 | 27 |
| Lab slider, keyboard arrows | v1 prod | 2.6 | 500 / 567 / 567 | 2.8 | 92 / 36k | 88% | 26 / 2955 | 18.9 / 6.0 | 340 |
| Lab slider, synthetic 60 Hz drag | v1 prod | 1.7 | 567 / 717 / 717 | 1.9 | 74 / 32k | 36% | 10 / 1831 | 5.6 / 2.1 | 133 |
| Lab slider, synthetic 60 Hz drag | current dev | 0.6 | 1850 / 2000 / 2000 | 0.7 | 90 / 32k | 89% | **6 / 4932** | 1.9 / 0.6 | 63 |
| Scrolled to charts (hero offscreen) | v1 prod | 43.5 | 17 / 50 / 100 | **43.7** | 29 / 25.6k | 89% | 10 / 738 | 0 / 0 | 16.5 |
| Hero fully offscreen, 2nd window | current dev | 55 | 16.7 / 16.8 / 83 | **0** | 0 / 0 | 51% (non-GL) | 1 / 69 | 0 / 0 | 0 |

Reading the table:

- On v1 the offscreen hero kept rendering at 14 to 58 GL fps. **Fixed on the current build [superseded]**: `frameloop="never"` when out of view gives 0 frames and 0 draws after a short wake-down (`CollectorCanvas.tsx:87`).
- The visible stage still never sleeps **[current]**: GL fps equals rAF fps while idle. See P1-1.
- Slider drag and rapid mode switching are dominated by main-thread JS, not the GPU **[current]**: `scriptMsPerSec` is 570 to 850 and long tasks total 5 to 7.7 s per 5 s window. See P0-1 and P0-2.

### 1.2 Cost per input event, baseline-subtracted (`ticks.mjs`, 60 slider ticks @80 ms, Lab mode, all sections mounted)

| Build | Hero visible: script ms/tick | Hero scrolled away: script ms/tick |
|---|---|---|
| v1 prod | **86** (layout+style 8) | 84 |
| current dev (about 2x React-dev inflation) | **770** | 275 |

- A single slider tick costs more than 5 frames at 60 fps even in v1 production.
- The current build is much worse in dev. I have not measured current production, so the 770 ms figure is partly dev overhead; treat it as a regression flag, not a final number.
- The v1 production profile of a 5 s drag split as follows:
  - recharts chunk 527 ms (59%).
  - react-dom plus app 360 ms.
  - three 80 ms.
  - `getBoundingClientRect` 193 ms (about 19 ms per tick, recharts text measurement forcing layout).
  - GC 65 ms.
- The current dev profile of a drag (14 s sampled):
  - jsxDEV / createElement / ReactElement about 30%.
  - `(program)` 50%.
  - `TempLabels.tsx:36` (per-frame projection sink) 572 ms self.
  - `model.ts:145` simulate 106 ms.

### 1.3 Simulation cost (node, `bench-sim.mjs`)

| Call | Cost |
|---|---|
| `simulate()` | 28 to 32 us (10,000 calls = 0.3 s) |
| `compareConfigurations` | 70 us |
| `simulateDay` (cerah / hujan) | 420 / 176 us |
| `computeCarbon` | 0.4 us |
| Full slider-tick bundle (sim + compare + 2 day profiles) | 0.51 ms |

- Physics is about 0.5% of a 16.7 ms frame. Re-running `simulate()` per animation step (the brief's interpolation hint) is safe. The cost is all rendering and React, not physics.

### 1.4 Renderer cost (`renderer.info`)

| Build | Draw calls | Triangles | Geometries | Textures | Programs |
|---|---|---|---|---|---|
| v1 | 32 | 40.7k | 47 | 5 | 16 |
| Current, sunny | 70 | 36.5k | 58 | 14 | 20 |
| Current, rainy | 73 | 44.0k | 59 | 15 | **29** |

- Draw calls more than doubled.
- Programs rise 20 to 29 on the first switch to rain, so shaders compile on the main thread at that moment.
- The v1 fill-rate scaling experiment (`fill.mjs`, SwiftShader) shows the renderer is fragment-bound:

| Canvas | Frame time |
|---|---|
| 0.16 MP | 50 ms |
| 0.23 MP | 67 ms |
| 0.48 MP | 100 ms |
| 0.72 MP (DPR 2 at 720 wide) | 167 ms |
| 1.46 MP (DPR 2 at 1440 wide) | 250 ms |

- That is about 170 to 200 ms per megapixel. Pixel count (DPR, MSAA, shadow map, transparent overdraw) is the lever, not triangle count.
- Current tiers (`quality.ts:24-28`): high = DPR 2 and a 4096 px shadow map, chosen for any viewport of 1024 px or more without reduced motion (`CollectorCanvas.tsx:61-63`). A 1440 px retina display renders about 2.1 MP with MSAA and a 4096 px shadow map on first frame.

### 1.5 Memory

- Idle heap growth is 0.1 to 0.45 MB/s with 1 to 4 GC drops per 5 s, i.e. about 30 KB per rendered frame.
- The allocation sampler on the current dev build attributes the idle churn to `cloneUniforms` (112 KB), `Matrix4`, WebGLLights and uniform parsing inside three's own render path, plus React dev. I found no per-frame allocations in the app `useFrame` code. The earlier v1 effects used pooled `Object3D` / `Color` refs.
- Under input load heap grows 4 to 6 MB/s (React trees: charts and Hero). It is collected, with no leak seen: heap returned to baseline after the load stopped.

### 1.6 Layout shift and load

- CLS, v1 desktop: **0.023** total, a single shift at about 0.5 s. Source: the hero `SECTION` / mode-switch `inline-flex` / `NAV` area, after `useMediaQuery(..., true)` resolves.
- CLS, mobile v1: 0.0002 at 390, 0.031 at 360, 0.0015 at 768. CLS, current at 390: 0.049 (still "good", under 0.1).
- Load long tasks (v1 dev, desktop): 933 ms at 0.6 s and 1810 ms at 2.3 s (dev build, SwiftShader).
- v1 production bundle (gzip): `index` 95.5 kB, `three` 265.9 kB, `charts` (recharts) 114.9 kB, `CollectorCanvas` 12 kB, `Instrumentation` 10 kB, `Comparison` 5 kB, `Carbon` 4 kB.
- The hero's 3D chunk (about 280 kB gz) is the gating download for first meaningful 3D. There is no preload or prefetch hint.
- Console: `THREE.Clock: This module has been deprecated` (from the library, harmless).

## 2. Prioritised issues

### P0

**P0-1. One input change re-renders the entire page; slider drag is unusable. [current]**
- Evidence: 86 ms of main-thread script per slider tick in v1 production, 770 ms in current dev (hero visible) and 275 ms with the hero scrolled away. A 60 Hz drag produced 0.6 to 1.9 fps and long tasks of 2 to 5 s per 5 s window.
- Root causes:
  1. Every consumer subscribes to the whole `inputs` object, so each tick re-renders all of them synchronously.
     - `state/selectors.ts:60-64` (`useSimResult` / `useComparison` / `useDayProfile` / `useCarbonResult` select `s.inputs`).
     - Consumers: `Hero.tsx:38`, `Instrumentation.tsx:30` (4 recharts charts plus metrics), `Comparison.tsx:92`, `Carbon.tsx`, `Assumptions.tsx:56`, `Inside.tsx:19`, `ControlPanel.tsx`, `viz3d/CollectorStage.tsx:123`, `PartAnnotations.tsx:23`, `Schematic.tsx:116`, `TempLabels.tsx:28`.
     - The dev fiber-render count was about 300 component renders per tick. Most are recharts internals (TickItem, Text, Shape, Bar*, Label*, Cartesian*, ZIndex*), and they run even when the charts are offscreen.
  2. Recharts measures text per tick via `getBoundingClientRect` (about 19 ms per tick of forced layout in v1 production).
  3. `sections/hero/useAnimatedNumber.ts:21-34` calls `setValue` in a rAF loop per `AnimatedMetric`. After every change, 8 independent rAF loops re-render `Metric` at display rate for 500 ms, and during a drag they never stop. This is the "React state updates in rAF" pattern the brief forbids.
- Fix (in order of payoff):
  - **(a)** Below-fold readers use a deferred or throttled copy of the inputs. Create `useThrottledInputs(hz = 6)` or `useDeferredValue(inputs)` in `selectors.ts` and use it in `Instrumentation`, `Comparison`, `Carbon`, `Assumptions`, `Inside` and `DayHistory`. Pass the immediate value only to the Hero readouts and the 3D.
  - **(b)** Gate each chart section with `useInView` (as `DayHistory` already does) and render a fixed-height placeholder when offscreen. Wrap chart bodies in `React.memo` keyed on the numbers they plot.
  - **(c)** Replace `useAnimatedNumber` with a ref-driven shared ticker: one rAF, direct `textContent` writes into the `.num` spans, no `setState`. The reduced-motion path writes instantly (already the behaviour).
  - **(d)** Wrap `LimitSlider` in `React.memo` and pass stable `onChange` handlers. `ControlPanel` re-renders the whole panel on each tick because it calls `useSimResult` itself (`ControlPanel.tsx:74`).
  - Target: at most 1 commit of under 4 ms per tick in the hero path.

**P0-2. Mode switching and first rain hitch the main thread (long tasks of 1.7 to 7.7 s per 5 s of rapid switching). [current]**
- Evidence: see 1.1. Programs jump 20 to 29 when rain first appears (1.4). `setMode` loads a preset instantly, so the inputs step in one commit, which re-renders everything in P0-1 plus the rain, arrows and ambient-mood shaders.
- Root causes:
  - Rain, ripple and arrow materials compile lazily on first use.
  - The input step triggers the full re-render of P0-1.
- Fix:
  - Warm up at idle after first paint: mount rain, arrow and pulse meshes once with `visible=false` and call `gl.compile(scene, camera)` (or `useThree().gl.compileAsync`), so the programs exist before the first switch.
  - Drive the switch by interpolating the inputs over about 1 s and re-running `simulate()` per step (30 us each). Throttle the below-fold consumers per P0-1(a) so the 1 s ramp costs the hero path only.

### P1

**P1-1. The visible stage never sleeps. [current; offscreen part superseded]**
- Evidence:
  - v1: offscreen hero rendered at 14 to 58 GL fps.
  - Current: offscreen is 0 fps (fixed), but the visible stage renders continuously, GL fps equals rAF fps at idle (1.1). Draw calls are now 70 to 75.
  - The hero mutates the DOM at 10 to 14 per second at idle.
- Root causes:
  - The ambient effects (sun, arrows, pulses, rain) call `state.invalidate()` unconditionally while animating, so a settled scene keeps a continuous loop.
  - `TempLabels.tsx:36` and the `Projector` write `style.transform` and `setAttribute('points')` every rendered frame with no dirty check, so each frame forces style recalc (the 10 to 14 mutations per second above).
- Fix:
  - Cap the ambient loops at 30 fps on the `medium` and `low` tiers by invalidating every other frame.
  - Add dirty checks in the projection sinks: write only when the rounded x/y changed.
  - Keep `frameloop="never"` offscreen and when the tab is hidden (already done).
  - Optional: pause ambient arrows and pulses after about 10 s of no interaction on mobile.

**P1-2. Render cost and quality tiers for weak GPUs. [current]**
- Evidence: 70 to 75 draw calls, 58 geometries, 14 to 15 textures, up to 29 programs (1.4). In SwiftShader the current stage frames take about 2 to 3x longer than v1 at the same canvas size.
- Root causes (file:line):
  - `CollectorCanvas.tsx:61-63`: `high` is chosen for any desktop width of 1024 px or more.
  - `quality.ts:24-28`: `high` means DPR 2 plus a 4096 px shadow map with MSAA.
  - Transparent layers (glass `MeshPhysicalMaterial` with clearcoat, copper tube, liquid tube, additive rain and pulses, depthTest-off arrows) all overdraw.
- Fix:
  - Start at `medium` and let `PerformanceMonitor` step up (it already steps down).
  - Gate `high` on `hardwareConcurrency >= 8` and a non-coarse pointer.
  - Use a 2048 px shadow map on `high`, and a baked contact shadow only on `low`.
  - Merge the rain and ripple draws into one pass.
  - Show the actual draw and triangle counts of `__sv3d` in the QA overlay.

**P1-3. Live-region chatter. [current for Comparison and Hero; verify the rest]**
- Evidence (v1): two polite regions.
  - The Hero `role=status` is throttled to 800 ms and only announces regime changes (good).
  - `Comparison.tsx:129` has a large `aria-live="polite"` container around the verdict text. It mutated 8 times during a 4 s slider drag and 2 to 4 times per mode switch, so screen-reader users get long verdict re-reads on every drag.
  - `ControlPanel.tsx:107` and `inside/PartList.tsx:33` also carry polite regions.
- Fix:
  - Keep one throttled announcer (`useAnnouncement`, already written) for regime changes.
  - Remove `aria-live` from the Comparison grid, or feed it from `useAnnouncement`.
  - Silence mid-drag updates (announce only after the pointer is released or the key repeat stops).

**P1-4. Mobile target sizes. [current]**
- Evidence: at 390 wide, 29 of 68 interactive elements are under 44 px in a dimension and 18 are under 24 px. v1 detail (the same primitives are still in use):
  - Viewer toolbar buttons 42x40.
  - Segmented options 40 px tall.
  - Lab and carbon range inputs 28 px tall with an 18 px thumb.
  - Carbon switch 44x24.
  - Chart-scenario radios 32 px tall.
  - Footer text links 17 px tall.
  - Disclosure summaries 20 px tall.
- Root cause: `ui/SegmentedControl.tsx` size map (`sm: min-h-8`, `md: min-h-10`), `index.css` `.range` height 28 px, the toolbar `min-h-10 min-w-10`.
- Fix:
  - Under `(pointer: coarse)`, set `min-h-11 min-w-11` on toolbar buttons and the segmented `sm` and `md` sizes.
  - Raise `.range` hit height to 44 px (keep the 4 px track and 18 to 20 px thumb).
  - Pad footer and disclosure links to 44 px.
  - Dense instrument rows are exempt from the 44 px AAA goal but must meet 24 px (WCAG 2.5.8).

### P2

**P2-1. Colour contrast of the NEW tokens (`src/index.css`, computed). [current]**

| Token | on paper `#f7f8f6` | on surface `#fff` | on sunken `#eef0ed` | Verdict |
|---|---|---|---|---|
| ink `#171c22` | 16.1 | 17.1 | 15.0 | pass |
| ink-2 `#66717c` | 4.67 | 4.98 | **4.34** | text fails on sunken and the wash fills; use `#5b6670` (5.5) |
| ink-3 `#8c969f` | **2.82** | **3.01** | 2.63 | **fails AA as text** |
| heat `#d98442` | **2.69** | **2.87** | 2.50 | fails 3:1 for chart marks and fails as text |
| heat-ink `#a8561a` | 4.91 | 5.24 | 4.57 | pass (text) |
| cool `#398bae` | 3.60 | 3.83 | 3.34 | passes 3:1 for graphics, fails as text |
| cool-ink `#1f6785` | 5.91 | 6.29 | 5.49 | pass (text) |
| critical `#b4442f` | 5.18 | 5.51 | 4.81 | pass |
| loss `#b8c0c6` | 1.73 | 1.84 | 1.61 | decorative only; not a sole signal |
| line-strong `#cbd2d6` | 1.44 | 1.53 | 1.33 | decorative axis; fine |

- Stage tokens (against `#0e1114` / `#15191d`):

| Token | Ratio |
|---|---|
| stage-ink | 16.0 / 14.9 |
| stage-ink-2 | 6.4 / 5.9 |
| stage-heat | 8.9 / 8.3 |
| stage-cool | 8.0 / 7.5 |
| stage-electric | 16.2 / 15.1 |

  All pass.
- Specific defects:
  - `charts/theme.ts:23-27`: `AXIS_TICK.fill = var(--color-ink-3)` at 12 px is a real text failure (2.8 to 3.0:1). Fix: use ink-2, or darken ink-3 to `#6f7983` (4.16 on paper, 4.43 on white), or `#6a747e` for 4.5.
  - `heat` bars and lines on paper are 2.69:1. Fix: darken the chart `--color-heat` to `#c4702d` (3.46) or `#b9651f` (3.99). Keep `#d98442` only on the dark stage or as a fill with a direct numeric label.
  - ink-2 on `sunken` and the heat-wash and cool-wash fills falls under 4.5:1. Use `#5b6670` for text on tinted fills.
- v1 dark build, runtime scan of 98 text colour/size combinations across all sections: 0 failures. The lowest was fg-mute on raised at 4.76:1. Text is small: 8.4 to 11 px for the W_th / W_e subscripts, labels at 11 px.

**P2-2. Keyboard and ARIA, observed (v1; primitives unchanged) [current].**
- Good:
  - Skip link first, then 7 nav links, then the mode switch.
  - The segmented control is a radiogroup with roving tabindex and arrow keys that move and select (`ui/SegmentedControl.tsx`).
  - The 3D viewer is one tabbable `role=group` with a describedby help text and arrow, +, - and 0 key handling (`CollectorStage.tsx` / `CameraRig.tsx`).
  - Toolbar toggles use `aria-pressed`. The switch uses `role=switch` with `aria-checked`.
  - Metric cards read as one spoken sentence (visuals `aria-hidden`).
  - Sliders have labels, `aria-valuetext` and `aria-describedby`.
  - One `h1`, `lang="id"`, landmarks present.
  - Focus is visible everywhere: 2 px solid outline, and a thumb ring on ranges (`docs/audit/perf/focus-range.png`, `focus-segmented.png`, `focus-tab4.png`, `focus-tab11.png`, `focus-canvas.png`).
- Gaps:
  - Recharts SVGs are `role="application"` tab stops (3 on the page). They capture arrow keys. Fix: set `accessibilityLayer={false}` and rely on the labelled SVG plus the "Lihat sebagai tabel" tables.
  - Arrow-key selection on the mode radiogroup runs a full-page update per key press (P0-1), so keyboard users feel the lag first.
  - Horizontal scroll regions (the Comparison panel is 358 px client by 420 px scroll at 390; 6 regions at 360 on v1) were not keyboard-focusable on v1. The Comparison scroller is `focusable=true` on the current build [superseded]; re-check the others after the section rebuilds. Add a visible scroll affordance (edge fade) and `tabindex=0` with a label.
- Reduced motion: the current build shows 0 GL frames at idle (sunny and rainy), 0 running CSS animations, 0 hero DOM mutations, and a Lab readout that jumps instantly (`useAnimatedNumber` has a reduced-motion path). v1 behaved the same except for about 4 s of damping frames after a mode switch. **Passes.**

**P2-3. Touch scroll trap. [superseded]**
- v1: a vertical swipe starting on the stage did not scroll the page (scrollY stayed 0 while the same swipe on header text scrolled it). The stage is 471 px of an 844 px viewport.
- Root cause: drei `OrbitControls` set `touch-action: none` on the container div, overriding the canvas's `pan-y` (`CollectorCanvas.tsx` v1 `onCreated`).
- **Fixed in the current build**: `CameraRig.tsx:212` sets `touch-action: pan-y` on the canvas with the custom pointer orbit, and a swipe from the canvas scrolled the page by 225 px (control 125 px). Keep a regression test.

**P2-4. Horizontal overflow. [mostly superseded]**
- v1: no page-level overflow at 360 / 390 / 768 (`scrollWidth == clientWidth`). The tables overflow inside their `overflow-x-auto` containers (`min-w-[22rem]` and `min-w-[34rem]` at 360 / 390), which hides columns without an affordance.
- Current at 390: `nBad 0`, one inner scroller (Comparison). The 360 re-run was inconclusive (the dev server was mid-rebuild and rendered no interactive content), so re-run `ovf.mjs` at 360 after the section rebuilds land.

**P2-5. CLS.**
- v1 desktop 0.023 from one early shift in the hero (the mode switch is rendered `wide` before `useMediaQuery` resolves, then reflows). Fix: set `useMediaQuery(..., false)` defaults per breakpoint with CSS-only layout, or reserve the mode-switch box.
- Lazy sections use a `min-h-[40vh]` fallback (fine).

**P2-6. First-use cost.**
- No preload hint for the 3D chunk (about 280 kB gz).
- Add `<link rel="modulepreload">` for the CollectorCanvas and three chunks, and `fetchpriority=low` for the charts chunk.
- Fonts: Inter and IBM Plex Mono WOFF2 are fine. Check that `font-display: swap` is set in the fontsource CSS (it is by default).

**P2-7. WebGL detection caches a transient failure.**
- `hooks/useWebGLAvailable.ts:12-22` stores `cached = false` forever if the first probe fails (observed 1 in 3 loads under contention). The user is stuck on the SVG schematic until reload.
- Fix: retry once after about 300 ms, or skip pre-detection and rely on `CanvasBoundary` plus `webglcontextcreationerror` (the boundary already exists).

## 3. Verification checklist for the fixes

- `node ticks.mjs`: per-tick script under 8 ms (production) with the hero visible and under 2 ms with it scrolled away.
- `extras.mjs` rapid switch: zero long tasks over 50 ms after warm-up.
- Offscreen GL fps stays 0.
- Visible idle GL fps at or below 30 on `medium` / `low`.
- Touch: swipe from the canvas scrolls the page (regression).
- Contrast: re-run the runtime scan against the light theme with chart SVG fills included (my scan reads CSS `color`, so SVG `fill` text needs its own check).
- Overflow at 360 and 390 on every rebuilt section, scroll regions focusable.
- 44 px targets at `(pointer: coarse)`.
- Reduced motion: 0 GL frames, 0 running animations, instant readouts (currently passing).
