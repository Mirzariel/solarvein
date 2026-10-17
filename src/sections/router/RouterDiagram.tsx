/**
 * RouterDiagram: the flat, instrument-style system diagram of "03 — Cara kerja".
 *
 * Three separable layers (Termal / Listrik / Udara), 1 px outlines, mono readouts, no isometric art.
 *  - Branch width ∝ router valve fraction; the four slabs tile the trunk, so the total is constant while the
 *    pump runs (conservation is visible) and everything vanishes to a neutral hairline when it stops.
 *  - The tank is an outline with a fill level = state of charge.
 *  - Dashed = not yet validated (desiccant regeneration, heat-pump source). Grey = unused heat (dry cooler).
 *  - `tone="paper"` is the export variant: literal colours, a paper background and a source footer.
 *
 * Rendering split: React renders this SKELETON once (and again only when a layer toggle or the tone changes);
 * every live value is written straight into the DOM by `paint.ts` from the engine frame (`useFrameListener`),
 * so scrubbing never re-renders React.
 */
import { useEffect, useId, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrameListener, weather } from '../../motion';
import { DESICCANT_STATUS } from '../../sim/system';
import { AFTER, BED, COIL, COL_X, COLLECTOR, DRY, E_Y, HEATPUMP, HX_DHW, HX_REGEN, OUT, PATHS, ROUTER, ROW, TANK, VB, W_TOT } from './layout';
import { Glider, createPainter, stateFromFrame, type Painter, type PaintState } from './paint';
import { PALETTES, type DiagramTone, type Palette } from './palette';

export type LayerId = 'termal' | 'listrik' | 'udara';
export const LAYER_LABEL: Record<LayerId, string> = { termal: 'Termal', listrik: 'Listrik', udara: 'Udara' };

export interface RouterDiagramProps {
  layers: Record<LayerId, boolean>;
  tone?: DiagramTone;
  /** Largest PV output of the reference day [W_e], the scale of the electrical line weight. */
  electricalRefW: number;
  /** Packets may run (section in view and motion allowed). */
  moving: boolean;
  /** Export footer line (paper variant). */
  exportNote?: string;
  /** Static mode (exports): paint this state once and ignore the engine frame. */
  staticState?: PaintState;
  className?: string;
}

function Tx({
  x, y, children, anchor = 'start', mono, size = 13.5, fill, weight, halo, opacity, id, P,
}: {
  x: number; y: number; children?: ReactNode; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; size?: number;
  fill: string; weight?: number; halo?: boolean; opacity?: number; id?: string; P: Palette;
}) {
  return (
    <text
      data-p={id}
      x={x} y={y} textAnchor={anchor} fontFamily={mono ? P.mono : P.sans} fontSize={size} fontWeight={weight} fill={fill} opacity={opacity}
      style={halo ? { paintOrder: 'stroke', stroke: P.paper, strokeWidth: 3.5, strokeLinejoin: 'round' } : undefined}
    >
      {children}
    </text>
  );
}

/** A live number: a tspan the painter fills. */
const V = ({ id, P, fill }: { id: string; P: Palette; fill?: string }) => <tspan data-p={id} fontFamily={P.mono} fill={fill ?? P.ink} />;
/** Unit with a subscript tag, e.g. kW<sub>th</sub>. */
const Unit = ({ u, sub, P }: { u: string; sub: string; P: Palette }) => (
  <tspan fontFamily={P.mono}>
    {' '}
    {u}
    <tspan dy={3} fontSize={10.5}>{sub}</tspan>
    <tspan dy={-3} fontSize={0}>{'​'}</tspan>
  </tspan>
);

/** Layer group; defined at module level so a toggle never remounts the painted children. */
function Lyr({ id, on, children }: { id: LayerId; on: boolean; children: ReactNode }) {
  return (
    <g
      data-layer={id}
      aria-hidden={!on}
      style={{ opacity: on ? 1 : 0, transition: 'opacity 320ms var(--ease-ui, ease)', pointerEvents: 'none' }}
    >
      {children}
    </g>
  );
}

