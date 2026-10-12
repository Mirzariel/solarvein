#!/usr/bin/env node
/**
 * SolarVein visual + functional QA (Playwright, system Chrome/Edge — no browser download).
 *
 *   node scripts/qa/visual-qa.mjs --url http://localhost:5190 --out docs/audit/after \
 *        [--widths 1440,1280,768,390,360] [--states sunny,rainy] [--checks] [--reduced] [--sections]
 *
 * Outputs PNGs `<out>/<width>-<state>-hero.png` (+ per-section shots with --sections) and prints a JSON
 * report: console errors, horizontal overflow, broken text (NaN/undefined/Infinity) and, with --checks,
 * rapid mode switching, slider extremes (Home/End on every range) and controls with no observable effect.
 * WebGL uses the real GPU through ANGLE/D3D11 by default (Windows); pass --swiftshader to force CPU rendering
 * (SwiftShader numbers are not representative of GPU performance).
 */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  if (i === -1) return d;
  const v = process.argv[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};
const url = arg('url', 'http://localhost:5190');
const out = arg('out', 'docs/audit/qa');
const widths = String(arg('widths', '1440,390')).split(',').map(Number);
const states = String(arg('states', 'sunny,rainy')).split(',');
const runChecks = !!arg('checks', false);
const reduced = !!arg('reduced', false);
const sections = !!arg('sections', false);
const swiftshader = !!arg('swiftshader', false);
mkdirSync(out, { recursive: true });

async function launch() {
  const args = swiftshader
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
    : ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'];
  for (const channel of ['chrome', 'msedge']) {
    try { return await chromium.launch({ channel, args }); } catch { /* try next */ }
  }
  throw new Error('No system Chrome or Edge found for playwright-core.');
}

/** Click the Cerah/Hujan control by accessible name; tolerant to radio or button roles. */
async function setMode(page, state) {
  const name = state === 'rainy' ? /Hujan/i : /Cerah/i;
  for (const role of ['radio', 'tab', 'button']) {
    const el = page.getByRole(role, { name }).first();
    if (await el.count()) { await el.click(); return true; }
  }
  return false;
}

const report = { url, runs: [], checks: {} };
const browser = await launch();

for (const w of widths) {
  const h = w >= 1024 ? 900 : w >= 768 ? 1024 : 844;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  for (const state of states) {
    const switched = await setMode(page, state);
    await page.waitForTimeout(2200); // let the weather transition settle (≤ 1.2 s by spec)
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${w}-${state}-hero.png` });
    if (sections) {
      const ids = await page.$$eval('main section[id]', (els) => els.map((e) => e.id));
      for (const id of ids) {
        await page.locator('#' + id).scrollIntoViewIfNeeded();
        await page.waitForTimeout(900);
        await page.screenshot({ path: `${out}/${w}-${state}-${id}.png` });
      }
    }
    const scan = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflow = [];
      document.querySelectorAll('body *').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') {
          let p = el.parentElement, clipped = false;
          while (p) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') { clipped = true; break; } p = p.parentElement; }
          if (!clipped) overflow.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 50)}`);
        }
      });
      const text = document.body.innerText;
      const broken = (text.match(/\b(NaN|undefined|Infinity)\b/g) || []).length;
      return { scrollW: document.documentElement.scrollWidth, vw, overflow: overflow.slice(0, 8), broken, words: text.split(/\s+/).filter(Boolean).length };
    });
    report.runs.push({ width: w, state, switched, ...scan });
  }

  if (runChecks && w === widths[0]) {
    // 1. Rapid mode switching: 24 toggles every 120 ms must not throw or leave the UI inconsistent.
    const before = errors.length;
    for (let i = 0; i < 24; i++) { await setMode(page, i % 2 ? 'sunny' : 'rainy'); await page.waitForTimeout(120); }
    await page.waitForTimeout(2500);
    report.checks.rapidSwitching = { newErrors: errors.slice(before) };

    // 2. Slider extremes: Home/End on every range input; no broken numbers afterwards.
    // Sliders inside closed disclosures are `inert` (correctly ignore keys), so expand every disclosure first —
    // several passes, because disclosures can be nested.
    for (let pass = 0; pass < 3; pass++) {
      for (const t of await page.locator('main button[aria-expanded="false"]').all()) {
        try { await t.scrollIntoViewIfNeeded({ timeout: 1000 }); await t.click({ timeout: 1000 }); await page.waitForTimeout(120); } catch { /* hidden/menu */ }
      }
      for (const d of await page.locator('main details:not([open]) > summary').all()) {
        try { await d.click({ timeout: 1000 }); } catch { /* ignore */ }
      }
    }
    const ranges = page.locator('main input[type=range]');
    const n = await ranges.count();
    const sliders = [];
    for (let i = 0; i < n; i++) {
      const r = ranges.nth(i);
      if (!(await r.isVisible())) continue;
      const label = (await r.getAttribute('aria-label')) || (await r.evaluate((el) => el.labels?.[0]?.textContent?.trim() ?? el.id));
      const v0 = await r.inputValue();
      await r.focus(); await page.keyboard.press('End'); await page.waitForTimeout(80);
      const vMax = await r.inputValue();
      await page.keyboard.press('Home'); await page.waitForTimeout(80);
      const vMin = await r.inputValue();
      const broken = await page.evaluate(() => (document.body.innerText.match(/\b(NaN|undefined|Infinity)\b/g) || []).length);
      sliders.push({ label, v0, vMin, vMax, responds: vMin !== vMax, broken });
    }
    report.checks.sliders = sliders;

    // 3. Toggle-type controls must change their pressed/checked state when activated.
    const toggles = page.locator('main [aria-pressed], main [role=switch], main input[type=checkbox]');
    const t = await toggles.count();
    const dead = [];
    for (let i = 0; i < t; i++) {
      const el = toggles.nth(i);
      if (!(await el.isVisible())) continue;
      const read = () => el.evaluate((e) => e.getAttribute('aria-pressed') ?? e.getAttribute('aria-checked') ?? String(e.checked));
      const a = await read(); await el.click(); await page.waitForTimeout(150); const b = await read();
      if (a === b) dead.push((await el.getAttribute('aria-label')) || (await el.innerText()).slice(0, 40));
      await el.click(); await page.waitForTimeout(100);
    }
    report.checks.deadToggles = dead;
  }
  report.runs.at(-1).errors = errors.slice(0, 15);
  await ctx.close();
}

await browser.close();
console.log(JSON.stringify(report, null, 1));
