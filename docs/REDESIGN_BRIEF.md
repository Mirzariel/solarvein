# SolarVein — Product Design & Motion Excellence (redesign brief, lead-owned)

Goal: transform the EXISTING site into a polished, restrained, technically credible deep-tech product experience.
Not a feature expansion. Preserve the simulation (`src/sim/**`) and all engineering functionality.
Priorities: design maturity, visual restraint, smooth interactions, information density, engineering clarity.

## Lead decisions (binding unless the lead changes them)
1. **Language stays natural Indonesian** (original requirement). Headline direction: "Satu panel. Dua arah panas."
   Sub: "Listrik surya dan pertukaran panas dua arah, divisualisasikan." (refine, keep short).
2. **Light editorial foundation + dark graphite 3D stage only.** Starting tokens:
   bg `#F7F8F6`, surface `#FFFFFF`, text `#171C22`, text-2 `#66717C`, border `#E3E7E9`,
   heat `#D98442`, cool `#398BAE`. Stage: graphite (≈ `#0E1114`–`#15191D`). Electrical output needs a
   restrained neutral-light treatment that is distinct from heat and liquid (no lime highlighter).
   Amber = heat, blue = cooling / liquid-side thermal info, neutral = structure. No default gradients, no rainbow.
3. **Type:** Inter (UI) + IBM Plex Mono (instrumentation). Hero 48–64px desktop; section 28–40; component 16–20;
   body 14–16; technical labels 12–13. No giant headings.
