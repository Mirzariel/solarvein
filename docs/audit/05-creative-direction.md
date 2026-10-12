# 05 — Creative Direction (Agent A, Phase 1)

Binding inputs: `docs/REDESIGN_BRIEF.md`. Evidence: `docs/audit/before/*.png`, own capture `docs/audit/creative/d1440-rainy-hero.png`.
Audience for this file: Design Systems Engineer (tokens, `src/ui`, sections), Motion Director (`src/viz3d/effects`, hero), 3D Engineer (`src/viz3d`), UX Architect (IA/flow). Names below are proposals to implement verbatim unless a technical blocker is reported back.

---

## 0. What the audit shows (current build)

| # | Observation (evidence) | Verdict |
|---|---|---|
| A1 | Whole page is dark `#0b0e12`; 3D stage, cards and text all share one value, so the stage has no "stage-ness" (`d-hero`, every section). | Replace by light page + one dark stage. |
| A2 | Every section opens "tracked-caps eyebrow + 40–56px headline + 3-line paragraph" (`d-prinsip`, `d-instrumentasi`, `d-perbandingan`, `d-musim`). | Template tell. Remove eyebrow; one-line statement only. |
| A3 | Pill badges everywhere: "Panen panas", "Cerah", "Hujan", "El Niño", "La Niña", "Vonis berbasis angka", "Cairan: masuk→keluar". | Pills are not an information carrier here. Max 1 status glyph+text per view, not pill-shaped. |
| A4 | Icon-in-box chain "JALUR PANAS" (sun → layers → drop → thermometer) in hero. Repeats what the 3D arrows already show (`d-hero`). | Delete. |
| A5 | Five accent hues: amber (heat), cyan (rejection), lime-yellow (electric), dusty teal (liquid), plus pale yellow chart bars, grey, white bars (`d-perbandingan`). Lime-yellow numerals (293 W_e, "+865") are the loudest thing on the page. | Budget: ink + heat + cool only. |
| A6 | Dense metric grids: 8 tiles in Instrumentasi each with caps label + value + sub-caption; 6-up hero readouts. | Level-1 only in hero (4 items); L2 on demand. |
| A7 | Card-in-card: Instrumentasi outer card → "Konvensi tanda" sub-card → Sankey card; Comparison verdict card inside section; Seasons card with inner black diagram panel and inner tag chips. | Max one container level; default none. |
| A8 | Same statement said 4×: hero headline "Panel memanen panas…", sub "Panas mengalir…", legend, "Arah aliran cairan tetap…", pathway strip caption. | One statement per view. |
| A9 | Giant text walls: Seasons (2 paragraphs per card + checklist + "tidak diklaim"), Principle (3 cards + callout + footnote), Comparison primer-energy block. | Move to disclosure (L3). |
| A10 | 3D: neon-ish perspective grid floor, ~40 random vertical amber strands scattered *beyond* the panel (not a coherent light), rain = dense cyan additive streaks + ripple rings in the same hue as the cool heat arrows, so the hero (heat arrows) is lost (`d-rainy-hero`). Arrows are small cones, low contrast. Floating mono labels have a stroke chip, no leader. | See §6. |
| A11 | Hero H1 is 3 sentences at ~44px on one line; segmented switch mixes two *weather presets* with "Lab manual" (a place, not a weather). View-toolbar of 6 labelled pills + 5 more round buttons crowd the stage. | Two-segment switch only; toolbar = 4 icon buttons. |
| A12 | "Riwayat harian" chart renders as ~400 px blank area (`d-instrumentasi` bottom) — likely lazy/in-view failure. Sticky header ghosts over content in full-page captures. | Flag to UX/Data-viz; not an art-direction item but blocks visual QA. |
| A13 | Fonts: JetBrains Mono used; brief mandates IBM Plex Mono. Headings go `-0.04em`, 600–700 with huge clamp (`--text-display` up to 88px). | Replace tokens (see §3). |

---

## 1. Identity statement

**SolarVein is a calibrated instrument shown on a studio bench.**
Three registers, never mixed on the same element:

1. **Scientific editorial** (the page): warm-neutral paper, quiet Inter, generous whitespace, hairline rules, numbered sections, one declarative sentence where a lesser page would use a paragraph.
2. **Precision instrument** (every number): IBM Plex Mono, tabular, right-aligned, units in a lighter tone, ticks and leader lines drawn at 1 px. Readouts look *measured*, not *marketed*.
3. **Cinematic product** (the stage only): a graphite seamless sweep, soft key + cool rim, believable glass and metal, slow dolly-quality camera. Cinematic ends where the stage radius ends.

**It is:** quiet, exact, spatial, honest about uncertainty, mostly neutral with colour *only* where physics requires it.
**It is not:** a SaaS landing page, a dark "hacker/neon" dashboard, an infographic poster, an icon-and-card feature grid, a gradient-and-glow AI product shot.

Hard prohibitions (carry over to every agent):

- No eyebrow caps label above headings. Section numbering replaces it (§2.5).
- No pill/chip badges as status or category decoration. Allowed: inline text status with a 6 px dot (`● Panen panas`), and mono tag text inside tables.
- No icon-in-box (rounded square behind an icon). Icons are bare, 16 px, stroke 1.5, only in buttons/toolbars/disclosure rows.
- No gradient fills on UI, no glow shadows, no `backdrop-blur` panels except the sticky header at 90 % paper + 1 px border.
- No card unless it groups controls with their outputs (Lab controls) or a form-like set. Never card-in-card.
- No coloured left borders / coloured card tints.
- No text over 64 characters wide per line; no more than 2 sentences visible in any block; paragraphs of 3+ sentences exist only inside disclosures.
- No rainbow; no "lime" anywhere (UI, charts, 3D).
- Never repeat in text what an animation/annotation already shows.

---

## 2. Composition system

