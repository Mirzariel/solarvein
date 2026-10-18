import { LABELS, type EvidenceTag } from '../../sim/system';
import { EvidenceDot } from '../../ui';

const ITEMS: readonly { tag: EvidenceTag; means: string }[] = [
  { tag: 'mapan', means: 'Prinsip fisika atau praktik yang sudah dikenal.' },
  { tag: 'terbit', means: 'Angka dari sumber terbit; rujukan ada di Pustaka.' },
  { tag: 'simulasi', means: 'Keluaran model situs ini dari asumsi di Lab.' },
  { tag: 'asumsi', means: 'Nilai rekayasa yang dipilih, belum bersumber terbit.' },
  { tag: 'hipotesis', means: 'Dugaan riset yang belum diuji.' },
  { tag: 'usulan', means: 'Gagasan baru yang diusulkan sistem ini.' },
];

/** One compact row, all six tags (shape only, never colour). The meaning of each is its title and screen-reader text. */
export function EvidenceLegend() {
  return (
    <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 border-t border-line p-0 pt-4">
      {ITEMS.map((it) => (
        <li key={it.tag} title={it.means} className="flex items-center gap-2 text-small text-ink-2">
          <EvidenceDot tag={it.tag} size={10} className="text-ink-2" />
          {LABELS.evidence[it.tag]}
          <span className="sr-only">: {it.means}</span>
        </li>
      ))}
    </ul>
  );
}
