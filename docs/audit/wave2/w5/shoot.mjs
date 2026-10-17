// node docs/audit/wave2/w5/shoot.mjs <port> <outDir> [width] [height]
// Drives the dev-only window.__sv handle: mode A -> C -> B -> A on the visual clock, screenshots at fixed delays.
import { chromium } from 'playwright-core';
const [port = '5191', out = '.', w = '1440', h = '900'] = process.argv.slice(2);
let b;
for (const channel of ['chrome', 'msedge']) {
  try {
    b = await chromium.launch({ channel });
    break;
  } catch {
    /* next */
  }
}
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
const errors = [];
p.on('pageerror', (e) => errors.push(String(e)));
p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__sv, null, { timeout: 15000 });
const sel = '#pengalaman';
await p.locator(sel).first().scrollIntoViewIfNeeded();
await p.waitForTimeout(1500);
const el = p.locator(sel).first();
const snap = async (name) => {
  await el.screenshot({ path: `${out}/${name}.png` });
  const s = await p.evaluate(() => {
    const f = window.__sv.frame();
    return { G: Math.round(f.inputs.irradiance), hour: +f.hour.toFixed(2), pump: f.router.pumpOn, mode: f.router.mode, moving: f.moving, valves: Object.values(f.router.valves).map((v) => +v.toFixed(2)), Q: Math.round(Object.values(f.router.allocW).reduce((a, c) => a + c, 0)) };
  });
  console.log(name, JSON.stringify(s));
};
await snap('1-A-13h');
for (const [m, label] of [['C', 'C-22h'], ['B', 'B-15h'], ['A', 'A-13h']]) {
  await p.evaluate((mm) => window.__sv.setModeTarget(mm), m);
  await p.waitForTimeout(250);
  await snap(`mid-to-${label}`);
  await p.waitForTimeout(1600);
  await snap(`end-${label}`);
}
// hour scrub: dawn
await p.evaluate(() => window.__sv.setHour(6.1));
await p.waitForTimeout(900);
await snap('scrub-06h');
await p.evaluate(() => window.__sv.setHour(9));
await p.waitForTimeout(900);
await snap('scrub-09h');
console.log('errors', JSON.stringify(errors));
await b.close();
