import { useEffect, useState, type ReactNode } from 'react';
import { ASSUMPTIONS, LIMITATIONS } from '../sim';
import { useLaggedSimResult } from '../state';
import { ArrowIcon, Disclosure, formatId } from '../ui';
import { scrollToTarget } from '../motion/smoothScroll';

const VALIDATION_STEPS: { title: string; body: string }[] = [
  {
    title: 'Prototipe berinstrumen',
    body: 'Bangun satu modul PVT dengan sensor suhu (kaca, sel, penyerap, masuk/keluar cairan), pyranometer, anemometer, flowmeter, dan wattmeter. Bandingkan prediksi model dengan data terukur pada berbagai kondisi.',
  },
  {
    title: 'Uji standar modul PV: IEC 61215',
    body: 'Kualifikasi desain modul PV (siklus termal, lembap-beku, uji mekanis) pada rakitan akhir, termasuk pengaruh penukar panas dan insulasi di belakang modul.',
  },
  {
    title: 'Uji kolektor termal: ISO 9806',
    body: 'Ukur kurva efisiensi termal, konstanta waktu, dan rugi panas dengan prosedur kolektor surya standar; bandingkan dengan η₀ dan U-nilai yang diasumsikan di model.',
  },
  {
    title: 'Pengukuran perpindahan panas oleh hujan',
    body: 'Ukur langsung pendinginan permukaan panel pada beberapa intensitas hujan dan sudut kemiringan (hujan buatan terkontrol dan hujan alami) untuk mengkalibrasi koefisien h_hujan.',
  },
  {
    title: 'Uji hidrolik dan keandalan',
    body: 'Verifikasi rugi tekan, daya pompa nyata, distribusi aliran antar kanal, serta ketahanan terhadap korosi, kebocoran, pembentukan kerak/biofilm, dan siklus panas jangka panjang.',
  },
  {
    title: 'Simulasi dinamis dan CFD',
    body: 'Tambahkan massa termal dan model transien, lalu bandingkan dengan CFD kanal untuk memeriksa asumsi satu-node dan efektivitas ε–NTU.',
  },
  {
    title: 'Uji lapangan musiman',
    body: 'Jalankan setidaknya satu siklus musim kemarau dan hujan, catat jam operasi nyata untuk menggantikan asumsi jam setara beban penuh pada analisis karbon.',
  },
];

/** Format id-ID untuk teks asumsi dari sim: 0.88 jadi 0,88; 1400 jam jadi 1.400 jam (koma desimal, titik ribuan). */
function idText(t: string): string {
  return t
    .replace(/(d).(d)/g, '$1,$2')
    .replace(/(d)(d{3})(?=s?(jam|kWh|kg|MJ|h))/g, '$1.$2');
}

function Sub({ children }: { children: ReactNode }) {
  return <sub className="text-[0.75em]">{children}</sub>;
}

/** Persamaan dalam mono, di atas latar `sunken` (bukan kotak berbingkai). */
function Equation({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-label text-ink-2">{label}</p>
      <p className="num mt-1 overflow-x-auto whitespace-nowrap rounded-sm bg-sunken px-3 py-2 text-mono-s leading-6 text-ink">{children}</p>
    </div>
  );
}

/**
 * "Rincian rekayasa" (L3): persamaan, koefisien aktif, asumsi, keterbatasan, langkah validasi, konvensi tanda.
 * Isi ilmiah dipertahankan apa adanya; hanya penyajiannya yang dilipat. Terbuka otomatis lewat tautan `#lab-rincian`.
 */
