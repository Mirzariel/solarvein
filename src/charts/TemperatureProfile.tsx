import { useMemo } from 'react';
import type { SimResult, TemperatureNode } from '../sim';
import { ArrowIcon, cx } from '../ui';
import { fmt } from './format';

/** Di bawah ambang ini beda suhu antar-node dianggap setara (tanpa arah panas). */
const EQUAL_K = 0.05;

interface Row {
  node: TemperatureNode;
  /** 0..1 relatif terhadap rentang profil. */
  rel: number;
}

interface Link {
  /** Beda suhu node bawah − node atas [K]. Positif: node bawah (lebih ke belakang) lebih panas → panas mengalir ke atas. */
  deltaK: number;
  direction: 'down' | 'up' | 'none';
  /** Tone: panah di sekitar node cairan membawa makna panen/pembuangan. */
  tone: 'heat' | 'cool' | 'neutral';
}

function nodeColor(rel: number): string {
  // Rampa relatif satu-hue: loss (netral) → heat. Teks angka selalu menyertai, warna bukan satu-satunya pembawa.
  const pct = Math.round(8 + rel * 84);
  return `color-mix(in oklab, var(--color-loss), var(--color-heat-mark) ${pct}%)`;
}

/**
 * Gradien suhu menembus rakitan (depan → belakang) dari `result.profile`.
 * Panah di antara node mengikuti suhu node: panas mengalir dari yang lebih panas ke yang lebih dingin.
 */
export function TemperatureProfile({ result }: { result: SimResult }) {
  const { rows, links, tMin, tMax } = useMemo(() => {
    const nodes = result.profile;
    const temps = nodes.map((n) => n.tempC);
    const lo = Math.min(...temps);
    const hi = Math.max(...temps);
    const span = Math.max(hi - lo, 1e-6);
    const rows: Row[] = nodes.map((node) => ({ node, rel: (node.tempC - lo) / span }));
    const links: Link[] = nodes.slice(1).map((lower, i) => {
      const upper = nodes[i];
      const d = lower.tempC - (upper?.tempC ?? lower.tempC);
      const direction: Link['direction'] = Math.abs(d) < EQUAL_K ? 'none' : d > 0 ? 'up' : 'down';
      const touchesFluid = upper?.id === 'absorber' && lower.id === 'fluid';
      let tone: Link['tone'] = 'neutral';
      if (touchesFluid && direction !== 'none') {
        // Panas masuk ke node cairan (dari absorber) = panen; keluar dari cairan = pembuangan.
        const intoFluid = direction === 'down';
        tone = intoFluid ? 'heat' : 'cool';
      }
      return { deltaK: d, direction, tone };
    });
    return { rows, links, tMin: lo, tMax: hi };
  }, [result.profile]);

  const summary = `Profil suhu dari depan ke belakang: ${result.profile.map((n) => `${n.label} ${fmt(n.tempC, 1)} derajat Celsius`).join('; ')}.`;

  return (
    <div>
      <ol className="m-0 list-none p-0" aria-label={summary}>
        {rows.map((row, i) => {
          const link = links[i];
          const isFluid = row.node.id === 'fluid';
          return (
            <li key={row.node.id} className="list-none">
              <div
                className={cx(
                  'grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-x-3 rounded-sm px-2 py-2 sm:grid-cols-[minmax(0,11rem)_1fr_auto]',
                  isFluid && 'bg-cool-wash',
                )}
              >
                <span className="text-label text-ink-2 sm:text-body">{row.node.label}</span>
                <span className="relative h-2 rounded-full bg-sunken" aria-hidden="true">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${8 + row.rel * 92}%`, background: nodeColor(row.rel) }}
                  />
                </span>
                <span className="num w-[4.75rem] text-right text-mono-s text-ink">
                  {fmt(row.node.tempC, 1)}
                  <span className="ml-0.5 text-mono-label text-ink-3">°C</span>
                </span>
              </div>

              {isFluid ? (
                <p className="num mt-1 px-2 text-right text-mono-label text-ink-2">
                  {result.pumpOn
                    ? `T masuk ${fmt(result.inletC, 1)} → T keluar ${fmt(result.outletC, 1)} °C`
                    : 'pompa mati: tanpa aliran'}
                </p>
              ) : null}

              {link ? (
                <div className="flex items-center gap-2 px-2" role="presentation">
                  <span className="w-[7.5rem] shrink-0 sm:w-[11rem]" />
                  <span
                    className={cx(
                      'inline-flex min-h-6 items-center gap-2 text-mono-label',
                      link.tone === 'heat' ? 'text-heat-ink' : link.tone === 'cool' ? 'text-cool-ink' : 'text-ink-3',
                    )}
                  >
                    {link.direction === 'none' ? (
                      <span className="mono">≈ setara</span>
                    ) : (
                      <>
                        <ArrowIcon size={12} direction={link.direction === 'down' ? 'down' : 'up'} />
                        <span className="num">
                          {fmt(Math.abs(link.deltaK), 1)} K
                        </span>
                        <span className="sr-only">
                          {link.direction === 'down' ? 'panas mengalir ke belakang' : 'panas mengalir ke depan'}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
      <p className="num mt-4 text-mono-label text-ink-3">
        rentang profil {fmt(tMin, 1)} – {fmt(tMax, 1)} °C
      </p>
    </div>
  );
}
