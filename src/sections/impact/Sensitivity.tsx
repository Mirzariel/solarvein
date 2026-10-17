import { useDeferredValue, useMemo } from 'react';
import { getSystemView, type BaselineId } from '../../sim/system';
import { useSystem } from '../../state/systemSelectors';
import { cx, formatId } from '../../ui';
import { tonSigned } from './format';

/** Bands from docs/research/data-indonesia.md (grid EF 0,68–0,87) and the HPWH COP band 3–4 (carbon assumptions). */
const EF = [0.68, 0.78, 0.87] as const;
const COP = [3, 3.5, 4] as const;

/**
 * Net CO₂e for a baseline over the grid-EF × HPWH-COP band. The sim view cache is keyed structurally, so only the
 * carbon tier is recomputed; the annual simulation is shared with the headline numbers.
 */
function useGrid(id: BaselineId) {
  const sys = useDeferredValue(useSystem());
  return useMemo(
    () =>
      COP.map((cop) =>
        EF.map((ef) => {
          const s = { ...sys, carbon: { ...sys.carbon, gridKgPerKWhE: ef, hpwhCop: cop } };
          return getSystemView(s).baselines().ledgers[id].netKgPerYear;
        }),
      ),
    [sys, id],
  );
}

function Matrix({ id, name }: { id: BaselineId; name: string }) {
  const grid = useGrid(id);
  const sys = useSystem();
  return (
    <div className="min-w-0">
      <p className="m-0 text-label text-ink">Bersih terhadap {name}, t CO₂e/tahun</p>
      <table className="num mt-2 w-full border-collapse text-mono-s">
        <thead>
          <tr className="text-mono-label text-ink-3">
            <th scope="col" className="py-1 text-left font-normal">COP \ EF</th>
            {EF.map((ef) => (
              <th key={ef} scope="col" className="py-1 text-right font-normal">
                {formatId(ef, 2)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COP.map((cop, r) => (
            <tr key={cop} className="border-t border-line">
              <th scope="row" className="py-1.5 text-left font-normal text-ink-3">
                {formatId(cop, 1)}
              </th>
              {EF.map((ef, c) => {
                const v = grid[r]![c]!;
                const base = Math.abs(ef - sys.carbon.gridKgPerKWhE) < 1e-6 && Math.abs(cop - sys.carbon.hpwhCop) < 1e-6;
                return (
                  <td key={ef} className={cx('py-1.5 text-right', base ? 'font-medium text-ink' : 'text-ink-2')}>
                    {tonSigned(v, 1)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Sensitivity of the two headline comparisons. Cell in ink + medium = the current assumptions. */
export function Sensitivity() {
  return (
    <div className="space-y-4">
      <p className="m-0">
        Faktor emisi listrik jaringan (kgCO₂e/kWh<sub>e</sub>) di kolom, COP pompa kalor air panas di baris. Angka tebal = asumsi saat ini.
      </p>
      <div className="grid gap-8 sm:grid-cols-2">
        <Matrix id="B2" name="B2" />
        <Matrix id="B1" name="B1" />
      </div>
      <p className="m-0 text-small">
        Selisih yang sangat kecil tidak bermakna: model punya ketidakpastian.
      </p>
    </div>
  );
}