### 2.1 Grid
- Container: `--container: 1280px`, centred. Outer margin `max(32px, (100vw − 1280px)/2)` ≥ 1024 px; 32 px at 768; 16 px at ≤ 480 (390/360). Gutter 24 px (≥ 1024), 16 px below. 12 columns at all widths; at 768 spans are listed explicitly below, at ≤ 480 everything is `col-span-12`.
- Everything snaps to the 4 px base; allowed spacing tokens only: **4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96** (`--space-1 … --space-9` in that order). No other px values for padding/margin/gap. Component heights (32/40/48) and radii are separate tokens.
- Radii: `--radius-xs 4` (ticks, inline code, bar ends 2), `--radius-sm 8` (buttons, inputs, thumb), `--radius-md 12` (Lab panel, popovers), `--radius-lg 16` (stage desktop). Stage mobile = 12.
- Alignment: **everything left-aligned to column edges.** No centred headings, no centred paragraphs. Numbers right-aligned in tables, left-aligned in readouts. Baselines align on the 4 px grid (line-heights in §3 are all multiples of 4).

### 2.2 Vertical rhythm
| Token | Desktop ≥1024 | 768 | ≤480 | Use |
|---|---|---|---|---|
| `--section-y` | 96 | 64 | 48 | top & bottom padding of sections 02–04 |
| `--hero-top` | 32 | 24 | 16 | header → H1 |
| `--head-gap` | 48 | 32 | 32 | section head → first content block |
| `--block-gap` | 48 | 32 | 32 | between major blocks inside a section |
| `--stack-gap` | 24 | 16 | 16 | between related elements (statement ↔ control) |
| `--tight-gap` | 8 | 8 | 8 | label ↔ value |
Header height: 56 (desktop/768), 52 → use 56 everywhere for simplicity.

### 2.3 Grid usage per section
**Header** (sticky, 56 px, `--paper` 92 % + 1 px `--line` bottom): logo wordmark cols 1–3; nav cols 5–12 right-aligned: `01 Pengalaman  02 Di dalam  03 Lab  04 Perbandingan` — numerals in mono 12 `--ink-3`, label Inter 14/500. Active item: ink + 1 px underline offset 8. At 768: wordmark + nav (labels only, numerals hidden); ≤480: wordmark + "Menu" text button opening a full-width sheet.

**01 Pengalaman** (hero, §7)
- 1440: H1 cols 1–8 (one line at 56 px: "Satu panel. Dua arah panas."), sub-sentence cols 9–12 bottom-aligned to the H1 baseline. Stage cols 1–12.
- 768: H1 cols 1–12 (56→44 px, may wrap in two lines), sub cols 1–8; stage cols 1–12.
- No section-number rule on the hero (the H1 is the page start); nav carries "01".

**02 Di dalam SolarVein**
- Head: number rule + H2 one short statement ("Empat lapisan, satu pertukaran panas." ≤ 8 words), cols 1–8.
- 1440: stage cols 1–8 (height 560), layer index cols 9–12 (the "annotations" list: 4 rows, selected row expands to H3 + one sentence + ≤3 mono spec rows).
- 768: stage cols 1–12 (height 440); layer index below as 4 tabs/rows (2×2 grid, `col-span-6`).

**03 Lab rekayasa**
- Head as above, H2 ≤ 6 words ("Atur kondisi, baca hasilnya.").
- 1440: controls panel cols 1–4 (the one allowed surface container; white, 1 px line, radius 12, padding 24, sticky `top: 72`); outputs cols 5–12: row of 4 L1 readouts (2 cols each) → energy-flow Sankey (8 cols) → temperature profile cols 5–8 + power distribution cols 9–12 → day history 8 cols → "Fisika di balik angka" disclosure stack 8 cols.
- 768: controls full width, collapsed to a disclosure "Parameter" with the 4 primary sliders visible; outputs full width, small multiples 2-up (`col-span-6`), Sankey and day history `col-span-12`.

**04 Perbandingan kinerja**
- Head cols 1–8. Scenario switch (segmented: "Kondisi saat ini / Cerah / Hujan") cols 1–6. Verdict (H3, 24/32, ≤ 2 lines) cols 1–8.
- Comparison table cols 1–12: label cols 1–4, three configuration columns 3 cols each (numbers right-aligned in the column). Chart row: four small multiples `col-span-3` each (1440), `col-span-6` (768).
- Honest advantages/limits: two lists cols 1–6 ("Unggul di") and cols 7–12 ("Terbatas di"), 4 lines max each. Below: two disclosure rows, full width cols 1–12: "Konteks El Niño / La Niña", "Dampak karbon".
- Footer: hairline, one 13 px sentence cols 1–8, version/credit cols 9–12 right-aligned mono.

### 2.4 The dark stage inside the light page
- **Inset, not full-bleed.** The stage is a rounded rectangle aligned to the 12-col container (1280 px), radius `--radius-lg` 16, never touching the viewport edge on desktop; on ≤ 480 it keeps the 16 px outer margin (radius 12). It reads as a framed instrument window — this keeps the light page as the dominant frame.
- Fill: `--stage-0 #0E1114` with a baked radial falloff inside the WebGL scene (no CSS gradient). Edge: `1px solid --stage-line (#262C33)`; no outer shadow, no glow, no inner highlight. Between page and stage: nothing (no gradient fade).
- Stage chrome (switch, toolbar, readout strip, annotations) is *inside* the stage using stage tokens (`--stage-ink`, `--stage-ink-2`). Dividers inside the stage are 1 px `--stage-line`.
- Heights: `--stage-h: clamp(480px, calc(100svh − 232px), 720px)` (hero, desktop); 440 at 768; 336 at ≤ 480. 02 stage 560/440/336.
- A second dark region is allowed only: section 02 stage and (optionally) a Lab mini-stage. Never a dark card, dark table or dark chart on the light page.

