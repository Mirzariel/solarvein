import { useMemo, type ReactNode } from 'react';
import type { SimResult } from '../sim';
import { ArrowIcon, Disclosure } from '../ui';
import { fmt, fmtSigned } from './format';
import { buildFlowModel, type FlowItem, type FlowKind } from './energyFlowModel';
import { useElementWidth } from './useElementWidth';
import { Wth, We } from './ChartCard';

/** Warna pita menurut makna (DESIGN_SYSTEM.md): listrik = ink, panen = heat, pembuangan = cool, radiasi/rugi = loss (netral). */
const BAND: Record<FlowKind, { fill: string; opacity: number }> = {
  solar: { fill: 'var(--color-loss)', opacity: 0.45 },
  optical: { fill: 'var(--color-loss)', opacity: 0.3 },
  electric: { fill: 'var(--color-ink)', opacity: 0.88 },
  liquid: { fill: 'var(--color-heat-mark)', opacity: 0.9 },
  front: { fill: 'var(--color-loss)', opacity: 0.6 },
  rain: { fill: 'var(--color-loss)', opacity: 0.6 },
  back: { fill: 'var(--color-loss)', opacity: 0.6 },
};
const COOL_BAND = { fill: 'var(--color-cool)', opacity: 0.85 };

const MIN_SLOT = 34;
const GAP = 8;
const TOP = 32;
const BAR_W = 10;
const MIN_PX = 1.5;

interface Placed {
  item: FlowItem;
  /** Posisi bar pada kolom (y atas, tinggi proporsional terhadap daya). */
  y: number;
  h: number;
  /** Pusat label. */
  cy: number;
  /** Posisi segmen pada node panel. */
  nodeY: number;
  band: { fill: string; opacity: number };
}

function bandPath(xa: number, ya: number, ha: number, xb: number, yb: number, hb: number): string {
  const a = Math.max(ha, MIN_PX);
  const b = Math.max(hb, MIN_PX);
  const xm = (xa + xb) / 2;
  return `M${xa} ${ya} C${xm} ${ya} ${xm} ${yb} ${xb} ${yb} L${xb} ${yb + b} C${xm} ${yb + b} ${xm} ${ya + a} ${xa} ${ya + a} Z`;
}

function niceScale(pxPerW: number, maxPx: number): number | null {
  const steps = [500, 200, 100, 50, 20, 10, 5];
  for (const s of steps) if (s * pxPerW <= maxPx) return s;
  return null;
}

function ValueText({ w, tag, x, y, anchor, size }: { w: number; tag: FlowItem['tag']; x: number; y: number; anchor: 'start' | 'end'; size: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} className="num fill-ink">
      {fmt(w, w >= 100 ? 0 : 1)} W
      {tag ? (
        <tspan dy={3} fontSize={size * 0.72} className="fill-ink-2">
          {tag}
        </tspan>
      ) : null}
    </text>
  );
}

/**
 * Diagram aliran energi bergaya Sankey (SVG khusus). Lebar pita ∝ daya dalam W pada SATU skala.
 * Kiri: sumber (radiasi surya + panas dari cairan bila pembuangan). Kanan: tujuan (listrik, cairan bila panen, rugi).
 * Pita cairan berpindah dari sisi keluar ke sisi masuk ketika qLiquid < 0.
 */