export default function Rincian() {
  const r = useLaggedSimResult('solarvein-dual', 200);
  const k = r.coefficients;
  const pumpOff = !r.pumpOn;
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      if (window.location.hash !== '#lab-rincian') return;
      setOpen(true);
      requestAnimationFrame(() => scrollToTarget('#lab-rincian'));
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  const coefficients: { sym: ReactNode; name: string; value: string; unit: string; note?: string }[] = [
    { sym: <>h<Sub>konv</Sub></>, name: 'Konveksi permukaan depan', value: formatId(k.hConvFront, 2), unit: 'W/(m²·K)' },
    { sym: <>h<Sub>rad</Sub></>, name: 'Radiasi ekuivalen permukaan depan', value: formatId(k.hRadFront, 2), unit: 'W/(m²·K)' },
    { sym: <>h<Sub>hujan</Sub></>, name: 'Pendinginan oleh hujan', value: formatId(k.hRain, 1), unit: 'W/(m²·K)', note: r.inputs.rainMmH > 0 ? undefined : 'tidak hujan' },
    ...(k.uCellGlass !== undefined
      ? [{ sym: <>U<Sub>sel–kaca</Sub></>, name: 'Konduktansi sel ke permukaan kaca', value: formatId(k.uCellGlass, 0), unit: 'W/(m²·K)' }]
      : []),
    { sym: <>U<Sub>belakang</Sub></>, name: 'Rugi sisi belakang', value: formatId(k.uBack, 2), unit: 'W/(m²·K)' },
    { sym: <>U<Sub>pf</Sub></>, name: 'Konduktansi pelat–cairan', value: formatId(k.uPlateFluid, 0), unit: 'W/(m²·K)' },
    { sym: 'ṁ', name: 'Laju massa cairan', value: pumpOff ? '—' : formatId(r.massFlowKgS, 4), unit: 'kg/s', note: pumpOff ? 'pompa mati' : undefined },
    { sym: 'NTU', name: 'Number of transfer units', value: pumpOff ? '—' : formatId(k.ntu, 2), unit: '–', note: pumpOff ? 'pompa mati' : undefined },
    { sym: 'ε', name: 'Efektivitas penukar panas', value: pumpOff ? '—' : formatId(k.effectiveness, 3), unit: '–', note: pumpOff ? 'pompa mati' : undefined },
  ];

  return (
    <div id="lab-rincian" className="scroll-mt-20">
      <Disclosure
        title="Rincian rekayasa"
        hint="Persamaan, asumsi, batas model"
        level={3}
        open={open}
        onOpenChange={setOpen}
        className="max-w-none"
      >
        <p className="text-ink">
          Simulasi konseptual untuk edukasi; bukan CFD tervalidasi, uji lapangan, atau alat penilai kinerja bersertifikat.
        </p>
        <div className="mt-4 -mx-px">
          <Disclosure title="Rumus yang dipakai" hint="Untuk yang ingin memeriksa" level={4}>
            <div className="space-y-4">
              <Equation label="Daya listrik PV">
                P<Sub>e</Sub> = G · A · η(T)
              </Equation>
              <Equation label="Efisiensi terhadap suhu sel">
                η(T) = η<Sub>ref</Sub> · [1 − β · (T − 25 °C)]
              </Equation>
              <Equation label="Daya termal ke cairan (bertanda)">
                Q = ṁ · c<Sub>p</Sub> · (T<Sub>out</Sub> − T<Sub>in</Sub>)
              </Equation>
              <Equation label="Penukar panas ε–NTU">
                NTU = U<Sub>pf</Sub>·A / (ṁ·c<Sub>p</Sub>)
                <br />ε = 1 − e<sup>−NTU</sup>
                <br />Q = ε·ṁ·c<Sub>p</Sub>·(T<Sub>panel</Sub> − T<Sub>in</Sub>)
              </Equation>
              <Equation label="Neraca energi pada node panel">
                τα·G·A = P<Sub>e</Sub> + Q<Sub>cairan</Sub> + Q<Sub>depan</Sub> + Q<Sub>hujan</Sub> + Q<Sub>belakang</Sub>
              </Equation>
              <p className="text-small text-ink-2">
                Residu neraca saat ini:{' '}
                <span className="num text-ink">{formatId(Math.abs(r.energyBalanceResidualW) < 0.05 ? 0 : r.energyBalanceResidualW, 1)} W</span>.
              </p>
            </div>
          </Disclosure>

          <Disclosure title="Koefisien yang sedang dipakai" hint="Berubah bersama masukan" level={4}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[22rem] border-collapse text-left text-body">
                <caption className="sr-only">Koefisien perpindahan panas dan penukar panas pada kondisi saat ini</caption>
                <thead>
                  <tr className="border-b border-line-strong text-label text-ink-2">
                    <th scope="col" className="py-2 pr-3 font-medium">Simbol</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Besaran</th>
                    <th scope="col" className="py-2 pr-3 text-right font-medium">Nilai</th>
                    <th scope="col" className="py-2 font-medium">Satuan</th>
                  </tr>
                </thead>
                <tbody>
                  {coefficients.map((c) => (
                    <tr key={c.name} className="border-b border-line">
                      <th scope="row" className="mono py-2 pr-3 text-left align-top font-normal text-ink">{c.sym}</th>
                      <td className="py-2 pr-3 align-top text-ink-2">
                        {c.name}
                        {c.note ? <span className="block text-small text-ink-3">{c.note}</span> : null}
                      </td>
                      <td className="num py-2 pr-3 text-right align-top text-mono-s text-ink">{c.value}</td>
                      <td className="num py-2 align-top text-mono-label text-ink-2">{c.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Disclosure>

          <Disclosure title="Asumsi" hint={`${ASSUMPTIONS.length} butir`} level={4}>
            <div>
              {ASSUMPTIONS.map((a) => (
                <Disclosure key={a.id} title={a.title} level={4}>
                  <p>{idText(a.body)}</p>
                  {a.value ? <p className="num mt-3 rounded-sm bg-sunken px-3 py-2 text-mono-label text-ink-2">{idText(a.value)}</p> : null}
                </Disclosure>
              ))}
            </div>
          </Disclosure>

          <Disclosure title="Batas model" hint={`${LIMITATIONS.length} butir`} level={4}>
            <ul className="m-0 list-none space-y-3 p-0">
              {LIMITATIONS.map((l) => (
                <li key={l} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                  <span>{idText(l)}</span>
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure title="Langkah validasi berikutnya" hint={`${VALIDATION_STEPS.length} langkah`} level={4}>
            <ol className="m-0 list-none space-y-4 p-0">
              {VALIDATION_STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span className="num mt-0.5 w-5 shrink-0 text-mono-label text-ink-3">{i + 1}</span>
                  <span>
                    <span className="font-medium text-ink">{s.title}.</span> {s.body}
                  </span>
                </li>
              ))}
            </ol>
          </Disclosure>

          <Disclosure title="Konvensi tanda dan satuan" level={4}>
            <ul className="m-0 list-none space-y-2 p-0">
              <li className="flex items-start gap-2">
                <ArrowIcon size={16} direction="down" className="mt-1 shrink-0 text-heat-ink" />
                <span>
                  <span className="mono text-heat-ink">Q &gt; 0</span> panas masuk ke cairan (panen).
                </span>
              </li>
              <li className="flex items-start gap-2">
                <ArrowIcon size={16} direction="up" className="mt-1 shrink-0 text-cool-ink" />
                <span>
                  <span className="mono text-cool-ink">Q &lt; 0</span> panas keluar dari cairan ke panel dan lingkungan (pembuangan).
                </span>
              </li>
              <li>Cairan selalu mengalir dari masuk ke keluar; hanya tanda panasnya yang berubah.</li>
              <li>
                W<Sub>th</Sub> dan W<Sub>e</Sub> tidak dijumlahkan tanpa konversi yang ditampilkan (efisiensi pemanas, COP).
              </li>
            </ul>
          </Disclosure>
        </div>
      </Disclosure>
    </div>
  );
}
