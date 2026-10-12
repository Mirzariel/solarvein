# SolarVein identity reference (extracted from docs/audit/05-creative-direction.md)

Final token values live in DESIGN_SYSTEM.md + src/index.css; if they differ from this file, the code wins.

## 1. Identity statement

**SolarVein is a calibrated instrument shown on a studio bench.**
Three registers, never mixed on the same element:

1. **Scientific editorial** (the page): warm-neutral paper, quiet Inter, generous whitespace, hairline rules, numbered sections, one declarative sentence where a lesser page would use a paragraph.
2. **Precision instrument** (every number): Geist Mono, tabular, right-aligned, units in a lighter tone, ticks and leader lines drawn at 1 px. Readouts look *measured*, not *marketed*.
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

