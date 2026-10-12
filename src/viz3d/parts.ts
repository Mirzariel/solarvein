/**
 * The four annotated parts of section 02 (docs/audit/02-ux-ia.md 2.2) and their live values.
 * Three-free: the Inside section and the stage overlay both import it.
 * Values come straight from a SimResult (no physics here).
 */
import type { SimResult } from '../sim';
import type { LayerId } from './dims';
import { formatId } from './fmt';

export type PartId = 'pv' | 'absorber' | 'channel' | 'insulation';

export interface PartSpec {
  id: PartId;
  /** 1-based index shown on the annotation. */
  index: number;
  label: string;
  /** Layers that belong to the part (focus highlights all of them). */
  layers: readonly LayerId[];
  /** ONE sentence (natural Indonesian). */
  sentence: string;
}

export const PARTS: readonly PartSpec[] = [
  {
    id: 'pv',
    index: 1,
    label: 'Sel PV & kaca',
    layers: ['glass', 'cells'],
    sentence: 'Mengubah cahaya jadi listrik; efisiensinya turun saat sel memanas.',
  },
  {
    id: 'absorber',
    index: 2,
    label: 'Pelat absorber',
    layers: ['interface', 'absorber'],
    sentence: 'Pelat aluminium yang menghantar panas antara sel dan saluran, ke dua arah.',
  },
  {
    id: 'channel',
    index: 3,
    label: 'Saluran cairan',
    layers: ['channel'],
    sentence: 'Tabung tembaga serpentine; cairan selalu masuk lalu keluar.',
  },
  {
    id: 'insulation',
    index: 4,
    label: 'Insulasi & rangka',
    layers: ['insulation'],
    sentence: 'Menahan rugi panas di sisi belakang.',
  },
] as const;

export const PART_BY_ID: Record<PartId, PartSpec> = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<
  PartId,
  PartSpec
>;

/** Which part a layer belongs to. */
export function partOfLayer(layer: LayerId): PartId {
  for (const p of PARTS) if (p.layers.includes(layer)) return p.id;
  return 'insulation';
}

export interface PartValue {
  /** Symbol / short name, rendered `stage-ink-2`. */
  symbol: string;
  /** Number (already formatted, decimal comma, true minus). */
  value: string;
  /** Unit, rendered `stage-ink-2`. */
  unit: string;
}

/** ONE live value per part. */
export function partValue(id: PartId, r: SimResult): PartValue {
  switch (id) {
    case 'pv':
      return { symbol: 'T sel', value: formatId(r.cellC, 1), unit: '°C' };
    case 'absorber': {
      const node = r.profile.find((n) => n.id === 'absorber');
      return { symbol: 'T pelat', value: formatId(node ? node.tempC : r.cellC, 1), unit: '°C' };
    }
    case 'channel':
      return {
        symbol: 'T cairan',
        value: `${formatId(r.inletC, 1)} → ${formatId(r.outletC, 1)}`,
        unit: '°C',
      };
    case 'insulation':
      return { symbol: 'Rugi belakang', value: formatId(r.qBackLossW, 0), unit: 'W_th' };
  }
}

export const partValueText = (id: PartId, r: SimResult): string => {
  const v = partValue(id, r);
  return `${v.symbol} ${v.value} ${v.unit}`;
};
