# 06 - Motion audit (Agent C, Phase 1)

Scope: every animation in `src/**`, read against `docs/REDESIGN_BRIEF.md` (Motion + Performance). Source is untouched.
Evidence: code reading, a bundle of `src/sim` run in Node (offline transition study), and a DOM sampling probe
(`scratchpad/motion-probe.mjs`, Chrome, 3D disabled so the main thread is free; 1440x900; click "Hujan", sample every rAF).
SwiftShader WebGL was too slow (rAF median 134 ms, stalls >1 s) to time the 3D side, so 3D findings below are from code,
not from measured frames; the two reference screenshots in `docs/audit/critic/` confirm the lighting finding (D7).

## 1. Architecture finding (root cause of most defects)

`setMode()` replaces `inputs` instantly with the target preset. Every consumer then reads the **final**
`SimResult` and chases it with its **own** private smoother:

| Surface | Smoother | Time constant |
|---|---|---|
| Readouts (`useAnimatedNumber`) | rAF tween, easeOutCubic | 500 ms |
| Scene effects (`damp`, `SCENE_RATE=3.3`) | first-order, per effect | ~0.9 s to 95 % |
| Heat arrows flip (`SCENE_RATE*2.2`) | fade-out / flip / fade-in on the *target* sign | ~0.4 s then 0.9 s |
| Statement (`RegimeStatement`) | none; text replaced, WAAPI fade-in | 0 ms + 420 ms |
| Liquid colours, T labels, cell tint, pump state | none (React effect on target) | 0 ms |
| Charts | none (`isAnimationActive={false}`) | 0 ms |

So the intermediate frames are **not computed states**: arrows, numbers, text and colours are all at different points
of different curves. Measured (DOM probe, healthy main thread): the "Panas ke cairan" readout went +865 W to -282 W in the
first two frames (the easeOutCubic crosses zero at ~117 ms, 90 % settled by ~270 ms) while the 3D scene is still
~85 % sunny; the headline already shows the *rainy* sentence at t=0.

Offline sim study (`simulate()` on linearly interpolated presets, 0.028 ms/call, so per-frame simulation is free):
* With pump held on and staggered inputs, q_liquid is continuous and monotone: +865 W -> 0 at p~0.49 -> -698 W;
  cell 37.4 -> 31.5 (min) -> 40.2 C; P_e 293 -> 39 W. No spike.
* Naive linear blend with the preset flags (`heatLoadAvailable`, `hotSourceAvailable`) flipped first: panel goes to
  **stagnation 71.6 C** at t=0 (pump auto-off). Flags kept until the end: pump-off window p 0.5-0.65 with a cell spike
  38.8 -> 43.4 -> 39.4 C. The controller dead band (|q| < 20 W, pump-vs-benefit test) is the cause; the transition
  must hold the pump on and flip the two flags at the computed q zero crossing (see MOTION_SYSTEM.md).

## 2. Inventory

Driver: **C** = computed state (SimResult), **F** = mode/UI flag, **T** = time only.

