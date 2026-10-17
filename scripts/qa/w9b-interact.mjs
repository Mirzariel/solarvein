import { chromium } from 'playwright-core';
const URL = process.env.URL || 'http://localhost:5197/';
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
let b;
for (const channel of ['chrome', 'msedge']) { try { b = await chromium.launch({ channel }); break; } catch {} }
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', (e) => errs.push('pageerror ' + String(e)));
await p.goto(URL, { waitUntil: 'networkidle' });
await p.locator('#lab').scrollIntoViewIfNeeded();
await p.waitForTimeout(1500);
const ranges = p.locator('#lab input[type=range]');
const n = await ranges.count(); console.log('n', n);
for (let i = 0; i < n; i++) {
  const r = ranges.nth(i);
  if (!(await r.isVisible())) continue;
  const id = await r.getAttribute('id'); console.log('slider', id);
  if (ONLY.length && !ONLY.includes(id)) continue;
  await r.scrollIntoViewIfNeeded();
  await r.focus();
  const before = await r.inputValue();
  await p.keyboard.press('End');
  await p.waitForTimeout(400);
  const t1 = Date.now();
  for (let k = 0; k < 10; k++) await p.keyboard.press('ArrowLeft');
  const per = (Date.now() - t1) / 10;
  const mid = await r.inputValue();
  await p.keyboard.press('Home');
  await p.waitForTimeout(400);
  console.log(id, 'per arrow ms', per.toFixed(0), 'default', before, 'afterEnd-10', mid);
  await p.keyboard.press('Home');
}
console.log(errs.length ? errs.slice(0, 15).join('\n') : 'no console errors');
await b.close();
