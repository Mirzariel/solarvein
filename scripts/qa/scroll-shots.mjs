// Scroll-choreography screenshots: node scripts/qa/scroll-shots.mjs <url> <outDir> [width] [height] [reduced]
// Scrolls with the mouse wheel (so Lenis/ScrollTrigger behave as for a person) and captures one frame per step.
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';

const [url = 'http://localhost:5192/', out = 'qa-shots', w = '1440', h = '900', reduced] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
let browser;
for (const channel of ['chrome', 'msedge']) {
  try {
    browser = await chromium.launch({ channel, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    break;
  } catch {
    /* next */
  }
}
const page = await browser.newPage({ viewport: { width: +w, height: +h }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const total = await page.evaluate(() => document.documentElement.scrollHeight);
const step = Math.round(+h * 0.6);
let i = 0;
for (let y = 0; y < total + +h; y += step) {
  await page.screenshot({ path: path.join(out, `${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
  i++;
  await page.mouse.move(+w / 2, +h / 2);
  await page.mouse.wheel(0, step);
  await page.waitForTimeout(1100);
  const at = await page.evaluate(() => window.scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
  if (at) {
    await page.screenshot({ path: path.join(out, `${String(i).padStart(2, '0')}.jpg`), type: 'jpeg', quality: 70 });
    break;
  }
}
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
console.log(JSON.stringify({ shots: i + 1, total, overflowX: overflow, errors: errors.slice(0, 10) }));
await browser.close();
