import type { ReactNode } from 'react';
import { INPUT_LIMITS, PRESETS, type NumericInputKey, type PumpControl } from '../sim';
import { MODE_LABEL, useStore } from '../state';
import { Button, Disclosure, ResetIcon, RainIcon, SegmentedControl, SunIcon, Toggle, formatId, type SegmentedOption } from '../ui';
import { SliderRow } from './lab/SliderRow';

/**
 * Kontrol Lab. Setiap geseran menulis ke store (`setInput`) → simulasi yang sama dijalankan ulang → model, skematik,
 * pembacaan, dan grafik ikut berubah. Penjelasan ada di ⓘ (L2), bukan teks tetap.
 */

const PUMP_OPTIONS: readonly SegmentedOption<PumpControl>[] = [
  { value: 'auto', label: 'Otomatis', description: 'Pompa menyala bila ada manfaat bersih' },
  { value: 'on', label: 'Paksa nyala', description: 'Pompa selalu menyala' },
  { value: 'off', label: 'Mati', description: 'Tanpa sirkulasi (stagnasi)' },
];

const PRESET_OPTIONS: readonly SegmentedOption<'sunny' | 'rainy'>[] = [
  { value: 'sunny', label: 'Cerah', icon: <SunIcon size={16} />, dot: 'heat', description: 'Muat preset Cerah' },
  { value: 'rainy', label: 'Hujan', icon: <RainIcon size={16} />, dot: 'cool', description: 'Muat preset Hujan' },
];

/** Penjelasan singkat (≤ 14 kata) untuk ⓘ. */
const HELP: Record<NumericInputKey, string> = {
  irradiance: 'Daya matahari pada panel. Cerah ±800–1000, mendung tebal di bawah 200 W/m².',
  ambientC: 'Menentukan rugi panas depan dan belakang.',
  rainMmH: '0 = kering. Hujan lebat ±10–50 mm/jam.',
  windMs: 'Makin kencang, makin besar pelepasan panas konveksi.',
  inletC: 'Suhu balik dari beban air panas atau loop proses hangat.',
  flowLpm: 'Debit besar menjaga ΔT kecil, tetapi daya pompa naik sekitar kuadrat debit.',
  areaM2: 'Modul rumah tangga ±1,6–2 m².',
  uPlateFluid: 'Makin besar, penukar panas makin efektif (NTU naik).',
  pressureDropKPa: 'Diskalakan dengan kuadrat debit; menentukan daya pompa.',
  pumpEfficiency: 'Listrik ke hidrolik; umumnya 0,2–0,4.',
  etaRef: 'Efisiensi pada sel 25 °C dan 1000 W/m²; modul modern 0,18–0,22.',
  betaPerK: 'Penurunan daya per K; silikon kristalin sekitar 0,35–0,45 %/K.',
  boilerEfficiency: 'Mengubah panas yang dipanen menjadi bahan bakar yang dihemat.',
  coolingCOP: 'W panas dibuang per 1 W listrik. Dry cooler sekitar 20–40; chiller kecil sekitar 3–4.',
};

type Formatter = (n: number) => string;
const decimalsOf = (step: number) => {
  const s = String(step);
  return s.includes('.') ? s.length - s.indexOf('.') - 1 : 0;
};
const pct = (digits: number): Formatter => (n) => `${formatId(n * 100, digits)} %`;

/** `format` = tampilan khusus (persen, %/K): kolom nilai menjadi hanya-baca agar tidak salah satuan. */
function LimitSlider({ k, format }: { k: NumericInputKey; format?: Formatter }) {
  const value = useStore((s) => s.inputs[k]);
  const setInput = useStore((s) => s.setInput);
  const lim = INPUT_LIMITS[k];
  const sunny = PRESETS.sunny[k] as number;
  const rainy = PRESETS.rainy[k] as number;
  const marks = sunny === rainy ? [sunny] : [sunny, rainy];
  return (
    <SliderRow
      id={`lab-${k}`}
      label={lim.label}
      value={value}
      min={lim.min}
      max={lim.max}
      step={lim.step}
      unit={lim.unit === '–' || format ? undefined : lim.unit}
      editable={!format}
      format={format ?? ((n) => formatId(n, decimalsOf(lim.step)))}
      marks={marks}
      defaultValue={sunny}
      help={HELP[k]}
      onChange={(n) => setInput(k, n)}
    />
  );
}

