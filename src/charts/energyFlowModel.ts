import type { SimResult } from '../sim';

export type FlowTag = 'th' | 'e' | null;
export type FlowKind = 'solar' | 'optical' | 'electric' | 'liquid' | 'front' | 'rain' | 'back';

export interface FlowItem {
  id: string;
  kind: FlowKind;
  /** Magnitude [W], selalu >= 0. */
  w: number;
  /** Nilai bertanda dari simulasi (untuk tabel teks). */
  signedW: number;
  tag: FlowTag;
  long: string;
  short: string;
  /** Penjelasan arah untuk tabel/aria. */
  note: string;
}

export interface FlowModel {
  solar: FlowItem;
  /** Rugi optik: cabang dari radiasi surya, tidak pernah masuk panel. */
  optical: FlowItem;
  /** Sumber tambahan (selain surya) yang memasok panel — mis. panas dari cairan saat pembuangan. */
  extraSources: FlowItem[];
  /** Tujuan keluar dari panel (urutan tampilan). */
  sinks: FlowItem[];
  absorbedW: number;
  residualW: number;
  totalInW: number;
  totalOutW: number;
}

const NEG_EPS = 0.005;

/** Susun item aliran dari SimResult: nilai bertanda < 0 pada rugi menjadi sumber (panas dari lingkungan). */
export function buildFlowModel(r: SimResult): FlowModel {
  const solar: FlowItem = {
    id: 'solar',
    kind: 'solar',
    w: r.solarInputW,
    signedW: r.solarInputW,
    tag: 'th',
    long: 'Radiasi surya (G·A)',
    short: 'Radiasi surya',
    note: 'Masuk: daya radiasi pada apertur',
  };
  const optical: FlowItem = {
    id: 'optical',
    kind: 'optical',
    w: r.opticalLossW,
    signedW: r.opticalLossW,
    tag: 'th',
    long: 'Rugi optik (tidak terserap)',
    short: 'Rugi optik',
    note: 'Keluar: pantulan dan transmisi sebelum masuk panel',
  };

  const extraSources: FlowItem[] = [];
  const sinks: FlowItem[] = [];

  sinks.push({
    id: 'electric',
    kind: 'electric',
    w: Math.max(0, r.electricalW),
    signedW: r.electricalW,
    tag: 'e',
    long: 'Listrik PV',
    short: 'Listrik PV',
    note: 'Keluar sebagai listrik (W_e)',
  });

  const place = (
    signed: number,
    kind: FlowKind,
    sinkLong: string,
    sinkShort: string,
    srcLong: string,
    srcShort: string,
    sinkNote: string,
    srcNote: string,
    alwaysShow: boolean,
  ) => {
    if (signed >= 0) {
      if (!alwaysShow && signed < NEG_EPS) return;
      sinks.push({ id: kind, kind, w: signed, signedW: signed, tag: 'th', long: sinkLong, short: sinkShort, note: sinkNote });
    } else {
      extraSources.push({ id: kind, kind, w: -signed, signedW: signed, tag: 'th', long: srcLong, short: srcShort, note: srcNote });
    }
  };

  place(
    r.qLiquidW,
    'liquid',
    'Ke cairan (panen)',
    'Ke cairan',
    'Dari cairan (pembuangan)',
    'Dari cairan',
    'Keluar dari panel ke cairan: panen panas (+)',
    'Masuk ke panel dari cairan: pembuangan panas (−)',
    true,
  );
  place(
    r.qFrontLossW,
    'front',
    'Rugi permukaan depan',
    'Rugi depan',
    'Dari lingkungan (depan)',
    'Dari udara depan',
    'Keluar: konveksi + radiasi dari kaca depan',
    'Masuk: panel lebih dingin dari udara/langit',
    true,
  );
  if (r.inputs.rainMmH > 0 || Math.abs(r.qRainW) >= NEG_EPS) {
    place(
      r.qRainW,
      'rain',
      'Terbawa hujan',
      'Hujan',
      'Dari hujan',
      'Dari hujan',
      'Keluar: panas sensibel dibawa tetes hujan',
      'Masuk: tetes hujan lebih hangat dari panel',
      true,
    );
  }
  place(
    r.qBackLossW,
    'back',
    'Rugi sisi belakang',
    'Rugi belakang',
    'Dari lingkungan (belakang)',
    'Dari udara belakang',
    'Keluar: lewat insulasi / sisi belakang',
    'Masuk: panel lebih dingin dari udara belakang',
    true,
  );

  const totalInW = solar.w + extraSources.reduce((s, x) => s + x.w, 0);
  const totalOutW = optical.w + sinks.reduce((s, x) => s + x.w, 0);
  return {
    solar,
    optical,
    extraSources,
    sinks,
    absorbedW: r.absorbedW,
    residualW: r.energyBalanceResidualW,
    totalInW,
    totalOutW,
  };
}
