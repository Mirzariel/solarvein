# SolarVein identity reference (extracted from docs/audit/05-creative-direction.md)

Final token values live in `src/index.css` (+ DESIGN_SYSTEM.md); if they differ from this file, the code wins. Fonts in code: **Geist** (display + UI, Medium 500 headings) and **Geist Mono** (readouts), self-hosted via Fontsource. There is no Inter or IBM Plex.

## 1. Identity statement

**SolarVein is a calibrated instrument shown on a studio bench.**
Three registers, never mixed on the same element:

1. **Scientific editorial** (the page): warm-neutral paper, quiet Geist, generous whitespace, hairline rules, numbered sections, one declarative sentence where a lesser page would use a paragraph.
2. **Precision instrument** (every number): Geist Mono, tabular, right-aligned, units in a lighter tone, ticks and leader lines drawn at 1 px. Readouts look *measured*, not *marketed*.
3. **Cinematic product** (the stage only): a graphite seamless sweep, soft key + cool rim, believable glass and metal, slow dolly-quality camera. Cinematic ends where the stage radius ends.

**It is:** quiet, exact, spatial, honest about uncertainty, mostly neutral with colour *only* where physics requires it.
**It is not:** a SaaS landing page, a dark "hacker/neon" dashboard, an infographic poster, an icon-and-card feature grid, a gradient-and-glow AI product shot.

Hard prohibitions (carry over to every agent):

- No eyebrow caps label above headings. Section numbering replaces it (§2.5).
- No pill/chip badges as status or category decoration. Allowed: inline text status with a 6 px dot (`● Air panas`), and mono tag text inside tables.
- No icon-in-box (rounded square behind an icon). Icons are bare, 16 px, stroke 1.5, only in buttons/toolbars/disclosure rows.
- No gradient fills on UI, no glow shadows, no `backdrop-blur` panels except the sticky header at 90 % paper + 1 px border.
- No card unless it groups controls with their outputs (Lab controls) or a form-like set. Never card-in-card.
- No coloured left borders / coloured card tints.
- No text over 64 characters wide per line; no more than 2 sentences visible in any block; paragraphs of 3+ sentences exist only inside disclosures.
- No rainbow; no "lime" anywhere (UI, charts, 3D).
- Never repeat in text what an animation/annotation already shows.

---


---

## 4. Colour (v2: colour = medium, shape = destination)

### 4.1 Tokens (source of truth: `src/index.css` `@theme`)

Light (page)
```
--color-paper:        #F6F5F2   /* page bg, "Daylight Concrete" */
--color-surface:      #FFFFFF   /* Lab panel, popovers, inputs */
--color-sunken:       #ECEBE7   /* segmented track, hover wash */
--color-concrete:     #E7E5E0   --color-sun: #F5B03D   /* sun accent: highlights only, never data */
--color-ink:          #111214   /* text, primary button, electricity */
--color-ink-2:        #5D6066   /* secondary text; regeneration exhaust; evidence dots */
--color-ink-3:        #696C72   /* tertiary text */
--color-tick:         #96989C   /* non-text ticks/rules only */
--color-line:         #E4E2DD   --color-line-strong: #CFCCC5
--color-heat:         #D98442   /* large fills */   --color-heat-mark: #C4702D   /* marks/arrows/dots on light */
--color-heat-ink:     #A8561A   /* heat text on light */   --color-heat-wash: #FBF0E6
--color-cool:         #398BAE   --color-cool-ink: #1F6785   --color-cool-wash: #E8F2F7
--color-loss:         #B8C0C6   /* bypass, losses, baselines */
--color-focus:        #111214   --color-critical: #B4442F   /* invalid input only */
```
Stage (3D chrome + canvas): `stage-0 #0E1114`, `stage-1 #15191D`, `stage-line #262C33`, `stage-ink #E9ECEE`,
`stage-ink-2 #8D979F`, `stage-heat #F0A05C`, `stage-cool #5FB3D6`, `stage-electric #F1EDE4`, liquid ramp
`stage-liquid-cold #5E8FA3` to `stage-liquid-hot #D79A5E`.

### 4.2 Semantic mapping (v2)
Colour names the **medium**; **shape** names the destination. A viewer who loses colour must still read the router.

| Meaning | Light page | Stage / SVG |
|---|---|---|
| Heat carried in the liquid (W_th), every branch of the router | `heat-mark` line/fill, `heat-ink` text | `stage-heat` |
| Delivered to hot water (DHW) | solid amber path ending at the preheat HX | solid |
| Stored in the tank | tank outline (1 px `ink`) with an amber **fill level** = SoC | same |
| Desiccant regeneration (research path) | **dashed** amber path (dashed = not yet validated) | dashed |
| Bypass / unused | `loss` grey, solid thin | grey |
| Dehumidified supply air, moisture marks | `cool` / `cool-ink`, the only use of cool | `stage-cool` |
| Regeneration exhaust air | `ink-2` | `stage-ink-2` |
| **Electricity** (W_e: PV, pump, fans) | `ink` solid + 12 px bolt glyph; never coloured | warm-white `stage-electric` |
| Structure / baselines / conventional | `ink-2`, `loss`, `line` | `stage-ink-2` |
| Emphasis | `ink` weight 500/600 or hairline; never colour | `stage-ink` |
| Error | `critical` (invalid input only) | n/a |

