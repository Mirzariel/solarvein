import { useSimResult } from '../../state';
import { Disclosure, StatusDot, type Tone } from '../../ui';

/** Catatan model, satu kali (bukan di Hero dan Lab sekaligus): peringatan tampil, info di disclosure. */
export function Notes() {
  const r = useSimResult();
  const list = r.advisories.filter((a) => a.code !== 'REJECTION_NOT_BENEFICIAL');
  if (list.length === 0) return null;
  const important = list.filter((a) => a.severity !== 'info');
  const info = list.filter((a) => a.severity === 'info');
  const tone = (s: string): Tone => (s === 'critical' ? 'critical' : s === 'warning' ? 'warning' : 'neutral');
  return (
    <div className="mt-6">
      {important.length > 0 ? (
        <ul className="m-0 list-none space-y-2 p-0" aria-label="Peringatan model">
          {important.map((a) => (
            <li key={a.code} className="flex items-start gap-3 text-body text-ink">
              <StatusDot tone={tone(a.severity)} className="shrink-0 pt-[3px]">
                {a.severity === 'critical' ? 'Kritis' : 'Peringatan'}
              </StatusDot>
              <span>{a.message}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {info.length > 0 ? (
        <Disclosure title={`Catatan dari model (${info.length})`} level={4} className={important.length > 0 ? 'mt-4' : undefined}>
          <ul className="m-0 list-none space-y-2 p-0">
            {info.map((a) => (
              <li key={a.code}>{a.message}</li>
            ))}
          </ul>
        </Disclosure>
      ) : null}
    </div>
  );
}
