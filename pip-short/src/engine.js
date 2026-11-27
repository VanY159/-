// ============================================================
//  Pip — 2.5D procedural renderer: core engine
//  Virtual perspective camera, layers, particles, effects.
// ============================================================
'use strict';

const W = 1080, H = 1920, FPS = 30, DURATION = 150;
const OVER = 700; // overscan for full-frame fills (camera roll)

let ctx = null;          // current drawing context (switched by layers)
let MAIN = null;         // main canvas context
let LANG = 'en';
const CANVAS = {};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const TAU = Math.PI * 2;
const E = {
  lin: (t) => t,
  in2: (t) => t * t,
  out2: (t) => 1 - (1 - t) * (1 - t),
  io2: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  in3: (t) => t * t * t,
  out3: (t) => 1 - Math.pow(1 - t, 3),
  io3: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in5: (t) => t ** 5,
  out5: (t) => 1 - Math.pow(1 - t, 5),
  io5: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  sine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  step: (t) => (t < 1 ? 0 : 1),
};

function hash(n) {
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function noise(t, seed = 0) {
  const i = Math.floor(t), f = t - i;
  const a = hash(i + seed * 101.37) * 2 - 1, b = hash(i + 1 + seed * 101.37) * 2 - 1;
  return lerp(a, b, smooth(f));
}
function fbm(t, seed = 0) {
  return noise(t, seed) * 0.6 + noise(t * 2.13, seed + 7) * 0.28 + noise(t * 4.37, seed + 13) * 0.12;
}
const mod = (a, n) => ((a % n) + n) % n;

// Keyframes: [[t, v, ease], ...] — ease belongs to the segment ending at that key
function kf(t, keys) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1];
      const [t1, v1, e] = keys[i];
      const u = (t - t0) / (t1 - t0 || 1);
      return lerp(v0, v1, (e || E.io2)(u));
    }
  }
  return keys[keys.length - 1][1];
}
// Pulse 0..1..0 between a..b with fades
function pulse(t, a, b, fin = 0.2, fout = 0.2) {
  if (t < a || t > b) return 0;
  return Math.min(inv(a, a + fin, t), 1 - inv(b - fout, b, t));
}