The v1 meaning (cool = heat rejection, rain, cyan arrows, flipped arrows) is **retired**. Heat only ever flows cell,
then liquid, then destination; arrows never point out of the liquid.

### 4.3 Accent budget (per mode)
- **A** (heat available): ink + amber. **B** (weak sun, humid): amber (stored-heat discharge) + cool (dehumidified
  air), the only mode where both coexist. **C** (no collection): mostly neutral, a dim amber tank discharge.
- Coloured text at most 3 spans per viewport; coloured area (excluding 3D) at most 2 % of the viewport.
- Colour never styles chrome. The only chrome dot is the 6 px state dot in the A/B/C switch.
- Wash tints: one use each (active row, selected layer). No gradients except the liquid temperature ramp; no glow; no lime.

### 4.4 States (all controls)
| State | Light | On stage |
|---|---|---|
| Default | border `line-strong`, bg `surface`/transparent, text `ink` | border `stage-line`, text `stage-ink` |
| Hover | bg `sunken`; 150 ms | bg `rgba(233,236,238,.06)` |
| Pressed | bg `line`; scale(.98) 120 ms | bg `rgba(233,236,238,.10)` |
| Selected | primary: bg `ink`, text `#fff`; segmented: white thumb | thumb bg `stage-ink`, text `stage-0` |
| Focus-visible | `outline: 2px solid ink; offset 2px` | outline `stage-ink` |
| Disabled | opacity .4, `cursor: not-allowed` | opacity .4 |
| Invalid | border `critical`, 12 px message | n/a |

Transition: `150ms cubic-bezier(0.22,1,0.36,1)` on color, bg, border, transform only.

### 4.5 Charts (at most 4 series, light)
`ink` electricity (2 px) · `heat-mark` thermal · `cool` moisture/dehumidified air only · `loss` baselines/bypass.
Baseline comparison (B1-B4, SolarVein) uses a **monochrome lightness ramp**, not hue; SolarVein = `ink`.
**Dashed series = not yet validated** (desiccant, heat-pump source). Hatched bands mark modes A/B/C. The waterfall
(gross, minus embodied, minus parasitic, equals net) builds on scroll, no odometer. Axes: baseline `line-strong`,
at most 3 gridlines, ticks mono `ink-3`, direct labels. Hover dims others to 35 %. Bar radius 2; no gradient, shadow or 3D.

### 4.6 Evidence-tag dots (shape in `ink-2`, never colour)
| Tag | Dot |
|---|---|
| Established (mapan) | filled |
| Published (terbit) | filled + citation marker |
| Simulation (simulasi) | half |
| Assumption (asumsi) | hollow |
| Hypothesis (hipotesis) | dashed hollow |
| Proposed innovation (usulan) | diamond |

The label text appears on first use per viewport; the legend lives in Validasi. The desiccant status is "Hipotesis
riset · belum divalidasi" with a dashed dot: no amber, red or warning icon. Pins/callouts: at most 3 per viewport.

---

## 6. 3D stage art direction

Reference screenshots (v1, for lighting and material mood only): `docs/audit/before/d-hero.png`. Rain and heat-rejection visuals are retired.

### 6.1 Mood and lighting (studio)
- Scene reads as a product on a **graphite seamless sweep**: no visible horizon, no grid, no ring. Floor = large plane with `MeshBasicMaterial`-like baked radial: centre `#1A1F24`, 0.55 × stage-width radius, falloff to `#0E1114` at edge (stage-0 = canvas clear colour) via shader or a radial-alpha texture. A soft contact shadow (blurred, 35 % black, 0.9 × panel footprint, offset 0.04 u) under the panel; nothing else on the floor.
- Lights (Sunny): **key** directional/spot from upper-left-back, colour `#FFF1DE` (≈ 5 000 K), intensity 2.4, `shadow radius 4`; **rim** from rear-right low, `#9CC3D6` intensity 1.1 (defines frame edges); **fill** hemisphere `#C9D6E0 / #0E1114` intensity 0.35; environment: custom `Lightformer` studio (2 softboxes + 1 strip) at `environmentIntensity 0.7`, no HDR file fetch.
- Lights (humid grey / weak sun, mode B, and dusk): key → `#D8E3EC`, intensity 0.9, shadow radius 12 (nearly shadowless); rim → `#7FA8C0` 0.6; fill hemisphere raised to 0.6; sky/bg lift: centre falloff `#181D22` (from `#1A1F24`), overall slightly *cooler and flatter*. Interpolate all of the above with irradiance (time-of-day stops: dawn / noon / humid grey / night), not on a mode flag.
- Tone mapping ACES, `exposure 1.0`, sRGB; no bloom, no vignette post, no fog haze beyond 6 % linear on the floor edge.

