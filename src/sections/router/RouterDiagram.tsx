/**
 * RouterDiagram: the flat, instrument-style system diagram of "03 — Cara kerja" (desktop / wide layout).
 *
 * Three separable layers (Termal / Listrik / Udara), 1 px outlines, mono readouts, no isometric art.
 *  - Branch width ∝ router valve fraction; the four slabs tile the trunk, so the total is constant while the
 *    pump runs (conservation is visible) and everything vanishes to a neutral hairline when it stops.
 *  - The tank is an outline with a fill level = state of charge.
 *  - Dashed = not yet validated (desiccant regeneration, heat-pump source). Grey = unused heat (bypass).
 *  - `tone="paper"` is the export variant: literal colours, a paper background and a source footer.
 * Every number comes from the props (the cached day); nothing is computed here beyond layout.
 */
import { useId, useRef, type ReactNode } from 'react';
import { DESICCANT_STATUS, LABELS } from '../../sim/system';
import { formatId } from '../../ui';
import {
  AFTERCOOLER, BED, COIL, COLLECTOR, HEATPUMP, HX_DHW, HX_REGEN, OUT_BAND, PATHS, ROUTER, ROW, TANK, TRUNK_Y, VB, W_TOT, E_Y,
  branchPath, head, outputStrips, slabs,
} from './layout';
import { PALETTES, type DiagramTone, type Palette } from './palette';
import { budget, usePackets, type PacketStream } from './usePackets';
import { SINK_ORDER, valueSum, type RouterView } from './useRouterView';
import { diagramDescription } from './captions';

export type LayerId = 'termal' | 'listrik' | 'udara';
export const LAYER_LABEL: Record<LayerId, string> = { termal: 'Termal', listrik: 'Listrik', udara: 'Udara' };

export interface RouterDiagramProps {
  /** Geometry state (glides toward `target`). */
  view: RouterView;
  /** Settled state for readouts. */
  target: RouterView;
  layers: Record<LayerId, boolean>;
  tone?: DiagramTone;
  /** Largest PV output of the day [W_e], the reference for the electrical line weight. */
  electricalRefW: number;
  /** Packets may run (section in view and motion allowed). */
  moving: boolean;
  /** Export footer / title line (paper variant). */
  exportNote?: string;
  className?: string;
}

const kw = (w: number): string => formatId(w / 1000, 1);

function Tx({
  x, y, children, anchor = 'start', mono, size = 12, fill, weight, halo, opacity, P,
}: {
  x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; size?: number;
  fill: string; weight?: number; halo?: boolean; opacity?: number; P: Palette;
}) {
  return (
    <text
      x={x} y={y} textAnchor={anchor} fontFamily={mono ? P.mono : P.sans} fontSize={size} fontWeight={weight} fill={fill} opacity={opacity}
      style={halo ? { paintOrder: 'stroke', stroke: P.paper, strokeWidth: 3.5, strokeLinejoin: 'round' } : undefined}
    >
      {children}
    </text>
  );
}

