import { useMemo } from 'react';
import RouterDiagram, { type LayerId } from '../sections/router/RouterDiagram';
import { targetFromStep } from '../sections/router/useRouterView';
import { LABELS, MODE_TARGETS, ROUTER_ASSUMPTIONS, stepAt, type ModeTarget } from '../sim/system';
import { useDay, useSystem } from '../state/systemSelectors';
import { formatId } from '../ui';
import { Frame, type Ratio } from './Frame';
import { summarize } from './refs';

const ALL_LAYERS: Record<LayerId, boolean> = { termal: true, listrik: true, udara: true };
const hhmm = (h: number) => `${String(Math.floor(h) % 24).padStart(2, '0')}.${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;

/** The site's own paper-tone router diagram at one A/B/C condition, static (view = target, no packets). */
function Diagram({ target, width }: { target: ModeTarget; width: number }) {
  const { scenario, hour } = MODE_TARGETS[target];
  const day = useDay(scenario);
  const clear = useDay('terik');
  const sys = useSystem();
  const view = useMemo(() => targetFromStep(stepAt(day, hour), sys), [day, hour, sys]);
  const electricalRefW = useMemo(() => Math.max(1, ...clear.steps.map((s) => s.collector.electricalW)), [clear]);
  const note = `${LABELS.modeTarget[target]} · ${hhmm(hour)} · ${formatId(stepAt(day, hour).climate.irradiance, 0)} W/m²`;
  return (
    <div style={{ width }} className="mx-auto">
      <RouterDiagram view={view} target={view} layers={ALL_LAYERS} tone="paper" electricalRefW={electricalRefW} moving={false} exportNote={note} />
    </div>
  );
}

const HEAD = {
  A: 'Router pada kondisi A: terik siang',
  B: 'Router pada kondisi B: lembap dan mendung',
  C: 'Router pada kondisi C: malam',
} as const;

/** 16:9: one condition per frame (`router-diagram` = A, `-b`, `-c`). 4:5: A and B stacked. */
export function RouterFigure({ id, ratio, target = 'A' }: { id: string; ratio: Ratio; target?: ModeTarget }) {
  const ev = summarize(ROUTER_ASSUMPTIONS, { tags: ['simulasi', 'hipotesis'] });
  const sub = 'Tebal cabang sebanding dengan bagian panas; putus-putus belum divalidasi; abu-abu tidak dipakai. Mode dihitung dari kondisi, bukan dari jam.';
  if (ratio === '4x5') {
    return (
      <Frame id={id} ratio={ratio} title="Router: ke mana panas kolektor pergi" subtitle={sub} {...ev}>
        <div className="flex flex-col" style={{ gap: 20 }}>
          <Diagram target="A" width={1000} />
          <Diagram target="B" width={1000} />
        </div>
      </Frame>
    );
  }
  return (
    <Frame id={id} ratio={ratio} title={HEAD[target]} subtitle={sub} {...ev}>
      <Diagram target={target} width={1040} />
    </Frame>
  );
}
