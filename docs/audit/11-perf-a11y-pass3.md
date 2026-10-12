# 11 - Performance and accessibility, pass 3 (Agent H, rebuilt site)

Build measured: production preview `http://localhost:4173` (dist of 2026-10-12 19:50). Source read-only; evidence images in `docs/audit/perf3/`.
Scripts (scratchpad): `perf3.mjs` (frame matrix), `warm3.mjs` (cold vs warm GPU cache), `prof3/5/6/7.mjs` (CPU profiles), `a11y3.mjs`, `kbd3.mjs`, `live3.mjs`, `contrast3.mjs`, `layout3.mjs`, `focus3/4.mjs`.

## 0. Method and hardware (read first)

- **Renderer string, verified before every run**: `ANGLE (AMD, AMD Radeon 780M Graphics (0x00001900) Direct3D11 vs_5_0 ps_5_0, D3D11)`. Chrome (channel `chrome`) with `--use-angle=d3d11 --ignore-gpu-blocklist --enable-gpu`. This is a real integrated laptop GPU, not software GL. It is vsync-limited at 60 Hz (blank page: 61 rAF/s). It says nothing about phone GPUs, which are weaker. Mobile rows use this same GPU with a 390 px / DSF 3 / touch emulation.
- Previous audit (`04-perf-a11y.md`) numbers were **SwiftShader (CPU GL)**. FPS before and after are therefore NOT comparable. Main-thread script cost and long tasks are comparable.
- Frame interval = interval between frames in which a WebGL draw call was issued (observed by wrapping `draw*`), so it is the real GL frame cadence, not just rAF. "Dropped" = frames over 25 ms and over 50 ms.
- `renderer.info` is NOT reachable in the production bundle (the `__sv3d` hook is `import.meta.env.DEV` only). Draw-call counts come from the `draw*` wrapper (production); programs from a `linkProgram` counter; geometry/texture counts from the dev server hook (`localhost:5190`), which is build-independent.
- Experiments that change code were made on **copies** in the scratchpad (`patched/`, `patched2/`), built and served on temporary ports, then stopped. Project source was not touched.

## 1. Headline

| Question | Result |
|---|---|
| Steady-state frame rate (idle sunny, rainy, orbit drag, transition, 02 inspect, mobile 390) | **60 fps, p50 16.7 ms, p95 16.8 to 17.5 ms, max under 35 ms** on every steady scenario |
| Cerah to Hujan transition (3.5 s window) | p95 19.3 to 19.6 ms, max 33 to 35 ms, 0 frames over 50 ms, 0 long tasks. Was 7.7 s of long tasks per 5 s of rapid switching before |
| Rapid switching 300 ms for 5 s | 59.8 fps, p95 24.3 ms, max 52.7 ms (1 frame over 50), 0 long tasks |
| Lab slider cost per tick (production) | **13.4 ms script / 23.6 ms task** (hero away), **22.8 ms script** (hero visible). Was 86 ms (v1 prod), 770 ms (dev) |
| Offscreen stages | 0 GL frames and 0 rAF callbacks on Lab, Perbandingan; reduced motion idle 0 and 0 |
| First load (cold GPU shader cache) | **TBT 3.9 to 4.8 s** in two bursts (1.4 s: 1.5 to 2.2 s; about 5.5 s: 2.2 to 2.8 s). Warm cache (returning visit): TBT 0.2 to 0.5 s |
| CLS | 0.0000 on load; 0.0033 worst after scrolling the whole page and switching weather (was 0.023 / 0.049) |
| Horizontal overflow 360 / 390 / 768 / 1280 / 1440 | none at the document level |
| Touch targets at 390 | 18 of 83 below 44 px (was 29 of 68); 4 below 24 px, 3 of which are text links (was 18) |

One real defect found: **offscreen stages still render whenever the inputs change** (P0-1), and a **2 s hitch from the quality-tier promotion** (P0-2).

## 2. Frame and cost matrix (1440x900, DSF 1, production, Radeon 780M)

"GL p50 / p95 / max" are frame intervals in ms between rendered frames. Draws/tris per rendered frame. `script/s` = CDP ScriptDuration per second of the window.

