import { memo, useEffect } from 'react';
import { InfoTip, Slider, type SliderProps } from '../../ui';

/**
 * Slider rapat dengan ⓘ di tepi kanan (penjelasan = L2, tidak tampil terus-menerus).
 * `help` jadi isi tooltip; slider sendiri tetap `compact` agar tidak ada teks bantuan permanen.
 */
function SliderRowImpl({ help, ...rest }: SliderProps & { help?: string }) {
  // nama aksesibel eksplisit pada <input type=range> (selain <label for>): terbaca juga oleh alat uji yang mencari aria-label
  useEffect(() => {
    document.getElementById(rest.id)?.setAttribute('aria-label', rest.label);
  }, [rest.id, rest.label]);
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3">
      <Slider density="compact" {...rest} />
      {help ? (
        <span className="pt-2 pointer-coarse:pt-3">
          <InfoTip label={`Keterangan: ${rest.label}`} side="left">
            {help}
          </InfoTip>
        </span>
      ) : (
        <span aria-hidden="true" className="w-4" />
      )}
    </div>
  );
}

/** Memo: satu tick slider tidak merender ulang slider lain (props primitif + onChange stabil). */
export const SliderRow = memo(SliderRowImpl);
