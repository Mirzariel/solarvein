import { REFERENCES, type AssumptionEntry, type EvidenceTag, type RefId } from '../sim/system';

/** Short in-figure citation from an APA string: "Pesaran & Mills (1987)", "Garg dkk. (2006)". */
export function shortCite(id: RefId): string {
  const ref = (REFERENCES as Record<string, { apa: string }>)[id];
  if (!ref) return id;
  const m = /^(.*?)\s\((\d{4}[a-z]?|n\.d\.)\)/.exec(ref.apa);
  if (!m) return id;
  const authors = m[1] ?? '';
  const year = m[2];
  const surnames = authors
    .split(/\.,\s|&/)
    .map((p) => p.trim().split(',')[0]?.trim())
    .filter((p): p is string => !!p && p.length > 1);
  const first = surnames[0] ?? authors;
  const who = surnames.length === 1 ? first : surnames.length === 2 ? `${first} & ${surnames[1]}` : `${first} dkk.`;
  return `${who} (${year})`;
}

export interface EvidenceSummary {
  tags: EvidenceTag[];
  refIds: RefId[];
}

const TAG_ORDER: EvidenceTag[] = ['mapan', 'terbit', 'simulasi', 'asumsi', 'hipotesis', 'usulan'];

/** Unique tags (taxonomy order) and refIds over assumption entries, plus extra tags/refs. */
export function summarize(entries: readonly Pick<AssumptionEntry, 'tag' | 'refId'>[], extra: Partial<EvidenceSummary> = {}): EvidenceSummary {
  const tags = new Set<EvidenceTag>(extra.tags ?? []);
  const refs = new Set<RefId>(extra.refIds ?? []);
  for (const e of entries) {
    tags.add(e.tag);
    if (e.refId) refs.add(e.refId as RefId);
  }
  return { tags: TAG_ORDER.filter((t) => tags.has(t)), refIds: [...refs] };
}
