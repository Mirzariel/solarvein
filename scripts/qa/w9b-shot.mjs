// node scripts/qa/w9b-shot.mjs <out.png> <width> <height> <selector> [actions-json]
import { chromium } from 'playwright-core';
const [out, w, h, sel, actions = '[]'] = process.argv.slice(2);
let b;
for (const channel of ['chrome', 'msedge']) { try { b = await chromium.launch({ channel }); break; } catch {} }
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
const errs = [];
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', (e) => errs.push(String(e)));
await p.goto('http://localhost:5197/' + (process.env.HASH || ''), { waitUntil: 'networkidle' });
await p.locator('#lab').scrollIntoViewIfNeeded();
await p.waitForTimeout(800);
for (const a of JSON.parse(actions)) {
  if (a.click) await p.locator(a.click).first().click();
  if (a.fill) await p.locator(a.fill[0]).first().fill(a.fill[1]);
  if (a.press) await p.keyboard.press(a.press);
  if (a.eval) await p.evaluate(a.eval);
  if (a.wait) await p.waitForTimeout(a.wait);
  if (a.scroll) await p.locator(a.scroll).first().scrollIntoViewIfNeeded();
}
await p.waitForTimeout(600);
if (sel.startsWith("viewport")) { const y = +(sel.split(":")[1] || 0); await p.evaluate((yy) => window.scrollBy(0, yy), y); await p.waitForTimeout(500); await p.screenshot({ path: out }); } else { const el = p.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.screenshot({ path: out }); }
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await b.close();
