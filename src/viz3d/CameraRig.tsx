/**
 * Camera for the collector stage (docs/audit/06-motion.md, MOTION_SYSTEM.md section 3 "Camera").
 *
 *  - Own orbit (no OrbitControls): pointer drag sets an angular GOAL; the camera follows it with a critically
 *    damped spring (frame-rate independent, no bounce); on release the goal keeps its velocity and decays
 *    exponentially (inertia). Azimuth +/-55 deg around home, elevation 12..60 deg (polar 30..78 deg: the camera can
 *    never go under the floor), zoom 0.65..1.4 x home distance.
 *  - Reset View, double-click, the toolbar rotate/zoom buttons and the keyboard all retarget the same spring
 *    (w = 7.3, ~800 ms, velocity preserved). A drag cancels any running animation.
 *  - Mode changes never touch the camera. Auto-rotate does not exist (default OFF).
 *  - Touch: horizontal drag orbits, vertical swipes scroll the page (`touch-action: pan-y`).
 *  - Home is fitted so the model fills ~70 % of the stage width (FOV 28 deg), panel centre at ~46 % of the height.
 *  - Ctrl/Cmd + wheel (and trackpad pinch) zooms; a plain wheel keeps scrolling the page.
 *  - Reduced motion: every move snaps.
 */
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useReducedMotion } from '../hooks';
import { Spring, clamp } from './spring';
import { useStage, type StageVariant } from './stage';
import type { ViewerApi } from './viewerApi';

export const CAMERA_FOV = 28;
const D2R = Math.PI / 180;
const CAMERA_W = 7.3; // ~800 ms to 98 %
const FOLLOW_W = 22; // while dragging / flinging
const ROTATE_STEP = 30 * D2R;
const AZ_RANGE = 55 * D2R;
const POLAR_MIN = 30 * D2R;
const POLAR_MAX = 78 * D2R;
const ZOOM_MIN = 0.65;
const ZOOM_MAX = 1.4;
const FLING_DECAY = 3.4; // 1/s

interface Pose {
  az: number;
  pol: number;
  r: number;
  ty: number;
}

// ── home pose fitting ────────────────────────────────────────────────────────────────────────
const fitCam = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 50);
const fitV = new THREE.Vector3();

/** Bounding-box corners (scene units) the home pose has to frame. */
function corners(variant: StageVariant): THREE.Vector3[] {
  const inspect = variant === 'inspect';
  const y0 = inspect ? -0.2 : -0.05;
  const y1 = inspect ? 0.0315 + 0.4 + 0.01 : 0.04;
  const z0 = -1.05; // inlet / outlet stub tips
  const z1 = 0.85;
  const out: THREE.Vector3[] = [];
  for (const x of [-0.5, 0.5]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

function project(pose: Pose, pts: THREE.Vector3[]): { minX: number; maxX: number; minY: number; maxY: number } {
  const s = new THREE.Spherical(pose.r, pose.pol, pose.az);
  fitCam.position.setFromSpherical(s);
  fitCam.position.y += pose.ty;
  fitCam.lookAt(0, pose.ty, 0);
  fitCam.updateMatrixWorld(true);
  fitCam.updateProjectionMatrix();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    fitV.copy(p).project(fitCam);
    minX = Math.min(minX, fitV.x);
    maxX = Math.max(maxX, fitV.x);
    minY = Math.min(minY, fitV.y);
    maxY = Math.max(maxY, fitV.y);
  }
  return { minX, maxX, minY, maxY };
}

/** Home pose for a stage of the given aspect (width / height) and width in CSS px. */
export function fitHome(variant: StageVariant, aspect: number, widthPx: number): Pose {
  const inspect = variant === 'inspect';
  const compact = widthPx < 520;
  const az = (inspect ? (compact ? 44 : 52) : compact ? 42 : 62) * D2R;
  const pol = (inspect ? 56 : compact ? 62 : 66) * D2R;
  const widthFrac = inspect ? (compact ? 0.8 : 0.62) : compact ? 0.9 : 0.72;
  const heightMax = inspect ? 0.86 : 0.8;
  const centreNdc = inspect ? 0.02 : compact ? 0.06 : 0.1; // panel centre a touch above the middle (readout strip below)
  fitCam.aspect = Math.max(0.2, aspect);
  const pts = corners(variant);
  let ty = inspect ? 0.22 : 0.06;
  // r: smallest distance satisfying both the width and the height budget (bisection; both are monotone in r)
  let lo = 1.2;
  let hi = 14;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const b = project({ az, pol, r: mid, ty }, pts);
    const w = (b.maxX - b.minX) / 2;
    const h = (b.maxY - b.minY) / 2;
    if (w > widthFrac || h > heightMax) lo = mid;
    else hi = mid;
  }
  const r = hi;
  const k = r * Math.tan((CAMERA_FOV * D2R) / 2);
  for (let i = 0; i < 5; i++) {
    const b = project({ az, pol, r, ty }, pts);
    const c = (b.minY + b.maxY) / 2;
    ty += (c - centreNdc) * k * 0.9;
  }
  return { az, pol, r, ty };
}

