// node docs/audit/wave2/w5/depth.mjs <port> [runs] [width]  -> counts "Maximum update depth" console errors when wheel-scrolling top -> bottom
import { chromium } from 'playwright-core';
const [port = '5191', runs = '5', width = '390'] = process.argv.slice(2);
const w = +width, h = w >= 1024 ? 900 : w >= 768 ? 1024 : 800;
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
let total = 0;
for (let r = 0; r < +runs; r++) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(() => {
    const hist = [];
    window.__hist = hist;
    const nameOf = (f) => (f.type && (f.type.displayName || f.type.name)) || (f.type && f.type.$$typeof ? 'memo/fwd' : '?');
    const walk = (f, out) => {
      while (f) {
        if ((f.flags & 1) && typeof f.type === 'function') out.push(nameOf(f));
        if (f.child && (f.subtreeFlags & 1)) walk(f.child, out);
        f = f.sibling;
      }
    };
    window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true, renderers: new Map(), isDisabled: false,
      inject(r) { this.renderers.set(1, r); return 1; },
      onCommitFiberRoot(id, root) { const out = []; try { walk(root.current, out); } catch (e) {} hist.push(out); if (hist.length > 120) hist.shift(); },
      onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, checkDCE() {}, onScheduleFiberRoot() {},
    };
  });
  await ctx.addInitScript(() => {
    window.__depth = [];
    const orig = console.error;
    console.error = function (...a) {
      if (/Maximum update depth/.test(String(a[0]))) window.__depth.push(JSON.stringify((() => { const h = window.__hist.slice(-60); const c = {}; for (const o of h) for (const n of new Set(o)) c[n] = (c[n] || 0) + 1; return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 12); })()) + ' commits=' + window.__hist.length + ' T=' + Math.round(performance.now()) + ' Y=' + Math.round(scrollY) + ' sec=' + [...document.querySelectorAll('main > section, main section[id]')].filter((e) => { const r = e.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }).map((e) => e.id).join(',') + ' busy=' + document.querySelectorAll('section[aria-busy]').length + new Error('depth').stack.slice(0,200) + ' ARGS ' + a.slice(1).map(String).join(' | ').slice(0, 800));
      return orig.apply(this, a);
    };
  });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', async (m) => {
    if (/Maximum update depth/.test(m.text())) {
      const a = [];
      for (const hd of m.args()) a.push(await hd.jsonValue().catch(() => '?'));
      logs.push(JSON.stringify(a).slice(0, 2500) + '\nLOC ' + JSON.stringify(m.location()));
    }
  });
  p.on('pageerror', (e) => /Maximum update depth/.test(String(e)) && logs.push('PAGEERR ' + String(e.stack).slice(0, 2500)));
  await p.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.mouse.move(w / 2, h / 2);
  for (let i = 0; i < 80; i++) {
    await p.mouse.wheel(0, 900);
    await p.waitForTimeout(160);
    if (i % 20 === 19) await p.waitForTimeout(400);
    const done = await p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
    if (done && i > 5) break;
  }
  await p.waitForTimeout(1200);
  const st = await p.evaluate(() => window.__depth);
  console.log('run', r, 'depth errors', st.length);
  if (st.length) console.log(st[0]);
  total += st.length;
  await ctx.close();
}
console.log('TOTAL', total);
await b.close();
