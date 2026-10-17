# Wave 2 brief — SolarVein v2 UI (read fully before coding)

## Story (what the page must make obvious)
SolarVein = **Adaptive Solar Thermal Recovery for Low-Carbon Hospitality**, HORIZON 2026 (KAMASE UGM), live demo at the
final on 20 Nov. Liquid PV/T on an illustrative 100-room hotel roof in Bali → value-ranked adaptive router →
**hot-water preheat first** (primary, quantified) · desiccant regeneration for fresh-air dehumidification = **research
hypothesis, "Hipotesis riset · belum divalidasi"** · buffer tank · bypass (heat not used → cooler cells).
KPI = net CO₂e avoided vs B1 conventional hotel · **B2 PV + heat-pump water heater (the honest primary comparator)** ·
B3 PV/T DHW only · B4 PV + AC-condenser heat recovery. Hotel service never depends on the sun (heater + AC are backup).

## Current simulated results (DEFAULT_SYSTEM; always READ them from the hooks, never hard-code)
- Annual DHW solar fraction ≈ 0,45; terik day 0,53, berawan 0,29, hujan berat 0,05, 3 hari hujan 0,07 — unmet 0.
- Net CO₂e/yr: vs B1 ≈ 29,6 t · vs B2 ≈ 6,6 t (but no economic payback vs B2: LPG backup costs more than HPWH
  electricity — the verdict sentence says so) · vs B3 ≈ 0 · vs B4 ≈ 1,7 t.
- Adaptive = dhw-priority at default assumptions: the value gate rejects the desiccant. That is a RESULT to show
  honestly ("router menolak desikan karena nilainya lebih rendah"), not a bug. Under optimistic desiccant assumptions
  (exhaust-air regeneration, COP ratio 2) adaptive starts using it in surplus conditions.
- Desiccant: ambient-air regeneration not beneficial at 35–55 °C; exhaust-air marginal from ~40 °C; break-even
  after-cooler/coil COP ratio ≈ 1,3–1,55. Verdict = computed.
- PV/T electricity ≈ plain PV (−0,4 %): insulated PV/T stagnates hot when the pump is off. Don't claim "PV/T makes
  more electricity"; the value is the heat.

## Interfaces (lead-owned; see docs/CONTRACT-v2.md "Wave 2")
- Hooks: `src/state/systemSelectors.ts` (useDay, useStep, useRouterSnapshot, useYear, useBaselines, useAreaSweep,
  useDesiccantSweep, useHeatUses, useSystemView, useSystem). Store: `src/state/system.ts` (useSystemStore).
- Sim API + labels: `src/sim/system` (index.ts barrel): LABELS, DESICCANT_STATUS, SIM_BADGE, DESICCANT_NOT_BENEFICIAL,
  MODE_TARGETS, stepAt, routerSnapshot, modeBands, stackedAlloc, cumulative, ASSUMPTIONS arrays, REFERENCES.
- Section ids/numbering: `src/sections/nav.ts`. Evidence marker: `<Evidence tag refId? label? />` from `src/ui`.
- Number formatting: `formatId`, `formatWithUnit`, `typo` from `src/ui` (decimal comma, NBSP before units, true minus).

## Design & motion rules (the site's look is loved — extend it, don't reinvent)
- Read `.claude/skills/sv-visual-identity/SKILL.md` + `references/identity.md`, `MOTION_SYSTEM.md`, `DESIGN_SYSTEM.md`,
  and study `src/sections/Opening.tsx`, `Hero.tsx`, `Inside.tsx`, `Impact.tsx` for the existing idioms
  (SectionHeader with index, page-wrap, grid-12, useScrollScene, Picture/AmbientVideo, stage card, count-up, etc.).
- Colour = medium: amber `heat` = heat in liquid; form encodes destination (solid delivered, tank fill level, **dashed
  = not yet validated / desiccant**, grey `loss` = bypass); `cool` only for dehumidified supply air / moisture;
  electricity = ink. Accent budget per viewport. No gradients/glows/pills/icon-boxes/eyebrow caps/card-in-card.
- Motion: `useScrollScene` for scroll scenes; ≤ 3 pinned scenes site-wide (Sistem-dalam, Router); everything must
  work under reduced motion (snap) and without WebGL. Transforms/opacity only; pause off-screen.
- Copy: Indonesian EYD V per `.claude/skills/sv-content-reduction/SKILL.md` — ≤ ~45 words L1 per section, one
  declarative sentence per block, depth in `Disclosure`, no "kami", no hype, labels name conditions not outcomes.
  "desikan (bahan penyerap uap air)" on first use. Each section states once "Semua angka di bagian ini: hasil simulasi".
- Physics truth: `.claude/skills/sv-physics-validation/SKILL.md`. Never animate heat the sim doesn't compute.

## Working rules
- Your own git worktree under `C:\Users\LENOVO\Downloads\solarvein\wt\<name>`; **never `npm install`**; edit only files
  you own (your prompt lists them); lead-only files listed in CONTRACT-v2.md — request changes in your report.
- Run your own dev server on your assigned port: `npx vite --port <PORT> --strictPort` (background), and take REAL
  screenshots to judge your work: `node scripts/qa/element-shot.mjs http://localhost:<PORT>/ "#<section-id>" <out.png> 1440 900`
  and at 390×844; also `node scripts/qa/visual-qa.mjs --url http://localhost:<PORT> --widths 1440,390 --out <dir> --sections`
  for console errors/overflow. Save screenshots under `docs/audit/wave2/<name>/` (commit a few key ones).
  Stop your dev server when done.
- Gate before reporting: `npx tsc -b` and `npx vitest run` green; `npx vite build` succeeds. Commit on your branch
  (message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Do not push/merge.
- Report ≤ 300 words: what you built, screenshots paths, open issues, requests for lead-only files, commit hash.
