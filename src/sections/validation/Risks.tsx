import type { DesiccantEval } from '../../sim/system';
import { LABELS } from '../../sim/system';
import { useBaselines, useDay, useDesiccantSweep, useSystem } from '../../state/systemSelectors';
import { formatId } from '../../ui';
import { paybackCells } from '../impact/format';

/** "40–50 °C tidak layak, 55–60 °C marginal": runs of equal verdicts, from the sweep itself. */
function summarise(sweep: readonly DesiccantEval[]): string {
  const runs: { v: string; a: number; b: number }[] = [];
  for (const e of sweep) {
    const v = LABELS.verdict[e.verdict].toLowerCase();
    const last = runs[runs.length - 1];
    if (last && last.v === v) last.b = e.regenC;
    else runs.push({ v, a: e.regenC, b: e.regenC });
  }
  return runs.map((r) => `${r.a === r.b ? formatId(r.a, 0) : `${formatId(r.a, 0)}–${formatId(r.b, 0)}`} °C ${r.v}`).join(', ');
}

interface Risk {
  title: string;
  /** What the simulation says today (generated from hooks). */
  now: string;
  mitigation: string;
  experiment: string;
}

/**
 * Ranked technical risks. The order is the developers' judgement of impact × likelihood, not a computed result;
 * the "Kini" line under each title is generated from the current simulation.
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
      now: `Fraksi surya air panas ${formatId(rain * 100, 0)}% pada hari hujan berat dan ${formatId(rain3 * 100, 0)}% pada tiga hari hujan; permintaan tak terpenuhi nol.`,
      mitigation: 'Pemanas dan AC lama tetap menjadi cadangan; pompa mati bila kolektor tidak lebih hangat dari tangki.',
      experiment: 'Catat keadaan isi tangki selama hujan beberapa hari (fase 2).',
    },
    {
      title: 'Suhu regenerasi desikan',
      now: `Udara ambien: ${summarise(ambient)}. Udara buang: ${summarise(exhaust)}.`,
      mitigation: 'Jalur desikan tetap hipotesis riset dan di luar angka utama; router menolaknya bila nilainya lebih rendah.',
      experiment: 'Uji bahan pada 40, 45, 50, 55, dan 60 °C, ukur serapan nyata dan rasio COP after-cooler (fase 3).',
    },
    {
      title: 'Persaingan dari B4',
      now: f == null ? 'Tidak ada titik impas pada pemulihan kondensor 0–100%.' : `Titik impas: kondensor menutup ${formatId(f * 100, 0)}% kebutuhan air panas (asumsi ${formatId(sys.carbon.condenserRecoveryFraction * 100, 0)}%).`,
      mitigation: 'Nilai SolarVein ada pada tiga hal sekaligus: listrik PV, sel lebih dingin, dan panas surya dalam satu atap.',
      experiment: 'Ukur pemulihan kondensor nyata di bangunan sejenis dan masukkan ke pembanding (fase 5).',
    },
    {
      title: 'Pemasangan di bangunan lama',
      now: `Contoh ${formatId(sys.array.modules * sys.array.module.areaM2, 0)} m² PV/T dan tangki ${formatId(sys.tank.volumeL, 0)} L; belum ada survei lokasi.`,
      mitigation: 'Tangki penyangga loop tertutup dengan penukar kalor luar; ukuran mengikuti kebutuhan (lihat Penginapan kecil di Dampak).',
      experiment: 'Audit atap dan ruang mesin satu bangunan contoh sebelum fase 2.',
    },
    {
      title: 'Ekonomi terhadap B2',
      now: pb.every((c) => c.years === null) ? 'Tidak balik modal terhadap B2 pada asumsi bawaan.' : `Balik modal terhadap B2: ${pb.map((c) => c.text).join(' / ')} tahun.`,
      mitigation: 'Hasil dilaporkan apa adanya, termasuk saat B2 unggul; sensitivitas tarif dan COP ada di Dampak.',
      experiment: 'Ganti harga pasang dan tarif asumsi dengan kutipan nyata (fase 5).',
    },
    {
      title: 'Kebaruan',
      now: 'PV/T, tangki, dan pompa kalor sudah ada; yang diusulkan adalah perutean berbasis nilai dalam satu sistem.',
      mitigation: 'Daftar "yang sudah ada dan yang baru" mengikuti telaah pustaka; klaim dibatasi pada yang terhitung.',
      experiment: 'Fase 4 menunjukkan apakah pengatur adaptif menambah nilai di luar kondisi panas berlebih.',
    },
  ];

  return (
    <ol className="m-0 list-none p-0">
      {risks.map((r, i) => (
        <li key={r.title} className="grid gap-x-8 gap-y-3 border-t border-line py-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,3.5fr)_minmax(0,3.5fr)]">
          <div className="flex min-w-0 gap-4">
            <span className="num w-5 shrink-0 text-mono-s text-ink-3">{i + 1}</span>
            <div className="min-w-0">
              <h3 className="m-0 text-body font-medium text-ink">{r.title}</h3>
              <p className="m-0 mt-1 text-small text-ink-2">
                <span className="text-ink">Kini: </span>
                {r.now}
              </p>
            </div>
          </div>
          <p className="m-0 pl-9 text-small text-ink-2 lg:pl-0">
            <span className="text-ink">Mitigasi: </span>
            {r.mitigation}
          </p>
          <p className="m-0 pl-9 text-small text-ink-2 lg:pl-0">
            <span className="text-ink">Percobaan: </span>
            {r.experiment}
          </p>
        </li>
      ))}
    </ol>
  );
}
