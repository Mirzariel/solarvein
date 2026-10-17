import { useMemo, type ReactNode } from 'react';
import { Disclosure, cx, formatId } from '../../ui';
import { COLOR } from '../theme';
import { useElementWidth } from '../useElementWidth';
import type { DayFlows } from './flowModel';
import { layoutSankey, type SLink, type SNode } from './sankey';

/**
 * Aliran energi untuk satu skenario hari: matahari, lalu listrik PV (kWh_e) atau panas ke cairan (kWh_th), lalu
 * tujuan panas (air panas langsung, tangki, desikan, bypass) dan rugi. Satu skala lebar untuk seluruh bagan;
 * subskrip e / th menandai bentuk energinya dan tidak ada total gabungan listrik + panas.
 * Layar sempit: daftar angka dengan batang tipis (bagan pita terlalu rapat untuk 390 px).
 */

const MONO = "var(--font-mono, 'Geist Mono Variable', ui-monospace, monospace)";
const SANS = "var(--font-sans, 'Geist Variable', system-ui, sans-serif)";
const HALO = { paintOrder: 'stroke', stroke: 'var(--color-paper)', strokeWidth: 3, strokeLinejoin: 'round' } as const;

type Form = 'e' | 'th' | '';
type Kind = 'heat' | 'ink' | 'loss';
const f1 = (n: number) => formatId(n, 1);

interface Row {
  id: string;
  label: string;
  value: number;
  form: Form;
  /** dashed = belum divalidasi (desikan) */
  dashed?: boolean;
  kind: Kind;
}

function Tag({ form }: { form: Form }) {
  return form ? <sub className="text-[0.7em]">{form}</sub> : null;
}

const fillOf = (kind: Kind) => (kind === 'heat' ? COLOR.heat : kind === 'ink' ? COLOR.ink : COLOR.loss);

