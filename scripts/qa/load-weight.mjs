// node scripts/qa/load-weight.mjs <url> : bytes fetched on first load (no scroll) + LCP, by resource type.
import { chromium } from 'playwright-core';
const [url = 'http://localhost:4173/'] = process.argv.slice(2);
let b;
for (const channel of ['chrome', 'msedge']) {
  try {
    b = await chromium.launch({ channel });
    break;
  } catch {
    /* next */
  }
}
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const bytes = {};
p.on('response', async (r) => {
  try {
    const len = (await r.body()).length;
    const t = r.request().resourceType();
    bytes[t] = (bytes[t] ?? 0) + len;
    if (process.env.LIST && t === 'script') console.log(Math.round(len / 1024) + ' KB', r.url().split('/').pop());
  } catch {
    /* streamed media */
  }
});
await p.goto(url, { waitUntil: 'load' });
const lcp = await p.evaluate(
  () =>
    new Promise((res) => {
      new PerformanceObserver((l) => {
        const e = l.getEntries().at(-1);
        res(Math.round(e.startTime));
      }).observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => res(-1), 3000);
    }),
);
await p.waitForTimeout(800);
const kb = Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024) + ' KB']));
console.log(JSON.stringify({ lcpMs: lcp, firstLoad: kb }));
await b.close();