export default function RouterDiagram({ view, target, layers, tone = 'page', electricalRefW, moving, exportNote, className }: RouterDiagramProps) {
  const P = PALETTES[tone];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const pool = useRef<SVGGElement>(null);
  const n = view.n;
  const t = target.n;
  const isPaper = tone === 'paper';
  const H = isPaper ? VB.h + 30 : VB.h;

  // ── geometry state ──
  const sumV = valueSum(n);
  const trunkW = sumV * W_TOT;
  const sl = slabs({ bypass: n.vBypass, dhw: n.vDhw, tank: n.vTank, desiccant: n.vDesiccant });
  const strips = outputStrips(n.directW, n.dischargeW, n.backupW, n.demandW);
  const dischargeW = n.demandW > 1 ? Math.min(1, n.dischargeW / n.demandW) * W_TOT : 0;
  const desOn = n.desOn;
  const hpAbsW = (n.hpSourceW / 25000) * W_TOT;
  const elecW = electricalRefW > 0 ? Math.min(1, n.electricalW / electricalRefW) : 0;
  const tankFillH = Math.max(0, Math.min(1, n.soc)) * TANK.h;
  const modeC = target.mode === 'C';
  const hpOpacity = target.hpEnabled && n.hpOn > 0.5 ? 1 : modeC ? 0.7 : 0.22;

  const Lyr = ({ id, children }: { id: LayerId; children: ReactNode }) => (
    <g
      data-layer={id}
      aria-hidden={!layers[id]}
      style={{ opacity: layers[id] ? 1 : 0, transition: 'opacity 320ms var(--ease-ui, ease)', pointerEvents: 'none' }}
    >
      {children}
    </g>
  );

  const band = (w: number, color: string, extra?: { dash?: string; opacity?: number }) => ({
    stroke: color,
    strokeWidth: Math.max(0, w),
    fill: 'none',
    strokeDasharray: extra?.dash,
    opacity: extra?.opacity ?? 1,
  });

  // ── packet streams (only where the model computes a flow) ──
  const paperDot = P.paper;
  const heatDot = (w: number) => (w >= 5 ? paperDot : P.heatInk);
  const streams: PacketStream[] = [];
  if (layers.termal) {
    if (sumV > 0.05) streams.push({ id: 'trunk', count: Math.round(8 * sumV), speed: 70, fill: heatDot(trunkW), r: 2.2, opacity: 0.9 });
    for (const k of SINK_ORDER) {
      const v = k === 'dhw' ? n.vDhw : k === 'tank' ? n.vTank : k === 'desiccant' ? n.vDesiccant : n.vBypass;
      if (v < 0.02) continue;
      const w = v * W_TOT;
      streams.push({
        id: `b-${k}`, count: Math.max(2, Math.round(26 * v)), speed: 70,
        fill: k === 'bypass' ? P.ink2 : heatDot(w), r: w >= 5 ? 2.2 : 1.8, opacity: k === 'bypass' ? 0.6 : 0.9,
      });
    }
    if (dischargeW > 1.2) streams.push({ id: 'discharge', count: Math.max(2, Math.round(9 * (dischargeW / W_TOT))), speed: 60, fill: heatDot(dischargeW), r: 2, opacity: 0.8 });
    if (target.hpEnabled && n.hpOn > 0.5) {
      streams.push({ id: 'hpIn', count: 5, speed: 50, fill: P.heatInk, r: 1.8, opacity: 0.8 });
      streams.push({ id: 'hpOut', count: 3, speed: 50, fill: P.heatInk, r: 1.8, opacity: 0.8 });
    }
  }
  if (layers.listrik && elecW > 0.01) streams.push({ id: 'elec', count: Math.max(2, Math.round(10 * elecW)), speed: 140, fill: P.ink, r: 2, opacity: 0.85 });
  if (layers.udara) {
    streams.push({ id: 'supply', count: 4, speed: 60, fill: P.coolInk, r: 1.8, opacity: 0.85 });
    streams.push({ id: 'coilRow', count: Math.round(4 * (1 - desOn)), speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
    if (desOn > 0.5) {
      streams.push({ id: 'feed', count: 3, speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
      streams.push({ id: 'regenIn', count: 3, speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
      streams.push({ id: 'exhaust', count: 3, speed: 60, fill: P.ink2, r: 1.8, opacity: 0.7 });
    }
  }
  const finalStreams = budget(streams);
  usePackets(svg, pool, finalStreams, moving && !isPaper);

  const shares = { bypass: n.vBypass, dhw: n.vDhw, tank: n.vTank, desiccant: n.vDesiccant };
  const desc = diagramDescription({ mode: target.mode, pumpOn: target.pumpOn, shares, soc: t.soc });
  const regenLabel = target.regenAir === 'exhaust' ? 'regenerasi · udara buang hotel' : 'regenerasi · udara luar';
  const hpTxt = target.hpEnabled && n.hpOn > 0.5;
  const showQ = sumV > 0.05;

  return (
    <div data-export="router-diagram" data-tone={tone} className={className} style={{ lineHeight: 0 }}>
      <svg
        ref={svg}
        viewBox={`0 0 ${VB.w} ${H}`}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={`${uid}t ${uid}d`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', maxHeight: '100%' }}
      >
        <title id={`${uid}t`}>Diagram aliran: kolektor PV/T, router, tangki, air panas, udara dan listrik</title>
        <desc id={`${uid}d`}>{desc}</desc>
        <defs>
          <clipPath id={`${uid}tank`}>
            <rect x={TANK.x + 1} y={TANK.y + 1} width={TANK.w - 2} height={TANK.h - 2} rx={5} />
          </clipPath>
        </defs>
        {isPaper ? <rect width={VB.w} height={H} fill={P.paper} /> : null}

        {/* ───────────── Termal ───────────── */}
        <Lyr id="termal">
          {/* heat-pump source option (dashed = not validated): ghost unless enabled; most visible in mode C */}
          <g opacity={hpOpacity} style={{ transition: 'opacity 400ms var(--ease-ui, ease)' }}>
            <path d={PATHS.hpIn} fill="none" stroke={P.paper} strokeWidth={5} />
            <path data-flow="hpIn" d={PATHS.hpIn} fill="none" stroke={hpTxt ? P.heat : P.ink3} strokeWidth={hpTxt ? Math.max(1.5, hpAbsW) : 1} strokeDasharray="6 4" />
            <path data-flow="hpOut" d={PATHS.hpOut} fill="none" stroke={hpTxt ? P.heat : P.ink3} strokeWidth={hpTxt ? Math.max(1.5, hpAbsW * 0.7) : 1} strokeDasharray="6 4" />
            <rect x={HEATPUMP.x} y={HEATPUMP.y} width={HEATPUMP.w} height={HEATPUMP.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
            <Tx x={HEATPUMP.x + HEATPUMP.w / 2} y={HEATPUMP.y + 25} anchor="middle" fill={P.ink2} P={P}>Pompa kalor</Tx>
            {hpTxt ? (
              <>
                <Tx x={660} y={366} mono fill={P.ink} P={P}>COP {formatId(t.hpCop, 1)}</Tx>
                <Tx x={660} y={383} mono fill={P.ink2} P={P}>sumber {kw(t.hpSourceW)} kW<tspan dy={3} fontSize={9}>th</tspan></Tx>
              </>
            ) : (
              <Tx x={660} y={370} fill={P.ink3} P={P}>opsi riset · belum divalidasi</Tx>
            )}
          </g>

          {/* collector */}
          <rect x={COLLECTOR.x} y={COLLECTOR.y} width={COLLECTOR.w} height={COLLECTOR.h} fill="none" stroke={P.ink} strokeWidth={1} />
          <path
            d={`M${COLLECTOR.x},${COLLECTOR.y + 40} H${COLLECTOR.x + COLLECTOR.w} M${COLLECTOR.x},${COLLECTOR.y + 80} H${COLLECTOR.x + COLLECTOR.w} M${COLLECTOR.x},${COLLECTOR.y + 120} H${COLLECTOR.x + COLLECTOR.w} ${[1, 2, 3, 4, 5].map((i) => `M${COLLECTOR.x + (COLLECTOR.w / 6) * i},${COLLECTOR.y} V${COLLECTOR.y + COLLECTOR.h}`).join(' ')}`}
            stroke={P.lineStrong} strokeWidth={1} fill="none"
          />
          <Tx x={COLLECTOR.x} y={COLLECTOR.y - 10} size={13} fill={P.ink} P={P}>Kolektor PV/T</Tx>
          <Tx x={COLLECTOR.x + 8} y={COLLECTOR.y + 24} mono fill={P.ink} halo P={P}>G {formatId(t.irradiance, 0)} W/m²</Tx>

          {/* trunk: neutral hairline when the pump is off, amber band when on */}
          <path d={PATHS.trunk} fill="none" stroke={P.ink3} strokeWidth={1} opacity={1 - sumV} />
          <path data-flow="trunk" d={PATHS.trunk} {...band(trunkW, P.heat)} opacity={trunkW > 0.3 ? 1 : 0} />
          {trunkW > 3 ? <path d={head(ROUTER.x - ROUTER.r, TRUNK_Y, 'r', trunkW)} fill={P.heat} opacity={Math.min(1, sumV)} /> : null}
          <Tx x={158} y={228} fill={P.ink2} P={P} opacity={showQ ? 1 : 0.5}>keluar</Tx>
          <Tx x={158} y={282} mono fill={P.ink} halo P={P}>{formatId(t.outletC, 1)} °C</Tx>
          {showQ ? <Tx x={158} y={298} mono fill={P.ink2} halo P={P}>{kw(t.qLiquidW)} kW<tspan dy={3} fontSize={9}>th</tspan></Tx> : null}
          <Tx x={208} y={244} anchor="middle" mono fill={P.ink3} P={P} opacity={1 - sumV}>pompa mati</Tx>

          {/* branches: slabs tile the trunk; dashed = not validated; grey = unused */}
          <path data-flow="b-bypass" d={branchPath('bypass', sl.bypass.yc)} {...band(sl.bypass.w, P.loss)} opacity={sl.bypass.w > 0.25 ? 1 : 0} />
          <path data-flow="b-dhw" d={branchPath('dhw', sl.dhw.yc)} {...band(sl.dhw.w, P.heat)} opacity={sl.dhw.w > 0.25 ? 1 : 0} />
          <path data-flow="b-tank" d={branchPath('tank', sl.tank.yc)} {...band(sl.tank.w, P.heat)} opacity={sl.tank.w > 0.25 ? 1 : 0} />
          <path data-flow="b-desiccant" d={branchPath('desiccant', sl.desiccant.yc)} {...band(sl.desiccant.w, P.heat, { dash: '9 5' })} opacity={sl.desiccant.w > 0.25 ? 1 : 0} />
          {sl.dhw.w > 2 ? <path d={head(HX_DHW.x - 1, 105, 'r', sl.dhw.w)} fill={P.heat} /> : null}
          {sl.tank.w > 2 ? <path d={head(TANK.x - 1, TRUNK_Y, 'r', sl.tank.w)} fill={P.heat} /> : null}
          {sl.desiccant.w > 2 ? <path d={head(352, HX_REGEN.y - 1, 'd', sl.desiccant.w)} fill={P.heat} /> : null}
          {sl.bypass.w > 0.25 ? <path d="M474,36 V52" stroke={P.ink3} strokeWidth={1} /> : null}

          {/* router valve */}
          <circle cx={ROUTER.x} cy={ROUTER.y} r={ROUTER.r} fill={P.paper} stroke={P.ink} strokeWidth={1} />
          <Tx x={ROUTER.x} y={ROUTER.y + 5} anchor="middle" mono size={15} weight={500} fill={sumV > 0.05 ? P.ink : P.ink3} P={P}>{view.mode}</Tx>
          <Tx x={262} y={216} anchor="end" fill={P.ink} P={P}>Router</Tx>

          {/* bypass label */}
          <Tx x={484} y={48} fill={P.ink3} P={P}>tidak dipakai</Tx>
          <Tx x={484} y={63} mono fill={P.ink2} P={P} opacity={t.vBypass > 0.01 ? 1 : 0.0}>{kw(t.qLiquidW * t.vBypass)} kW<tspan dy={3} fontSize={9}>th</tspan></Tx>

          {/* tank */}
          <g clipPath={`url(#${uid}tank)`}>
            <rect x={TANK.x} y={TANK.y + TANK.h - tankFillH} width={TANK.w} height={tankFillH} fill={P.heat} opacity={0.5} />
          </g>
          {tankFillH > 1 ? <path d={`M${TANK.x + 1},${TANK.y + TANK.h - tankFillH} H${TANK.x + TANK.w - 1}`} stroke={P.heatMark} strokeWidth={1} /> : null}
          <rect x={TANK.x} y={TANK.y} width={TANK.w} height={TANK.h} rx={6} fill="none" stroke={P.ink} strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <path key={f} d={`M${TANK.x + TANK.w},${TANK.y + TANK.h * (1 - f)} h${f % 0.5 === 0 ? 7 : 4}`} stroke={P.tick} strokeWidth={1} />
          ))}
          <Tx x={TANK.x + TANK.w + 12} y={TANK.y + 14} fill={P.ink2} P={P}>Tangki</Tx>
          <Tx x={TANK.x + TANK.w + 12} y={TANK.y + 31} mono fill={P.ink} P={P}>SoC {formatId(t.soc * 100, 0)} %</Tx>
          <Tx x={TANK.x + TANK.w + 12} y={TANK.y + 48} mono fill={P.ink2} P={P}>atas {formatId(t.topC, 1)} °C</Tx>

          {/* discharge: tank → hot-water exchanger (dim amber = stored heat) */}
          <path data-flow="discharge" d={PATHS.discharge} fill="none" stroke={P.heat} strokeWidth={Math.max(0, dischargeW)} opacity={dischargeW > 0.3 ? 0.55 : 0} />
          {dischargeW > 2 ? <path d={head(HX_DHW.x - 1, 150, 'r', dischargeW)} fill={P.heat} opacity={0.55} /> : null}

          {/* preheat exchanger (potable side = hairline) and output band */}
          <path d={`M630,52 V${HX_DHW.y}`} stroke={P.ink3} strokeWidth={1} />
          <path d={head(630, HX_DHW.y - 1, 'd', 0)} fill={P.ink3} />
          <Tx x={630} y={44} anchor="middle" fill={P.ink3} P={P}>air bersih</Tx>
          <rect x={HX_DHW.x} y={HX_DHW.y} width={HX_DHW.w} height={HX_DHW.h} fill="none" stroke={P.ink} strokeWidth={1} />
          <path d={`M${HX_DHW.x},${HX_DHW.y + 22} L${HX_DHW.x + HX_DHW.w},${HX_DHW.y + 68} M${HX_DHW.x},${HX_DHW.y + 68} L${HX_DHW.x + HX_DHW.w},${HX_DHW.y + 22}`} stroke={P.lineStrong} strokeWidth={1} />
          <Tx x={HX_DHW.x + HX_DHW.w / 2} y={HX_DHW.y + HX_DHW.h + 16} anchor="middle" fill={P.ink2} P={P}>HX prapemanasan</Tx>
          {(() => {
            let y = OUT_BAND.yc - W_TOT / 2;
            const w = OUT_BAND.x1 - OUT_BAND.x0;
            const rect = (h: number, fill: string, op: number) => {
              const el = h > 0.2 ? <rect key={fill + y} x={OUT_BAND.x0} y={y} width={w} height={h} fill={fill} opacity={op} /> : null;
              y += h;
              return el;
            };
            return (
              <g>
                {rect(strips.direct, P.heat, 1)}
                {rect(strips.tank, P.heat, 0.55)}
                {rect(strips.backup, P.ink2, 1)}
              </g>
            );
          })()}
          <path d={`M874,${OUT_BAND.yc - 24} V${OUT_BAND.yc + 24}`} stroke={P.ink} strokeWidth={1} />
          <Tx x={700} y={105} fill={P.ink2} P={P}>air keluar HX <tspan fontFamily={P.mono} fill={P.ink}>{formatId(t.potableOutC, 1)} °C</tspan></Tx>
          <Tx x={886} y={98} size={13} fill={P.ink} P={P}>Air panas hotel</Tx>
          {(
            [
              ['langsung', t.directW, P.heat, 1],
              ['dari tangki', t.dischargeW, P.heat, 0.55],
              ['pemanas hotel', t.backupW, P.ink2, 1],
            ] as const
          ).map(([label, w, fill, op], i) => (
            <g key={label}>
              <rect x={886} y={112 + i * 18} width={8} height={8} fill={fill} opacity={op} />
              <Tx x={900} y={120 + i * 18} fill={P.ink2} P={P}>
                {label} <tspan fontFamily={P.mono} fill={P.ink}>{kw(w)} kW<tspan dy={3} fontSize={9}>th</tspan></tspan>
              </Tx>
            </g>
          ))}

          {/* regeneration exchanger (dashed = not validated) */}
          <rect x={HX_REGEN.x} y={HX_REGEN.y} width={HX_REGEN.w} height={HX_REGEN.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
          <Tx x={HX_REGEN.x - 6} y={HX_REGEN.y + 8} anchor="end" fill={P.ink2} halo P={P}>HX regenerasi</Tx>
        </Lyr>

        {/* ───────────── Listrik ───────────── */}
        <Lyr id="listrik">
          <path d={PATHS.elec} fill="none" stroke={P.lineStrong} strokeWidth={1} />
          <path data-flow="elec" d={PATHS.elec} fill="none" stroke={P.ink} strokeWidth={Math.max(0, 1 + 5 * elecW)} opacity={elecW > 0.01 ? 1 : 0} strokeLinejoin="round" />
          <path d={head(868, E_Y, 'r', 2 + 5 * elecW)} fill={P.ink} opacity={elecW > 0.01 ? 1 : 0} />
          <path d="M64,545 l-5,9 h4 l-2,8 l7,-10 h-4 z" fill={P.ink} />
          <Tx x={76} y={558} fill={P.ink2} P={P}>
            Listrik PV <tspan fontFamily={P.mono} fill={P.ink}>{kw(t.electricalW)} kW<tspan dy={3} fontSize={9}>e</tspan></tspan>
          </Tx>
          <path d={`M874,${E_Y - 8} V${E_Y + 8}`} stroke={P.ink} strokeWidth={1} />
          <Tx x={886} y={E_Y + 4} size={13} fill={P.ink} P={P}>Beban hotel</Tx>
        </Lyr>

        {/* ───────────── Udara ───────────── */}
        <Lyr id="udara">
          <Tx x={185} y={ROW.proc - 4} anchor="end" fill={P.ink2} P={P}>Udara luar</Tx>
          <Tx x={185} y={ROW.proc + 13} anchor="end" mono fill={P.ink} P={P}>{formatId(t.ambientC, 1)} °C · RH {formatId(t.rh * 100, 0)} %</Tx>
          <Tx x={185} y={ROW.regen + 4} anchor="end" fill={P.ink3} P={P}>{regenLabel}</Tx>

          {/* desiccant route: dashed (hypothesis), brighter only while it removes moisture */}
          <g opacity={0.3 + 0.7 * desOn} style={{ transition: 'opacity 300ms var(--ease-ui, ease)' }}>
            <path data-flow="regenIn" d={PATHS.regenIn} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={PATHS.regenMid} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path data-flow="exhaust" d={PATHS.exhaust} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={head(720, ROW.regen, 'r', 1)} fill={P.ink2} />
            <path data-flow="feed" d={PATHS.feed} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={PATHS.procOut} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <rect x={BED.x} y={BED.y} width={BED.w} height={BED.h} fill="none" stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
            <path d={`M${BED.x},${BED.split} H${BED.x + BED.w}`} stroke={P.ink3} strokeWidth={1} strokeDasharray="2 3" />
            <Tx x={BED.x + BED.w / 2} y={BED.y - 7} anchor="middle" fill={P.ink2} P={P}>Bed desikan</Tx>
            <Tx x={BED.x + BED.w / 2} y={BED.y + 31} anchor="middle" fill={P.ink3} P={P}>regenerasi</Tx>
            <Tx x={BED.x + BED.w / 2} y={BED.split + 22} anchor="middle" fill={P.ink3} P={P}>proses</Tx>
            {desOn > 0.5 ? (
              <Tx x={BED.x + BED.w / 2} y={BED.split + 39} anchor="middle" mono fill={P.ink} P={P}>{formatId(t.moistureKgH, 1)} kg/jam</Tx>
            ) : null}
            <rect x={AFTERCOOLER.x} y={AFTERCOOLER.y} width={AFTERCOOLER.w} height={AFTERCOOLER.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
            <Tx x={AFTERCOOLER.x + AFTERCOOLER.w / 2} y={AFTERCOOLER.y - 7} anchor="middle" fill={P.ink2} P={P}>after-cooler</Tx>
            <Tx x={728} y={ROW.regen + 4} fill={P.ink2} P={P}>buangan regenerasi</Tx>
          </g>

          {/* ordinary coil: solid, takes over when the bed is dry/off */}
          <g opacity={0.35 + 0.65 * (1 - desOn)} style={{ transition: 'opacity 300ms var(--ease-ui, ease)' }}>
            <path data-flow="coilRow" d={PATHS.coilRow} fill="none" stroke={P.ink2} strokeWidth={1.5} />
            <path d={PATHS.coilOut} fill="none" stroke={P.coolInk} strokeWidth={2} />
            <rect x={COIL.x} y={COIL.y} width={COIL.w} height={COIL.h} fill={P.paper} stroke={P.ink} strokeWidth={1} />
            <Tx x={COIL.x - 6} y={COIL.y + 12} anchor="end" fill={P.ink2} halo P={P}>koil AC biasa</Tx>
          </g>

          {/* supply: the only cool-coloured line (dehumidified air) */}
          <path data-flow="supply" d={PATHS.supply} fill="none" stroke={P.cool} strokeWidth={2.5} />
          <path d={head(868, ROW.proc, 'r', 2.5)} fill={P.cool} />
          <path d={`M874,${ROW.proc - 16} V${ROW.proc + 16}`} stroke={P.ink} strokeWidth={1} />
          <Tx x={886} y={ROW.proc - 2} size={13} fill={P.ink} P={P}>Udara pasok</Tx>
          <Tx x={886} y={ROW.proc + 15} mono fill={P.ink2} P={P}>titik embun {formatId(target.supplyDewPointC, 0)} °C</Tx>
        </Lyr>

        {/* flow packets */}
        <g ref={pool} aria-hidden="true">
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} r={2} cx={0} cy={0} fill={P.ink} style={{ opacity: 0 }} />
          ))}
        </g>

        {isPaper ? (
          <g>
            <path d={`M8,${VB.h + 6} H${VB.w - 8}`} stroke={P.lineStrong} strokeWidth={1} />
            <Tx x={8} y={VB.h + 22} mono size={11} fill={P.ink2} P={P}>{exportNote ?? 'SolarVein · simulasi, belum ada data ukur'}</Tx>
            <Tx x={VB.w - 8} y={VB.h + 22} anchor="end" mono size={11} fill={P.ink2} P={P}>{LABELS.mode[target.mode]}</Tx>
          </g>
        ) : null}
        {/* the desiccant status is part of the figure, not only of the page legend */}
        {isPaper ? (
          <Tx x={VB.w - 8} y={VB.h - 6} anchor="end" size={11} fill={P.ink3} P={P}>{`Putus-putus: ${DESICCANT_STATUS.toLowerCase()}`}</Tx>
        ) : null}
      </svg>
    </div>
  );
}
