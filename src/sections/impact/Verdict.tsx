import { Subs } from '../../charts/impact/Waterfall';
import { typo } from '../../ui';
import { splitVerdict } from './format';

/**
 * The generated verdict sentence, word for word (only typography: non-breaking spaces before units).
 * The B2 clause and its cost counter-clause lead; B1, B3, B4 and the desiccant note follow in a quieter size.
 */
export function Verdict({ text }: { text: string }) {
  const { primary, rest } = splitVerdict(text);
  return (
    <div data-verdict className="max-w-[72ch]">
      <p className="m-0 text-lead text-ink"><Subs text={typo(primary)} /></p>
      {rest ? <p className="m-0 mt-5 text-body text-ink-2"><Subs text={typo(rest)} /></p> : null}
    </div>
  );
}

/** Where B4 ties with SolarVein, as a 0–100 % hairline scale: break-even tick vs the assumed recovery share. */
export function B4Breakeven({ breakEven, assumed }: { breakEven: number | null | undefined; assumed: number }) {
  const pct = (x: number) => `${Math.min(1, Math.max(0, x)) * 100}%`;
  return (
    <div className="max-w-[40rem]">
      <p className="m-0 text-body text-ink">
        Titik impas B4:{' '}
        <span className="num">
          {breakEven == null ? 'tidak ada' : `${Math.round(breakEven * 100)}%`}
        </span>{' '}
        <span className="text-ink-2">
          kebutuhan air panas ditutup pemulihan kondensor{breakEven == null ? ' pada 0–100%' : ''}; asumsi saat ini{' '}
          <span className="num">{Math.round(assumed * 100)}%</span>.
        </span>
      </p>
      <div className="relative mt-5 h-8" aria-hidden="true">
        <span className="absolute inset-x-0 top-3 h-px bg-line-strong" />
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <span key={t} className="absolute top-2 h-2 w-px bg-tick" style={{ left: pct(t) }} />
        ))}
        <span className="absolute top-0 h-6 w-px bg-ink-2" style={{ left: pct(assumed) }} />
        {breakEven != null ? <span className="absolute top-0 h-6 w-0.5 bg-ink" style={{ left: pct(breakEven) }} /> : null}
        <span className="num absolute top-[22px] -translate-x-1/2 text-mono-label text-ink-3" style={{ left: pct(assumed) }}>
          asumsi
        </span>
        {breakEven != null ? (
          <span className="num absolute top-[22px] -translate-x-1/2 text-mono-label text-ink" style={{ left: `calc(${pct(breakEven)} + ${breakEven > assumed ? '1.6rem' : '-1.6rem'})` }}>
            impas
          </span>
        ) : null}
      </div>
    </div>
  );
}
