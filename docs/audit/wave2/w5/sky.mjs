// node docs/audit/wave2/w5/sky.mjs <port> <outDir>  -> strips of the page sky (WeatherSky) at noon / dawn / dusk / humid / night
import { chromium } from 'playwright-core';
const [port = '5191', out = '.'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__sv, null, { timeout: 20000 });
const top = await p.evaluate(() => {
  const s = document.querySelector('#pengalaman');
  window.scrollTo(0, s.getBoundingClientRect().top + scrollY - 60);
  return s.getBoundingClientRect().top;
});
await p.waitForTimeout(800);
const shots = [
  ['noon', () => window.__sv.setModeTarget('A')],
  ['humid-15h', () => window.__sv.setModeTarget('B')],
  ['night-22h', () => window.__sv.setModeTarget('C')],
  ['dawn-06h', () => { window.__sv.setScenario('terik'); window.__sv.setHour(6.0); }],
  ['dusk-18h', () => { window.__sv.setScenario('terik'); window.__sv.setHour(17.9); }],
];
for (const [name, fn] of shots) {
  await p.evaluate(fn);
  await p.waitForTimeout(1800);
  const op = await p.evaluate(() => [...document.querySelectorAll('#pengalaman > div[aria-hidden] > div')].map((d) => d.style.opacity));
  console.log(name, JSON.stringify(op));
  await p.screenshot({ path: `${out}/sky-${name}.png`, clip: { x: 0, y: 0, width: 1440, height: 420 } });
}
await b.close();
