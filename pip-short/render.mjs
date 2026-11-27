// Parallel frame renderer: headless Chromium canvas -> JPEG -> ffmpeg (x264) segments -> concat + audio
// usage: node render.mjs [--workers 3] [--langs en,uk] [--from 0 --to 150]
import { createRequire } from 'node:module';
import { spawn, execFileSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(import.meta.url)('playwright');

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const WORKERS = parseInt(arg('workers', '3'));
const LANGS = arg('langs', 'en,uk').split(',');
const FPS = 30, TOTAL = 150 * FPS;
const segDir = path.join(here, 'out', 'seg');
mkdirSync(segDir, { recursive: true });

// frames that contain on-screen text (language specific)
const TEXT = [[0, 90], [111, 191], [1420, 1472], [2314, 2426], [4336, 4500]];
const CHUNK = 240;
function splitRange(a, b) { const r = []; for (let s = a; s < b; s += CHUNK) r.push([s, Math.min(b, s + CHUNK)]); return r; }
const jobs = [];
const lists = Object.fromEntries(LANGS.map((l) => [l, []]));
let cursor = 0;
const pieces = [];
for (const [a, b] of TEXT) { if (cursor < a) pieces.push({ a: cursor, b: a, text: false }); pieces.push({ a, b, text: true }); cursor = b; }
if (cursor < TOTAL) pieces.push({ a: cursor, b: TOTAL, text: false });
for (const p of pieces) {
  for (const [a, b] of splitRange(p.a, p.b)) {
    if (p.text) {
      for (const l of LANGS) { const f = path.join(segDir, `${l}_${String(a).padStart(5, '0')}.mp4`); jobs.push({ lang: l, a, b, f }); lists[l].push(f); }
    } else {
      const f = path.join(segDir, `xx_${String(a).padStart(5, '0')}.mp4`); jobs.push({ lang: LANGS[0], a, b, f }); for (const l of LANGS) lists[l].push(f);
    }
  }
}
// biggest first for better packing
jobs.sort((x, y) => (y.b - y.a) - (x.b - x.a));
console.log(`${jobs.length} jobs, ${jobs.reduce((s, j) => s + j.b - j.a, 0)} frames, ${WORKERS} workers`);

const t0 = Date.now();
let done = 0;
async function worker(id) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  page.on('pageerror', (e) => console.log(`[w${id} pageerror]`, e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log(`[w${id}]`, m.text()); });
  await page.goto('file://' + path.join(here, 'src', 'index.html'));
  await page.evaluate(() => window.READY);
  while (jobs.length) {
    const j = jobs.shift();
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '60', '-threads', '2', '-r', String(FPS), '-an', j.f], { stdio: ['pipe', 'inherit', 'inherit'] });
    const closed = new Promise((res) => ff.on('close', res));
    for (let f = j.a; f < j.b; f++) {
      const url = await page.evaluate(([t, l]) => window.frameJPEG(t, l, 0.94), [f / FPS, j.lang]);
      const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
      done++;
      if (done % 150 === 0) { const el = (Date.now() - t0) / 1000; console.log(`${done} frames, ${el.toFixed(0)}s, ${(done / el).toFixed(1)} fps`); }
    }
    ff.stdin.end();
    await closed;
  }
  await browser.close();
}
await Promise.all(Array.from({ length: WORKERS }, (_, i) => worker(i)));
console.log('frames done in', ((Date.now() - t0) / 1000).toFixed(0), 's');

const audio = path.join(here, 'out', 'audio.wav');
for (const l of LANGS) {
  const listFile = path.join(segDir, `list_${l}.txt`);
  writeFileSync(listFile, lists[l].map((f) => `file '${f}'`).join('\n'));
  const out = path.join(here, 'out', `pip_ep1_${l}.mp4`);
  const args = ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', listFile];
  if (existsSync(audio)) args.push('-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k');
  args.push('-c:v', 'copy', '-t', '150', '-movflags', '+faststart', out);
  execFileSync('ffmpeg', args);
  console.log('->', out);
}
