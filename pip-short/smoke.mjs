// Render every Nth frame without encoding; report errors and per-scene timing
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const step = parseFloat(process.argv[2] || '0.2');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
let errs = 0;
page.on('console', (m) => { if (m.type() === 'error') { errs++; if (errs < 40) console.log(m.text()); } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('file://' + path.join(here, 'src', 'index.html'));
await page.evaluate(() => window.READY);
const times = [];
for (let t = 0; t < 150; t += step) times.push(+t.toFixed(3));
const res = await page.evaluate((ts) => { const out = []; for (const t of ts) { const a = performance.now(); window.renderAt(t, 'uk'); out.push([t, performance.now() - a]); } return out; }, times);
const buckets = {};
for (const [t, ms] of res) { const b = Math.floor(t / 10) * 10; (buckets[b] = buckets[b] || []).push(ms); }
for (const b in buckets) { const a = buckets[b]; console.log(`${b}s avg ${(a.reduce((x, y) => x + y, 0) / a.length).toFixed(0)}ms max ${Math.max(...a).toFixed(0)}ms`); }
console.log('errors:', errs);
await browser.close();
