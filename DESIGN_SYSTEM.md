# SolarVein design system

Source of truth with `src/index.css` (Tailwind v4 `@theme`) and `src/ui/`. Art direction: `docs/audit/07-creative-direction-v2.md` (v2 supersedes 05 where they differ).
Voice: a calibrated instrument on a studio bench. Light paper page, precision-mono numbers, one dark 3D stage; photography and depth carry the warmth.

## Tokens (class = `bg-*`, `text-*`, `border-*`, `fill-*`, `stroke-*`)
- **Page:** `paper #F7F8F6` · `surface #FFF` · `sunken #EEF0ED` · `ink #171C22` · `ink-2 #5B6670` (5.5:1, all text) · `ink-3 #6A747E` (4.5:1, tertiary text) · `tick #8C969F` (NON-text ticks/rules only) · `line #E3E7E9` · `line-strong #CBD2D6` · `focus` · `critical #B4442F` (errors only).
- **Physics colour:** `heat-mark #C4702D` (chart marks, arrows, dots on light, 3.5:1) · `heat #D98442` (large fills / dark stage only, 2.7:1) · `heat-ink #A8561A` (text) · `heat-wash` · `cool #398BAE` (3.6:1) / `cool-ink #1F6785` (text) / `cool-wash` · `loss #B8C0C6` (decorative, never the only signal). Electrical W_e is always **ink**.
- **Stage:** `stage-0/1/line/ink/ink-2/heat/cool/electric/liquid-cold/liquid-hot`.
- **Depth (v2 §D):** `shadow-0..4` (tinted ink; 0 none · 1 thumb · 2 popover/Lab card · 3 card over photo · 4 stage over opening; `shadow-e1..e3` = same values, kept). Scrims `scrim-opening` (S1+S2), `scrim-s1m`, `scrim-s3`, `scrim-s4` (Dampak), `scrim-s5` (closing), `scrim-s6` (Lab strip), plus `scrim-s1/s2`, `scrim-b|t|all|light-*`. Sky: `--sky-sunny-0..3`, `--sky-rainy-0..3`, utilities `sky-sunny`, `sky-rainy`, and `sky-live` driven by tweenable `--sky-0..3` (registered `@property <color>`). Finish: `grain`, `vignette`, `photo-band` (both), `paper-glass` (exactly two components), `parallax-y` (CSS `view()` timeline, no JS).
- **Spacing:** Tailwind steps 1,2,3,4,6,8,12,16,24 = 4/8/12/16/24/32/48/64/96 px (also `--space-1..9`). Radii `rounded-xs/sm/md/lg` = 4/8/12/16 (buttons 12, small controls 8, cards 12, stage 16). Controls 32 (`sm`) / 40 (`md`); every interactive primitive reaches 44 px under `pointer-coarse`.
- **Motion:** 150/220/300/800/1000 ms (`--dur-*`), `ease-ui = cubic-bezier(0.22,1,0.36,1)`, utilities `transition-ui`, `transition-slide`. Reduced motion zeroes transitions, animations, grain and parallax.

