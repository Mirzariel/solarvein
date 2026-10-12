/**
 * Procedural textures, generated once at runtime (CanvasTexture / DataTexture) and cached at module level
 * (shared by both stages). No downloads.
 *
 *  - cellTexture:   60 mono-PERC wafers (6 x 10), chamfered corners, 10 busbars + fine fingers, +/-3 % per-cell
 *                   colour variance, anti-reflective blue sheen, baked ambient occlusion under the frame lip.
 *  - glassRough:    very low roughness with faint cleaning/handling imperfections (roughnessMap, green channel).
 *  - brushedRough:  anodised-aluminium streaks along the extrusion (roughnessMap).
 *  - foamNormal:    PU foam micro-cell relief (tangent-space normal map from value noise).
 *  - copperRough:   slight oxidation / handling variation (roughnessMap).
 *  - dropletBump:   rain droplets + short streaks (bumpMap for the wet-glass state).
 */
import * as THREE from 'three';

export const CELL_COLS = 6;
export const CELL_ROWS = 10;
/** Physical size of the cell field the texture covers [scene units]. */
export const CELL_FIELD_W = 0.958;
export const CELL_FIELD_L = 1.63;

/** Deterministic pseudo-random in [0,1). */
const rnd = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function finish(tex: THREE.Texture, srgb: boolean, repeat = false): THREE.Texture {
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

let cell: THREE.Texture | null = null;
export function cellTexture(): THREE.Texture {
  if (cell) return cell;
  const cw = 160;
  const ch = 163;
  const w = CELL_COLS * cw;
  const h = CELL_ROWS * ch;
  const [c, ctx] = canvas(w, h);
  if (ctx) {
    ctx.fillStyle = '#070C18'; // backsheet showing through the gaps
    ctx.fillRect(0, 0, w, h);
    const gap = 3.2;
    const k = 13; // pseudo-square wafer chamfer
    for (let r = 0; r < CELL_ROWS; r++) {
      for (let col = 0; col < CELL_COLS; col++) {
        const x = col * cw + gap;
        const y = r * ch + gap;
        const wi = cw - gap * 2;
        const hi = ch - gap * 2;
        const v = 1 + (rnd(r * 17 + col * 5 + 1) - 0.5) * 0.1; // ~ +/-3 % lightness
        const t = rnd(r * 7 + col * 13 + 5);
        // mono-PERC: very dark blue-black with a faint AR sheen towards one corner
        const b0 = [0x08, 0x12, 0x2e].map((n) => Math.min(255, Math.round(n * v)));
        const b1 = [0x03, 0x06, 0x16].map((n) => Math.min(255, Math.round(n * v)));
        ctx.beginPath();
        ctx.moveTo(x + k, y);
        ctx.lineTo(x + wi - k, y);
        ctx.lineTo(x + wi, y + k);
        ctx.lineTo(x + wi, y + hi - k);
        ctx.lineTo(x + wi - k, y + hi);
        ctx.lineTo(x + k, y + hi);
        ctx.lineTo(x, y + hi - k);
        ctx.lineTo(x, y + k);
        ctx.closePath();
        const g = ctx.createLinearGradient(x, y, x + wi, y + hi);
        g.addColorStop(0, `rgb(${b0[0]},${b0[1]},${b0[2]})`);
        g.addColorStop(0.55, `rgb(${b1[0]},${b1[1]},${b1[2]})`);
        g.addColorStop(1, `rgb(${Math.round(b0[0]! * (0.9 + 0.2 * t))},${Math.round(b0[1]! * (0.9 + 0.2 * t))},${Math.round(b0[2]! * (0.95 + 0.2 * t))})`);
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(58,78,128,0.55)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        // fine fingers (perpendicular to the busbars)
        ctx.strokeStyle = 'rgba(96,120,176,0.10)';
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        for (let f = 1; f < 46; f++) {
          const fy = y + (hi * f) / 46;
          ctx.moveTo(x + 4, fy);
          ctx.lineTo(x + wi - 4, fy);
        }
        ctx.stroke();
        // 10 thin busbars (multi-busbar cell)
        ctx.strokeStyle = 'rgba(214,222,240,0.75)';
        ctx.lineWidth = 1.15;
        ctx.beginPath();
        for (let b = 1; b <= 10; b++) {
          const bx = x + (wi * b) / 11;
          ctx.moveTo(bx, y + 1);
          ctx.lineTo(bx, y + hi - 1);
        }
        ctx.stroke();
        // solder pads
        ctx.fillStyle = 'rgba(190,198,218,0.35)';
        for (let b = 1; b <= 10; b++) {
          const bx = x + (wi * b) / 11;
          ctx.fillRect(bx - 1.2, y + hi * 0.5 - 2, 2.4, 4);
          ctx.fillRect(bx - 1.2, y + 2, 2.4, 3);
          ctx.fillRect(bx - 1.2, y + hi - 5, 2.4, 3);
        }
      }
    }
    // baked ambient occlusion: the frame lip and the neighbouring plates darken the cell field edges
    const ao = 46;
    const edge = (x0: number, y0: number, x1: number, y1: number, gx: number, gy: number, gx1: number, gy1: number): void => {
      const gr = ctx.createLinearGradient(gx, gy, gx1, gy1);
      gr.addColorStop(0, 'rgba(0,0,0,0.42)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    };
    edge(0, 0, w, ao, 0, 0, 0, ao);
    edge(0, h - ao, w, h, 0, h, 0, h - ao);
    edge(0, 0, ao, h, 0, 0, ao, 0);
    edge(w - ao, 0, w, h, w, 0, w - ao, 0);
  }
  cell = finish(new THREE.CanvasTexture(c), true);
  return cell;
}

function noiseRough(w: number, h: number, base: number, amp: number, fx: number, fy: number, seed: number): THREE.Texture {
  const [c, ctx] = canvas(w, h);
  if (ctx) {
    const img = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // cheap value noise: blend of a few sines + hash
        const n =
          Math.sin((x / w) * fx * 6.283 + seed) * Math.sin((y / h) * fy * 6.283 + seed * 1.7) * 0.5 +
          (rnd(x * 13.1 + y * 71.7 + seed) - 0.5) * 0.6 +
          Math.sin(((x + y * 0.3) / w) * fx * 2.9 * 6.283 + seed * 3) * 0.2;
        const v = Math.max(0, Math.min(255, Math.round((base + n * amp) * 255)));
        const o = (y * w + x) * 4;
        img.data[o] = v;
        img.data[o + 1] = v;
        img.data[o + 2] = v;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  return finish(new THREE.CanvasTexture(c), false, true);
}

let glassR: THREE.Texture | null = null;
/** roughness multiplier ~0.25..0.7 (material roughness ~0.1 -> 0.025..0.07): clean tempered glass with faint smudges. */
export function glassRough(): THREE.Texture {
  glassR ??= noiseRough(256, 256, 0.42, 0.28, 3, 4, 2.1);
  return glassR;
}

let copperR: THREE.Texture | null = null;
export function copperRough(): THREE.Texture {
  copperR ??= noiseRough(128, 128, 0.62, 0.3, 5, 5, 6.3);
  return copperR;
}

let brushed: THREE.Texture | null = null;
/** Streaks run along U (set texture rotation / repeat per use). */
export function brushedRough(): THREE.Texture {
  if (brushed) return brushed;
  const w = 512;
  const h = 128;
  const [c, ctx] = canvas(w, h);
  if (ctx) {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const v = 175 + Math.round(rnd(y * 9.1 + 3) * 45);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, w, 1);
      if (rnd(y * 3.3) > 0.8) {
        ctx.fillStyle = 'rgba(255,255,255,0.12)';
        ctx.fillRect(rnd(y) * w * 0.5, y, w * 0.4, 1);
      }
    }
  }
  brushed = finish(new THREE.CanvasTexture(c), false, true);
  return brushed;
}

let foam: THREE.Texture | null = null;
export function foamNormal(): THREE.Texture {
  if (foam) return foam;
  const n = 128;
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      let v = 0;
      let amp = 1;
      let f = 4;
      for (let o = 0; o < 3; o++) {
        const gx = Math.floor((x / n) * f);
        const gy = Math.floor((y / n) * f);
        const fx = (x / n) * f - gx;
        const fy = (y / n) * f - gy;
        const sx = fx * fx * (3 - 2 * fx);
        const sy = fy * fy * (3 - 2 * fy);
        const a = rnd((gx % f) + (gy % f) * 31 + o * 101);
        const b = rnd(((gx + 1) % f) + (gy % f) * 31 + o * 101);
        const c2 = rnd((gx % f) + ((gy + 1) % f) * 31 + o * 101);
        const d = rnd(((gx + 1) % f) + ((gy + 1) % f) * 31 + o * 101);
        v += (a + (b - a) * sx + (c2 - a) * sy + (a - b - c2 + d) * sx * sy) * amp;
        amp *= 0.5;
        f *= 2.3;
      }
      h[y * n + x] = v;
    }
  }
  const data = new Uint8Array(n * n * 4);
  const s = 2.2;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const l = h[y * n + ((x + n - 1) % n)] ?? 0;
      const r = h[y * n + ((x + 1) % n)] ?? 0;
      const u = h[((y + n - 1) % n) * n + x] ?? 0;
      const d = h[((y + 1) % n) * n + x] ?? 0;
      let nx = (l - r) * s;
      let ny = (u - d) * s;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const o = (y * n + x) * 4;
      data[o] = Math.round((nx * 0.5 + 0.5) * 255);
      data[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[o + 3] = 255;
    }
  }
  const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  foam = finish(t, false, true);
  return foam;
}

