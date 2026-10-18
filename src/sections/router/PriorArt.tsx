import type { ReactNode } from 'react';
import { Evidence, typo } from '../../ui';
import type { EvidenceTag, RefId } from '../../sim/system';

interface Item {
  text: ReactNode;
  tag: EvidenceTag;
  ref?: RefId;
}

/** From docs/research/prior-art.md. Existing work is tagged by what it is (published); ours is "usulan". */
const EXISTING: Item[] = [
  { text: typo('PV/T untuk air panas, termasuk di daerah tropis.'), tag: 'terbit', ref: 'iea-shc-t60-d5' },
  { text: typo('PV/T sebagai sumber pompa kalor, juga di bawah suhu lingkungan.'), tag: 'terbit', ref: 'iea-shc-t60-d5' },
  { text: typo('Regenerasi desikan dengan panas PV/T pernah dimodelkan.'), tag: 'terbit', ref: 'guo2022-pvt-desiccant' },
  { text: typo('Pemulihan kalor kondensor AC untuk air panas hotel, termasuk studi di Bali.'), tag: 'terbit', ref: 'suamir2015-hp-heat-recovery' },
  { text: typo('Pemilihan mode PV/T oleh kontroler, pada sistem rumah tangga.'), tag: 'terbit', ref: 'fiorentini2015-mpc-pvt-pcm' },
];
const NEW: Item[] = [
  {
    text: (
      <>
        {typo('Satu aliran panas bersuhu rendah dibagi ke air panas, desikan, tangki, dan tidak dipakai (bypass) menurut nilai per kWh')}
        <sub>th</sub>.
      </>
    ),
    tag: 'usulan',
  },
  { text: typo('Perbandingan layanan setara dengan empat pembanding. B2 dan B4 bisa menang.'), tag: 'usulan' },
  { text: typo('Rantai malam dan hujan panjang dihitung dengan faktor Indonesia.'), tag: 'usulan' },
  { text: typo('Penalti desikan pada 35–70 °C dihitung terbuka, bukan diasumsikan.'), tag: 'usulan' },
];

function Column({ title, items }: { title: string; items: Item[] }) {
  return (
    <div>
      <h4 className="m-0 flex items-center gap-3 text-ui text-ink">
        {title}
        <Evidence tag={items[0]?.tag ?? 'usulan'} label />
      </h4>
      <ul className="mt-3 list-none space-y-3 p-0">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3 text-body-s text-ink-2">
            <span className="mt-[7px] shrink-0">
              <Evidence tag={it.tag} refId={it.ref} />
            </span>
            <span>{it.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Content of the "Apa yang sudah ada, apa yang baru" disclosure (the disclosure title is its heading). */
export default function PriorArt() {
  return (
    <div data-prior-art className="space-y-8">
      <Column title="Sudah ada" items={EXISTING} />
      <Column title="Yang baru" items={NEW} />
      <p className="m-0 text-body text-ink">
        {typo('Router ini berbasis nilai: peringkat tetap nilai per kWh')}
        <sub>th</sub>
        {typo(' dengan histeresis. Bukan carbon-aware real-time, karena Indonesia belum punya faktor emisi per jam.')}
      </p>
      <p className="m-0">
        {typo('Batas klaim kebaruan: pencarian pustaka terbatas (sekitar 40 kueri), bukan tinjauan sistematis; tidak menemukan bukan berarti tidak ada. Kebaruan yang bisa dipertahankan ada pada kerangka alokasi dan akuntansinya, bukan pada satu komponen. Jalur desikan bertumpu pada hasil bangku uji, kolektor tanpa kaca sulit mencapai 55–60 °C, dan B4 bisa menutup sebagian besar air panas hotel tanpa memakai atap.')}
      </p>
    </div>
  );
}
