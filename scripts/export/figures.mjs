// Figure export: PNG (deviceScaleFactor 3) + SVG for every [data-export] on `?export=1&static=1`.
//
//   npm run build && npm run preview            (terminal 1, serves http://localhost:4173)
//   node scripts/export/figures.mjs              (terminal 2)
//
// Options:
//   --url   http://localhost:4173   site origin (dev server works too: http://localhost:5173)
//   --path  /                       page that mounts the app (query is added: ?export=1&static=1)
//   --out   docs/exports            output folder (created)
//   --scale 3                       deviceScaleFactor for PNG
//   --only  router-diagram,day-chart   export only these ids
//   --no-svg / --no-png             skip a format
//
// SVG is best effort: each inline <svg data-export-svg> is cloned, every computed paint/text property is written as a
// presentation attribute (colours converted to rgb()), class names are dropped, and the Latin Geist + Geist Mono
// subsets are embedded as base64 @font-face so the file renders the same in a browser. Illustrator/Figma may still
// substitute the fonts: install Geist and Geist Mono (https://vercel.com/font) for editing.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const base = opt('url', 'http://localhost:4173').replace(/\/$/, '');
const path = opt('path', '/');
const outDir = resolve(opt('out', 'docs/exports'));
const scale = Number(opt('scale', '3'));
const only = opt('only', '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const wantPng = !has('no-png');
const wantSvg = !has('no-svg');

let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel });
    break;
  } catch {
    /* try the next channel */
  }
}
if (!browser) {
  console.error('No system Chrome or Edge found for playwright-core (channel chrome / msedge).');
  process.exit(1);
}

const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 }, deviceScaleFactor: scale, reducedMotion: 'reduce' });
const page = await ctx.newPage();
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => m.type() === 'error' && problems.push(`console: ${m.text()}`));

