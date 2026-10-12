---
name: sv-content-reduction
description: Cut SolarVein's visible copy through progressive disclosure (show first, explain second, details on demand) without losing any scientifically necessary statement. Use this whenever you write, edit or review user-facing text, headings, labels, tooltips, advisories, section structure or information hierarchy on the SolarVein site — including "there's too much text", "make it scannable", "simplify this section", or adding any new explanatory copy.
---

# SolarVein content reduction

The site's job is to make one insight obvious in five seconds: **the same PV-liquid heat exchanger can collect or
reject heat, depending on temperatures and the thermal load.** Every visible sentence competes with the model for
attention. The goal is not "less text" for its own sake — it is to let the visualization carry the explanation and
keep the science one click away.

## The three levels

| Level | When visible | Contains |
|---|---|---|
| L1 — immediate | always | current regime, heat-flow direction, P_e (W_e), Q_th (W_th, signed), one statement |
| L2 — on interaction | hover, tap, expand, Lab | T_in/T_out, pump power, other energy flows, advisories, per-part annotations |
| L3 — engineering details | explicit disclosure | formulas, assumptions, coefficients, carbon accounting, limitations, validation plan |

## Method

1. **Inventory.** Measure visible words per section with `node .claude/skills/sv-content-reduction/scripts/wordcount.mjs <url>`
   (closed `<details>` excluded). Record before-numbers.
2. **Find the redundancy.** Mark every statement made twice or more, and every sentence that repeats what an
   animation, arrow, colour or number already shows. In SolarVein the usual repeat offenders are: "cairan selalu
   mengalir masuk → keluar", the disclaimer, the W_th/W_e note and the sign convention. State each **once**, at the
   place it matters (e.g. the sign convention next to the first signed readout, as a tooltip).
3. **Classify** each remaining item L1/L2/L3. If in doubt, it is L2.
4. **Rewrite L1** as one concise, declarative Indonesian sentence per block (≤ ~16 words). Headings ≤ 8 words.
   Prefer a direct label next to the object ("Masuk 30,0 °C") over a paragraph about it. Mode labels must not assert
   an outcome the model computes ("Cerah", not "Cerah · Panen panas").
5. **Move L2/L3** into disclosures, annotations, tooltips or the Lab — never delete scientifically necessary
   content (checklist below).
6. **Re-measure** and report before → after per section. Target ≥ 60 % reduction in the primary experience
   (sections 01–02 with nothing opened).

## Must remain reachable (never cut, only relocate)

- The not-beneficial state, verbatim: **"Pendinginan tidak menguntungkan pada kondisi ini."**
- Sign convention: + = panas masuk ke cairan (panen); − = panas keluar dari cairan ke panel & lingkungan.
- W_th and W_e are never summed without a displayed conversion factor.
- Liquid flow direction never reverses; only heat-flow direction does (show it visually; say it once).
- Rejection needs a real warm source; rain alone does not guarantee useful cooling.
- ENSO is climatological context, not a switch; La Niña ≠ constant rain; no flood or "always cooling" claims.
- Established PVT physics, not a new discovery.
- Disclaimer: educational conceptual simulation — not CFD, field-validated or certified performance.
- Assumptions, limitations, equations, coefficients, carbon assumptions (emission factors, embodied emissions ≠ 0).

## Writing style (natural Indonesian)

Short, concrete, declarative. Standard English engineering terms are fine (PVT, heat exchanger, NTU, COP).
Avoid marketing adjectives, avoid "kami", avoid rhetorical questions in body copy, use "cenderung" for climate
statements, use the decimal comma and units with a space (`36,2 °C`, `865 W`).

## Output

A table per section: before words → after words, what moved where (L2/L3 location), what was deleted and why
(only redundancy may be deleted), and the final L1 copy.
