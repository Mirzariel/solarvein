import { SIM_BADGE } from '../sim/system';
import { EvidenceDot, formatId } from '../ui';
import { lastDemoIndex, type Scene } from './scenes';

const KEYS: readonly (readonly [string, string])[] = [
  ['← →', 'pindah'],
  ['1–9', 'lompat'],
  ['A B C', 'kondisi'],
  ['R', 'atur ulang'],
  ['L', 'rincian'],
  ['H', 'petunjuk'],
  ['Esc', 'keluar'],
];

export interface HudProps {
  scenes: readonly Scene[];
  /** -1 = opening (before the first scene). */
  cursor: number;
  hints: boolean;
}

/**
 * Presentation HUD: one thin instrument rail on the paper where the site header normally sits.
 * Left: scene k/n and name (announced politely). Middle: key hints (H toggles). Right: simulation badge.
 */
export function Hud({ scenes, cursor, hints }: HudProps) {
  const n = scenes.length;
  const scene = cursor >= 0 ? scenes[cursor] : undefined;
  return (
    <div className="presentasi-hud" data-presentasi-hud>
      <p role="status" aria-live="polite" className="presentasi-hud__scene num">
        <span className="text-ink">
          {formatId(Math.max(cursor + 1, 0), 0)} / {formatId(n, 0)}
        </span>
        <span className="presentasi-hud__label">{scene ? scene.label : 'Pembuka'}</span>
        {scene && !scene.demo ? <span className="text-ink-3">· cadangan tanya jawab</span> : null}
        {scene && cursor === lastDemoIndex(scenes) ? <span className="text-ink">· akhir jalur · Q&amp;A: tekan 5–9</span> : null}
      </p>
      {hints ? (
        <ul className="presentasi-hud__keys num" aria-label="Pintasan papan ketik">
          {KEYS.map(([k, label]) => (
            <li key={k}>
              <kbd>{k}</kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <span className="flex-1" />
      )}
      <p className="presentasi-hud__badge" title={SIM_BADGE}>
        <EvidenceDot tag="simulasi" />
        {SIM_BADGE}
      </p>
    </div>
  );
}