| # | Animation | File | Trigger | Driver | Duration / easing | Defects |
|---|---|---|---|---|---|---|
| 1 | Explode factor | `viz3d/useExplodeFactor.ts` | `exploded` toggle | F | `1-exp(-6dt)` first-order, ~500 ms to 95 % | Max velocity on frame 1 (no ease-in); not a critically damped spring; module-global `shared`/`lastElapsed` hack |
| 2 | Fluid particles | `viz3d/LiquidFlow.tsx` | pump, flow | C (flow) + F (showFlow) | linear, 0.22 u/s per L/min, 100 spheres | **Teleport at u=1 -> 0** (outlet tip to inlet tip, 0.84 units apart, one particle every ~0.23 s at 2 L/min); `active` toggle pops visible; speed jumps 1.5x on mode switch (flow 2 -> 3 L/min) |
| 3 | Chevrons | `LiquidFlow.tsx` | reduced motion | F | static | fine; static in reduced mode as intended |
| 4 | Liquid vertex colours | `viz3d/Collector.tsx` ChannelLayer | `tin/tout/ntu` change | C (target) | none | Rebuilt in a React effect from the final result: snaps at t=0; also stagnant style (grey, opacity 0.45) |
| 5 | T_in / T_out labels | `Collector.tsx` + `ProjectedLabel.tsx` | result change | C (target) | none | Text rewritten via `replaceChildren` on key change; position `Math.round` per frame (1 px jitter) |
| 6 | Cell tint (emissive) | `Collector.tsx` | result change | C (target) | none | Snap; goes through React props (re-renders the whole layer tree) |
| 7 | Layer focus / dim | `Collector.tsx` `std()`/`useLook` | click | F | none | opacity 1 -> 0.2 and `transparent` flip are instant |
| 8 | Hover label | `Collector.tsx` | pointer | F | none | visibility toggle, no fade |
| 9 | Camera tween (rotate/zoom/reset) | `viz3d/CollectorCanvas.tsx` CameraRig | toolbar, keys | F | `1-exp(-7dt)`, ~430 ms to 95 % | First-order (velocity jump), shorter than 600-1000 ms budget, velocity not preserved on retarget; **no double-click reset** |
| 10 | Orbit inertia | `OrbitControls` | drag | F | `dampingFactor 0.08` per update | Frame-rate dependent (faster decay at 120/144 Hz); polar 0.1..pi-0.1 lets the camera go under the grid (y=-0.32) / top-down; no azimuth bound |
| 11 | Auto-rotate | `CollectorCanvas.tsx` | default on, resumes 3.5 s after drag | F | constant 0.55 | Speed steps 0 -> full and full -> 0 (pause for cross-section, drag start); default **on** fights annotation reading; `touched` home refit snaps on resize |
| 12 | AmbientMood (key/hemi/fog) | `effects/AmbientMood.tsx` | result change | C (target, damped) | `damp` 3.3/s | Own smoother on final target; adds only +0.08..0.7 key / 0.12..0.26 hemi on top of static 1.75 key + env 0.9, so overcast is barely visible (D7) |
| 13 | Sunlight shafts | `effects/Sunlight.tsx` | G | C (target, damped) | phase loop 0.16-0.24 /s | Count `round()` steps pop instances; `g<1` hard hide |
| 14 | Rain | `effects/Rain.tsx` | rain mm/h | C (target, damped) | fall loop 1.3-2.0 cycles/s | 0 -> 24 drops jump at rain>0.05; each new instance appears mid-air; ripples likewise |
| 15 | Electric pulses | `effects/ElectricPulses.tsx` | W_e | C (target, damped) | phase 0.1-0.95 u/s | `visible` hard toggle at 0.5 W; own damper |
| 16 | Heat arrows (stack + env) | `effects/HeatArrows.tsx` | regime/sign | **F-ish** (regime from target; regime needs heat-load flag) | fade `damp(.., 7.3)` -> flip -> `damp(.., 3.3)`; loop 0.28-0.6 /s | Flip decided by the **final** sign, at ~0.3-0.4 s, independent of the live q; direction keyed on `regime` (needs flag), not on sign(q); arrows absent when q>0 but no heat load |
| 17 | Readout numbers | `hero/useAnimatedNumber.ts`, `AnimatedMetric.tsx`, `Readouts.tsx` | target change | C (target) | 500 ms easeOutCubic, rAF + `setState` | **8 hooks x 60 renders/s** (281 DOM mutations in 2.2 s measured); **negative-k overshoot** (below); aria-label rewritten per frame; zero crossing at 117 ms |
| 18 | Statement | `hero/RegimeStatement.tsx` | `statement.key` | C (target) | WAAPI 420 ms ease-out-expo, enter only | Old text vanishes at t=0, new text sits at opacity 0 (measured op=0 from t=118 ms) then fades in; shows final regime while scene is sunny |
| 19 | PathwayStrip links | `hero/PathwayStrip.tsx` + css `fx-pulse` | regime | C (target) | opacity 0.55-1, 2.4 s loop | Decorative loop; swaps instantly |
| 20 | Hero layout (Lab) | `Hero.tsx` | mode = lab | F | none | Stage height class swap (56svh <-> 38svh on mobile) and right column swap are instant; R3F resize re-fits camera (snap) |
| 21 | Explode fallback | `CutawayFallback.tsx` `useEased` | explode | F | rAF + `setState`, `exp(-7dt)` | React render per frame (fallback path only) |
| 22 | SVG diagrams loops | `index.css` `fx-flow/nudge/pulse`, `Principle.tsx`, `Seasons.tsx`, `ui/diagram.tsx` | mount | T | 1.1 s linear / 1.8 s smooth / 2.4 s loops | Infinite, unconditional on mount, also offscreen; nudge arrows are decorative (not tied to state) |
| 23 | Skeleton -> canvas | `CollectorStage.tsx` | lazy load | T | `fx-pulse`; canvas pops in | No fade between skeleton and first frame |
| 24 | SegmentedControl | `ui/SegmentedControl.tsx` | click/arrows | F | `transition-colors 200ms ease-standard` | No sliding indicator (two cells cross-fade, identity lost); no pressed state |
| 25 | Slider | `ui/Slider.tsx`, `index.css .range` | drag | F | thumb ring 120 ms (webkit only) | No pressed/drag state; Firefox thumb has no hover ring; `--fill` set through React per tick (OK) |
| 26 | Button / ButtonLink | `ui/Button.tsx` | hover/press | F | colours 200 ms ease-standard | No pressed feedback |
| 27 | Toggle | `ui/Toggle.tsx` | click | F | track 200 ms, thumb 200 ms ease-out-expo | fine; add pressed squash (optional) |
| 28 | ViewerToolbar buttons / Layers popover | `viz3d/ViewerToolbar.tsx` | click | F | colours 200 ms; popover instant | Pressed dot and popover appear/disappear without transition |
| 29 | Disclosures | `ControlPanel.tsx`, `Assumptions.tsx` (`<details>`) | click | F | chevron rotate 200 ms; content instant | No height animation |
| 30 | Nav links, mobile menu | `SiteHeader.tsx` | scroll/click | F | colour 200 ms; menu `hidden` instant | Menu pop; no active indicator motion |
| 31 | Announcements | `hero/useAnnouncement.ts` | regime/advisory signature | C | 800 ms debounce | Correct; keep (non-visual) |
| 32 | Smooth scroll | `index.css` `html{scroll-behavior:smooth}` | anchor | F | UA default | Fine; reduced override present |
| 33 | Charts | `src/charts/**` | input change | C (target) | `isAnimationActive={false}` | Correct for perf, but update at t=0 while scene is mid-transition (inconsistent clock) |

