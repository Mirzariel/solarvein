import { memo } from 'react';
import {
  DEFAULT_SYSTEM,
  HOTEL_PRESETS,
  LABELS,
  TANK_U_W_PER_M2K,
  tankUaWPerK,
  type HeaterType,
  type RegenAirSource,
  type RouterStrategy,
} from '../sim/system';
import { useSystemStore, type HotelPresetId } from '../state/system';
import { Button, ResetIcon, SegmentedControl, formatId, type SegmentedOption } from '../ui';
import './lab/lab.css';
import { Group, SysSlider, SysToggle, type SysSliderSpec } from './lab/SysControls';

/**
 * Kontrol Lab v2. Setiap geseran menulis ke store lewat `setSys` (satu aksi); skema, bagan, dan angka tahunan
 * membaca dari store yang sama. Rentang slider mengikuti rentang yang tertulis pada berkas asumsi.
 * Penjelasan ada di ⓘ (L2), bukan teks tetap.
 */

const PRESET_OPTIONS: readonly SegmentedOption<Exclude<HotelPresetId, 'custom'>>[] = [
  { value: 'hotel-100', label: '100 kamar', description: HOTEL_PRESETS['hotel-100'].label },
  { value: 'penginapan-kecil', label: 'Penginapan kecil', description: HOTEL_PRESETS['penginapan-kecil'].label },
];

const HEATER_OPTIONS: readonly SegmentedOption<HeaterType>[] = [
  { value: 'lpg', label: 'LPG', description: 'Pemanas gas LPG' },
  { value: 'electric-resistance', label: 'Listrik', description: 'Pemanas listrik tahanan' },
  { value: 'heat-pump', label: 'Pompa kalor', description: 'Pemanas air pompa kalor (COP)' },
];

const STRATEGY_OPTIONS: readonly SegmentedOption<RouterStrategy>[] = [
  { value: 'dhw-priority', label: 'Air panas', description: LABELS.strategy['dhw-priority'] },
  { value: 'fixed-schedule', label: 'Jadwal', description: LABELS.strategy['fixed-schedule'] },
  { value: 'adaptive', label: 'Adaptif', description: LABELS.strategy.adaptive },
];

const REGEN_OPTIONS: readonly SegmentedOption<RegenAirSource>[] = [
  { value: 'ambient', label: 'Udara luar', description: 'Udara regenerasi dari luar gedung' },
  { value: 'exhaust', label: 'Udara buangan hotel', description: 'Udara regenerasi dari buangan ventilasi hotel' },
];

const pct = (n: number) => `${formatId(n, 0)} %`;

