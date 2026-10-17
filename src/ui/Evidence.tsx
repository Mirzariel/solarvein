import { Tooltip } from './Tooltip';
import { cx } from './cx';
import { LABELS, REFERENCES, type EvidenceTag, type RefId } from '../sim/system';

/**
 * Evidence dot (sv-visual-identity): shape encodes the evidence class, never colour (ink-2 / currentColor).
 * filled = mapan · filled + citation mark = terbit · half = simulasi · hollow = asumsi ·
 * dashed hollow = hipotesis · diamond = usulan.
 */
export function EvidenceDot({ tag, size = 8, className }: { tag: EvidenceTag; size?: number; className?: string }) {
  const r = size / 2 - 0.75;
  const c = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={cx('inline-block shrink-0', className)}>
      {tag === 'usulan' ? (
        <rect x={c - r * 0.72} y={c - r * 0.72} width={r * 1.44} height={r * 1.44} transform={`rotate(45 ${c} ${c})`} fill="currentColor" />
      ) : tag === 'simulasi' ? (
        <>
          <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={1} />
          <path d={`M ${c} ${c - r} A ${r} ${r} 0 0 0 ${c} ${c + r} Z`} fill="currentColor" />
        </>
      ) : tag === 'asumsi' || tag === 'hipotesis' ? (
        <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={1} strokeDasharray={tag === 'hipotesis' ? '1.6 1.2' : undefined} />
      ) : (
        <circle cx={c} cy={c} r={r} fill="currentColor" />
      )}
    </svg>
  );
}

export interface EvidenceProps {
  tag: EvidenceTag;
  refId?: RefId;
  /** Show the text label next to the dot (first use per viewport); otherwise the label lives in the tooltip. */
  label?: boolean;
  /** Stage (dark) tone. */
  inverse?: boolean;
  /** Show the small citation arrow for 'terbit' (only where one cited number stands alone). Default false. */
  cite?: boolean;
  className?: string;
}

/** Inline evidence marker with an accessible tooltip (label + APA reference when a refId is given). */
export function Evidence({ tag, refId, label = false, inverse, cite = false, className }: EvidenceProps) {
  const ref = refId ? REFERENCES[refId] : undefined;
  const text = LABELS.evidence[tag];
  const content = ref ? `${text}. ${ref.apa}` : text;
  return (
    <Tooltip content={content} tone={inverse ? 'stage' : 'page'}>
      <span
        tabIndex={0}
        aria-label={content}
        className={cx('inline-flex items-center gap-1.5 rounded-xs align-[0.05em] text-[12px] leading-4 outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2', inverse ? 'text-white/60' : 'text-ink-2', className)}
      >
        <EvidenceDot tag={tag} />
        {label ? <span className="num">{text}</span> : null}
        {tag === 'terbit' && cite ? <span aria-hidden="true" className="num text-[10px]">↗</span> : null}
      </span>
    </Tooltip>
  );
}
