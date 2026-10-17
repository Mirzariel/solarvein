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
import { memo, Suspense, useEffect, useRef, useState } from 'react';
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

/** Compile every shader program once, asynchronously (no main-thread stall), then let the loop start. */
function Warm({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      onReady();
    };
    const fallback = window.setTimeout(finish, 6000);
    const start = () => {
      const r = gl as unknown as { compileAsync?: (s: THREE.Object3D, c: THREE.Camera) => Promise<unknown> };
      if (r.compileAsync) r.compileAsync(scene, camera).then(finish, finish);
      else {
        try {
          gl.compile(scene, camera);
        } catch {
          /* best effort */
        }
        finish();
      }
    };
    const t = window.setTimeout(start, 50); // let the children mount first
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(fallback);
    };
  }, [gl, scene, camera, onReady]);
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
  const animate = inView && visible && ready;
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
        {forced || !ready ? null : (
          <PerformanceMonitor
            ms={120}
            iterations={3}
            flipflops={2}
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
        <Warm onReady={() => setReady(true)} />
        <DevProbe />
      </Canvas>
    </div>
  );
}

export default memo(CollectorCanvas);
