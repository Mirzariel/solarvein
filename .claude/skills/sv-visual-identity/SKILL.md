---
name: sv-visual-identity
description: SolarVein's visual identity — scientific editorial page, precision-instrument numbers, cinematic 3D stage on a hotel roof, instrument-style SVG router diagrams — with the tokens, v2 colour semantics, accent budget, evidence-tag dots, anti-patterns and a screenshot review rubric. Use this whenever you design, restyle, review or critique ANY SolarVein UI (sections, controls, charts, router/tank/desiccant diagrams, the 3D stage, presentation mode, mobile layouts), choose colours/type/spacing, or judge whether something "looks generic/AI-made", even if the request only says "make it look better" or "polish this component".
---

# SolarVein visual identity (v2)

SolarVein reads as **a calibrated instrument shown on a studio bench**: the page a serious deep-tech company
publishes at launch. The v2 story (heat from hotel-roof PV/T is routed to the most valuable use) changes what colour
and shape *mean*, not the identity. Most "AI-looking" UI comes from a handful of reflexes (eyebrow + headline +
paragraph on every block, pill badges, icon-in-a-box, five accent colours, a card around everything). Notice them and replace them.

## The three registers (never mix them on one element)

1. **Scientific editorial: the page.** Paper `#F6F5F2` ("Daylight Concrete"), **Geist** (Medium 500 headings),
   whitespace, 1 px hairlines, numbered sections (`03 — Cara kerja`), one declarative sentence where a lesser page
   would use a paragraph.
2. **Precision instrument: every number and diagram label.** **Geist Mono**, tabular figures, decimal comma (id-ID),
   true minus `−`, unit in a lighter tone, 1 px ticks/leaders. Numbers look *measured*, not *marketed*.
3. **Cinematic product: the 3D stage only.** Graphite seamless background, soft key + cool rim, glass/aluminium/copper,
   slow camera; now with a **hotel roof** (plinth, parapet, plant room, ghost neighbours). Cinematic ends at the stage's 16 px radius.

Fonts and tokens: `src/index.css` is the source of truth (Geist / Geist Mono via Fontsource; no Inter, no IBM Plex).

## Colour = medium, shape = destination

| Meaning | Page | Stage / SVG |
|---|---|---|
| Heat in the liquid (every router branch) | `heat-mark #C4702D` marks, `heat-ink #A8561A` text | `#F0A05C` |
| Delivered to hot water | solid path to the preheat HX | solid |
| Stored | tank outline + amber fill level (SoC) | same |
| Desiccant regeneration, heat-pump source | **dashed** = not yet validated | dashed |
| Bypass / unused | `loss #B8C0C6` grey | grey |
| Dehumidified supply air, moisture | `cool #398BAE` / `cool-ink #1F6785` (only use of cool) | `#5FB3D6` |
| Regeneration exhaust | `ink-2 #5D6066` | `#8D979F` |
| Electricity | `ink #111214` + bolt glyph, never coloured | warm-white `#F1EDE4` |

Retired: cool = heat rejection, rain, cyan arrows, reversed arrows. Heat only flows cell → liquid → destination.

**Accent budget (per mode):** A = ink + amber · B = amber + cool (the only mode with both) · C = mostly neutral, dim
amber tank discharge. ≤ 3 coloured text spans per viewport; chrome (buttons, nav, focus) always neutral. No gradients
except the liquid ramp; no glow; no lime; no rainbow.

**Evidence dots** (ink-2, shape only, never colour): filled = established / published (published adds its citation) · half = simulation · hollow =
assumption · **dashed hollow = hypothesis** · diamond = proposed innovation. Label text on first use per viewport; legend in
Validasi. Desiccant status "Hipotesis riset · belum divalidasi" with a dashed dot, no amber/red/warning icon.
**Dashed means "not yet validated" everywhere**: router path, chart series, hairline. Pins/callouts ≤ 3 per viewport.

## Diagrams, stage, presentation

- **Router / tank / desiccant** are flat 1 px instrument SVGs with mono labels and units. No isometric drawing, no
  icon boxes. Branch width ∝ W_th, total held constant on a mode change; vanish at night. Light-paper variant for export (`data-export`).
- **Stage:** hotel roof canvas, pull-back camera, ≤ 4 annotations, model ≈ 70 % of stage width; the camera never
  moves on an A/B/C switch. Photos captioned "Ilustrasi, bukan dokumentasi proyek".
- **Presentation mode `?presentasi=1`:** fixed scenes, larger type, secondary chrome hidden, legible at 1280×720 / 125 %.
  No extra effects added for the stage.

## Layout & type

- 12-column grid, content max ≈ 1280 px, spacing tokens 4/8/12/16/24/32/48/64/96, radii 4/8/12/16.
- Type (see `src/index.css`): display 64–96, h2 36–44, h3 28, body 17–19, labels 12, mono readouts 24–44. Max two
  heading lines, ≤ 64 ch, no uppercase tracked eyebrows.
- Cards only when they group controls with outputs (e.g. the Lab rig). Never card-in-card.
- One focal point per viewport: stage in Sistem, router diagram in Cara kerja, 24 h chart in Sehari, verdict + ledger in Dampak.

## Hard prohibitions (each is a generator reflex)

No eyebrow caps above headings · no pill/chip badges (use `● Air panas` inline with a 6 px dot) · no icon-in-box · no
coloured left borders or tinted cards · no backdrop blur except the sticky header · no paragraph of 3+ sentences
outside a disclosure · never repeat in text what an animation already shows · no animation of heat the sim doesn't compute.

## How to apply it

1. Read `src/index.css` (tokens), `DESIGN_SYSTEM.md`, and for rationale / 3D art direction `references/identity.md`.
2. Build with tokens and `src/ui/` primitives: no hex literals in components, no arbitrary spacing.
3. Render it. Real screenshots at 1440, 1280×720 and 390 (`npm run qa -- --widths 1440,1280,390 --out <dir>`); judge pixels.
4. Score with the rubric. A failing blocking item means not done.

## Review rubric (evidence for each: screenshot path + what you see)

1. Foundation: only the stage is dark; no gradients/glows (`grep -rE "gradient|glow|backdrop" src`).
2. Tokens only; Geist + Geist Mono only.
3. Typography: scale respected, mono for every number and nowhere else, decimal comma.
4. **Anti-patterns absent** (blocking): eyebrows, pills, icon boxes, card-in-card, repeated statements.
5. Section skeleton: hairline + `0N — Nama`, ≤ 1 short H2 + ≤ 1 sentence.
6. **Accent budget and colour semantics** (blocking): per-mode budget; electricity never coloured; cool only for
   dehumidified air/moisture; dashed only for not-validated paths; no arrows pointing out of the liquid.
7. Evidence dots by shape only; pins ≤ 3; desiccant status wording exact.
8. Controls: heights 32/40, all states, 2 px focus ring.
9. Data and diagrams: unboxed tables, right-aligned mono numbers, ≤ 4 series, direct labels, 1 px SVG strokes, no isometric/icon boxes.
10. Stage: inset, 16 px radius, 1 px edge, hotel roof present, ≤ 4 annotations.
11. Hierarchy and presentation: one focal point; 1280×720 at 125 % legible; mobile no overflow at 360/390, 44 px targets.
12. **Generic-template test** (blocking): would a design lead mistake this for a template? Name the element and the fix.

Report defects as: location · why it is a problem · severity (P0/P1/P2) · concrete fix · screenshot evidence.
