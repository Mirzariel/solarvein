import { ChartCard } from '../charts/ChartCard';
import { Disclosure, SectionHeader } from '../ui';
import { EvidenceLegend } from './validation/EvidenceLegend';
import { Kpis } from './validation/Kpis';
import { References } from './validation/References';
import { Risks } from './validation/Risks';
import { Roadmap } from './validation/Roadmap';

/**
 * 08 Validasi: what still has to be measured. Five phases, KPIs with today's simulated value, ranked risks,
 * the evidence legend, the concept-evolution note, the essay/website note and the reference list (#pustaka).
 */
export default function Validation() {
  return (
    <section id="validasi" aria-labelledby="validasi-judul" className="scroll-mt-14 overflow-x-clip border-t border-line bg-paper py-24 lg:py-32">
      <div className="page-wrap">
        <SectionHeader
          id="validasi-judul"
          index={{ n: '08', label: 'Validasi' }}
          title="Yang masih harus diukur."
          lead="Semua angka di bagian ini: hasil simulasi. Belum ada data ukur; lima fase di bawah menggantinya satu per satu."
        />

        <div className="mt-12 lg:mt-16">
          <Roadmap />
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard title="Indikator kinerja" subtitle="Nilai simulasi hari ini, dan fase yang mengukurnya.">
            <Kpis />
          </ChartCard>
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard title="Risiko teknis, berurutan" subtitle="Urutan adalah penilaian pengembang atas dampak dan kemungkinan, bukan hasil hitung.">
            <Risks />
          </ChartCard>
        </div>

        <div className="mt-16 lg:mt-24">
          <ChartCard title="Tanda bukti" subtitle="Bentuk titik menunjukkan jenis bukti di balik tiap angka; warna tidak dipakai.">
            <EvidenceLegend />
          </ChartCard>
        </div>

        <div className="mt-16 max-w-4xl border-t border-line pt-5 lg:mt-24">
          <h3 className="m-0 text-body font-medium text-ink">Catatan versi</h3>
          <p className="m-0 mt-2 max-w-[64ch] text-body text-ink-2">
            Situs ini adalah versi pengembangan dari karya HORIZON 2026. Angkanya bisa berbeda dari esai yang dikirim. Selisih dengan esai: lihat catatan presentasi.
          </p>
        </div>

        <div className="mt-12 max-w-4xl">
          <Disclosure title="Evolusi ide" hint="Dari Cerah dan Hujan ke perutean panas">
            <p className="m-0">
              Rancangan awal memakai satu panel dengan dua mode: Cerah mengumpulkan panas, Hujan membuang panas dari loop hangat. Mode Hujan dilepas karena panas buangan bukan listrik yang dihemat, dan hujan tetap membawa cahaya sebaran sehingga panel tidak pernah benar-benar mati.
              Yang terbawa ke rancangan sekarang adalah fisika perpindahan panas panel (konveksi, radiasi ke langit, hujan) dan satu gagasan: PV/T sebagai sumber pompa kalor saat malam dan hujan, kini jalur riset yang kemungkinan marginal dibanding B2.
              El Niño dan La Niña tinggal sebagai konteks iklim, bukan sakelar, karena mode kerja mengikuti suhu dan cahaya terukur, bukan kalender.
            </p>
          </Disclosure>
          <References />
        </div>
      </div>
    </section>
  );
}