const target = `${base}${path}${path.includes('?') ? '&' : '?'}export=1&static=1`;
try {
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60000 });
} catch (e) {
  console.error(`Cannot open ${target}\n${e.message}\nStart the site first: npm run build && npm run preview`);
  await browser.close();
  process.exit(1);
}
await page.waitForSelector('[data-export]', { timeout: 30000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(400);

/** Top-level [data-export] only (reused components may carry their own marker). */
const frames = await page.evaluate(() =>
  [...document.querySelectorAll('[data-export]')]
    .filter((el) => !el.parentElement?.closest('[data-export]'))
    .map((el) => ({ id: el.getAttribute('data-export'), ratio: el.getAttribute('data-ratio'), w: el.clientWidth, h: el.clientHeight })),
);
const ids = frames.filter((f) => !only.length || only.includes(f.id));
if (!ids.length) {
  console.error(`No matching [data-export] (found: ${frames.map((f) => f.id).join(', ') || 'none'}).`);
  await browser.close();
  process.exit(1);
}

await mkdir(outDir, { recursive: true });

/** Runs in the page: serialises the n-th inline svg of a frame with computed styles and fonts inlined. */
const serialise = async ({ id, index }) => {
  const frame = document.querySelector(`[data-export="${id}"]`);
  // Figure SVGs: marked with data-export-svg, or any top-level svg at least 300 px wide (the site's own charts); not icons or dots.
  const svgs = [...frame.querySelectorAll('svg')].filter(
    (el) => !el.parentElement?.closest('svg') && (el.hasAttribute('data-export-svg') || el.getBoundingClientRect().width >= 300),
  );
  const src = svgs[index];
  if (!src) return null;

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgba = (value) => {
    if (!value || value === 'none') return null;
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#010203';
    probe.fillStyle = value;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return { rgb: `rgb(${r},${g},${b})`, a: a / 255 };
  };
  const PAINT = ['fill', 'stroke'];
  const PLAIN = ['paint-order', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity', 'font-family', 'font-size', 'font-weight', 'letter-spacing', 'text-anchor', 'dominant-baseline', 'font-variant-numeric'];
  const TEXTY = new Set(['text', 'tspan']);
  const NO_PAINT = new Set(['svg', 'g', 'defs', 'pattern', 'clippath', 'lineargradient', 'radialgradient', 'mask', 'stop', 'title', 'desc', 'style']);

  const walk = (o, c) => {
    const cs = getComputedStyle(o);
    const tag = o.tagName.toLowerCase();
    c.removeAttribute('class');
    c.removeAttribute('style');
    c.removeAttribute('data-export-svg');
    if (tag === 'stop') {
      const sc = rgba(cs.getPropertyValue('stop-color'));
      if (sc) c.setAttribute('stop-color', sc.rgb);
    }
    if (!NO_PAINT.has(tag)) {
      for (const p of PAINT) {
        const v = cs.getPropertyValue(p);
        const col = v.startsWith('url(') ? { url: v } : rgba(v);
        if (col && col.url) {
          c.setAttribute(p, col.url);
          continue;
        }
        if (!col) c.setAttribute(p, 'none');
        else {
          c.setAttribute(p, col.rgb);
          if (col.a < 1) c.setAttribute(`${p}-opacity`, String(+col.a.toFixed(3)));
        }
      }
      for (const p of PLAIN) {
        if ((p.startsWith('font') || p === 'letter-spacing' || p === 'text-anchor' || p === 'dominant-baseline') && !TEXTY.has(tag)) continue;
        const v = cs.getPropertyValue(p);
        if (v && v !== 'normal' && v !== 'auto' && !(p === 'opacity' && v === '1') && !(p === 'stroke-dasharray' && v === 'none')) c.setAttribute(p, v);
      }
    }
    for (let i = 0; i < o.children.length; i++) walk(o.children[i], c.children[i]);
  };
  const clone = src.cloneNode(true);
  walk(src, clone);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.removeAttribute('aria-label');
  const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
  title.textContent = src.getAttribute('aria-label') ?? id;
  clone.prepend(title);

  // Embed the Latin Geist / Geist Mono subsets (the only ones the figures use).
  const faces = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of rules) {
      if (r.constructor.name !== 'CSSFontFaceRule') continue;
      const fam = r.style.getPropertyValue('font-family').replace(/["']/g, '');
      if (!/^Geist/.test(fam)) continue;
      if (!/(^|[\s,])U\+0(000)?-(00)?FF(?![0-9A-F-])/i.test(r.style.getPropertyValue('unicode-range'))) continue; // the Latin subset
      const m = /url\(["']?([^"')]+\.woff2)["']?\)/.exec(r.style.getPropertyValue('src'));
      if (!m) continue;
      const buf = await (await fetch(new URL(m[1], location.href))).arrayBuffer();
      let bin = '';
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      faces.push(`@font-face{font-family:"${fam}";font-style:normal;font-weight:${r.style.getPropertyValue('font-weight') || '400'};src:url(data:font/woff2;base64,${btoa(bin)}) format("woff2");}`);
    }
  }
  if (faces.length) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = faces.join('\n');
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.append(style);
    clone.prepend(defs);
  }
  return { xml: new XMLSerializer().serializeToString(clone), count: svgs.length };
};

const manifest = [];
for (const f of ids) {
  const entry = { id: f.id, ratio: f.ratio, cssSize: [f.w, f.h], files: [] };
  if (wantPng) {
    const file = `${f.id}.png`;
    // A dev server can hot-reload the page mid-run ("Cannot find context"); retry once after the page settles.
    for (let attempt = 1; ; attempt++) {
      try {
        await page.locator(`[data-export="${f.id}"]`).first().screenshot({ path: resolve(outDir, file), animations: 'disabled' });
        break;
      } catch (e) {
        if (attempt >= 3) throw e;
        await page.waitForLoadState('networkidle');
        await page.waitForSelector(`[data-export="${f.id}"]`);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(500);
      }
    }
    entry.files.push(file);
  }
  if (wantSvg) {
    const first = await page.evaluate(serialise, { id: f.id, index: 0 });
    if (first) {
      for (let i = 0; i < first.count; i++) {
        const r = i === 0 ? first : await page.evaluate(serialise, { id: f.id, index: i });
        const file = first.count === 1 ? `${f.id}.svg` : `${f.id}-${i + 1}.svg`;
        await writeFile(resolve(outDir, file), `<?xml version="1.0" encoding="UTF-8"?>\n${r.xml}\n`, 'utf8');
        entry.files.push(file);
      }
    }
  }
  manifest.push(entry);
  console.log(`${f.id.padEnd(26)} ${f.w}x${f.h}  ${entry.files.join(', ')}`);
}
await writeFile(resolve(outDir, 'manifest.json'), JSON.stringify({ source: target, scale, figures: manifest }, null, 2) + '\n', 'utf8');
await browser.close();
if (problems.length) console.warn(`\n${problems.length} page problem(s):\n${[...new Set(problems)].join('\n')}`);
console.log(`\n${manifest.length} figure(s) -> ${outDir}`);