let concrete: THREE.Texture | null = null;
/** Weathered roof concrete: speckle, soft blotches, two faint expansion joints. Tileable, sRGB. */
export function concreteTexture(): THREE.Texture {
  if (concrete) return concrete;
  const n = 512;
  const [c, ctx] = canvas(n, n);
  if (ctx) {
    ctx.fillStyle = '#7d8083';
    ctx.fillRect(0, 0, n, n);
    for (let i = 0; i < 70; i++) {
      const x = rnd(i * 2.3) * n;
      const y = rnd(i * 3.7 + 1) * n;
      const r = 20 + rnd(i * 5.1) * 90;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const l = rnd(i * 7.7) > 0.5 ? 255 : 0;
      g.addColorStop(0, 'rgba(' + l + ',' + l + ',' + l + ',' + (0.05 + rnd(i * 1.3) * 0.06).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(' + l + ',' + l + ',' + l + ',0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const img = ctx.getImageData(0, 0, n, n);
    for (let i = 0; i < n * n; i++) {
      const v = (rnd(i * 0.37) - 0.5) * 34 + (rnd(i * 0.011) - 0.5) * 18;
      img.data[i * 4] = Math.max(0, Math.min(255, (img.data[i * 4] ?? 0) + v));
      img.data[i * 4 + 1] = Math.max(0, Math.min(255, (img.data[i * 4 + 1] ?? 0) + v));
      img.data[i * 4 + 2] = Math.max(0, Math.min(255, (img.data[i * 4 + 2] ?? 0) + v));
    }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = 'rgba(30,32,34,0.55)';
    ctx.fillRect(0, n / 2 - 1.5, n, 3); // expansion joint
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, n / 2 + 1.5, n, 1.5);
  }
  concrete = finish(new THREE.CanvasTexture(c), true, true);
  return concrete;
}

let drops: THREE.Texture | null = null;
/** Height map (white = raised): droplets of mixed size plus a few short vertical streaks. */
export function dropletBump(): THREE.Texture {
  if (drops) return drops;
  const n = 512;
  const [c, ctx] = canvas(n, n);
  if (ctx) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, n, n);
    const blob = (x: number, y: number, rx: number, ry: number, a: number): void => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      g.addColorStop(0, `rgba(255,255,255,${a})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
      ctx.translate(-x, -y);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, Math.max(rx, ry), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    for (let i = 0; i < 150; i++) {
      const r = 2.2 + rnd(i * 3.1) * rnd(i * 5.7) * 10;
      blob(rnd(i * 1.7) * n, rnd(i * 2.9 + 1) * n, r, r * (1 + rnd(i * 4.1) * 0.5), 0.55 + rnd(i * 6.1) * 0.45);
    }
    for (let i = 0; i < 12; i++) {
      const x = rnd(i * 8.3 + 2) * n;
      const y = rnd(i * 9.1 + 4) * n;
      for (let k = 0; k < 14; k++) blob(x + (rnd(i * k) - 0.5) * 1.5, y + k * 5.5, 2.2, 3.2, 0.4);
    }
  }
  drops = finish(new THREE.CanvasTexture(c), false, true);
  return drops;
}