| Scenario | GL fps | GL p50 / p95 / max | >25 ms / >50 ms | Long tasks (n / ms) | script/s | Draws / tris | React commits/s (dom / r3f) | Heap MB (min/max) | Programs |
|---|---|---|---|---|---|---|---|---|---|
| Hero idle sunny (8 s) | 39.8 * | 16.7 / 17.5 / 2755 * | 2 / 1 * | 1 / 2755 * | 420 * | 47 / 35.7k | 0.2 / 0.1 | 15.8 / 20.1 | 51 |
| Hero idle rainy (rain+flow+arrows) | 60.2 | 16.7 / 17.2 / 31.3 | 1 / 0 | 0 | 115 | 48 / 36.6k | 0 / 0 | 17.8 / 19.4 | 51 |
| Hero idle rainy, 2nd run | 60.3 | 16.7 / 17.3 / 18.8 | 0 / 0 | 0 | 104 | 48 / 36.6k | 0 / 0 | 18.3 / 19.1 | 51 |
| Orbit drag, sunny (8 s) | 60.1 | 16.6 / 17.5 / 26.3 | 1 / 0 | 0 | 131 | 47 / 35.7k | 0 / 0 | 16.7 / 17.8 | 51 |
| Orbit drag, rainy (6 s) | 60.1 | 16.7 / 17.3 / 18.2 | 0 / 0 | 0 | 127 | 47 / 36.6k | 0 / 0 | 19.0 / 20.7 | 51 |
| Cerah to Hujan (3.5 s) #1 | 60.2 | 16.7 / 19.3 / 35.3 | 1 / 0 | 0 | 150 | 48 / 36.4k | 7.4 / 0.9 | 16.8 / 20.1 | 51 |
| Hujan to Cerah #1 | 60.3 | 16.7 / 19.6 / 33.4 | 1 / 0 | 0 | 143 | 48 / 36.0k | 7.1 / 0.9 | 17.7 / 20.3 | 51 |
| Cerah to Hujan #2 / Hujan to Cerah #2 | 60.2 / 60.4 | 16.6 to 16.7 / 19.5 and 18.2 / 31.5 and 20.3 | 1 and 0 / 0 | 0 | 147 / 109 | 48 | 7.1 / 0.9 | 18.1 / 20.6 | 51 |
| Rapid switching 300 ms x 5 s | 59.8 | 16.6 / 24.3 / 52.7 | 14 / 1 | 0 | 223 | 52 / 36.1k | 19.2 / 6.0 | 19.9 / 28.0 | 51 |
| Page wheel-scroll hero to bottom | 17 (hero leaves view) | 16.8 / 66.2 / 183.9 | 11 / 7 | 1 / 123 | 83 | 48 | 14.4 / 22.7 | 16.2 / 19.3 | 52 |
| Scrolled to Dampak (5 s) | 49.8 * | 16.7 / 17.3 / 887 * | 2 / 1 * | 1 / 887 * | 259 * | 45 / 35.1k | 0.4 / 0.2 | 17.6 / 19.9 | 61 |
| Scrolled to Lab (5 s) | **0** | n/a | 0 / 0 | 0 | 3 | 0 | 0 / 0 | 17.7 / 17.8 | 61 |
| Scrolled to Perbandingan (5 s) | **0** | n/a | 0 / 0 | 0 | 2 | 0 | 0 / 0 | 17.7 / 17.8 | 61 |
| 02 inspect stage idle (6 s) | 60.1 | 16.7 / 17.2 / 34.8 | 1 / 0 | 0 | 103 | 45 / 35.1k | 0 / 0 | 18.0 / 18.7 | 61 |
| 02 inspect orbit drag (5.5 s) | 60.1 | 16.6 / 19.6 / 23.5 | 0 / 0 | 0 | 154 | 45 / 35.1k | 6.9 / 0 | 18.2 / 19.9 | 61 |
| Lab slider 60 Hz synthetic drag, hero away (5 s) | **27.3 (offscreen!)** | 34.2 / 45.9 / 53.9 | 136 / 3 | 0 | 321 | 66 / 8.7k | 93.8 / **54.7** | 20.8 / 35.3 | 51 |
| Slider 60 Hz drag, hero visible (5 s) | 60.2 | 16.5 / 26.9 / 31.6 | 33 / 0 | 0 | 441 | **83** / 39.4k | 86.9 / 49.8 | 22.4 / 35.2 | 51 |

\* = contains the one-off tier-promotion / first-render stall of section 5 (P0-2); not steady state. Dampak: the 31 px sliver of the inspect stage is still inside the 80 px rootMargin, so it renders (P2-3).

