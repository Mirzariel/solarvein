/**
 * R3F canvas for one collector stage: studio (lights, sweep, haze, shadow), the model, the simulation-driven
 * effects (owned by the Motion Director), the camera rig and the annotation projector.
 *
 * Render-loop policy
 *  - `frameloop="demand"` while the stage is on screen; `"never"` when it is scrolled away, the tab is hidden or the
 *    shader programs are still compiling (`compileAsync`, KHR_parallel_shader_compile). An off-screen stage does not
 *    request or render a single frame, and this component is `memo`ed so an input change never re-renders it.
 *  - Idle cap: while the camera is at rest and no weather transition runs, `invalidate` is spaced to 30 fps on
 *    medium / 20 fps on low (high is uncapped). Camera, explode and weather activity run uncapped.
 *  - Quality: starts `medium` (`low` on <= 4 cores / <= 4 GB); drei PerformanceMonitor steps down within seconds and
 *    promotes to `high` on desktop only after sustained headroom. The environment resolution is identical on every
 *    tier, so a promotion never recompiles the PBR programs.
 */
import { PerformanceMonitor } from '@react-three/drei';
import { Canvas, useThree } from '@react-three/fiber';
import { memo, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useInView, useReducedMotion } from '../hooks';
import { weather } from '../motion';
import { CameraRig, CAMERA_FOV, initialCameraPosition } from './CameraRig';
import Collector from './Collector';
import { StageDriver } from './StageDriver';
import { Studio } from './Studio';
import { EXPERIENCE_ANCHORS, INSPECT_ANCHORS, Projector } from './anchors';
import { SceneEffects } from './effects';
import { COLORS } from './palette';
import { IDLE_FRAME_MS, QualityContext, STEP_DOWN, STEP_UP, TIERS, type QualityTier } from './quality';
import { useStage } from './stage';

/** Wakes a demand loop when the stage comes (back) into view. */
function Wake({ active }: { active: boolean }) {
  const invalidate = useThree((s) => s.invalidate);
  const frameloop = useThree((s) => s.frameloop);
  useEffect(() => {
    if (active && frameloop !== 'never') invalidate();
  }, [active, frameloop, invalidate]);
  return null;
}

/**
 * Shader warm-up (gate-3 P0). Production QA measured a 1.2-2.6 s main-thread freeze the first time a stage was seen:
 * `getProgramInfoLog` blocks until the driver has linked the program. Two causes:
 *  1. the shadow-depth program is NOT compiled by `compile()` (it exists only in the shadow pass), so the first
 *     visible render linked it synchronously, and
 *  2. that stall made the PerformanceMonitor step the tier down to `low` (shadows off), which changes the cache key
 *     of EVERY lit material: the whole scene was compiled a second time, right on arrival.
 * Now: wait until the scene is really built (collector + environment), `compileAsync` it (KHR_parallel_shader_compile,
 * the main thread stays free), then do ONE hidden `render` inside requestIdleCallback (shadow-depth program, texture and
 * geometry uploads) before the loop may start. Stages warm one after the other (a shared queue), so two canvases never
 * block the main thread together. The PerformanceMonitor is only armed after the stage has been animating for 2.5 s.
 */
let warmQueue: Promise<void> = Promise.resolve();
const WARM_DEADLINE_MS = 8000;

const idle = (fn: () => void, timeout = 1500): void => {
  const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout });
  else window.setTimeout(fn, 60);
};

/** Private shape of three's PMREMGenerator (pinned three 0.186): only used to pre-link its shaders. */
interface PmremInternals {
  _setSize?: (n: number) => void;
  _allocateTargets?: () => THREE.WebGLRenderTarget;
  _ggxMaterial?: THREE.Material | null;
  _lodMeshes?: THREE.Mesh[];
  _cubemapMaterial?: THREE.Material | null;
  compileCubemapShader?: () => void;
  dispose: () => void;
}

/**
 * The environment cube is converted to a PMREM the first time a lit material is drawn, and that conversion links
 * three's GGX convolution shader SYNCHRONOUSLY (~1 s of `getProgramInfoLog` on D3D11). The renderer caches programs by
 * source, so linking the identical shader up front with `compileAsync` (KHR_parallel_shader_compile) turns that stall
 * into a cache hit. Uses private fields of the pinned three version; any failure just leaves today's behaviour.
 */
