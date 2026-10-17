import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { CarbonLedger, EvidenceTag, LedgerRow, RefId } from '../../sim/system';
import { Evidence, EvidenceDot, cx, formatId, formatSigned, useReducedMotion } from '../../ui';
import './waterfall.css';

type Tone = 'ink' | 'heat' | 'neutral' | 'penalty' | 'gross' | 'net';
type StepKind = 'avoided' | 'gross' | 'embodied' | 'parasitic' | 'net';

interface Step {
  key: string;
  kind: StepKind;
  label: string;
  kg: number;
  from: number;
  to: number;
  tone: Tone;
  tag?: EvidenceTag;
  refId?: RefId;
  factor?: ReactNode;
}

/** "kWh_e" / "kWh_th" → subscripts, nothing else touched. */
export function Subs({ text }: { text: string }): ReactNode {
  const parts = text.split(/_(th|e)(?![a-zA-Z])/);
  return (
    <>
      {parts.map((p, i) => (i % 2 === 1 ? <sub key={i} className="text-[0.7em]">{p}</sub> : <Fragment key={i}>{p}</Fragment>))}
    </>
  );
}

const digitsFor = (v: number): number => (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : Math.abs(v) >= 1 ? 2 : 3);

/** "25.702 kWh_e × 0,87 kgCO₂e/kWh_e" when energy × factor reproduces the row; otherwise only the factor (never an invented product). */
function factorOf(row: LedgerRow): ReactNode {
  const f = row.factor;
  if (!f || !(f.value > 0)) return null;
  const e = row.energy;
  let lead: ReactNode = null;
  if (e) {
    const en = e.kWhE !== undefined && e.kWhTh === undefined ? { v: e.kWhE as number, u: 'kWh_e' } : e.kWhTh !== undefined && e.kWhE === undefined ? { v: e.kWhTh as number, u: 'kWh_th' } : null;
    if (en && Math.abs(Math.abs(en.v * f.value) - Math.abs(row.kgPerYear)) <= 0.03 * Math.abs(row.kgPerYear) + 1) {
      lead = (
        <>
          <Subs text={`${formatId(Math.abs(en.v), 0)} ${en.u}`} /> ×{' '}
        </>
      );
    }
  }
  return (
    <>
      {lead}
      <Subs text={`${formatId(f.value, digitsFor(f.value))} ${f.unit}`} />
    </>
  );
}

function buildSteps(ledger: CarbonLedger): { steps: Step[]; excluded: LedgerRow[]; standby: LedgerRow[]; lo: number; hi: number } {
  const head = ledger.rows.filter((r) => !r.excludedFromHeadline);
  const excluded = ledger.rows.filter((r) => r.excludedFromHeadline);
  const standby = head.filter((r) => r.kind === 'standby');
  const steps: Step[] = [];
  let cum = 0;
  const push = (r: LedgerRow, kind: StepKind) => {
    const tone: Tone = kind === 'avoided' ? (r.id.startsWith('listrik') ? 'ink' : r.id.startsWith('kalor') ? 'heat' : 'neutral') : 'penalty';
    steps.push({
      key: r.id,
      kind,
      label: r.label,
      kg: r.kgPerYear,
      from: cum,
      to: cum + r.kgPerYear,
      tone,
      tag: r.tag,
      refId: (r.refId ?? r.factor?.refId) as RefId | undefined,
      factor: factorOf(r),
    });
    cum += r.kgPerYear;
  };
  head.filter((r) => r.kind === 'avoided').forEach((r) => push(r, 'avoided'));
  steps.push({ key: 'gross', kind: 'gross', label: 'Dihindari, kotor', kg: cum, from: 0, to: cum, tone: 'gross' });
  head.filter((r) => r.kind === 'embodied').forEach((r) => push(r, 'embodied'));
  head.filter((r) => r.kind === 'parasitic').forEach((r) => push(r, 'parasitic'));
  steps.push({ key: 'net', kind: 'net', label: 'Bersih', kg: cum, from: 0, to: cum, tone: 'net' });
  const levels = steps.flatMap((s) => [s.from, s.to]).concat(0);
  const lo = Math.min(...levels);
  const hi = Math.max(...levels);
  const pad = (hi - lo) * 0.03 || 1;
  return { steps, excluded, standby, lo: lo < 0 ? lo - pad : 0, hi: hi + pad };
}

const TONE: Record<Tone, string> = {
  ink: 'bg-ink',
  heat: 'bg-heat-mark',
  neutral: 'bg-ink-3',
  penalty: 'bg-line-strong',
  gross: 'bg-ink-3',
  net: 'bg-ink',
};

/**
 * Net CO₂e waterfall for ONE baseline, built from the ledger rows (kgCO₂e/yr, + = avoided vs the baseline).
 * Solid bars = avoided, grey bars = added (embodied, parasitic), heat only for the heat row, electricity in ink.
 * Bars move with transform only; they grow one after another when the figure scrolls into view
 * (reduced motion: static). No odometer.
 */
