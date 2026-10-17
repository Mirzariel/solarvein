import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { DEFAULT_SYSTEM, type SystemInputs } from '../../sim/system';
import { useSystemStore, type SystemPatch } from '../../state/system';
import { Toggle, formatId } from '../../ui';
import { SliderRow } from './SliderRow';

/**
 * Slider yang terikat ke satu bagian SystemInputs. `spec` adalah konstanta tingkat modul, sehingga komponen
 * (memo) hanya render ulang bila nilainya sendiri berubah; menulis lewat setSys (satu aksi store).
 */
export interface SysSliderSpec {
  id: string;
  label: string;
  unit?: string;
  min: number;
  max: number;
  step: number;
  get: (s: SystemInputs) => number;
  /** Patch untuk nilai baru; `s` = sistem saat ini (untuk nilai turunan seperti UA tangki). */
  patch: (n: number, s: SystemInputs) => SystemPatch;
  help: string;
  /** Tampilan khusus; kolom nilai menjadi hanya-baca bila `readOnlyValue`. */
  format?: (n: number) => string;
  readOnlyValue?: boolean;
}

const decimalsOf = (step: number) => {
  const s = String(step);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};

/**
 * Satu perubahan sistem membuat semua bagian yang membaca store menghitung ulang (simulasi hari dan render). Agar jari tetap
 * mulus: slider menampilkan nilai draf seketika, dan menulis ke store paling cepat satu kali per selang yang
 * mengikuti biaya NYATA penulisan terakhir (penulisan sinkron sampai dua frame tergambar, dikali 2; minimal 60 ms,
 * maksimal 900 ms). Nilai terakhir selalu ditulis (trailing), sehingga thread utama punya jeda untuk masukan.
 */
function SysSliderImpl({ spec, disabled }: { spec: SysSliderSpec; disabled?: boolean }) {
  const stored = useSystemStore((s) => spec.get(s.sys));
  const [draft, setDraft] = useState<number | null>(null);
  const pending = useRef<number | null>(null);
  const busy = useRef(false);
  const timer = useRef<number | null>(null);

  /** Tulis ke store; panggil done(selang) setelah dua frame tergambar. */
  const commit = useCallback(
    (n: number, done: (gapMs: number) => void) => {
      const st = useSystemStore.getState();
      const t0 = performance.now();
      st.setSys(spec.patch(n, st.sys));
      requestAnimationFrame(() => requestAnimationFrame(() => done(Math.max(60, Math.min(900, (performance.now() - t0) * 2)))));
    },
    [spec],
  );

  const onChange = useCallback(
    (n: number) => {
      setDraft(n);
      if (busy.current) {
        pending.current = n; // trailing: ditulis setelah selang
        return;
      }
      busy.current = true;
      const after = (gapMs: number) => {
        timer.current = window.setTimeout(() => {
          timer.current = null;
          if (pending.current !== null) {
            const v = pending.current;
            pending.current = null;
            commit(v, after);
          } else {
            busy.current = false;
            setDraft(null);
          }
        }, gapMs);
      };
      commit(n, after);
    },
    [commit],
  );

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );
  // nilai store berubah dari luar (setel ulang, preset): lepaskan draf bila tidak ada penulisan tertunda
  useEffect(() => {
    if (!busy.current) setDraft(null);
    else if (draft !== null && Math.abs(stored - draft) < 1e-9 && pending.current === null) setDraft(null);
  }, [stored, draft]);

  const value = draft ?? stored;
  const def = spec.get(DEFAULT_SYSTEM);
  return (
    <SliderRow
      id={spec.id}
      label={spec.label}
      unit={spec.unit}
      value={value}
      min={spec.min}
      max={spec.max}
      step={spec.step}
      format={spec.format ?? ((n) => formatId(n, decimalsOf(spec.step)))}
      editable={!spec.readOnlyValue}
      defaultValue={def}
      help={spec.help}
      disabled={disabled}
      onChange={onChange}
    />
  );
}
export const SysSlider = memo(SysSliderImpl);

/** Toggle terikat ke satu boolean di SystemInputs. */
function SysToggleImpl({
  id,
  label,
  description,
  get,
  patch,
  disabled,
}: {
  id: string;
  label: string;
  description?: string;
  get: (s: SystemInputs) => boolean;
  patch: (v: boolean) => SystemPatch;
  disabled?: boolean;
}) {
  const checked = useSystemStore((s) => get(s.sys));
  const onChange = useCallback((v: boolean) => useSystemStore.getState().setSys(patch(v)), [patch]);
  return <Toggle id={id} label={label} description={description} checked={checked} onChange={onChange} disabled={disabled} />;
}
export const SysToggle = memo(SysToggleImpl);

export function Group({ id, title, note, children }: { id: string; title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={`lab-g-${id}`} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 id={`lab-g-${id}`} className="text-label text-ink-2">
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
      {note ? <p className="mt-3 text-small text-ink-2">{note}</p> : null}
    </div>
  );
}
