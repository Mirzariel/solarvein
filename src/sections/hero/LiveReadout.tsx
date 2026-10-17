import { useStep } from '../../state/systemSelectors';
import { Readout, formatId, type ReadoutKind, type ReadoutProps } from '../../ui';
import { useEased } from './useEased';

/**
 * Readouts of the Sistem section. They read the v2 DayStep at the store hour (useStep), never the v1 store, and ease
 * between values when the condition changes. Array totals are shown in kW (W_th and W_e are never added).
 */
interface LiveProps extends Omit<ReadoutProps, 'value' | 'text' | 'digits'> {
  /** Value from the current step, already in the displayed unit. */
  select: (s: ReturnType<typeof useStep>) => number;
  digits?: number;
}

export function LiveReadout({ select, digits = 0, ...rest }: LiveProps) {
  const target = select(useStep());
  const v = useEased(target, digits);
  // `text` keeps the number a plain magnitude (no "+"); `value` still drives the sign-based tint.
  return <Readout {...rest} value={v} digits={digits} text={formatId(v, digits)} />;
}

type Pos = Pick<ReadoutProps, 'size' | 'tone' | 'rule'>;

/** Electricity of the array [kW_e]. Value stays ink (electricity is never coloured). */
export function ElectricReadout(p: Pos) {
  return <LiveReadout {...p} label="Listrik" kind="electrical" unit="kW" digits={1} select={(s) => s.collector.electricalW / 1000} />;
}

/** Heat delivered into the liquid [kW_th]. Amber while flowing; 0 with the pump off. */
export function HeatReadout(p: Pos) {
  return (
    <LiveReadout
      {...p}
      label="Panas"
      kind={'thermal' as ReadoutKind}
      unit="kW"
      digits={1}
      signed
      positiveHint="sel → cairan"
      select={(s) => Math.max(0, s.collector.qLiquidW) / 1000}
    />
  );
}
