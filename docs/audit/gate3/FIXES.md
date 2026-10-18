# Gate 3: final fix list

Sources: the QA functional pass, the QA performance and accessibility pass, and the visual/physics re-check.

Evidence is in `C:\Users\LENOVO\Downloads\solarvein\audit-gate3\{qa1,qa2,visual}\`.

**Status:** no P0 remains in the physics or the numbers. All numbers are consistent across sections.

## By owner

### W6 (viz3d) — fix in progress
- **P0: shader compile freeze.** Each stage freezes for 1,2–2,6 s the first time it renders. Fix it with `compileAsync` warm-up at idle.
- **TempLabels:** the readout runs a 15 Hz `setState`. Check that it never loops (see W5).

### W5 (motion)
- **P1: "Maximum update depth exceeded" at ≤ 768 px.** It fires 2–3× per run when scrolling into the Lab at 390 px.
  - The stack ends in `dispatchSetState` at `src/motion/hooks.ts:23` (`useVisualSelect` `setValue`), called from `systemEngine` `emit` / `publish` / `tick`.
  - Candidate consumers:
    - `useRouterView` at 30 Hz (`src/sections/router/useRouterView.ts:214`, mobile router)
    - `TempLabels` at 15 Hz
    - `useGlide` `setShown`
  - Find the loop and fix it at the root. Use an equality guard so `setValue` is skipped when the selected value is unchanged, and never call `setState` synchronously inside an emit that a render can trigger.
  - Report to the owners if the root cause is in their file.

### W7 (Opening, Masalah, Sistem, Sistem-dalam, Jeda, Closing, header/footer)
- **P1: deep links on a cold load.** Opening the page directly at `/#dampak`, `/#pustaka`, `/#perbandingan` or `/#lab-rincian` does not land on the section; `/#dampak` and `/#pustaka` do not scroll at all.
  - Lazy sections are not mounted yet, so the scroll targets a placeholder and the layout then shifts.
  - Fix in `SiteHeader`, which owns the alias effect: for ANY hash (aliased or not), resolve it, then keep re-scrolling until the target's top is stable for ~500 ms (max ~6 s), or until the user scrolls.
  - The lead will tune the `Lazy` `minH` values in `App.tsx` if you report better estimates.
- **P1: Sistem at 1280×720.** The stage and its readout cannot be seen together. At viewport heights ≤ 760 px, cap the stage at about 56 vh.
- **P2: Masalah blank space.** About 230 px is left empty under the stat columns, because the video column sets the row height. Align the stat columns to the video, or shrink it.
- **P2: "Buka Lab" sits inside the scenario pill group.** It reads as a fourth option; move it out of the group.
- **P2: mobile background seam** through the Sistem text at about y 315 (`statem\1`).
- **P2: header touch targets.** Nav links are 36 px tall; make them ≥ 44 px on coarse pointers.
- **P2: header scroll-spy cost.** It calls `elementFromPoint` on every scroll frame, which cost 360–790 ms in the profiles. Cache it, or switch to an IntersectionObserver or a rAF-throttled read.
- **P2: first-scroll hitch at Masalah** (717 ms), probably a lazy chunk load. Preload earlier, or make the chunk smaller.

### W8a (Router)
- **P1: mobile state leak.** After a pass through the mobile router, the global hour/scenario stays at night. Sistem then shows "Kondisi kustom" with 0 kW, and Sehari opens at 24:00. The mobile router clock must be LOCAL (like the desktop scrub, it must not write store hour/scenario), or must restore the store state on leave.
- **P1: 1280×720 layout.** The diagram ends at about x = 945, leaving roughly 300 px empty on the right. Let it use the full width: a wider viewBox, or a layout tuned for short viewports.
- **P1: supply-air colour.** The cool (blue) supply line currently turns on with `view.mode === "B"`, which is the old meaning of B. Show it in `cool` ONLY when the desiccant actually supplies dried air (`desOn`); otherwise use ink-2. This applies to both `RouterDiagram.tsx:306` and `RouterMobile.tsx:65`.
- **P1: screen-reader chatter.** The router sentence `<p aria-live>` (`RouterSection.tsx:156`) announces while the scroll clock moves (7 announcements per pass), and it double-announces A/B/C clicks together with the Sistem announcer. Make it live only on explicit user action (A/B/C buttons), or not live at all.
- **P2: strip and layout polish.**
  - The clock label overlaps "G puncak" near the left edge.
  - The first frame shows 07:24 and jumps to 05:27 on the first scroll; initialise at the pin start hour.
  - The mode tabs jump about 8 px when the caption wraps; reserve two lines.
  - The Termal/Listrik/Udara legend is still shown top-right in addition to the strip; keep only what is not redundant.
  - Fine print in the diagram is about 11 px; make it ≥ 12 px for the projector.
- **P2: first entry to #router** causes a 1,2 s long task. Find it, then pre-build or defer the work.

### W8b (Sehari, Desikan)
- **P2: unit subscripts.** Chart axis titles print "kWth" and "kWe". Use the subscript helper (`<tspan>` in SVG). The "kWe" label also collides with the "4" tick on the Desikan y-axis.
- **P2: dead space.** About 100 px is empty under the Sehari disclosure before the next section.
- **P2: first-use hitches.**
  - The first scrubber sweep produces 1,3 s and 0,6 s long tasks.
  - The Sehari entry sweep runs at p95 50 ms with a 233 ms maximum.
  - Pre-build the day model at idle, and avoid a React re-render of the whole chart per sweep tick (paint the playhead and readout via refs).

### W9b (Lab)
- **P1: accessible names.** The range inputs have no accessible name; only 1 of 19 sliders is found by role and name. Add `aria-label` or `aria-labelledby` to each.
- **P1: Sankey label collision.** "Tangki 97,8 kWh_th" overlaps "Desikan (hipotesis) 0,0". Hide labels for zero-flow nodes, or offset them.
- **P2: slider freezes** of 300–990 ms on some sliders (dev build): Suhu regenerasi minimum, Jumlah kamar, Pompa hidup, COP koil, Volume tangki. The sim is now faster (simulateSystem ≤ 14 ms warm), so check what remains. The suspects are the year and baselines recompute after the debounce; consider `requestIdleCallback` chunking, or skip baselines until their disclosure or readout is visible.
- **P2: number input** `1e999` snaps to the minimum; it should clamp to the maximum.
- **P2: touch targets.** Number inputs are 26 px tall and switches are 40×24; make them ≥ 44 px on coarse pointers. The InfoTip hit area is handled by the lead in `ui/`.

### W10b (presentation)
- **P1: HUD desync after A/B/C keys.** Repro: press 3 then B, and the HUD shows "5/9 Cara kerja" while Sehari is on screen. Pressing A in scene 9 resets the day view, but the HUD stays on 9/9.
  - Cause: the mode change shifts the layout by 27 px, and the scroll re-sync (`cursorFromTops`) then picks the wrong scene.
  - Fix: never re-derive the scene from scroll position after a key action; the scene state is authoritative.
- **P2: `?skenario=malam` is overridden.** The scenario is reset to A/13:00 when stepping to Sehari. Keep the URL scenario until the presenter presses A/B/C or R.
- **P2: hash leftover.** The Home key leaves `#lab-rincian` in the URL; clear it.

### Lead
- **Disclosure:** add a visual separator between the title and the hint.
- **Evidence:** make the focus ring visible on evidence dots.
- **InfoTip:** coarse-pointer hit area ≥ 44 px.
- **Lab rhythm (optional):** one high-contrast break near the Sankey.
