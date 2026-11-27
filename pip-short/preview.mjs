// Render individual frames (or a contact sheet) for review.
// usage: node preview.mjs out/name.png 1.5 12 40.2 ...   [--lang uk] [--sheet] [--scale 0.25]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = args.shift();
let lang = 'en', sheet = false, scale = 0.25;
const times = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lang') lang = args[++i];
  else if (args[i] === '--sheet') sheet = true;
  else if (args[i] === '--scale') scale = parseFloat(args[++i]);
  else times.push(parseFloat(args[i]));
}
const browser = await chromium.launch({ args: ['--disable-gpu-vsync'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('console', (m) => console.log('[page]', m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('file://' + path.join(here, 'src', 'index.html'));
await page.evaluate(() => window.READY);
const files = [];
for (const t of times) {
  const t0 = Date.now();
  const url = await page.evaluate(([t, lang]) => window.framePNG(t, lang), [t, lang]);
  const f = sheet ? path.join(here, 'out', `_tmp_${t}.png`) : times.length === 1 ? out : out.replace(/\.png$/, `_${t}.png`);
  writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
  files.push(f);
  console.log(`t=${t} ${Date.now() - t0}ms -> ${f}`);
}
await browser.close();
if (sheet) {
  const w = Math.round(1080 * scale), h = Math.round(1920 * scale);
  const cols = Math.min(files.length, 6);
  const inputs = files.flatMap((f) => ['-i', f]);
  const filt = files.map((_, i) => `[${i}:v]scale=${w}:${h},drawtext=text='${times[i]}':x=8:y=8:fontsize=${Math.round(28 * scale * 4)}:fontcolor=yellow:box=1:boxcolor=black@0.6[v${i}]`).join(';');
  const layout = files.map((_, i) => `${(i % cols) * w}_${Math.floor(i / cols) * h}`).join('|');
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', `${filt};${files.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${files.length}:layout=${layout}:fill=black`, out]);
  for (const f of files) execFileSync('rm', [f]);
  console.log('sheet ->', out);
}
