# SolarVein - Motion System (final, Phase 3)

Code: `src/motion/**` (engine, tokens, hooks), `src/viz3d/effects/**` (3D effects), `src/sections/{Opening,Hero,Closing}.tsx`
and `src/sections/hero/**`. Evidence and the original defect list: `docs/audit/06-motion.md`, transition frames and numbers
in `docs/audit/motion/`. Physics (`src/sim/**`) is untouched. Copy follows `docs/audit/07-creative-direction-v2.md`.

> v2 (Wave 2): the visual clock now follows the v2 system store; see `docs/MOTION-v2.md`. Sections 3-5 describe the v1 Cerah/Hujan engine (`weather.ts`, kept for its tests until the cutover).

## 1. Principles
One clock for 3D, numbers, text and page sky. Every frame is a real computed state (`simulate()` on interpolated inputs).
The model decides direction, never a mode flag. Continuity and object identity (same scene, same camera, same panel on every
mode switch), reversible and retargetable mid-flight, never overshoot, no React render per frame, reduced motion respected,
no motion for its own sake.

**Redesign Oct 2026 (supersedes "one choreographed moment"):** inertial scroll (Lenis on the GSAP ticker, `src/motion/smoothScroll.ts`) and one ScrollTrigger scene per section via `useScrollScene` (`src/motion/useScrollScene.ts`, matchMedia desktop/mobile, nothing under reduced motion): Opening intro is CSS keyframes (`.intro-line`, `.intro-fade`, immune to lagSmoothing while 3D compiles), the video card opens from an inset rounded frame to full bleed (clip-path scrub); 01 stage card settles from scale .9 / rotateX 9°; 02 pins ~260% and drives `setExploded` + `setFocusPart` through the four parts (weather and camera untouched); the Interlude pins 150% with two lines; Dampak counts up once and floats the scaler; Closing photo settles. Videos (`ui/AmbientVideo.tsx`) load near the viewport, pause off-screen and stay on the poster under reduced motion / reduced data / Save-Data.

## 2. Tokens (`src/motion/tokens.ts`, `spring.ts`; CSS mirrors in `src/index.css`)
| Token | Value | Use |
|---|---|---|
| `DUR.micro / control / panel` | 140 / 180 / 280 ms | hover and focus / buttons, thumb / popovers, statement cross-fade |
| `DUR.explode / camera` | 650 / 800 ms | critically damped springs (w = 9 / 7.3) |
| `DUR.weatherMin..Max` | 0.75 - 1.1 s | `0.75 + 0.35 * distance`, Cerah <-> Hujan = 1.1 s |
| `EASE_UI_CSS` / `easeUi` | `cubic-bezier(0.22, 1, 0.36, 1)` | all CSS transitions; same curve as a JS function for GSAP |
| `READOUT_HZ` | 15 | text refresh of live numbers (3D runs at the display rate) |
| `SPRING_W` | camera 7.3, explode 9, follow 22, ramp 3 | `springStep`: exact, frame-rate independent, zeta = 1, velocity kept on retarget |
| `ARROW` | fade 8-36 W, flip threshold 12 W, flip amplitude 0.02 | heat arrow rules, section 5 |

GSAP: `gsap.ticker.lagSmoothing(120, 33)` (`gsapConfig.ts`): a frame gap over 120 ms (the React commit after a click, shader compile) advances GSAP by 33 ms, so a 1 s transition stretches a little under load instead of being finished before its first painted frame (QA saw scenes final at 650 ms).
is killed and re-run by React StrictMode otherwise captures its own start state and stays hidden: found and fixed in Opening).

## 3. Weather engine (`src/motion/weather.ts`, singleton `engine.ts`)
The store keeps the authoritative TARGET inputs (unchanged, instant). The engine subscribes externally (no store change),
owns the VISUAL inputs and publishes `VisualFrame { inputs, result = simulate(inputs), progress, moving, epoch }`.
`weather.frame()` is one stable mutated object (zero allocation for readers); `weather.subscribe(cb, hz)` pushes it (hz 0 =
every step for 3D, hz > 0 = throttled for text, plus one guaranteed flush when motion ends).

