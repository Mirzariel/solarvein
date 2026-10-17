import type { DesiccantEval } from '../../sim/system';
import { LABELS } from '../../sim/system';
import { useBaselines, useDay, useDesiccantSweep, useSystem } from '../../state/systemSelectors';
import { Disclosure, formatId, formatWithUnit } from '../../ui';
import { paybackCells } from '../impact/format';

/** "40–45 °C tidak layak, 50–60 °C marginal": runs of equal verdicts, from the sweep itself. */
function summarise(sweep: readonly DesiccantEval[]): string {
  const runs: { v: string; a: number; b: number }[] = [];
  for (const e of sweep) {
    const v = LABELS.verdict[e.verdict].toLowerCase();
    const last = runs[runs.length - 1];
    if (last && last.v === v) last.b = e.regenC;
    else runs.push({ v, a: e.regenC, b: e.regenC });
  }
  return runs.map((r) => `${r.a === r.b ? formatId(r.a, 0) : `${formatId(r.a, 0)}–${formatId(r.b, 0)}`} °C ${r.v}`).join(', ');
}

interface Risk {
  title: string;
  /** What the simulation says today (generated from hooks). */
  now: string;
  mitigation: string;
  experiment: string;
}

/**
 * Ranked technical risks as compact rows: title and the current simulated state are always visible; mitigation and
 * experiment open per row. The order is the developers' judgement of impact × likelihood, not a computed result.
 */
export function Risks() {
  const sys = useSystem();
  const data = useBaselines();
  const rain = useDay('hujan').totals.solarFraction;
  const rain3 = useDay('hujan-3-hari').totals.solarFraction;
  const ambient = useDesiccantSweep('ambient', [40, 45, 50, 55, 60]);
  const exhaust = useDesiccantSweep('exhaust', [40, 45, 50, 55, 60]);
  const pb = paybackCells(data.economics.B2.paybackYears);
  const f = data.b4BreakEvenFraction;

  const risks: Risk[] = [
    {
      title: 'Hujan berkepanjangan',
      now: `fraksi surya ${formatWithUnit(rain * 100, '%', 0)} (hari hujan berat), ${formatWithUnit(rain3 * 100, '%', 0)} (3 hari hujan); permintaan tidak terpenuhi nol.`,
      mitigation: 'Pemanas cadangan dan AC lama tetap melayani; pompa mati bila kolektor tidak lebih hangat dari tangki.',
      experiment: 'Catat isi tangki selama hujan beberapa hari (fase 2).',
    },
    {
      title: 'Suhu regenerasi desikan',
      now: `udara luar ${summarise(ambient)}; udara buangan hotel ${summarise(exhaust)}.`,
      mitigation: 'Jalur desikan tetap hipotesis riset dan di luar angka utama; router menolaknya bila nilainya lebih rendah.',
      experiment: 'Uji bahan pada 40–60 °C; ukur serapan nyata dan rasio COP pendingin lanjutan (after-cooler) (fase 3).',
    },
    {
      title: 'Persaingan dari B4',
      now:
        f == null
          ? 'tidak ada titik impas pada pemulihan kondensor 0–100 %.'
          : `titik impas pada kondensor menutup ${formatWithUnit(f * 100, '%', 0)} kebutuhan air panas (asumsi ${formatWithUnit(sys.carbon.condenserRecoveryFraction * 100, '%', 0)}).`,
      mitigation: 'Nilai SolarVein ada pada tiga hal sekaligus: listrik PV, sel lebih dingin, dan panas surya dalam satu atap.',
      experiment: 'Ukur pemulihan kondensor nyata di bangunan sejenis dan masukkan ke pembanding (fase 5).',
    },
    {
      title: 'Pemasangan di bangunan lama',
      now: `contoh ${formatWithUnit(sys.array.modules * sys.array.module.areaM2, 'm²', 0)} panel PV/T dan tangki ${formatWithUnit(sys.tank.volumeL, 'L', 0)}; belum ada survei lokasi.`,
      mitigation: 'Tangki penyangga loop tertutup dengan penukar kalor luar; ukuran mengikuti kebutuhan (lihat Penginapan kecil di Dampak).',
      experiment: 'Audit atap dan ruang mesin satu bangunan contoh sebelum fase 2.',
    },
    {
      title: 'Ekonomi terhadap B2',
      now: pb.every((c) => c.years === null) ? 'tidak balik modal terhadap B2 pada asumsi bawaan.' : `balik modal terhadap B2 ${pb.map((c) => c.text).join(' / ')} tahun.`,
      mitigation: 'Hasil dilaporkan apa adanya, termasuk saat B2 unggul; sensitivitas tarif dan COP ada di Dampak.',
      experiment: 'Ganti harga pasang dan tarif asumsi dengan kutipan nyata (fase 5).',
    },
    {
      title: 'Kebaruan',
      now: 'PV/T, tangki, dan pompa kalor sudah ada; yang diusulkan adalah perutean berbasis nilai dalam satu sistem.',
      mitigation: 'Klaim dibatasi pada yang terhitung; daftar "yang sudah ada dan yang baru" mengikuti telaah pustaka.',
      experiment: 'Fase 4 menunjukkan apakah router adaptif menambah nilai di luar kondisi panas berlebih.',
    },
  ];

  return (
    <div>
      {risks.map((r, i) => (
        <Disclosure
          key={r.title}
          level={3}
          title={
            <span className="flex gap-4 py-1">
              <span className="num w-4 shrink-0 text-mono-s font-normal text-ink-3">{i + 1}</span>
              <span className="min-w-0">
                {r.title}
                <span className="mt-0.5 block text-small font-normal text-ink-2">Kini: {r.now}</span>
              </span>
            </span>
          }
        >
          <p className="m-0 text-small">
            <span className="text-ink">Mitigasi: </span>
            {r.mitigation}
          </p>
          <p className="m-0 mt-2 text-small">
            <span className="text-ink">Percobaan: </span>
            {r.experiment}
          </p>
        </Disclosure>
      ))}
    </div>
  );
}
