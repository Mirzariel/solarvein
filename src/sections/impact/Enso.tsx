import { RainIcon, SunIcon } from '../../ui';

/**
 * Konteks iklim (El Niño / La Niña): dua keadaan sebagai KONTEKS, bukan sakelar. Tidak membaca dan tidak menulis
 * masukan model. Hanya ada di dalam disclosure.
 */
export function Enso() {
  return (
    <div className="space-y-5">
      <p>
        Kemarau yang lebih panjang berarti lebih banyak jam cerah; musim yang lebih basah berarti lebih banyak jam hujan. Ubah jam setara per tahun untuk melihat selisihnya. Pengaruhnya berbeda tiap wilayah dan bulan.
      </p>
      <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border-t border-line pt-3">
          <dt className="flex items-center gap-3 text-body font-medium text-ink">
            <SunIcon size={20} className="text-ink-2" />
            El Niño
          </dt>
          <dd className="m-0 mt-1">Cenderung lebih kering dan cerah.</dd>
        </div>
        <div className="border-t border-line pt-3">
          <dt className="flex items-center gap-3 text-body font-medium text-ink">
            <RainIcon size={20} className="text-ink-2" />
            La Niña
          </dt>
          <dd className="m-0 mt-1">Cenderung lebih basah dan berawan.</dd>
        </div>
      </dl>
      <p className="text-ink">Konteks, bukan sakelar: mode kerja mengikuti kondisi terukur, bukan kalender atau nama fenomena.</p>
      <ul className="m-0 list-none space-y-1 p-0 text-small">
        <li>La Niña bukan hujan terus-menerus.</li>
        <li>Sistem ini tidak menyelesaikan banjir.</li>
        <li>Tidak ada pendinginan otomatis sepanjang musim hujan.</li>
      </ul>
    </div>
  );
}