export function EnergyFlow({ result }: { result: SimResult }) {
  const [wrapRef, measured] = useElementWidth<HTMLDivElement>();
  const model = useMemo(() => buildFlowModel(result), [result]);
  const W = Math.min(1200, Math.max(280, measured || 320));
  const narrow = W < 520;
  const fs = narrow ? 12 : 13;
  const labelL = narrow ? 92 : 168;
  const labelR = narrow ? 104 : 176;

  const layout = useMemo(() => {
    const scaleTotal = Math.max(model.totalInW, 1);
    const plotH = narrow ? 210 : 250;
    const scale = plotH / scaleTotal; // px per W

    const x0 = labelL; // bar kiri
    const x1 = W - labelR - BAR_W; // bar kanan
    const nodeX = (x0 + BAR_W + x1) / 2 - BAR_W / 2;

    const solarH = model.solar.w * scale;
    const opticalH = model.optical.w * scale;
    const absorbedH = Math.max(0, solarH - opticalH);
    const nodeTop = TOP + opticalH;

    // kiri
    const solarSlot = Math.max(solarH, MIN_SLOT);
    let nodeInCursor = nodeTop + absorbedH;
    let cursorL = TOP + solarSlot + GAP;
    const extras: Placed[] = model.extraSources.map((item) => {
      const h = item.w * scale;
      const slot = Math.max(h, MIN_SLOT);
      const p: Placed = {
        item,
        y: cursorL + (slot - h) / 2,
        h,
        cy: cursorL + slot / 2,
        nodeY: nodeInCursor,
        band: item.kind === 'liquid' ? COOL_BAND : BAND[item.kind],
      };
      cursorL += slot + GAP;
      nodeInCursor += h;
      return p;
    });

    // kanan
    const opticalSlot = Math.max(opticalH, MIN_SLOT);
    let cursorR = TOP + opticalSlot + GAP;
    let nodeOutCursor = nodeTop;
    const sinks: Placed[] = model.sinks.map((item) => {
      const h = item.w * scale;
      const slot = Math.max(h, MIN_SLOT);
      const p: Placed = {
        item,
        y: cursorR + (slot - h) / 2,
        h,
        cy: cursorR + slot / 2,
        nodeY: nodeOutCursor,
        band: BAND[item.kind],
      };
      cursorR += slot + GAP;
      nodeOutCursor += h;
      return p;
    });

    const nodeH = Math.max(absorbedH + model.extraSources.reduce((s, e) => s + e.w, 0) * scale, MIN_PX);
    const bottom = Math.max(cursorL, cursorR, nodeTop + nodeH) + 6;
    const scaleBar = niceScale(scale, Math.min(70, labelL - 16));
    return { scale, x0, x1, nodeX, solarH, opticalH, absorbedH, solarSlot, opticalSlot, nodeTop, nodeH, extras, sinks, bottom, scaleBar };
  }, [model, W, narrow, labelL, labelR]);

  const q = result.qLiquidW;
  const liquidState: { text: ReactNode; tone: string } =
    q > 0.5
      ? {
          tone: 'text-heat-ink',
          text: (
            <>
              <strong>Panen panas</strong>: {fmtSigned(q, 0)} <Wth /> ke cairan.
            </>
          ),
        }
      : q < -0.5
        ? {
            tone: 'text-cool-ink',
            text: (
              <>
                <strong>Pembuangan panas</strong>: {fmtSigned(q, 0)} <Wth /> dari cairan, lewat panel ke lingkungan.
              </>
            ),
          }
        : {
            tone: 'text-ink-2',
            text: <>Pertukaran panas dengan cairan nyaris 0 <Wth /> (pompa mati atau tanpa beda suhu bermakna).</>,
          };

  const residual = Math.abs(model.residualW) < 0.05 ? 0 : model.residualW;
  const summary =
    `Diagram aliran energi. Masuk: radiasi surya ${fmt(model.solar.w, 0)} W` +
    model.extraSources.map((e) => `, ${e.long.toLowerCase()} ${fmt(e.w, 0)} W`).join('') +
    `. Keluar: rugi optik ${fmt(model.optical.w, 0)} W, listrik PV ${fmt(result.electricalW, 0)} W listrik` +
    model.sinks
      .filter((s) => s.kind !== 'electric')
      .map((s) => `, ${s.long.toLowerCase()} ${fmt(s.w, 0)} W termal`)
      .join('') +
    `. Residu neraca energi ${fmt(residual, 1)} W.`;

  const empty = model.totalInW < 0.5;
  const H = layout.bottom + (layout.scaleBar ? 22 : 0);
  const lx = layout.x0 - 8;
  const rx = layout.x1 + BAR_W + 8;

  return (
    <div>
      <div ref={wrapRef} className="w-full">
        {measured === 0 ? (
          <div style={{ height: 300 }} aria-hidden="true" />
        ) : empty ? (
          <p className="border-t border-line pt-4 text-body text-ink-2">
            Tidak ada aliran energi bermakna (irradiansi ≈ 0 dan tidak ada pertukaran panas). Naikkan irradiansi atau nyalakan pompa dengan sumber panas.
          </p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={summary} className="block h-auto w-full" focusable="false">
            <title>Diagram aliran energi panel</title>
            {/* judul kolom */}
            <g className="fill-ink-3" fontSize={12} fontFamily="var(--font-mono)">
              <text x={layout.x0 + BAR_W} y={12} textAnchor="end">
                Masuk
              </text>
              <text x={layout.nodeX + BAR_W / 2} y={12} textAnchor="middle">
                Panel
              </text>
              <text x={layout.x1} y={12} textAnchor="start">
                Keluar
              </text>
            </g>

            {/* pita */}
            <g>
              {/* rugi optik: cabang dari radiasi surya, melewati di atas panel */}
              <path
                d={bandPath(layout.x0 + BAR_W, TOP, layout.opticalH, layout.x1, TOP, layout.opticalH)}
                fill={BAND.optical.fill}
                opacity={BAND.optical.opacity}
              />
              {/* radiasi terserap → panel */}
              <path
                d={bandPath(layout.x0 + BAR_W, TOP + layout.opticalH, layout.absorbedH, layout.nodeX, layout.nodeTop, layout.absorbedH)}
                fill={BAND.solar.fill}
                opacity={BAND.solar.opacity}
              />
              {layout.extras.map((p) => (
                <path key={p.item.id} d={bandPath(layout.x0 + BAR_W, p.y, p.h, layout.nodeX, p.nodeY, p.h)} fill={p.band.fill} opacity={p.band.opacity} />
              ))}
              {layout.sinks.map((p) => (
                <path key={p.item.id} d={bandPath(layout.nodeX + BAR_W, p.nodeY, p.h, layout.x1, p.y, p.h)} fill={p.band.fill} opacity={p.band.opacity} />
              ))}
            </g>

            {/* node panel */}
            <rect x={layout.nodeX} y={layout.nodeTop} width={BAR_W} height={Math.max(layout.nodeH, MIN_PX)} rx={2} fill="var(--color-ink-2)" />

            {/* bar kiri */}
            <rect x={layout.x0} y={TOP} width={BAR_W} height={layout.opticalH} fill="var(--color-loss)" />
            <rect x={layout.x0} y={TOP + layout.opticalH} width={BAR_W} height={layout.absorbedH} fill="var(--color-ink-3)" />
            {layout.extras.map((p) => (
              <rect key={p.item.id} x={layout.x0} y={p.y} width={BAR_W} height={Math.max(p.h, MIN_PX)} rx={1.5} fill={p.band.fill} />
            ))}
            {/* bar kanan */}
            <rect x={layout.x1} y={TOP} width={BAR_W} height={Math.max(layout.opticalH, MIN_PX)} rx={1.5} fill="var(--color-loss)" />
            {layout.sinks.map((p) => (
              <rect key={p.item.id} x={layout.x1} y={p.y} width={BAR_W} height={Math.max(p.h, MIN_PX)} rx={1.5} fill={p.band.fill} />
            ))}

            {/* label kiri */}
            <g fontSize={fs}>
              <text x={lx} y={TOP + layout.solarSlot / 2 - 4} textAnchor="end" className="fill-ink-2">
                {narrow ? model.solar.short : model.solar.long}
              </text>
              <ValueText w={model.solar.w} tag="th" x={lx} y={TOP + layout.solarSlot / 2 + 11} anchor="end" size={fs} />
              {layout.extras.map((p) => (
                <g key={p.item.id}>
                  <text x={lx} y={p.cy - 4} textAnchor="end" className={p.item.kind === 'liquid' ? 'fill-cool-ink' : 'fill-ink-2'}>
                    {narrow ? p.item.short : p.item.long}
                  </text>
                  <ValueText w={p.item.w} tag={p.item.tag} x={lx} y={p.cy + 11} anchor="end" size={fs} />
                </g>
              ))}
            </g>
            {/* label kanan */}
            <g fontSize={fs}>
              <text x={rx} y={TOP + layout.opticalSlot / 2 - 4} className="fill-ink-2">
                {narrow ? model.optical.short : model.optical.long}
              </text>
              <ValueText w={model.optical.w} tag="th" x={rx} y={TOP + layout.opticalSlot / 2 + 11} anchor="start" size={fs} />
              {layout.sinks.map((p) => (
                <g key={p.item.id}>
                  <text
                    x={rx}
                    y={p.cy - 4}
                    className={p.item.kind === 'liquid' ? 'fill-heat-ink' : p.item.kind === 'electric' ? 'fill-ink' : 'fill-ink-2'}
                  >
                    {narrow ? p.item.short : p.item.long}
                  </text>
                  <ValueText w={p.item.w} tag={p.item.tag} x={rx} y={p.cy + 11} anchor="start" size={fs} />
                </g>
              ))}
            </g>

            {/* skala pita */}
            {layout.scaleBar ? (
              <g transform={`translate(${layout.x0 + BAR_W} ${layout.bottom + 8})`}>
                <rect x={0} y={0} width={layout.scaleBar * layout.scale} height={4} rx={1} fill="var(--color-ink-2)" />
                <text x={layout.scaleBar * layout.scale + 8} y={6} fontSize={12} className="num fill-ink-3">
                  skala {fmt(layout.scaleBar)} W
                </text>
              </g>
            ) : null}
          </svg>
        )}
      </div>

      <p className={`mt-4 flex items-start gap-2 text-body ${liquidState.tone}`}>
        <span className="mt-0.5 shrink-0" aria-hidden="true">
          <ArrowIcon size={16} direction={q > 0.5 ? 'down' : q < -0.5 ? 'up' : 'right'} />
        </span>
        <span>{liquidState.text}</span>
      </p>

      <p className="num mt-3 text-mono-s text-ink-2">
        Σ masuk {fmt(model.totalInW, 1)} W · Σ keluar {fmt(model.totalOutW, 1)} W · <span className="text-ink">residu {fmt(residual, 1)} W</span>
      </p>

      <div className="mt-4">
        <Disclosure title="Lihat sebagai tabel" level={4}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[22rem] border-collapse text-left text-body">
              <caption className="sr-only">Rincian aliran energi pada panel</caption>
              <thead>
                <tr className="h-10 border-b border-line-strong text-label text-ink-2">
                  <th scope="col" className="pr-3 font-medium">
                    Aliran
                  </th>
                  <th scope="col" className="pr-3 font-medium">
                    Arah
                  </th>
                  <th scope="col" className="text-right font-medium">
                    Daya (W)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[model.solar, ...model.extraSources, model.optical, ...model.sinks].map((it) => (
                  <tr key={it.id + (model.extraSources.includes(it) ? '-src' : '')} className="h-10 border-b border-line">
                    <th scope="row" className="pr-3 font-normal text-ink">
                      {it.long} <span className="text-ink-3">{it.tag === 'e' ? <We /> : <Wth />}</span>
                    </th>
                    <td className="pr-3 text-ink-2">{it.note}</td>
                    <td className="num text-right text-mono-s text-ink">{fmt(it.w, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Disclosure>
      </div>
    </div>
  );
}
