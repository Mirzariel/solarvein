/**
 * Schematic: clean longitudinal cross-section of the collector as SVG (no three.js, safe for the main bundle).
 *
 *  - layers (frame, glass, cells, TIM, absorber plate, copper tube, foam, back sheet),
 *  - liquid always inlet -> outlet (dashes move left -> right while the pump runs), tube coloured by the same
 *    OKLab ramp as the 3D liquid (warna diperkuat),
 *  - v2 = harvest only: amber arrows between the cells and the liquid, always pointing from the cells into the
 *    liquid, drawn only while the pump runs and the live qLiquidW > 20 W; their length and width follow qLiquidW.
 *    No rejection / reversed arrows, no cyan, no front-loss or rain arrows. No regime flag and no UI mode is read,
 *  - temperatures labelled in mono.
 *
 * `tone="page"` for the light page (Lab, beside the controls); `tone="stage"` for the dark stage (no-WebGL
 * fallback = `CutawayFallback`).
 */
import { useId } from 'react';
import { useSimResult } from '../state/selectors';
import { formatId } from './fmt';
import { fluidProgress, rampHex, rampPosition } from './palette';
import { PARTS, type PartId } from './parts';

export interface SchematicProps {
  tone: 'page' | 'stage';
  compact?: boolean;
  /** Dim everything outside this part (inspect fallback). */
  highlight?: PartId | null;
  className?: string;
}

interface Theme {
  ink: string;
  ink2: string;
  line: string;
  heat: string;
  glass: string;
  glassStroke: string;
  cell: string;
  cellLine: string;
  tim: string;
  absorber: string;
  copper: string;
  foam: string;
  back: string;
  frame: string;
  frameStroke: string;
  halo: string;
}

const THEMES: Record<'page' | 'stage', Theme> = {
  page: {
    ink: 'var(--color-ink, #171C22)',
    ink2: 'var(--color-ink-2, #66717C)',
    line: 'var(--color-line-strong, #CBD2D6)',
    heat: '#D98442',
    glass: 'rgba(120,170,196,0.28)',
    glassStroke: '#8DB4C6',
    cell: '#1F2B4D',
    cellLine: '#3A4C7C',
    tim: '#8A939C',
    absorber: '#B8C1CC',
    copper: '#C57B45',
    foam: '#DAD6C8',
    back: '#4A4F55',
    frame: '#D5DADE',
    frameStroke: '#9AA3AB',
    halo: 'var(--color-paper, #F7F8F6)',
  },
  stage: {
    ink: 'var(--color-stage-ink, #E9ECEE)',
    ink2: 'var(--color-stage-ink-2, #8D979F)',
    line: 'var(--color-stage-line, #262C33)',
    heat: '#F0A05C',
    glass: 'rgba(156,195,214,0.22)',
    glassStroke: '#7FA8C0',
    cell: '#14203A',
    cellLine: '#2A3C66',
    tim: '#4A525C',
    absorber: '#B8C1CC',
    copper: '#C57B45',
    foam: '#3A3E43',
    back: '#2A2E33',
    frame: '#AEB6BE',
    frameStroke: '#6F7880',
    halo: 'var(--color-stage-0, #0E1114)',
  },
};

const MONO = "var(--font-mono, 'Geist Mono Variable', ui-monospace, monospace)";
const SANS = "var(--font-sans, 'Geist Variable', system-ui, sans-serif)";
const MIN_Q = 20;

/** Harvest arrow size from q [W] (log-ish, 16..46 px). */
const arrowLen = (w: number): number => Math.max(14, Math.min(46, 10 + 7 * Math.log10(1 + Math.abs(w))));
/** Shaft width from q [W] (2..4.5 px): the arrow gets wider as more heat is harvested. */
const arrowWidth = (w: number): number => Math.max(2, Math.min(4.5, 1 + 1.15 * Math.log10(1 + Math.abs(w))));

