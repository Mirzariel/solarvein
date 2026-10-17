/**
 * RouterMobile: the same router state as RouterDiagram, drawn for a 360 px column instead of shrunk.
 * Vertical flow (collector → router → four destinations → hot water), the electrical and air layers as
 * their own compact strips below. No packets: direction is carried by arrowheads, widths by valves.
 */
import { useId, type ReactNode } from 'react';
import { formatId } from '../../ui';
import { diagramDescription } from './captions';
import { head } from './layout';
import { PALETTES, type DiagramTone } from './palette';
import type { LayerId } from './RouterDiagram';
import { SINK_ORDER, valueSum, type RouterView } from './useRouterView';

const W = 24;
const kw = (w: number): string => formatId(w / 1000, 1);

interface Props {
  view: RouterView;
  target: RouterView;
  layers: Record<LayerId, boolean>;
  electricalRefW: number;
  tone?: DiagramTone;
}

/** Slab centres along x at the router (stack centred on x = 180). */
function slabsX(v: Record<string, number>) {
  const total = SINK_ORDER.reduce((s, k) => s + (v[k] as number), 0) * W;
  let x = 180 - total / 2;
  const out: Record<string, { xc: number; w: number }> = {};
  for (const k of SINK_ORDER) {
    const w = (v[k] as number) * W;
    out[k] = { xc: x + w / 2, w };
    x += w;
  }
  return out;
}

