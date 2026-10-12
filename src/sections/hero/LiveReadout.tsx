import { useVisualSelect, type VisualFrame } from '../../motion';
import type { SimResult } from '../../sim';
import { Readout, formatId, type ReadoutKind, type ReadoutProps } from '../../ui';

/**
 * Readouts that follow the weather engine's VISUAL frame (not the committed target): the numbers tick through the
 * same computed states the 3D scene shows. Each one selects a rounded value, so React renders only when the
 * displayed text changes, at most 15 times a second, and only these small components re-render.
 */
interface LiveProps extends Omit<ReadoutProps, 'value' | 'text' | 'digits'> {
  select: (r: SimResult) => number;
  digits?: number;
}

export function LiveReadout({ select, digits = 0, ...rest }: LiveProps) {
  const v = useVisualSelect((f) => Number(select(f.result).toFixed(digits)));
  return <Readout {...rest} value={v} digits={digits} />;
}

interface HeatPick {
  q: number;
  hintPos: string;
  hintNeg: string;
}

/** The hint follows the computed regime AND the valuation: a flow that is not credited never says "panen". */
function pickHeat(f: VisualFrame): HeatPick {
  const r = f.result;
  return {
    q: Math.round(r.qLiquidW),
    hintPos: r.regime === 'harvest' ? 'Panen panas' : r.inputs.heatLoadAvailable ? 'Belum sepadan' : 'Tanpa beban panas',
    hintNeg: r.regime === 'reject' ? 'Pembuangan panas' : 'Panas keluar, tak dihitung',
  };
}

/**
 * Signed heat flow into the liquid. The label and the glyph follow the SIGN of the live value: "Panas ke cairan"
 * with a down arrow while harvesting, "Panas dibuang" with an up arrow while rejecting. The number shows the
 * magnitude; the glyph and tone carry the sign (W_th is never added to W_e).
 */
export function LiveHeatReadout({ tone = 'stage', size = 'lg', rule = false }: { tone?: 'page' | 'stage'; size?: ReadoutProps['size']; rule?: boolean }) {
  const { q, hintPos, hintNeg } = useVisualSelect(pickHeat, 15, (a, b) => a.q === b.q && a.hintPos === b.hintPos && a.hintNeg === b.hintNeg);
  return (
    <Readout
      label={q < 0 ? 'Panas dibuang' : 'Panas ke cairan'}
      value={q}
      text={formatId(Math.abs(q), 0)}
      unit="W"
      kind={'thermal' as ReadoutKind}
      signed
      positiveHint={hintPos}
      negativeHint={hintNeg}
      size={size}
      tone={tone}
      rule={rule}
    />
  );
}