async function prewarmPmrem(gl: THREE.WebGLRenderer, size: number): Promise<PmremInternals | null> {
  const g = new THREE.PMREMGenerator(gl) as unknown as PmremInternals;
  const r = gl as unknown as { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
  if (!r.compileAsync || !g._setSize || !g._allocateTargets) return g;
  const prev = gl.getRenderTarget();
  try {
    g._setSize(size);
    const target = g._allocateTargets(); // LinearSRGB half-float target: same output colour space as the real pass
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const jobs: Promise<unknown>[] = [];
    gl.setRenderTarget(target);
    const ggx = g._ggxMaterial;
    const lod = g._lodMeshes?.[1];
    if (ggx && lod) {
      lod.material = ggx;
      jobs.push(r.compileAsync(lod, cam));
    }
    g.compileCubemapShader?.();
    const cube = g._cubemapMaterial;
    if (cube) jobs.push(r.compileAsync(new THREE.Mesh(new THREE.BufferGeometry(), cube), cam));
    await Promise.all(jobs);
  } catch {
    /* best effort */
  } finally {
    gl.setRenderTarget(prev);
  }
  return g;
}

function Warm({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const advance = useThree((s) => s.advance);
  const pmrem = useRef<PmremInternals | null>(null);
  useEffect(
    () => () => {
      pmrem.current?.dispose();
      pmrem.current = null;
    },
    [],
  );
  const envSize = TIERS.medium.env; // identical on every tier (see quality.ts)
  useEffect(() => {
    let cancelled = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onReady();
    };
    const hardStop = window.setTimeout(finish, WARM_DEADLINE_MS + 4000);

    /** The Suspense subtree (studio, collector, effects) and the environment are mounted. */
    const built = (): boolean => scene.environment !== null && scene.getObjectByName('collector') !== undefined;
    const waitBuilt = (): Promise<void> =>
      new Promise((resolve) => {
        const t0 = performance.now();
        const tick = () => {
          if (cancelled || built() || performance.now() - t0 > WARM_DEADLINE_MS) resolve();
          else window.setTimeout(tick, 80);
        };
        tick();
      });
    const compile = async (): Promise<void> => {
      const r = gl as unknown as { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
      try {
        if (r.compileAsync) await r.compileAsync(scene, camera);
        else gl.compile(scene, camera);
      } catch {
        /* best effort */
      }
    };
    const hiddenRender = (): Promise<void> =>
      new Promise((resolve) => {
        idle(() => {
          try {
            // one full frame (useFrame callbacks included): environment cube + PMREM, shadow-depth program, first
            // texture / geometry uploads, all off the user's path
            advance(performance.now() / 1000, true);
          } catch {
            /* best effort */
          }
          resolve();
        });
      });

    const mark = (name: string): void => {
      try {
        performance.mark(`sv3d:${name}`);
      } catch {
        /* ignore */
      }
    };
    const job = warmQueue.then(async () => {
      mark('warm-start');
      if (!pmrem.current) pmrem.current = await prewarmPmrem(gl, envSize);
      mark('pmrem');
      await waitBuilt();
      if (cancelled) return;
      mark('built');
      await compile();
      if (cancelled) return;
      mark('compiled');
      await hiddenRender();
      mark('warmed');
    });
    warmQueue = job.catch(() => undefined);
    void job.then(finish, finish);
    return () => {
      cancelled = true;
      window.clearTimeout(hardStop);
    };
  }, [gl, scene, camera, advance, envSize, onReady]);
  return null;
}

/** Spaces `invalidate` calls while idle (camera at rest, no weather transition, not interacting). */
function FrameCap({ minMs }: { minMs: number }) {
  const stage = useStage();
  const get = useThree((s) => s.get);
  const set = useThree((s) => s.set);
  useEffect(() => {
    if (minMs <= 0) return;
    const orig = get().invalidate;
    let last = 0;
    let timer = 0;
    const capped: typeof orig = (frames) => {
      const now = performance.now();
      const fast = stage.boost.current > now || weather.frame().moving;
      const wait = fast ? 0 : minMs - (now - last);
      if (wait <= 0) {
        last = now;
        orig(frames);
        return;
      }
      if (!timer) {
        timer = window.setTimeout(() => {
          timer = 0;
          last = performance.now();
          orig(frames);
        }, wait);
      }
    };
    set({ invalidate: capped });
    return () => {
      window.clearTimeout(timer);
      set({ invalidate: orig });
    };
  }, [minMs, get, set, stage.boost]);
  return null;
}

/** Development hook: lets QA scripts read renderer.info / drive the camera. Stripped from production builds. */
function DevProbe() {
  const stage = useStage();
  const state = useThree();
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as { __sv3d?: Record<string, unknown> };
    w.__sv3d = w.__sv3d ?? {};
    w.__sv3d[stage.variant] = { gl: state.gl, scene: state.scene, camera: state.camera, api: stage.api, store: stage.store, explode: stage.explode, mood: stage.mood };
  }, [stage, state]);
  return null;
}