export default function RouterMobile({ view, target, layers, electricalRefW, tone = 'page' }: Props) {
  const P = PALETTES[tone];
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const n = view.n;
  const t = target.n;
  const sumV = valueSum(n);
  const trunkW = sumV * W;
  const sl = slabsX({ bypass: n.vBypass, dhw: n.vDhw, tank: n.vTank, desiccant: n.vDesiccant });
  const f1 = (x: number) => Math.round(x * 10) / 10;

  // destination x (column centres) and y of the destination row
  const X = { bypass: 32, dhw: 120, tank: 214, desiccant: 306 };
  const Y0 = 150;
  const Y1 = 296;
  const path = (k: 'bypass' | 'dhw' | 'tank' | 'desiccant') => {
    const x0 = f1(sl[k]!.xc);
    return `M${x0},${Y0} C${x0},${Y0 + 56} ${X[k]},${Y0 + 56} ${X[k]},${Y0 + 112} V${Y1}`;
  };
  const tankH = 100;
  const tankFill = Math.max(0, Math.min(1, n.soc)) * tankH;
  const dis = n.demandW > 1 ? Math.min(1, n.dischargeW / n.demandW) * W : 0;
  const dir = n.demandW > 1 ? Math.min(1, n.directW / n.demandW) * W : 0;
  const bak = n.demandW > 1 ? Math.max(0, W - dir - Math.min(W - dir, dis)) : 0;
  const tankStrip = Math.min(W - dir, dis);
  const desc = diagramDescription({ mode: target.mode, pumpOn: target.pumpOn, shares: { bypass: n.vBypass, dhw: n.vDhw, tank: n.vTank, desiccant: n.vDesiccant }, soc: t.soc });
  const elecW = electricalRefW > 0 ? Math.min(1, n.electricalW / electricalRefW) : 0;
  const desOn = n.desOn;
  const supplyC = view.mode === "B" ? P.cool : P.ink2;

  const Tx = ({ x, y, children, anchor = 'start', mono, size = 12, fill = P.ink2, halo, opacity }: { x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; mono?: boolean; size?: number; fill?: string; halo?: boolean; opacity?: number }) => (
    <text x={x} y={y} textAnchor={anchor} fontFamily={mono ? P.mono : P.sans} fontSize={size} fill={fill} opacity={opacity} style={halo ? { paintOrder: 'stroke', stroke: P.paper, strokeWidth: 3.5, strokeLinejoin: 'round' } : undefined}>
      {children}
    </text>
  );
  const thTag = <tspan dy={3} fontSize={9}>th</tspan>;

  return (
    <div data-export="router-diagram-mobile" className="flex flex-col gap-6" style={{ lineHeight: 0 }}>
      {layers.termal ? (
        <svg viewBox="0 0 360 535" width="100%" role="img" aria-labelledby={`${uid}t ${uid}d`} style={{ display: 'block' }}>
          <title id={`${uid}t`}>Diagram aliran termal, tampilan vertikal</title>
          <desc id={`${uid}d`}>{desc}</desc>
          <defs>
            <clipPath id={`${uid}tk`}>
              <rect x={175} y={Y1 + 1} width={78} height={tankH - 2} rx={5} />
            </clipPath>
          </defs>
          {/* collector */}
          <rect x={20} y={8} width={320} height={44} fill="none" stroke={P.ink} />
          <path d={[1, 2, 3, 4, 5, 6, 7].map((i) => `M${20 + 40 * i},8 V52`).join(' ') + ' M20,30 H340'} stroke={P.lineStrong} fill="none" />
          <Tx x={28} y={26} fill={P.ink} size={13} halo>Kolektor PV/T</Tx>
          <Tx x={332} y={26} anchor="end" mono fill={P.ink} halo>G {formatId(t.irradiance, 0)} W/m²</Tx>
          <Tx x={28} y={46} mono fill={P.ink} halo>keluar {formatId(t.outletC, 1)} °C</Tx>
          {/* trunk */}
          <path d="M180,52 V128" stroke={P.ink3} strokeWidth={1} opacity={1 - sumV} />
          <path d="M180,52 V128" stroke={P.heat} strokeWidth={Math.max(0, trunkW)} opacity={trunkW > 0.3 ? 1 : 0} fill="none" />
          <Tx x={192} y={82} mono fill={sumV > 0.5 ? P.ink : P.ink3}>{sumV > 0.5 ? <>{kw(t.qLiquidW)} kW{thTag}</> : 'pompa mati'}</Tx>
          {/* branches */}
          <path d={path('bypass')} stroke={P.loss} strokeWidth={sl.bypass!.w} fill="none" opacity={sl.bypass!.w > 0.25 ? 1 : 0} />
          <path d={path('dhw')} stroke={P.heat} strokeWidth={sl.dhw!.w} fill="none" opacity={sl.dhw!.w > 0.25 ? 1 : 0} />
          <path d={path('tank')} stroke={P.heat} strokeWidth={sl.tank!.w} fill="none" opacity={sl.tank!.w > 0.25 ? 1 : 0} />
          <path d={path('desiccant')} stroke={P.heat} strokeWidth={sl.desiccant!.w} strokeDasharray="9 5" fill="none" opacity={sl.desiccant!.w > 0.25 ? 1 : 0} />
          {sl.dhw!.w > 2 ? <path d={head(X.dhw, Y1 - 1, 'd', sl.dhw!.w)} fill={P.heat} /> : null}
          {sl.tank!.w > 2 ? <path d={head(X.tank, Y1 - 1, 'd', sl.tank!.w)} fill={P.heat} /> : null}
          {sl.desiccant!.w > 2 ? <path d={head(X.desiccant, Y1 - 1, 'd', sl.desiccant!.w)} fill={P.heat} /> : null}
          <circle cx={180} cy={Y0 - 22} r={16} fill={P.paper} stroke={P.ink} />
          <Tx x={180} y={Y0 - 17} anchor="middle" mono size={15} fill={sumV > 0.05 ? P.ink : P.ink3}>{view.mode}</Tx>
          <Tx x={204} y={Y0 - 18} fill={P.ink}>Router</Tx>
          {/* destinations */}
          <path d={`M${X.bypass},${Y1 + 2} v14`} stroke={P.ink3} />
          <rect x={X.bypass - 28} y={Y1 + 1} width={56} height={22} fill={P.paper} stroke={P.ink2} /><Tx x={X.bypass} y={Y1 + 42} anchor="middle" fill={P.ink3}>pembuang</Tx><Tx x={X.bypass} y={Y1 + 56} anchor="middle" fill={P.ink3}>panas</Tx><Tx x={X.bypass} y={Y1 + 70} anchor="middle" fill={P.ink3}>(dry cooler)</Tx>
          <Tx x={X.bypass} y={Y1 + 86} anchor="middle" mono fill={P.ink2} opacity={t.vBypass > 0.01 ? 1 : 0}>{kw(t.qLiquidW * t.vBypass)} kW{thTag}</Tx>
          <rect x={X.dhw - 46} y={Y1} width={92} height={120} fill="none" stroke={P.ink} />
          <path d={`M${X.dhw - 46},${Y1 + 56} L${X.dhw + 46},${Y1 + 112} M${X.dhw - 46},${Y1 + 112} L${X.dhw + 46},${Y1 + 56}`} stroke={P.lineStrong} />
          <Tx x={X.dhw} y={Y1 + 22} anchor="middle" fill={P.ink2}>HX</Tx><Tx x={X.dhw} y={Y1 + 38} anchor="middle" fill={P.ink2}>prapemanasan</Tx>
          <g clipPath={`url(#${uid}tk)`}>
            <rect x={175} y={Y1 + tankH - tankFill} width={78} height={tankFill} fill={P.heat} opacity={0.5} />
          </g>
          {tankFill > 1 ? <path d={`M176,${Y1 + tankH - tankFill} H252`} stroke={P.heatMark} /> : null}
          <rect x={175} y={Y1} width={78} height={tankH} rx={6} fill="none" stroke={P.ink} />
          <Tx x={X.tank} y={Y1 + tankH + 18} anchor="middle" fill={P.ink2}>Tangki</Tx>
          <Tx x={X.tank} y={Y1 + tankH + 35} anchor="middle" mono fill={P.ink}>terisi {formatId(t.soc * 100, 0)} %</Tx>
          <rect x={X.desiccant - 32} y={Y1} width={64} height={30} fill={P.paper} stroke={P.ink2} strokeDasharray="4 3" />
          <Tx x={X.desiccant} y={Y1 + 50} anchor="middle" fill={P.ink2}>HX regenerasi</Tx>
          <Tx x={X.desiccant} y={Y1 + 66} anchor="middle" fill={P.ink3}>hipotesis riset</Tx>
          {/* discharge: tank → HX (dim = stored heat) */}
          <path d={`M${X.tank - 39},${Y1 + 84} H${X.dhw + 46}`} stroke={P.heat} strokeWidth={Math.max(0, dis)} opacity={dis > 0.3 ? 0.55 : 0} fill="none" />
          {/* output band: direct | from tank | heater */}
          <g transform={`translate(${X.dhw - W / 2} ${Y1 + 120})`}>
            <rect x={0} y={0} width={dir} height={64} fill={P.heat} />
            <rect x={dir} y={0} width={tankStrip} height={64} fill={P.heat} opacity={0.55} />
            <rect x={dir + tankStrip} y={0} width={bak} height={64} fill={P.ink2} />
          </g>
          <Tx x={X.dhw + 28} y={Y1 + 164} size={13} fill={P.ink}>Air panas hotel</Tx>
          {(
            [
              ['langsung', t.directW, P.heat, 1],
              ['dari tangki', t.dischargeW, P.heat, 0.55],
              ['pemanas hotel', t.backupW, P.ink2, 1],
            ] as const
          ).map(([label, w, fill, op], i) => (
            <g key={label}>
              <rect x={X.dhw + 28} y={Y1 + 172 + i * 18} width={8} height={8} fill={fill} opacity={op} />
              <Tx x={X.dhw + 42} y={Y1 + 180 + i * 18}>
                {label} <tspan fontFamily={P.mono} fill={P.ink}>{kw(w)} kW{thTag}</tspan>
              </Tx>
            </g>
          ))}
        </svg>
      ) : null}

      {layers.listrik ? (
        <svg viewBox="0 0 360 54" width="100%" role="img" aria-label={`Listrik PV ${kw(t.electricalW)} kilowatt ke beban hotel`} style={{ display: 'block' }}>
          <path d="M20,36 H320" stroke={P.lineStrong} />
          <path d="M20,36 H320" stroke={P.ink} strokeWidth={Math.max(0, 1 + 3.5 * elecW)} opacity={elecW > 0.01 ? 1 : 0} />
          <path d={head(334, 36, 'r', 2 + 3.5 * elecW)} fill={P.ink} opacity={elecW > 0.01 ? 1 : 0} transform="translate(-14 0)" />
          <path d="M24,8 l-5,9 h4 l-2,8 l7,-10 h-4 z" fill={P.ink} />
          <Tx x={36} y={22}>Listrik PV <tspan fontFamily={P.mono} fill={P.ink}>{kw(t.electricalW)} kW<tspan dy={3} fontSize={9}>e</tspan></tspan></Tx>
          <Tx x={340} y={52} anchor="end" fill={P.ink} size={13}>Beban hotel</Tx>
        </svg>
      ) : null}

      {layers.udara ? (
        <svg viewBox="0 0 360 150" width="100%" role="img" aria-label="Aliran udara segar: koil AC biasa atau bed desikan (hipotesis), lalu udara pasok" style={{ display: 'block' }}>
          <Tx x={20} y={16} fill={P.ink2}>Udara luar</Tx>
          <Tx x={96} y={16} mono fill={P.ink}>{formatId(t.ambientC, 1)} °C · RH {formatId(t.rh * 100, 0)} %</Tx>
          <g opacity={0.35 + 0.65 * (1 - desOn)}>
            <path d="M20,44 H150" stroke={P.ink2} strokeWidth={1.5} />
            <rect x={150} y={30} width={80} height={28} fill={P.paper} stroke={P.ink} />
            <Tx x={190} y={48} anchor="middle" fill={P.ink2}>koil AC biasa</Tx>
            <path d="M230,44 H336" stroke={supplyC} strokeWidth={2.5} />
          </g>
          <g opacity={0.3 + 0.7 * desOn}>
            <path d="M20,98 H84" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <rect x={84} y={80} width={80} height={36} fill="none" stroke={P.ink2} strokeDasharray="4 3" />
            <Tx x={124} y={102} anchor="middle" fill={P.ink2}>bed desikan</Tx>
            <path d="M164,98 H180" stroke={P.ink2} strokeWidth={1.5} strokeDasharray="5 4" />
            <rect x={180} y={84} width={56} height={28} fill={P.paper} stroke={P.ink2} strokeDasharray="4 3" />
            <Tx x={208} y={78} anchor="middle" fill={P.ink2}>after-cooler</Tx>
            <path d="M236,98 H248 V44" stroke={supplyC} strokeWidth={2.5} fill="none" />
            <Tx x={20} y={136} fill={P.ink3}>regenerasi: {target.regenAir === 'exhaust' ? 'udara buang hotel' : 'udara luar'}</Tx>
            {desOn > 0.5 ? <Tx x={340} y={136} anchor="end" mono fill={P.ink}>{formatId(t.moistureKgH, 1)} kg/jam</Tx> : null}
          </g>
          <path d={head(336, 44, 'r', 2.5)} fill={supplyC} />
          <Tx x={340} y={34} anchor="end" fill={P.ink} size={13}>Udara pasok</Tx>
          <Tx x={340} y={64} anchor="end" mono fill={P.ink2}>embun {formatId(target.supplyDewPointC, 0)} °C</Tx>
        </svg>
      ) : null}
    </div>
  );
}

