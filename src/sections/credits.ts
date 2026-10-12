/**
 * Kredit media untuk footer. Sumber kebenaran: docs/CREDITS.md. Video dan foto diam (frame dari video yang sama) dari
 * Mixkit (Mixkit Free License: boleh dipakai tanpa atribusi; tetap dicantumkan). Media adalah ilustrasi konteks,
 * bukan pemasangan SolarVein yang nyata.
 */
export interface Credit {
  file: string;
  title: string;
  provider: string;
  source: string;
}

export const CREDITS: readonly Credit[] = [
  { file: 'hero-array', title: 'Deretan panel di bawah langit cerah (video pembuka)', provider: 'Mixkit', source: 'https://mixkit.co/free-stock-video/close-up-of-solar-panels-on-a-snow-field-47875/' },
  { file: 'cell-macro', title: 'Permukaan sel surya dari dekat (video jeda)', provider: 'Mixkit', source: 'https://mixkit.co/free-stock-video/surface-of-a-solar-panel-32520/' },
  { file: 'roof-aisle', title: 'Panel surya di atap industri (foto Dampak dan Penutup)', provider: 'Mixkit', source: 'https://mixkit.co/free-stock-video/view-of-a-solar-panel-farm-generating-sustainable-energy-47097/' },
];