### 2.5 Section numbering and hairlines
- Section head = a **1 px `--line` rule spanning the 12 columns**, then 16 px below it a row: mono `01` (`label-mono` 12/16, `--ink-3`), an em dash is *not* used as glyph; instead 24 px horizontal space then `Pengalaman` in Inter 12/16 500 `--ink-2`. Rendered: `01   Di dalam SolarVein` (written "01 — Di dalam SolarVein" in copy where one line is needed, e.g. the nav `aria-label`). Then 24 px, then the H2.
- Hairlines (`--line`, 1 px): section top, between readout cells (horizontal only), table rows, disclosure rows, footer top. Never boxed around groups; never two rules adjacent (merge or drop one); no vertical rules except stage readout strip dividers (stage-line).
- Hero has no top rule (header's bottom border is its rule).

---

## 3. Typography

Families: `--font-sans: 'Inter Variable'` (UI, headings, body); `--font-mono: 'IBM Plex Mono'` weights 400/500 (replace JetBrains Mono; install `@fontsource/ibm-plex-mono`). Weights used: Inter 400/500/600; Plex Mono 400/500 only. No italics. No uppercase tracked labels (the 11 px caps eyebrow is retired); `text-transform: none` everywhere except mono unit abbreviations that are already uppercase (W, K, kWh).

| Token (Tailwind v4 `--text-*`) | Desktop size/line | Mobile (≤480) | Weight | Tracking | Colour | Use |
|---|---|---|---|---|---|---|
| `display` | 56/60 | 36/40 | 600 | −0.03em | ink | Hero H1 only (768: 44/48) |
| `h2` | 36/44 | 28/36 | 600 | −0.02em | ink | Section statements (768: 32/40) |
| `h3` | 20/28 | 18/26 | 600 | −0.01em | ink | Component/verdict titles; verdict statement in 04 may use `h3-lg` 24/32 |
| `body-l` | 16/26 | 16/26 | 400 | 0 | ink | Hero sub, the single statement |
| `body` | 14/22 | 14/22 | 400 | 0 | ink-2 (ink for key words) | Descriptions, disclosure content (max 64ch) |
| `small` | 13/20 | 13/20 | 400 | 0 | ink-2 | Captions, footnotes, chart notes |
| `label` | 12/16 | 12/16 | 500 | +0.01em | ink-2 | Field/readout/axis labels (sentence case) |
| `nav` / `button` | 14/20 | 14/20 | 500 | 0 | ink | Nav, buttons |
| `readout-xl` (mono) | 40/44 | 32/36 | 500 | −0.01em | ink | Hero P_e / Q_th |
| `readout-l` (mono) | 28/32 | 24/28 | 500 | −0.01em | ink | Lab L1 readouts |
| `readout-m` (mono) | 20/24 | 20/24 | 500 | 0 | ink | Table key numbers, slider value |
| `mono-s` | 13/20 | 13/20 | 400 | 0 | ink / ink-2 | Table cells, slider value inline, units tail |
| `mono-label` | 12/16 | 12/16 | 400 | +0.02em | ink-3 / stage-ink-2 | Section numbers, ticks, annotation labels, legend keys, chart axes |

Rules
- **When to use mono:** every measured/computed number with its unit; section numerals; annotation labels; axis ticks; formula/symbol strings (`T_in`, `W_th`). Everything else is Inter. Never mono for sentences or headings.
- **Numerals:** `font-variant-numeric: tabular-nums` (Inter too) and `font-feature-settings: 'zero'` for mono. Indonesian formatting: decimal comma, thin-space grouping (`1 530`, `289,5`). Unit follows after a thin space in `mono-s`/`label` size at 60 % of the number size (readouts) in `--ink-2`; subscripts `e` and `th` in unit (`W` + sub `e`) at 0.7em, same colour as the unit. Sign: always a true minus `−`; plus sign only for deltas. Direction glyphs `↓ ↑` accompany heat-flow numbers (never colour alone).
- Headings: max 2 lines, `text-wrap: balance`. Body: `text-wrap: pretty`, `max-width: 56ch` (≈ 640 px) in prose, never full container width.
- Minimum rendered text: 12 px. No viewport-fluid `clamp()` for type; use breakpoints at 1024 and 480 only.

---

## 4. Colour

### 4.1 Tokens (Tailwind v4 `@theme`, replace the existing dark `ink-*`, `heat-*`, `cool-*`, `electric-*`, `fluid-*` scales)

Light (page)
```
--color-paper:        #F7F8F6   /* page bg */
--color-surface:      #FFFFFF   /* Lab panel, popovers, inputs */
--color-sunken:       #EEF0ED   /* segmented track, slider track bg, hover wash */
--color-ink:          #171C22   /* text, primary button, electrical series */
--color-ink-2:        #66717C   /* secondary text (4.9:1 on paper) */
--color-ink-3:        #8C969F   /* ticks, disabled text, mono numerals (decorative only) */
--color-line:         #E3E7E9   /* hairlines */
--color-line-strong:  #CBD2D6   /* input borders, slider track, hover borders */
--color-heat:         #D98442   /* heat fills, bars, arrows (non-text) */
--color-heat-ink:     #A8561A   /* heat text/numbers on light (≥4.6:1) */
--color-heat-wash:    #FBF0E6   /* 1 use: selected row/hover tint */
--color-cool:         #398BAE   /* cool fills, bars, lines */
--color-cool-ink:     #1F6785   /* cool text on light (≥6:1) */
--color-cool-wash:    #E8F2F7
--color-loss:         #B8C0C6   /* neutral series: losses/conventional */
--color-focus:        #171C22   /* 2 px ring, 2 px offset */
--color-critical:     #B4442F   /* only for invalid input / error, never decorative */
```
Stage (3D chrome + canvas background)
```
--color-stage-0:      #0E1114   /* canvas edge / base */
--color-stage-1:      #15191D   /* canvas centre falloff; popovers on stage */
--color-stage-line:   #262C33
--color-stage-ink:    #E9ECEE
--color-stage-ink-2:  #8D979F   /* 5.6:1 on stage-0 */
--color-stage-heat:   #F0A05C   /* heat arrows / text on stage */
--color-stage-cool:   #5FB3D6
--color-stage-electric: #F1EDE4 /* warm-white electrical cue (never tinted lime) */
--color-stage-liquid-cold: #5E8FA3   --color-stage-liquid-hot: #D79A5E  /* fluid ramp, see §6 */
```
Delete: `electric-*` lime scale, `fluid-*` teal scale, `warning-400`, the old `ink-950…50` dark ladder, `--text-display` clamp. Keep ease/duration tokens.

### 4.2 Semantic mapping
| Meaning | Light page | Stage |
|---|---|---|
| Heat harvest (panel → liquid), thermal gain W_th > 0 | `heat` fill / `heat-ink` text, glyph `↓` | `stage-heat`, arrow points down into liquid |
| Heat rejection (liquid → panel → ambient), W_th < 0 | `cool` / `cool-ink`, glyph `↑` | `stage-cool`, arrow points up/out |
| Liquid-side thermal info (T_in, T_out, ΔT) | `cool-ink` text only when it is the subject | liquid ramp |
| **Electrical output W_e** | **`ink` solid** (`#171C22`) + bolt glyph ϟ-style SVG 12 px, never coloured | `stage-electric` warm-white pulses + same bolt glyph |
| Structure / losses / conventional / neutral | `ink-2`, `loss`, `line` | `stage-ink-2` |
| Emphasis (the one thing) | `ink` weight 500/600; a hairline underline; never colour | `stage-ink` |
| Error | `critical` + text | n/a |

No default gradient. The only multi-stop colour in the product is the fluid temperature ramp on the 3D liquid and its legend (cool → warm interpolated in OKLab through a desaturated mid `#9AA3A6`, so no muddy green appears).

### 4.3 Accent budget
- Per viewport: **ink + heat + cool**, and at most **one of heat/cool is dominant** (the active regime); the other appears only where it is physically present (e.g. cool arrows + a heat label do not coexist unless both are real). Coloured text ≤ 3 occurrences per viewport. Coloured area (excluding 3D) ≤ 2 % of viewport pixels.
- Colour never styles chrome: buttons, nav, focus, selected states are ink/neutral. The one allowed chrome colour is the 6 px mode dot in the segmented switch (heat for Cerah, cool for Hujan).
- Wash tints (`heat-wash`, `cool-wash`) are optional, one use each: highlighting the active row in tables / the selected layer in 02.

### 4.4 States (all controls)
| State | Light | On stage |
|---|---|---|
| Default | border `line-strong`, bg `surface`/transparent, text `ink` | border `stage-line`, bg transparent, text `stage-ink` |
| Hover | bg `sunken`; border `line-strong`; 150 ms | bg `rgba(233,236,238,.06)` |
| Pressed | bg `#E3E7E9`; translateY(0), scale(.98) 120 ms | bg `rgba(233,236,238,.10)` |
| Selected/active | primary: bg `ink`, text `#fff`; segmented: white thumb | thumb bg `stage-ink`, text `stage-0` |
| Focus-visible | `outline: 2px solid ink; outline-offset: 2px` | outline `stage-ink` |
| Disabled | opacity .4, no hover, `cursor: not-allowed` (text stays ≥ 3:1? use ink-3) | opacity .4 |
| Invalid | border `critical`, 12 px `critical` message under | n/a |
Transition: `150ms cubic-bezier(0.22,1,0.36,1)` on color, bg, border, transform only.

### 4.5 Chart palette (≤ 4 series, light)
1. `ink #171C22` — electrical W_e (always solid ink, thicker stroke 2 px or bars fill).
2. `heat #D98442` — thermal harvest W_th (+).
3. `cool #398BAE` — thermal rejection W_th (−) / liquid.
4. `loss #B8C0C6` — losses, conventional baseline, "other".
Comparison of configurations (04) uses a **monochrome lightness ramp**, not hue: Konvensional `loss`, PV + pendingin cairan `ink-2 #66717C`, SolarVein `ink`. Thermal-quantity charts use heat/cool as above. Axes: baseline `line-strong`, ≤ 3 gridlines `line` dashed none (solid hairline), ticks `mono-label` `ink-3`, direct end-of-bar labels in `mono-s`; legends replaced by direct labels where ≤ 4 marks; otherwise legend §5.7. Hover: non-hovered marks to 35 % opacity (150 ms). Bar radius 2; no bar gradients, no drop shadows, no 3D.

---

## 5. Components

Control heights: **32** (toolbar, dense Lab controls, table actions) and **40** (primary hero/switch/CTA). Touch (≤ 480, pointer: coarse): 44 hit area (padding/pseudo-element), visual stays 40.

### 5.1 Buttons
- `Button` variants: `primary` (bg ink, text #fff, no border), `secondary` (surface, 1 px `line-strong`, ink), `ghost` (transparent, ink-2 → ink on hover), `stage` (transparent, 1 px `stage-line`, `stage-ink`). Radius 8, padding-inline 16 (h40) / 12 (h32), font `button` 14/500, icon 16 + 8 gap. No shadows. Icon-only buttons: 32×32 or 40×40 square, radius 8, `aria-label` + tooltip (mono-label, 120 ms delay 400).
- Max one primary button per viewport. Text links inside prose: `ink` with 1 px underline offset 3, hover → underline thickness 2.

### 5.2 Segmented switch — Cerah / Hujan (hero primary control)
- **Look:** track 40 px high, padding 4, radius 10, two equal segments min-width 120. Light version: track `sunken`, inner border 1 px `line`; stage version (used in hero, which lives on the stage): track `rgba(233,236,238,.06)` + 1 px `stage-line`. One **sliding thumb** (32 px high, radius 8) — a single element translating between segments (220 ms `cubic-bezier(0.22,1,0.36,1)`), never per-segment backgrounds fading in/out. Thumb on stage: bg `stage-ink #E9ECEE`, text `stage-0`; thumb on light: `surface` + 1 px `line` + `0 1px 2px rgba(23,28,34,.08)`.
- Segment content: 16 px icon (sun / cloud-rain, stroke 1.5) + label 14/500: `Cerah`, `Hujan`. Left of the label on the active segment only: 6 px dot (heat / cool). Inactive text `stage-ink-2` / `ink-2`; hover inactive → `ink`/`stage-ink`.
- States: default, hover (inactive text brightens 150 ms), pressed (thumb scale .98 120 ms), focus-visible (2 px ring around the *whole control*, and an inner ring on the focused segment in keyboard nav), disabled (opacity .4). Semantics: `role="radiogroup"`, arrow keys move + select, Home/End. Changing mode never remounts the scene; it drives the input interpolation (brief). "Lab manual" is **not** a segment — it is a text link/ghost button "Buka Lab →" next to the switch.
- Used again (smaller, h32) in 04 for scenario ("Saat ini / Cerah / Hujan", three segments) and in Lab day history (Hari cerah / Hari hujan).

### 5.3 Slider (precision instrument)
- Row: label (`label` 12/16 `ink-2`) left, **value field right**: mono 13 `ink`, e.g. `900` + unit `W/m²` in `ink-2`, in a 72 px wide editable field (h32, 1 px `line-strong`, radius 8, text right-aligned; Enter/blur commits; clamps to `INPUT_LIMITS`).
- Track 2 px `line-strong`, filled part 2 px `ink` (not coloured). **Tick marks** below the track: minor every `step×N` 1×4 px `ink-3`, major (5 total incl. ends) 1×8 px `ink-3`; end labels (min/max) `mono-label` `ink-3` under the end ticks. Thumb: 16 px circle (20 on touch), `surface`, 1.5 px `ink` border, no shadow; hover scale 1.1 (150 ms); active scale 1.15 + thin 4 px `rgba(23,28,34,.08)` halo; focus-visible ring 2 px offset 2. Hit area 32 px high. Disabled: opacity .4.
- Default value is marked by a 1×8 `ink` tick (never coloured) with `mono-label` "baku" shown on hover/focus only.
- Dragging updates inputs continuously (3D interpolates), readout numbers throttled separately (brief).

### 5.4 Readouts (instrument readout style)
- No box. A cell = 1 px `line` top rule, 12 px below it label (`label`), 8 px below value+unit (`readout-l`/`xl` mono 500 `ink`, unit `mono-s` `ink-2` baseline-aligned, thin-space). Optional 3rd line (`small`, ink-2): only for the delta/direction glyph (`↓ panen`), ≤ 18 chars. Four cells in a row on desktop (`col-span-3`), 2×2 at ≤ 768.
- On the stage: the same recipe in stage tokens inside the **readout strip** (hero §7): cells separated by vertical 1 px `stage-line`.
- Value changes interpolate numerically (≤ 350 ms, tabular figures prevent jitter). Direction glyph rotates 180° over 220 ms only when sign flips.
- Electrical readout carries the bolt glyph (12 px) before the label; thermal carries `↓`/`↑`. No coloured value text except W_th (`heat-ink`/`cool-ink` on light, `stage-heat`/`stage-cool` on stage) — W_e stays ink/stage-ink. (The old yellow-lime W_e is dropped.)

### 5.5 Disclosures (L2/L3)
- Row: 48 px high, 1 px `line` top and bottom (collapse adjacent borders), title `body` 14/500 `ink`, optional trailing hint `small` `ink-2` ("Rumus, asumsi, batas model"), chevron 16 `ink-2` right (rotates 90° → 180°-ish, 180 ms). Content: padding-top 16/bottom 24, `body`, max-width 64ch; formulas in mono-s on `sunken` inline code (radius 4, padding 2/4). Height animates 260 ms (grid-template-rows 0fr→1fr). Uses native `<details>`-equivalent semantics with `aria-expanded`.
- Used for: formula/assumption/limitation items, El Niño/La Niña, Dampak karbon, "Lihat sebagai tabel" for every chart.

### 5.6 Annotations / callouts on the 3D
- Leader line: 1 px, `stage-ink-2` @ 70 %, one straight segment from anchor to an elbow, elbow = 16 px horizontal run, no arrowheads, anchor = 4 px dot (`stage-ink`, 1 px ring `stage-0`). Label: `mono-label` 12/16 `stage-ink`, preceded by symbol in `stage-ink-2` (`T_in`), value `stage-ink` 500, unit `stage-ink-2`; background none, `text-shadow: 0 0 6px stage-0` for legibility. No chips, no boxes. Max 4 labels visible in hero (T_in, T_out, W_e at junction box, G or heat-flow label); in 02 only the selected component's label is visible plus faint index numbers "1–4" (mono 12) on all four layers.
- Hover/selected annotation: line brightens to `stage-ink`, anchor dot scales 1.5 (150 ms); non-selected annotations drop to 40 %.
- Labels face camera, never rotate with the model; collision handling: labels flip side by comparing screen x to model centre; never overlap the readout strip (keep 24 px clearance).

### 5.7 Legend
- One row, 12 px `label`, items separated by 24, symbol drawn as the actual encoding: flow = 16×2 solid line `stage-liquid-*`; heat = `↓` arrow glyph in `stage-heat`; rejection = `↑` in `stage-cool`; electric = bolt in `stage-electric`. Max 4 items; shown on the stage bottom-left above the readout strip *only* in 02 and at the first visit/hover in hero (fades after 6 s, re-summoned via a `?` icon-button in the toolbar). In charts: direct labels first, legend only when needed, same symbol logic (square 8×8 radius 2 for fills).

### 5.8 Tables
- No outer border, no zebra, no cell fills. Header row: `label` 12/500 `ink-2`, 40 px high, bottom 1 px `line-strong`. Body rows 40 px (`mono-s` numbers right-aligned, labels Inter 14), 1 px `line` between; sub-caption under a label `small`. Highlight column (SolarVein): header gets a 2 px `ink` top rule; no tint. Winner/loser markers by text ("lebih tinggi", "setara"), not colour. Units live in the row label, not in every cell. Mobile: horizontal scroll disabled; table pivots to stacked blocks per configuration (label above, three rows).

### 5.9 Charts
- Per §4.5. Plot area padding 0 left axis labels outside; 3 y ticks max; no chart titles inside the SVG (title is an `h3` above, with the unit in `mono-label`). Sankey: ribbons flat 85 % opacity, labels `mono-s` at ends with `W_e`/`W_th` subscripts; scale bar bottom-left "skala 200 W". Chart container: no card; 1 px `line` top rule + 16 px padding.

### 5.10 Icons
One set, 16 px (20 in nav toggle), stroke 1.5, round joins, currentColor. Allowed icons: sun, cloud-rain, layers, scissors/section, rotate-ccw, maximize, chevron, plus/minus, external, info. Never in boxes, never coloured except the stage legend glyphs.

---

## 6. 3D stage art direction

Reference screenshots: `docs/audit/before/d-hero.png` (sunny), `docs/audit/creative/d1440-rainy-hero.png` (rainy).

### 6.1 Mood and lighting (studio)
- Scene reads as a product on a **graphite seamless sweep**: no visible horizon, no grid, no ring. Floor = large plane with `MeshBasicMaterial`-like baked radial: centre `#1A1F24`, 0.55 × stage-width radius, falloff to `#0E1114` at edge (stage-0 = canvas clear colour) via shader or a radial-alpha texture. A soft contact shadow (blurred, 35 % black, 0.9 × panel footprint, offset 0.04 u) under the panel; nothing else on the floor.
- Lights (Sunny): **key** directional/spot from upper-left-back, colour `#FFF1DE` (≈ 5 000 K), intensity 2.4, `shadow radius 4`; **rim** from rear-right low, `#9CC3D6` intensity 1.1 (defines frame edges); **fill** hemisphere `#C9D6E0 / #0E1114` intensity 0.35; environment: custom `Lightformer` studio (2 softboxes + 1 strip) at `environmentIntensity 0.7`, no HDR file fetch.
- Lights (Rainy, overcast): key → `#D8E3EC`, intensity 0.9, shadow radius 12 (nearly shadowless); rim → `#7FA8C0` 0.6; fill hemisphere raised to 0.6; sky/bg lift: centre falloff `#181D22` (from `#1A1F24`), overall slightly *cooler and flatter*. Interpolate all of the above with irradiance and rain (brief §Motion), not on a mode flag.
- Tone mapping ACES, `exposure 1.0`, sRGB; no bloom, no vignette post, no fog haze beyond 6 % linear on the floor edge.

### 6.2 Materials
| Part | Target |
|---|---|
| Front glass | `MeshPhysicalMaterial` colour `#DDE9EE`, `opacity 0.16` (sunny) → `0.20` (rain, wet), `roughness 0.04`, `clearcoat 1`, `envMapIntensity 1.3`, `transmission 0` (perf); `depthWrite false`; visible sky reflection streak across the glass from the key softbox; fresnel rim. Slight thickness: 3 u edge bevel catching rim light `#9CC3D6`. Wet state: roughness 0.02 + 6–8 low-frequency droplet normal blobs — optional, only if free. |
| PV cells | `#14203A` (dark blue-black), metal 0.1, rough 0.35; 6×10 grid; **cell gaps as 1 px-equivalent lines `#2A3C66`** (via texture, mipmapped, anisotropy 8); 3 busbars per cell column in `#8C97B0` at 40 % opacity; subtle cell-to-cell value variance ±3 % lightness. Surface temperature tint: a ≤ 6 % multiply shift toward `#3A2418` when hot (heat), `#10243A` when cold — interpolated. |
| Frame | Anodised aluminium `#AEB6BE`, metalness 0.9, roughness 0.38, with a 2-tone dark anodise option `#2A2F36` for the rear/sides; edge bevel 0.004 u so the rim light catches. |
| Copper channel | `#C57B45`, metalness 0.9, roughness 0.30; visible only in cutaway/exploded (and as the inlet/outlet fittings in assembled view). |
| Absorber plate | `#B8C1CC` brushed (roughness 0.45). |
| Liquid | translucent tube material: colour from ramp `stage-liquid-cold #5E8FA3` → `stage-liquid-hot #D79A5E` (OKLab, mid `#9AA3A6`), emissive 0.15 of same colour, opacity 0.85; never lime/green. |
| Insulation | `#2A2E33` matte (roughness 0.9) — reads as darker than frame. |
| Floor | see 6.1. |

### 6.3 Camera & framing
- Perspective, **FOV 28°** (long lens, less distortion than the current wide shot), azimuth −32° from the panel's long axis (we see the long edge and the inlet/outlet fittings on the right), elevation 24°, target slightly below panel centre. **Auto-fit:** distance computed so the panel's projected bounding width = **70 % of stage width** (clamp 62–76 % between 360 and 1280 px stage widths); panel vertical centre sits at 46 % of stage height (leave the bottom ~96 px clear for the readout strip). Mobile: 78 % width, elevation 28°.
- Bounded orbit: azimuth ±55° of home, elevation 12–60°, zoom 0.8×–1.4× of home; inertial damping (critically damped, no bounce). Double-click = animated Reset (700 ms). Idle: **no auto-rotate**; a 0.4° breathing yaw drift at 0.05 Hz is allowed only when the pointer has never touched the stage and `prefers-reduced-motion: no-preference`.

### 6.4 Sun — replace random strands
- **Remove** the 40 random vertical shafts that float beyond the panel (A10).
- **Replace with one coherent irradiance cue:** 7 parallel, evenly spaced rays in a single row across the panel width, all at the key-light angle (azimuth/elevation of the key), each 0.6 u long, 1 px, colour `#FFF3DC`, opacity `0.10 + 0.25 × (G/1000)`, ending exactly on the glass; a slow dash flow along the direction (period 2.4 s, no randomness, constant spacing). One mono annotation `G 900 W/m²` at the top of the central ray (§5.6). In overcast the rays fade out *before* the key colour shifts (G → 0 below 150 W/m²: rays hidden). Reduced-motion: static rays, no dash flow.
- Lighting carries the rest: key intensity/colour and the glass reflection streak scale with G.

### 6.5 Rain
- Fine, sparse, angled, desaturated: max **160 streaks** (was 600), 1 px wide, length 0.12 u, constant fall speed 1.6 u/s, angle 12° from vertical (consistent wind lean, steepens with wind speed), colour `#9FB2BF`, **opacity ≤ 0.35**, normal blending (no additive), `depthWrite false`. Volume: panel footprint ±0.5 u, from 1.1 u above to the glass; streaks terminate *on* the glass and fade over the last 0.1 u.
- **No ripple rings** in the stage (they currently read as 10 large white ellipses). Optional: 6 tiny 1-frame splash dots at 25 % opacity.
- Rain must never share hue with the cool heat arrows: rain = steel grey-blue desaturated, arrows = `#5FB3D6` saturated and larger. Rain density caps so the arrow field stays unobscured (rain count ∝ rain mm/h, ≤ 160 at the max).

### 6.6 Heat arrows (the hero of the stage)
- **Shape:** flat 2.5D "notched block arrow": shaft 0.014 u wide × 0.16 u long, head 0.05 u wide × 0.05 u long chevron-style (notched tail), extruded 0.006 u, `MeshBasicMaterial` (unaffected by lighting, so colour stays exact), `depthTest true`, `toneMapped false`. No cones.
- **Colour:** heat `#F0A05C`, rejection `#5FB3D6`, opacity 0.95; thin 1 px darker outline `#0E1114` at 60 % so they separate from cells.
- **Placement in the stack:** between the PV cell layer and the copper/absorber plane (the heat path), i.e. at y = absorber top. 4 columns × 3 rows = **12 arrows** max, aligned to the channel pitch (not random), each aligned to the panel normal. Assembled view: arrows slightly above the cell plane so they remain visible through the low-opacity glass; exploded view: arrows travel through the *gap* between exploded layers (the point of the explode).
- **Behaviour:** length ∝ |q_liquid| (min 0.06 u, max 0.22 u); pulse travel 1.2 s per cycle, staggered by column (0.1 s), fade-in 15 % / fade-out 15 % so they never teleport; when flux → 0 they shrink to 0 and fade; they reappear reversed (cool, pointing up) only when the model's sign flips. Count scales smoothly 12 → 3 with |q|. One single large *glyph arrow* (0.5 u) is not used.
- **Heat vs liquid vs electric legibility:** heat = flat arrows perpendicular to panel; liquid = flow within the serpentine channel (small round-ish packets, along the pipe); electric = warm-white pulses along busbars (below). Never reuse a shape.

### 6.7 Liquid flow
- Always inlet → outlet, speed ∝ pump. Packets are 0.02 u rounded rectangles aligned with the pipe, spacing constant, parameterised along the serpentine path *arc length* (no teleport around corners; use the existing `serpentine.ts` curve with corner arc-length handling). Colour is the fluid-temperature ramp (§6.2); packets never take heat/cool colours.

### 6.8 Electrical cue
- Distinct from heat (amber), liquid (steel→copper) and without lime: **warm-white `#F1EDE4`** hairline pulses (0.008 u × 0.06 u rounded bars) running along the three busbars toward the junction box at the panel's long edge, then one pulse sequence along a short lead to the box; rate ∝ P_e (0 W → none). The junction box gets a tiny `#F1EDE4` indicator LED (0.012 u) and the 12 px bolt-glyph annotation `W_e 293 W`. In the annotation the number is `stage-ink`, the bolt `stage-electric`. In reduced motion: static pulses at equally spaced positions, opacity ∝ P_e.

---

## 7. Hero composition ("01 Pengalaman")

Content: H1 "Satu panel. Dua arah panas." (final wording lead-owned; one line at 56 px); sub `body-l` "Listrik surya dan pertukaran panas dua arah, divisualisasikan." (one sentence); the stage; switch; readout strip with L1 only; one regime statement (dynamic). Nothing else: no pathway strip, no legend by default (legend appears on `?`), no parameter hint text, no advisories in the viewport (advisories → inline in the strip as one line when relevant).

### 7.1 Desktop 1440 × 900
```
┌─────────────────────────────────────────────────────────────────────────────┐ 0
│ SolarVein            01 Pengalaman  02 Di dalam  03 Lab  04 Perbandingan   │ header 56
├─────────────────────────────────────────────────────────────────────────────┤ 56
│  (80px margin)  ┌──────────────────────────────── 1280 ──────────────────┐  │
│                 Satu panel. Dua arah panas.        Listrik surya dan       │ 88  H1 display 56 cols1-8 | sub cols 9-12
│                                                    pertukaran panas ...    │
│                 ┌───────────────────────────────────────────────────────┐  │ ← 24 gap (stack-gap)
│                 │ [ ◐ Cerah | ◌ Hujan ]  Buka Lab →          ⟳ ⛶ ⌖ ?  │  │ stage top-left: switch (h40, inset 24)
│                 │                                         toolbar 32px  │  │ top-right: 4 icon buttons
│                 │                T_in 30,0 °C ─┐                         │  │ stage 1280 × ≈ 612 (clamp)
│                 │            ┌───────────────────────────┐              │  │
│                 │           /  ·  ·  ·  ·  ·  ·  ·  ·   /│── T_out       │  │ panel ≈ 70% of stage width (≈ 900 px)
│                 │          /    ↓  ↓  ↓  ↓  heat arrows /               │  │
│                 │         └───────────────────────────┘ ϟ W_e 293 W      │  │
│                 ├────────────────────────┬────────────┬─────────────────┤  │ ← 1 px stage-line; strip h 96
│                 │ ● Panen panas          │ ϟ Listrik  │ ↓ Termal ke     │  │ cols 1-5 | 6-8 | 9-12 (inside stage)
│                 │ Panas mengalir dari    │ 293 W_e    │ cairan          │  │
│                 │ panel ke cairan.       │            │ 865 W_th        │  │
│                 └────────────────────────┴────────────┴─────────────────┘  │ ≈ 812
│                                                                            │ ~ 88px peek of 02 rule
└─────────────────────────────────────────────────────────────────────────────┘ 900
```
- Statement cell = **mode (dot + text) + direction glyph + the ONE sentence** (`body` 14/22 `stage-ink`, label line `label` 12/16 `stage-ink-2`). It is the only prose in the hero. L1 = mode, heat direction, W_e, W_th all present in the strip. L2 (T_in/T_out) = the two leader annotations on the model (hide below 768). Advisory text (e.g. "Pendinginan tidak menguntungkan pada kondisi ini.") replaces the statement sentence when the model says so — same slot.
- Switch is inside the stage at top-left so the eye order is H1 → switch → model → numbers.

### 7.2 Mobile 390 × 844 (and 360)
```
┌──────────────────────────────┐ 0
│ SolarVein              Menu  │ header 56
├──────────────────────────────┤
│ Satu panel.                  │ display 36/40, 2 lines, margin-inline 16
│ Dua arah panas.              │
│ Listrik surya dan pertukaran │ body 14/22 ink-2 (1–2 lines)
│ panas dua arah, ...          │
│ ┌──────────────────────────┐ │ stage inset 16, radius 12, h 336
│ │ ⟳  ⛶  ⌖  ?        (32)   │ │ toolbar top-right (icon only)
│ │          T_in 30,0 °C ─┐ │ │ 2 annotations max
│ │     ┌────────────────┐   │ │
│ │    /  ↓  ↓  ↓  ↓    /│── │ │ panel ≈ 78% width
│ │   └────────────────┘ ϟ   │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │ ← bottom control area on LIGHT page, h 40 (44 touch)
│ │  ◐ Cerah   │   ◌ Hujan   │ │   segmented switch full width, light variant
│ └──────────────────────────┘ │
│ ● Panen panas                │ regime statement (label + 1 sentence)
│ Panas mengalir dari panel... │
│ ───────────────────────────  │
│ ϟ Listrik        ↓ Termal    │ two readouts, 2 cols, readout-l 24/28
│ 293 W_e          865 W_th    │
│ Buka Lab →                   │
└──────────────────────────────┘ 844 (switch ≈ y 520, readouts ≈ y 640 — no scroll to reach the switch)
```
- On mobile the switch leaves the stage (thumb-reach, light variant), statement + readouts live on the light page under the stage (text `ink`, not stage tokens). Annotation labels reduced to T_in/T_out; G annotation hidden; legend only through `?`. Touch drag on stage: horizontal orbit only; vertical swipes scroll the page (`touch-action: pan-y` on the canvas).
- 768: stage 440 high, switch inside stage top-left (as desktop), strip as 2×2 cells under stage on the light page.

---

## 8. Review checklist (Agent A — Design Systems Engineer output)

Pass/fail, each with a screenshot at 1440, 768, 390:
1. **Foundation:** page bg `#F7F8F6`; only the stage is dark; no other dark container. No gradients/glows in CSS (`grep -E "gradient|shadow-.*glow|backdrop"`, except header).
2. **Tokens only:** every colour from §4.1, every spacing ∈ {4,8,12,16,24,32,48,64,96}, radii ∈ {4,8,12,16}. No hex literals in components. No leftover `electric-*`/`fluid-*`/`warning-*` or JetBrains Mono.
3. **Type:** scale matches §3 exactly (px/line-height/tracking/weight); Inter + IBM Plex Mono only; no uppercase tracked eyebrows; ≤ 2 heading lines; line length ≤ 64ch; mono for every number and nowhere else; tabular numerals; decimal comma; true minus.
4. **Anti-patterns absent:** no pill badges, no icon-in-box, no card-in-card, no coloured left borders, no eyebrow+h2+p trio, no repeated statements.
5. **Section skeleton:** hairline + `01 — Nama` numbering, then ≤ 1 H2 statement (≤ 8 words) + ≤ 1 sentence; section padding 96/64/48; content max 1280; left alignment.
6. **Accent budget:** per viewport ≤ ink + heat + cool; ≤ 3 coloured text spans; W_e never coloured on light; semantic mapping §4.2 honoured; heat/cool never used as chrome.
7. **Controls:** heights 32/40; segmented switch has a single sliding thumb, radiogroup semantics, all 6 states; slider has ticks + mono value field + unit; focus ring visible on every interactive element (2 px, offset 2); disabled state ≥ 40 % opacity; keyboard path works.
8. **Readouts/tables/charts:** readout recipe (rule, label, mono value, unit), tables unboxed with right-aligned mono numbers, ≤ 4 chart series per §4.5, direct labels, hover dimming; no chart on dark background.
9. **Stage:** inset with 16 px radius, 1 px `stage-line` edge, no outer shadow; chrome uses stage tokens; ≤ 4 annotations with leader lines and mono labels.
10. **Hierarchy:** one focal point per viewport (the model in 01/02, the controls+Sankey in 03, the verdict+table in 04); whitespace is intentional (no empty 400 px gaps such as A12).
11. **Mobile:** no horizontal overflow at 360/390; switch within the first 640 px; 44 px touch targets; stage not a shrunken desktop (§7.2).
12. **Motion hooks:** transitions 150–220 ms with `cubic-bezier(0.22,1,0.36,1)`; no animation of text for its own sake; `prefers-reduced-motion` neutralises thumb slide/disclosure/readout tweening to ≤ 1 frame.
Blocking issues: any of 1, 4, 6 failing, or text < 12 px, or contrast < 4.5:1 for body text (`ink-2` on `paper` = 4.9:1 passes; `ink-3` is decorative only — never for sentences).
