import { Disclosure, Evidence, typo } from '../../ui';
import type { EvidenceTag, RefId } from '../../sim/system';

interface Item {
  text: string;
  tag: EvidenceTag;
  ref?: RefId;
}

/** From docs/research/prior-art.md. Existing work is tagged by what it is (published/established); ours is "usulan". */
const EXISTING: Item[] = [
  { text: 'PV/T untuk air panas, termasuk di daerah tropis.', tag: 'terbit', ref: 'iea-shc-t60-d5' },
  { text: 'PV/T sebagai sumber pompa kalor, juga di bawah suhu lingkungan.', tag: 'terbit', ref: 'iea-shc-t60-d5' },
  { text: 'Regenerasi desikan dengan panas PV/T pernah dimodelkan.', tag: 'terbit', ref: 'guo2022-pvt-desiccant' },
  { text: 'Pemulihan kalor kondensor AC untuk air panas hotel, termasuk studi di Bali.', tag: 'terbit', ref: 'suamir2015-hp-heat-recovery' },
  { text: 'Pemilihan mode PV/T oleh kontroler, pada sistem rumah tangga.', tag: 'terbit', ref: 'fiorentini2015-mpc-pvt-pcm' },
];
const NEW: Item[] = [
  { text: 'Satu aliran panas bersuhu rendah dibagi ke air panas, desikan, tangki, dan bypass menurut nilai per kWh_th.', tag: 'usulan' },
  { text: 'Perbandingan layanan setara dengan empat pembanding. B2 dan B4 bisa menang.', tag: 'usulan' },
  { text: 'Rantai malam dan hujan panjang dihitung dengan faktor Indonesia.', tag: 'usulan' },
  { text: 'Penalti desikan pada 35–70 °C dihitung terbuka, bukan diasumsikan.', tag: 'usulan' },
];

function Column({ title, items }: { title: string; items: Item[] }) {
  return (
    <div>
      <h4 className="flex items-center gap-3 text-ui text-ink">{title}<Evidence tag={items[0]!.tag} label /></h4>
      <ul className="mt-3 list-none space-y-3 p-0">
        {items.map((it) => (
          <li key={it.text} className="flex items-start gap-3 text-body-s text-ink-2">
            <span className="mt-[5px] shrink-0">
              <Evidence tag={it.tag} refId={it.ref} />
            </span>
            <span>{typo(it.text)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function PriorArt() {
  return (
    <div data-prior-art>
      <h3 className="text-h3">Apa yang sudah ada, apa yang baru</h3>
      <div className="mt-8 grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
        <Column title="Sudah ada" items={EXISTING} />
        <Column title="Yang baru" items={NEW} />
      </div>
      <p className="mt-8 max-w-[64ch] text-body text-ink">
        {typo('Router ini berbasis nilai: peringkat tetap nilai per kWh_th dengan histeresis. Bukan carbon-aware real-time, karena Indonesia belum punya faktor emisi per jam.')}
      </p>
      <Disclosure title="Batas klaim kebaruan" className="mt-6" level={4}>
        <p>
          {typo('Pencarian pustaka terbatas (sekitar 40 kueri), bukan tinjauan sistematis; tidak menemukan bukan berarti tidak ada. Kebaruan yang bisa dipertahankan ada pada kerangka alokasi dan akuntansinya, bukan pada satu komponen. Jalur desikan bertumpu pada hasil bangku uji, kolektor tanpa kaca sulit mencapai 55–60 °C, dan B4 bisa menutup sebagian besar air panas hotel tanpa memakai atap.')}
        </p>
      </Disclosure>
    </div>
  );
}