// ---------------------------------------------------------------- colors
const _hexCache = {};
function hex(h) {
  if (typeof h !== 'string') return h;
  if (_hexCache[h]) return _hexCache[h];
  const s = h.replace('#', '');
  return (_hexCache[h] = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]);
}
function mix(a, b, t) {
  a = hex(a); b = hex(b);
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
function rgba(c, a = 1) {
  c = hex(c);
  return `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
}
function shade(c, k) { // k<0 darker, k>0 lighter
  return k < 0 ? mix(c, [0, 0, 0], -k) : mix(c, [255, 255, 255], k);
}

// ---------------------------------------------------------------- camera
const cam = { x: 0, y: 0, z: 0, F: 1100, roll: 0, sx: 0, sy: 0 };
function setCam(o) {
  cam.x = 0; cam.y = 0; cam.z = 0; cam.F = 1100; cam.roll = 0; cam.sx = 0; cam.sy = 0;
  Object.assign(cam, o);
}
function shakeCam(t, amp, freq = 1, seed = 1) {
  cam.sx += fbm(t * freq * 2.1, seed) * amp * 26;
  cam.sy += fbm(t * freq * 2.3, seed + 3) * amp * 26;
  cam.roll += fbm(t * freq * 1.7, seed + 5) * amp * 0.018;
}
// Project world point -> screen
function P(x, y, z) {
  const d = z - cam.z;
  if (d < 0.02) return null;
  const s = cam.F / d;
  return { x: W / 2 + cam.sx + (x - cam.x) * s, y: H / 2 + cam.sy + (y - cam.y) * s, s, d };
}
function horizonY() { return H / 2 + cam.sy; }
// Look-at helper: set shift so that world point lands at screen (px,py)
function aim(x, y, z, px = W / 2, py = H / 2) {
  const d = z - cam.z, s = cam.F / d;
  cam.sx = px - W / 2 - (x - cam.x) * s;
  cam.sy = py - H / 2 - (y - cam.y) * s;
}

function baseTransform(c = ctx) {
  c.setTransform(1, 0, 0, 1, 0, 0);
  if (cam.roll) {
    c.translate(W / 2, H / 2);
    c.rotate(cam.roll);
    c.translate(-W / 2, -H / 2);
  }
}

// Billboard at world position: local units == world units
function at(x, y, z, fn, k = 1) {
  const p = P(x, y, z);
  if (!p || p.s * k < 0.02) return null;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.scale(p.s * k, p.s * k);
  fn(p);
  ctx.restore();
  return p;
}

// 3D polygon with near-plane clipping; builds path, returns true if visible
function path3(pts, near = 0.25) {
  const zc = cam.z + near;
  const out = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const ain = a[2] >= zc, bin = b[2] >= zc;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (zc - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, zc]);
    }
  }
  if (out.length < 3) return false;
  ctx.beginPath();
  for (let i = 0; i < out.length; i++) {
    const q = P(out[i][0], out[i][1], out[i][2]);
    if (i) ctx.lineTo(q.x, q.y); else ctx.moveTo(q.x, q.y);
  }
  ctx.closePath();
  return true;
}
function fill3(pts, style) { if (path3(pts)) { ctx.fillStyle = style; ctx.fill(); return true; } return false; }

// polyline in 3D (no clipping beyond skipping behind points)
function line3(pts) {
  ctx.beginPath();
  let started = false;
  for (const p of pts) {
    const q = P(p[0], p[1], p[2]);
    if (!q) { started = false; continue; }
    if (started) ctx.lineTo(q.x, q.y); else { ctx.moveTo(q.x, q.y); started = true; }
  }
}

// ---------------------------------------------------------------- layers
function initCanvases() {
  CANVAS.main = document.getElementById('c');
  MAIN = CANVAS.main.getContext('2d');
  CANVAS.L = [makeCanvas(W, H), makeCanvas(W, H), makeCanvas(W, H)];
  CANVAS.grain = makeGrain(512);
}

// Draw fn into an offscreen layer, optional tint (source-atop) and blur, composite onto current ctx
function layer(fn, o = {}) {
  const slot = o.slot ?? 0;
  const lc = CANVAS.L[slot];
  const lx = lc.getContext('2d');
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.globalCompositeOperation = 'source-over';
  lx.globalAlpha = 1;
  lx.filter = 'none';
  lx.clearRect(0, 0, W, H);
  const prev = ctx;
  ctx = lx;
  baseTransform();
  fn();
  ctx = prev;
  if (o.tint && o.tintA > 0) {
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.globalCompositeOperation = 'source-atop';
    lx.globalAlpha = 1;
    lx.fillStyle = rgba(o.tint, o.tintA);
    lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'source-over';
  }
  if (o.rim && o.rimA > 0) { // additive rim / key light from a direction
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.globalCompositeOperation = 'source-atop';
    const g = lx.createLinearGradient(o.rimX0 ?? 0, o.rimY0 ?? 0, o.rimX1 ?? W, o.rimY1 ?? 0);
    g.addColorStop(0, rgba(o.rim, 0));
    g.addColorStop(1, rgba(o.rim, o.rimA));
    lx.fillStyle = g;
    lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'source-over';
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.blur > 0.3) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
  ctx.globalAlpha = o.alpha ?? 1;
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  ctx.drawImage(lc, 0, 0);
  ctx.restore();
}

// Render a scene function into slot 2 then composite with directional motion blur
function motionBlur(fn, dx, dy, samples = 7) {
  const lc = CANVAS.L[2];
  const lx = lc.getContext('2d');
  lx.setTransform(1, 0, 0, 1, 0, 0);
  lx.clearRect(0, 0, W, H);
  const prev = ctx;
  ctx = lx;
  fn();
  ctx = prev;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (Math.abs(dx) + Math.abs(dy) < 1) { ctx.drawImage(lc, 0, 0); ctx.restore(); return; }
  for (let i = 0; i < samples; i++) {
    const k = i / (samples - 1) - 0.5;
    ctx.globalAlpha = 1 / (i + 1);
    ctx.drawImage(lc, dx * k, dy * k);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- full-frame helpers
function fillFrame(style, comp, alpha = 1) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (comp) ctx.globalCompositeOperation = comp;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = style;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
function vgrad(y0, y1, stops) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  for (const [o, c, a] of stops) g.addColorStop(clamp(o), rgba(c, a ?? 1));
  return g;
}
function rgrad(x, y, r0, r1, stops) {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, c, a] of stops) g.addColorStop(clamp(o), rgba(c, a ?? 1));
  return g;
}
function glow(x, y, r, color, a = 1, comp = 'lighter') {
  if (a <= 0 || r <= 0) return;
  ctx.save();
  ctx.globalCompositeOperation = comp;
  ctx.fillStyle = rgrad(x, y, 0, r, [[0, color, a], [0.25, color, a * 0.45], [1, color, 0]]);
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}
function glow3(x, y, z, r, color, a = 1) { const p = P(x, y, z); if (p) glow(p.x, p.y, r * p.s, color, a); }

function vignette(a = 0.55, inner = 0.35) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createRadialGradient(W / 2, H / 2, H * inner * 0.5, W / 2, H / 2, H * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${a})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function makeGrain(n) {
  const c = makeCanvas(n, n);
  const x = c.getContext('2d');
  const img = x.createImageData(n, n);
  const r = rng(777);
  for (let i = 0; i < n * n; i++) {
    const v = 128 + (r() + r() + r() - 1.5) * 120;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
function grain(t, a = 0.07) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = a;
  const f = Math.floor(t * FPS);
  const ox = Math.floor(hash(f) * 512), oy = Math.floor(hash(f + 0.5) * 512);
  const pat = ctx.createPattern(CANVAS.grain, 'repeat');
  ctx.translate(-ox, -oy);
  ctx.fillStyle = pat;
  ctx.fillRect(0, 0, W + 512, H + 512);
  ctx.restore();
}

// Global colour grade: lift shadows toward teal, highlights toward warm
function grade(o = {}) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (o.shadow) {
    ctx.globalCompositeOperation = 'lighten';
    ctx.globalAlpha = o.shadowA ?? 0.25;
    ctx.fillStyle = rgba(o.shadow);
    ctx.fillRect(0, 0, W, H);
  }
  if (o.soft) {
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = o.softA ?? 0.35;
    ctx.fillStyle = vgrad(0, H, [[0, o.soft[0]], [1, o.soft[1]]]);
    ctx.fillRect(0, 0, W, H);
  }
  if (o.mult) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = o.multA ?? 1;
    ctx.fillStyle = rgba(o.mult);
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- weather / particles
// Rain streaks in camera-relative 3D space
function rain(t, o = {}) {
  const N = Math.floor((o.n ?? 900) * (o.k ?? 1));
  if (N <= 0) return;
  const speed = o.speed ?? 60;      // world units / s
  const wind = o.wind ?? -0.18;     // slant
  const shutter = o.shutter ?? 0.022;
  const zNear = o.zNear ?? 1.2, zFar = o.zFar ?? 55;
  const color = o.color ?? [200, 220, 235];
  const slow = o.slow ?? 1;
  const tt = t * slow;
  const buckets = [[], [], []];
  for (let i = 0; i < N; i++) {
    const hz = hash(i * 3.17 + 0.1);
    const d = zNear + (zFar - zNear) * hz * hz;
    const hw = (W / 2 + OVER * 0.6) / cam.F * d;
    const hh = (H / 2 + OVER * 0.6) / cam.F * d;
    const x = cam.x + (hash(i * 7.31 + 0.2) * 2 - 1) * hw;
    const span = hh * 2;
    const y = cam.y - hh + mod(hash(i * 1.93 + 0.4) * span + tt * speed * (0.85 + 0.3 * hash(i + 9.1)), span);
    const len = speed * shutter * (o.len ?? 1) * (slow < 1 ? 0.35 + slow * 0.65 : 1);
    const p0 = P(x, y, cam.z + d), p1 = P(x + wind * len, y + len, cam.z + d);
    if (!p0 || !p1) continue;
    const b = d < 6 ? 0 : d < 18 ? 1 : 2;
    buckets[b].push(p0.x, p0.y, p1.x, p1.y);
  }
  ctx.save();
  ctx.lineCap = 'round';
  const widths = [3.2, 1.8, 1.0], alphas = [0.32, 0.38, 0.30];
  for (let b = 0; b < 3; b++) {
    const arr = buckets[b];
    if (!arr.length) continue;
    ctx.strokeStyle = rgba(color, alphas[b] * (o.alpha ?? 1));
    ctx.lineWidth = widths[b] * (o.width ?? 1);
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 4) { ctx.moveTo(arr[i], arr[i + 1]); ctx.lineTo(arr[i + 2], arr[i + 3]); }
    ctx.stroke();
  }
  ctx.restore();
}

// Ripples from rain on a horizontal water surface at height wy
function ripples(t, wy, o = {}) {
  const N = o.n ?? 90;
  const zNear = o.zNear ?? 2, zFar = o.zFar ?? 40;
  ctx.save();
  ctx.lineWidth = 1.6;
  for (let i = 0; i < N; i++) {
    const period = 0.7 + hash(i * 2.7) * 0.5;
    const ph = mod(t / period + hash(i * 5.1), 1);
    const cycle = Math.floor(t / period + hash(i * 5.1));
    const hz = hash(i * 3.3 + cycle * 0.37);
    const d = zNear + (zFar - zNear) * hz;
    const hw = (W / 2) / cam.F * d;
    const x = cam.x + (hash(i * 9.7 + cycle * 1.3) * 2 - 1) * hw * 1.2 + (o.xOff ?? 0);
    const z = cam.z + d;
    if (o.xMin !== undefined && (x < o.xMin || x > o.xMax)) continue;
    const p = P(x, wy, z);
    if (!p) continue;
    const r = (0.05 + ph * 0.35) * (o.size ?? 1);
    const flat = clamp(Math.abs(wy - cam.y) / d, 0.08, 1);
    ctx.strokeStyle = rgba(o.color ?? [210, 230, 240], (1 - ph) * (o.alpha ?? 0.4));
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * p.s, r * p.s * flat, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

// Lightning flash intensity for a list of strike times
function flashAt(t, strikes) {
  let f = 0;
  for (const s of strikes) {
    const dt = t - s;
    if (dt < 0 || dt > 1.2) continue;
    f += Math.exp(-dt * 9) + 0.6 * Math.exp(-Math.abs(dt - 0.12) * 30) + 0.35 * Math.exp(-Math.abs(dt - 0.3) * 25);
  }
  return clamp(f, 0, 1.4);
}
// Jagged bolt in screen space
function bolt(x0, y0, x1, y1, seed, a = 1, width = 6) {
  if (a <= 0.01) return;
  const r = rng(seed);
  const pts = [[x0, y0]];
  const n = 14;
  for (let i = 1; i < n; i++) {
    const u = i / n;
    pts.push([lerp(x0, x1, u) + (r() - 0.5) * 120 * (1 - u * 0.4), lerp(y0, y1, u) + (r() - 0.5) * 30]);
  }
  pts.push([x1, y1]);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineJoin = 'round';
  for (const [w, al] of [[width * 6, 0.12], [width * 2.2, 0.35], [width, 1]]) {
    ctx.strokeStyle = `rgba(210,225,255,${al * a})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.stroke();
  }
  // branches
  ctx.lineWidth = width * 0.5;
  ctx.strokeStyle = `rgba(210,225,255,${0.7 * a})`;
  for (let b = 0; b < 3; b++) {
    const k = 3 + Math.floor(r() * (n - 6));
    let [bx, by] = pts[k];
    ctx.beginPath(); ctx.moveTo(bx, by);
    const dir = r() < 0.5 ? -1 : 1;
    for (let j = 0; j < 5; j++) { bx += dir * (20 + r() * 50); by += 20 + r() * 40; ctx.lineTo(bx, by); }
    ctx.stroke();
  }
  ctx.restore();
}

