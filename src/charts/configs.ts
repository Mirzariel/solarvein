import type { CollectorConfig } from '../sim';

/**
 * Identitas konfigurasi: urutan tetap, bukan peringkat. Rampa kecerahan monokrom (bukan hue):
 * Konvensional = loss, PV + pendingin cairan = ink-2, SolarVein = ink.
 */
export const CONFIG_META: Record<CollectorConfig, { short: string; full: string; fill: string }> = {
  'conventional-pv': { short: 'Konv.', full: 'Panel PV konvensional', fill: 'var(--color-loss)' },
  'pvt-harvest-only': { short: 'Panen', full: 'PV + ekstraksi panas cairan (hanya-panen)', fill: 'var(--color-ink-2)' },
  'solarvein-dual': { short: 'Dual', full: 'SolarVein Liquid (dua mode)', fill: 'var(--color-ink)' },
  'pvt-liquid': { short: 'Cair', full: 'PV/T cair v2 (hanya-panen)', fill: 'var(--color-ink-2)' },
};
export const CONFIG_ORDER: CollectorConfig[] = ['conventional-pv', 'pvt-harvest-only', 'solarvein-dual'];
