# SolarVein — Design Audit (before → after)

Screenshots are real renders: system Chrome via `playwright-core`, WebGL on the real GPU (AMD Radeon 780M,
ANGLE/D3D11) unless stated. "Before" = the first build (dark theme), captured before the redesign started.
Full independent reviews live in [docs/audit/](docs/audit/).

## Process

| Pass | What happened | Evidence |
|---|---|---|
| 1 — Audit | Six independent audits of the first build: visual critic, UX/copy, physics, motion, perf/a11y, creative direction | `docs/audit/01…06` |
| 2 — Direction | Design system v1, then the user's direction update (US startup vibe, photography, depth, Jobs-level typesetting and copy, truly realistic 3D) → art direction v2 + copy deck, physics fixes | `docs/audit/05, 07`, `DESIGN_SYSTEM.md`, `docs/PHYSICS.md` |
| 3 — Implementation | Design system, 3D, motion/weather engine, IA + sections, built by separate agents on partitioned files | source |
| 3b — Independent critique | Visual critic, QA, physics reviewer, perf engineer on the rendered site | `docs/audit/08–11`, `docs/audit/qa-pass3/QA.md` |
| 4 — Corrections | Every P0/P1 routed back to the owning implementer; lead integration fixes | this file |
| 5 — Re-review | Visual critic + QA re-check; physics sign-off | `docs/audit/09` (Pass 5), `qa-pass3/QA.md` (Pass 5), `docs/audit/10` (Pass 4) |

## Before → after

| Area | Before | After |
|---|---|---|
| First impression | Dark neon dashboard; eyebrow + headline + paragraph | Full-bleed golden-hour photo, one line: "Matahari memberi dua hal. Ambil keduanya." |
| | `docs/audit/before/d-hero.png` | `docs/audit/after/final/1440-sunny-hero.png` |
| The model | Stylised slab, random sun "strands", cyan arrows lost in cyan rain | Real-proportion module (1.70 × 1.00 m, 35 mm extruded frame) on a concrete roof, studio light, smooth glass reflection; warm light + glint for sun, neutral rain, an even grid of heat arrows |
| | `docs/audit/before/d-hero.png`, `docs/audit/critic/` | `docs/audit/after/final/stage-1440-sunny.png`, `stage-1440-rainy.png` |
| Inside the hardware | Toolbar of toggles + paragraphs | 02 inspect stage: exploded layers, four clickable annotations with one live value each |
| | — | `docs/audit/after/final/stage-1440-inside.png` |
| Mobile | Model ~110 px tall, toolbar ate the stage, no readouts above the fold | Hand-set headline over the photo, compact stage, readouts under the stage, 44 px targets |
| | `docs/audit/before/m-hero.png` | `docs/audit/after/final/390-sunny-hero.png`, `390-sunny-pengalaman.png` |
| Story | 7 sections repeating the same claims | Opening → 01 Pengalaman → 02 Di dalam → Dampak → 03 Lab → 04 Perbandingan → Penutup |
| Copy | ~3 300–3 600 visible words; "cairan selalu masuk → keluar" ×15, disclaimer ×8 | ~925 visible words (−75 %); each science-critical statement once, at the place it matters; depth in disclosures |
| Type | Inter + JetBrains Mono, 22 text sizes, some < 10 px | Instrument Sans (narrow width, 600) + IBM Plex Mono for instrument numbers only; hand-set display breaks, corrected word spacing, decimal comma, NBSP before units, true minus |
| Colour | Six accent families incl. lime | Paper + ink; amber = heat, blue = cooling/rejection, warm-white electrical pulses on stage only |
| Impact | Gross carbon credit, chiller baseline | Dampak scaler: incremental vs. conventional PV, 50 % heat-use default, honest ledger (19,2 GWh panas, 14,9 GWh listrik, ≈ 4 934 t CO₂e/yr for 10 000 roofs × 4 panels, assumptions editable) |
| Comparison | Verdict could favour dual-mode on ties | Ties shown as "setara"; conventional PV wins where it should; dry cooler (COP 30) as the honest baseline |

## Motion

| | Before | After |
|---|---|---|
| Mode switch | Inputs jumped; visuals chased the final state with separate smoothers; readouts overshot (+3 376 W for one frame) | GSAP timeline interpolates the *inputs* over 0,75–1,1 s and runs `simulate()` each frame; heat flow and P_e are monotone (+687 → −550 W_th, 284 → 38 W_e); arrows fade through zero and reverse only after the computed sign flips; no temperature undershoot |
| Readouts | 8 rAF `setState` loops | Throttled ref-driven text, statement synced with the numbers |
| Flow | Particles teleported at the outlet → inlet seam | Arc-length packets fade in/out over the stubs; never reverse |
| Camera | 430 ms first-order tween, could go under the grid, auto-rotate on | Critically damped spring orbit (~800 ms reset), bounded, inertial; pinch zoom on touch; mode changes never move it |