/** Daftar angka (layar sempit dan versi tabel). */
export function FlowLedger({ flows }: { flows: DayFlows }) {
  const groups: { title: string; rows: Row[] }[] = [
    {
      title: 'Dari matahari',
      rows: [
        { id: 'rad', label: 'Radiasi pada larik', value: flows.radiantKWh, form: '', kind: 'loss' },
        { id: 'pv', label: 'Listrik PV', value: flows.pvKWhE, form: 'e', kind: 'ink' },
        { id: 'heat', label: 'Panas ke cairan', value: flows.heatKWhTh, form: 'th', kind: 'heat' },
        { id: 'oth', label: 'Sisa: rugi optik, depan, belakang, derating (selisih)', value: flows.otherKWh, form: '', kind: 'loss' },
      ],
    },
    {
      title: 'Ke mana panas cairan pergi',
      rows: [
        { id: 'dir', label: 'Air panas langsung', value: flows.directKWhTh, form: 'th', kind: 'heat' },
        { id: 'tank', label: 'Tangki penyangga', value: flows.toTankKWhTh, form: 'th', kind: 'heat' },
        { id: 'des', label: 'Regenerasi desikan (hipotesis riset)', value: flows.regenKWhTh, form: 'th', kind: 'heat', dashed: true },
        { id: 'byp', label: 'Tidak dipakai (bypass): ke pembuang panas (dry cooler), sel lebih dingin', value: flows.bypassKWhTh, form: 'th', kind: 'loss' },
      ],
    },
    {
      title: 'Tangki',
      rows: [
        { id: 'tdhw', label: 'Dilepas ke air panas', value: flows.tankToDhwKWhTh, form: 'th', kind: 'heat' },
        { id: 'tloss', label: 'Rugi diam ke udara', value: flows.tankLossKWhTh, form: 'th', kind: 'loss' },
        {
          id: 'tdel',
          label: flows.tankDeltaKWhTh >= 0 ? 'Panas simpanan bertambah' : 'Panas simpanan berkurang',
          value: Math.abs(flows.tankDeltaKWhTh),
          form: 'th',
          kind: 'heat',
        },
      ],
    },
    {
      title: 'Air panas pada suhu set',
      rows: [
        { id: 'dem', label: 'Kebutuhan', value: flows.demandKWhTh, form: 'th', kind: 'ink' },
        { id: 'sol', label: 'Dari panas surya', value: flows.solarKWhTh, form: 'th', kind: 'heat' },
        { id: 'bak', label: 'Pemanas cadangan', value: flows.backupKWhTh, form: 'th', kind: 'loss' },
      ],
    },
  ];
  return (
    <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
      {groups.map((g) => {
        const max = Math.max(...g.rows.map((r) => r.value), 1e-9);
        return (
          <section key={g.title} aria-label={g.title} className="min-w-0 border-t border-line pt-3">
            <h4 className="m-0 text-label text-ink-2">{g.title}</h4>
            <ul className="m-0 mt-3 list-none space-y-3 p-0">
              {g.rows.map((r) => (
                <li key={r.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-small text-ink-2">{r.label}</span>
                    <span className="num shrink-0 text-mono-s text-ink">
                      {f1(r.value)}{' '}
                      <span className="text-ink-2">
                        kWh
                        <Tag form={r.form} />
                      </span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-[3px] bg-sunken" aria-hidden="true">
                    <div
                      className="h-full"
                      style={{
                        width: `${Math.min(100, (r.value / max) * 100)}%`,
                        background: r.dashed ? 'transparent' : fillOf(r.kind),
                        borderTop: r.dashed ? `1.5px dashed ${COLOR.heat}` : undefined,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

export function FlowChart({ flows, caption }: { flows: DayFlows; caption?: ReactNode }) {
  const [ref, width] = useElementWidth<HTMLDivElement>();
  const wide = width >= 620;
  return (
    <div ref={ref} className="min-w-0">
      {width === 0 ? null : wide ? <Sankey flows={flows} width={Math.min(width, 1000)} /> : <FlowLedger flows={flows} />}
      {wide ? (
        <div className="mt-6">
          <Disclosure title="Angka dalam daftar" hint="Sama dengan bagan" level={4}>
            <div className="max-w-none">
              <FlowLedger flows={flows} />
            </div>
          </Disclosure>
        </div>
      ) : null}
      {caption ? <div className={cx('mt-4 max-w-[64ch] text-small text-ink-2')}>{caption}</div> : null}
    </div>
  );
}

interface NodeLabel {
  name: string;
  value: number;
  form: Form;
  kind: Kind;
  dashed?: boolean;
  side: 'l' | 'r' | 'above' | 'below';
}

function Sankey({ flows, width }: { flows: DayFlows; width: number }) {
  const height = 340;
  const model = useMemo(() => {
    const hp = flows.heatPumpKWhTh > 0.05;
    const dStore = flows.tankDeltaKWhTh;
    const nodes: SNode[] = [
      { id: 'sun', col: 0, order: 0 },
      { id: 'pv', col: 1, order: 0 },
      { id: 'heat', col: 1, order: 1 },
      { id: 'oth', col: 1, order: 2 },
      { id: 'pass', col: 2, order: 0, hidden: true },
      { id: 'tank', col: 2, order: 2 },
      { id: 'des', col: 2, order: 3 },
      { id: 'byp', col: 2, order: 4 },
      { id: 'dhw', col: 3, order: 0 },
      { id: 'tloss', col: 3, order: 1 },
    ];
    if (hp) nodes.push({ id: 'hp', col: 2, order: 1 });
    if (dStore > 0.05) nodes.push({ id: 'tdel', col: 3, order: 2 });
    if (dStore < -0.05) nodes.push({ id: 'tprev', col: 1, order: 3 });
    const links: SLink[] = [
      { from: 'sun', to: 'pv', value: flows.pvKWhE },
      { from: 'sun', to: 'heat', value: flows.heatKWhTh },
      { from: 'sun', to: 'oth', value: flows.otherKWh },
      { from: 'heat', to: 'pass', value: flows.directKWhTh },
      { from: 'heat', to: 'tank', value: flows.toTankKWhTh },
      { from: 'heat', to: 'des', value: flows.regenKWhTh },
      { from: 'heat', to: 'byp', value: flows.bypassKWhTh },
      { from: 'pass', to: 'dhw', value: flows.directKWhTh },
      { from: 'tank', to: 'dhw', value: flows.tankToDhwKWhTh },
      { from: 'tank', to: 'tloss', value: flows.tankLossKWhTh },
    ];
    if (hp) links.push({ from: 'hp', to: 'dhw', value: flows.heatPumpKWhTh });
    if (dStore > 0.05) links.push({ from: 'tank', to: 'tdel', value: dStore });
    if (dStore < -0.05) links.push({ from: 'tprev', to: 'tank', value: -dStore });
    return layoutSankey(nodes, links, {
      width,
      height,
      nodeW: 9,
      padL: 108,
      padR: 176,
      gap: (c) => (c === 0 ? 0 : c === 1 ? 54 : 46),
    });
  }, [flows, width]);

  const labelOf = (id: string): NodeLabel | null => {
    switch (id) {
      case 'sun':
        return { name: 'Radiasi surya', value: flows.radiantKWh, form: '', kind: 'loss', side: 'l' };
      case 'pv':
        return { name: 'Listrik PV', value: flows.pvKWhE, form: 'e', kind: 'ink', side: 'r' };
      case 'heat':
        return { name: 'Panas ke cairan', value: flows.heatKWhTh, form: 'th', kind: 'heat', side: 'above' };
      case 'oth':
        return { name: 'Rugi optik, depan, belakang', value: flows.otherKWh, form: '', kind: 'loss', side: 'r' };
      case 'tank':
        return { name: 'Tangki', value: flows.toTankKWhTh, form: 'th', kind: 'heat', side: 'below' };
      case 'des':
        return { name: 'Desikan (hipotesis)', value: flows.regenKWhTh, form: 'th', kind: 'heat', dashed: true, side: 'r' };
      case 'byp':
        return { name: 'Tidak dipakai (bypass)', value: flows.bypassKWhTh, form: 'th', kind: 'loss', side: 'r' };
      case 'hp':
        return { name: 'Pompa kalor (opsi)', value: flows.heatPumpKWhTh, form: 'th', kind: 'heat', dashed: true, side: 'r' };
      case 'dhw':
        return { name: 'Air panas surya', value: flows.solarKWhTh, form: 'th', kind: 'heat', side: 'r' };
      case 'tloss':
        return { name: 'Rugi diam tangki', value: flows.tankLossKWhTh, form: 'th', kind: 'loss', side: 'r' };
      case 'tdel':
        return { name: 'Simpanan bertambah', value: flows.tankDeltaKWhTh, form: 'th', kind: 'heat', side: 'r' };
      case 'tprev':
        return { name: 'Simpanan awal', value: -flows.tankDeltaKWhTh, form: 'th', kind: 'heat', side: 'r' };
      default:
        return null;
    }
  };

  const linkStyle = (from: string, to: string): { fill: string; opacity: number; dashed?: boolean } => {
    if (to === 'pv') return { fill: COLOR.ink, opacity: 0.85 };
    if (to === 'oth' || to === 'byp' || to === 'tloss') return { fill: COLOR.loss, opacity: 0.7 };
    if (to === 'des' || from === 'hp') return { fill: 'none', opacity: 1, dashed: true };
    return { fill: COLOR.heat, opacity: 0.8 };
  };

  const desc = `Aliran energi ${formatId(flows.hours, 0)} jam. Radiasi ${f1(flows.radiantKWh)} kWh menjadi listrik PV ${f1(flows.pvKWhE)} kWh listrik, panas ke cairan ${f1(flows.heatKWhTh)} kWh termal, dan sisanya rugi. Panas ke cairan: air panas langsung ${f1(flows.directKWhTh)}, tangki ${f1(flows.toTankKWhTh)}, desikan ${f1(flows.regenKWhTh)}, tidak dipakai ${f1(flows.bypassKWhTh)} kWh termal.`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={desc} className="block h-auto w-full overflow-visible">
      <g>
        {model.links.map((l) => {
          const st = linkStyle(l.from, l.to);
          return (
            <path
              key={`${l.from}-${l.to}`}
              d={l.d}
              fill={st.fill}
              fillOpacity={st.opacity}
              stroke={st.dashed ? COLOR.heat : 'none'}
              strokeWidth={st.dashed ? 1 : 0}
              strokeDasharray={st.dashed ? '4 3' : undefined}
            />
          );
        })}
      </g>
      <g>
        {model.nodes.map((n) => {
          if (n.hidden) return n.h > 0 ? <rect key={n.id} x={n.x} y={n.y} width={9} height={n.h} fill={COLOR.heat} opacity={0.8} /> : null;
          const lb = labelOf(n.id);
          if (!lb) return null;
          const midY = n.y + Math.max(n.h, 0) / 2;
          const anchor = lb.side === 'l' ? 'end' : 'start';
          const x = lb.side === 'l' ? n.x - 8 : lb.side === 'r' ? n.x + 9 + 8 : n.x;
          const y1 = lb.side === 'above' ? n.y - 26 : lb.side === 'below' ? n.y + n.h + 16 : midY - 2;
          return (
            <g key={n.id}>
              {n.h > 0 ? (
                <rect
                  x={n.x}
                  y={n.y}
                  width={9}
                  height={n.h}
                  fill={lb.dashed ? 'none' : fillOf(lb.kind)}
                  stroke={lb.dashed ? COLOR.heat : 'none'}
                  strokeDasharray={lb.dashed ? '3 2' : undefined}
                />
              ) : (
                <line x1={n.x} x2={n.x + 9} y1={n.y} y2={n.y} stroke={COLOR.loss} strokeWidth={1} strokeDasharray="2 2" />
              )}
              <text x={x} y={y1} textAnchor={anchor} fontFamily={SANS} fontSize={12} fill="var(--color-ink-2)" style={HALO}>
                {lb.name}
                <tspan x={x} dy={15} fontFamily={MONO} fontSize={12.5} fill="var(--color-ink)" fontWeight={500}>
                  {f1(lb.value)}
                  <tspan fill="var(--color-ink-2)" fontWeight={400}>
                    {' '}
                    kWh
                  </tspan>
                  {lb.form ? (
                    <tspan fill="var(--color-ink-2)" fontSize={9} dy={3} fontWeight={400}>
                      {lb.form}
                    </tspan>
                  ) : null}
                </tspan>
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