function Group({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div role="group" aria-labelledby={`lab-g-${id}`} className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <h3 id={`lab-g-${id}`} className="text-label text-ink-2">
        {title}
      </h3>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

export default function ControlPanel() {
  const mode = useStore((s) => s.mode);
  const pumpControl = useStore((s) => s.inputs.pumpControl);
  const heatLoad = useStore((s) => s.inputs.heatLoadAvailable);
  const hotSource = useStore((s) => s.inputs.hotSourceAvailable);
  const setInput = useStore((s) => s.setInput);
  const setMode = useStore((s) => s.setMode);
  const reset = useStore((s) => s.reset);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <SegmentedControl<'sunny' | 'rainy'>
            ariaLabel="Muat preset"
            size="sm"
            className="pointer-coarse:h-14!"
            options={PRESET_OPTIONS}
            value={mode === 'rainy' ? 'rainy' : 'sunny'}
            noSelection={mode === 'lab'}
            onChange={setMode}
          />
          <span aria-live="polite" className="text-label text-ink-2">
            {mode === 'lab' ? MODE_LABEL.lab : ''}
          </span>
        </div>
        <Button size="sm" variant="ghost" icon={<ResetIcon size={16} />} onClick={reset} title="Kembalikan semuanya ke preset Cerah">
          Setel ulang
        </Button>
      </div>

      <Group id="lingkungan" title="Lingkungan">
        <LimitSlider k="irradiance" />
        <LimitSlider k="ambientC" />
        <LimitSlider k="rainMmH" />
        <LimitSlider k="windMs" />
      </Group>

      <Group id="sirkuit" title="Sirkuit cairan">
        <LimitSlider k="inletC" />
        <LimitSlider k="flowLpm" />
      </Group>

      <Group id="beban" title="Beban dan sumber">
        <Toggle
          id="lab-heatLoad"
          label="Ada beban panas"
          description="Mis. pemanas air. Tanpa beban, panas tidak dihitung bermanfaat."
          checked={heatLoad}
          onChange={(v) => setInput('heatLoadAvailable', v)}
        />
        <Toggle
          id="lab-hotSource"
          label="Ada sumber hangat yang perlu didinginkan"
          description="Mis. loop proses. Tanpa sumber, panel tidak membuang panas."
          checked={hotSource}
          onChange={(v) => setInput('hotSourceAvailable', v)}
        />
      </Group>

      <Group id="pompa" title="Pompa">
        <SegmentedControl<PumpControl>
          fullWidth
          size="sm"
          className="pointer-coarse:h-14!"
          ariaLabel="Kendali pompa"
          options={PUMP_OPTIONS}
          value={pumpControl}
          onChange={(v) => setInput('pumpControl', v)}
        />
      </Group>

      <Disclosure title="Parameter lain" hint="Penukar panas, pompa, PV, valuasi" level={3}>
        <div className="space-y-4">
          <LimitSlider k="uPlateFluid" />
          <LimitSlider k="areaM2" />
          <LimitSlider k="pressureDropKPa" />
          <LimitSlider k="pumpEfficiency" format={pct(0)} />
          <LimitSlider k="etaRef" format={pct(1)} />
          <LimitSlider k="betaPerK" format={(n) => `${formatId(n * 100, 2)} %/K`} />
          <LimitSlider k="boilerEfficiency" format={pct(0)} />
          <LimitSlider k="coolingCOP" />
        </div>
      </Disclosure>
    </div>
  );
}
