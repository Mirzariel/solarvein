/**
 * SolarVein Liquid — model fisika (steady-state, satu node panel terlumping).
 * Persamaan lengkap dan sumber: docs/PHYSICS.md. Tidak ada React/DOM di sini.
 * Perangkat keras: laminasi PV berkaca depan TANPA celah udara (kelas "unglazed").
 *
 * Neraca energi pada node panel (PV + penyerap), per konfigurasi, diselesaikan dengan bisection:
 *   S − P_e(T_p) − Q_front − Q_rain − Q_back − Q_liq = 0
 * Konveksi/radiasi/hujan bekerja pada suhu permukaan kaca T_g; sel dan kaca dipisahkan resistansi seri
 *   T_p = T_g + (Q_front + Q_rain)/(A·U_cg).
 * T_g ↔ T_p satu-ke-satu dan monoton, sehingga bisection dilakukan pada T_g (tanpa solve bersarang).
 * Konvensi tanda: qLiquidW > 0 panel→cairan (panen), < 0 cairan→panel→lingkungan (buang).
 */
import { DEFAULT_INPUTS, INPUT_LIMITS, type NumericInputKey } from './presets';
import { dewPointC, humidityRatio as humidityRatioAt, latentHeatKJkg } from './system/psychro';
import type {
  Advisory,
  CollectorConfig,
  PumpControl,
  SimInputs,
  SimResult,
  TemperatureNode,
  ThermalRegime,
} from './types';

/** Konstanta model (semua didokumentasikan di docs/PHYSICS.md). */
export const MODEL_CONSTANTS = {
  /** Produk transmitansi–absorptansi efektif (kaca + sel). */
  tauAlpha: 0.88,
  /** Emisivitas kaca/permukaan depan (inframerah panjang). */
  emissivityFront: 0.9,
  /** Emisivitas sisi belakang PV konvensional. */
  emissivityBack: 0.85,
  /** Konstanta Stefan–Boltzmann [W/(m²·K⁴)]. */
  sigma: 5.670374419e-8,
  /** Konveksi depan (Watmuff): h = a + b·v [W/(m²·K)]. Hanya konveksi; radiasi dihitung terpisah. */
  hConvA: 2.8,
  hConvB: 3.0,
  /** Faktor konveksi belakang PV terbuka relatif terhadap depan (sisi terlindung). */
  backConvFactor: 0.8,
  /** Koefisien rugi belakang total PVT berinsulasi [W/(m²·K)] (insulasi ±50 mm + tepi). */
  uBackInsulated: 1.0,
  /** Depresi suhu langit efektif: kering / hujan >= rainSkySaturationMmH [K]. */
  skyDepressionDryK: 6,
  skyDepressionRainK: 1,
  rainSkySaturationMmH: 5,
  /** Suhu tetes hujan ≈ suhu bola basah ≈ T_amb − ΔT [K]. */
  rainTempOffsetK: 1.0,
  /** Fraksi tetes hujan yang mencapai kesetimbangan termal dengan permukaan; pita ketidakpastian 0,3–1,0. */
  rainEffectiveness: 0.5,
  cpWater: 4180,
  /** Konduktansi seri kaca 3,2 mm + laminasi EVA (sel → permukaan kaca) [W/(m²·K)]; ada di dalam neraca. */
  uCellGlass: 200,
  /** Konduktansi antarmuka sel → penyerap [W/(m²·K)], hanya untuk profil. */
  uCellAbsorber: 400,
  /** Konduktansi lapisan belakang (backsheet) PV konvensional [W/(m²·K)], hanya untuk profil. */
  uBacksheet: 100,
  /** Koefisien film luar sisi belakang PVT [W/(m²·K)], hanya untuk profil. */
  hBackOuter: 8,
  /** Daya tetap elektronik pompa/katup saat berjalan [W]. */
  pumpFixedW: 1.0,
  /** Debit acuan untuk rugi tekan [L/min]. */
  refFlowLpm: 2,
  /** Ambang pengendali. */
  minHeatFlowW: 20,
  harvestToPumpRatio: 5,
  stagnationHotC: 75,
  stagnationCriticalC: 95,
  stagnationBoilingC: 100,
  lowIrradianceWm2: 150,
  /** Batas atas kondensasi (analogi Lewis): bilangan Lewis udara–uap, massa jenis & kalor jenis udara. */
  lewisNumber: 0.87,
  rhoAir: 1.18,
  cpAir: 1006,
} as const;