// ── spesifikasi slider (konstanta modul) ──────────────────────────────────────────────────────────────────────
const S = {
  rooms: {
    id: 'lab-rooms', label: 'Jumlah kamar', unit: 'kamar', min: 5, max: 300, step: 1,
    get: (s) => s.hotel.rooms, patch: (n) => ({ hotel: { rooms: n } }),
    help: 'Menentukan kebutuhan air panas harian. Bawaan 100 kamar; penginapan kecil sekitar 12.',
  },
  occupancy: {
    id: 'lab-occ', label: 'Hunian rata-rata', min: 30, max: 95, step: 1,
    get: (s) => s.hotel.occupancy * 100, patch: (n) => ({ hotel: { occupancy: n / 100 } }), format: pct,
    help: 'Bagian kamar yang terisi. Rentang asumsi 65–75 %; di luar itu untuk uji kepekaan.',
  },
  litres: {
    id: 'lab-litres', label: 'Air panas per kamar terisi', unit: 'L/hari', min: 30, max: 200, step: 5,
    get: (s) => s.hotel.dhwLitresPerOccupiedRoomDay, patch: (n) => ({ hotel: { dhwLitresPerOccupiedRoomDay: n } }),
    help: 'Pada 60 °C. Literatur hotel kira-kira 50–150 L per kamar terisi per hari.',
  },
  mains: {
    id: 'lab-mains', label: 'Suhu air pasok', unit: '°C', min: 22, max: 32, step: 0.5,
    get: (s) => s.hotel.mainsC, patch: (n) => ({ hotel: { mainsC: n } }),
    help: 'Air jaringan dataran rendah berkisar 27–29 °C. Makin dingin, makin besar kebutuhan panas.',
  },
  effLpg: {
    id: 'lab-eff', label: 'Efisiensi pemanas LPG', min: 60, max: 95, step: 1,
    get: (s) => s.hotel.heaterEfficiency * 100, patch: (n) => ({ hotel: { heaterEfficiency: n / 100 } }), format: pct,
    help: 'Energi panas yang sampai ke air per energi bahan bakar. Bawaan 85 %.',
  },
  effElectric: {
    id: 'lab-eff', label: 'Efisiensi pemanas listrik', min: 90, max: 100, step: 1,
    get: (s) => s.hotel.heaterEfficiency * 100, patch: (n) => ({ hotel: { heaterEfficiency: n / 100 } }), format: pct,
    help: 'Pemanas tahanan hampir seluruhnya menjadi panas. Bawaan penginapan kecil 95 %.',
  },
  copHeater: {
    id: 'lab-eff', label: 'COP pompa kalor pemanas', min: 2, max: 5, step: 0.1,
    get: (s) => s.hotel.heaterEfficiency, patch: (n) => ({ hotel: { heaterEfficiency: n } }),
    help: 'Panas ke air per listrik. Pemanas air pompa kalor di iklim tropis sekitar 3–4.',
  },
  modules: {
    id: 'lab-modules', label: 'Modul PV/T', unit: 'modul', min: 10, max: 120, step: 1,
    get: (s) => s.array.modules, patch: (n) => ({ array: { modules: n } }),
    help: 'Luas larik = jumlah modul × luas modul. Bawaan 50 modul, sekitar 85 m².',
  },
  flow: {
    id: 'lab-flow', label: 'Debit per modul', unit: 'L/mnt', min: 0.5, max: 5, step: 0.1,
    get: (s) => s.array.module.flowLpm, patch: (n, s) => ({ array: { module: { ...s.array.module, flowLpm: n } } }),
    help: 'Debit besar menjaga selisih suhu kecil, tetapi daya pompa naik sekitar kuadrat debit.',
  },
  tank: {
    id: 'lab-tank', label: 'Volume tangki penyangga', unit: 'L', min: 1000, max: 12000, step: 100,
    get: (s) => s.tank.volumeL, patch: (n) => ({ tank: { volumeL: n, uaWPerK: tankUaWPerK(n, TANK_U_W_PER_M2K) } }),
    help: 'Praktik umum 50–75 L per m² kolektor. Makin besar, makin besar rugi diam.',
  },
  onK: {
    id: 'lab-onk', label: 'Pompa hidup di atas dasar tangki', unit: 'K', min: 3, max: 12, step: 0.5,
    get: (s) => s.controller.onK,
    patch: (n, s) => ({ controller: { onK: n, offK: Math.min(s.controller.offK, n - 1) } }),
    help: 'Pompa menyala bila sensor kolektor melebihi dasar tangki sebesar ini. Bawaan 6 K.',
  },
  offK: {
    id: 'lab-offk', label: 'Pompa mati di bawah', unit: 'K', min: 0.5, max: 6, step: 0.5,
    get: (s) => s.controller.offK,
    patch: (n, s) => ({ controller: { offK: n, onK: Math.max(s.controller.onK, n + 1) } }),
    help: 'Pompa berhenti bila selisihnya turun di bawah ini. Harus lebih kecil dari batas hidup.',
  },
  minRegen: {
    id: 'lab-minregen', label: 'Suhu regenerasi minimum', unit: '°C', min: 35, max: 70, step: 1,
    get: (s) => s.controller.desiccantMinRegenC, patch: (n) => ({ controller: { desiccantMinRegenC: n } }),
    help: 'Panas ke desikan hanya diberikan bila air keluar kolektor mencapai suhu ini.',
  },
  grid: {
    id: 'lab-grid', label: 'Faktor emisi listrik jaringan', unit: 'kgCO₂e/kWh', min: 0.68, max: 0.87, step: 0.01,
    get: (s) => s.carbon.gridKgPerKWhE, patch: (n) => ({ carbon: { gridKgPerKWhE: n } }),
    help: 'Jamali 0,87 (ESDM 2019 via JCM 2022); rerata nasional 2024 sekitar 0,68 (OWID).',
  },
  lpg: {
    id: 'lab-lpg', label: 'Faktor emisi LPG', unit: 'kgCO₂e/kWh bahan bakar', min: 0.2, max: 0.25, step: 0.001,
    get: (s) => s.carbon.lpgKgPerKWhFuel, patch: (n) => ({ carbon: { lpgKgPerKWhFuel: n } }),
    help: 'IPCC 2006: 63,1 t/TJ pada nilai kalor bawah, sekitar 0,227 per kWh bahan bakar.',
  },
  hpwh: {
    id: 'lab-hpwh', label: 'COP pemanas pompa kalor (B2)', min: 2.5, max: 5, step: 0.1,
    get: (s) => s.carbon.hpwhCop, patch: (n) => ({ carbon: { hpwhCop: n } }),
    help: 'Pembanding B2. Rentang asumsi 3–4; bawaan 3,5. Makin tinggi, makin sulit dikalahkan.',
  },
  coil: {
    id: 'lab-coil', label: 'COP koil pengering acuan', min: 2, max: 4.5, step: 0.1,
    get: (s) => s.carbon.coilRefCop, patch: (n) => ({ carbon: { coilRefCop: n } }),
    help: 'Koil bersuhu penguapan rendah (sekitar 5 °C) untuk udara segar. Bawaan 3,0.',
  },
  after: {
    id: 'lab-after', label: 'COP pendingin lanjutan (after-cooler)', min: 3, max: 7, step: 0.1,
    get: (s) => s.carbon.aftercoolerCop, patch: (n) => ({ carbon: { aftercoolerCop: n } }),
    help: 'Rasio terhadap koil acuan bawaan 1,5; pita uji 1,3–2,0. Impas desikan sekitar 1,3.',
  },
} satisfies Record<string, SysSliderSpec>;