## Type (Geist Variable + Geist Mono Variable; redesign Oct 2026)
**Oct 2026:** Geist Medium (500) for every heading, no width axis. Desktop scale: `display-xl` 96/92 −0.04em (opening, closing) · `h2`/`display`/`display-l` 64/64 −0.032em · `stat`/`number-xl` 96/92 · `h3` 28/34 · `lead` 22/32 · `body-l` 19/30 · `body` 17/26 · `button` 15/20 · `small` 14/20 · `label` 12/16 · `readout-xl/l/m` 44/32/24 Geist Mono. Steps at 1279/1023/767/480 in `src/index.css`. Palette: paper `#F6F5F2`, sunken `#ECEBE7`, ink `#111214`, sun accent `#F5B03D` (highlights only; heat/cool colours unchanged). Buttons and segmented controls are pills. The older line below is historical.
Fonts via `--font-sans`, `--font-display`, `--font-mono` only. Weights 400/500/600 (never 700). No stylistic sets assumed; `tnum` only for data (`num`, `tnum`; `text-number-xl` is tabular).
`text-*` sets size/line-height/tracking/weight and steps at 1279 / 1023 / 767 / 480:
`display-xl` 88/84 (opening, closing; wdth 92, −0.035em, margin-left −0.04em) · `display-l` 56/56 (section H2; wdth 94, −0.03em; `display`, `h2` are aliases) · `number-xl` 72/72 (Dampak numbers; wdth 92, tabular; `stat` alias) · `h3` 24/32 · `lead` 22/32 · `body-l` 18/28 (prose) · `body-s` 15/24 (`body` alias: dense UI body) · `ui`/`button` 14/20 · `caption`/`small` 13/20 · `label` 12/16 · `readout-xl/l/m` 40/28/20 Plex Mono 500 · `mono-s` 13/20 · `mono-label` 12/16.
Display gets `word-spacing .02em`. Headings `text-wrap: balance`, prose `pretty`, `measure` (60ch; `-narrow` 55, `-wide` 70). Hand breaks on desktop only (`<br class="hidden lg:block">`). Mono only for instrument numbers up to 40 px; editorial numbers are sans. Missing glyphs: `₂ ≈ →` (use `<sub>`, "sekitar", no arrows). Numbers: `formatId`, `formatSigned`, `formatWithUnit(36.2,'°C',1)` (NBSP + true minus); `typo(text)` applies the §B.6 rules (NBSP after numbers and ≤3-letter words, curly quotes, en dash ranges, `×`, `−`) to static copy.

## Grid
`page-wrap` (content 1280, gutters 40/24/16) → `grid-12` (gap 24/16) with `col-span-*`. `section` padding 96/64/48. `<SectionIndex n="01" label="Pengalaman" />` = hairline + mono numeral + label.

## Components (`src/ui`)
- `SegmentedControl {options[{value,label,icon,dot}], value, onChange, ariaLabel, size:'sm'|'md', tone:'page'|'stage', fullWidth, noSelection}`; `Slider {…, marks, defaultValue, density, editable}`; `Readout`, `Metric` (wrapper), `StatBlock {size:'stat'|'lg'|'md', tone:'page'|'stage'|'photo', note}`; `Disclosure`; `Tooltip`, `InfoTip`; `Button` (primary/secondary/ghost/stage), `ButtonLink`, `IconButton {label}`; `Toggle`; `StatusDot` (`Badge`/`StatusPill` deprecated aliases); `Panel` (hairline container); `Annotation`/`SvgAnnotation`; `SectionHeader`, `SectionIndex`.
- Imagery: `Picture {name | src/avif/webp, sizes, ratio|fill, position, priority, maxWidth}` (AVIF→WebP, srcset + LQIP + aspect from `public/images/photos/manifest.json` through `photoSet(name)`; lazy unless `priority`; missing file → LQIP/average colour). `MediaFrame`/`Figure {name|src…, parallax, scrim, grain|band, caption, credit, placeholder, children}`. `FloatingPanel {elevation:1..4, tone, glass, blur, radius}`.
- States: default / hover / pressed / selected / focus-visible (2 px ink ring, offset 2; light inside `data-tone="stage"`) / disabled (40 %).

## Charts (`src/charts`)
≤ 4 series: ink (W_e), `heat-mark` (+W_th), cool (−W_th), loss. Configuration comparison is a monochrome ramp (`loss` → `ink-2` → `ink`). Light background only; hairline axes, mono 12 ticks in `ink-2`, direct end labels, hover dims others to 35 %, no gradients. `ChartCard` is unboxed; tables via `Disclosure`.

## Accent budget, anti-patterns
Per viewport: ink + the active thermal colour; ≤ 3 coloured text spans; chrome is neutral (only the 6 px mode dot is coloured). No eyebrow caps, pill badges, icon-in-box, card-in-card, lime/neon, glow, italic accent phrase, serif, 700 weights, or impact number without its assumption note.

## Example
```tsx
<AmbientVideo src="/videos/hero-array.mp4" poster="hero-array" alt="Ilustrasi konteks: …" />
<SectionHeader index={{ n: '01', label: 'Pengalaman' }} title="Satu panel. Dua arah panas." lead="…" />
<Picture fill name="roof-aisle" alt="Ilustrasi konteks: …" position="50% 60%" />
```