const K = MODEL_CONSTANTS;
const T0 = 273.15;

export const NOT_BENEFICIAL_MESSAGE = 'Pendinginan tidak menguntungkan pada kondisi ini.';

/** Massa jenis air [kg/m³], korelasi sederhana (akurat ±0,3 % untuk 10–80 °C). */
function waterDensity(tC: number): number {
  return 1000 - 0.0178 * Math.pow(Math.abs(tC - 4), 1.7);
}

function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Batasi semua input ke INPUT_LIMITS; NaN/Infinity diganti nilai default. */
export function clampInputs(i: SimInputs): SimInputs {
  const out: SimInputs = { ...DEFAULT_INPUTS };
  const src = (i ?? {}) as Partial<SimInputs>;
  (Object.keys(INPUT_LIMITS) as NumericInputKey[]).forEach((key) => {
    const lim = INPUT_LIMITS[key];
    const v = src[key];
    const base = isNum(v) ? v : DEFAULT_INPUTS[key];
    out[key] = Math.min(lim.max, Math.max(lim.min, base));
  });
  const pc = src.pumpControl as PumpControl | undefined;
  out.pumpControl = pc === 'on' || pc === 'off' || pc === 'auto' ? pc : 'auto';
  out.heatLoadAvailable =
    typeof src.heatLoadAvailable === 'boolean' ? src.heatLoadAvailable : DEFAULT_INPUTS.heatLoadAvailable;
  out.hotSourceAvailable =
    typeof src.hotSourceAvailable === 'boolean' ? src.hotSourceAvailable : DEFAULT_INPUTS.hotSourceAvailable;
  if (isNum(src.humidityRatio)) out.humidityRatio = Math.min(0.05, Math.max(0, src.humidityRatio));
  return out;
}

// ── Lingkungan turunan ──────────────────────────────────────────────
interface Env {
  ambK: number;
  skyC: number;
  skyK: number;
  rainTempC: number;
  hConv: number;
  hRain: number;
  gA: number;
  absorbed: number;
  mdot: number; // kg/s
  mdotCp: number; // W/K
  ntu: number;
  eps: number;
  pumpW: number;
}

function buildEnv(c: SimInputs): Env {
  const rainFrac = Math.min(1, c.rainMmH / K.rainSkySaturationMmH);
  const skyDep = K.skyDepressionDryK + (K.skyDepressionRainK - K.skyDepressionDryK) * rainFrac;
  const skyC = c.ambientC - skyDep;
  const hConv = K.hConvA + K.hConvB * c.windMs;
  const hRain = K.rainEffectiveness * (c.rainMmH / 3600) * K.cpWater;
  const gA = c.irradiance * c.areaM2;
  const vdot = c.flowLpm / 60000; // m³/s
  const mdot = waterDensity(c.inletC) * vdot;
  const mdotCp = mdot * K.cpWater;
  const ntu = (c.uPlateFluid * c.areaM2) / mdotCp;
  const eps = 1 - Math.exp(-ntu);
  const dP = c.pressureDropKPa * 1000 * Math.pow(c.flowLpm / K.refFlowLpm, 2);
  const pumpW = (dP * vdot) / c.pumpEfficiency + K.pumpFixedW;
  return {
    ambK: c.ambientC + T0,
    skyC,
    skyK: skyC + T0,
    rainTempC: c.ambientC - K.rainTempOffsetK,
    hConv,
    hRain,
    gA,
    absorbed: K.tauAlpha * gA,
    mdot,
    mdotCp,
    ntu,
    eps,
    pumpW,
  };
}

