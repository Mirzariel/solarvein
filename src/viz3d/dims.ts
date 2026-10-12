/**
 * Shared geometry contract for the 3D collector and its effects.
 * Scene units are metres for the panel footprint; layer thicknesses are
 * visually exaggerated (a real PVT laminate is ~4–6 cm thick in total).
 *
 * Axes: panel lies in the XZ plane, sun-facing side = +Y.
 *   X = width, Z = length (fluid enters at −Z… see serpentine), Y = thickness.
 * Owner: Agent 4 (3D). Others may import; do not rename exports.
 */

export const PANEL_WIDTH = 1.0; // X [scene m]
export const PANEL_LENGTH = 1.7; // Z [scene m]

export type LayerId = 'glass' | 'cells' | 'interface' | 'absorber' | 'channel' | 'insulation';

export interface LayerSpec {
  id: LayerId;
  /** Indonesian UI label. */
  label: string;
  /** Short technical subtitle (may contain English terms). */
  detail: string;
  /** Visual thickness [scene units]. */
  thickness: number;
  /** Centre Y position in assembled view. */
  y: number;
  /** Extra Y offset applied in exploded view. */
  explodeOffset: number;
}

/** Ordered front (sun side, top) → back. */
export const LAYERS: readonly LayerSpec[] = [
  { id: 'glass', label: 'Kaca pelindung', detail: 'Kaca tempered rendah-besi 3,2 mm', thickness: 0.0032, y: 0.0299, explodeOffset: 0.4 },
  { id: 'cells', label: 'Sel PV & enkapsulasi', detail: 'Sel mono-PERC + EVA', thickness: 0.0022, y: 0.0272, explodeOffset: 0.3 },
  { id: 'interface', label: 'Antarmuka termal', detail: 'Bahan antarmuka (TIM)', thickness: 0.0008, y: 0.0257, explodeOffset: 0.2 },
  { id: 'absorber', label: 'Pelat absorber', detail: 'Pelat aluminium penyebar panas', thickness: 0.0015, y: 0.02455, explodeOffset: 0.11 },
  { id: 'channel', label: 'Saluran cairan serpentine', detail: 'Tabung tembaga serpentine', thickness: 0.009, y: 0.0193, explodeOffset: 0.0 },
  { id: 'insulation', label: 'Insulasi & rangka belakang', detail: 'Busa PU + lembar belakang + rangka', thickness: 0.0118, y: 0.0089, explodeOffset: -0.16 },
] as const;

/**
 * REAL proportions in the assembled view (module 1.70 x 1.00 m, 35 mm anodised frame, 3.2 mm glass, 9 mm copper
 * tube). The exploded view only spaces the layers apart and thickens the FLAT plates (scale.y) for legibility.
 */
export const FRAME_DEPTH = 0.035;
export const FRAME_LIP_T = 0.0035; // top lip over the glass
export const FRAME_LIP_W = 0.0105; // how far the lip reaches over the glass edge
export const FRAME_WALL_T = 0.003; // sheet thickness of the extrusion walls
export const BACKSHEET_Z0 = 0.003;
export const BACKSHEET_T = 0.001;
export const FOAM_TOP_Y = 0.0148;
/** Flat plates grow by this much (x factor, scaled by the explode factor) in the exploded view. */
export const EXPLODE_THICKEN = 3.5;

/** Serpentine channel: number of straight passes along Z. */
export const SERPENTINE_PASSES = 8;
/** Tube outer radius [scene units]. */
export const TUBE_RADIUS = 0.0045;
/** Inset of the serpentine from the panel edge [scene units]. */
export const SERPENTINE_MARGIN = 0.08;