## Performance and accessibility (real GPU, 1440 × 900, production)

| Metric | Before | After |
|---|---|---|
| Steady state (idle, rain, orbit, inspect, mobile DSF 3) | 14–58 fps offscreen rendering, unmeasured on GPU | 60 fps, frame p95 16,8–17,5 ms, 0 long tasks; idle capped at 30 fps; 0 frames when offscreen |
| Cerah → Hujan transition | 10 long tasks / 7,7 s (rapid switching) | p95 19,3 ms, max 35 ms, 0 long tasks |
| Lab slider tick | ~86 ms script | 13,4 ms script |
| Draw calls (hero) | 70–75 | 43–48 |
| CLS / overflow | overflow at 390 | CLS 0,00; no overflow at 360–1440 |
| Touch targets < 44 px (390) | 29 / 68 | reduced to a handful of inline text links (see remaining issues) |
| Reduced motion | partial | 0 rAF / 0 GL frames at idle; direction cues remain readable |

## Physics review outcome

Independent reviewer: no P0/P1 remains (Pass 4 sign-off in `docs/audit/10-physics-visuals.md`). Key corrections made
during the redesign: glass-laminate series resistance, rain effectiveness 0,5 with an uncertainty band, rain shown to
contribute ≈ ¼ of rejection, dry-cooler COP baseline, incremental carbon ledger with a heat-use fraction, honest
negative electricity difference vs. plain PV, arrows driven by the live sign of q.

## Final reviewer verdicts

| Reviewer | Verdict | Report |
|---|---|---|
| Visual critic (Pass 5) | "Looks like a designed product from a real startup — neither AI-generated nor stiff"; 3D "a believable CG product render", ≈ 7/10 next to the opening photo. Its two new P1s were resolved: N1 (COP 30) is the intended dry-cooler baseline signed off by the physics reviewer; N2 (broken section cut) fixed. | `docs/audit/09-visual-critic-pass3.md` |
| QA (Pass 5) | **PASS** — 0 P0 / 0 P1, every control exercised, no console/network/overflow errors at 360–1440, pinch + truthful hints, no transition undershoot | `docs/audit/qa-pass3/QA.md` |
| Physics (Pass 4) | Signed off — engine, effects, copy and numbers; no P0/P1 | `docs/audit/10-physics-visuals.md` |
| Perf/a11y (Pass 3) | 60 fps steady state on GPU, both P0s fixed afterwards by the 3D engineer (offscreen re-renders, cold-load shader recompiles) | `docs/audit/11-perf-a11y-pass3.md` |

Lead fixes after the last reviews: −0,0 sign in the Dampak ledger, stage labels kept clear of the zoom buttons
(verified at 880 px), plain slider labels, clearer Dampak electricity sentence, legible stage hint, stage loading
poster from our own render.

## Remaining issues and limitations

- Minor P3s from QA: Esc doesn't close the 02 layer menu after "Tampilkan semua"; three console warnings at load
  (THREE.Clock deprecation inside a dependency, an ANGLE shader warning); the "Keluar" label can clip at maximum zoom;
  the regime headline trails the numbers by ~0,3 s during a transition; "Panel memanen panas" wording at G = 0
  (heat drawn from ambient air — model-consistent, wording could say so).
- The closing photo sits under a heavy scrim — a deliberate trade-off for ≥ 3:1 headline contrast.
- The first viewport is the opening photo; the interactive stage starts just below it (intentional per art direction v2).
- 3D vs. photography: the sunny stage is cooler/flatter than the golden-hour photos (no colour channel in the stage
  mood yet). Weak-GPU behaviour is handled by quality tiers but was only measured on one integrated GPU.

- 3D: the glass glare is soft rather than a crisp mirror reflection; no dust/droplet detail at normal zoom; the
  golden-hour warmth of the marketing still is a grade, not the live scene.
- Physics P2s (non-blocking): a few Lab strings mix decimal styles; the Inside "Rugi belakang" sign; the no-load hero
  detail omits the stagnation penalty; the stage `aria-label` uses the committed (not interpolated) result.
- Not measured: phone GPUs, real devices, screen readers (keyboard/ARIA verified by script only).
- The simulation remains an educational, steady-state, single-node model — see README → Limitations.
