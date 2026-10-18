import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { LABELS } from '../../sim/system';
import { useDayStep } from './hourBus';
import { useSystemStore } from '../../state/system';
import { ModeHatchDefs, modeFill, useHatchId } from '../../charts/day/ModeHatch';
import { GUTTER_L, GUTTER_R } from '../../charts/day/DayChart';
import { clockLabel, dayNumber, type DayModel } from '../../charts/day/dayModel';

const STEP_H = 0.25; // arrow keys: 15 min
const BIG_H = 1;
const THUMB_W = 14;

/**
 * 24 h (or 72 h) scrubber: an ARIA slider whose track is the hatched mode strip, bound to the store hour.
 * Its track spans exactly the chart's plot area, so the thumb sits on the chart playhead.
 * ←/→ 15 min · PageUp/PageDown 1 h · Home/End ends of the range.
 */
export function Scrubber({ model, width }: { model: DayModel; width: number }) {
  const setHour = useSystemStore((s) => s.setHour);
  const { step, hour } = useDayStep();
  const uid = useHatchId();
  const dragging = useRef(false);
  const trackW = Math.max(40, width - GUTTER_L - GUTTER_R);
  const h = Math.min(model.tMax, Math.max(0, hour));
  const x = (h / model.tMax) * trackW;
  const clock = clockLabel(h, model.tMax);
  const multi = model.tMax > 24;
  const valueText = `${multi ? `Hari ${dayNumber(h)}, ` : ''}${clock}. ${LABELS.mode[step.router.mode]}`;

  const set = (v: number) => setHour(Math.min(model.tMax, Math.max(0, v)));

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = e.key;
    let next: number | null = null;
    if (k === 'ArrowRight' || k === 'ArrowUp') next = h + (e.shiftKey ? BIG_H : STEP_H);
    else if (k === 'ArrowLeft' || k === 'ArrowDown') next = h - (e.shiftKey ? BIG_H : STEP_H);
    else if (k === 'PageUp') next = h + BIG_H;
    else if (k === 'PageDown') next = h - BIG_H;
    else if (k === 'Home') next = 0;
    else if (k === 'End') next = model.tMax;
    if (next === null) return;
    e.preventDefault();
    set(Math.round(next / STEP_H) * STEP_H);
  };

  const fromPointer = (e: ReactPointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - box.left) / box.width) * model.tMax;
    set(Math.round(t / STEP_H) * STEP_H);
  };

  return (
    <div className="relative flex h-14 items-center" style={{ paddingLeft: GUTTER_L, paddingRight: GUTTER_R }}>
      <output
        className="num absolute left-0 top-1/2 -translate-y-1/2 text-mono-s text-ink"
        style={{ width: GUTTER_L }}
        aria-hidden="true"
      >
        {clock}
      </output>
      <div
        role="slider"
        tabIndex={0}
        aria-label={multi ? 'Jam dalam tiga hari' : 'Jam dalam sehari'}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={model.tMax}
        aria-valuenow={Number(h.toFixed(2))}
        aria-valuetext={valueText}
        onKeyDown={onKeyDown}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) fromPointer(e);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
        className="sv-scrub relative h-11 w-full cursor-ew-resize rounded-xs"
        style={{ touchAction: 'pan-y' }}
      >
        <svg width={trackW} height={44} viewBox={`0 0 ${trackW} 44`} className="pointer-events-none absolute left-0 top-0 block max-w-none" aria-hidden="true">
          <ModeHatchDefs uid={uid} />
          {model.bands.map((b, i) => {
            const x0 = (b.t0 / model.tMax) * trackW;
            const w = ((b.t1 - b.t0) / model.tMax) * trackW;
            return <rect key={i} x={x0} y={17} width={Math.max(0, w)} height={10} fill={modeFill(uid, b.mode)} />;
          })}
          <rect x={0.5} y={17.5} width={trackW - 1} height={9} fill="none" stroke="var(--color-ink-3)" strokeWidth="1" />
        </svg>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 block h-8 rounded-sm bg-ink"
          style={{ width: THUMB_W, left: -THUMB_W / 2, transform: `translate(${x}px, -50%)` }}
        >
          <span className="absolute inset-x-[5px] top-2 bottom-2 border-x border-paper/70" />
        </span>
      </div>
    </div>
  );
}
