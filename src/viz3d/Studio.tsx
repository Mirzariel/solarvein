/**
 * The studio around the collector (docs/audit/05-creative-direction.md 6.1): a graphite seamless sweep
 * (baked radial falloff, no grid, no ring), a baked soft contact shadow, soft key + cool rim + fill and a
 * procedural softbox environment (no HDR download).
 *
 * Lighting follows the stage `mood` (sun 0..1, humid 0..1, night 0..1; no rain, no wet glass): overcast / humid =
 * cooler, softer, flatter; night = dimmer. Left alone the studio derives the mood from the live sim result with its
 * own ~0.9 s smoother; AmbientMood sets `stage.mood.current.driven = true` and writes it per frame from
 * `frame.climate` instead (single owner of the lights).
 */
import { Environment, Lightformer } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { memo, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { COLORS } from './palette';
import { Haze } from './Haze';
import { RoofContext } from './RoofContext';
import { TIERS } from './quality';
import { useQuality } from './quality';
import { clamp01, dampTo } from './spring';
import { useStage } from './stage';
import { useLiveResultRef } from './useLiveResult';

const KEY_SUN = new THREE.Color('#FFEFD9');
const KEY_OVERCAST = new THREE.Color('#D8E3EC');
const RIM_SUN = new THREE.Color('#BCD9EA');
const RIM_OVERCAST = new THREE.Color('#7FA8C0');
const FLOOR_SUN = new THREE.Color(COLORS.floorCentre);
const FLOOR_OVERCAST = new THREE.Color(COLORS.floorCentreOvercast);
const FLOOR_Y = -0.045;
const GLOW_COLOR = new THREE.Color(3.4, 3.3, 3.2);
const EXPLODE_DROP = 0.16;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const noRay = (): void => undefined;

function radialTexture(): THREE.CanvasTexture {
  const n = 256;
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(n / 2, n / 2, 0, n / 2, n / 2, n / 2);
    const stops = 12;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      g.addColorStop(t, `rgba(255,255,255,${Math.pow(1 - t, 2.2).toFixed(4)})`);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, n, n);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Sky dome gradient (v: 0 = nadir .. 1 = zenith): a soft horizon glow that fades smoothly upward, dark below the
 * horizon. One continuous dome (no plane edges), so the glass reflects a smooth photographic gradient, not facets.
 */
function skyTexture(): THREE.CanvasTexture {
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    const img = ctx.createImageData(4, h);
    for (let y = 0; y < h; y++) {
      const v = 1 - y / (h - 1); // canvas y=0 is the top (zenith)
      const e = (v - 0.5) * 180; // elevation in degrees (-90..90)
      let l: number;
      if (e < 0) l = 0.06 * Math.exp(e / 6);
      else l = 0.04 + 0.96 * Math.exp(-Math.pow((e - 12) / 9.5, 2)) * (1 - Math.exp(-e / 3));
      // smoothstep fade at the zenith
      l *= 1 - 0.85 * Math.min(1, Math.max(0, (e - 30) / 55));
      const g = Math.round(Math.min(1, l) * 255);
      for (let x = 0; x < 4; x++) {
        const o = (y * 4 + x) * 4;
        img.data[o] = g;
        img.data[o + 1] = g;
        img.data[o + 2] = g;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; // linear luminance: the colour multiplier below sets the HDR level
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

function shadowTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 384;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, w, h);
    // stacked rounded rects approximate a gaussian blur without ctx.filter (Safari-safe)
    const layers = 26;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const inset = 14 + t * 62;
      ctx.fillStyle = `rgba(0,0,0,${(0.05 + 0.02 * t).toFixed(3)})`;
      ctx.beginPath();
      ctx.roundRect(inset, inset * 1.05, w - inset * 2, h - inset * 2.1, 16 + t * 14);
      ctx.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Environment cube: memoised so a parent re-render never rebuilds the PMREM (drei re-runs it when children change). */
const StudioEnvironment = memo(function StudioEnvironment({ resolution, glowTex }: { resolution: number; glowTex: THREE.Texture }) {
  return (
    <Environment resolution={resolution} frames={1}>
      <mesh scale={40}>
        <sphereGeometry args={[1, 96, 48]} />
        <meshBasicMaterial map={glowTex} color={GLOW_COLOR} side={THREE.BackSide} toneMapped={false} />
      </mesh>
      {/* overhead soft dome (lights the top of the frame, rails) */}
      <Lightformer form="rect" intensity={1.5} color="#e8f0fa" position={[0, 7, 0]} scale={[9, 9, 1]} target={[0, 0, 0]} />
      {/* cool rim from the rear right */}
      <Lightformer form="rect" intensity={3} color="#a9cde0" position={[3.5, 2.2, -5.5]} scale={[5, 1.6, 1]} target={[0, 0, 0]} />
      {/* front fill (lights the frame side faces) */}
      <Lightformer form="rect" intensity={1.4} color="#dfe8f0" position={[6, 1.6, 3.5]} scale={[7, 2.2, 1]} target={[0, 0, 0]} />
      {/* floor bounce */}
      <Lightformer form="rect" intensity={1.1} color="#8b949d" position={[0, -2, 0]} scale={[14, 14, 1]} target={[0, 0, 0]} />
    </Environment>
  );
});

export function Studio() {
  const stage = useStage();
  const tier = useQuality();
  const spec = TIERS[tier];
  const gl = useThree((t) => t.gl);
  const shadowFloor = useRef<THREE.Mesh>(null);
  const shadowOpacity = useRef<THREE.ShadowMaterial>(null);
  const transparent = stage.background === 'transparent';
  const live = useLiveResultRef();
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const hemiRef = useRef<THREE.HemisphereLight>(null);
  const floorRef = useRef<THREE.Mesh>(null);
  const shadowRef = useRef<THREE.Mesh>(null);
  const floorMat = useRef<THREE.MeshBasicMaterial>(null);
  const shadowMat = useRef<THREE.MeshBasicMaterial>(null);
  const last = useRef({ sun: Number.NaN, humid: Number.NaN, night: Number.NaN, ex: Number.NaN });
  const floorTex = useMemo(() => radialTexture(), []);
  const shadowTex = useMemo(() => shadowTexture(), []);
  const glowTex = useMemo(() => skyTexture(), []);
  useEffect(
    () => () => {
      floorTex.dispose();
      shadowTex.dispose();
      glowTex.dispose();
    },
    [floorTex, shadowTex, glowTex],
  );

  useEffect(() => {
    gl.shadowMap.enabled = spec.shadowMap > 0;
    gl.shadowMap.type = THREE.PCFShadowMap;
    gl.shadowMap.needsUpdate = true;
  }, [gl, spec.shadowMap]);

  useFrame((state, delta) => {
    const m = stage.mood.current;
    const dt = Math.min(delta, 0.1);
    if (!m.driven) {
      const r = live.current;
      const sunT = clamp01(r.inputs.irradiance / 900);
      m.rain = 0;
      if (Number.isNaN(last.current.sun)) {
        m.sun = sunT;
      } else if (Math.abs(m.sun - sunT) > 0.002) {
        m.sun = dampTo(m.sun, sunT, 3.3, dt);
        state.invalidate();
      }
    }
    const ex = stage.explode.current;
    const l = last.current;
    if (l.sun === m.sun && l.humid === m.humid && l.night === m.night && l.ex === ex) return;
    l.sun = m.sun;
    l.humid = m.humid;
    l.night = m.night;
    l.ex = ex;

    const s = clamp01(m.sun);
    const dark = 1 - 0.5 * clamp01(m.night);
    const key = keyRef.current;
    const rim = rimRef.current;
    const hemi = hemiRef.current;
    if (key) {
      key.color.copy(KEY_OVERCAST).lerp(KEY_SUN, s);
      key.intensity = lerp(0.9, 2.4, s) * dark;
    }
    if (rim) {
      rim.color.copy(RIM_OVERCAST).lerp(RIM_SUN, s);
      rim.intensity = lerp(0.7, 1.9, s) * dark;
    }
    if (hemi) hemi.intensity = lerp(0.6, 0.35, s);
    state.scene.environmentIntensity = lerp(0.5, 0.9, s) * dark;
    gl.toneMappingExposure = lerp(0.95, 1.0, s) * (1 - 0.12 * clamp01(m.night));
    if (shadowOpacity.current) shadowOpacity.current.opacity = lerp(0.14, 0.42, s);
    if (floorMat.current) floorMat.current.color.copy(FLOOR_OVERCAST).lerp(FLOOR_SUN, s);
    const floorY = FLOOR_Y - EXPLODE_DROP * ex;
    if (floorRef.current) floorRef.current.position.y = floorY;
    if (shadowFloor.current) shadowFloor.current.position.y = floorY + 0.0008;
    if (shadowRef.current) {
      shadowRef.current.position.y = floorY + 0.0015;
      const k = 1 + 0.16 * ex;
      shadowRef.current.scale.set(2.0 * k, 2.95 * k, 1);
    }
    if (shadowMat.current) shadowMat.current.opacity = lerp(0.5, 0.62, s) * (1 - 0.3 * ex) * (transparent ? 0.55 : 1);
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#C9D6E0', COLORS.background, 0.35]} />
      <directionalLight
        ref={keyRef}
        position={[-3.0, 2.9, 2.4]}
        intensity={2.4}
        color="#FFEFD9"
        castShadow={spec.shadowMap > 0}
        shadow-mapSize={[Math.max(spec.shadowMap, 16), Math.max(spec.shadowMap, 16)]}
        shadow-camera-left={-1.7}
        shadow-camera-right={1.7}
        shadow-camera-top={1.7}
        shadow-camera-bottom={-1.7}
        shadow-camera-near={0.5}
        shadow-camera-far={9}
        shadow-bias={-0.0003}
        shadow-normalBias={0.004}
        shadow-radius={3}
      />
      <directionalLight ref={rimRef} position={[-1.6, 1.0, -2.6]} intensity={1.1} color="#9CC3D6" />
      <StudioEnvironment resolution={spec.env} glowTex={glowTex} />

      {!transparent ? <Haze /> : null}
      {stage.context === 'roof' ? <RoofContext tier={tier} /> : null}
      {/* seamless graphite sweep: baked radial falloff, no grid */}
      <mesh ref={floorRef} visible={!transparent && stage.context !== 'roof'} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} renderOrder={-2} raycast={noRay}>
        <planeGeometry args={[7, 7]} />
        <meshBasicMaterial ref={floorMat} map={floorTex} color={COLORS.floorCentre} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* real key-light shadow on the floor (medium / high tiers) */}
      <mesh ref={shadowFloor} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.0008, 0]} receiveShadow visible={spec.shadowMap > 0 && stage.context !== 'roof'} renderOrder={-1} raycast={noRay}>
        <planeGeometry args={[7, 7]} />
        <shadowMaterial ref={shadowOpacity} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {/* baked soft contact shadow */}
      <mesh ref={shadowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y + 0.0015, 0]} scale={[2, 2.95, 1]} renderOrder={-1} raycast={noRay}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={shadowMat} map={shadowTex} transparent opacity={0.5} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  );
}