| Situation | Behaviour |
|---|---|
| >= 3 numeric inputs change (preset), or any change during a transition | **Scripted**: one GSAP timeline, progress p 0..1 over 0.6-1.2 s, `inputsAt(plan, p)`; retarget restarts from the CURRENT visual inputs |
| < 3 inputs change (slider, Lab edit) | **Follow**: per-input critically damped spring (w = 22, ~265 ms), runs only while moving |
| reduced motion, hidden tab, first load | **Snap** to the target |

Staggered windows (fraction of the transition), canonical Cerah -> Hujan, mirrored for Hujan -> Cerah (rain stops first, sky opens last):
irradiance 0-0.60, ambient T 0.05-0.70, wind and rain 0.20-0.85, T_in and flow 0.10-0.60; each input uses smootherstep inside its
window, so every input is monotone between its endpoints and can never overshoot (tested with a rapid-retarget case).

**Pump hold and flag flip.** The controller dead band (|q| < 20 W) would stop the pump mid-way and produce a stagnation spike.
If the pump runs at both endpoints, intermediate states use `pumpControl: 'on'`; `heatLoadAvailable` / `hotSourceAvailable` switch at
p*, the computed zero crossing of q_liquid (scan + bisection, ~50 sims at plan time). At p = 1 the true target inputs are written (identical
by construction). The hold is a valid computed state (pump forced on); the UI never shows the forced-off advisory because advisories
are read from the committed result, not the visual one. If an endpoint has the pump off, flags and pump command switch at p = 0.5.

**Window decision (QA D-05).** With T_in and flow starting late (0.35-1.0) the cell and outlet temperatures dipped up to 3.5 C below BOTH endpoints (a real computed state: G falls while the water is still cold). A grid search over the G / T_in / ambient / rain windows (offline, 100+ combinations) showed any T_in window that starts by 0.1 and ends by 0.6 removes the dip; the chosen set keeps the sky-first story and gives 0.00 C excursion of cell and outlet temperature in both directions (tested in `weather.test.ts`).