interface Solution {
  /** Suhu node panel/sel T_p. */
  tp: number;
  /** Suhu permukaan kaca T_g. */
  tg: number;
  pe: number;
  qConv: number;
  qRad: number;
  qFront: number;
  qRain: number;
  qBack: number;
  qLiq: number;
  pumpOn: boolean;
}

/** Semua suku neraca sebagai fungsi suhu permukaan kaca T_g (T_p dihitung eksplisit dari T_g). */
function terms(c: SimInputs, e: Env, config: CollectorConfig, liquid: boolean, tg: number) {
  const A = c.areaM2;
  const tgK = tg + T0;
  const tgK2 = tgK * tgK;
  const sk2 = e.skyK * e.skyK;
  const qConv = A * e.hConv * (tg - c.ambientC);
  const qRad = A * K.emissivityFront * K.sigma * (tgK2 * tgK2 - sk2 * sk2);
  const qRain = A * e.hRain * (tg - e.rainTempC);
  const tp = tg + (qConv + qRad + qRain) / (A * K.uCellGlass);
  const tpK = tp + T0;
  const tpK2 = tpK * tpK;
  const am2 = e.ambK * e.ambK;
  const eta = Math.max(0, c.etaRef * (1 - c.betaPerK * (tp - 25)));
  const pe = eta * e.gA;
  const qBack =
    config === 'conventional-pv'
      ? A *
        (K.backConvFactor * e.hConv * (tp - c.ambientC) +
          K.emissivityBack * K.sigma * (tpK2 * tpK2 - am2 * am2))
      : A * K.uBackInsulated * (tp - c.ambientC);
  const qLiq = liquid ? e.eps * e.mdotCp * (tp - c.inletC) : 0;
  return { tp, pe, qConv, qRad, qRain, qBack, qLiq };
}