export function Waterfall({ ledger, baselineName, lifetimeYears }: { ledger: CarbonLedger; baselineName: string; lifetimeYears: number }) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (reduced || !el || typeof IntersectionObserver === 'undefined') {
      setBuilt(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          setBuilt(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -30% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const { steps, excluded, standby, lo, hi } = useMemo(() => buildSteps(ledger), [ledger]);
  const span = hi - lo;
  const pct = (v: number) => (v - lo) / span;
  const zero = pct(0) * 100;
  const seen = new Set<EvidenceTag>();

  return (
    <figure
      ref={ref}
      data-export="kpi-baselines"
      data-built={built ? 'true' : 'false'}
      className={cx('waterfall m-0', reduced && 'waterfall-static')}
      aria-label={`Aliran emisi CO₂e per tahun, SolarVein dibanding ${baselineName}`}
    >
      <ol className="m-0 list-none p-0">
        {steps.map((s, i) => {
          const a = Math.min(s.from, s.to);
          const b = Math.max(s.from, s.to);
          const l = pct(a);
          const w = Math.max(pct(b) - l, 0.004);
          const total = s.kind === 'gross' || s.kind === 'net';
          const showLabel = s.tag && !seen.has(s.tag);
          if (s.tag) seen.add(s.tag);
          return (
            <li
              key={s.key}
              className={cx(
                'grid items-center gap-x-6 gap-y-2 border-t py-3 sm:py-3.5 lg:grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,2fr)]',
                total ? 'border-line-strong' : 'border-line',
              )}
            >
              <div className="flex min-w-0 items-start justify-between gap-4 lg:block">
                <div className="min-w-0">
                  <p className={cx('m-0 text-body', total ? 'font-medium text-ink' : 'text-ink')}>
                    {s.label}
                    {s.tag ? (
                      <span className="ml-2 align-baseline">
                        <Evidence tag={s.tag} refId={s.refId} label={showLabel} />
                      </span>
                    ) : null}
                  </p>
                  {s.factor ? <p className="num m-0 mt-0.5 text-mono-label text-ink-3">{s.factor}</p> : null}
                </div>
                <p className={cx('num m-0 shrink-0 text-right text-mono-s lg:hidden', total ? 'font-medium text-ink' : 'text-ink')}>
                  {formatSigned(s.kg, 0)}
                </p>
              </div>
              <div className="wf-track relative h-5" aria-hidden="true">
                <span className="absolute inset-y-0 w-px bg-line-strong" style={{ left: `${zero}%` }} />
                <span
                  className={cx('wf-bar absolute left-0 w-full origin-left', total ? 'inset-y-0.5' : 'inset-y-1', TONE[s.tone])}
                  style={{
                    transform: `translateX(${(l * 100).toFixed(3)}%) scaleX(${built ? w.toFixed(4) : 0})`,
                    transitionDelay: reduced ? undefined : `${i * 70}ms`,
                  }}
                />
              </div>
              <p className={cx('num m-0 hidden text-right text-mono-s lg:block', total ? 'font-medium text-ink' : 'text-ink')}>
                {formatSigned(s.kg, 0)}
                <span className="ml-1.5 text-mono-label text-ink-3">kg</span>
              </p>
            </li>
          );
        })}
      </ol>
      <figcaption className="mt-3 max-w-[68ch] text-small text-ink-2">
        kgCO₂e per tahun. Plus = emisi dihindari dibanding {baselineName}; minus = emisi yang ditambahkan. Emisi tertanam dibagi umur pakai{' '}
        <span className="num">{formatId(lifetimeYears, 0)}</span> tahun.
        {standby.map((r) => (
          <span key={r.id}>
            {' '}
            Rugi diam tangki <span className="num">{formatId(r.energy?.kWhTh ?? 0, 0)}</span> kWh<sub>th</sub> sudah ada di dalam kalor surya terpakai, jadi tidak dihitung dua kali.
          </span>
        ))}
      </figcaption>
      {excluded.length > 0 ? (
        <ul className="m-0 mt-5 list-none border-t border-dashed border-line-strong p-0 pt-3">
          {excluded.map((r) => (
            <li key={r.id} className="flex items-baseline justify-between gap-4 py-1 text-small text-ink-2">
              <span className="flex min-w-0 items-baseline gap-2">
                <EvidenceDot tag="hipotesis" className="translate-y-px" />
                <span>
                  {r.label}
                  <span className="text-ink-3"> · tidak dihitung · hipotesis</span>
                </span>
              </span>
              <span className="num shrink-0 text-ink-3">{formatSigned(r.kgPerYear, 0)} kg</span>
            </li>
          ))}
        </ul>
      ) : null}
    </figure>
  );
}