Positives to keep: no per-frame allocation in `effects/**`; instanced meshes; `frameloop` gated on in-view + reduced
motion; direction of liquid never reverses (LUT order); `useAnimatedNumber` re-targets from the on-screen value;
`useAnnouncement` keeps SR quiet during drags; global reduced-motion CSS clamp + hook-based opt-outs; `demand`
invalidation chain works.

## 3. Prioritised defects

**P0 - breaks the brief's continuity / "model determines direction" requirement**
* **D1 No computed intermediate states.** Root cause in section 1. Fix: interpolate inputs, run `simulate()` per step
  (engine in `src/motion`, one clock for 3D, readouts, statement).
* **D2 Heat-arrow flip is scripted from the target, keyed on `regime`.** Fix: amplitude = smoothstep(|q|), direction
  latch flips only after the arrows are faded and |q| > threshold on the opposite sign.
* **D3 Statement shows the final regime at t=0 and blinks through opacity 0** (measured). Fix: follow the visual regime
  (latched), two-layer cross-fade.
* **D4 `useAnimatedNumber` overshoots.** `k = min(1, (now - t0)/duration)` has no lower clamp; the rAF timestamp can
  precede the `performance.now()` taken in the effect, so `k < 0` and `easeOutCubic(k)` goes negative:
  observed readouts **+3,376 W / P_e 701 W** (3D off) and **+6,447 W / 1,199 W** (SwiftShader) for one frame, between
  endpoints of +865 and -698 W. With a healthy 60 Hz loop it is a ~10 % one-frame blip, but any stall (shader compile,
  GC, tab switch) makes it visible. Also 8 `setState` per frame. Fix: ref-driven DOM text, throttled 15 Hz, `max(0,k)`.
* **D5 Particle wrap teleport** at the outlet->inlet seam. Fix: arc-length parametrisation with per-instance
  scale fade over the first/last 3 % of the path (stubs), pump-state fade, speed from the visual flow.

**P1 - perceptible roughness**
* D6 Camera: first-order tween, 430 ms, no velocity; no dblclick; frame-rate-dependent inertia; unbounded polar;
  auto-rotate steps; auto-rotate default on.
* D7 Weather barely moves the scene lighting (compare `docs/audit/critic/d1440-sunny-hero.png` vs `-rainy-hero.png`:
  panel brightness is nearly identical; only rain, arrows and tint differ). Drive the main key/env intensity and a
  sky tint from G and rain.
* D8 Liquid colours, T labels, cell tint, pump-state styling snap (target-driven React effects).
* D9 Rain/Sunlight instance-count pops (use fractional-count alpha ramp per instance).
* D10 Lab toggle layout snap (stage height, column swap, camera refit).
* D11 Explode first-order ease; layer-focus dim snaps; SVG fallback re-renders per frame.

**P2 - micro-interactions & polish**
* D12 SegmentedControl has no sliding indicator; Slider/Button lack pressed state; Firefox slider thumb lacks hover.
* D13 Token drift: `--ease-standard` (0.2,0,0,1) vs brief UI easing (0.22,1,0.36,1); `duration-200` literals; `--dur-*`
  unused; no 150/180/220/350 scale.
* D14 Popover/menu/hover-label/disclosure content have no enter/exit; skeleton->canvas pop.
* D15 Decorative infinite CSS loops (fx-nudge, fx-pulse on PathwayStrip/Badge) run unconditionally and offscreen.
* D16 `frameloop="always"` whenever in view even if every effect is static (particles keep it hot); no DPR /
  complexity adaptation; two re-exports of `useReducedMotion` (harmless).
* D17 Charts update at t=0 while the scene animates (decide per chart: visual-clock feed at 10 Hz, or snap).

## 4. Reduced-motion audit (today)

Handled: explode snaps, camera snaps, effects freeze to static poses (arrows static, rain static streaks, chevrons
instead of particles), readouts instant, statement fade skipped, global CSS clamp, `scroll-behavior:auto`.
Gaps: Lab layout snap is already instant (fine); spinners/skeleton pulse removed by CSS clamp (fine); a transition
engine must snap inputs in reduced mode (spec'd); camera `reset` currently snaps (keep).

## 5. Not measured (honest limits)

* No 3D frame-by-frame capture: SwiftShader main-thread saturation made timestamps meaningless; 3D timing claims are
  derived from the code and the time constants above, not from measured frames.
* FPS on real GPUs unmeasured. Offline sim cost (0.028 ms/call, Node) is measured; browser cost not.
