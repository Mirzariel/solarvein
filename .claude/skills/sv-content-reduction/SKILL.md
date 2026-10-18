---
name: sv-content-reduction
description: Cut SolarVein's visible copy through progressive disclosure (show first, explain second, details on demand) without losing any scientifically necessary statement. Use this whenever you write, edit or review user-facing text, headings, labels, tooltips, advisories, verdict sentences, section structure or information hierarchy on the SolarVein site — including "there's too much text", "make it scannable", "simplify this section", Indonesian copy / EYD V checks, or adding any new explanatory copy.
---

# SolarVein content reduction (v2)

The site must make one insight obvious in five seconds:
**"Panas dari panel surya hotel dialirkan ke tempat yang paling bernilai — air panas dulu; desikan diuji jujur."**
(Final wording belongs to the copy owners; the idea is fixed: heat is routed by value, DHW first, the desiccant is
tested honestly.) Every visible sentence competes with the diagram and the numbers. The goal is not "less text" —
let the visuals carry the explanation and keep the science one click away. The site is also a live demo: a judge
reads a section in seconds while someone talks.

## The three levels, per section (≈ 45 words of L1 per section, headings ≤ 8 words)

| Section | L1 — always visible | L2 — on interaction | L3 — disclosure / Lab |
|---|---|---|---|
| Masalah | two loads of a tropical hotel (air panas, udara lembap) with two cited numbers, one sentence | source of each number, EF | audit data, ranges |
| Sistem | collector + hotel roof, A/B/C switch, W_e / W_th, one-line router split | inlet/outlet, pump, per-part notes in the walk-through | module parameters, η_th(T_in, G) curve |
| Cara kerja (Router) | which sink gets heat now and why (one sentence generated from `RouterState.reason`) | allocation per sink, valve fractions, what exists / what is new | ranking rule, hysteresis, strategies |
| Sehari di hotel | 24 h scrubber, tank fill, solar fraction, one result per strategy | 3 hari hujan panel (4 lines), area sweep | day-type weights, closure, climate source |
| Jalur riset desikan | status "Hipotesis riset · belum divalidasi", computed verdict, net HVAC | T_regen sweep 35–70 °C, ambient vs exhaust air, value per kWh_th | isotherm, cycle effectiveness, ledger terms, phase 3 test plan |
| Dampak | net CO₂e waterfall vs B1–B4 and the generated verdict sentence | energy, payback, hotel scaler, penginapan kecil | ledger rows, factors, embodied, sensitivities |
| Lab | live inputs and outputs | instrumentation | assumptions with sources, equations |
| Validasi | roadmap, KPIs | ranked risks, difference notes (essay ↔ website) | evidence legend, evolusi ide, pustaka (APA 7) |

## Method

1. **Inventory.** `node .claude/skills/sv-content-reduction/scripts/wordcount.mjs <url>` (closed `<details>` excluded).
   Record before-numbers per section.
2. **Find redundancy.** Mark every statement made twice, and every sentence an animation, colour, dash style or number
   already shows. Usual repeat offenders: the disclaimer, "simulasi belum ada data ukur", the kWh_th ≠ kWh_e note,
   the evidence-tag explanation. State each **once**, where it matters (a section declares once that its numbers are simulation).
3. **Classify** L1/L2/L3; if in doubt, L2.
4. **Rewrite L1** as concise declarative Indonesian, ≤ ~16 words per sentence, ≈ 45 words per section. Prefer a
   direct label next to the object ("Keluar 62 °C") over a paragraph. Labels name conditions, not outcomes.
5. **Move L2/L3** into disclosures, annotations, tooltips or the Lab. Never delete scientifically necessary content.
6. **Re-measure** and report before → after per section. Target ≥ 60 % reduction in the primary path with nothing opened.

## Must remain reachable (never cut, only relocate)

- **Units:** kWh_th ≠ kWh_e (≠ kWh_fuel); they are never added without a displayed factor (efficiency, COP, EF).
- **Desiccant is not proven:** "Hipotesis riset · belum divalidasi"; the computed verdict can be "tidak layak".
  Not-beneficial sentence, verbatim: **"Desikan tidak menguntungkan pada kondisi ini."**
- **B2 and B4 may beat SolarVein**; the winner sentence is generated from the numbers.
- **No measured data:** header badge "Simulasi · belum ada data ukur"; illustrative hotel, preset weather (named city, day types).
- **DHW saving depends on the displaced heater** (LPG, electric, heat pump).
- **Net already subtracts** pumps, fans, regeneration, PV penalty and embodied carbon.
- **Small differences are not meaningful** (model uncertainty; say it next to close comparisons).
- **Hotel service never depends on the sun:** existing heater and AC are always the backup; only savings fall at night or in long rain.
- **Evidence taxonomy:** Established/Published · Simulation/Assumption · Hypothesis/Proposed — legend in Validasi,
  tag text on first use per viewport.
- **Website ≠ essay:** this is a development version of the HORIZON 2026 entry; differences are noted.
- Embodied carbon ≠ 0; assumptions, limitations, equations, coefficients, references (APA 7).
- Concept evolution (Cerah/Hujan, ENSO) lives only in Validasi as "evolusi ide", never in the primary path.

## Writing style (natural Indonesian, EYD V)

Short, concrete, declarative. No "kami", no hype, no rhetorical questions in body copy. Decimal comma and unit with a
space (`36,2 °C`, `62 °C`, `0,8 kgCO₂e/kWh`). Use "prapemanasan" (one word) and "desikan" with a gloss on first use:
"desikan (bahan penyerap uap air)". Keep standard technical terms (PV/T, COP, HPWH, bypass) but gloss them once. Use
"cenderung" for climate statements. Evidence-first wording: "Simulasi menunjukkan…", never "membuktikan".
Section skeleton: hairline + `0N — Nama`, ≤ 1 short H2, ≤ 1 sentence.

## Output

A table per section: before words → after words, what moved where (L2/L3 location), what was deleted and why
(only redundancy may be deleted), and the final L1 copy.
