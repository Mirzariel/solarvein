import { useId } from 'react';
import { formatId } from '../../ui';

/**
 * Buffer-tank fill level (state of charge between mains and the tank maximum). Outline = tank, amber fill = stored
 * heat in the liquid, level line at the fill. The level moves with a short transform transition (none under
 * reduced motion, see day.css).
 */
export function TankGauge({ soc, height = 132, width = 76 }: { soc: number; height?: number; width?: number }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const s = Math.min(1, Math.max(0, soc));
  const bodyX = 6;
  const bodyW = 34;
  const top = 6;
  const h = height - 12;
  const fillH = h * s;
  const ticks = [0, 0.5, 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Muatan tangki ${formatId(s * 100, 0)} persen`} className="block shrink-0">
      <defs>
        <clipPath id={`tk${uid}`}>
          <rect x={bodyX} y={top} width={bodyW} height={h} rx="7" />
        </clipPath>
      </defs>
      <g clipPath={`url(#tk${uid})`}>
        <rect x={bodyX} y={top} width={bodyW} height={h} fill="var(--color-surface)" />
        <rect
          className="sv-tank-fill"
          x={bodyX}
          y={top}
          width={bodyW}
          height={h}
          fill="var(--color-heat-mark)"
          opacity="0.85"
          style={{ transform: `scaleY(${s})`, transformOrigin: `0px ${top + h}px` }}
        />
      </g>
      <rect x={bodyX} y={top} width={bodyW} height={h} rx="7" fill="none" stroke="var(--color-ink)" strokeWidth="1" />
      <line
        className="sv-tank-level"
        x1={bodyX - 4}
        x2={bodyX + bodyW + 4}
        y1={top + h - fillH}
        y2={top + h - fillH}
        stroke="var(--color-ink)"
        strokeWidth="1"
      />
      {ticks.map((t) => (
        <g key={t}>
          <line x1={bodyX + bodyW + 4} x2={bodyX + bodyW + 8} y1={top + h - h * t} y2={top + h - h * t} stroke="var(--color-tick)" strokeWidth="1" />
          <text x={bodyX + bodyW + 12} y={top + h - h * t} dy="0.35em" fill="var(--color-ink-3)" fontFamily="var(--font-mono)" fontSize="11">
            {formatId(t * 100, 0)}
          </text>
        </g>
      ))}
    </svg>
  );
}
