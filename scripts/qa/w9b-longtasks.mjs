// long main-thread tasks while stepping each Lab slider (production build): node scripts/qa/w9b-longtasks.mjs [only,ids]
import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:5197/';
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
let b;
for (const channel of ['chrome', 'msedge']) { try { b = await chromium.launch({ channel }); break; } catch {} }
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('#lab').scrollIntoViewIfNeeded();
await p.waitForTimeout(2500);
await p.evaluate(() => {
  window.__lt = [];
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push(Math.round(e.duration)))).observe({ type: 'longtask', buffered: false });
});
const ids = await p.evaluate(() => [...document.querySelectorAll('#lab input[type=range]')].filter((i) => i.offsetParent).map((i) => i.id));
for (const id of ids) {
  if (ONLY.length && !ONLY.includes(id)) continue;
  const r = p.locator('#' + id);
  await r.scrollIntoViewIfNeeded();
  await r.focus();
  await p.evaluate(() => { window.__lt.length = 0; });
  for (let k = 0; k < 24; k++) await p.keyboard.press(k < 12 ? 'ArrowRight' : 'ArrowLeft');
  await p.waitForTimeout(1500);
  const lt = await p.evaluate(() => window.__lt.slice());
  console.log(id.padEnd(14), 'longtasks', lt.length, 'max', Math.max(0, ...lt), 'sum', lt.reduce((a, c) => a + c, 0), 'ms', JSON.stringify(lt.slice(0, 8)));
}
await b.close();