const EFF_SPEC: Record<HeaterType, SysSliderSpec> = {
  lpg: S.effLpg,
  'electric-resistance': S.effElectric,
  'heat-pump': S.copHeater,
};
const HEATER_DEFAULT_EFF: Record<HeaterType, number> = { lpg: 0.85, 'electric-resistance': 0.95, 'heat-pump': 3 };

const heatPumpOn = (s: { heatPumpSource: { enabled: boolean } }) => s.heatPumpSource.enabled;
const heatPumpPatch = (v: boolean) => ({ heatPumpSource: { enabled: v } });
const desEnabled = (s: { desiccant: { enabled: boolean } }) => s.desiccant.enabled;
const desPatch = (v: boolean) => ({ desiccant: { enabled: v } });

function PresetControl() {
  const preset = useSystemStore((s) => s.hotelPreset);
  const setPreset = useSystemStore((s) => s.setHotelPreset);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <SegmentedControl<Exclude<HotelPresetId, 'custom'>>
        ariaLabel="Preset hotel"
        size="sm"
        className="pointer-coarse:h-14!"
        options={PRESET_OPTIONS}
        value={preset === 'custom' ? 'hotel-100' : preset}
        noSelection={preset === 'custom'}
        onChange={setPreset}
      />
      <span aria-live="polite" className="text-label text-ink-2">
        {preset === 'custom' ? 'Kustom' : ''}
      </span>
    </div>
  );
}

function HeaterControl() {
  const heater = useSystemStore((s) => s.sys.hotel.heater);
  const setSys = useSystemStore((s) => s.setSys);
  return (
    <>
      <SegmentedControl<HeaterType>
        size="sm"
        className="pointer-coarse:h-14!"
        ariaLabel="Jenis pemanas air yang sudah ada"
        options={HEATER_OPTIONS}
        value={heater}
        onChange={(v) => setSys({ hotel: { heater: v, heaterEfficiency: HEATER_DEFAULT_EFF[v] } })}
      />
      <SysSlider key={heater} spec={EFF_SPEC[heater]} />
    </>
  );
}

const STRATEGY_NOTE: Record<RouterStrategy, string> = {
  'dhw-priority': 'Air panas dulu: panas ke air panas, sisanya ke tangki.',
  'fixed-schedule': 'Jadwal tetap: panas ke desikan pukul 11.00–15.00, tanpa melihat suhu.',
  adaptive: 'Adaptif: urutan menurut nilai karbon per kWh termal.',
};

