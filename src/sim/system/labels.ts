/**
 * SolarVein v2 — Indonesian labels for every slug the UI shows (W11). Pure data, no logic.
 *
 * Rules (sv-content-reduction): labels name CONDITIONS or STATES, never promised outcomes; EYD V; no "kami";
 * decimal comma is the UI formatter's job. Each map is typed `Record<Union, string>`, so a new union member
 * is a compile error until it is labelled here.
 */
import type { LabelMaps } from './contract';

export const LABELS: LabelMaps = {
  /** Controller mode: a state computed from conditions, never a clock label. */
  mode: {
    A: 'A · Panas tersedia',
    B: 'B · Sinar lemah, pakai simpanan',
    C: 'C · Tanpa sinar',
  },
  /** UI condition presets (scenario + time), not outcomes: the controller still computes the real mode. */
  modeTarget: {
    A: 'Terik siang',
    B: 'Lembap & mendung',
    C: 'Malam',
  },
  sink: {
    dhw: 'Air panas langsung',
    desiccant: 'Regenerasi desikan',
    tank: 'Tangki penyangga',
    bypass: 'Tidak dipakai (sel lebih dingin)',
  },
  reason: {
    'pompa-mati-kolektor-lebih-dingin': 'Pompa mati: kolektor tidak cukup hangat dibanding dasar tangki.',
    'prioritas-air-panas': 'Panas langsung ke air panas yang sedang dipakai.',
    'isi-tangki': 'Kebutuhan air panas terpenuhi; sisa panas mengisi tangki.',
    'regenerasi-desikan': 'Tangki penuh; sisa panas meregenerasi desikan.',
    'desikan-terlalu-dingin': 'Air keluar kolektor di bawah suhu minimum regenerasi desikan.',
    'tangki-penuh-bypass': 'Tangki penuh dan tak ada pemakai lain; panas tidak diambil.',
    'jadwal-tetap': 'Jadwal tetap mengirim panas ke desikan, berapa pun suhunya.',
    'lepas-simpanan': 'Tidak ada pengumpulan; tangki melepas panas simpanan ke air panas.',
  },
  verdict: {
    layak: 'Layak',
    marginal: 'Marginal',
    'tidak-layak': 'Tidak layak',
  },
  evidence: {
    mapan: 'Prinsip mapan',
    terbit: 'Temuan terpublikasi',
    simulasi: 'Hasil simulasi',
    asumsi: 'Asumsi rekayasa',
    hipotesis: 'Hipotesis riset',
    usulan: 'Usulan inovasi',
  },
  scenario: {
    terik: 'Hari terik',
    berawan: 'Hari berawan',
    hujan: 'Hari hujan berat',
    'hujan-3-hari': '3 hari hujan',
  },
  strategy: {
    'dhw-priority': 'Air panas dulu',
    'fixed-schedule': 'Jadwal tetap',
    adaptive: 'Adaptif (berbasis nilai)',
  },
  baseline: {
    B1: 'Hotel konvensional',
    B2: 'PV + pompa kalor air panas',
    B3: 'PV/T hanya air panas',
    B4: 'PV + pemulihan kalor kondensor AC',
  },
};

/** Status line shown wherever the desiccant path appears. */
export const DESICCANT_STATUS = 'Hipotesis riset · belum divalidasi';
/** Header badge: every number is simulated. */
export const SIM_BADGE = 'Simulasi · belum ada data ukur';
/** Verbatim sentence when the computed verdict is not beneficial. */
export const DESICCANT_NOT_BENEFICIAL = 'Desikan tidak menguntungkan pada kondisi ini.';
