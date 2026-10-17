import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DESICCANT_NOT_BENEFICIAL, DESICCANT_STATUS, LABELS, type AssumptionWithModule } from '../sim/system';
import { useSystemView } from '../state/systemSelectors';
import { useSettledView } from './lab/useSettledView';
import { U } from './lab/units';
import { useSystemStore } from '../state/system';
import { Disclosure, Evidence, formatId } from '../ui';
import { scrollToTarget } from '../motion/smoothScroll';

/** Nama modul (kunci `module` pada createSystemView().assumptions()) dalam bahasa Indonesia, urutan tampil. */
const MODULES: { key: string; title: string }[] = [
  { key: 'hotel', title: 'Hotel, cuaca, ukuran larik' },
  { key: 'dhw', title: 'Air panas dan penukar kalor prapemanasan' },
  { key: 'tank', title: 'Tangki penyangga' },
  { key: 'router', title: 'Router' },
  { key: 'day', title: 'Simulasi harian dan tahunan' },
  { key: 'heatpump', title: 'Kolektor sebagai sumber pompa kalor' },
  { key: 'desiccant', title: 'Desikan (hipotesis riset)' },
  { key: 'carbon', title: 'Karbon dan pembanding' },
  { key: 'economics', title: 'Ekonomi' },
];

const LIMITS: string[] = [
  'Semua angka adalah hasil simulasi. Belum ada data ukur dari prototipe, uji lapangan, atau hotel nyata.',
  'Cuaca dibangkitkan secara analitik dan deterministik untuk empat tipe hari; bobot tahunan adalah asumsi, bukan deret waktu cuaca satu kota.',
  'Kolektor dimodelkan satu simpul dengan efektivitas ε–NTU dan tangki dua simpul tercampur; stratifikasi, massa termal kolektor, dan dinamika transien tidak dihitung.',
  'Hotel ilustrasi bukan data satu hotel. Profil penarikan air panas, hunian, dan udara segar adalah asumsi rekayasa.',
  'Jalur desikan adalah hipotesis riset. Isoterm silika-gel diekstrapolasi terhadap suhu; hasilnya peka terhadap rasio COP after-cooler terhadap koil acuan.',
  'Faktor emisi jaringan dianggap sama sepanjang hari karena belum ada faktor per jam yang terbuka untuk Indonesia.',
  'Listrik PV dianggap terpakai sendiri sepenuhnya oleh hotel; ekspor, tarif beban puncak, dan batas inverter tidak dimodelkan.',
  'Emisi tertanam peralatan memakai rentang asumsi per m², per kWp, dan per paket; bukan hasil LCA satu produk.',
];

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

function AssumptionList({ items }: { items: AssumptionWithModule[] }) {
  return (
    <ul className="m-0 list-none p-0">
      {items.map((a) => (
        <li key={a.id} className="border-t border-line py-3 first:border-t-0 first:pt-1">
          <p className="m-0 flex items-start justify-between gap-3">
            <span className="min-w-0 font-medium text-ink"><U>{a.title}</U></span>
            <Evidence tag={a.tag} refId={a.refId} className="mt-1 shrink-0" />
          </p>
          {a.value ? <p className="num mt-1.5 text-mono-label text-ink"><U>{a.value}</U></p> : null}
          <p className="mt-1.5 text-small text-ink-2"><U>{a.body}</U></p>
        </li>
      ))}
    </ul>
  );
}