/** Selesaikan T_g dengan bisection (neraca monoton menurun terhadap T_g); T_p = fungsi eksplisit T_g. */
function solve(c: SimInputs, e: Env, config: CollectorConfig, liquid: boolean): Solution {
  const f = (tg: number) => {
    const t = terms(c, e, config, liquid, tg);
    return e.absorbed - t.pe - t.qConv - t.qRad - t.qRain - t.qBack - t.qLiq;
  };
  let lo = -60;
  let hi = 400;
  for (let n = 0; n < 200 && hi - lo > 1e-9; n++) {
    const mid = 0.5 * (lo + hi);
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  const tg = 0.5 * (lo + hi);
  const t = terms(c, e, config, liquid, tg);
  return { ...t, tg, qFront: t.qConv + t.qRad, pumpOn: liquid };
}

const f1 = (x: number) =>
  (Math.round(x * 10) / 10).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
const f0 = (x: number) => Math.round(x).toLocaleString('id-ID');

// ── Fungsi publik ───────────────────────────────────────────────────

export function simulate(i: SimInputs, config: CollectorConfig = 'solarvein-dual'): SimResult {
  const c = clampInputs(i);
  const e = buildEnv(c);
  const A = c.areaM2;
  const isPvt = config !== 'conventional-pv';

  const off = solve(c, e, config, false);
  const on = isPvt ? solve(c, e, config, true) : null;

  // 'pvt-liquid' = kolektor v2: hanya panen, tidak pernah membuang panas (sumber panas diabaikan).
  const canReject = config !== 'pvt-liquid';
  const hotSource = canReject && c.hotSourceAvailable;

  // ── Pengendali ──
  const qMin = K.minHeatFlowW;
  const harvestWorth = (q: number) =>
    c.heatLoadAvailable && q > qMin && q / c.boilerEfficiency >= K.harvestToPumpRatio * e.pumpW;
  const pumpPeDelta = on ? on.pe - off.pe : 0; // perubahan daya PV bila pompa dinyalakan
  const rejectNet = on ? -on.qLiq / c.coolingCOP - e.pumpW : 0;
  const rejectWorth = (q: number) =>
    hotSource && q < -qMin && rejectNet > 0 && rejectNet + pumpPeDelta > 0;

  let pumpOn = false;
  if (isPvt && on) {
    if (c.pumpControl === 'on') pumpOn = true;
    else if (c.pumpControl === 'off') pumpOn = false;
    else if (config === 'pvt-harvest-only' || config === 'pvt-liquid') pumpOn = harvestWorth(on.qLiq);
    else pumpOn = harvestWorth(on.qLiq) || rejectWorth(on.qLiq);
  }
  const s: Solution = pumpOn && on ? on : off;

  // Atribusi hujan: q_cairan dengan hujan = 0 (kondisi lain sama, termasuk status pompa). Satu solve tambahan.
  let qLiquidNoRainW = s.qLiq;
  if (pumpOn && c.rainMmH > 0) {
    const cDry: SimInputs = { ...c, rainMmH: 0 };
    qLiquidNoRainW = solve(cDry, buildEnv(cDry), config, true).qLiq;
  }

  // ── Aliran fluida ──
  const massFlowKgS = pumpOn ? e.mdot : 0;
  const qLiquidW = s.qLiq;
  const outletC = pumpOn ? c.inletC + qLiquidW / e.mdotCp : c.inletC;
  const deltaFluidK = outletC - c.inletC;
  const pumpW = pumpOn ? e.pumpW : 0;

  // ── Regime & valuasi ──
  let regime: ThermalRegime = 'idle';
  if (pumpOn) {
    if (c.heatLoadAvailable && qLiquidW > qMin) regime = 'harvest';
    else if (hotSource && qLiquidW < -qMin) regime = 'reject';
    else regime = 'negligible';
  }
  const usefulHeatW = pumpOn && c.heatLoadAvailable && qLiquidW > 0 ? qLiquidW : 0;
  const heatRejectedW = pumpOn && hotSource && qLiquidW < 0 ? -qLiquidW : 0;
  const avoidedFuelW = usefulHeatW / c.boilerEfficiency;
  const avoidedCoolingElecW = heatRejectedW / c.coolingCOP;
  const netCoolingBenefitW = avoidedCoolingElecW - pumpW;

  // ── Koefisien yang dipakai ──
  const dTsky = s.tg - e.skyC;
  const dTamb = s.tp - c.ambientC;
  const hRadFront =
    Math.abs(dTsky) > 0.05 ? s.qRad / (A * dTsky) : 4 * K.emissivityFront * K.sigma * (s.tg + T0) ** 3;
  const uBack =
    Math.abs(dTamb) > 0.05
      ? s.qBack / (A * dTamb)
      : config === 'conventional-pv'
        ? K.backConvFactor * e.hConv + 4 * K.emissivityBack * K.sigma * e.ambK ** 3
        : K.uBackInsulated;

  // ── Profil suhu (front → back) ──
  const glassC = s.tg;
  const profile: TemperatureNode[] = [
    { id: 'sky', label: 'Langit (suhu efektif)', tempC: e.skyC },
    { id: 'ambient', label: 'Udara sekitar', tempC: c.ambientC },
    { id: 'glass', label: 'Kaca depan', tempC: glassC },
    { id: 'cell', label: 'Sel PV', tempC: s.tp },
  ];
  if (isPvt) {
    const absorberC = s.tp - (s.qBack + s.qLiq) / A / K.uCellAbsorber;
    const fluidC = pumpOn ? 0.5 * (c.inletC + outletC) : absorberC;
    profile.push(
      { id: 'absorber', label: 'Pelat penyerap', tempC: absorberC },
      { id: 'fluid', label: pumpOn ? 'Cairan (rata-rata)' : 'Cairan (diam)', tempC: fluidC },
      { id: 'back', label: 'Permukaan belakang (insulasi)', tempC: c.ambientC + s.qBack / A / K.hBackOuter },
    );
  } else {
    profile.push({ id: 'back', label: 'Permukaan belakang (terbuka)', tempC: s.tp - s.qBack / A / K.uBacksheet });
  }

  // Batas atas kondensasi (opsional, hanya dilaporkan; tidak masuk neraca energi).
  let qCondensationUpperW = 0;
  if (isNum(c.humidityRatio)) {
    const w = c.humidityRatio;
    if (w > 0 && s.tg < dewPointC(w)) {
      const hm = e.hConv / (K.rhoAir * K.cpAir * Math.pow(K.lewisNumber, 2 / 3)); // [m/s]
      const wSat = humidityRatioAt(s.tg, 1);
      const mCond = hm * K.rhoAir * A * Math.max(0, w - wSat); // [kg/s]
      qCondensationUpperW = mCond * latentHeatKJkg(s.tg) * 1000;
    }
  }

  const etaElectrical = e.gA > 0 ? s.pe / e.gA : 0;
  const residual = e.absorbed - (s.pe + s.qLiq + s.qFront + s.qRain + s.qBack);

  // ── Advisories ──
  const adv: Advisory[] = [];
  const add = (code: string, severity: Advisory['severity'], message: string) =>
    adv.push({ code, severity, message });

  if (c.irradiance < K.lowIrradianceWm2) {
    add(
      'LOW_IRRADIANCE',
      'info',
      `Irradiansi rendah (${f0(c.irradiance)} W/m², di bawah ${K.lowIrradianceWm2} W/m²): panas surya yang dapat dipanen sangat kecil dan listrik PV menipis.`,
    );
  }

  if (!isPvt) {
    add(
      'NO_EXCHANGER',
      'info',
      'PV konvensional tidak memiliki penukar panas dan pompa: panas hanya dilepas ke udara sekitar, tidak ada panen maupun pembuangan panas.',
    );
    if (c.pumpControl === 'on') {
      add('PUMP_IGNORED', 'info', 'Perintah pompa menyala diabaikan karena konfigurasi ini tidak punya sirkuit cairan.');
    }
  } else if (on) {
    const qOn = on.qLiq;
    const manualOff = c.pumpControl === 'off';

    if (!pumpOn && off.tp > K.stagnationBoilingC) {
      add(
        'STAGNATION_BOILING',
        'critical',
        `Pompa mati: panel stagnan mencapai ${f0(off.tp)} °C, di atas titik didih air (100 °C pada tekanan atmosfer). Air di dalam kanal dapat mendidih dan membentuk uap bertekanan. Pakai glikol/fluida tahan suhu tinggi, katup pengaman tekanan, atau pastikan pompa/pembuangan panas tetap berjalan.`,
      );
    } else if (!pumpOn && off.tp > K.stagnationHotC) {
      add(
        'STAGNATION_HOT',
        off.tp > K.stagnationCriticalC ? 'critical' : 'warning',
        `Pompa mati: panel stagnan mencapai ${f0(off.tp)} °C (insulasi menahan panas), daya PV turun dan komponen terbebani termal.`,
      );
    }
    if (manualOff) {
      add(
        'PUMP_FORCED_OFF',
        'info',
        `Pompa dimatikan manual. Bila dinyalakan, aliran panas ke cairan ≈ ${f0(qOn)} W (tanda minus berarti panas mengalir dari cairan ke panel).`,
      );
    } else {
      if (!hotSource && qOn < -qMin) {
        add(
          'NO_HOT_SOURCE',
          'info',
          'Tidak ada sumber panas yang perlu didinginkan, sehingga pembuangan panas tidak dihitung sebagai manfaat (panas tidak diada-adakan).',
        );
      }
      if (!c.heatLoadAvailable && qOn > qMin) {
        add(
          'NO_HEAT_LOAD',
          'info',
          `Panas sebesar ±${f0(qOn)} W sebenarnya dapat dipanen, tetapi tidak ada beban panas yang memakainya sehingga tidak dihitung sebagai manfaat.`,
        );
      }
      if (hotSource && regime !== 'reject' && regime !== 'harvest' && qOn >= -qMin) {
        add('REJECTION_NOT_BENEFICIAL', 'info', NOT_BENEFICIAL_MESSAGE);
      }
      if (hotSource && qOn < -qMin && !rejectWorth(qOn)) {
        add(
          'PUMP_EXCEEDS_BENEFIT',
          'warning',
          `Pembuangan panas ±${f0(-qOn)} W hanya menggantikan ±${f0(-qOn / c.coolingCOP)} W listrik pendingin, sedangkan pompa memakai ${f1(e.pumpW)} W` +
            (pumpPeDelta < 0 ? ` dan panel yang lebih panas menurunkan daya PV ±${f1(-pumpPeDelta)} W` : '') +
            '. Tidak sepadan.',
        );
      } else if (c.heatLoadAvailable && qOn > qMin && !harvestWorth(qOn)) {
        add(
          'PUMP_EXCEEDS_BENEFIT',
          'warning',
          `Panas yang dipanen ±${f0(qOn)} W menghemat ±${f0(qOn / c.boilerEfficiency)} W bahan bakar, belum sepadan dengan pompa ${f1(e.pumpW)} W (syarat: ≥ ${K.harvestToPumpRatio}× daya pompa).`,
        );
      }
      if (config === 'pvt-liquid' && pumpOn && qOn < -qMin) {
        add(
          'COLLECTOR_COOLS_LOOP',
          'warning',
          `Pompa menyala saat panel lebih dingin daripada cairan: cairan kehilangan ±${f0(-qOn)} W ke lingkungan. Pengendali harus mematikan pompa kecuali sedang mengambil panas dari lingkungan untuk pompa kalor.`,
        );
      }
      if (config === 'pvt-harvest-only' && rejectWorth(qOn)) {
        add(
          'HARVEST_ONLY_NO_REJECTION',
          'info',
          `Konfigurasi hanya-panen tidak pernah membuang panas. Pada kondisi ini pembuangan ±${f0(-qOn)} W bisa menghemat ±${f0(-qOn / c.coolingCOP)} W listrik pendingin.`,
        );
      }
    }
    if (c.pumpControl === 'on' && !c.heatLoadAvailable && !hotSource && canReject) {
      add(
        'LOOP_NO_ENDPOINT',
        'info',
        'Pompa dipaksa menyala tanpa beban panas maupun sumber panas. Pada sistem tertutup nyata suhu masuk akan mendekati suhu panel; di sini T_in tetap sesuai masukan dan manfaat dihitung nol.',
      );
    }
    if (regime === 'negligible') {
      add(
        'NEGLIGIBLE_EXCHANGE',
        'info',
        `Pompa menyala tetapi pertukaran panas bermanfaat dapat diabaikan (aliran panas ke cairan ${f0(qLiquidW)} W, pompa ${f1(pumpW)} W listrik).`,
      );
    }
  }
  const rank = { critical: 0, warning: 1, info: 2 } as const;
  adv.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return {
    inputs: c,
    config,
    pumpOn,
    regime,
    cellC: s.tp,
    stagnationC: off.tp,
    inletC: c.inletC,
    outletC,
    deltaFluidK,
    profile,
    massFlowKgS,
    solarInputW: e.gA,
    opticalLossW: e.gA - e.absorbed,
    absorbedW: e.absorbed,
    electricalW: s.pe,
    etaElectrical,
    qLiquidW,
    qLiquidNoRainW,
    qCondensationUpperW,
    qFrontLossW: s.qFront,
    qRainW: s.qRain,
    qBackLossW: s.qBack,
    pumpW,
    netElectricalW: s.pe - pumpW,
    energyBalanceResidualW: residual,
    usefulHeatW,
    heatRejectedW,
    avoidedFuelW,
    avoidedCoolingElecW,
    netCoolingBenefitW,
    coefficients: {
      hConvFront: e.hConv,
      hRadFront,
      hRain: e.hRain,
      uCellGlass: K.uCellGlass,
      uBack,
      uPlateFluid: c.uPlateFluid,
      ntu: pumpOn ? e.ntu : 0,
      effectiveness: pumpOn ? e.eps : 0,
    },
    advisories: adv,
  };
}

export function compareConfigurations(i: SimInputs): Record<CollectorConfig, SimResult> {
  return {
    'conventional-pv': simulate(i, 'conventional-pv'),
    'pvt-harvest-only': simulate(i, 'pvt-harvest-only'),
    'solarvein-dual': simulate(i, 'solarvein-dual'),
    'pvt-liquid': simulate(i, 'pvt-liquid'),
  };
}
