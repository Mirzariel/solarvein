import { Disclosure, SectionHeader } from '../ui';
import { EvidenceLegend } from './validation/EvidenceLegend';
import { Kpis } from './validation/Kpis';
import { References } from './validation/References';
import { Risks } from './validation/Risks';
import { Roadmap } from './validation/Roadmap';

/**
 * 08 Validasi: what could refute SolarVein. Five phases, six ranked risks (compact rows), the KPIs behind a
 * disclosure, a one-line evidence legend, the essay/website note, the concept-evolution note and the reference list (#pustaka).
 */
export default function Validation() {
  return (
    <section id="validasi" aria-labelledby="validasi-judul" className="scroll-mt-14 overflow-x-clip border-t border-line bg-paper py-24 lg:py-32">
      <div className="page-wrap">
        <SectionHeader
          id="validasi-judul"
          index={{ n: '08', label: 'Validasi' }}
          title="Yang bisa membantah SolarVein"
          lead="Tiap risiko punya angka simulasi sekarang dan percobaan yang mengujinya."
        />

        <div className="mt-12 lg:mt-16">
          <Roadmap />
        </div>

        <div className="mt-14 lg:mt-20">
          <h3 className="m-0 mb-1 text-h3 text-ink">Risiko teknis, berurutan</h3>
          <p className="m-0 mb-4 max-w-[64ch] text-small text-ink-2">Urutan adalah penilaian pengembang atas dampak dan kemungkinan, bukan hasil hitung.</p>
          <Risks />
        </div>

        <div className="mt-12 max-w-4xl">
          <Disclosure title="Indikator kinerja">
            <div className="w-[min(40rem,calc(100vw-2rem))]">
              <Kpis />
            </div>
          </Disclosure>
          <Disclosure title="Evolusi ide">
            <p className="m-0">
              Rancangan awal memakai satu panel dengan dua mode: Cerah mengumpulkan panas, Hujan membuang panas dari loop hangat. Mode Hujan dilepas karena panas buangan bukan listrik yang dihemat, dan hujan tetap membawa cahaya sebaran sehingga panel tidak pernah benar-benar mati.
              Yang terbawa ke rancangan sekarang adalah fisika perpindahan panas panel (konveksi, radiasi ke langit, hujan) dan satu gagasan: PV/T sebagai sumber pompa kalor saat malam dan hujan, kini jalur riset yang kemungkinan marginal dibanding B2.
              El Niño dan La Niña tinggal sebagai konteks iklim, bukan sakelar, karena mode kerja mengikuti suhu dan cahaya terukur, bukan kalender.
            </p>
          </Disclosure>
          <References />
        </div>

        <div className="mt-12 max-w-4xl">
          <EvidenceLegend />
          <p className="m-0 mt-6 max-w-[64ch] text-small text-ink-2">
            <span className="text-ink">Catatan versi. </span>
            Situs ini adalah versi pengembangan dari karya HORIZON 2026. Angkanya bisa berbeda dari esai yang dikirim. Selisih dengan esai: lihat catatan presentasi.
          </p>
        </div>
      </div>
    </section>
  );
}
