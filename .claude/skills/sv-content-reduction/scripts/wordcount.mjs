#!/usr/bin/env node
// Visible word count per top-level section (closed <details> content excluded).
// Usage: node .claude/skills/sv-content-reduction/scripts/wordcount.mjs [url] [width]
// Requires playwright-core (a devDependency of the SolarVein repo) and system Chrome or Edge.
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? 'http://localhost:5190';
const width = Number(process.argv[3] ?? 1440);
let browser;
for (const channel of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel }); break; } catch { /* next */ }
}
if (!browser) throw new Error('No system Chrome/Edge available.');
const page = await browser.newPage({ viewport: { width, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
// Force lazy sections to mount.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 120)); }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(800);
const rows = await page.evaluate(() => {
  const visibleWords = (root) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n = 0;
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const el = t.parentElement;
      if (!el) continue;
      if (el.closest('[inert]')) continue; // closed disclosures (Disclosure primitive uses inert)
      const closed = el.closest('details:not([open])');
      if (closed && !el.closest('summary')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"]') || el.closest('.sr-only')) continue;
      n += (t.textContent ?? '').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    }
    return n;
  };
  const blocks = [...document.querySelectorAll('body header:not(main header), main > section, main > div > section, footer')];
  return blocks.map((b) => ({ id: b.id || b.tagName.toLowerCase(), words: visibleWords(b) }));
});
const total = rows.reduce((s, r) => s + r.words, 0);
console.table(rows);
console.log(JSON.stringify({ url, width, total, rows }));
await browser.close();
