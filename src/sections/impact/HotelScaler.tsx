import { useDeferredValue, useEffect, useRef, useState } from 'react';
import { HOTEL_PRESETS, type BaselineComparison } from '../../sim/system';
import { useSystem } from '../../state/systemSelectors';
import { useSystemStore } from '../../state/system';
import { Evidence, SegmentedControl, Slider, formatId, formatSigned, type SegmentedOption } from '../../ui';
import { ton } from './format';
import { BPS, sizingFor, type PresetId } from './scale';

const PRESET_OPTIONS: readonly SegmentedOption<PresetId>[] = [
  { value: 'hotel-100', label: 'Hotel 100 kamar', description: HOTEL_PRESETS['hotel-100'].label },
  { value: 'penginapan-kecil', label: 'Penginapan kecil', description: HOTEL_PRESETS['penginapan-kecil'].label },
];

type Mult = 'satu' | 'bali' | 'indonesia' | 'nonbintang' | 'bebas';

/**
 * Hotel preset (drives the whole section). The recompute is heavy, so the click first paints a pending state
 * ("Menghitung ulang…"), then applies ONE store update; the results themselves render through the deferred view.
 */
export function PresetSwitch() {
  const sys = useSystem();
  const deferred = useDeferredValue(sys);
  const preset = useSystemStore((s) => s.hotelPreset);
  const [asked, setAsked] = useState<PresetId | null>(null);
  const applied = useRef(false);
  const stale = deferred !== sys;
  const areaM2 = sys.array.modules * sys.array.module.areaM2;

  useEffect(() => {
    if (asked && applied.current && !stale) {
      setAsked(null);
      applied.current = false;
    }
  }, [asked, stale]);

  const choose = (id: PresetId) => {
    if (id === preset || asked) return;
    setAsked(id);
    applied.current = false;
    window.setTimeout(() => {
      const cur = useSystemStore.getState().sys;
      const z = sizingFor(id, cur.array.module.areaM2);
      useSystemStore.setState({
        sys: { ...cur, hotel: { ...HOTEL_PRESETS[id] }, array: { ...cur.array, modules: z.modules }, tank: { ...cur.tank, volumeL: z.volumeL, uaWPerK: z.uaWPerK } },
        hotelPreset: id,
      });
      applied.current = true;
    }, 40);
  };
  const shown: PresetId | null = asked ?? (preset === 'custom' ? null : preset);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <SegmentedControl<PresetId>
        ariaLabel="Hotel yang dihitung"
        options={PRESET_OPTIONS}
        value={shown ?? 'hotel-100'}
        noSelection={shown === null}
        onChange={choose}
        size="sm"
      />
      <p className="num m-0 text-mono-label text-ink-3" role="status" aria-live="polite">
        {asked || stale ? (
          'Menghitung ulang…'
        ) : (
          <>
            {formatId(sys.hotel.rooms, 0)} kamar · {formatId(areaM2, 0)} m² PV/T · tangki {formatId(sys.tank.volumeL, 0)} L · pemanas cadangan{' '}
            {sys.hotel.heater === 'lpg' ? 'LPG' : sys.hotel.heater === 'electric-resistance' ? 'listrik' : 'pompa kalor'}
          </>
        )}
      </p>
    </div>
  );
}

const logN = (n: number) => Math.log10(Math.max(1, n));

export function HotelScaler({ data }: { data: BaselineComparison }) {
  const sys = useSystem();
  const preset = useSystemStore((s) => s.hotelPreset);
  const [n, setN] = useState(1);
  const small = preset === 'penginapan-kecil';
  const opts: readonly SegmentedOption<Mult>[] = small
    ? [
        { value: 'satu', label: '1 penginapan' },
        { value: 'nonbintang', label: `${formatId(BPS.nonStarIndonesia, 0)} akomodasi non-bintang` },
      ]
    : [
        { value: 'satu', label: '1 hotel' },
        { value: 'bali', label: `Bali: ${formatId(BPS.starHotelsBali, 0)} hotel bintang` },
        { value: 'indonesia', label: `Indonesia: ${formatId(BPS.starHotelsIndonesia, 0)} hotel bintang` },
      ];
  const presetN: Record<Mult, number | null> = {
    satu: 1,
    bali: BPS.starHotelsBali,
    indonesia: BPS.starHotelsIndonesia,
    nonbintang: BPS.nonStarIndonesia,
    bebas: null,
  };
  const current = (Object.keys(presetN) as Mult[]).find((k) => presetN[k] === n && opts.some((o) => o.value === k));
  const b1 = data.ledgers.B1.netKgPerYear * n;
  const b2 = data.ledgers.B2.netKgPerYear * n;
  const unit = Math.max(Math.abs(b1), Math.abs(b2)) >= 1e6 ? 'kt' : 't';
  const div = unit === 'kt' ? 1e6 : 1e3;
  const sgn = (kg: number) => formatSigned(kg / div, unit === 'kt' || n < 10 ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <SegmentedControl<Mult>
          ariaLabel="Jumlah hotel"
          options={opts}
          value={(current ?? 'satu') as Mult}
          noSelection={!current}
          onChange={(v) => setN(presetN[v] ?? 1)}
          size="sm"
        />
        <Slider
          id="dampak-n-hotel"
          label="Jumlah bangunan"
          value={logN(n)}
          min={0}
          max={4.5}
          step={0.01}
          editable={false}
          format={(x) => formatId(Math.round(10 ** x), 0)}
          marks={[
            { value: 0, label: '1' },
            { value: logN(BPS.starHotelsBali) },
            { value: logN(BPS.starHotelsIndonesia) },
            { value: logN(BPS.nonStarIndonesia) },
          ]}
          onChange={(x) => setN(Math.max(1, Math.round(10 ** x)))}
        />
      </div>
      <dl className="m-0 grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <div className="border-t border-line pt-3">
          <dt className="text-body text-ink-2">CO₂e bersih terhadap B1 (konvensional)</dt>
          <dd className="num m-0 mt-1 text-readout-l text-ink">
            {sgn(b1)} <span className="text-mono-s text-ink-3">{unit} CO₂e/tahun</span>
          </dd>
        </div>
        <div className="border-t border-line pt-3">
          <dt className="text-body text-ink-2">CO₂e bersih terhadap B2 (PV + pompa kalor)</dt>
          <dd className="num m-0 mt-1 text-readout-l text-ink">
            {sgn(b2)} <span className="text-mono-s text-ink-3">{unit} CO₂e/tahun</span>
          </dd>
        </div>
      </dl>
      <p className="m-0 max-w-[68ch] text-small text-ink-2">
        Penskalaan ilustratif, bukan prakiraan: satu bangunan contoh ({formatId(sys.hotel.rooms, 0)} kamar) dikali jumlah di atas, tanpa memperhitungkan beda iklim, ukuran, atau pemanas.
        Jumlah bangunan: BPS 2023 <Evidence tag="terbit" refId="bps-hotel-2023" label />. Per bangunan: B1 <span className="num">{ton(data.ledgers.B1.netKgPerYear, 1)}</span> t, B2{' '}
        <span className="num">{ton(data.ledgers.B2.netKgPerYear, 1)}</span> t.
      </p>
    </div>
  );
}
