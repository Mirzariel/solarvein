import { useMemo } from 'react';
import { DESICCANT_ASSUMPTIONS, DESICCANT_NOT_BENEFICIAL, DESICCANT_STATUS, LABELS, MODE_TARGETS } from '../sim/system';
import { DesiccantChart, VerdictKey } from '../charts/desiccant/DesiccantChart';
import { COP_RATIOS, ratioKey, useDesiccantGrid } from '../charts/desiccant/useDesiccantGrid';
import { EvidenceDot, formatId } from '../ui';
import { Frame, SIZE, type Ratio } from './Frame';
import { summarize } from './refs';


/** Regeneration temperature of the side readouts (same mid-range value the sim's heatUses() uses). */
const REF_REGEN_C = 60;
/** The section's default after-cooler/coil COP ratio. */
const RATIO = 1.5;
/** The real chart is 340 px high; it is shown enlarged so its 12 px labels read on a poster. */
const ZOOM = 1.45;

export function DesiccantFigure({ id, ratio }: { id: string; ratio: Ratio }) {
  const { grid } = useDesiccantGrid();
  const wide = ratio === '16x9';
  const bodyW = SIZE[ratio].w - 128;
  const exhaust = grid.exhaust[ratioKey(RATIO)] ?? [];
  const ambient = grid.ambient[ratioKey(RATIO)] ?? [];
  const series = useMemo(() => ({ ambient, exhaust }), [ambient, exhaust]);
  // Same y domain rule as the section: fixed across the COP-ratio control.
  const domain = useMemo(() => {
    const all: number[] = [0];
    for (const air of ['ambient', 'exhaust'] as const)
      for (const r of COP_RATIOS) for (const e of grid[air][ratioKey(r)] ?? []) if (e.operating) all.push(e.hvac.netSavingWe / 1000);
    return { yMin: Math.floor(Math.min(...all) - 0.2), yMax: Math.ceil(Math.max(...all) + 0.2) };
  }, [grid]);
  const ev = useMemo(
    () => summarize(DESICCANT_ASSUMPTIONS, { tags: ['hipotesis', 'simulasi'], refIds: [...new Set([...exhaust, ...ambient].flatMap((e) => e.refIds))] }),
    [exhaust, ambient],
  );
  const ref = exhaust.find((e) => e.regenC === REF_REGEN_C) ?? exhaust[Math.floor(exhaust.length / 2)];
  const viable = exhaust.filter((e) => e.verdict === 'layak');
  const anyBenefit = [...exhaust, ...ambient].some((e) => e.verdict !== 'tidak-layak');
  const at = MODE_TARGETS.A;
  const chartCss = wide ? bodyW - 400 : bodyW;

  return (
    <Frame
      id={id}
      ratio={ratio}
      title="Desikan: penghematan listrik bersih menurut suhu regenerasi"
      subtitle={
        <>
          <span className="inline-flex items-center gap-2">
            <EvidenceDot tag="hipotesis" size={12} />
            {DESICCANT_STATUS}.
          </span>{' '}
          Listrik koil pendingin acuan dikurangi after-cooler, kipas, pompa, dan penalti PV. Kondisi: {LABELS.scenario[at.scenario].toLowerCase()} pukul {String(at.hour).padStart(2, '0')}.00; batas atas; rasio COP after-cooler/koil {formatId(RATIO, 1)}.
        </>
      }
      {...ev}
    >
      <div className={wide ? 'flex gap-10' : 'flex flex-col gap-8'}>
        <div className="flex-none" style={{ width: chartCss }}>
          <div style={{ zoom: ZOOM }}>
            <DesiccantChart width={chartCss / ZOOM} series={series} yMin={domain.yMin} yMax={domain.yMax} selectedC={-1} selectedAir="exhaust" onSelect={() => {}} />
          </div>
          <div className="mt-5">
            <VerdictKey />
          </div>
        </div>
        <div className={wide ? 'flex w-[360px] flex-none flex-col gap-5' : 'grid grid-cols-2 gap-x-8 gap-y-5'}>
          <div className="border-t border-line-strong pt-3">
            <p className="m-0 text-ink" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 500 }}>
              {anyBenefit
                ? viable.length
                  ? `Layak mulai ${formatId(viable[0]!.regenC, 0)} °C dengan udara buang.`
                  : 'Marginal pada sebagian suhu; belum layak.'
                : DESICCANT_NOT_BENEFICIAL}
            </p>
          </div>
          {ref ? (
            <>
              <div className="border-t border-line-strong pt-3">
                <p className="m-0 flex items-center gap-2 text-ink-2" style={{ fontSize: 17 }}>
                  Titik impas rasio COP
                  <EvidenceDot tag="simulasi" size={10} />
                </p>
                <p className="num m-0 text-ink" style={{ fontSize: 34, lineHeight: '42px' }}>
                  {ref.breakEvenCopRatio === null ? 'tak ada' : `${formatId(ref.breakEvenCopRatio, 2)}×`}
                </p>
                <p className="m-0 text-ink-3" style={{ fontSize: 14 }}>
                  After-cooler dibanding koil, udara buang {formatId(ref.regenC, 0)} °C
                </p>
              </div>
              <div className="border-t border-line-strong pt-3">
                <p className="m-0 flex items-center gap-2 text-ink-2" style={{ fontSize: 17 }}>
                  Listrik per kg air terambil
                  <EvidenceDot tag="simulasi" size={10} />
                </p>
                <p className="num m-0 text-ink" style={{ fontSize: 28, lineHeight: '36px' }}>
                  {formatId(ref.perKgWater.desiccantKWhE, 2)} <span style={{ fontSize: 16 }} className="text-ink-2">desikan</span>
                </p>
                <p className="num m-0 text-ink" style={{ fontSize: 28, lineHeight: '36px' }}>
                  {formatId(ref.perKgWater.coilRefKWhE, 2)} <span style={{ fontSize: 16 }} className="text-ink-2">koil acuan</span>
                </p>
                <p className="num m-0 text-ink-3" style={{ fontSize: 14 }}>
                  kWh<sub>e</sub> per kg
                </p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </Frame>
  );
}
