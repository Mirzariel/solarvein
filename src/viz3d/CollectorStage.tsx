/**
 * The 3D collector stage. Two variants (max two WebGL stages on the page):
 *
 *  - `experience` (01 Pengalaman): minimal chrome - Reset View (+ zoom on wide stages) and the T_in / T_out leader
 *    labels. No layer list, no cross-section toggle.
 *  - `inspect` (02 Di dalam SolarVein): exploded (spring) with four clickable annotations (Sel PV & kaca, Pelat
 *    absorber, Saluran cairan, Insulasi & rangka), compact Urai / Potongan / Lapisan / Reset toolbar and a legend.
 *
 * States:  WebGL unknown -> skeleton;  no WebGL / chunk or context failure -> Schematic (stage tone);
 *          WebGL ok -> lazy <CollectorCanvas /> (three.js stays in its own chunk).
 * Fills its parent (the parent sets the height). `children` render as an overlay inside the stage frame.
 */
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useState,
  type ErrorInfo,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { useInView, useMediaQuery, useWebGLAvailable } from '../hooks';
import { useVisualSelect } from '../motion';
import type { StageContextKind } from './stage';
import { CutawayFallback } from './Schematic';
import type { QualityTier } from './quality';
import { InspectLegend, StageToolbar } from './StageChrome';
import { PartAnnotations } from './PartAnnotations';
import { TempLabels } from './TempLabels';
import { formatId } from './fmt';
import {
  StageContext,
  createStageStore,
  type MoodState,
  type ProjectionSink,
  type StageBackground,
  type StageCtx,
  type StageStore,
  type StageVariant,
} from './stage';
import type { ViewerApi } from './viewerApi';

const CollectorCanvas = lazy(() => import('./CollectorCanvas'));

/**
 * three.js (~1 MB) must not compete with the opening video and fonts: the canvas mounts once the stage is within a
 * quarter screen of the viewport, or when the browser is idle after load, whichever comes first.
 */
function useDeferredMount(): [(el: HTMLDivElement | null) => void, boolean] {
  const [ref, near] = useInView<HTMLDivElement>({ rootMargin: '25% 0px', once: true });
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    let id = 0;
    let t = 0;
    const arm = () => {
      t = window.setTimeout(() => {
        if (w.requestIdleCallback) id = w.requestIdleCallback(() => setIdle(true), { timeout: 3000 });
        else setIdle(true);
      }, 1200);
    };
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
    return () => {
      window.removeEventListener('load', arm);
      window.clearTimeout(t);
      if (id) w.cancelIdleCallback?.(id);
    };
  }, []);
  return [ref, near || idle];
}

/**
 * Live condition sentence for screen readers, read from the v2 visual frame (frame.result + frame.router; the router's
 * pump command wins when present). Pump on: heat flows cell -> liquid and the readings are real; pump off: no
 * collection and no stagnant temperatures. A leaf: only this tiny component re-renders (<= 2 Hz, on text change).
 */
function LiveState() {
  const text = useVisualSelect(
    (f) => {
      const pumpOn = f.router ? f.router.pumpOn : f.result.pumpOn;
      return pumpOn
        ? `Kondisi: panas mengalir dari sel ke cairan; cairan masuk ${formatId(f.result.inletC, 0)} °C, keluar ${formatId(f.result.outletC, 0)} °C.`
        : 'Kondisi: pompa diam; tidak ada pengumpulan panas.';
    },
    2,
  );
  return <>{text}</>;
}

/** Hint per input type; says only what works (drag / ctrl+wheel with a mouse, one-finger swipe / pinch on touch). */
function StageHint() {
  const coarse = useMediaQuery('(pointer: coarse)', false);
  return (
    <p className="pointer-events-none absolute bottom-4 right-4 z-10 hidden rounded-sm bg-stage-0/75 px-3 py-1.5 text-small text-stage-ink @[34rem]:block">
      {coarse ? 'Geser satu jari untuk memutar · cubit untuk memperbesar' : 'Seret untuk memutar · Ctrl + gulir untuk memperbesar'}
    </p>
  );
}

function Skeleton() {
  return (
    <div className="absolute inset-0 grid place-items-center" aria-hidden="true">
      <div className="h-20 w-40 animate-pulse rounded-md border border-[color:var(--color-stage-line,#262C33)] bg-[color:var(--color-stage-1,#15191D)]" />
    </div>
  );
}