// Water droplets stuck on the lens
function lensDrops(t, a = 0.5, seed = 3, n = 14) {
  if (a <= 0) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  for (let i = 0; i < n; i++) {
    const r = 10 + hash(i * 4.1 + seed) * 34;
    const x = hash(i * 7.7 + seed) * W;
    const y = mod(hash(i * 3.9 + seed) * H + t * (8 + hash(i + seed) * 30), H + 200) - 100;
    const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${0.35 * a})`);
    g.addColorStop(0.5, `rgba(200,220,235,${0.08 * a})`);
    g.addColorStop(0.85, `rgba(20,30,40,${0.18 * a})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.08, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Generic particle burst (splash / spray) in world space
function splash(x, y, z, t0, t, o = {}) {
  const dt = (t - t0) * (o.slow ?? 1);
  if (dt < 0 || dt > (o.life ?? 1.1)) return;
  const n = o.n ?? 40;
  const g = o.g ?? 24;
  const pow = o.pow ?? 7;
  const col = o.color ?? [225, 240, 250];
  ctx.save();
  for (let i = 0; i < n; i++) {
    const a = (o.a0 ?? -Math.PI) + hash(i * 3.1 + t0) * (o.spread ?? Math.PI);
    const v = pow * (0.4 + hash(i * 1.7 + t0) * 0.8);
    const vz = (hash(i * 5.3 + t0) - 0.5) * pow * 0.5;
    const px = x + Math.cos(a) * v * dt;
    const py = y + Math.sin(a) * v * dt + 0.5 * g * dt * dt;
    const pz = z + vz * dt;
    if (py > y + 0.3 && !o.noFloor) continue;
    const p = P(px, py, pz);
    if (!p) continue;
    const r = (o.size ?? 0.07) * (0.5 + hash(i * 8.1) * 0.8) * p.s;
    const life = 1 - dt / (o.life ?? 1.1);
    ctx.fillStyle = rgba(col, (o.alpha ?? 0.85) * life);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(r, 0.8), Math.max(r * 1.3, 0.8), 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- text
const TXT = {
  hook1: { en: ["He's 8 weeks old."], uk: ['Йому 8 тижнів.'] },
  hook2: { en: ['He has ', '*ONE*', ' chance.'], uk: ['У нього ', '*ОДИН*', ' шанс.'] },
  earlier: { en: ['12 hours earlier'], uk: ['12 годин тому'] },
  nobody: { en: ['*Nobody* helped.'], uk: ['*Ніхто* не допоміг.'] },
  notgive1: { en: ['But he'], uk: ['Але він'] },
  notgive2: { en: ["*didn't give up.*"], uk: ['*не здався.*'] },
  help1: { en: ['Would you'], uk: ['А ти б'] },
  help2: { en: ['*help her?*'], uk: ['*їй допоміг?*'] },
  part2: { en: ['PART 2'], uk: ['ЧАСТИНА 2'] },
};
// Draw one line made of segments; *word* = highlighted
function textLine(key, x, y, size, o = {}) {
  const segs = TXT[key][LANG];
  const parts = [];
  for (const s of segs) {
    const re = /\*([^*]+)\*/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) parts.push([s.slice(last, m.index), false]);
      parts.push([m[1], true]);
      last = m.index + m[0].length;
    }
    if (last < s.length) parts.push([s.slice(last), false]);
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const sc = o.scale ?? 1;
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  ctx.font = `${o.weight ?? 900} ${size}px "Inter Display", Inter, sans-serif`;
  ctx.textBaseline = 'middle';
  let total = 0;
  for (const [s] of parts) total += ctx.measureText(s).width;
  let cx = -total / 2;
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.lineJoin = 'round';
  for (const [s, hi] of parts) {
    const w = ctx.measureText(s).width;
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.35;
    ctx.shadowOffsetY = size * 0.06;
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = 'rgba(8,14,20,0.92)';
    ctx.strokeText(s, cx, 0);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = hi ? '#FFD21F' : '#FFFFFF';
    ctx.fillText(s, cx, 0);
    cx += w;
  }
  ctx.restore();
}
// Animated title: pops in at t0, out at t1
function title(t, key, t0, t1, y, size = 92, o = {}) {
  if (t < t0 || t > t1) return;
  const ain = inv(t0, t0 + 0.35, t);
  const aout = 1 - inv(t1 - 0.3, t1, t);
  const sc = lerp(0.55, 1, E.outBack(ain)) * (1 + (t - t0) * 0.012);
  textLine(key, W / 2 + (o.x ?? 0), y - (1 - aout) * 30, size, { scale: sc, alpha: Math.min(ain * 1.6, 1) * aout, weight: o.weight });
}
// Vector arrow (instead of emoji)
function arrow(x, y, size, dir, a = 1, color = '#FFD21F') {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(x, y);
  ctx.rotate(dir);
  ctx.globalAlpha = a;
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(8,14,20,0.92)';
  ctx.lineWidth = size * 0.12;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.18); ctx.lineTo(size * 0.1, -size * 0.18); ctx.lineTo(size * 0.1, -size * 0.45);
  ctx.lineTo(size * 0.55, 0); ctx.lineTo(size * 0.1, size * 0.45); ctx.lineTo(size * 0.1, size * 0.18); ctx.lineTo(-size * 0.5, size * 0.18);
  ctx.closePath();
  ctx.stroke(); ctx.fill();
  ctx.restore();
}

// ---------------------------------------------------------------- generic shapes
function ellipse(x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot, 0, TAU); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.abs(r), 0, TAU); }
function rrect(x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
}
function poly(pts) { ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); }
