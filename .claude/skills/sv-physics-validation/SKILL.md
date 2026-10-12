---
name: sv-physics-validation
description: Validate that SolarVein's thermal model, labels and every animation tell the physical truth — energy balance, heat-flow vs liquid-flow direction, sign conventions, Sunny/Rainy validity, PV temperature behaviour, honest valuation. Use this whenever src/sim/** changes, whenever an animation, arrow, colour ramp, chart, verdict, statement or unit label touches thermal/electrical quantities, before approving any visual that depicts heat, rain, sun, liquid or electricity, and whenever someone claims a benefit (cooling, carbon, efficiency) — even for "just a visual tweak".
---

# SolarVein physics validation

An attractive animation that misrepresents the engineering is worse than no animation. Reviewers of a PVT concept
will look first for the classic mistakes: liquid that reverses when heat reverses, heat rejection without a warm
source, "free cooling" from rain, thermal and electrical watts added together, and benefits credited against a
straw-man baseline. This skill is the checklist and the tooling to catch them.

## 1. Run the automated checks

```bash
npx vitest run src/sim          # model, carbon, day profile, review regression tests
npx tsc -b --noEmit
bash .claude/skills/sv-physics-validation/scripts/visual-coupling.sh   # where visuals read mode/regime flags
```

All energy-balance residuals must be < 0.5 W over the input grid, with no NaN anywhere. `it.fails` tests in
`src/sim/review/` document known gaps — a fixed gap must be flipped to `it`.

## 2. Model invariants (verify with numbers, not intuition)

- **Energy conservation** within the stated boundary: absorbed = P_e + q_liquid + q_front + q_rain + q_back.
- **Sign convention:** q_liquid > 0 → panel → liquid (harvest); q_liquid < 0 → liquid → panel → environment.
  T_out − T_in has the same sign as q_liquid; mass flow > 0 whenever the pump runs, in either regime.
- **Direction comes from temperatures:** harvest needs T_panel > T_liquid; rejection needs T_liquid > T_panel and
  a real warm source (`hotSourceAvailable`). With no source, heat rejected = 0 — never invent heat.
- **PV efficiency falls with temperature:** η = η_ref[1 − β(T − 25)]; cooler cells → more P_e, all else equal.
- **Monotonicity:** more irradiance → hotter cell; higher T_in in harvest → less q_liquid.
- **Insulated PVT with the pump off runs hotter than a conventional PV module** — keep that honest result visible.
- **Conventional PV must win in realistic cases** (low irradiance, no load, high pump ΔP) and the UI must say so.

## 3. Honest valuation

- Rejected heat is only worth `heatRejected / COP_displaced − P_pump` of electricity, and only when the displaced
  cooling equipment is explicitly modelled. The realistic baseline for a loop ~20 K above ambient is a fan-driven
  dry cooler (COP ≈ 20–40), not a chiller (≈ 3–4). Show the baseline choice; never default to the flattering one.
- Rain helps, but sky and wind do much of the work: compare q with and without rain before attributing a benefit
  to rain. Rain heat transfer is an approximation (ε band), not a validated correlation — present it as such.
- Carbon credits should be incremental over conventional PV, with snapshot-hours that are plausible for the
  scenario; embodied emissions are never zero.

## 4. Visual ↔ physics mapping (inspect each animated element)

| Element | Must be driven by | Must never |
|---|---|---|
| Liquid particles / flow texture | pump on/off + flow rate, inlet → outlet along arc length | reverse with heat direction; teleport at corners/wrap |
| Liquid colour ramp | computed T_in → T_out (warm → cooler in rejection) | follow mode flag |
| Heat arrows (stack) | sign and magnitude of the **live** q_liquid; fade as |q| → 0 | flip from a mode flag or from regime/valuation flags |
| Front-loss arrows | sign of q_front + q_rain | appear when the panel is cooler than ambient |
| Electrical pulses | P_e > 0, rate ∝ P_e | colour-match heat or liquid |
| Rain / sun | rain mm/h, irradiance G | imply cooling or heat on their own |
| Statements, verdicts, badges | computed regime + advisories | claim benefit the numbers don't show |

During a Sunny ↔ Rainy transition, every intermediate frame must be a real computed state (interpolate the
*inputs* and re-run `simulate()`); arrows may only reappear reversed once the computed sign has reversed and |q|
exceeds the threshold.

## 5. Labels & units

W_th vs W_e always distinguished; signed thermal values carry the convention nearby; ΔT in K (or °C difference
stated), temperatures in °C; flow as L/min with derived kg/s; decimal comma in Indonesian copy.

## Report format

Prioritised list: P0 physically wrong / misleading · P1 questionable or overstated · P2 wording. Each item:
evidence (numbers from a script or test, file:line), why it matters to an expert reviewer, concrete fix (equation,
parameter or code change). Sign off explicitly when nothing P0/P1 remains.
