import { useMemo, useState, type ReactNode } from 'react';
import { PRESETS, compareConfigurations, simulate, type CollectorConfig, type SimResult } from '../sim';
import { useLaggedComparison, useStore, type ComparisonScenario } from '../state';
import { useAnnouncement } from './hero/useAnnouncement';
import { useInView } from '../hooks';
import { Disclosure, SectionHeader, SegmentedControl, StatusDot, cx, formatId, type Tone } from '../ui';
import { We, Wth } from '../charts/ChartCard';
import { CONFIG_META, CONFIG_ORDER } from '../charts/configs';
import { computeVerdict, winnerOf } from '../charts/verdict';
import { netRejectionBenefitW } from '../state';
import { fmt } from '../charts/format';

type ComparisonSet = Record<CollectorConfig, SimResult>;

/** Hasil preset dihitung sekali per sesi (masukan preset konstan). */
const presetCache = new Map<'sunny' | 'rainy', ComparisonSet>();
function presetComparison(key: 'sunny' | 'rainy'): ComparisonSet {
  let c = presetCache.get(key);
  // Pembanding pendingin yang sama di kedua preset: dry cooler (COP preset Hujan), kecuali pengguna mengubahnya di Lab.
  if (!c) presetCache.set(key, (c = compareConfigurations({ ...PRESETS[key], coolingCOP: PRESETS.rainy.coolingCOP })));
  return c;
}

const SCENARIOS = [
  { value: 'current' as const, label: 'Saat ini', description: 'Kondisi saat ini: memakai masukan di Lab' },
  { value: 'sunny' as const, label: 'Cerah', description: 'Siang tropis cerah, ada beban air panas' },
  { value: 'rainy' as const, label: 'Hujan', description: 'Hujan deras, ada loop proses hangat' },
];

/** Nama pendek untuk kepala kolom (nama lengkap ada di tooltip dan teks tersembunyi). */
const SHORT: Record<CollectorConfig, string> = {
  'conventional-pv': 'PV biasa',
  'pvt-harvest-only': 'PV + pendingin cairan',
  'solarvein-dual': 'SolarVein',
};

interface RowSpec {
  /** Baris kedua di bawah label (mis. pembanding COP). */
  sub?: (r: SimResult) => string;
  id: string;
  label: string;
  tag?: 'e' | 'th';
  unit: string;
  get: (r: SimResult) => number;
  digits: number;
  mark?: ReactNode;
  more?: boolean;
}

const ROWS: RowSpec[] = [
  { id: 'net', label: 'Listrik bersih', tag: 'e', unit: 'W', get: (r) => r.netElectricalW, digits: 0 },
  { id: 'use', label: 'Panas terpakai', tag: 'th', unit: 'W', get: (r) => r.usefulHeatW, digits: 0 },
  { id: 'tc', label: 'Suhu sel', unit: '°C', get: (r) => r.cellC, digits: 1, mark: '†' },
  { id: 'pump', label: 'Listrik pompa', tag: 'e', unit: 'W', get: (r) => r.pumpW, digits: 1 },
  { id: 'cool', label: 'Listrik pendingin yang digantikan', tag: 'e', unit: 'W', get: (r) => r.avoidedCoolingElecW, digits: 1, sub: (r) => `pembanding COP ${formatId(r.inputs.coolingCOP, 1)}` },
  { id: 'rej', label: 'Panas dibuang', tag: 'th', unit: 'W', get: (r) => r.heatRejectedW, digits: 0, more: true },
  { id: 'pe', label: 'Listrik PV kotor', tag: 'e', unit: 'W', get: (r) => r.electricalW, digits: 0, more: true },
];

const BAR_FILL: Record<CollectorConfig, string> = {
  'conventional-pv': 'bg-loss',
  'pvt-harvest-only': 'bg-ink-2',
  'solarvein-dual': 'bg-ink',
};

