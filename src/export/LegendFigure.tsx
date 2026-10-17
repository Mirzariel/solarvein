import { EvidenceLegend } from '../sections/validation/EvidenceLegend';
import { Frame, type Ratio } from './Frame';

/** Evidence legend: the six tags, shape only. Reuses the Validasi component. */
export function LegendFigure({ id, ratio }: { id: string; ratio: Ratio }) {
  const wide = ratio === '16x9';
  return (
    <Frame
      id={id}
      ratio={ratio}
      title="Penanda bukti: bentuk, bukan warna"
      subtitle="Setiap angka di SolarVein membawa satu penanda. Bentuk titik menunjukkan seberapa kuat dasarnya."
      tags={['mapan', 'terbit', 'simulasi', 'asumsi', 'hipotesis', 'usulan']}
      refIds={[]}
    >
      <div className={wide ? 'export-legend export-legend--wide' : 'export-legend'}>
        <EvidenceLegend />
      </div>
    </Frame>
  );
}