function StrategyControl() {
  const strategy = useSystemStore((s) => s.strategy);
  const setStrategy = useSystemStore((s) => s.setStrategy);
  return (
    <>
    <SegmentedControl<RouterStrategy>
      fullWidth
      size="sm"
      className="pointer-coarse:h-14!"
      ariaLabel="Strategi router"
      options={STRATEGY_OPTIONS}
      value={strategy}
      onChange={setStrategy}
    />
    <p className="m-0 text-small text-ink-2">{STRATEGY_NOTE[strategy]}</p>
    </>
  );
}

function RegenAirControl() {
  const regenAir = useSystemStore((s) => s.sys.desiccant.regenAir);
  const enabled = useSystemStore((s) => s.sys.desiccant.enabled);
  return (
    <div className={enabled ? undefined : 'pointer-events-none opacity-40'}>
      <SegmentedControl<RegenAirSource>
        fullWidth
        size="sm"
        className="pointer-coarse:h-14!"
        ariaLabel="Sumber udara regenerasi desikan"
        options={REGEN_OPTIONS}
        value={regenAir}
        onChange={(v) => {
          const st = useSystemStore.getState();
          st.setSys({ desiccant: { regenAir: v } });
          st.setDesiccantView({ regenAir: v });
        }}
      />
    </div>
  );
}

function DesiccantMinRegen() {
  const enabled = useSystemStore((s) => s.sys.desiccant.enabled);
  return <SysSlider spec={S.minRegen} disabled={!enabled} />;
}

function ArrayNote() {
  const area = useSystemStore((s) => s.sys.array.modules * s.sys.array.module.areaM2);
  const lPerM2 = useSystemStore((s) => s.sys.tank.volumeL / (s.sys.array.modules * s.sys.array.module.areaM2));
  return (
    <span>
      Luas larik <span className="num text-ink">{formatId(area, 0)}</span> m² · tangki <span className="num text-ink">{formatId(lPerM2, 0)}</span> L/m²
    </span>
  );
}

function ControlPanelImpl() {
  const reset = () => {
    const st = useSystemStore.getState();
    st.resetSys();
    st.setDesiccantView({ regenAir: DEFAULT_SYSTEM.desiccant.regenAir, regenC: 50 });
  };
  return (
    <div className="lab-rig space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PresetControl />
        <Button size="sm" variant="ghost" icon={<ResetIcon size={16} />} onClick={reset} title="Kembalikan semua nilai ke bawaan">
          Setel ulang
        </Button>
      </div>

      <Group id="hotel" title="Hotel">
        <SysSlider spec={S.rooms} />
        <SysSlider spec={S.occupancy} />
        <SysSlider spec={S.litres} />
        <SysSlider spec={S.mains} />
      </Group>

      <Group id="pemanas" title="Pemanas cadangan (pemanas air yang sudah ada, selalu siaga)">
        <HeaterControl />
      </Group>

      <Group id="larik" title="Larik dan tangki" note={<ArrayNote />}>
        <SysSlider spec={S.modules} />
        <SysSlider spec={S.flow} />
        <SysSlider spec={S.tank} />
      </Group>

      <Group id="router" title="Router">
        <StrategyControl />
        <SysSlider spec={S.onK} />
        <SysSlider spec={S.offK} />
      </Group>

      <Group id="desikan" title="Desikan (bahan penyerap uap air)">
        <SysToggle id="lab-des" label="Jalur desikan aktif" description="Hipotesis riset, belum divalidasi. Router menilai dulu sebelum mengirim panas." get={desEnabled} patch={desPatch} />
        <DesiccantMinRegen />
        <RegenAirControl />
      </Group>

      <Group id="karbon" title="Faktor emisi dan pembanding">
        <SysSlider spec={S.grid} />
        <SysSlider spec={S.lpg} />
        <SysSlider spec={S.hpwh} />
        <SysSlider spec={S.coil} />
        <SysSlider spec={S.after} />
        <SysToggle
          id="lab-hp"
          label="Kolektor sebagai sumber pompa kalor"
          description="Opsi riset untuk malam dan hujan; dinilai terhadap B2."
          get={heatPumpOn}
          patch={heatPumpPatch}
        />
      </Group>
    </div>
  );
}

export default memo(ControlPanelImpl);
