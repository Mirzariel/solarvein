/**
 * DOM chrome that sits on the dark stage, in stage tokens (docs/audit/05-creative-direction.md 2.4, 5.10):
 *  - experience: minimal - Reset View (+ zoom on wide stages) as small icon buttons, nothing else.
 *  - inspect: Urai, Potongan, Lapisan (compact popover) and Reset View.
 * Camera buttons call the same spring as double-click (ViewerApi). View toggles write the STAGE-local store.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { BTN, FOCUS_RING, INK, INK2, LINE_BORDER } from './chrome';
import { LAYERS } from './dims';
import { IconExplode, IconLayers, IconMinus, IconPlus, IconReset, IconSection } from './icons';
import { rampHex } from './palette';
import { useStage, useStageState } from './stage';

interface ToolProps {
  label: string;
  icon: ReactNode;
  text?: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  onClick: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  /** Extra classes (e.g. hide on narrow stages). */
  className?: string;
}

function Tool({ label, icon, text, pressed, expanded, controls, onClick, buttonRef, className = '' }: ToolProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className={`${BTN} ${className}`}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-controls={controls}
      onClick={onClick}
    >
      {icon}
      {text ? <span className="hidden @[34rem]:inline">{text}</span> : null}
    </button>
  );
}

function LayersMenu() {
  const stage = useStage();
  const visibility = useStageState(stage.store, (s) => s.layerVisibility);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const panelId = useId();
  const hidden = LAYERS.filter((l) => !visibility[l.id]).length;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  return (
    <div
      ref={root}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <Tool
        buttonRef={(el) => {
          trigger.current = el;
        }}
        label={hidden ? `Lapisan (${hidden} disembunyikan)` : 'Lapisan'}
        icon={<IconLayers />}
        text="Lapisan"
        expanded={open}
        controls={panelId}
        onClick={() => setOpen((o) => !o)}
      />
      {open ? (
        <div
          id={panelId}
          role="group"
          aria-label="Lapisan kolektor"
          className={`pointer-events-auto absolute right-0 top-full z-30 mt-1.5 w-60 rounded-xl border p-2 ${LINE_BORDER} bg-[color:var(--color-stage-1,#15191D)]`}
        >
          <ul className="flex flex-col">
            {LAYERS.map((l) => {
              const id = `${panelId}-${l.id}`;
              return (
                <li key={l.id}>
                  <label
                    htmlFor={id}
                    className="flex min-h-9 cursor-pointer items-center gap-2.5 rounded-md px-2 text-[13px] hover:bg-[rgba(233,236,238,0.06)] max-sm:min-h-11"
                  >
                    <input
                      id={id}
                      type="checkbox"
                      className={`size-4 shrink-0 accent-[#E9ECEE] ${FOCUS_RING}`}
                      checked={visibility[l.id]}
                      onChange={() => stage.store.getState().toggleLayer(l.id)}
                    />
                    <span className={INK}>{l.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={() => stage.store.getState().showAllLayers()}
            disabled={hidden === 0}
            className={`mt-1 w-full rounded-md px-2 py-2 text-left text-xs ${INK2} hover:text-[color:var(--color-stage-ink,#E9ECEE)] disabled:opacity-40 ${FOCUS_RING}`}
          >
            Tampilkan semua
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function StageToolbar({ hasCamera, zoom = true }: { hasCamera: boolean; zoom?: boolean }) {
  const stage = useStage();
  const inspect = stage.variant === 'inspect';
  const exploded = useStageState(stage.store, (s) => s.exploded);
  const cross = useStageState(stage.store, (s) => s.crossSection);
  const api = () => stage.api.current;

  return (
    <div role="toolbar" aria-label="Kontrol tampilan model" className="pointer-events-none absolute right-3 top-3 z-20 flex items-start gap-1.5">
      {inspect ? (
        <>
          <Tool
            label="Urai lapisan"
            icon={<IconExplode />}
            text="Urai"
            pressed={exploded}
            onClick={() => stage.store.getState().toggleExploded()}
          />
          <Tool
            label="Potongan melintang"
            icon={<IconSection />}
            text="Potongan"
            pressed={cross}
            onClick={() => {
              const st = stage.store.getState();
              st.toggleCrossSection();
              // the cut face looks +Z: swing the camera to face it (clean axis-aligned section); restore on exit
              if (!st.crossSection) stage.api.current?.view?.({ az: 0.3, pol: 1.3, zoom: 0.62 });
              else stage.api.current?.reset();
            }}
          />
          <LayersMenu />
        </>
      ) : null}
      {hasCamera && zoom ? (
        <>
          <Tool label="Perbesar" icon={<IconPlus />} className="@max-[34rem]:hidden" onClick={() => api()?.zoom(1)} />
          <Tool label="Perkecil" icon={<IconMinus />} className="@max-[34rem]:hidden" onClick={() => api()?.zoom(-1)} />
        </>
      ) : null}
      {hasCamera ? <Tool label="Atur ulang tampilan" icon={<IconReset />} onClick={() => api()?.reset()} /> : null}
    </div>
  );
}

const RAMP_CSS = `linear-gradient(90deg, ${[0, 0.25, 0.5, 0.75, 1].map((s) => `${rampHex(s)} ${s * 100}%`).join(', ')})`;

/** Liquid colour legend with the honesty note: the colour contrast is exaggerated. */
export function LiquidLegend({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 text-xs leading-4 ${INK2} ${className}`}>
      <span aria-hidden="true" className="inline-block h-[3px] w-7 rounded-full" style={{ background: RAMP_CSS }} />
      <span>
        Suhu cairan <span className="opacity-80">(warna diperkuat)</span>
      </span>
    </span>
  );
}

/** Bottom-left legend of the inspect stage: the symbol is drawn as the actual encoding. */
export function InspectLegend() {
  return (
    <div
      aria-label="Legenda"
      className="pointer-events-none absolute bottom-3 left-3 z-10 flex flex-col gap-1 @[34rem]:flex-row @[34rem]:items-center @[34rem]:gap-5"
    >
      <LiquidLegend />
      <span className={`inline-flex items-center gap-1.5 text-xs leading-4 ${INK2}`}>
        <span aria-hidden="true" className="text-[color:var(--color-stage-heat,#F0A05C)]">
          ↓
        </span>
        Panas ke cairan
        <span aria-hidden="true" className="ml-1.5 text-[color:var(--color-stage-cool,#5FB3D6)]">
          ↑
        </span>
        Panas dari cairan
      </span>
    </div>
  );
}
