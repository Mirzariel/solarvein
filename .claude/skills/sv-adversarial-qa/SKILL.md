---
name: sv-adversarial-qa
description: Adversarial desktop/mobile/projector QA for SolarVein with Playwright — real screenshots at 1440/1280/768/390/360 and 1280×720 at 125 %, rapid A/B/C switching, 24 h scrubber and "3 hari hujan" toggle, desiccant verdict sweep, presentation-mode keyboard path, /export figures, slider extremes, dead controls, reduced motion, no-WebGL, console errors and overflow — plus a defect report with evidence. Use this before declaring any SolarVein change done, after every integration, when asked to "test", "verify", "check mobile", "QA", "review the rendered site", or whenever a claim about the UI needs screenshot evidence.
---

# SolarVein adversarial QA (v2)

Assume every visible control is broken until you have watched it work, and every claim ("smooth", "responsive",
"accessible", "the desiccant works") is false until a screenshot or measurement proves it. Code review cannot see
overlapping labels, a blank chart, a router branch that stays wide at night, or a slider that silently clamps.

## 0. Preconditions

Dev server running (SolarVein uses http://localhost:5190; workers use 5191+; don't start a second copy on a port
someone else uses). `playwright-core` drives the system Chrome/Edge (no browser download). `visual-qa.mjs` renders
WebGL on the real GPU (ANGLE/D3D11) by default; `--swiftshader` forces CPU rendering, timings relative only. State
which renderer each measurement came from. The gate before QA: `npm run gate`.

## 1. Baseline sweep (always)

```bash
npm run qa -- --url http://localhost:5190 --out docs/audit/<run> --widths 1440,1280,768,390,360 --sections --checks
npm run qa -- --url http://localhost:5190 --out docs/audit/<run>-rm --widths 1440,390 --reduced
```

Add `--states` as supported by the current script (A/B/C modes). The JSON report lists console errors, horizontal
overflow, broken numbers (NaN/undefined/Infinity), rapid-switch errors, slider Home/End responses and dead toggles.
**Open and look at every PNG**; the script cannot judge legibility, overlap, hierarchy or colour semantics.

## 2. Adversarial scenarios (write a small Playwright script for each that applies)

1. **Rapid A/B/C switching:** switch A↔B↔C every 100–150 ms ×20, then wait 2 s. Final state matches the last click;
   no stuck packets, half-faded branches or overshooting numbers (sample readouts every 50 ms; they stay between endpoints);
   router branch widths sum to the total throughout; the camera does not move.
2. **24 h scrubber + "3 hari hujan":** drag/key the scrubber to 00:00, 06:00, 13:00, 18:00, 24:00; at night collection
   is 0 and the router arrows vanish. Toggle 24 jam ↔ 3 hari hujan repeatedly: tank SoC decays, solar fraction falls,
   backup takes over, **unmet demand stays 0**, no NaN, panel "Saat hujan panjang & malam" shows its four lines.
3. **Desiccant verdict sweep:** T_regen 40 / 50 / 60 / 70 °C × regeneration air ambient vs exhaust. Record verdict
   (layak / marginal / tidak layak) per cell. "Desikan tidak menguntungkan pada kondisi ini." appears exactly when
   net ≤ 0; status stays "Hipotesis riset · belum divalidasi"; chart updates without flicker; verdict is never
   hard-coded (cross-check against `desiccantSweep` values).
4. **Presentation mode `?presentasi=1`:** keyboard path ←/→ through scenes, 1–8 jump, R reset, L assumptions;
   `?skenario=terik|lembap|malam&jam=13` presets; focus never trapped; secondary chrome hidden; no scroll jank;
   backup scene "Bagaimana jika hujan 3 hari?" reachable.
5. **Projector:** viewport 1280×720 with 125 % zoom (deviceScaleFactor 1.25 or CSS zoom) on every demo-path scene
   (Masalah, Sistem, Sehari, Dampak): no clipped text, no overlap, labels ≥ legible from a distance.
6. **Exports `/export?static=1`:** every `[data-export]` figure renders without animation, at deviceScaleFactor 3,
   with fonts inlined, source/data footer present, light-paper variant legible, no console errors, no "NaN".
7. **Slider extremes:** every range at min and max (Home/End); area 0 m² (equals B1, no NaN),
   very large area (surplus shows as explicit bypass, never hidden), tank 0 L, low/high flow; combos that should show "Desikan tidak menguntungkan…".
8. **Dead controls:** click every button/toggle/tab; something observable must change (aria state, readout, canvas
   hash). Report any control that does nothing. Old hashes (`#pengalaman`, `#perbandingan`) alias correctly.
9. **3D interaction:** orbit/zoom bounds, Reset View, pull-back to the hotel roof on scroll, A/B/C change never resets the camera.
10. **Touch (`hasTouch: true`):** vertical swipe over the stage scrolls the page; controls ≥ 44 px; no overflow at 360.
11. **Reduced motion** (`reducedMotion: 'reduce'`): no continuous rAF animation after settle (count rAF over 2 s);
    A/B/C tabs and the vertical layout render; direction cues readable statically.
12. **No WebGL** (`--disable-gpu --disable-webgl` or stub `getContext` → null) and viewport < 1024 px: purpose-built
    fallback renders, remains interactive, no pinned scenes.
13. **Keyboard + a11y:** Tab through header → A/B/C → stage → scrubber → Lab; visible focus ring; arrow keys on
    segmented controls and sliders; evidence dots have text labels (not colour only).
14. **Truth checks while looking:** amber arrows never point out of the liquid; electricity is never coloured; cool
    appears only for dehumidified air/moisture; dashed only for not-validated paths; kWh_th and kWh_e never summed without a factor.
15. **Regression vs baseline:** compare against `docs/audit/before/` (or the last approved run) at the same widths.

## 3. Report (write to docs/audit/<run>/QA.md)

Per defect: ID · location/component · reproduction steps · expected vs actual · severity (P0 blocks release,
P1 must fix, P2 polish) · evidence (screenshot path, JSON excerpt, measurement). End with a release verdict:
**PASS** only if there are no P0/P1 items and every control in the inventory was exercised.