export default function RouterDiagram({ layers, tone = 'page', electricalRefW, moving, exportNote, staticState, className }: RouterDiagramProps) {
  const P = PALETTES[tone];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const svg = useRef<SVGSVGElement>(null);
  const painter = useRef<Painter | null>(null);
  const glider = useRef(new Glider());
  const isPaper = tone === 'paper';
  const H = isPaper ? VB.h + 30 : VB.h;

  // (re)create the painter whenever the skeleton's palette/scale changes
  useLayoutEffect(() => {
    if (!svg.current) return;
    painter.current = createPainter(svg.current, P, { electricalRefW });
    painter.current.setLayers(layers);
    const s0 = staticState ?? stateFromFrame(weather.frame(), glider.current);
    if (s0) painter.current.paint(s0);
    return () => {
      painter.current?.destroy();
      painter.current = null;
    };
    // layers are pushed separately below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tone, electricalRefW, staticState]);

  useEffect(() => {
    painter.current?.setLayers(layers);
  }, [layers]);
  useEffect(() => {
    painter.current?.setMoving(moving && !isPaper);
    return () => painter.current?.setMoving(false);
  }, [moving, isPaper, tone, electricalRefW]);

  // one engine frame → direct DOM writes (no React render)
  useFrameListener((f) => {
    const p = painter.current;
    if (!p || staticState) return;
    const s = stateFromFrame(f, glider.current);
    if (s) p.paint(s);
  }, 0);

  const bandAttrs = (color: string, dash?: string) => ({ stroke: color, strokeWidth: 0, fill: 'none', strokeDasharray: dash, opacity: 0 });
  const colTx = (id: string, y: number, label: string, swatch: string, op: number) => (
    <g key={id}>
      <rect x={COL_X} y={y - 9} width={8} height={8} fill={swatch} opacity={op} />
      <Tx x={COL_X + 14} y={y} fill={P.ink2} P={P}>
        {label} <V id={id} P={P} />
        <Unit u="kW" sub="th" P={P} />
      </Tx>
    </g>
  );

  return (
    <div data-export="router-diagram" data-presentasi-focus data-tone={tone} className={className} style={{ lineHeight: 0 }}>
      <svg
        ref={svg}
        viewBox={`0 0 ${VB.w} ${H}`}
        width="100%"
        preserveAspectRatio="xMinYMid meet"
        role="img"
        aria-labelledby={`${uid}t ${uid}d`}
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: 'block', maxHeight: '100%', overflow: 'visible' }}
      >
        <title id={`${uid}t`}>Diagram aliran: panel PV/T, router, tangki, air panas, udara dan listrik</title>
        <desc id={`${uid}d`} data-p="desc">Diagram aliran sistem.</desc>
        <defs>
          <clipPath id={`${uid}tank`}>
            <rect x={TANK.x + 1} y={TANK.y + 1} width={TANK.w - 2} height={TANK.h - 2} rx={5} />
          </clipPath>
        </defs>
        {isPaper ? <rect width={VB.w} height={H} fill={P.paper} /> : null}

        {/* ───────────── Termal ───────────── */}
        <Lyr id="termal" on={layers.termal}>
          {/* heat-pump source option (dashed = not validated): a ghost unless enabled */}
          <g data-p="hpG" opacity={0.22} style={{ transition: 'opacity 400ms var(--ease-ui, ease)' }}>
            <path d={PATHS.hpIn} fill="none" stroke={P.paper} strokeWidth={5} />
            <path data-flow="hpIn" data-p="hpIn" d={PATHS.hpIn} fill="none" stroke={P.ink3} strokeWidth={1} strokeDasharray="6 4" />
            <path data-flow="hpOut" data-p="hpOut" d={PATHS.hpOut} fill="none" stroke={P.ink3} strokeWidth={1} strokeDasharray="6 4" />
            <rect x={HEATPUMP.x} y={HEATPUMP.y} width={HEATPUMP.w} height={HEATPUMP.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
            <Tx x={HEATPUMP.x + HEATPUMP.w / 2} y={HEATPUMP.y + 25} anchor="middle" fill={P.ink2} P={P}>Pompa kalor</Tx>
            <g data-p="hpGhost">
              <Tx x={HEATPUMP.x + HEATPUMP.w + 12} y={HEATPUMP.y + 24} fill={P.ink3} P={P}>opsi riset · belum divalidasi</Tx>
            </g>
            <g data-p="hpLive" opacity={0}>
              <Tx x={HEATPUMP.x + HEATPUMP.w + 12} y={HEATPUMP.y + 16} mono fill={P.ink} P={P}>COP <V id="hpCop" P={P} /></Tx>
              <Tx x={HEATPUMP.x + HEATPUMP.w + 12} y={HEATPUMP.y + 33} mono fill={P.ink2} P={P}>sumber <V id="hpSrc" P={P} fill={P.ink2} /><Unit u="kW" sub="th" P={P} /></Tx>
            </g>
          </g>

          {/* panel PV/T */}
          <rect x={COLLECTOR.x} y={COLLECTOR.y} width={COLLECTOR.w} height={COLLECTOR.h} fill="none" stroke={P.ink} strokeWidth={1} />
          <path
            d={`M${COLLECTOR.x},${COLLECTOR.y + 37} H${COLLECTOR.x + COLLECTOR.w} M${COLLECTOR.x},${COLLECTOR.y + 75} H${COLLECTOR.x + COLLECTOR.w} M${COLLECTOR.x},${COLLECTOR.y + 112} H${COLLECTOR.x + COLLECTOR.w} ${[1, 2, 3, 4, 5].map((i) => `M${COLLECTOR.x + (COLLECTOR.w / 6) * i},${COLLECTOR.y} V${COLLECTOR.y + COLLECTOR.h}`).join(' ')}`}
            stroke={P.lineStrong} strokeWidth={1} fill="none"
          />
          <Tx x={COLLECTOR.x} y={COLLECTOR.y - 10} size={14.5} fill={P.ink} P={P}>Panel PV/T</Tx>
          <Tx x={COLLECTOR.x + 8} y={COLLECTOR.y + 24} mono fill={P.ink} halo P={P}>G <V id="G" P={P} /> W/m²</Tx>

          {/* trunk: neutral hairline when the pump is off, amber band when on */}
          <path data-p="trunkHair" d={PATHS.trunk} fill="none" stroke={P.ink3} strokeWidth={1} />
          <path data-flow="trunk" data-p="trunk" d={PATHS.trunk} {...bandAttrs(P.heat)} />
          <path data-p="trunkHead" fill={P.heat} opacity={0} />
          <Tx id="keluar" x={160} y={205} fill={P.ink2} P={P}>keluar</Tx>
          <g data-p="outletG">
            <Tx x={160} y={257} mono fill={P.ink} halo P={P}><V id="outletV" P={P} /> °C</Tx>
          </g>
          <g data-p="qG">
            <Tx x={160} y={273} mono fill={P.ink2} halo P={P}><V id="qV" P={P} fill={P.ink2} /><Unit u="kW" sub="th" P={P} /></Tx>
          </g>
          <Tx id="pumpOff" x={225} y={219} anchor="middle" mono fill={P.ink3} P={P}>pompa diam</Tx>

          {/* branches: slabs tile the trunk; dashed = not validated; grey = dry cooler */}
          <path data-p="p-bypass" {...bandAttrs(P.loss)} />
          <path data-p="p-dhw" {...bandAttrs(P.heat)} />
          <path data-p="p-tank" {...bandAttrs(P.heat)} />
          <path data-p="p-desiccant" {...bandAttrs(P.heat, '9 5')} />
          <path data-p="hDhw" fill={P.heat} opacity={0} />
          <path data-p="hTank" fill={P.heat} opacity={0} />
          <path data-p="hDes" fill={P.heat} opacity={0} />
          <path data-p="hByp" fill={P.loss} opacity={0} />

          {/* router valve */}
          <circle cx={ROUTER.x} cy={ROUTER.y} r={ROUTER.r} fill={P.paper} stroke={P.ink} strokeWidth={1} />
          <Tx id="mode" x={ROUTER.x} y={ROUTER.y + 5} anchor="middle" mono size={15} weight={500} fill={P.ink} P={P}>A</Tx>
          <Tx x={294} y={199} anchor="end" fill={P.ink} P={P}>Router</Tx>

          {/* pembuang panas (dry cooler): where unused heat goes, so the cells stay cooler */}
          <rect x={DRY.x} y={DRY.y} width={DRY.w} height={DRY.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} />
          <Tx x={DRY.x + 12} y={DRY.y + 20} fill={P.ink2} P={P}>pembuang panas</Tx>
          <Tx x={DRY.x + 12} y={DRY.y + 36} fill={P.ink3} P={P}>(dry cooler)</Tx>
          <g data-p="bypG" opacity={0}>
            <Tx x={DRY.x + DRY.w + 10} y={DRY.y + 28} mono fill={P.ink2} P={P}><V id="bypV" P={P} fill={P.ink2} /><Unit u="kW" sub="th" P={P} /></Tx>
          </g>

          {/* tank: outline + fill level = isi tangki */}
          <g clipPath={`url(#${uid}tank)`}>
            <rect data-p="tankFill" x={TANK.x} y={TANK.y + TANK.h} width={TANK.w} height={0} fill={P.heat} opacity={0.5} />
          </g>
          <path data-p="tankLevel" stroke={P.heatMark} strokeWidth={1} opacity={0} />
          <rect x={TANK.x} y={TANK.y} width={TANK.w} height={TANK.h} rx={6} fill="none" stroke={P.ink} strokeWidth={1} />
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <path key={f} d={`M${TANK.x + TANK.w},${TANK.y + TANK.h * (1 - f)} h${f % 0.5 === 0 ? 7 : 4}`} stroke={P.tick} strokeWidth={1} />
          ))}
          <Tx x={TANK.x + TANK.w + 14} y={TANK.y + 14} fill={P.ink2} P={P}>Tangki</Tx>
          <Tx x={TANK.x + TANK.w + 14} y={TANK.y + 31} mono fill={P.ink} P={P}>terisi <V id="socV" P={P} /> %</Tx>
          <Tx x={TANK.x + TANK.w + 14} y={TANK.y + 48} mono fill={P.ink2} P={P}>atas <V id="topV" P={P} fill={P.ink2} /> °C</Tx>

          {/* discharge: tank → exchanger (dim amber = stored heat) */}
          <path data-flow="discharge" data-p="discharge" d={PATHS.discharge} fill="none" stroke={P.heat} strokeWidth={0} opacity={0} />
          <path data-p="hDis" fill={P.heat} opacity={0} />

          {/* preheat exchanger (potable side = hairline) and output band */}
          <path d={PATHS.mains} stroke={P.ink3} strokeWidth={1} />
          <Tx x={842} y={26} anchor="middle" fill={P.ink3} P={P}>air bersih</Tx>
          <rect x={HX_DHW.x} y={HX_DHW.y} width={HX_DHW.w} height={HX_DHW.h} fill="none" stroke={P.ink} strokeWidth={1} />
          <path d={`M${HX_DHW.x},${HX_DHW.y + 22} L${HX_DHW.x + HX_DHW.w},${HX_DHW.y + 64} M${HX_DHW.x},${HX_DHW.y + 64} L${HX_DHW.x + HX_DHW.w},${HX_DHW.y + 22}`} stroke={P.lineStrong} strokeWidth={1} />
          <Tx x={HX_DHW.x + HX_DHW.w / 2} y={HX_DHW.y + HX_DHW.h + 17} anchor="middle" fill={P.ink2} P={P}>penukar kalor prapemanasan</Tx>
          <g>
            <rect data-p="sDirect" x={OUT.x0} y={OUT.yc - W_TOT / 2} width={OUT.x1 - OUT.x0} height={0} fill={P.heat} />
            <rect data-p="sTank" x={OUT.x0} y={OUT.yc} width={OUT.x1 - OUT.x0} height={0} fill={P.heat} opacity={0.55} />
            <rect data-p="sBackup" x={OUT.x0} y={OUT.yc} width={OUT.x1 - OUT.x0} height={0} fill={P.ink2} />
          </g>
          <path d={`M${OUT.x1 + 6},${OUT.yc - 24} V${OUT.yc + 24}`} stroke={P.ink} strokeWidth={1} />
          <Tx x={OUT.x0 + 10} y={OUT.yc - 22} fill={P.ink2} P={P}>air keluar <V id="potV" P={P} /> °C</Tx>
          <Tx x={COL_X} y={OUT.yc - 30} size={14.5} fill={P.ink} P={P}>Air panas hotel</Tx>
          {colTx('dirV', OUT.yc - 8, 'langsung', P.heat, 1)}
          {colTx('disV', OUT.yc + 10, 'dari tangki', P.heat, 0.55)}
          {colTx('bakV', OUT.yc + 28, 'pemanas cadangan', P.ink2, 1)}

          {/* regeneration exchanger (dashed = not validated) */}
          <rect x={HX_REGEN.x} y={HX_REGEN.y} width={HX_REGEN.w} height={HX_REGEN.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
          <Tx x={HX_REGEN.x - 6} y={HX_REGEN.y - 4} anchor="end" fill={P.ink2} halo P={P}>penukar kalor regenerasi</Tx>
        </Lyr>

        {/* ───────────── Listrik ───────────── */}
        <Lyr id="listrik" on={layers.listrik}>
          <path d={PATHS.elec} fill="none" stroke={P.lineStrong} strokeWidth={1} />
          <path data-flow="elec" data-p="elec" d={PATHS.elec} fill="none" stroke={P.ink} strokeWidth={1} opacity={0} strokeLinejoin="round" />
          <path data-p="elecHead" fill={P.ink} opacity={0} />
          <path d={`M64,${E_Y - 23} l-5,9 h4 l-2,8 l7,-10 h-4 z`} fill={P.ink} />
          <Tx x={76} y={E_Y - 8} fill={P.ink2} P={P}>
            Listrik PV <V id="elecV" P={P} />
            <Unit u="kW" sub="e" P={P} />
          </Tx>
          <path d={`M${OUT.x1 + 6},${E_Y - 8} V${E_Y + 8}`} stroke={P.ink} strokeWidth={1} />
          <Tx x={COL_X} y={E_Y + 4} size={14.5} fill={P.ink} P={P}>Beban hotel</Tx>
        </Lyr>

        {/* ───────────── Udara ───────────── */}
        <Lyr id="udara" on={layers.udara}>
          <Tx x={290} y={ROW.proc - 4} anchor="end" fill={P.ink2} P={P}>Udara luar</Tx>
          <Tx x={290} y={ROW.proc + 13} anchor="end" mono fill={P.ink} P={P}><V id="ambV" P={P} /> °C · RH <V id="rhV" P={P} /> %</Tx>
          <Tx id="regenLbl" x={290} y={ROW.regen + 4} anchor="end" fill={P.ink3} P={P}>regenerasi · udara luar</Tx>

          {/* desiccant route: dashed (hypothesis), brighter only while it removes moisture */}
          <g data-p="desG" opacity={0.3} style={{ transition: 'opacity 300ms var(--ease-ui, ease)' }}>
            <path data-flow="regenIn" d={PATHS.regenIn} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={PATHS.regenMid} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path data-flow="exhaust" d={PATHS.exhaust} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={`M841,${ROW.regen - 4} L848,${ROW.regen} L841,${ROW.regen + 4} Z`} fill={P.ink2} />
            <path data-flow="feed" d={PATHS.feed} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <path d={PATHS.procOut} fill="none" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <rect x={BED.x} y={BED.y} width={BED.w} height={BED.h} fill="none" stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
            <path d={`M${BED.x},${BED.split} H${BED.x + BED.w}`} stroke={P.ink3} strokeWidth={1} strokeDasharray="2 3" />
            <Tx x={BED.x + BED.w / 2} y={BED.y - 8} anchor="middle" fill={P.ink2} P={P}>Unggun desikan (bahan penyerap uap air)</Tx>
            <Tx x={BED.x + BED.w / 2} y={BED.y + 34} anchor="middle" fill={P.ink3} P={P}>regenerasi</Tx>
            <Tx x={BED.x + BED.w / 2} y={BED.split + 20} anchor="middle" fill={P.ink3} P={P}>proses</Tx>
            <g data-p="moistG" opacity={0}>
              <Tx x={BED.x + BED.w / 2} y={BED.split + 37} anchor="middle" mono fill={P.ink} P={P}><V id="moistV" P={P} /> kg/jam</Tx>
            </g>
            <rect x={AFTER.x} y={AFTER.y} width={AFTER.w} height={AFTER.h} fill={P.paper} stroke={P.ink2} strokeWidth={1} strokeDasharray="4 3" />
            <Tx x={AFTER.x + AFTER.w / 2} y={AFTER.y - 7} anchor="middle" fill={P.ink2} P={P}>pendingin lanjutan (after-cooler)</Tx>
            <Tx x={858} y={ROW.regen + 4} fill={P.ink2} P={P}>buangan regenerasi</Tx>
            <Tx x={858} y={ROW.regen + 21} fill={P.ink3} P={P}>{DESICCANT_STATUS.toLowerCase()}</Tx>
          </g>

          {/* ordinary coil: solid, takes over when the bed is off or dry */}
          <g data-p="coilG" opacity={1} style={{ transition: 'opacity 300ms var(--ease-ui, ease)' }}>
            <path data-flow="coilRow" d={PATHS.coilRow} fill="none" stroke={P.ink2} strokeWidth={1.5} />
            <path data-p="coilOut" d={PATHS.coilOut} fill="none" stroke={P.ink2} strokeWidth={2} />
            <rect x={COIL.x} y={COIL.y} width={COIL.w} height={COIL.h} fill={P.paper} stroke={P.ink} strokeWidth={1} />
            <Tx x={COIL.x - 8} y={COIL.y + 20} anchor="end" fill={P.ink2} halo P={P}>koil AC biasa</Tx>
          </g>

          {/* supply air: dehumidified; `cool` only in mode B, otherwise ink-2 */}
          <path data-flow="supply" data-p="supply" d={PATHS.supply} fill="none" stroke={P.ink2} strokeWidth={2.5} />
          <path data-p="supplyHead" d={`M${OUT.x1 - 1},${ROW.proc - 6} L${OUT.x1 + 8},${ROW.proc} L${OUT.x1 - 1},${ROW.proc + 6} Z`} fill={P.ink2} />
          <path d={`M${OUT.x1 + 6},${ROW.proc - 16} V${ROW.proc + 16}`} stroke={P.ink} strokeWidth={1} />
          <Tx x={COL_X} y={ROW.proc - 2} size={14.5} fill={P.ink} P={P}>Udara pasok</Tx>
          <Tx x={COL_X} y={ROW.proc + 15} mono fill={P.ink2} P={P}>titik embun <V id="dewV" P={P} fill={P.ink2} /> °C</Tx>
        </Lyr>

        {/* flow packets */}
        <g data-p="pool" aria-hidden="true">
          {Array.from({ length: 60 }, (_, i) => (
            <circle key={i} r={2} cx={0} cy={0} fill={P.ink} style={{ opacity: 0 }} />
          ))}
        </g>

        {isPaper ? (
          <g>
            <path d={`M8,${VB.h + 6} H${VB.w - 8}`} stroke={P.lineStrong} strokeWidth={1} />
            <Tx x={8} y={VB.h + 22} mono size={12} fill={P.ink2} P={P}>{exportNote ?? 'SolarVein · simulasi, belum ada data ukur'}</Tx>
            <Tx x={VB.w - 8} y={VB.h + 22} anchor="end" mono size={12} fill={P.ink2} P={P}>Putus-putus: hipotesis riset, belum divalidasi</Tx>
          </g>
        ) : null}
      </svg>
    </div>
  );
}
