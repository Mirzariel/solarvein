import { chromium } from 'playwright-core';
const w = 390, h = 800;
const b = await chromium.launch({ channel: 'chrome', args: ['--use-angle=d3d11', '--ignore-gpu-blocklist', '--enable-gpu'] });
const ctx = await b.newContext({ viewport: { width: w, height: h } });
const p = await ctx.newPage();
await p.goto('http://localhost:5191/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
await p.mouse.move(w / 2, h / 2);
const probe = async (tag) => {
  const a = await p.evaluate(() => { const f = window.__sv.frame(); return [f.epoch, f.moving, Math.round(scrollY)]; });
  await p.waitForTimeout(1000);
  const c = await p.evaluate(() => { const f = window.__sv.frame(); const s = window.__sv.store.getState(); return [f.epoch, f.moving, f.hour, s.hour, s.scenario, s.modeTarget]; });
  console.log(tag, 'epoch/s', c[0] - a[0], 'moving', c[1], 'hour', c[2], 'store', c.slice(3).join(' '), 'Y', a[2]);
};
await probe('top');
for (let i = 0; i < 80; i++) {
  await p.mouse.wheel(0, 900);
  await p.waitForTimeout(160);
  if (i % 8 === 7) await probe('i=' + i);
}
await b.close();
