import { SectionHeader } from '../ui';
import { SECTION } from './nav';

/** Placeholder used until the owning worker ships the real section (keeps ids, numbering and anchors live). */
export default function SectionStub({ id }: { id: string }) {
  const def = SECTION[id];
  return (
    <section id={id} aria-labelledby={`${id}-judul`} className="page-wrap py-24">
      <SectionHeader
        id={`${id}-judul`}
        index={def?.n ? { n: def.n, label: def.label } : undefined}
        title={def?.label ?? id}
        lead="Bagian ini sedang dibangun."
      />
    </section>
  );
}
