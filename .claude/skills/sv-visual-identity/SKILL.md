---
name: sv-visual-identity
description: SolarVein's visual identity — scientific editorial page, precision-instrument numbers, cinematic 3D stage — with the tokens, accent budget, anti-patterns and a screenshot review rubric. Use this whenever you design, restyle, review or critique ANY SolarVein UI (sections, controls, charts, the 3D stage, mobile layouts), choose colours/type/spacing, or judge whether something "looks generic/AI-made", even if the request only says "make it look better" or "polish this component".
---

# SolarVein visual identity

SolarVein should read as **a calibrated instrument shown on a studio bench** — the kind of page a serious
deep-tech company publishes at launch. Most "AI-looking" UI comes from a handful of reflexes (eyebrow + headline +
paragraph on every block, pill badges, icon-in-a-box, five accent colours, a card around everything). This skill
exists so you notice those reflexes and replace them with deliberate decisions.

## The three registers (never mix them on one element)

1. **Scientific editorial — the page.** Warm-white paper `#F6F5F2` ("Daylight Concrete"), Geist (Medium 500 for headings), generous whitespace, 1 px hairlines,
   numbered sections (`01 — Pengalaman`), one declarative sentence where a lesser page would use a paragraph.
2. **Precision instrument — every number.** Geist Mono, tabular figures, decimal comma (id-ID), true minus `−`,
   unit in a lighter tone, ticks/leader lines at 1 px. Numbers look *measured*, not *marketed*.
3. **Cinematic product — the 3D stage only.** Graphite seamless background, soft key + cool rim light, believable
   glass/aluminium/copper, slow camera. Cinematic ends at the stage's 16 px radius.

## Colour is physics, not decoration

| Meaning | Page | Stage |
|---|---|---|
| Heat harvest (panel → liquid, W_th > 0) | `heat #D98442` fill, `heat-ink #A8561A` text | `#F0A05C`, arrows point into the liquid |
| Heat rejection (liquid → panel → ambient, W_th < 0) | `cool #398BAE`, `cool-ink #1F6785` text | `#5FB3D6`, arrows point out of the liquid |
| Electrical output W_e | solid `ink #171C22` + small bolt glyph — never coloured | warm-white `#F1EDE4` pulses |
| Structure, losses, conventional baseline | `ink-2 #66717C`, `loss #B8C0C6`, `line #E3E7E9` | `#8D979F` |

Accent budget per viewport: **ink + the one active thermal colour**; the other thermal colour appears only where it
is physically present. ≤ 3 coloured text spans per viewport. Chrome (buttons, nav, focus, selection) is always
neutral. No gradients except the liquid temperature ramp; no glow; no lime; no rainbow. Rain must stay neutral and
desaturated so heat arrows remain the hero of the stage.

## Layout & type

- 12-column grid, content max ≈ 1280 px, spacing tokens only: 4/8/12/16/24/32/48/64/96. Radii 4/8/12/16.
- Type: display 56/60 (48–64 desktop range), h2 36/44 (28–40), h3 20/28, body 16/26 or 14/22, labels 12/16,
  mono readouts 40/28/20. Max two heading lines, ≤ 64 ch line length, no uppercase tracked eyebrows.
- Cards only when they group controls with their outputs (e.g. the Lab rig). Never card-in-card.
- One focal point per viewport: the model in 01/02, controls + energy flow in 03, verdict + table in 04.

## Hard prohibitions (each is a common generator reflex)

No eyebrow caps label above headings · no pill/chip badges (use `● Panen panas` inline text with a 6 px dot) ·
no icon-in-box · no coloured left borders or tinted cards · no backdrop blur except the sticky header ·
no paragraph of 3+ sentences outside a disclosure · never repeat in text what an animation already shows.

## How to apply it

1. Before designing, read `DESIGN_SYSTEM.md` (final tokens; source of truth together with `src/index.css`) and,
   for the rationale or the 3D art direction, `references/identity.md`.
2. Build with tokens and the primitives in `src/ui/` — no hex literals in components, no arbitrary spacing.
3. Render it. Take real screenshots at 1440 and 390 (`npm run qa -- --widths 1440,390 --out <dir>`); judge pixels,
   not code.
4. Score it with the rubric below. Anything failing a blocking item is not done.

## Review rubric (answer each with evidence: screenshot path + what you see)

1. Foundation: only the stage is dark; no gradients/glows (`grep -rE "gradient|glow|backdrop" src`).
2. Tokens only: colours, spacing, radii from the system; Geist + Geist Mono only.
3. Typography: scale respected, mono for every number and nowhere else, decimal comma.
4. **Anti-patterns absent** (blocking): eyebrows, pills, icon boxes, card-in-card, repeated statements.
5. Section skeleton: hairline + `0N — Nama`, ≤ 1 short H2 + ≤ 1 sentence.
6. **Accent budget** (blocking): ink + active thermal colour; W_e never coloured on the page.
7. Controls: heights 32/40, every state (default/hover/pressed/selected/focus/disabled), 2 px focus ring.
8. Data: unboxed tables, right-aligned mono numbers, ≤ 4 chart series, direct labels.
9. Stage: inset, 16 px radius, 1 px edge, model fills ~70 % of stage width, ≤ 4 annotations.
10. Hierarchy: a single focal point per viewport; no accidental empty areas.
11. Mobile: no horizontal overflow at 360/390, 44 px touch targets, deliberate (not shrunken) layout.
12. **Generic-template test** (blocking): would a design lead mistake this for a template? Name the specific
    element that makes it look generated and the concrete fix.

Report defects as: location · why it is a problem · severity (P0/P1/P2) · concrete fix · screenshot evidence.