Reading: steady state is clean. The two rows to look at are the last two: on a slider drag the **R3F commit rate is 50 to 55 per second** and the offscreen stages draw 66 calls per frame.

### 2.1 Mobile 390x844, DSF 3, touch (same GPU)

| Scenario | GL fps | p50 / p95 / max | Long tasks | Draws / tris | Tier (canvas px / css px) |
|---|---|---|---|---|---|
| Hero idle | 60.1 | 16.7 / 17.2 / 17.6 | 0 | 47 / 35.7k | 1.5 (medium) |
| Touch orbit (4 horizontal drags) | 60.2 | 16.7 / 17.3 / 18.1 | 0 | 47 | 1.5 |
| Cerah to Hujan | 60.0 | 16.7 / 17.4 / 41.5 | 0 | 48 | 1.5 |
| Rainy idle | 60.1 | 16.7 / 17.3 / 22.3 | 0 | 48 | 1.5 |
| 02 inspect idle | 60.2 | 16.7 / 17.3 / 17.9 | 0 | 45 | 1.5 |
| Lab idle (stages offscreen) | 0 | n/a | 0 | 0 | n/a |

Vertical swipe starting on the canvas scrolled the page (498 to 663 px): `touch-action: pan-y` holds. The mobile canvas is 358x336 css px at DPR 1.5 = 0.27 MP, so a phone GPU should be fine; only a real device can confirm.

### 2.2 Reduced motion (`prefers-reduced-motion: reduce`)

| Window | GL frames | rAF callbacks from app | Running animations | script/s |
|---|---|---|---|---|
| Hero idle sunny (settled) | 0 | 0 | 0 | 4 |
| Hero idle rainy after the switch settled | 0 | 0 | 0 | 3 |
| 02 inspect idle | 0 | 0 | 0 | 4 |
| The switch itself (7 s window) | 62 | 63 | n/a | 23 |

Passes. Note the switch still renders about 1 s (62 frames) of damping; acceptable, a one-frame jump would be the strict reading (P3).

### 2.3 Slider cost per input tick (script ms per tick, baseline-subtracted)

