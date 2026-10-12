// node scripts/qa/element-shot.mjs <url> <selector> <out.png> [width] [height]
import { chromium } from 'playwright-core';
const [url, sel, out, w = '1440', h = '900'] = process.argv.slice(2);
let b;
for (const channel of ['chrome', 'msedge']) {
  try {
    b = await chromium.launch({ channel });
    break;
  } catch {
    /* next */
  }
}
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 2, reducedMotion: 'reduce' });
await p.goto(url, { waitUntil: 'networkidle' });
const el = p.locator(sel).first();
await el.scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);
await el.screenshot({ path: out });
await b.close();