/** Always points down (+y): cell layer -> liquid. (x, y) is the centre. */
function Arrow({ x, y, len, color, width = 3 }: { x: number; y: number; len: number; color: string; width?: number }) {
  const y1 = y - len / 2;
  const y2 = y + len / 2;
  const head = 6 + width;
  const by = y2 - head;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={by} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M${x - head * 0.8} ${by} L${x} ${y2} L${x + head * 0.8} ${by} Z`} fill={color} />
    </g>
  );
}

export function Schematic({ tone, compact = false, highlight = null, className }: SchematicProps) {
  const t = THEMES[tone];
  const r = useSimResult();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  // compact = simplified mobile variant: narrower viewBox so the text stays >= 12 px on a 340 px stage
  const VB_W = compact ? 360 : 660;
  const VB_H = compact ? 292 : 316;
  const x0 = compact ? 18 : 150;
  const x1 = compact ? 342 : 622;
  const fs = compact ? 14.5 : 12;
  const w = x1 - x0;

  // layer bands (top -> bottom)
  const yFrameTop = 78;
  const yGlass = 86;
  const hGlass = 8;
  const yCell = yGlass + hGlass;
  const hCell = 9;
  const yTim = yCell + hCell;
  const hTim = 5;
  const yAbs = yTim + hTim;
  const hAbs = 8;
  const yTube = yAbs + hAbs;
  const hTube = 30;
  const yFoam = yTube + hTube;
  const hFoam = 62;
  const yBack = yFoam + hFoam;
  const hBack = 8;
  const yFrameBottom = yBack + hBack + 4;
  const wall = 14;

  const tin = r.inletC;
  const tout = r.outletC;
  const mean = (tin + tout) / 2;
  const ntu = r.coefficients.ntu;
  const pumpOn = r.pumpOn;
  const q = r.qLiquidW;
  const heatOn = pumpOn && q > MIN_Q; // harvest only: heat goes cell -> liquid, never the other way
  const heatColor = t.heat;

  const gradStops = Array.from({ length: 6 }, (_, i) => {
    const s = i / 5;
    const temp = tin + (tout - tin) * fluidProgress(s, ntu);
    return { off: s, color: rampHex(rampPosition(temp, mean)) };
  });

  const dim = (id: PartId): number => (highlight && highlight !== id ? 0.28 : 1);
  const dashId = `sv-dash-${uid}`;
  const arrowXs = [0.2, 0.4, 0.6, 0.8].map((f) => x0 + wall + (w - 2 * wall) * f);
  const nArrows = heatOn ? Math.max(2, Math.min(4, Math.round(1 + Math.log10(1 + q)))) : 0;
  const shownArrows = arrowXs.filter((_, i) => i < nArrows || (nArrows === 2 && i === 2));
  const lenHeat = arrowLen(q);
  const widthHeat = arrowWidth(q);

  const valueLine = (x: number, y: number, sym: string, val: number, anchor: 'start' | 'middle' | 'end' = 'start') => (
    <text x={x} y={y} textAnchor={anchor} fontFamily={MONO} fontSize={fs} fill={t.ink2} style={{ paintOrder: 'stroke', stroke: t.halo, strokeWidth: 3, strokeLinejoin: 'round' }}>
      {sym} <tspan fill={t.ink} fontWeight={500}>{formatId(val, 1)}</tspan> °C
    </text>
  );

  const label = (y: number, text: string, id: PartId) => (
    <text key={id} x={x0 - 54} y={y + 4} textAnchor="end" fontFamily={SANS} fontSize={12.5} fill={t.ink2} opacity={dim(id)}>
      {text}
    </text>
  );

  const harvestText = 'Panas ke cairan';
  const descr = `Penampang kolektor PVT. Cairan masuk ${formatId(tin, 1)} °C, keluar ${formatId(tout, 1)} °C, selalu mengalir dari masuk ke keluar. ${
    heatOn ? 'Panas mengalir dari sel ke cairan.' : pumpOn ? 'Panen panas kecil.' : 'Pompa mati, tidak ada panen panas.'
  } Suhu sel ${formatId(r.cellC, 1)} °C.`;

  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" className={className ?? 'h-full w-full'} role="img" aria-labelledby={`${uid}t ${uid}d`}>
      <title id={`${uid}t`}>Penampang kolektor PVT</title>
      <desc id={`${uid}d`}>{descr}</desc>
      <defs>
        <linearGradient id={`${uid}g`} gradientUnits="userSpaceOnUse" x1={x0 + wall} y1={0} x2={x1 - wall} y2={0}>
          {gradStops.map((s) => (
            <stop key={s.off} offset={s.off} stopColor={s.color} />
          ))}
        </linearGradient>
        <style>{`
          .${dashId} { animation: ${dashId}-move 1.6s linear infinite; }
          @keyframes ${dashId}-move { to { stroke-dashoffset: -28; } }
          @media (prefers-reduced-motion: reduce) { .${dashId} { animation: none; } }
        `}</style>
      </defs>

      {/* sunward side */}
      {!compact ? (
        <text x={x1} y={22} textAnchor="end" fontFamily={SANS} fontSize={12} fill={t.ink2}>
          Sisi matahari
        </text>
      ) : null}

      {/* frame (outline) */}
      <rect x={x0} y={yFrameTop} width={w} height={yFrameBottom - yFrameTop} rx={4} fill={t.frame} stroke={t.frameStroke} strokeWidth={1} opacity={dim('insulation')} />
      {/* inside */}
      <g>
        <rect x={x0 + wall} y={yBack} width={w - 2 * wall} height={hBack} fill={t.back} opacity={dim('insulation')} />
        <rect x={x0 + wall} y={yFoam} width={w - 2 * wall} height={hFoam} fill={t.foam} opacity={dim('insulation')} />
        <rect x={x0 + wall} y={yAbs} width={w - 2 * wall} height={hAbs} fill={t.absorber} opacity={dim('absorber')} />
        <rect x={x0 + wall} y={yTim} width={w - 2 * wall} height={hTim} fill={t.tim} opacity={dim('absorber')} />
        <rect x={x0 + wall} y={yCell} width={w - 2 * wall} height={hCell} fill={t.cell} opacity={dim('pv')} />
        {Array.from({ length: 9 }, (_, i) => {
          const x = x0 + wall + ((w - 2 * wall) * (i + 1)) / 10;
          return <line key={i} x1={x} y1={yCell} x2={x} y2={yCell + hCell} stroke={t.cellLine} strokeWidth={1} opacity={dim('pv')} />;
        })}
        <rect x={x0 + wall} y={yGlass} width={w - 2 * wall} height={hGlass} fill={t.glass} stroke={t.glassStroke} strokeWidth={0.75} opacity={dim('pv')} />
      </g>

      {/* tube: copper wall + liquid coloured by the temperature ramp */}
      <g opacity={dim('channel')}>
        <rect x={x0 - 26} y={yTube + 6} width={w + 52} height={hTube - 12} rx={(hTube - 12) / 2} fill={t.copper} />
        <rect x={x0 - 26} y={yTube + 9} width={w + 52} height={hTube - 18} rx={(hTube - 18) / 2} fill={`url(#${uid}g)`} opacity={pumpOn ? 1 : 0.35} />
        {pumpOn ? (
          <line
            className={dashId}
            x1={x0 - 20}
            y1={yTube + hTube / 2}
            x2={x1 + 20}
            y2={yTube + hTube / 2}
            stroke="#FFFFFF"
            strokeOpacity={0.85}
            strokeWidth={2}
            strokeDasharray="7 21"
            strokeLinecap="round"
          />
        ) : null}
        {/* inlet / outlet markers (flow always left -> right) */}
        <path d={`M${x0 - 44} ${yTube + hTube / 2} h14`} stroke={t.ink2} strokeWidth={1.25} />
        <path d={`M${x0 - 34} ${yTube + hTube / 2 - 4} l5 4 l-5 4`} fill="none" stroke={t.ink2} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
        <path d={`M${x1 + 30} ${yTube + hTube / 2} h14`} stroke={t.ink2} strokeWidth={1.25} />
        <path d={`M${x1 + 40} ${yTube + hTube / 2 - 4} l5 4 l-5 4`} fill="none" stroke={t.ink2} strokeWidth={1.25} strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* harvest arrows: between the cells and the liquid, always cell -> liquid (v2) */}
      {heatOn
        ? shownArrows.map((x, i) => (
            <Arrow key={i} x={x} y={(yCell + yTube + hTube / 2) / 2 + 2} len={lenHeat} color={heatColor} width={widthHeat} />
          ))
        : null}

      {/* temperatures (mono; "Masuk" / "Keluar", no raw underscores) */}
      {valueLine(x0 + wall + 8, yTube + hTube + 19, 'Masuk', tin)}
      {valueLine(x1 - wall - 8, yTube + hTube + 19, 'Keluar', tout, 'end')}
      {valueLine(compact ? x0 + wall + 8 : (x0 + x1) / 2, yTube + hTube + (compact ? 40 : 19), 'Sel', r.cellC, compact ? 'start' : 'middle')}

      {/* heat caption (below the frame so it never meets the arrows) */}
      {heatOn ? (
        <text x={x0 + wall + 8} y={yFrameBottom + (compact ? 24 : 26)} fontFamily={SANS} fontSize={fs} fill={heatColor}>
          {harvestText}{' '}
          <tspan fontFamily={MONO} fontWeight={500}>
            {formatId(Math.abs(q), 0)} W
          </tspan>
          <tspan fontFamily={MONO} fontSize={fs * 0.72} dy={fs * 0.3}>
            th
          </tspan>
        </text>
      ) : !pumpOn ? (
        <text x={x0 + wall + 8} y={yFrameBottom + (compact ? 24 : 26)} fontFamily={SANS} fontSize={fs} fill={t.ink2}>
          Pompa mati
        </text>
      ) : null}

      {/* part labels */}
      {!compact ? (
        <g>
          {label((yGlass + yCell + hCell) / 2, PARTS[0]?.label ?? '', 'pv')}
          {label((yTim + yAbs + hAbs) / 2, PARTS[1]?.label ?? '', 'absorber')}
          {label(yTube + hTube / 2, PARTS[2]?.label ?? '', 'channel')}
          {label(yFoam + hFoam / 2, PARTS[3]?.label ?? '', 'insulation')}
        </g>
      ) : null}
    </svg>
  );
}

/** No-WebGL fallback of the stages: the same schematic in stage tone. */
export function CutawayFallback({ highlight = null }: { highlight?: PartId | null }) {
  // container query: the stage root is an @container; narrow stages get the simplified, larger-text variant
  return (
    <div className="grid h-full w-full place-items-center p-3 @[34rem]:p-8">
      <div className="hidden w-full max-w-3xl @[34rem]:block">
        <Schematic tone="stage" highlight={highlight} className="h-auto w-full" />
      </div>
      <div className="w-full max-w-md @[34rem]:hidden">
        <Schematic tone="stage" compact highlight={highlight} className="h-auto w-full" />
      </div>
    </div>
  );
}

export default Schematic;