export function initialCameraPosition(variant: StageVariant): [number, number, number] {
  const h = fitHome(variant, 1.9, 1100);
  const s = new THREE.Spherical(h.r, h.pol, h.az);
  const v = new THREE.Vector3().setFromSpherical(s);
  v.y += h.ty;
  return [v.x, v.y, v.z];
}

const wrap = (a: number): number => a - Math.PI * 2 * Math.round(a / (Math.PI * 2));

export function CameraRig() {
  const stage = useStage();
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const invalidateRaw = useThree((s) => s.invalidate);
  const invalidate = useCallback(() => {
    stage.boost.current = performance.now() + 300;
    invalidateRaw();
  }, [invalidateRaw, stage.boost]);
  const reduced = useReducedMotion();
  const variant = stage.variant;

  const spr = useMemo(() => ({ az: new Spring(), pol: new Spring(), r: new Spring(), ty: new Spring() }), []);
  const goal = useRef<Pose>({ az: 0, pol: 1, r: 4, ty: 0 });
  const home = useRef<Pose>({ az: 0, pol: 1, r: 4, ty: 0 });
  const touched = useRef(false);
  /** Look-at offset in the XZ plane (only set by setPose: close-up stills). */
  const look = useRef({ x: 0, z: 0 });
  const drag = useRef({ active: false, id: -1, x: 0, y: 0, t: 0, vAz: 0, vPol: 0, touch: false });
  const fling = useRef({ vAz: 0, vPol: 0 });
  const follow = useRef(CAMERA_W);
  const sph = useMemo(() => new THREE.Spherical(), []);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  const bounds = (): { az0: number; az1: number; r0: number; r1: number } => {
    const h = home.current;
    return { az0: h.az - AZ_RANGE, az1: h.az + AZ_RANGE, r0: h.r * ZOOM_MIN, r1: h.r * ZOOM_MAX };
  };
  const clampGoal = (g: Pose): Pose => {
    const b = bounds();
    g.az = clamp(g.az, b.az0, b.az1);
    g.pol = clamp(g.pol, POLAR_MIN, POLAR_MAX);
    g.r = clamp(g.r, b.r0, b.r1);
    return g;
  };

  const place = (): void => {
    sph.set(spr.r.x, spr.pol.x, spr.az.x);
    tmp.setFromSpherical(sph);
    camera.position.set(tmp.x + look.current.x, tmp.y + spr.ty.x, tmp.z + look.current.z);
    camera.lookAt(look.current.x, spr.ty.x, look.current.z);
    camera.updateMatrixWorld();
  };

  // Home pose: fitted to the stage; re-fitted on resize until the user has moved the camera.
  useLayoutEffect(() => {
    const h = fitHome(variant, size.width / Math.max(1, size.height), size.width);
    home.current = h;
    if (!touched.current) {
      goal.current = { ...h };
      spr.az.snap(h.az);
      spr.pol.snap(h.pol);
      spr.r.snap(h.r);
      spr.ty.snap(h.ty);
      place();
    } else {
      clampGoal(goal.current);
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant, size.width, size.height]);

  // API for the DOM chrome / keyboard.
  useEffect(() => {
    const go = (patch: Partial<Pose>) => {
      fling.current.vAz = 0;
      fling.current.vPol = 0;
      goal.current = clampGoal({ ...goal.current, ...patch });
      follow.current = CAMERA_W;
      touched.current = true;
      invalidate();
    };
    const api: ViewerApi = {
      rotate: (dir) => go({ az: goal.current.az + dir * ROTATE_STEP }),
      zoom: (dir) => go({ r: goal.current.r * (dir > 0 ? 0.8 : 1.25) }),
      view: (p) => {
        fling.current.vAz = 0;
        fling.current.vPol = 0;
        goal.current = { ...goal.current, az: p.az ?? goal.current.az, pol: p.pol ?? goal.current.pol, r: p.zoom ? home.current.r * p.zoom : goal.current.r };
        follow.current = CAMERA_W;
        touched.current = true;
        invalidate();
      },
      setPose: (p) => {
        look.current = { x: p.tx ?? 0, z: p.tz ?? 0 };
        const g = { az: p.az, pol: p.pol, r: p.r, ty: p.ty };
        goal.current = g;
        spr.az.snap(g.az);
        spr.pol.snap(g.pol);
        spr.r.snap(g.r);
        spr.ty.snap(g.ty);
        touched.current = true;
        place();
        invalidate();
      },
      reset: () => {
        look.current = { x: 0, z: 0 };
        touched.current = false;
        fling.current.vAz = 0;
        fling.current.vPol = 0;
        goal.current = { ...home.current };
        follow.current = CAMERA_W;
        invalidate();
      },
    };
    stage.api.current = api;
    return () => {
      if (stage.api.current === api) stage.api.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage.api, invalidate]);

  // Pointer orbit + double-click reset + ctrl/cmd wheel zoom.
  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = 'pan-y'; // vertical swipes keep scrolling the page
    const d = drag.current;
    // two-finger pinch: zoom through the same goal/spring (touch-action stays pan-y for one finger)
    const pts = new Map<number, { x: number; y: number }>();
    let pinch = 0;
    const dist = (): number => {
      const [a, b] = [...pts.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        // a second finger turns the orbit drag into a pinch
        d.active = false;
        d.id = -1;
        fling.current.vAz = 0;
        fling.current.vPol = 0;
        pinch = dist();
        follow.current = FOLLOW_W;
        touched.current = true;
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* best effort */
        }
        return;
      }
      d.active = true;
      d.id = e.pointerId;
      d.x = e.clientX;
      d.y = e.clientY;
      d.t = performance.now();
      d.vAz = 0;
      d.vPol = 0;
      d.touch = e.pointerType !== 'mouse';
      fling.current.vAz = 0;
      fling.current.vPol = 0;
      follow.current = FOLLOW_W;
      touched.current = true;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best effort */
      }
      el.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size >= 2) {
        const nd = dist();
        if (pinch > 0 && nd > 0) goal.current = clampGoal({ ...goal.current, r: goal.current.r * (pinch / nd) });
        pinch = nd;
        follow.current = FOLLOW_W;
        invalidate();
        return;
      }
      if (!d.active || e.pointerId !== d.id) return;
      const now = performance.now();
      const dt = Math.max(0.004, (now - d.t) / 1000);
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      d.x = e.clientX;
      d.y = e.clientY;
      d.t = now;
      const speed = 2.4 / Math.max(240, el.clientHeight); // rad per px: a full stage height ~ 2.4 rad
      const dAz = -dx * speed * 1.6;
      const dPol = d.touch ? 0 : -dy * speed;
      goal.current = clampGoal({ ...goal.current, az: goal.current.az + dAz, pol: goal.current.pol + dPol });
      const a = 1 - Math.exp(-dt * 18); // smoothed pointer velocity [rad/s]
      d.vAz += (dAz / dt - d.vAz) * a;
      d.vPol += (dPol / dt - d.vPol) * a;
      invalidate();
    };
    const onUp = (e: PointerEvent) => {
      const wasPinch = pts.size >= 2;
      pts.delete(e.pointerId);
      if (wasPinch) {
        pinch = pts.size >= 2 ? dist() : 0;
        invalidate();
        return; // the remaining finger does not start an orbit
      }
      if (!d.active || e.pointerId !== d.id) return;
      d.active = false;
      el.style.cursor = '';
      try {
        el.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      // inertia: keep the release velocity unless the pointer was resting
      const rest = (performance.now() - d.t) / 1000 > 0.08;
      fling.current.vAz = rest ? 0 : clamp(d.vAz, -4, 4);
      fling.current.vPol = rest ? 0 : clamp(d.vPol, -3, 3);
      invalidate();
    };
    const onDbl = () => stage.api.current?.reset();
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const f = Math.exp(clamp(e.deltaY, -120, 120) * 0.0035);
      goal.current = clampGoal({ ...goal.current, r: goal.current.r * f });
      follow.current = FOLLOW_W;
      touched.current = true;
      invalidate();
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('dblclick', onDbl);
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('dblclick', onDbl);
      el.removeEventListener('wheel', onWheel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, invalidate, stage.api]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const g = goal.current;
    const f = fling.current;
    // inertia: the goal keeps drifting with a decaying velocity after release
    if (!drag.current.active && (Math.abs(f.vAz) > 0.01 || Math.abs(f.vPol) > 0.01)) {
      const b = bounds();
      const nAz = g.az + f.vAz * dt;
      const nPol = g.pol + f.vPol * dt;
      g.az = clamp(nAz, b.az0, b.az1);
      g.pol = clamp(nPol, POLAR_MIN, POLAR_MAX);
      if (g.az !== nAz) f.vAz = 0;
      if (g.pol !== nPol) f.vPol = 0;
      const decay = Math.exp(-FLING_DECAY * dt);
      f.vAz *= decay;
      f.vPol *= decay;
      follow.current = FOLLOW_W;
    } else if (!drag.current.active) {
      f.vAz = 0;
      f.vPol = 0;
      if (follow.current !== CAMERA_W) follow.current = CAMERA_W;
    }

    const dAz = wrap(g.az - spr.az.x);
    const goalAz = spr.az.x + dAz;
    const settled =
      spr.az.settled(goalAz, 0.0004, 0.002) &&
      spr.pol.settled(g.pol, 0.0004, 0.002) &&
      spr.r.settled(g.r, 0.0008, 0.004) &&
      spr.ty.settled(g.ty, 0.0004, 0.004);
    if (settled && !drag.current.active && f.vAz === 0 && f.vPol === 0) {
      if (spr.az.x !== goalAz || spr.pol.x !== g.pol || spr.r.x !== g.r || spr.ty.x !== g.ty) {
        spr.az.snap(goalAz);
        spr.pol.snap(g.pol);
        spr.r.snap(g.r);
        spr.ty.snap(g.ty);
        place();
      }
      return;
    }
    if (reduced) {
      spr.az.snap(goalAz);
      spr.pol.snap(g.pol);
      spr.r.snap(g.r);
      spr.ty.snap(g.ty);
      f.vAz = 0;
      f.vPol = 0;
    } else {
      const w = follow.current;
      spr.az.step(goalAz, w, dt);
      spr.pol.step(g.pol, w, dt);
      spr.r.step(g.r, w, dt);
      spr.ty.step(g.ty, w, dt);
    }
    place();
    stage.boost.current = performance.now() + 300;
    state.invalidate();
  }, -5);

  return null;
}