export interface CollectorCanvasProps {
  /** Spring the model apart once the stage first scrolls into view (inspect). */
  explodeOnView?: boolean;
  /** Keep the drawing buffer (for stills / screenshots of the canvas). */
  preserveDrawingBuffer?: boolean;
  /** Force a quality tier (marketing renders use high). Disables the automatic step-down. */
  tier?: QualityTier;
  /** Mount the simulation-driven effects (sun, rain, arrows, pulses). Default true. */
  effects?: boolean;
}

const weakDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const n = navigator as Navigator & { deviceMemory?: number };
  return (n.hardwareConcurrency ?? 8) <= 4 || (n.deviceMemory ?? 8) <= 4;
};

function CollectorCanvas({ explodeOnView = false, preserveDrawingBuffer = false, tier: forced, effects = true }: CollectorCanvasProps) {
  const stage = useStage();
  const [viewRef, inView] = useInView<HTMLDivElement>({ rootMargin: '0px', threshold: 0.1 });
  const reduced = useReducedMotion();
  const [auto, setAuto] = useState<QualityTier>(() => (weakDevice() ? 'low' : 'medium'));
  const tier = forced ?? auto;
  const maxTier = useRef<QualityTier>(
    typeof window !== 'undefined' && window.innerWidth >= 1024 && !weakDevice() && !window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'high' : 'medium',
  );
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || !document.hidden);
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  const animate = inView && visible && ready;
  // the tier monitor must not judge the first frames of a stage (any residual one-off work would drop the tier,
  // switch shadows off and recompile every program): arm it after 2.5 s of continuous animation
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (animate) {
      try {
        performance.mark(`sv3d:animate:${stage.variant}`);
      } catch {
        /* ignore */
      }
    }
    if (!animate) {
      setArmed(false);
      return;
    }
    const t = window.setTimeout(() => setArmed(true), 2500);
    return () => window.clearTimeout(t);
  }, [animate, stage.variant]);
  const inspect = stage.variant === 'inspect';
  const transparent = stage.background === 'transparent';

  useEffect(() => {
    const on = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  // First time the inspect stage is seen: spring the layers apart.
  useEffect(() => {
    if (!explodeOnView || !inView) return;
    const t = window.setTimeout(() => stage.store.getState().setExploded(true), reduced ? 0 : 350);
    return () => window.clearTimeout(t);
  }, [explodeOnView, inView, reduced, stage.store]);

  return (
    <div ref={viewRef} className="absolute inset-0">
      <Canvas
        frameloop={animate ? 'demand' : 'never'}
        dpr={[1, TIERS[tier].dpr]}
        camera={{ fov: CAMERA_FOV, near: 0.1, far: 60, position: initialCameraPosition(stage.variant) }}
        gl={{ antialias: true, alpha: transparent, powerPreference: 'high-performance', preserveDrawingBuffer }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1;
          if (transparent) gl.setClearColor(0x000000, 0);
          gl.domElement.addEventListener('webglcontextlost', (e) => e.preventDefault());
        }}
        onPointerMissed={() => {
          if (inspect) stage.store.getState().setFocusPart(null);
        }}
      >
        {transparent ? null : <color attach="background" args={[COLORS.background]} />}
        {forced || !armed ? null : (
          <PerformanceMonitor
            ms={120}
            iterations={3}
            flipflops={2}
            // the idle ambient loop is capped at 30 fps (20 on low): drei's default lower bound (40) would read that cap
            // as a slow device and step down forever. Decline only below 24 fps, promote only above 55.
            bounds={() => [24, 55]}
            onDecline={() => setAuto((t) => STEP_DOWN[t])}
            onIncline={() => setAuto((t) => (t === maxTier.current ? t : STEP_UP[t]))}
          />
        )}
        <QualityContext.Provider value={tier}>
          <Suspense fallback={null}>
            <StageDriver />
            <Studio />
            <Collector />
            {effects ? <SceneEffects /> : null}
          </Suspense>
        </QualityContext.Provider>
        <CameraRig />
        <Projector anchors={inspect ? INSPECT_ANCHORS : EXPERIENCE_ANCHORS} />
        <FrameCap minMs={reduced ? 0 : IDLE_FRAME_MS[tier]} />
        <Wake active={animate} />
        <Warm onReady={onReady} />
        <DevProbe />
      </Canvas>
    </div>
  );
}

export default memo(CollectorCanvas);