**Measured (Node, the app's own presets; `weather.test.ts`, 11 tests):** Cerah -> Hujan T = 1.1 s, p* = 0.372;
q_liquid +687 W -> 0 -> -550 W, strictly monotone, P_e 284 -> 38 W monotone, cell 45.9 -> 38.6 (min) -> 41.2 C, pump on in all
201 sampled states (no stagnation spike). Hujan -> Cerah is the exact mirror (p* = 0.628). simulate() costs ~0.02 ms per step.

Consumers (nobody keeps a private smoother for input-derived values): `viz3d/effects` (frame in `useFrame`), `viz3d/useLiveResult`
(liquid colours, cell tint, studio mood), `TempLabels`, `LiveReadout`, `Statement`, `WeatherSky`, `Hero`. Committed
`useSimResult()` keeps its meaning (aria text, announcements, charts, comparison, carbon).

## 4. Effects (visual frame -> physics)
| Effect | Driven by | Rules |
|---|---|---|
| Heat arrows (stack, 4 x 3) | **sign and size of live qLiquidW** while the pump runs | ALL arrows the same size on a grid aligned to the 0.12 u channel pitch (no overlaps); harvest = amber, down; rejection = cyan, up. Magnitude is carried by opacity and by how many of the twelve are lit (3..12), plus +-15 % length. Amplitude fades to 0 at the zero crossing; the direction latch flips only after the amplitude is below 0.02 and the computed sign is reversed with |q| > 12 W; 1.2 s breathing cycle staggered by column, 0.06 u travel. Per-instance alpha (ShaderMaterial). Valuation flags only dim (x0.5), never flip |
| Heat arrows (env, 2 x 2) | q_front + q_rain | up; cyan while the liquid rejects, faint amber otherwise |
| Rain | rain mm/h | <= 160 streaks, 1 px, normal blending, alpha <= 0.35, constant 1.6 u/s, lean 8 deg + 1.6 deg per m/s of wind, no ripples; fractional count is a per-instance alpha ramp (no pops); ShaderMaterial with per-instance alpha |
| Sunlight | G | light, not streaks: four broad feathered warm light SHAFTS along the key-light direction (additive, billboarded around their axis, fading out before they end) and one slow specular GLINT band sweeping the glass (about every 7 s); intensity follows G, zero below ~60 W/m2. The earlier dashed rays read as rain (critic F3-02) |
| Electrical pulses | P_e | warm-white pulses along three busbar lines to the +X edge, then along the model's real cables to the MC4 ends; rate and brightness follow P_e; no hardware of their own |
| Sky mood (`AmbientMood`) | G, rain | writes `stage.mood = { sun, rain, driven: true }` every frame; the studio owns all lights (no duplicate lights) |
| Page sky (`WeatherSky`) | G, rain | sunny layer opacity `clamp((G - 120) / 780)`, rainy layer opacity `1 - 0.5 clamp(rain / 30)`; written to two DOM nodes, no React render |

The inspect stage (02) mounts only mood and heat arrows (no sun, rain, pulses). Meshes stay in the scene with `count = 0` when off
(never `visible = false`), so shader programs exist for `gl.compile` warm-up. Reduced motion: static arrows, static dashes and streaks.

## 5. Choreography
**Weather transition (Cerah -> Hujan, 1.1 s):** the sky closes and G falls first (P_e follows the model), ambient T eases, rain fades in
once the sky has begun to darken, then T_in and flow respond and the cell temperature follows from the model. Heat arrows shrink as q
falls, fade out at p* = 0.377, reappear reversed (cyan, up) only after the computed sign has flipped. Numbers tick at <= 15 Hz;
the statement follows the visual regime: harvest and rejection are adopted in the same frame as the numbers, every neutral state (not beneficial, no load, pump waiting) must be stable 300 ms first (QA D-04/D-06), and a change swaps two stacked layers without overlap (old out 90 ms, then new in 130 ms); the camera is never touched.
**Opening:** CSS keyframes (`.intro-line` rises 110% -> 0, `.intro-fade` fades up, staggered via `--d`), then the scroll scene opens
the video card to full bleed (see section 1). Reduced motion: nothing animates, nothing is hidden.
**Closing:** photo parallax only; nothing else moves.

**01 layout:** the head (index, two-line h2 whose phrases never split, one instruction) comes first, then the stage card with the switch inside it (desktop) or directly below it (mobile), then the strip (statement | Listrik | Panas) and the caption. The card fits a 900 px viewport with its strip. Touch targets in my sections are all >= 44 px (measured at 390).

## 6. Micro-interactions (my sections; primitives in `DESIGN_SYSTEM.md`)
Segmented switch: one sliding thumb, 180-220 ms `ease-ui`, keyboard radiogroup, 44 px targets on coarse pointers. Text links: underline
colour 140 ms. Disclosure: height by `grid-template-rows` 260 ms. Readout values tick through computed states; they are plain text
(no odometer, no count-up). "Kustom" is a passive state shown when the store leaves a preset (thumb hides, tooltip explains).

## 7. Reduced motion (live, `prefers-reduced-motion`)
Weather transition snaps (statement opacity 120 ms); follow springs snap; effects static; opening shows at once; parallax off; the
engine reads the media query at every target change.

## 8. Performance contract
No React render per frame: the 3D reads the frame in `useFrame`; text uses `useVisualSelect` (state, <= 15 Hz, only when the rounded
text changes, only the small readout components re-render) or direct DOM writes; `simulate()` allocates only while moving. No
`backdrop-filter` and no masked canvas layer over the stage (a `blur` panel over a changing canvas made every switch repaint-heavy; removed).
Effects keep materials created up front. `gsap.ticker` callbacks exist only while a follow spring runs. FPS is never asserted from
SwiftShader. Rapid-switching measurement (12 Cerah/Hujan clicks in ~5 s, production build, Chrome, SwiftShader or no-WebGL, shared and
loaded machine so results vary run to run): long tasks 0-40 per run, JS self time 0.4-0.7 s per 12 switches in total (React commit of the
whole page included); the remaining main-thread time is native paint/layout. Before this work the audit measured 10 long tasks / 7.7 s
in 5 s.

## 9. Known limits
Charts and Comparison snap to the committed result (they are below the fold); `Schematic` (SVG fallback) reads the committed result too.
Anchors with `text-*` utilities lose their colour to the unlayered `a { color: inherit }`
(workaround `text-ink!` on the primary link buttons).
