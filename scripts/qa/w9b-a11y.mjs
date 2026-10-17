import { chromium } from 'playwright-core';
let b;
for (const channel of ['chrome', 'msedge']) { try { b = await chromium.launch({ channel }); break; } catch {} }
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://localhost:5197/', { waitUntil: 'networkidle' });
await p.locator('#lab').scrollIntoViewIfNeeded();
await p.waitForTimeout(1200);
const info = await p.evaluate(() => [...document.querySelectorAll('#lab input[type=range]')].map((i) => ({ id: i.id, vis: i.offsetParent !== null, labels: [...(i.labels || [])].map((l) => l.textContent), aria: i.getAttribute('aria-label') })));
console.log(JSON.stringify(info, null, 0));
const sliders = await p.getByRole('slider').all();
const names = [];
for (const s of sliders) names.push(await s.evaluate((e) => e.id) + ' => ' + (await s.getAttribute('aria-label')));
console.log(sliders.length);
const named = await p.locator('#lab').getByRole('slider', { name: /./ }).count();
console.log('named sliders in lab', named);
await b.close();