4. **Grid:** 12-col desktop, max content ≈ 1280px. Spacing tokens only: 4/8/12/16/24/32/48/64/96.
5. **Four primary sections only:**
   - `01 Pengalaman` (#pengalaman) — large interactive model, Cerah/Hujan switch, ONE statement, minimal live
     instrumentation (Level 1: mode, heat-flow direction, PV electrical W_e, thermal W_th).
   - `02 Di dalam SolarVein` (#di-dalam) — interactive exploded view of the collector with clickable annotations
     (PV cells, absorber, liquid channels, rear assembly). No paragraphs.
   - `03 Lab rekayasa` (#lab) — manual controls + computed outputs (instrumentation, energy flow, temperature
     profile, day history), physics explanations on demand (formulas, assumptions, coefficients, limitations).
   - `04 Perbandingan kinerja` (#perbandingan) — conventional PV / PV + liquid cooling / dual-mode SolarVein;
     honest advantages & limitations. El Niño / La Niña context and carbon accounting live here as compact,
     progressively disclosed sub-parts (scenario context + "Dampak karbon" disclosure).
   - Footer: one-line disclaimer (educational conceptual simulation; not CFD/field-validated/certified).
6. **Progressive disclosure:** L1 immediate (mode, heat direction, P_e, Q_th) → L2 on interaction (T_in/T_out,
   pump, more flows) → L3 engineering details (formulas, assumptions, coefficients, carbon, limitations).
   Ordinary visible descriptions: one concise sentence. Short callouts placed near what they explain.
   Never repeat in text what an animation already shows. Keep scientifically necessary content accessible.
7. **No cards by default.** Cards only for meaningful grouping; minimal borders/shadows.

## Motion (critical)
Timing: micro 120–180ms; buttons/controls 150–220; panel/content 220–350; camera 600–1000; weather 700–1200.
UI easing `cubic-bezier(0.22, 1, 0.36, 1)`; critically-damped springs for camera/interactive movement (no bounce).
Principles: continuity, object identity, interpolate don't replace, reversible, no discontinuities, coordinated,
reduced-motion respected. Never replace the 3D scene on mode switch; keep panel & camera.
Interpolate ambient light, sky, surface temperature colour, heat arrows, fluid temperature colours, rain, UI readouts.
Sunny→Rainy: overcast builds → irradiance falls → P_e follows model → rain fades in → surface temp responds →
heat indicators shrink → if flux crosses zero they fade out → reappear reversed ONLY if physically justified →
metrics interpolate. **The model determines direction, not a mode flag.** Implementation hint: interpolate the
*inputs* (G, T_amb, rain, T_in, …) over ~1 s and re-run `simulate()` per animation step (cheap), so every
intermediate visual state is a real computed state.
Fluid: flow within the channel, direction = pump direction (never reverses), temperature colour separate;
no particles visibly teleporting around corners. Camera: inertial drag, bounded orbit, no reset on mode change,
double-click / Reset View animates back smoothly.
Micro-interactions: segmented switch, slider thumbs, readouts, chart highlights, disclosures, tooltips, buttons,
view toggles, nav, loading states, hover/focus — consistent and understated. Don't animate text for its own sake.

## Performance
Target 60 FPS on capable desktop; reduced-complexity mode for weak devices. No React re-renders per frame; frame-delta
animation; reuse geometries/materials; no per-frame allocation; minimise overlapping transparency; no heavy post;
throttle numeric UI updates separately from 3D; DPR caps; measure (don't claim) FPS; respect prefers-reduced-motion.

## Responsive
Desktop: model dominant, instrumentation arranged around it. Tablet: reflow without crowding. Mobile: compact
usable model, bottom control area; not a shrunken desktop. No horizontal overflow. Test 1440/1280/768/390/360,
touch drag, slider usability, navigation.

## Visual QA questions (Visual Critic must answer)
1 designed product vs template? 2 clear focal point? 3 too many cards? 4 intentional whitespace? 5 verbose text?
6 accent overuse? 7 icon/type consistency? 8 believable 3D? 9 polished micro-interactions? 10 each section adds new
info? 11 deliberate mobile? 12 concept understandable without long reading? Each defect: location, why, severity,
concrete fix, screenshot evidence.

## Deliverables
`DESIGN_SYSTEM.md`, `MOTION_SYSTEM.md`, `DESIGN_AUDIT.md` (before/after + remaining issues) at repo root;
before screenshots in `docs/audit/before/`, after in `docs/audit/after/`.

## Tooling
Dev server: http://localhost:5190 (lead keeps it running; do not start/kill it).
Screenshot script (headless system Chrome via playwright-core, already installed next to it):
`node C:/Users/LENOVO/AppData/Local/Temp/claude/C--Users-LENOVO-Downloads-solarvein/07394c91-8cee-4e12-82d5-4e88a9285aac/scratchpad/shot.mjs <url> <w> <h> <outPrefix> [sunny|rainy|lab] [explode,section,reduced,heroonly]`
Run it from the repo root; `outPrefix` is relative to cwd, e.g. `docs/audit/critic/d1440`. It prints console errors and
horizontal-overflow offenders. Copy & adapt it (in the scratchpad, so `playwright-core` resolves) for custom
interactions or measurements (e.g. requestAnimationFrame timing). Uses SwiftShader WebGL — FPS measured there is
NOT representative of GPU hardware; say so when you report numbers. A reference copy lives at docs/audit/shot.mjs.

---

## Phase 3 — lead decisions after the audits (binding)

Audits: docs/audit/01-visual-critic.md, 02-ux-ia.md, 03-physics.md, 04-perf-a11y.md (when present),
05-creative-direction.md (art direction — implement it), 06-motion.md + MOTION_SYSTEM.md (draft).
Skills to USE (Skill tool): `sv-visual-identity`, `sv-content-reduction`, `sv-physics-validation`,
`sv-adversarial-qa` (project), plus installed `frontend-design`, `web-design-guidelines`, `threejs-*`,
`gsap-core`/`gsap-timeline`/`gsap-react`/`gsap-performance`/`gsap-utils`, and `dataviz` for charts.
If the Skill tool can't find a project skill, read `.claude/skills/<name>/SKILL.md` directly.

Decisions:
- GSAP (`gsap`, `@gsap/react`) is part of the stack: use it for coordinated, sequenced UI/weather choreography
  (timelines, staggered input interpolation). Camera & interactive motion use critically-damped springs in useFrame.
  Never animate every text node; respect reduced motion (`gsap.matchMedia`).
- Fonts: Inter (existing @fontsource-variable/inter) + IBM Plex Mono (`@fontsource/ibm-plex-mono`, installed;
  import weights 400/500). Remove JetBrains Mono.
- Light page tokens per 05-creative-direction §4.1; dark only inside the 3D stage.
- Two WebGL stages max: 01 Pengalaman (experience) and 02 Di dalam SolarVein (inspect: exploded + annotations).
  03 Lab uses the live SVG cross-section (CutawayFallback reworked as `Schematic`) beside the controls, no third canvas.
  Off-screen stages must not render (frameloop demand / unmounted).
- Mode switch: Cerah / Hujan only (single sliding thumb). Editing any Lab input shows a passive "Kustom" state;
  the store's `mode` may keep 'lab' internally (UI label "Kustom"). Auto-rotate default OFF.
- Heat arrows: direction & magnitude from the live sign/magnitude of qLiquidW whenever the pump runs and
  |q| > threshold; valuation flags (heat load / hot source) change wording/dimming only, never direction.
- Weather transitions: interpolate the inputs (staggered, ~1.0–1.2 s) and run simulate() per step so every frame is
  a real computed state (see MOTION_SYSTEM.md). Readout text ≤ 15 Hz, no per-frame React renders.
- Charts and comparison snap to the final state (below the fold).
- New section ids: `pengalaman`, `di-dalam`, `lab`, `perbandingan`. Nav = 4 items.

### Phase 3 ownership (edit only your files; read anything)
| Owner | Files |
|---|---|
| Physics implementer (Agent 1) | `src/sim/**`, `docs/PHYSICS.md`, optional additions to `src/sim/types.ts` |
| B Design Systems | `src/index.css`, `src/ui/**`, `src/charts/**` (restyle only; keep data logic), `DESIGN_SYSTEM.md`, `docs/DESIGN.md` (replace with pointer) |
| D 3D Engineer | `src/viz3d/**` except `src/viz3d/effects/**`, new `src/sections/Inside.tsx` (+ `src/sections/inside/**`) |
| C Motion Director | `src/motion/**` (new), `src/viz3d/effects/**`, `src/sections/Hero.tsx`, `src/sections/hero/**`, `MOTION_SYSTEM.md` |
| E UX Architect | `src/App.tsx`, `src/state/**`, `src/sections/SiteHeader.tsx`, `SiteFooter.tsx`, new `src/sections/Lab.tsx` (+ `src/sections/lab/**`), `ControlPanel.tsx`, `Instrumentation.tsx`, `Assumptions.tsx`, `Comparison.tsx`, `Carbon.tsx`, `Seasons.tsx`, `Principle.tsx` (remove when content is relocated) |
Lead: `package.json`, `vite.config.ts`, README, DESIGN_AUDIT.md, integration fixes.

---

## Phase 3b — USER DIRECTION UPDATE (overrides earlier austerity rules where they conflict)

The user wants: **a US deep-tech startup vibe; must not look AI-made; "jangan terlalu kaku" (not too stiff);
use pictures; use depth; show that this could change the world.** Physics honesty and the interactive model stay.

What changes:
- **Tone:** confident, warm, human, aspirational — a funded climate-tech startup launching its first product, not a
  lab report. Short punchy Indonesian lines are fine ("Atap yang bekerja dua arah."). Still no fake metrics, no
  invented customers/partners/testimonials, no novelty claims. Vision statements are phrased as potential
  ("bisa", "berpotensi", "bayangkan") and any impact number is computed from `src/sim` with visible assumptions.
- **Pictures:** real photography (free-license Unsplash/Pexels, bundled locally as optimized WebP/AVIF in
  `public/images/`, credited in `docs/CREDITS.md`) + cinematic renders of our own 3D collector. Photos give
  context (tropical rooftops, Indonesian city at golden hour/rain, rain on glass, hands/workbench/engineering).
  Never use a photo to imply a real SolarVein installation exists — captions/alt text must be honest
  (e.g. "Ilustrasi konteks: atap kota tropis").
- **Depth:** layered composition — full-bleed photographic hero/backdrops with gentle parallax, foreground UI
  floating over imagery with soft realistic shadows, atmospheric gradients ALLOWED when they come from light/sky
  (sunlight warmth, overcast cool haze) — not decorative rainbow gradients. Subtle grain/vignette ok. Cards may
  have soft shadows and slight elevation when they float over imagery. Big confident type (display up to ~88 px on
  desktop is now fine for the opening statement).
- **Narrative (Apple-style scroll story):**
  0. **Opening** — full-bleed cinematic image (golden-hour tropical rooftops) with the headline and one vision line;
     scroll reveals the product.
  1. **01 Pengalaman** — the interactive model + Cerah/Hujan (unchanged core).
  2. **02 Di dalam SolarVein** — exploded inspection.
  3. **Why it matters / Dampak** — a short, bold, image-led band: tropical heat + rooftops + energy; a scenario
     scaler ("Jika 10.000 atap…") computed from the simulation with editable assumptions, honest caveats in a
     disclosure. Merge the El Niño/La Niña context and carbon here.
  4. **03 Lab rekayasa** — precision instrument (stays calmer/denser, it's the "for engineers" room).
  5. **04 Perbandingan kinerja** — honest comparison.
  6. **Closing** — confident one-liner + photo, disclaimer in the footer.
- Hard prohibitions that STILL apply: no eyebrow-caps on every block, no pill-badge confetti, no icon-in-box
  feature grids, no card-in-card, no lime/neon, no fake numbers, no stock "AI glow" blobs, no emojis.
- Accent colours remain semantic (amber heat, blue cooling); photography supplies the rest of the colour.

---

## Phase 3c — TYPESETTING & COPYWRITING ("think like Steve Jobs") — user request, binding

Typography is the product's voice. Jobs-level care means fewer words, better words, and letterforms set by hand.

**Copy (typewriting)**
- One idea per screen. Headlines are short declaratives a person could repeat to a friend
  (pattern: "1.000 lagu di sakumu" — concrete, human, memorable). Max ~6 words for section headlines.
- Lead with the human meaning, then the engineering. Say what it does for a roof, a city, a family — but only with
  numbers the simulation actually produces, labelled as scenarios.
- Rhythm: vary sentence length; use the occasional fragment for emphasis. Rule of three where it is natural.
- Ruthless cutting: if a word can go, it goes. No jargon in headlines (jargon lives in the Lab and disclosures).
  No hype words ("revolusioner", "terobosan", "game-changer", "canggih"), no exclamation marks, no rhetorical
  questions stacked, no "kami bangga". Confidence comes from specificity.
- Natural Indonesian that sounds written by a person (read it aloud). English only for true technical terms.
- Every line is reviewed against `sv-content-reduction` (must-keep science stays reachable).

**Typesetting**
- Few weights (e.g. 400/500/600, display 600–650), size and space carry hierarchy — not colour.
- Display: tight tracking (≈ −0.03 to −0.04em), line-height ≈ 0.95–1.05, hand-set line breaks on desktop for the
  key headlines (deliberate breaks, never an orphan word); `text-wrap: balance` for headings, `pretty` for body.
- Body: 16–18 px, line-height 1.5–1.6, measure 55–70 ch. Small text never below 12 px.
- Real typographic characters: “ ” ’ — – × −, non-breaking space between number and unit (`36,2 °C`, `865 W`),
  decimal comma, thin grouping (id-ID), tabular figures for data, proportional figures in prose.
- OpenType features deliberately chosen (e.g. Inter `cv11`, `ss01`/`ss03` single-storey/alt glyphs if they suit,
  `tnum` only in data, `case` for caps). Optical sizing: Inter Display/Tight-style tracking for big sizes.
- Typeface choice is open for the Creative Director to make deliberately: Inter is safe but very common on
  generated sites — evaluate a more characterful but still neutral pairing that is OFL and installable via
  @fontsource (e.g. Geist + Geist Mono, Inter Tight for display, or a refined serif accent such as Instrument Serif
  used sparingly for the opening statement). Max two families + one mono. Decide with screenshots, document why.
- Vertical rhythm on a 4 px baseline; consistent space above/below headings; hanging punctuation where supported.