const SUB: Record<CollectorConfig, string> = {
  'conventional-pv': 'tanpa penukar panas',
  'pvt-harvest-only': 'hanya memanen panas',
  'solarvein-dual': 'memanen dan membuang panas',
};


const CHILLER_COP = 3.5;

export default function Comparison() {
  const scenario = useStore((s) => s.comparisonScenario);
  const setScenario = useStore((s) => s.setComparisonScenario);
  // Pembaca di bawah lipatan: mengikuti salinan masukan yang ditunda, bukan setiap tick slider.
  const current = useLaggedComparison();
  const data: ComparisonSet = scenario === 'current' ? current : presetComparison(scenario);
  const verdict = useMemo(() => computeVerdict(data), [data]);
  const [more, setMore] = useState(false);
  const winner = winnerOf(verdict, data);
  // Kolom yang identik dengan kolom di kirinya pada baris utama diberi tanda "setara" (bukan "unggul").
  const same = (a: CollectorConfig, b: CollectorConfig) => ['net', 'use', 'rej'].every((id) => { const r = ROWS.find((x) => x.id === id); return r ? Math.abs(r.get(data[a]) - r.get(data[b])) < 0.5 : true; });
  const tag = (c: CollectorConfig): string => {
    if (winner === c) return 'unggul';
    const i = CONFIG_ORDER.indexOf(c);
    const left = CONFIG_ORDER[i - 1];
    return left && same(c, left) && winner === null ? 'setara' : '';
  };
  // Pembaca layar mendengar vonis hanya saat jenisnya berubah, tidak pada setiap geseran slider.
  const [sectionRef, inView] = useInView<HTMLElement>({ rootMargin: '0px' });
  const announcedRaw = useAnnouncement(`${scenario}|${verdict.kind}`, verdict.headline);
  const announced = inView ? announcedRaw : '';

  const dual = data['solarvein-dual'];
  const harv = data['pvt-harvest-only'];
  const conv = data['conventional-pv'];
  const inp = dual.inputs;
  const tone: Tone = verdict.tone === 'heat' ? 'heat' : verdict.tone === 'cool' ? 'cool' : 'neutral';
  const showBaseline = dual.heatRejectedW > 0.5;
  const dryAvoid = dual.avoidedCoolingElecW;
  const chillerAvoid = dual.heatRejectedW / CHILLER_COP;

  // Kelebihan dan batas dihitung dari simulasi skenario ini (bukan ditulis lebih dulu).
  const idle = useMemo(() => simulate({ ...inp, pumpControl: 'off' }, 'solarvein-dual'), [inp]);
  const idlePct = conv.electricalW > 0 ? (1 - idle.electricalW / conv.electricalW) * 100 : 0;
  const wins: string[] = [
    'Panas terpakai saat ada beban air panas',
    'Pembuangan panas saat ada sumber panas yang nyata, nilainya bergantung pada pendingin yang digantikan',
  ];
  if (dual.pumpOn && dual.cellC < conv.cellC - 0.2) {
    wins.push(`Sel lebih sejuk saat pompa memanen panas (${formatId(dual.cellC, 1)} °C lawan ${formatId(conv.cellC, 1)} °C), jadi listrik sedikit lebih tinggi`);
  }
  const limits: string[] = ['Perlu pompa, penukar panas, dan insulasi'];
  if (idle.cellC > conv.cellC + 0.5 && idlePct > 0.5) {
    limits.push(`Tanpa beban panas saat cerah: panel lebih panas dari PV biasa (${formatId(idle.cellC, 1)} °C lawan ${formatId(conv.cellC, 1)} °C) dan listrik turun ±${formatId(idlePct, 0)}%`);
  } else {
    limits.push('Tanpa beban panas, manfaat panasnya nol');
  }
  limits.push('Hujan tanpa sumber panas: setara PV biasa', 'Biaya dan perpipaan di lokasi belum dimodelkan');

  const rows = ROWS.filter((r) => !r.more || more);

  const order = winner ? [winner, ...CONFIG_ORDER.filter((c) => c !== winner)] : CONFIG_ORDER;
  const net = ROWS[0] as RowSpec;
  const netMax = Math.max(...CONFIG_ORDER.map((c) => net.get(data[c])), 1e-9);

  const configHead = (c: CollectorConfig, align: 'left' | 'right') => (
    <>
      <span className={cx('flex items-center gap-2', align === 'right' && 'justify-end')}>
        <span className="text-[17px] font-medium leading-6 tracking-[-0.01em] text-ink" title={CONFIG_META[c].full}>
          {SHORT[c]}
        </span>
        {tag(c) ? (
          <span className={cx('rounded-full px-2 py-0.5 text-[12px] font-medium leading-4', tag(c) === 'unggul' ? 'bg-ink text-surface' : 'bg-sunken text-ink-2')}>
            {tag(c)}
          </span>
        ) : null}
      </span>
      <span className="mt-1 block text-small font-normal text-ink-3">{SUB[c]}</span>
      <span className="sr-only"> ({CONFIG_META[c].full})</span>
    </>
  );

  const unit = (row: RowSpec) => (
    <span className="mono text-[13px] text-ink-3">
      {row.unit}
      {row.tag ? <sub>{row.tag}</sub> : null}
    </span>
  );

  return (
    <section ref={sectionRef} id="perbandingan" aria-labelledby="perbandingan-title" className="scroll-mt-14 py-24 lg:py-36">
      <div className="page-wrap">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            id="perbandingan-title"
            index={{ n: '05', label: 'Perbandingan' }}
            title={
              <>
                <span className="inline-block">Tiga susunan,</span> <span className="inline-block">satu kondisi.</span>
              </>
            }
          />
          <SegmentedControl<ComparisonScenario>
            ariaLabel="Skenario perbandingan"
            options={SCENARIOS}
            value={scenario}
            onChange={setScenario}
            size="lg"
            className="self-start pointer-coarse:h-14! lg:self-end"
          />
        </div>

        {/* vonis: one sentence, large */}
        <div className="mt-14 lg:mt-20">
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {announced}
          </div>
          <StatusDot tone={tone}>{verdict.kind === 'conventional-better' ? 'PV biasa unggul' : 'Dihitung dari angka'}</StatusDot>
          <h3 className="mt-4 max-w-[30ch] text-h3 text-ink">{verdict.headline}</h3>
        </div>

        {/* tabel (≥ md) */}
        <div className="mt-10 hidden md:block" role="region" aria-label="Tabel perbandingan">
          <table className="w-full table-fixed border-separate border-spacing-0 text-left">
            <caption className="sr-only">Perbandingan tiga konfigurasi pada skenario {SCENARIOS.find((s) => s.value === scenario)?.label}</caption>
            <colgroup>
              <col className="w-[34%]" />
              <col />
              <col />
              <col />
            </colgroup>
            <thead>
              <tr className="align-bottom">
                <th scope="col" className="pb-5">
                  <span className="sr-only">Besaran</span>
                </th>
                {CONFIG_ORDER.map((c) => (
                  <th
                    key={c}
                    scope="col"
                    className={cx('px-6 pb-5 pt-6 text-right align-bottom font-normal transition-colors duration-[300ms]', winner === c && 'rounded-t-[20px] bg-surface')}
                  >
                    {configHead(c, 'right')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                const last = ri === rows.length - 1 && !more;
                return (
                  <tr key={row.id}>
                    <th scope="row" className="border-t border-line py-6 pr-4 text-left align-top font-normal">
                      <span className="block text-body-l text-ink">
                        {row.label}
                        {row.mark ? <span aria-hidden="true" className="ml-1 text-ink-3">{row.mark}</span> : null}
                        <span className="ml-2">{unit(row)}</span>
                      </span>
                      {row.sub ? <span className="mt-0.5 block text-small text-ink-3">{row.sub(dual)}</span> : null}
                    </th>
                    {CONFIG_ORDER.map((c) => {
                      const v = row.get(data[c]);
                      const w = winner === c;
                      const strong = w || winner === null;
                      return (
                        <td
                          key={c}
                          className={cx('border-t border-line px-6 py-6 text-right align-top transition-colors duration-[300ms]', w && 'bg-surface', w && last && 'rounded-b-[20px]')}
                        >
                          <span className={cx('num block text-readout-m', strong ? 'text-ink' : 'text-ink-3')}>{fmt(v, row.digits)}</span>
                          {row.id === 'net' ? (
                            <span aria-hidden="true" className="mt-3 ml-auto block h-1 w-full max-w-40 overflow-hidden rounded-full bg-sunken">
                              <span className={cx('ml-auto block h-full rounded-full transition-[width] duration-[600ms] ease-ui', BAR_FILL[c])} style={{ width: `${Math.max(0, Math.min(100, (v / netMax) * 100))}%` }} />
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {more ? (
                <tr>
                  <th scope="row" className="border-t border-line py-6 pr-4 text-left text-body-l font-normal text-ink">
                    Status pompa
                  </th>
                  {CONFIG_ORDER.map((c) => (
                    <td key={c} className={cx('border-t border-line px-6 py-6 text-right text-body text-ink-2', winner === c && 'rounded-b-[20px] bg-surface')}>
                      {c === 'conventional-pv' ? 'tidak ada' : data[c].pumpOn ? 'menyala' : 'mati'}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* kartu per susunan (< md), pemenang di atas */}
        <ul className="m-0 mt-10 list-none space-y-4 p-0 md:hidden" aria-label="Perbandingan per susunan">
          {order.map((c) => (
            <li key={c} className={cx('rounded-[20px] p-5', winner === c ? 'bg-surface shadow-e2' : 'border border-line')}>
              {configHead(c, 'left')}
              <dl className="m-0 mt-4">
                {rows.map((row) => (
                  <div key={row.id} className="flex items-baseline justify-between gap-4 border-t border-line py-3">
                    <dt className="text-body text-ink">
                      {row.label}
                      {row.mark ? <span aria-hidden="true" className="ml-1 text-ink-3">{row.mark}</span> : null} {unit(row)}
                    </dt>
                    <dd className={cx('num m-0 text-[20px]', winner === c ? 'text-ink' : 'text-ink-2')}>{fmt(row.get(data[c]), row.digits)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((v) => !v)}
            className="inline-flex min-h-10 items-center self-start rounded-full border border-line-strong px-4 text-button text-ink transition-ui hover:bg-surface pointer-coarse:min-h-11"
          >
            {more ? 'Sembunyikan baris tambahan' : 'Tampilkan semua baris'}
          </button>
          <p className="max-w-[60ch] text-small text-ink-3 sm:text-right">
            † Tanpa sirkulasi, PVT berinsulasi lebih panas daripada PV biasa, sehingga listriknya bisa lebih rendah. <We /> dan <Wth /> tidak dijumlahkan.
          </p>
        </div>

        {/* kelebihan dan batas (SolarVein) */}
        <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
          <div className="border-t border-ink pt-5">
            <h3 className="text-h3 text-ink">SolarVein unggul di</h3>
            <ul className="m-0 mt-5 list-none space-y-3 p-0 text-body text-ink">
              {wins.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
          <div className="border-t border-line-strong pt-5">
            <h3 className="text-h3 text-ink-3">Terbatas di</h3>
            <ul className="m-0 mt-5 list-none space-y-3 p-0 text-body text-ink-2">
              {limits.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* L2 / L3 */}
        <div className="mt-16 max-w-4xl">
          <Disclosure title="Mengapa hasilnya begini" hint="Dari angka simulasi" level={3}>
            <ul className="m-0 list-none space-y-2 p-0">
              {verdict.reasons.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
            {showBaseline ? (
              <p className="mt-4">
                Nilai pembuangan bergantung pada pendingin yang digantikan: dry cooler (COP {formatId(inp.coolingCOP, 1)}) sekitar{' '}
                <span className="tabular-nums text-ink">{formatId(dryAvoid, 1)}</span> <We />, chiller (COP {formatId(CHILLER_COP, 1)}) sekitar{' '}
                <span className="tabular-nums text-ink">{formatId(chillerAvoid, 1)}</span> <We />. Setelah pompa ({formatId(dual.pumpW, 1)} <We />) dan penurunan daya PV, manfaat bersihnya{' '}
                <span className="tabular-nums text-ink">{formatId(netRejectionBenefitW(dual, conv), 1)}</span> <We /> (dry cooler) atau{' '}
                <span className="tabular-nums text-ink">{formatId(chillerAvoid + dual.netElectricalW - conv.netElectricalW, 1)}</span> <We /> (chiller).
              </p>
            ) : null}
            <p className="mt-4 text-small">
              Aturan: tanpa panas berguna dan tanpa pembuangan nyata, listrik bersih menentukan; dengan beban panas, PVT bernilai karena panas; dengan sumber panas,
              hanya SolarVein yang membuang panas. Mode ganda tidak dianggap unggul secara bawaan.
            </p>
          </Disclosure>
          <Disclosure title="Konversi eksplisit ke energi primer" hint="Faktor dari skenario" level={3}>
            <p>
              <Wth /> tidak bisa dijumlahkan dengan <We />. Konversi di bawah memakai efisiensi pemanas{' '}
              <span className="tabular-nums text-ink">{formatId(inp.boilerEfficiency, 2)}</span> dan COP pendingin{' '}
              <span className="tabular-nums text-ink">{formatId(inp.coolingCOP, 1)}</span>.
            </p>
            <dl className="m-0 mt-4 space-y-4">
              <div>
                <dt className="text-ink">Bahan bakar yang digantikan panas berguna</dt>
                <dd className="num m-0 mt-1 text-mono-label leading-5">
                  W<sub>bahan bakar</sub> = W<sub>th</sub> berguna ÷ η<sub>pemanas</sub>
                  <br />
                  <span className="text-ink">
                    PV + pendingin {fmt(harv.avoidedFuelW, 0)} W · SolarVein {fmt(dual.avoidedFuelW, 0)} W · PV biasa {fmt(conv.avoidedFuelW, 0)} W
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-ink">Listrik pendingin yang digantikan pembuangan panas</dt>
                <dd className="num m-0 mt-1 text-mono-label leading-5">
                  W<sub>e,pendingin</sub> = W<sub>th</sub> dibuang ÷ COP
                  <br />
                  <span className="text-ink">
                    SolarVein {fmt(dual.avoidedCoolingElecW, 1)} W<sub>e</sub> (COP {formatId(inp.coolingCOP, 1)}); bila chiller (COP {formatId(CHILLER_COP, 1)}){' '}
                    {fmt(chillerAvoid, 1)} W<sub>e</sub>; lainnya 0.
                  </span>
                  <br />
                  Hanya berlaku bila pendingin mekanis memang digantikan.
                </dd>
              </div>
              <div>
                <dt className="text-ink">Listrik bersih ditambah listrik pendingin yang dihindari</dt>
                <dd className="num m-0 mt-1 text-mono-label leading-5 text-ink">
                  PV biasa {fmt(conv.netElectricalW, 1)} · PV + pendingin {fmt(harv.netElectricalW, 1)} · SolarVein {fmt(dual.netElectricalW + dual.avoidedCoolingElecW, 1)} W
                  <sub>e</sub>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-small">Model kuasi-tunak, satu node panel; selisih kecil tidak berarti secara praktis. Konvensi tanda ada di Lab, Rincian rekayasa.</p>
          </Disclosure>
        </div>
      </div>
    </section>
  );
}
