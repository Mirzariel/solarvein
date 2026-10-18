import { useStep, useSystem } from '../../state/systemSelectors';
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
  /** Show a dash and "diam" instead of a number (pump stopped: no inlet/outlet flow). */
  idle?: boolean;
}

export function LiveReadout({ select, digits = 0, idle, ...rest }: LiveProps) {
  const step = useStep();
  const target = select(step);
  const v = useEased(target, digits);
  if (step.router.pumpOn === false && idle) return <Readout {...rest} value={0} text="–" sublabel="diam" />;
  // `text` keeps the number a plain magnitude (no "+"); `value` still drives the sign-based tint.
  return <Readout {...rest} value={v} digits={digits} text={formatId(v, digits)} />;
}

type Pos = Pick<ReadoutProps, 'size' | 'tone' | 'rule'>;

/** Whole-array area [m²] from the system inputs (modules × module area). */
function useArrayArea(): number {
  const sys = useSystem();
  return Math.round(sys.array.modules * sys.array.module.areaM2);
}

/** Electricity of the array [kW_e]. Value stays ink (electricity is never coloured). */
export function ElectricReadout(p: Pos) {
  const area = useArrayArea();
  return <LiveReadout {...p} label={`Listrik · susunan ${area} m²`} kind="electrical" unit="kW" digits={1} select={(s) => s.collector.electricalW / 1000} />;
}

/** Heat delivered into the liquid [kW_th]. Amber while flowing; 0 with the pump off. */
export function HeatReadout(p: Pos) {
  const area = useArrayArea();
  return (
    <LiveReadout
      {...p}
      label={`Panas · susunan ${area} m²`}
      kind={'thermal' as ReadoutKind}
      unit="kW"
      digits={1}
      signed
      positiveHint="sel → cairan"
      select={(s) => Math.max(0, s.collector.qLiquidW) / 1000}
    />
  );
}