/** Bagian yang memicu simulasi tambahan: hanya dirender saat rincian terbuka. */
function Computed() {
  const { view } = useSettledView();
  const regenAir = useSystemStore((s) => s.sys.desiccant.regenAir);
  const baselines = useMemo(() => view.baselines(), [view]);
  const heatUses = useMemo(() => view.heatUses(), [view]);
  const sweep = useMemo(() => view.desiccantSweep(regenAir), [view, regenAir]);
  const anyViable = sweep.some((e) => e.verdict === 'layak');
  const worthwhile = sweep.filter((e) => e.operating);
  return (
    <>
      <Disclosure title="Kapan hasilnya tidak menguntungkan" hint="Dihitung dari angka saat ini" level={4}>
        <ul className="m-0 list-none space-y-3 p-0">
          <li><U>{baselines.verdict}</U></li>
          {!anyViable ? (
            <li>
              {DESICCANT_NOT_BENEFICIAL} <span className="text-ink-3">Berlaku untuk udara regenerasi {regenAir === 'ambient' ? 'luar' : 'buangan hotel'} pada 35–70 °C.</span>
            </li>
          ) : null}
          <li>Pemanas yang sudah ada tetap siaga di setiap skenario, sehingga kebutuhan air panas yang tidak terpenuhi selalu nol; yang berubah hanya penghematannya.</li>
        </ul>
      </Disclosure>

      <Disclosure title="Nilai tiap kWh termal panas" hint="Dasar urutan router" level={4}>
        <ul className="m-0 list-none p-0">
          {heatUses.map((h) => (
            <li key={h.use} className="border-t border-line py-3 first:border-t-0 first:pt-1">
              <p className="m-0 flex items-start justify-between gap-3">
                <span className="min-w-0 font-medium text-ink"><U>{h.label}</U></span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="num text-mono-label text-ink">
                    {formatId(h.kgPerKWhTh, 3)} <span className="text-ink-2">kgCO₂e/kWh<Sub>th</Sub></span>
                  </span>
                  <Evidence tag={h.tag} />
                </span>
              </p>
              <p className="mt-1.5 text-small text-ink-2"><U>{h.note}</U></p>
            </li>
          ))}
        </ul>
      </Disclosure>

      <Disclosure title="Putusan desikan menurut suhu regenerasi" hint={DESICCANT_STATUS} level={4}>
        <p>Batas atas: tanpa daya pompa dan penalti PV, pada kondisi hari terik pukul 13.00, udara regenerasi {regenAir === 'ambient' ? 'luar' : 'buangan hotel'}.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[22rem] border-collapse text-left text-small">
            <caption className="sr-only">Putusan desikan dan penghematan bersih listrik menurut suhu regenerasi</caption>
            <thead>
              <tr className="border-b border-line-strong text-label text-ink-2">
                <th scope="col" className="py-2 pr-3 font-medium">Suhu regenerasi</th>
                <th scope="col" className="py-2 pr-3 font-medium">Putusan</th>
                <th scope="col" className="py-2 pr-3 text-right font-medium">Penghematan bersih</th>
                <th scope="col" className="py-2 text-right font-medium">Rasio COP impas</th>
              </tr>
            </thead>
            <tbody>
              {sweep.map((e) => (
                <tr key={e.regenC} className="border-b border-line">
                  <th scope="row" className="num py-2 pr-3 text-left font-normal text-ink">{formatId(e.regenC, 0)} °C</th>
                  <td className="py-2 pr-3 text-ink">{e.operating ? LABELS.verdict[e.verdict] : 'Tidak bekerja'}</td>
                  <td className="num py-2 pr-3 text-right text-mono-label text-ink">
                    {e.operating ? formatId(e.hvac.netSavingWe / 1000, 2) : '—'} <span className="text-ink-2">kW<Sub>e</Sub></span>
                  </td>
                  <td className="num py-2 text-right text-mono-label text-ink">{e.breakEvenCopRatio === null || !e.operating ? '—' : formatId(e.breakEvenCopRatio, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {worthwhile.length === 0 ? <p className="mt-3">Pada suhu mana pun di tabel, unggun desikan hampir tidak melepas uap air.</p> : null}
      </Disclosure>
    </>
  );
}

/**
 * "Rincian rekayasa" (L3): ringkasan persamaan, semua asumsi menurut modul (nilai, tanda bukti, rujukan),
 * batas model, dan kalimat "tidak menguntungkan". Terbuka otomatis lewat tautan `#lab-rincian`.
 */
export default function Rincian() {
  const view = useSystemView();
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

  const groups = useMemo(() => {
    const all = view.assumptions();
    return MODULES.map((m) => ({ ...m, items: all.filter((a) => a.module === m.key) })).filter((g) => g.items.length > 0);
  }, [view]);
  const total = groups.reduce((s, g) => s + g.items.length, 0);

  return (
    <div id="lab-rincian" className="scroll-mt-20">
      <Disclosure title="Rincian rekayasa" hint="Persamaan, asumsi, batas model" level={3} open={open} onOpenChange={setOpen} className="max-w-none">
        <p className="text-ink">Simulasi konseptual untuk edukasi; bukan CFD tervalidasi, uji lapangan, atau alat penilai kinerja bersertifikat.</p>
        <div className="mt-4 -mx-px">
          <Disclosure title="Persamaan yang dipakai" hint="Untuk yang ingin memeriksa" level={4}>
            <div className="space-y-4">
              <Equation label="Kolektor: penukar panas ε–NTU">
                NTU = U<Sub>pf</Sub>·A / (ṁ·c<Sub>p</Sub>)
                <br />ε = 1 − e<sup>−NTU</sup>
                <br />Q<Sub>cairan</Sub> = ε·ṁ·c<Sub>p</Sub>·(T<Sub>pelat</Sub> − T<Sub>masuk</Sub>)
              </Equation>
              <Equation label="Kolektor: neraca energi simpul panel">
                τα·G·A = P<Sub>e</Sub> + Q<Sub>cairan</Sub> + Q<Sub>depan</Sub> + Q<Sub>belakang</Sub> + Q<Sub>hujan</Sub>
              </Equation>
              <Equation label="Tangki dua simpul: hukum pertama">
                C<Sub>simpul</Sub>·dT/dt = Q<Sub>isi</Sub> − Q<Sub>lepas</Sub> − UA·(T − T<Sub>udara</Sub>) ± G<Sub>campur</Sub>·ΔT<Sub>simpul</Sub>
                <br />ΔU<Sub>tangki</Sub> = ∫(Q<Sub>isi</Sub> − Q<Sub>lepas</Sub> − Q<Sub>rugi</Sub>)dt
              </Equation>
              <Equation label="Rantai penukar panas seri untuk air minum">
                air pasok → sumber lebih dingin → sumber lebih panas → pemanas yang ada
                <br />Q<Sub>tahap</Sub> = ε·ṁ·c<Sub>p</Sub>·(T<Sub>sumber</Sub> − T<Sub>masuk tahap</Sub>), ε = 0,7
              </Equation>
              <Equation label="Desikan: neraca listrik bersih">
                Hemat<Sub>e</Sub> = P<Sub>koil acuan</Sub> − (P<Sub>pendingin lanjutan</Sub> + P<Sub>kipas</Sub> + P<Sub>pompa</Sub> + ΔP<Sub>PV</Sub>)
                <br />adsorpsi ≈ isentalpi: "uap air dibuang" saja bukan penghematan
              </Equation>
              <Equation label="Buku besar karbon">
                Bersih = Σ dihindari − tertanam − parasitik
                <br />listrik: kWh<Sub>e</Sub> × EF jaringan · LPG: kWh<Sub>th</Sub> / η × EF LPG
              </Equation>
              <p className="text-small text-ink-2">
                kWh<Sub>th</Sub>, kWh<Sub>e</Sub>, dan kWh bahan bakar tidak dijumlahkan tanpa faktor yang ditampilkan (efisiensi pemanas, COP, faktor emisi).
              </p>
            </div>
          </Disclosure>

          <Disclosure title="Asumsi" hint={`${total} butir, ${groups.length} modul`} level={4}>
            <div className="-mx-px">
              {groups.map((g) => (
                <Disclosure key={g.key} title={g.title} hint={`${g.items.length} butir`} level={4}>
                  <AssumptionList items={g.items} />
                </Disclosure>
              ))}
            </div>
          </Disclosure>

          {open ? <Computed /> : null}

          <Disclosure title="Batas model" hint={`${LIMITS.length} butir`} level={4}>
            <ul className="m-0 list-none space-y-3 p-0">
              {LIMITS.map((l) => (
                <li key={l} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-ink-3" />
                  <span>{l}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4">
              Langkah validasi berikutnya ada di <a className="underline underline-offset-4" href="#validasi">bagian Validasi</a>.
            </p>
          </Disclosure>

          <Disclosure title="Konvensi tanda dan satuan" level={4}>
            <ul className="m-0 list-none space-y-2 p-0">
              <li>Panas hanya mengalir dari sel ke cairan, lalu ke tujuan yang dipilih router; cairan selalu mengalir dari masuk ke keluar.</li>
              <li>Lebar cabang pada skema sebanding dengan W<Sub>th</Sub> yang dialokasikan; jumlahnya tetap saat pompa jalan.</li>
              <li>Putus-putus berarti belum divalidasi (jalur desikan dan sumber pompa kalor).</li>
              <li>
                W<Sub>th</Sub> dan W<Sub>e</Sub> tidak dijumlahkan tanpa konversi yang ditampilkan.
              </li>
            </ul>
          </Disclosure>
        </div>
      </Disclosure>
    </div>
  );
}