### 6.2 Materials
| Part | Target |
|---|---|
| Front glass | `MeshPhysicalMaterial` colour `#DDE9EE`, `opacity 0.16` (sunny), `roughness 0.04`, `clearcoat 1`, `envMapIntensity 1.3`, `transmission 0` (perf); `depthWrite false`; visible sky reflection streak across the glass from the key softbox; fresnel rim. Slight thickness: 3 u edge bevel catching rim light `#9CC3D6`. |
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

### 6.4 Sun: one coherent irradiance cue
- **Remove** the 40 random vertical shafts that float beyond the panel (A10).
- **Replace with one coherent irradiance cue:** 7 parallel, evenly spaced rays in a single row across the panel width, all at the key-light angle (azimuth/elevation of the key), each 0.6 u long, 1 px, colour `#FFF3DC`, opacity `0.10 + 0.25 × (G/1000)`, ending exactly on the glass; a slow dash flow along the direction (period 2.4 s, no randomness, constant spacing). One mono annotation `G 900 W/m²` at the top of the central ray (§5.6). In overcast the rays fade out *before* the key colour shifts (G → 0 below 150 W/m²: rays hidden). Reduced-motion: static rays, no dash flow.
- Lighting carries the rest: key intensity/colour and the glass reflection streak scale with G.

### 6.5 Rain (removed in v2)
No rain particles, ripples or wet-glass state. Humid or overcast is expressed only by lighting and the sky stops.

### 6.6 Heat arrows
- **Direction:** cell to liquid only (flat notched block arrows between the PV cell layer and the absorber plane). They
  vanish when q_liquid = 0 (night, pump off). Never reversed, never cyan.
- **Shape/colour:** shaft 0.014 u x 0.16 u, head 0.05 u, `MeshBasicMaterial`, `toneMapped false`, `stage-heat #F0A05C`, opacity .95.
  4 x 3 = 12 max, aligned to the channel pitch; length proportional to live q_liquid (0.06-0.22 u); 1.2 s pulse, 15 % fade in/out.
- **Downstream:** after the "Keluar 62 °C" label dissolves into the SVG router source node, heat is shown by the router
  diagram, not by 3D arrows.
- Heat = flat arrows, liquid = round packets along the pipe, electricity = warm-white pulses. Never reuse a shape.

### 6.7 Liquid flow
- Always inlet → outlet, speed ∝ pump. Packets are 0.02 u rounded rectangles aligned with the pipe, spacing constant, parameterised along the serpentine path *arc length* (no teleport around corners; use the existing `serpentine.ts` curve with corner arc-length handling). Colour is the fluid-temperature ramp (§6.2); packets never take heat/cool colours.

### 6.8 Electrical cue
- Distinct from heat (amber), liquid (steel→copper) and without lime: **warm-white `#F1EDE4`** hairline pulses (0.008 u × 0.06 u rounded bars) running along the three busbars toward the junction box at the panel's long edge, then one pulse sequence along a short lead to the box; rate ∝ P_e (0 W → none). The junction box gets a tiny `#F1EDE4` indicator LED (0.012 u) and the 12 px bolt-glyph annotation `W_e 293 W`. In the annotation the number is `stage-ink`, the bolt `stage-electric`. In reduced motion: static pulses at equally spaced positions, opacity ∝ P_e.

---


### 6.9 Hotel roof stage (v2)
- One WebGL canvas: the collector array on a **hotel roof**: graphite plinth, parapet, plant room, ghost neighbour
  buildings (flat, `stage-1` with 1 px `stage-line` edges, no windows). Pull-back from the module to the roof is a
  camera move on scroll; the camera never moves on an A/B/C switch.
- At most 4 labels: mono 12 px on `stage-ink` ("Keluar 62 °C"). Photos are captioned "Ilustrasi, bukan dokumentasi proyek".

---

## 7. Instrument-style SVG diagrams (router, tank, desiccant)
- Flat, **1 px** strokes, mono labels with units, orthogonal pipes with 4 px radius corners, 24 px grid. No isometric
  drawing, no icon boxes, no drop shadows, no gradients. A light-paper variant exists for export (`data-export`).
- Three separable layers: thermal (amber), electrical (ink), air (cool for dehumidified supply, `ink-2` for exhaust).
- Branch width proportional to allocated W_th; total width proportional to Q_liquid and held constant across a mode
  transition (about 1.1 s: sky/G/RH 0-0.55, rule line 0.35-0.6, valves 0.4-1.0 on a critically damped spring).
  At most 60 packets, transforms only, paused off-screen. At night widths are 0 and nothing moves.
- Encoding by shape: solid = delivered, tank outline + fill = stored, **dashed = not yet validated**, grey = bypass.

## 8. Presentation mode (`?presentasi=1`)
Fixed scenes, larger type (1,25x or more), secondary chrome hidden, keyboard: left/right, 1-8, R reset, L assumptions.
Must stay legible at 1280x720 on a projector at 125 % zoom (use the light-paper variant if contrast is lost). The
visual rules above are unchanged; nothing is added for effect.