| Method | Earlier audit | Now (production, Radeon) | With 2 fixes of section 3 (copy build) |
|---|---|---|---|
| 60 synthetic `input` events @80 ms, hero scrolled away | 84 to 86 ms (v1 prod) | **13.4 ms** script (23.6 ms task, 3.1 ms layout/style) | 8.9 ms (23.1 task) |
| 40 real ArrowRight/Left presses @80 ms, hero away | n/a | **15.5 ms** script (23.6 ms task) | 11.3 ms (18.4 task) |
| 40 keys, no gap (the UX agent's "40 ticks" shape) | 878 ms (their before) | **347 ms script / 660 ms task** | 188 ms script / 434 ms task |
| 40 synthetic ticks, hero VISIBLE | n/a | 22.8 ms script, 36.8 ms task | n/a (baseline noise) |
| 60 Hz drag script/s, hero visible | 570 to 850 (SwiftShader) | 441 | 215 |

The UX agent's "193 ms / 40 ticks" matches what I get only after the memo fix of P0-1 (188 ms). On the current dist the number is 347 ms. A single tick (23.6 ms task) is still above one 16.7 ms frame; at 80 ms spacing nothing is dropped, but at a 60 Hz drag the main thread is 62 to 76 % busy (frames stay at 60 fps only because the GL work is cheap).

CPU profile of the remaining per-tick cost (dev server, so inflated by jsxDEV; relative only): `Assumptions.tsx` Rincian 10 %, `Comparison.tsx` 7 %, `Disclosure` 6 % (about 33 Disclosures re-render with all their closed children), `Readout`, then 3D. These are below-the-fold and are re-rendered at about 8 Hz while offscreen.

### 2.4 Renderer cost

| Item | v1 | Pass 1 current | Now |
|---|---|---|---|
| Draw calls, experience sunny / rainy | 32 / 35 | 70 / 73 | **47 / 48** |
| Triangles | 40.9k / 48.6k | 36.9k / 43.9k | 35.7k / 36.6k |
| Geometries / textures | 47 / 5 | 58 / 14 | 50 / 16 |
| Programs created (both stages after load) | 16 | 20 to 29 | 29 (experience) + 21 (inspect) = 51 |
| Transparent meshes | n/a | n/a | 14 of 37 (experience) |
| Inspect stage draws | n/a | n/a | 45 |

### 2.5 Quality tier selection (`PerformanceMonitor`)

Tier read from `canvas.width / clientWidth` at DSF 2 (low 1, medium 1.5, high 2).

| Hardware | Result |
|---|---|
| Radeon 780M, 1440 desktop | starts **medium**, promoted to **high about 2 s after window start (about 7 s after load)** and stays high through rain and orbit drag. Inspect stage stays medium (offscreen, no frames). The promotion costs a 1.8 to 2.8 s main-thread stall (P0-2) |
| Radeon 780M, 390 mobile DSF 3 | medium (1.5) throughout, never promoted (`maxTier` = medium below 1024 px) |
| SwiftShader (software, stand-in for a very weak GPU), DSF 2 | medium until **about 80 s**, then low. Step-down is far too slow: the user sits at 2 to 3 fps for over a minute (P1-2) |

## 3. Prioritised issues (performance)

### P0-1. Offscreen stages still render on every input change, and the stage canvas tree re-renders per tick

- Evidence: during a Lab slider drag with both stages 2000+ px away, both canvases rendered 27 fps (`glFrames` 137 in 5 s, 66 draws per frame, p50 34 ms). Caught with a draw-call stack: `td.update` (the drei `<Environment>` cube camera, six face renders) called from a React layout effect. With the hero visible the same effect adds about 36 draws per frame (83 vs 47). R3F commits 50 to 55 per second during the drag.
- Root causes:
  1. `src/viz3d/CollectorStage.tsx:123` calls `useSimResult()` (only for the `aria-label` string at `:145`). Every input change therefore re-renders `CollectorStage`, and its child `<CollectorCanvas>` (`CollectorCanvas.tsx:82`, not memoised) re-renders the whole `<Canvas>` children.
  2. `src/viz3d/Studio.tsx:210`: `<Environment ...>` receives fresh JSX children each render. drei's `EnvironmentPortal` layout effect has `children` in its dependency list (`Environment.js:134`), so each re-render re-runs `camera.update` (6 renders) and `setEnvProps`. A layout effect is not gated by `frameloop="never"`, hence the offscreen rendering.
  3. `Hero.tsx:36` also calls `useSimResult()` and passes new `children` to `<CollectorStage>`, so even after fix 1 the parent chain re-renders.
- Fix (verified on a copy build):
  - `CollectorCanvas.tsx`: `export default memo(CollectorCanvas)` (all props are primitives).
  - `CollectorStage.tsx`: remove `useSimResult()` at line 123. Give the live "Kondisi: ..." text to a tiny leaf component that updates `aria-label` imperatively on a throttled weather subscription (or drop the numbers from the label, they are in the readouts; keep `Model 3D kolektor PVT`).
  - `Studio.tsx`: move the `<Environment>` block into a `memo()` component keyed on `resolution`.
- Measured effect on the copy build: offscreen GL frames during the drag 137 to **0**; R3F commits 54.7/s to **0/s**; hero-visible draws per frame 83 to **47**; script/s hero visible 441 to **215**; per-tick script 15.5 to 11.3 ms; 40-key burst 347 to 188 ms. Programs created 51 to 43 (no env re-creation).

### P0-2. Quality-tier promotion medium to high freezes the main thread for 1.8 to 2.8 s, about 5 to 7 s after load; first render adds another 1.5 to 2.2 s

- Evidence (cold GPU shader cache, Radeon via ANGLE D3D11, `warm3.mjs`, 3 fresh profiles): visit 1 long tasks `[1267 ms start, 1460 ms]` and `[5226, 2187]`, TBT 3924 ms; second run `[1368, 1903]` and `[5786, 2541]`, TBT 4789 ms. Warm cache (same profile, visit 2 and 3): TBT 445 and 486 ms. Hero idle windows also show the stall (`max 2733 ms` in the first 8 s window). Every cold-cache first-time visitor on Windows/D3D11 gets about 4 to 5 s of blocking, split into two freezes: the page cannot scroll or respond during them.
- CPU profile: `getProgramInfoLog` is 2.3 s of the 2.4 s at load and 2.3 s of the 3.0 s at promotion. Of the promotion window: 804 ms inside `_applyPMREM` (PMREM blur shader compile), 1402 ms recompiling material programs inside `render`, about 800 ms other.
- Root cause: `quality.ts:23-25` gives each tier a different `env` resolution (`192` / `256`), and `Studio.tsx:210` passes it to `<Environment resolution>`. three encodes the cube-UV size in shader defines, so changing it recompiles every PBR program, and the new PMREM compiles its blur shaders again. The `high` tier is chosen at `CollectorCanvas.tsx:90` (`maxTier`) and reached by `onIncline` at `:133`.
- Fix (verified):
  1. Same `env` for all tiers that matter (`quality.ts:24` `env: 192`). Copy build, cold cache, **only this change**: TBT 4.0 to 4.8 s becomes **2.3 s**; the 5 s freeze disappears.
  2. `CollectorCanvas.tsx:35-57` `Warm`: use `gl.compileAsync(scene, camera)` (KHR_parallel_shader_compile) and keep `frameloop="never"` until it resolves. Together with fix 1 and P0-1: cold TBT **0.78 s** (first burst 1.9 s to 0.5 s); warm 0.21 s.
  3. Mount the inspect canvas only near the viewport (`useInView` with `rootMargin: 900px`, latched). This saved 20 programs and one WebGL context at load (programs 51 to 31); it did not change TBT by itself (the inspect canvas never rendered until visible) but removes memory and a context.
  4. Longer term: fewer and cheaper programs (29 for the experience stage). `MeshPhysicalMaterial` variants (clearcoat, transmission) are the expensive ones on D3D11; share materials and use `MeshStandardMaterial` where the look allows.
- Show a "Memuat model 3D" state through the compile instead of a frozen page (`Hero.tsx` already has `StageFallback`; `CollectorCanvas` should signal `ready`).

### P1-1. The visible stage renders at a constant 60 fps while idle

Evidence: idle sunny / rainy are 60.2 GL fps with `script/s` 104 to 115 and main busy 30 to 36 % indefinitely (the arrows, sun rays, flow pulses are always animating). Not a frame-rate problem on this GPU; it is a battery and thermal cost on laptops and phones. Fix: cap the ambient loop at 30 fps on the `medium` and `low` tiers, and pause ambient effects after about 10 s without interaction on a coarse pointer. Dirty-check the projection sinks (`TempLabels`, `anchors.tsx`) so a settled camera writes no DOM (`mutPerSec` is 0 at idle: already good).

### P1-2. Weak-GPU step-down takes about 80 s

Evidence: SwiftShader at DSF 2 moved medium to low only at about 80 s (section 2.5). Root cause: `CollectorCanvas.tsx:129-134` uses drei `PerformanceMonitor` defaults, which need several 250 ms sampling windows of consecutive frames, and with a demand loop at 2 to 3 fps each window takes many seconds. Fix: `<PerformanceMonitor ms={150} iterations={4} flipflops={2}>` plus an initial guard: start at `low` when `navigator.hardwareConcurrency <= 4` or `deviceMemory <= 4`, or after a 20-frame calibration. Also keep promotions off while the first compile stall is pending.

### P2

- **P2-1. Table scrollers without keyboard access.** `Assumptions.tsx:127`, `charts/DayHistory.tsx:404`, `charts/EnergyFlow.tsx:303` are `overflow-x-auto` (352 px content in 328 px at 360) and not focusable. `Comparison.tsx:168` already does it right (`role=region aria-label tabIndex=0`). Apply the same to these three.
- **P2-2. Eager `charts` chunk in the entry.** `index-*.js` statically imports two helpers from `charts-*.js` and `index.html` modulepreloads it (113 KB gz). Measured evaluation cost only 15 ms (CDP), so it is bandwidth, not CPU. Fix: keep the interop helpers out of the `charts` chunk in `vite.config.ts` `manualChunks`.
- **P2-3. 31 px sliver renders the inspect stage.** At the top of Dampak the inspect canvas shows 31 px of its bottom edge and renders at 45 draws and 60 fps (887 ms first-render hitch + 250 frames in 5 s). `useInView({ rootMargin: '80px' })` at `CollectorCanvas.tsx` is the cause: use `threshold: 0.1` and `rootMargin: '0px'` for the render gate (keep the margin only for mounting).
- **P2-4. Latin-ext fonts.** `instrument-sans-latin-ext` (199 ms) and `ibm-plex-mono-latin-ext-400` (506 to 620 ms) load because of "Horațiu" and a subscript glyph. Cheap: normalise those strings or accept. Plex Mono 400/500 latin are not preloaded (FOUT on readouts, CLS 0 so harmless).
- **P2-5. Reduced motion switch** still plays 62 frames (about 1 s) of 3D damping. Jump the 3D state in one frame under reduced motion.

## 4. Accessibility

### 4.1 Keyboard path (139 tab stops, `tabseq.json`)

Order: skip link, logo, 5 nav links, header CTA, opening CTAs, then the sections in document order. Every stop has a visible 2 px outline except range inputs, which show a double-ring thumb (`ring-range.png`, verified). Real behaviour verified with keys:

| Control | Result |
|---|---|
| Sliding SegmentedControl (`ui/SegmentedControl.tsx`) | `role=radiogroup`, roving tabindex 0/-1, ArrowLeft/Right/Up/Down wrap and select, Home/End work, focus follows. Passes |
| Disclosure (`ui/Disclosure.tsx`) | `button aria-expanded aria-controls` inside a heading; panel `role=region aria-labelledby`, `inert` when closed (no focusables reachable). Enter and Space toggle. Passes |
| Tooltip / InfoTip | button `aria-label="Keterangan: ..."`, `aria-describedby` to a `role=tooltip` (24 on the page), shows on focus, Escape hides (opacity 1 to 0, `aria-hidden` flips). Passes. On touch it relies on focus from tap |
| Range sliders | `aria-valuetext` with unit ("120 W/m²"), arrows/PageDown/Home work |
| Stage viewer | `role=group` + `tabindex=0` + describedby help; arrows rotate, +/-/0 zoom/reset; the handler leaves ArrowDown to the page |
| Annotations (02) | four buttons "1. Sel PV & kaca. Tekan untuk melihat perannya", 200x24 px hit boxes; in tab order after the group. Good names |

Defects:

- **P1-3. Focus ring invisible on the whole 02 inspect stage.** `Inside.tsx:31` the dark stage wrapper has no `data-tone="stage"`, so the focus colour stays `#171C22` (`index.css:35`, flipped only by `[data-tone=stage]` at `:398`). Contrast of the ring against the stage `#0E1114` is **1.11:1**. Affects the stage group, the four annotation buttons, Urai / Potongan / Lapisan, zoom/reset (9 stops). Evidence `inspect-focus-toolbar.png`, `ring-annot.png`. Fix: add `data-tone="stage"` to that div (one attribute); the hero stage (`Hero.tsx:~96`) already has it and gets a 15.96:1 ring.
- **P2-6. Visual and tab order disagree in the hero.** Tab order is stage group, Perbesar, Perkecil, Atur ulang, then the Cerah/Hujan switch, "Buka Lab" (`pengalaman` stops 11 to 16), but the switch is at the top left of the stage visually. The toolbar sits before the `children` overlay in `CollectorStage.tsx`. Render the overlay first.
- **P2-7. Disclosure accessible name runs words together.** Button name is "DetailSuhu, pompa, catatan sistem" / "Rincian rekayasaPersamaan, asumsi, batas": `Disclosure.tsx` places `title` and `hint` spans with no space. Add `{' '}` or `<span class="sr-only"> - </span>` before the hint.
- **P3-1.** One `aria-controls` points at a non-rendered id (stage "Lapisan" button, `aria-controls="_r_2g_"` while closed).

### 4.2 Live regions

Regions on the page: Hero `status polite atomic` (throttled announcer), `LabStrip` `StatusDot live` x2 (role=status, one visible), Lab polite span, Comparison polite verdict, and 6 `<output>` elements (implicit `role=status`).

| Action (live3.mjs) | Announcements |
|---|---|
| 40 slider ticks G 900 to 500 (crosses the preset: "Kustom") | 1 ("Kustom") |
| 40 ticks rain 0 to 30 | 0 |
| 40 ticks T_in (crosses to "Pompa menunggu") | 1 each in Hero, Lab pill, Comparison verdict (3 in total, one event) |
| Dampak roofs 30 ticks | 3 output updates |
| Cerah to Hujan | 1 each in Hero, Lab pill, Comparison (3 in total) |
| Rapid switching 17 x 300 ms | Hero: 1 (throttled). **Lab pill: 17** |

Passes the main requirement: no spam on slider ticks or transitions in the Hero or Comparison. Defects:

- **P2-8.** `ui/Badge.tsx:40` (`role="status"` on `StatusDot live`) used in `lab/LabStrip.tsx` is unthrottled: 17 announcements in 5 s of rapid switching. Feed it from `useAnnouncement` or drop `live` there (the Hero already announces the same regime change).
- **P2-9.** One regime change is announced three times (Hero, Lab pill, Comparison verdict) because all three live regions are always in the DOM. Keep the Hero one; make the others `aria-live="off"` unless their section is in view.

### 4.3 Contrast of the new tokens

Tokens (computed): ink 16.1, ink-2 `#5B6670` 5.51 / 5.12 on sunken (fixed, was 4.67/4.34), ink-3 `#6A747E` **4.47 paper / 4.15 sunken** (still under 4.5; was 2.82), heat-ink 4.91, cool-ink 5.91, critical 5.18, heat-mark `#C4702D` 3.46 (graphics OK, was 2.69), `tick` 2.82 (decorative only). Stage tokens 6.4 to 16.2 on `#0E1114`. Fix ink-3 to `#606A74` (5.17 paper, 4.81 sunken, 4.91 heat-wash).

Over photos, measured per text run (`contrast3.mjs`: text hidden, background pixels sampled under each glyph box, p5 over pixels; thresholds 4.5 / 3 large). Images verified by eye in `docs/audit/perf3/c-*.png`. Items I measured but excluded as artefacts: mobile opening lead (reveal animation moved the box; visually legible, bg about RGB 102/91/78 = 6:1) and Lab schematic numerals (tspan fill not hidden in my probe).

| Element | Desktop p5 / median | Mobile p5 / median | Verdict |
|---|---|---|---|
| Opening headline (88 px, white) | passes | passes | OK |
| Opening lead (22 px, white 90 %) | passes | visually OK | OK |
| Opening credit line (13 px, white 70 %) | 3.55 / 4.53 | 4.13 / 5.25 | fails AA at p5 |
| Header nav, transparent state at top (14 px, white 70 %) | **3.04 to 3.75** / 3.3 to 4.0 | n/a (Menu button, passes) | fails AA, readable |
| Dampak lead (22 px / 18 px mobile, white 90 %) | **3.09 to 4.19** / 6.4 to 8.3 | **2.63 to 3.33** / 5.9 to 10.1 | fails at the bright rooftops; median fine |
| Dampak credit (13 px) | 3.58 / 5.22 | **2.07** / 6.19 | fails |
| **Closing headline "Atap yang sama. Dua manfaat." (88 px / 44 px, white)** | **1.64 / 2.41** (need 3) | **1.48 to 1.97** / 2.0 to 2.7 | **fails clearly**, white on the bright orange sky (`c-closing.png`, `m390-closing.png`) |
| Closing lead | passes | 3.13 / 5.14 | borderline on mobile |
| Closing "Baca asumsi dan batasnya" link | 2.99 / 11.5 | 3.22 / 15.2 | fails at p5 |
| Closing credit | passes | passes | OK |
| Hero helper lines under the stage card (13 px `#5B6670`) | **3.11 and 3.91** | n/a | fails: they sit inside the card's shadow-4 penumbra (`c-hero-below.png`) |
| Stage labels T_in / T_out / unit (stage-ink-2 `#8D979F`) | 3.65 to 4.02 | 2.2 to 4.0 | fail over the lit stage gradient |
| Inactive "Hujan" on the stage switch | 4.08 | n/a | just under |
| 02 annotation labels "Sel PV & kaca" (white 13 px) and numerals | **1.94 / 5.04** and **1.0 to 1.6** | 1.2 to 1.8 | fails where they overlap the bright layers; the 6 px dark halo is not enough |
| Section indexes "01 / 02 / 04", log-scale ticks | 4.47 | 4.47 | just under (ink-3) |

Fixes:
- Closing (`Closing.tsx`) scrim: use the Dampak-strength `scrim` S4/S5 on the left 60 % of the band, or move the headline to the dark lower half. Also darken the bright top-right sky region with a radial scrim.
- Dampak and opening credit: move credits onto the dark base gradient or give them `[text-shadow:0_0_6px_rgb(14_17_20/.8)]` as the annotations do.
- Header at the top of the page: add a 0 to 48 px dark top scrim under the transparent header (`SiteHeader.tsx`) or raise nav to white 90 %.
- 02 annotations: give the label a `bg-stage-0/70 backdrop-blur-sm px-1.5 rounded-xs` plate (`ui/Annotation.tsx:93,104`).
- Hero helper lines: add `mt-8` below the card (`Hero.tsx`) or colour them `ink`.
- Tokens: ink-3 `#606A74`; `stage-ink-2` `#9AA4AC` (7.5 on stage-0) for text on the lit stage.

### 4.4 Touch targets at 390 and 360 (pointer coarse emulated, DSF 3)

Before (pass 1) 29 of 68 under 44 px, 18 under 24 px. Now 83 targets: **18 under 44, 4 under 24**.

- Under 44 (38 px high): every `SegmentedControl` option (hero switch, Dampak scenario, Lab preset, pump, chart type, comparison scenario: 14 radios). Cause: `SegmentedControl.tsx:27` `pointer-coarse:h-12` minus `p-1` and the border leaves 38 px. Fix: `pointer-coarse:h-14` or `min-h-11` on the buttons and `h-auto` on the track.
- Under 24: "SolarVein, kembali ke atas" 68x20 (header logo), "Lihat di dalamnya" 114x20, "Baca asumsi dan batasnya" 169x20, skip link (hidden until focus). These are inline text links with generous spacing, so they meet WCAG 2.5.8 through the spacing exception; to be safe make them `inline-flex min-h-11 items-center` like "Buka Lab" already is.
- Everything else passes: sliders, number fields (`pointer-coarse:h-11`), InfoTip (hit area extended to 44), mobile menu items (48), switches, Disclosure rows (48), annotation chips.

### 4.5 CLS, overflow, fonts

- CLS (layout-shift observer, reload, scroll the whole page, switch weather): 1440 **0.0000 load / 0.0033 total**; 390 0.0000 / 0.0003; 360 0.0000 / 0.0017. Sources are the header nav indicator (0.0011) and the stage readout spans. Was 0.023 and 0.049.
- Horizontal overflow, all disclosures opened: document `scrollWidth == clientWidth` at 360, 390, 768, 1280, 1440. Nothing escapes its clipped container. Inner scrollers: Comparison (focusable region), 02 part chips, Lab chart tabs and 2 Lab tables (not focusable, see P2-1).
- Fonts: one `<link rel=preload as=font crossorigin>` for Instrument Sans latin (fetched once, loaded at 9 to 27 ms, correct `crossorigin`, no console warning), all `font-display: swap` (12 faces), FCP 476 ms, **LCP 572 ms desktop / 556 ms mobile** (the opening headline). Plex Mono latin 400 and 500 arrive at 168 to 211 ms via CSS (not preloaded). Total JS parsed on load 340 KB + 974 KB (three) + 403 KB (charts) raw; gz 112 + 260 + 113 KB.

## 5. Before / after summary

| Metric | Pass 1 (v1 prod / dev, SwiftShader) | Now (prod, Radeon 780M) |
|---|---|---|
| Idle frame rate | 7.8 fps (software) | 60 fps, p95 16.8 ms |
| Orbit drag p95 | 167 ms | 16.8 to 17.3 ms |
| Cerah to Hujan | rapid switch 7.7 s long tasks / 5 s | 0 long tasks, p95 19.3 ms |
| Slider tick script | 86 ms (prod), 770 ms (dev) | 13.4 to 22.8 ms (prod) |
| Offscreen stage frames | 14 to 58 GL fps (v1), 0 (current dev) | 0 when idle; **27 fps on input change (P0-1)** |
| Draw calls | 70 to 75 | 47 to 48 |
| Reduced-motion idle | 0 GL frames | 0 GL frames, 0 rAF, 0 animations |
| CLS | 0.023 / 0.049 | 0.0000 on load |
| Touch targets under 44 / under 24 | 29 / 18 of 68 | 18 / 4 of 83 |
| Contrast failures (tokens) | ink-3 2.8, heat 2.7 | tokens fixed except ink-3 4.47; photo text fails listed in 4.3 |
| First load | not measured | TBT 3.9 to 4.8 s cold, 0.2 to 0.5 s warm (**P0-2**) |

## 6. Open items for the lead

P0: (1) memo the stage canvas + remove `useSimResult` from `CollectorStage.tsx:123` + memo the `Environment` children; (2) keep `env` identical across tiers (`quality.ts:24`) and use `compileAsync` in `Warm`.
P1: focus ring on 02 (`Inside.tsx:31`), closing headline scrim, slow tier step-down, 60 fps idle loop.
Cannot be measured here: phone GPUs, GPU power draw, `renderer.info` in production (add a prod-safe `?debug` hook if a QA overlay is wanted).
