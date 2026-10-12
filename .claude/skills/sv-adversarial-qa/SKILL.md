---
name: sv-adversarial-qa
description: Adversarial desktop/mobile QA for SolarVein with Playwright — real screenshots at 1440/1280/768/390/360, rapid mode switching, slider extremes, dead-control detection, drag/zoom, reduced motion, no-WebGL fallback, console errors and overflow — plus a defect report with evidence. Use this before declaring any SolarVein change done, after every integration, when asked to "test", "verify", "check mobile", "QA", "review the rendered site", or whenever a claim about the UI needs screenshot evidence.
---

# SolarVein adversarial QA

Assume every visible control is broken until you have watched it work, and every claim ("smooth", "responsive",
"accessible") is false until a screenshot or measurement proves it. Code review cannot see overlapping labels, a
blank chart, an arrow lost in rain, or a slider that silently clamps — only the rendered page can.

## 0. Preconditions

Dev server running (SolarVein uses http://localhost:5190; don't start a second copy on a port someone else uses).
`playwright-core` is a devDependency; the scripts drive the system Chrome/Edge headless (no browser download).
`visual-qa.mjs` renders WebGL on the real GPU (ANGLE/D3D11) by default; `--swiftshader` forces CPU rendering,
whose timings are relative only. Always state which renderer a measurement came from.

## 1. Baseline sweep (always)

```bash
npm run qa -- --url http://localhost:5190 --out docs/audit/<run> --widths 1440,1280,768,390,360 --states sunny,rainy --sections --checks
npm run qa -- --url http://localhost:5190 --out docs/audit/<run>-rm --widths 1440,390 --reduced
```

The JSON report lists console errors, horizontal overflow offenders, broken numbers (NaN/undefined/Infinity),
rapid-switch errors, slider Home/End responses and toggles whose state never changes. **Open and look at every
PNG** (Read the files) — the script cannot judge legibility, overlap, hierarchy or whether the heat arrows are
visible in rain.

## 2. Adversarial scenarios (write a small Playwright script for each that applies)

1. **Rapid switching:** Cerah ↔ Hujan every 100–150 ms ×20, then wait 2 s — final state must match the last click;
   no stuck arrows, no half-faded rain, no overshooting numbers (sample readouts every 50 ms during a transition and
   check they stay between the two endpoints).
2. **Slider extremes:** every range at min and max (Home/End), and combinations that should produce
   "Pendinginan tidak menguntungkan pada kondisi ini." (rain on, hot source on, T_in below panel temperature).
3. **Dead controls:** click every button/toggle/tab; something observable must change (aria state, readout, canvas
   pixels — compare screenshot hashes before/after). Report any control that does nothing.
4. **3D interaction:** drag-orbit on the canvas, Ctrl+wheel / buttons to zoom, double-click / Reset View animates
   back, orbit bounds prevent under-floor views, mode change never resets the camera.
5. **Touch (mobile context with `hasTouch: true`):** vertical swipe over the stage still scrolls the page; controls
   ≥ 44 px; bottom control area reachable; no overflow at 360.
6. **Reduced motion:** `reducedMotion: 'reduce'` — no continuous rAF-driven animation after settle (count rAF
   callbacks over 2 s), direction cues still readable in a static pose.
7. **No WebGL:** launch with `--disable-gpu --disable-webgl` (or stub `getContext` to return null) — the SVG fallback
   must render and remain interactive.
8. **Keyboard:** Tab through header → mode switch → stage toolbar → Lab sliders; visible focus ring everywhere;
   arrow keys on the segmented control and sliders.
9. **Regression vs baseline:** compare against `docs/audit/before/` (or the last approved run) at the same widths;
   call out anything that got worse.

## 3. Report (write to docs/audit/<run>/QA.md)

Per defect: ID · location/component · reproduction steps · expected vs actual · severity (P0 blocks release,
P1 must fix, P2 polish) · evidence (screenshot path, JSON excerpt, measurement). End with a release verdict:
**PASS** only if there are no P0/P1 items and every control in the inventory was exercised.
