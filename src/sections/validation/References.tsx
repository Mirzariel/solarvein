import { useEffect, useMemo, useState } from 'react';
import { REFERENCES, type Reference } from '../../sim/system';
import { Disclosure, formatId } from '../../ui';

/** Alphabetical APA order by the first author; non-Latin leading characters are skipped. */
const byApa = (a: Reference, b: Reference) => a.apa.replace(/^[^\p{L}]+/u, '').localeCompare(b.apa.replace(/^[^\p{L}]+/u, ''), 'id');

function Item({ r, secondary }: { r: Reference; secondary?: boolean }) {
  const inText = r.url !== null && r.apa.includes(r.url);
  return (
    <li id={`ref-${r.id}`} className="scroll-mt-20 py-2 pl-6 -indent-6 text-small text-ink-2">
      {r.apa}
      {r.url && !inText ? (
        <>
          {' '}
          <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-ink underline decoration-line-strong underline-offset-2 hover:decoration-ink">
            {r.url}
          </a>
        </>
      ) : null}
      {secondary ? <span className="num ml-2 text-mono-label text-ink-3">sekunder</span> : null}
    </li>
  );
}

/**
 * Pustaka (APA 7), generated from REFERENCES: sources whose values were read in the source itself first,
 * then the ones seen only in summaries, each marked "sekunder". The block opens itself on #pustaka.
 */
export function References() {
  const { verified, secondary } = useMemo(() => {
    const all = Object.values(REFERENCES) as Reference[];
    return { verified: all.filter((r) => r.verified).sort(byApa), secondary: all.filter((r) => !r.verified).sort(byApa) };
  }, []);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => {
      if (window.location.hash === '#pustaka') setOpen(true);
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  return (
    <div id="pustaka" className="scroll-mt-20">
      <Disclosure
        title="Pustaka"
        hint="APA 7"
        level={3}
        open={open}
        onOpenChange={setOpen}
      >
        <div className="max-w-none">
          <p className="m-0 mb-2 text-small text-ink">Dibaca di sumbernya ({formatId(verified.length, 0)})</p>
          <ul className="m-0 list-none p-0">
            {verified.map((r) => (
              <Item key={r.id} r={r} />
            ))}
          </ul>
          {secondary.length > 0 ? (
            <>
              <p className="m-0 mb-2 mt-6 text-small text-ink">Sekunder, angkanya belum dibaca di sumber utama ({formatId(secondary.length, 0)})</p>
              <ul className="m-0 list-none p-0">
                {secondary.map((r) => (
                  <Item key={r.id} r={r} secondary />
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </Disclosure>
    </div>
  );
}