interface BoundaryProps {
  children: ReactNode;
  onFail: () => void;
  fallback: ReactNode;
}
class CanvasBoundary extends Component<BoundaryProps, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[SolarVein] 3D viewer failed, using SVG fallback:', error, info.componentStack);
    this.props.onFail();
  }
  override render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export interface CollectorStageProps {
  variant?: StageVariant;
  /** 'transparent' = alpha canvas (no sweep / haze) so the stage can float over photography. */
  background?: StageBackground;
  /** 'roof' = hotel roof: graphite plinth, parapet, plant room, two ghost neighbour modules (default for experience); 'none' = clean (default for inspect). */
  context?: StageContextKind;
  /** Share the stage-local state (selected part, explode ...) with the surrounding section. */
  store?: StageStore;
  /** experience: show the T_in / T_out leader labels (default true). */
  labels?: boolean;
  /** inspect: numbers-only markers (narrow screens; the page then lists the parts below the stage). */
  compactAnnotations?: boolean;
  /** inspect: legend bottom-left (default true). */
  legend?: boolean;
  /** Truthful interaction hint bottom-right (only when 3D is running). */
  hint?: boolean;
  /** Show zoom +/- next to Reset View (default true; hidden on stages narrower than 34rem, where pinch is used). */
  zoomButtons?: boolean;
  /** inspect: spring the layers apart the first time the stage is seen (default true). */
  explodeOnView?: boolean;
  /** Keep the drawing buffer (stills). */
  preserveDrawingBuffer?: boolean;
  /** Force a quality tier (marketing renders). */
  tier?: QualityTier;
  /** Mount the simulation-driven effects (default true). */
  effects?: boolean;
  /** false = no DOM chrome at all (stills / marketing renders). Default true. */
  chrome?: boolean;
  /** Overlay content (switch, readout strip ...) positioned by the caller inside the stage frame. */
  children?: ReactNode;
  className?: string;
}

export default function CollectorStage({
  variant = 'experience',
  background = 'graphite',
  context,
  store,
  labels = true,
  compactAnnotations = false,
  legend = true,
  zoomButtons = true,
  hint = false,
  explodeOnView = true,
  preserveDrawingBuffer = false,
  tier,
  effects = true,
  chrome = true,
  children,
  className = '',
}: CollectorStageProps) {
  const webgl = useWebGLAvailable();
  const [failed, setFailed] = useState(false);
  const descId = useId();
  const onFail = useCallback(() => setFailed(true), []);
  const inspect = variant === 'inspect';

  const [ctx] = useState<StageCtx>(() => {
    const st = store ?? createStageStore({ exploded: false });
    return {
      variant,
      background,
      context: context ?? (variant === 'experience' ? 'roof' : 'none'),
      boost: { current: 0 },
      store: st,
      explode: { current: st.getState().exploded ? 1 : 0 },
      mood: { current: { sun: 0, rain: 0, humid: 0.6, night: 0, driven: false } as MoodState },
      projection: { current: null as ProjectionSink | null },
      api: { current: null as ViewerApi | null },
      wake: { current: null as (() => void) | null },
    };
  });
  const apiRef = ctx.api;

  const use3d = webgl === true && !failed;
  const [mountRef, mountNow] = useDeferredMount();
  const label = use3d ? 'Model 3D kolektor PVT' : 'Penampang kolektor PVT';

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget || !use3d) return;
    const api = apiRef.current;
    if (!api) return;
    switch (e.key) {
      case 'ArrowLeft':
        api.rotate(-1);
        break;
      case 'ArrowRight':
        api.rotate(1);
        break;
      case '+':
      case '=':
        api.zoom(1);
        break;
      case '-':
      case '_':
        api.zoom(-1);
        break;
      case '0':
        api.reset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  const fallback = (
    <div className="absolute inset-0">
      <CutawayFallback />
    </div>
  );

  return (
    <StageContext.Provider value={ctx}>
      <div
        role="group"
        aria-label={label}
        aria-describedby={descId}
        aria-roledescription={use3d ? 'penampil model 3D' : 'diagram interaktif'}
        tabIndex={use3d ? 0 : undefined}
        onKeyDown={onKeyDown}
        data-stage={variant}
        ref={mountRef}
        className={`@container relative isolate h-full min-h-72 w-full select-none overflow-hidden outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[color:var(--color-stage-ink,#E9ECEE)] ${
          background === 'transparent' ? '' : 'bg-[color:var(--color-stage-0,#0E1114)]'
        } ${className}`}
      >
        <p id={descId} className="sr-only">
          <LiveState />{' '}
          {use3d
            ? 'Seret untuk memutar model. Tombol panah kiri dan kanan memutar, plus dan minus memperbesar atau memperkecil, nol mengatur ulang tampilan. Klik dua kali juga mengatur ulang. Tahan Ctrl sambil menggulir untuk zoom.'
            : 'Penampang berlapis kolektor: kaca, sel PV, antarmuka termal, absorber, saluran cairan, insulasi.'}{' '}
          Cairan selalu mengalir dari saluran masuk ke saluran keluar; panas hanya berpindah dari sel ke cairan.
        </p>

        {webgl === null ? (
          <Skeleton />
        ) : use3d ? (
          <CanvasBoundary onFail={onFail} fallback={fallback}>
            <Suspense fallback={<Skeleton />}>
              {mountNow ? null : <Skeleton />}
              {mountNow ? <CollectorCanvas explodeOnView={inspect && explodeOnView} preserveDrawingBuffer={preserveDrawingBuffer} tier={tier} effects={effects} /> : null}
            </Suspense>
          </CanvasBoundary>
        ) : (
          fallback
        )}

        {use3d && chrome ? (
          <>
            {inspect ? <PartAnnotations compact={compactAnnotations} /> : labels ? <TempLabels /> : null}
            <StageToolbar hasCamera zoom={zoomButtons} />
            {hint ? <StageHint /> : null}
            {inspect && legend ? <InspectLegend /> : null}
          </>
        ) : null}
        {children}
      </div>
    </StageContext.Provider>
  );
}
