import { memo, useCallback } from 'react';
import { LABELS, type DayScenarioId, type ModeTarget } from '../../sim/system';
import { useSystemStore } from '../../state/system';
import { SegmentedControl, Slider, formatId, type SegmentedOption } from '../../ui';

const PRESETS: readonly SegmentedOption<ModeTarget>[] = (['A', 'B', 'C'] as const).map((m) => ({
  value: m,
  label: LABELS.modeTarget[m],
  description: `Muat kondisi: ${LABELS.modeTarget[m]}`,
}));

const SCENARIOS: readonly SegmentedOption<DayScenarioId>[] = [
  { value: 'terik', label: 'Terik', description: LABELS.scenario.terik },
  { value: 'berawan', label: 'Berawan', description: LABELS.scenario.berawan },
  { value: 'hujan', label: 'Hujan', description: LABELS.scenario.hujan },
  { value: 'hujan-3-hari', label: '3 hari', description: LABELS.scenario['hujan-3-hari'] },
];

const clock = (h: number) => {
  const hh = ((Math.floor(h + 1e-9) % 24) + 24) % 24;
  const mm = Math.round((h - Math.floor(h + 1e-9)) * 60) % 60;
  return `${String(hh).padStart(2, '0')}.${String(mm).padStart(2, '0')}`;
};

/**
 * Kondisi yang dibaca skema, bagan, dan seluruh Lab: tiga kondisi siap pakai (jam dan cuaca), tipe hari, dan jam.
 * Jam memakai store yang sama dengan bagian lain. Mode A/B/C tetap dihitung router, bukan dipilih di sini.
 */
function SceneBarImpl({ idSuffix = '' }: { idSuffix?: string }) {
  const scenario = useSystemStore((s) => s.scenario);
  const hour = useSystemStore((s) => s.hour);
  const modeTarget = useSystemStore((s) => s.modeTarget);
  const setScenario = useSystemStore((s) => s.setScenario);
  const setModeTarget = useSystemStore((s) => s.setModeTarget);
  const setHour = useSystemStore((s) => s.setHour);
  const max = scenario === 'hujan-3-hari' ? 72 : 24;
  const onHour = useCallback((n: number) => setHour(n), [setHour]);
  const day = scenario === 'hujan-3-hari' ? Math.floor(hour / 24) + 1 : null;
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <SegmentedControl<ModeTarget>
          ariaLabel="Kondisi siap pakai"
          size="sm"
          className="pointer-coarse:h-14!"
          options={PRESETS}
          value={modeTarget === 'custom' ? 'A' : modeTarget}
          noSelection={modeTarget === 'custom'}
          onChange={setModeTarget}
        />
        <SegmentedControl<DayScenarioId>
          ariaLabel="Tipe hari"
          size="sm"
          className="pointer-coarse:h-14!"
          options={SCENARIOS}
          value={scenario}
          onChange={setScenario}
        />
      </div>
      <Slider
        id={`lab-hour${idSuffix}`}
        label={day ? `Jam, hari ke-${day}` : 'Jam'}
        value={hour}
        min={0}
        max={max}
        step={0.25}
        density="compact"
        format={(n) => clock(n)}
        editable={false}
        onChange={onHour}
        marks={max === 24 ? [6, 12, 18] : [24, 48]}
      />
      <span className="sr-only">{formatId(hour, 2)} jam sejak awal skenario</span>
    </div>
  );
}
export const SceneBar = memo(SceneBarImpl);
