import { LABELS, type EvidenceTag } from '../../sim/system';
import { EvidenceDot } from '../../ui';

const ITEMS: readonly { tag: EvidenceTag; group: string; means: string }[] = [
  { tag: 'mapan', group: 'Fondasi', means: 'Prinsip fisika atau praktik yang sudah dikenal.' },
  { tag: 'terbit', group: 'Fondasi', means: 'Angka dari sumber terbit; rujukan ada di Pustaka.' },
  { tag: 'simulasi', group: 'Terhitung', means: 'Keluaran model situs ini dari asumsi di Lab.' },
  { tag: 'asumsi', group: 'Terhitung', means: 'Nilai rekayasa yang dipilih, belum bersumber terbit.' },
  { tag: 'hipotesis', group: 'Diusulkan', means: 'Dugaan riset yang belum diuji.' },
  { tag: 'usulan', group: 'Diusulkan', means: 'Gagasan baru yang diusulkan sistem ini.' },
];

/** All six tags, shape only (never colour). Grouped as in the evidence taxonomy. */
export function EvidenceLegend() {
  return (
    <dl className="m-0 grid gap-x-8 gap-y-0 sm:grid-cols-2 lg:grid-cols-3">
      {ITEMS.map((it) => (
        <div key={it.tag} className="border-t border-line py-3">
          <dt className="flex items-center gap-2.5 text-body font-medium text-ink">
            <EvidenceDot tag={it.tag} size={10} className="text-ink-2" />
            {LABELS.evidence[it.tag]}
            {it.tag === 'terbit' ? <span aria-hidden="true" className="num text-[11px] text-ink-2">↗</span> : null}
            <span className="num ml-auto text-mono-label font-normal text-ink-3">{it.group}</span>
          </dt>
          <dd className="m-0 mt-1 text-small text-ink-2">{it.means}</dd>
        </div>
      ))}
    </dl>
  );
}
