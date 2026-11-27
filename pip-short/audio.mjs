// ============================================================
//  Pip — procedural soundtrack: music + SFX, pure DSP, no samples.
//  Output: out/audio.wav (44.1 kHz, 16-bit stereo, 150 s)
// ============================================================
import { writeFileSync } from 'node:fs';

const SR = 44100, DUR = 150.4, N = Math.floor(SR * DUR);
const TAU = Math.PI * 2;

// ---------------------------------------------------------------- buses
const bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const MUS = bus(), SFX = bus(), SEND = bus();

let seed = 12345;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const white = () => rnd() * 2 - 1;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;

function put(b, i, v, pan, send = 0) {
  if (i < 0 || i >= N) return;
  const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
  b.L[i] += v * l; b.R[i] += v * r;
  if (send) { SEND.L[i] += v * l * send; SEND.R[i] += v * r * send; }
}

// ---------------------------------------------------------------- filters
class Biquad {
  constructor(type = 'lp', f = 1000, q = 0.707) { this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(type, f, q); }
  set(type, f, q) {
    f = clamp(f, 10, SR * 0.45);
    const w = TAU * f / SR, c = Math.cos(w), s = Math.sin(w), a = s / (2 * q);
    let b0, b1, b2, a0, a1, a2;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = a; b1 = 0; b2 = -a; } // bp (constant peak gain)
    a0 = 1 + a; a1 = -2 * c; a2 = 1 - a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
class OnePole { constructor(f) { this.y = 0; this.set(f); } set(f) { this.a = Math.exp(-TAU * f / SR); } p(x) { this.y = x + this.a * (this.y - x); return this.y; } }

// polyBLEP saw
function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}

// ---------------------------------------------------------------- instruments
function piano(t0, m, dur, vel = 0.6, pan = 0, send = 0.35) {
  const f = mtof(m), len = Math.floor(SR * Math.min(dur + 2.5, 6));
  const i0 = Math.floor(t0 * SR);
  const parts = 9, B = 0.00035;
  const fk = [], ak = [], dk = [], ph = [];
  for (let k = 1; k <= parts; k++) {
    fk.push(f * k * Math.sqrt(1 + B * k * k));
    ak.push(Math.pow(k, -1.25) * (k === 1 ? 1 : 0.7) * (1 - (k - 1) / (parts + 2)));
    dk.push((0.7 + k * 0.45) * (m > 72 ? 1.4 : 1));
    ph.push(rnd() * TAU);
  }
  const noff = Math.floor(dur * SR);
  const lp = new Biquad('lp', 2000 + vel * 6000, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let v = 0;
    for (let k = 0; k < parts; k++) {
      if (fk[k] > SR * 0.45) continue;
      v += ak[k] * Math.exp(-t * dk[k]) * Math.sin(ph[k] + TAU * fk[k] * t);
    }
    const att = Math.min(1, i / (SR * 0.003));
    const rel = i > noff ? Math.exp(-(i - noff) / (SR * 0.25)) : 1;
    let hammer = i < SR * 0.012 ? white() * 0.25 * (1 - i / (SR * 0.012)) : 0;
    v = lp.p(v * att * rel + hammer * vel);
    put(MUS, i0 + i, v * vel * 0.22, pan, send);
  }
}
function pluck(t0, m, vel = 0.5, pan = 0, send = 0.2) { // Karplus–Strong pizzicato
  const f = mtof(m), P = Math.max(2, Math.round(SR / f));
  const buf = new Float32Array(P);
  for (let i = 0; i < P; i++) buf[i] = white();
  const len = Math.floor(SR * 1.4), i0 = Math.floor(t0 * SR);
  let idx = 0, prev = 0;
  const lp = new Biquad('lp', 2500, 0.7);
  for (let i = 0; i < len; i++) {
    const cur = buf[idx];
    const nv = 0.5 * (cur + prev) * 0.994;
    prev = cur; buf[idx] = nv; idx = (idx + 1) % P;
    put(MUS, i0 + i, lp.p(cur) * vel * 0.3 * Math.exp(-i / (SR * 0.5)), pan, send);
  }
}
// ensemble strings / pads (detuned saws through LP), optional tremolo
function strings(t0, t1, notes, o = {}) {
  const att = o.att ?? 0.6, rel = o.rel ?? 0.8, vol = o.vol ?? 0.12, bright = o.bright ?? 1600;
  const i0 = Math.floor(t0 * SR), len = Math.floor((t1 - t0 + rel) * SR);
  const voices = [];
  for (const m of notes) for (let d = 0; d < (o.voices ?? 4); d++) voices.push({ f: mtof(m) * Math.pow(2, ((d - 1.5) * (o.detune ?? 6)) / 1200), ph: rnd(), vib: 4.5 + rnd() * 1.5, vp: rnd() * TAU, pan: (rnd() * 2 - 1) * 0.6 });
  const lpL = new Biquad('lp', bright, 0.8), lpR = new Biquad('lp', bright, 0.8);
  const hold = (t1 - t0) * SR;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if (o.sweep && i % 64 === 0) { const b = o.sweep(t0 + t); lpL.set('lp', b, 0.8); lpR.set('lp', b, 0.8); }
    let l = 0, r = 0;
    for (const v of voices) {
      const fr = v.f * (1 + 0.003 * Math.sin(TAU * v.vib * t + v.vp));
      const dt = fr / SR;
      v.ph += dt; if (v.ph >= 1) v.ph -= 1;
      const s = 2 * v.ph - 1 - blep(v.ph, dt);
      l += s * (1 - v.pan) * 0.5; r += s * (1 + v.pan) * 0.5;
    }
    let env = Math.min(1, t / att);
    if (i > hold) env *= Math.exp(-(i - hold) / (SR * rel * 0.35));
    if (o.env) env *= o.env(t0 + t);
    if (o.trem) env *= 0.65 + 0.35 * Math.sin(TAU * o.trem * t);
    const g = env * vol / Math.sqrt(voices.length);
    const idx = i0 + i;
    if (idx >= N) break;
    const L = lpL.p(l) * g, R = lpR.p(r) * g;
    MUS.L[idx] += L; MUS.R[idx] += R;
    SEND.L[idx] += L * (o.send ?? 0.5); SEND.R[idx] += R * (o.send ?? 0.5);
  }
}
// choir: saws through vowel formants
function choir(t0, t1, notes, o = {}) {
  const vowel = o.vowel === 'a' ? [[730, 1], [1090, 0.5], [2440, 0.25]] : [[320, 1], [800, 0.35], [2300, 0.12]];
  const i0 = Math.floor(t0 * SR), att = o.att ?? 1.2, rel = o.rel ?? 1.5, hold = (t1 - t0) * SR;
  const len = Math.floor((t1 - t0 + rel) * SR);
  const voices = [];
  for (const m of notes) for (let d = 0; d < 5; d++) voices.push({ f: mtof(m) * Math.pow(2, ((d - 2) * 7) / 1200), ph: rnd(), vib: 5 + rnd(), vp: rnd() * TAU });
  const fL = vowel.map(([f]) => new Biquad('bp', f, 6)), fR = vowel.map(([f]) => new Biquad('bp', f, 6));
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    let l = 0, r = 0;
    voices.forEach((v, k) => {
      const fr = v.f * (1 + 0.006 * Math.sin(TAU * v.vib * t + v.vp));
      const dt = fr / SR;
      v.ph += dt; if (v.ph >= 1) v.ph -= 1;
      const s = 2 * v.ph - 1 - blep(v.ph, dt);
      if (k % 2) l += s; else r += s;
    });
    let L = 0, R = 0;
    for (let k = 0; k < vowel.length; k++) { L += fL[k].p(l) * vowel[k][1]; R += fR[k].p(r) * vowel[k][1]; }
    let env = Math.min(1, t / att);
    if (i > hold) env *= Math.exp(-(i - hold) / (SR * rel * 0.35));
    const g = env * (o.vol ?? 0.2) / Math.sqrt(voices.length) * 2.2;
    const idx = i0 + i;
    if (idx >= N) break;
    MUS.L[idx] += L * g; MUS.R[idx] += R * g;
    SEND.L[idx] += L * g * 0.8; SEND.R[idx] += R * g * 0.8;
  }
}
function brass(t0, dur, notes, vol = 0.18) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((dur + 0.6) * SR);
  const vs = notes.flatMap((m) => [0, 1, 2].map((d) => ({ f: mtof(m) * (1 + (d - 1) * 0.003), ph: rnd() })));
  const lp = new Biquad('lp', 400, 1.2);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if (i % 32 === 0) lp.set('lp', 300 + 2600 * Math.exp(-t * 4) * Math.min(1, t * 30) + 500, 1.2);
    let s = 0;
    for (const v of vs) { const dt = v.f / SR; v.ph += dt; if (v.ph >= 1) v.ph -= 1; s += 2 * v.ph - 1 - blep(v.ph, dt); }
    let env = Math.min(1, t / 0.02) * (t > dur ? Math.exp(-(t - dur) * 8) : 1);
    put(MUS, i0 + i, lp.p(s) * env * vol / Math.sqrt(vs.length), 0, 0.5);
  }
}
function boom(t0, vol = 0.8, f0 = 70, f1 = 28, dec = 1.6, buses = MUS) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dec * 2.5 * SR);
  let ph = 0;
  const lp = new Biquad('lp', 300, 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = f1 + (f0 - f1) * Math.exp(-t * 5);
    ph += TAU * f / SR;
    const v = Math.tanh(Math.sin(ph) * 1.6) * Math.exp(-t / dec * 1.2) + lp.p(white()) * Math.exp(-t * 12) * 0.8;
    put(buses, i0 + i, v * vol, 0, 0.3);
  }
}
function taiko(t0, vol = 0.6, pan = 0) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.9 * SR);
  let ph = 0;
  const lp = new Biquad('lp', 500, 0.7), bp = new Biquad('bp', 1800, 1.5);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += TAU * (52 + 60 * Math.exp(-t * 18)) / SR;
    const v = Math.sin(ph) * Math.exp(-t * 6) + lp.p(white()) * Math.exp(-t * 20) * 0.9 + bp.p(white()) * Math.exp(-t * 60) * 0.5;
    put(MUS, i0 + i, v * vol, pan, 0.35);
  }
}
function kick(t0, vol = 0.5) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.4 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * (45 + 90 * Math.exp(-t * 30)) / SR; put(MUS, i0 + i, Math.sin(ph) * Math.exp(-t * 9) * vol, 0, 0.1); }
}
function clapHit(t0, vol = 0.35) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.5 * SR);
  const bp = new Biquad('bp', 1500, 0.9);
  let ph = 0;
  for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * 180 / SR; const v = bp.p(white()) * Math.exp(-t * 14) * 1.6 + Math.sin(ph) * Math.exp(-t * 25) * 0.4; put(MUS, i0 + i, v * vol, 0, 0.5); }
}
function tick(t0, hi, vol = 0.15) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.03 * SR), bp = new Biquad('bp', hi ? 3200 : 2200, 4);
  for (let i = 0; i < len; i++) put(MUS, i0 + i, bp.p(white()) * Math.exp(-i / (SR * 0.004)) * vol * 3, hi ? 0.3 : -0.3, 0.2);
}
function riser(t0, t1, vol = 0.2, buses = MUS) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((t1 - t0) * SR), bp = new Biquad('bp', 400, 2);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if (i % 64 === 0) bp.set('bp', 300 + 5000 * u * u, 2);
    put(buses, i0 + i, bp.p(white()) * u * u * vol * 2, Math.sin(u * 9) * 0.4, 0.5);
  }
}
function chime(t0, m, vol = 0.25, pan = 0) {
  const f = mtof(m), i0 = Math.floor(t0 * SR), len = Math.floor(3 * SR);
  const rat = [1, 2.76, 5.4, 8.93], am = [1, 0.5, 0.25, 0.12];
  for (let i = 0; i < len; i++) { const t = i / SR; let v = 0; for (let k = 0; k < 4; k++) v += am[k] * Math.sin(TAU * f * rat[k] * t) * Math.exp(-t * (1.2 + k)); put(MUS, i0 + i, v * vol * 0.4 * Math.min(1, t * 300), pan, 0.7); }
}

// ---------------------------------------------------------------- SFX generators
function noiseBed(t0, t1, o) {
  // continuous filtered noise with intensity envelope fn(t) and lowpass fn(t)
  const i0 = Math.floor(t0 * SR), i1 = Math.floor(t1 * SR);
  const hp = new Biquad('hp', o.hp ?? 300, 0.7), lpL = new Biquad('lp', 6000, 0.7), lpR = new Biquad('lp', 6000, 0.7);
  let bL = 0, bR = 0;
  for (let i = i0; i < Math.min(i1, N); i++) {
    const t = i / SR;
    if ((i - i0) % 128 === 0) { const f = o.lp(t); lpL.set('lp', f, 0.7); lpR.set('lp', f, 0.7); }
    const g = o.amp(t);
    if (g <= 0.0001) { hp.p(0); continue; }
    let nl = white(), nr = white();
    if (o.brown) { bL = (bL + nl * 0.02) * 0.995; bR = (bR + nr * 0.02) * 0.995; nl = bL * 6; nr = bR * 6; }
    else { nl = hp.p(nl); }
    let L = lpL.p(nl) * g, R = lpR.p(o.brown ? nr : nl * 0.6 + white() * 0.4) * g;
    if (o.drops && rnd() < o.drops(t) / SR * 400) { const d = (rnd() * 2 - 1) * g * 3; L += d; R += d * 0.6; }
    SFX.L[i] += L; SFX.R[i] += R;
    SEND.L[i] += L * (o.send ?? 0.15); SEND.R[i] += R * (o.send ?? 0.15);
  }
}
function thunder(t0, vol = 0.8, far = false, slow = 1) {
  const i0 = Math.floor(t0 * SR), len = Math.floor((far ? 4 : 5.5) * SR * slow);
  const lp = new Biquad('lp', far ? 180 : 420, 0.7), lp2 = new Biquad('lp', 90, 0.7), hp = new Biquad('hp', 1200, 0.7);
  let b = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR / slow;
    b = (b + white() * 0.03) * 0.997;
    const crack = far ? 0 : hp.p(white()) * Math.exp(-t * 14) * (0.6 + 0.4 * (rnd() < 0.3 ? 1 : 0)) * 1.4;
    const rumbleEnv = Math.min(1, t * (far ? 2 : 8)) * Math.exp(-t * (far ? 0.9 : 0.75)) * (0.7 + 0.3 * Math.sin(t * 7 + Math.sin(t * 2.3) * 3));
    const v = crack + lp.p(b * 9) * rumbleEnv * 1.3 + lp2.p(white()) * rumbleEnv * 0.9;
    put(SFX, i0 + i, v * vol, (rnd() - 0.5) * 0.2, 0.35);
  }
}
function splashS(t0, vol = 0.5, size = 1, pan = 0, slow = 1) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(SR * (0.5 + size * 0.7) * slow);
  const bp = new Biquad('bp', 1200, 0.8), lp = new Biquad('lp', 700 * (1 / size), 0.7);
  for (let i = 0; i < len; i++) {
    const t = i / SR / slow;
    if (i % 64 === 0) bp.set('bp', (2500 - 1600 * Math.min(1, t * 3)) / slow, 0.8);
    const env = Math.min(1, t * 200) * Math.exp(-t * (5 / size));
    let v = bp.p(white()) * env + lp.p(white()) * env * 0.8 * size;
    if (rnd() < 0.002 / slow) v += (rnd() - 0.5) * 0.8 * env;
    put(SFX, i0 + i, v * vol, pan, 0.25);
  }
}
function woodKnock(t0, vol = 0.5, f = 180, pan = 0) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.4 * SR);
  const bp = new Biquad('bp', f * 3, 6);
  for (let i = 0; i < len; i++) { const t = i / SR; const v = Math.sin(TAU * f * t) * Math.exp(-t * 25) + bp.p(white()) * Math.exp(-t * 40) * 2; put(SFX, i0 + i, v * vol, pan, 0.2); }
}
function creak(t0, dur, vol = 0.3, f0 = 60, pan = 0, high = 1) {
  // stick-slip pulses through resonances
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const r1 = new Biquad('bp', 600 * high, 8), r2 = new Biquad('bp', 1400 * high, 10);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const f = f0 * (1 + 0.6 * Math.sin(u * 7) + 0.3 * Math.sin(u * 23));
    ph += f / SR;
    let x = 0;
    if (ph >= 1) { ph -= 1; x = 1; }
    const env = Math.sin(Math.PI * u);
    const v = (r1.p(x) * 4 + r2.p(x) * 3) * env;
    put(SFX, i0 + i, v * vol, pan, 0.3);
  }
}
function crunch(t0, dur, vol = 0.25, f = 3000, pan = 0) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR), bp = new Biquad('bp', f, 1.2);
  let g = 0;
  for (let i = 0; i < len; i++) { if (rnd() < 0.004) g = 1; g *= 0.996; put(SFX, i0 + i, bp.p(white()) * g * vol * 2, pan, 0.15); }
}
function tear(t0, dur, vol = 0.3) { crunch(t0, dur, vol, 1500); crunch(t0, dur, vol * 0.6, 600, 0.2); }
function whoosh(t0, dur, vol = 0.3, up = true, pan = 0) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR), bp = new Biquad('bp', 500, 1.2);
  for (let i = 0; i < len; i++) {
    const u = i / len;
    if (i % 64 === 0) bp.set('bp', up ? 300 + 3500 * u * u : 3800 - 3400 * u, 1.2);
    put(SFX, i0 + i, bp.p(white()) * Math.sin(Math.PI * u) ** 2 * vol * 2.2, pan + (u - 0.5) * 0.8, 0.3);
  }
}
function heartbeat(t0, vol = 0.5) {
  for (const [dt, f, a] of [[0, 52, 1], [0.27, 60, 0.7]]) {
    const i0 = Math.floor((t0 + dt) * SR), len = Math.floor(0.25 * SR);
    let ph = 0;
    for (let i = 0; i < len; i++) { const t = i / SR; ph += TAU * f * (1 + Math.exp(-t * 30)) / SR; put(SFX, i0 + i, Math.sin(ph) * Math.exp(-t * 16) * Math.min(1, t * 400) * vol * a, 0, 0.05); }
  }
}
// cat vocalisation: pitch contour + vowel morph i -> a -> u
function meow(t0, o = {}) {
  const dur = o.dur ?? 0.6, base = o.f ?? 750, vol = o.vol ?? 0.35, pan = o.pan ?? 0;
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const F = [new Biquad('bp', 400, 5), new Biquad('bp', 2000, 6), new Biquad('bp', 3000, 7)];
  const mf = o.muffle ? new Biquad('lp', o.muffle, 0.7) : null;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const u = i / len;
    const contour = o.contour ? o.contour(u) : (u < 0.35 ? lerp(0.9, 1.35, u / 0.35) : lerp(1.35, 0.85, (u - 0.35) / 0.65));
    const f = base * contour * (1 + 0.02 * Math.sin(TAU * 7 * u * dur) * (o.vib ?? 1));
    ph += f / SR; if (ph >= 1) ph -= 1;
    const src = (2 * ph - 1 - blep(ph, f / SR)) * 0.6 + white() * (o.breath ?? 0.12);
    if (i % 64 === 0) {
      const v1 = u < 0.4 ? lerp(380, 850, u / 0.4) : lerp(850, 420, (u - 0.4) / 0.6);
      const v2 = u < 0.4 ? lerp(2300, 1300, u / 0.4) : lerp(1300, 850, (u - 0.4) / 0.6);
      F[0].set('bp', v1 * (o.formant ?? 1), 5); F[1].set('bp', v2 * (o.formant ?? 1), 6); F[2].set('bp', 3000 * (o.formant ?? 1), 7);
    }
    let v = F[0].p(src) * 1.0 + F[1].p(src) * 0.6 + F[2].p(src) * 0.25;
    const env = Math.min(1, u / 0.08) * Math.min(1, (1 - u) / 0.2);
    v *= env * 3;
    if (mf) v = mf.p(v);
    put(SFX, i0 + i, v * vol, pan, 0.3);
  }
}
const pipMeow = (t, o = {}) => meow(t, Object.assign({ f: 820, dur: 0.55, vol: 0.32, formant: 1.15 }, o));
const mamaMeow = (t, o = {}) => meow(t, Object.assign({ f: 470, dur: 0.75, vol: 0.32 }, o));
const snowMeow = (t, o = {}) => meow(t, Object.assign({ f: 640, dur: 0.8, vol: 0.3, formant: 1.05, vib: 3 }, o));
const sibMeow = (t, o = {}) => meow(t, Object.assign({ f: 1000, dur: 0.35, vol: 0.25, formant: 1.25 }, o));
function cough(t0, vol = 0.3) {
  for (const dt of [0, 0.16]) {
    const i0 = Math.floor((t0 + dt) * SR), len = Math.floor(0.12 * SR), bp = new Biquad('bp', 900, 1.5);
    for (let i = 0; i < len; i++) put(SFX, i0 + i, bp.p(white()) * Math.exp(-i / (SR * 0.03)) * vol * 2.5, 0.1, 0.2);
  }
}
function growl(t0, dur, vol = 0.25) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR), bp = new Biquad('bp', 500, 2);
  let ph = 0;
  for (let i = 0; i < len; i++) { const u = i / len; ph += (95 + 10 * Math.sin(u * 30)) / SR; const p = ph % 1 < 0.15 ? 1 : 0; put(SFX, i0 + i, bp.p(p + white() * 0.3) * Math.sin(Math.PI * u) * vol * 3, 0, 0.2); }
}
function purr(t0, dur, vol = 0.2) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR), lp = new Biquad('lp', 400, 0.8);
  for (let i = 0; i < len; i++) { const t = i / SR; const am = 0.5 + 0.5 * Math.sin(TAU * 26 * t); put(SFX, i0 + i, lp.p(white()) * am * Math.sin(Math.PI * i / len) * vol * 3, 0, 0.1); }
}
function bubblesS(t0, dur, rate = 8, vol = 0.2, slow = 1) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(dur * SR);
  const evs = [];
  for (let k = 0; k < dur * rate; k++) evs.push({ s: Math.floor(rnd() * len), f: (300 + rnd() * 900) / slow, d: (0.03 + rnd() * 0.05) * slow });
  for (const e of evs) {
    const l = Math.floor(e.d * SR);
    let ph = 0;
    for (let i = 0; i < l; i++) { const u = i / l; ph += TAU * e.f * (1 + u * 1.5) / SR; put(SFX, i0 + e.s + i, Math.sin(ph) * Math.sin(Math.PI * u) * vol, (rnd() - 0.5) * 0.4, 0.4); }
  }
}
function birds(t0, t1, vol = 0.12) {
  for (let t = t0; t < t1; t += 0.35 + rnd() * 1.1) {
    const n = 2 + Math.floor(rnd() * 4), f0 = 2800 + rnd() * 1800, pan = (rnd() * 2 - 1) * 0.7;
    for (let k = 0; k < n; k++) {
      const st = t + k * 0.09, i0 = Math.floor(st * SR), len = Math.floor(0.07 * SR);
      let ph = 0;
      for (let i = 0; i < len; i++) { const u = i / len; ph += TAU * f0 * (1 + 0.25 * Math.sin(u * Math.PI * 3) - 0.2 * u) / SR; put(SFX, i0 + i, Math.sin(ph) * Math.sin(Math.PI * u) * vol, pan, 0.4); }
    }
  }
}
function clink(t0, vol = 0.25) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(1.2 * SR), fs = [2650, 4120, 5900, 7300];
  for (let i = 0; i < len; i++) { const t = i / SR; let v = 0; fs.forEach((f, k) => (v += Math.sin(TAU * f * t) * Math.exp(-t * (3 + k * 2)) / (k + 1))); put(SFX, i0 + i, v * vol * 0.6 * Math.min(1, t * 2000), 0.3, 0.6); }
}
function click(t0, vol = 0.35) {
  const i0 = Math.floor(t0 * SR), len = Math.floor(0.03 * SR), bp = new Biquad('bp', 2500, 2);
  for (let i = 0; i < len; i++) put(SFX, i0 + i, (bp.p(white()) * 2 + (i < 40 ? 0.8 : 0)) * Math.exp(-i / (SR * 0.004)) * vol, 0.2, 0.2);
}
function scratchGlass(t0, dur, vol = 0.2) {
  for (let t = t0; t < t0 + dur; t += 0.12 + rnd() * 0.1) {
    const i0 = Math.floor(t * SR), len = Math.floor(0.07 * SR), bp = new Biquad('bp', 3500 + rnd() * 1500, 8);
    for (let i = 0; i < len; i++) put(SFX, i0 + i, bp.p(white()) * Math.sin(Math.PI * i / len) * vol * 4, 0.1, 0.3);
  }
}
function crackle(t0, t1, vol = 0.15, rate = 12) { // fireplace / stones
  for (let t = t0; t < t1; t += rnd() * 2 / rate) {
    const i0 = Math.floor(t * SR), len = Math.floor((0.004 + rnd() * 0.01) * SR), hp = new Biquad('hp', 800 + rnd() * 2000, 0.7);
    const a = vol * (0.3 + rnd());
    for (let i = 0; i < len; i++) put(SFX, i0 + i, hp.p(white()) * a * Math.exp(-i / (len * 0.3)), (rnd() - 0.5) * 0.5, 0.3);
  }
}
function stoneCrack(t0, vol = 0.5, slow = 1) {
  crackle(t0, t0 + 0.25 * slow, vol * 0.6, 60 / slow);
  boom(t0, vol * 0.5, 90 / slow, 40 / slow, 0.5 * slow, SFX);
}
function steps(t0, t1, every = 0.2, vol = 0.12) { for (let t = t0; t < t1; t += every * (0.9 + rnd() * 0.2)) splashS(t, vol, 0.25, (rnd() - 0.5) * 0.3); }
function alarm(t0, t1, vol = 0.05) {
  const i0 = Math.floor(t0 * SR), i1 = Math.floor(t1 * SR), lp = new Biquad('lp', 500, 0.7);
  let ph = 0;
  for (let i = i0; i < i1; i++) { const t = i / SR; const f = (t % 0.7) < 0.35 ? 650 : 800; ph += f / SR; put(SFX, i, lp.p((ph % 1) < 0.5 ? 1 : -1) * vol, -0.4, 0.2); }
}

// ---------------------------------------------------------------- SCORE
const F_ = [53, 57, 60], C_ = [48, 52, 55], Dm = [50, 53, 57], Bb = [46, 50, 53], Gm = [43, 46, 50], A_ = [45, 49, 52];
const up = (ch, o) => ch.map((m) => m + o);
// theme (major): [midi, beats]
const THEME_MAJ = [
  [[72, 1], [69, 0.5], [72, 0.5], [77, 1.5], [76, 0.5]],
  [[74, 1], [72, 1], [67, 2]],
  [[69, 1], [74, 0.5], [76, 0.5], [77, 1], [76, 1]],
  [[74, 1.5], [72, 0.5], [74, 2]],
];
const THEME_MIN = [
  [[69, 1], [65, 1], [74, 2]],
  [[74, 1], [72, 0.5], [70, 0.5], [69, 2]],
  [[67, 1], [70, 1], [74, 1], [72, 1]],
  [[73, 1.5], [76, 0.5], [69, 2]],
];
function melody(t0, bars, beat, vel = 0.55, oct = 0, which = [0, 1, 2, 3]) {
  which.forEach((b, k) => {
    let t = t0 + k * 4 * beat;
    for (const [m, d] of bars[b]) { piano(t, m + oct, d * beat * 0.95, vel, 0.15); t += d * beat; }
  });
}
function arpBar(t0, chord, beat, vel = 0.3) {
  const pat = [0, 1, 2, 1, 0 + 12, 1, 2, 1];
  pat.forEach((k, i) => piano(t0 + i * beat / 2, (k >= 12 ? chord[0] + 12 : chord[k]) + 12, beat * 0.5, vel * (i === 0 ? 1.2 : 1), -0.2));
}

console.log('music…');
// HOOK 0–3
boom(0.0, 0.9); taiko(0.0, 0.7); strings(0.0, 2.9, [38, 50, 57, 62, 63], { att: 0.05, rel: 0.5, vol: 0.16, bright: 3000, trem: 13 });
riser(1.6, 3.0, 0.15); brass(1.5, 0.5, [50, 57, 62], 0.2); taiko(1.55, 0.8);
// S1 3–13: warm major theme, 80 BPM
{
  const b = 0.75, t0 = 3.55;
  chime(3.5, 86, 0.25); chime(3.62, 93, 0.18, 0.3);
  const chords = [F_, C_, Dm, Bb];
  for (let k = 0; k < 4; k++) {
    const tb = t0 + k * 4 * b;
    if (tb > 13) break;
    arpBar(tb, chords[k], b, 0.28);
    pluck(tb, chords[k][0] - 12, 0.6, -0.1); pluck(tb + 2 * b, chords[k][0] - 12, 0.5, -0.1);
    for (let q = 0; q < 4; q++) if (tb + q * b < 13) pluck(tb + q * b + b / 2, chords[k][2], 0.25, 0.3);
  }
  melody(t0 + 4 * b * 1, THEME_MAJ, b, 0.5, 0, [0, 1]);
  strings(6.5, 13.2, up(F_, 12), { att: 2, rel: 1.2, vol: 0.05, bright: 1800 });
}
// S2 13–25: minor, cello drone
{
  const b = 0.75, t0 = 13.0;
  const chords = [Dm, Bb, Gm, A_];
  for (let k = 0; k < 4; k++) {
    const tb = t0 + k * 3;
    chords[k].forEach((m, i) => piano(tb + i * 0.12, m + 12, 2.6, 0.32, -0.2));
    strings(tb, tb + 3, [chords[k][0] - 12, chords[k][0]], { att: 1.0, rel: 1.0, vol: 0.09 + k * 0.02, bright: 900 });
  }
  melody(t0 + 0.0, THEME_MIN, b, 0.42, 0, [0, 1, 2]);
  riser(23.3, 25.0, 0.18);
}
// S3 25–37: taiko + ostinato, 90 BPM
{
  const b = 0.6667, t0 = 25.0;
  const ost = [38, 38, 50, 38, 41, 38, 45, 38];
  for (let i = 0; t0 + i * b / 2 < 36.9; i++) {
    const t = t0 + i * b / 2;
    const tr = t < 30.3 ? 0 : t < 33 ? -4 : -5;
    strings(t, t + b * 0.4, [ost[i % 8] + tr], { att: 0.01, rel: 0.12, vol: 0.12, bright: 1400, voices: 3, send: 0.2 });
  }
  for (let i = 0; t0 + i * b < 36.9; i++) {
    const t = t0 + i * b, beat = i % 4;
    if (beat === 0 || beat === 2) taiko(t, 0.55);
    if (beat === 3) { taiko(t, 0.35, -0.3); taiko(t + b / 2, 0.35, 0.3); }
  }
  strings(25, 30.3, up(Dm, 12), { att: 2, rel: 0.6, vol: 0.08, bright: 1600 });
  strings(30.3, 33, up(Bb, 12), { att: 0.5, rel: 0.6, vol: 0.09, bright: 1800 });
  strings(33, 36.9, up(A_, 12), { att: 0.5, rel: 0.3, vol: 0.1, bright: 2200, trem: 12 });
  boom(33.5, 0.6); brass(33.5, 1.2, [45, 52, 57], 0.18);
}
// S4 37–49: silence, then a sad low chord under the title
strings(47.3, 49.2, [38, 45, 62], { att: 0.4, rel: 1.0, vol: 0.07, bright: 900 });
piano(47.35, 38, 2, 0.4); piano(47.35, 50, 2, 0.35);
// S5 49–61: building ostinato, 110 BPM, ticking
{
  const b = 60 / 110, t0 = 49.0;
  const prog = [[49, Dm], [53.4, Bb], [57.8, C_], [60.0, A_]];
  for (let i = 0; t0 + i * b / 2 < 63.9; i++) {
    const t = t0 + i * b / 2;
    let ch = prog[0][1]; for (const [ts, c] of prog) if (t >= ts) ch = c;
    if (t >= 61) ch = Dm;
    const note = ch[[0, 2, 1, 2][i % 4]] + 12;
    const br = 900 + 2600 * clamp((t - 49) / 14, 0, 1);
    strings(t, t + b * 0.3, [note], { att: 0.01, rel: 0.1, vol: 0.1, bright: br, voices: 3, send: 0.25 });
    if (i % 2 === 0) tick(t, (i / 2) % 2 === 0, 0.12);
    if (t > 52 && i % 4 === 0) kick(t, 0.35);
  }
  strings(55, 63.9, [62, 69], { att: 4, rel: 0.05, vol: 0.06, bright: 2200 });
  riser(59.2, 61.0, 0.18);
  melody(61.0, THEME_MIN, 60 / 110, 0.4, 12, [0]);
}
// S6 64–73: silence, single notes
piano(68.5, 50, 3, 0.45); piano(70.8, 57, 2.5, 0.3);
// S7 73–85: choir + major theme, crescendo
{
  const b = 0.75, t0 = 73.0;
  const chords = [F_, C_, Dm, Bb];
  for (let k = 0; k < 4; k++) {
    const tb = t0 + k * 3;
    choir(tb, tb + 3, up(chords[k], 12), { vol: 0.12 + k * 0.04, att: 1.0, rel: 1.0 });
    strings(tb, tb + 3, [chords[k][0] - 12, ...up(chords[k], 12)], { att: 0.8, rel: 0.9, vol: 0.05 + k * 0.03, bright: 1500 + k * 600 });
    arpBar(tb, chords[k], b, 0.22 + k * 0.04);
  }
  melody(t0 + 3, THEME_MAJ, b, 0.55, 0, [1, 2, 3]);
  for (let i = 0; i < 24; i++) taiko(83.5 + i * 0.0625, 0.12 + i * 0.012, (i % 2 ? 0.2 : -0.2));
  riser(83, 85, 0.2);
}
// S8 85–97: epic hybrid, 120 BPM
{
  const b = 0.5, t0 = 85.0;
  const prog = [Dm, Bb, F_, C_, Dm, A_];
  for (let bar = 0; bar < 6; bar++) {
    const tb = t0 + bar * 4 * b, ch = prog[bar];
    brass(tb, 0.9, up(ch, 12), 0.16);
    strings(tb, tb + 2, [ch[0] - 12, ch[0]], { att: 0.05, rel: 0.2, vol: 0.12, bright: 1200 });
    for (let s = 0; s < 16; s++) strings(tb + s * b / 4, tb + s * b / 4 + 0.08, [ch[[0, 1, 2, 1][s % 4]] + 24], { att: 0.005, rel: 0.06, vol: 0.06, bright: 3500, voices: 2, send: 0.2 });
    for (let q = 0; q < 4; q++) {
      kick(tb + q * b, 0.45);
      if (q === 0 || q === 2) taiko(tb + q * b, 0.45);
      if (q === 1 || q === 3) clapHit(tb + q * b, 0.3);
    }
    if (bar % 2 === 1) for (let k = 0; k < 4; k++) taiko(tb + 3 * b + k * b / 4, 0.25 + k * 0.05, k % 2 ? 0.4 : -0.4);
  }
  choir(93, 97, up(Dm, 12), { vol: 0.18, vowel: 'a', att: 2.5 });
  riser(95.4, 97.0, 0.2);
}
// S9 97–109: callback hit, landings, tension
{
  boom(97.0, 0.85); taiko(97.0, 0.6); brass(97.0, 0.8, [50, 57, 62], 0.2);
  strings(97, 104, up(Dm, 12), { att: 0.3, rel: 0.5, vol: 0.09, bright: 1800 });
  strings(97, 109, [38], { att: 0.3, rel: 0.5, vol: 0.1, bright: 600 });
  for (const t of [100.2, 101.7, 103.2]) { boom(t, 0.45, 80, 35, 0.6); brass(t, 0.25, [57, 62, 65], 0.15); }
  for (let t = 97.5; t < 109; t += 1.0) kick(t, 0.25);
  strings(104, 106.5, up(Bb, 12), { att: 0.3, rel: 0.3, vol: 0.1, bright: 2000, trem: 12 });
  strings(106.5, 109, up(A_, 12), { att: 0.3, rel: 0.2, vol: 0.12, bright: 2600, trem: 14 });
}
// S10 109–121: single high note, then explosion at 119
{
  strings(109.3, 119, [81], { att: 2.5, rel: 0.05, vol: 0.13, bright: 4000, trem: 9, env: (t) => 0.4 + 0.6 * clamp((t - 109) / 10, 0, 1) });
  strings(110, 119, [26], { att: 2, rel: 0.1, vol: 0.08, bright: 300 });
  riser(117.2, 119.0, 0.25);
  boom(119.0, 1.0); taiko(119.0, 0.8); brass(119.0, 1.2, [50, 57, 62, 65], 0.24);
  choir(119.0, 121.2, up(Dm, 12), { vol: 0.25, vowel: 'a', att: 0.2 });
  strings(119, 121.2, [38, ...up(Dm, 12), 74], { att: 0.1, rel: 0.4, vol: 0.14, bright: 3200 });
  for (let q = 0; q < 4; q++) { kick(119 + q * 0.5, 0.45); if (q % 2) clapHit(119 + q * 0.5, 0.3); }
}
// S11 121–132: climax, slow-motion, resolution hit
{
  const b = 0.5;
  const prog = [[121, Bb], [123, F_]];
  for (const [t0, ch] of prog) {
    choir(t0, t0 + 2, up(ch, 12), { vol: 0.24, vowel: 'a', att: 0.3, rel: 0.6 });
    strings(t0, t0 + 2, [ch[0] - 12, ...up(ch, 12)], { att: 0.1, rel: 0.4, vol: 0.13, bright: 3000 });
    brass(t0, 0.8, up(ch, 12), 0.18);
    for (let q = 0; q < 4; q++) { kick(t0 + q * b, 0.45); if (q === 0 || q === 2) taiko(t0 + q * b, 0.45); if (q % 2) clapHit(t0 + q * b, 0.3); }
  }
  // slow motion 124–129: half-time huge chord
  choir(124, 129, up(Bb, 12), { vol: 0.26, vowel: 'a', att: 0.8, rel: 0.5 });
  strings(124, 129, [34, 46, ...up(Bb, 12), 74], { att: 0.6, rel: 0.4, vol: 0.13, bright: 1400 });
  for (const t of [124.0, 125.6, 127.2]) boom(t, 0.55, 50, 22, 1.8);
  riser(127.6, 129.0, 0.3);
  // 129: resolution — F major peak
  boom(129.0, 1.0); taiko(129.0, 0.9); brass(129.0, 1.5, [53, 60, 65, 69], 0.26);
  choir(129.0, 131.5, [65, 69, 72, 77], { vol: 0.3, vowel: 'a', att: 0.15, rel: 2.0 });
  strings(129.0, 131.5, [41, 53, 65, 69, 72, 77], { att: 0.1, rel: 2.2, vol: 0.15, bright: 3500 });
  chime(129.05, 89, 0.22);
}
// S12 132–150: warm resolution, pause, question
{
  const b = 0.75, t0 = 132.2;
  const chords = [F_, C_, Dm, Bb];
  for (let k = 0; k < 4; k++) {
    const tb = t0 + k * 3;
    arpBar(tb, chords[k], b, 0.24);
    strings(tb, tb + 3, up(chords[k], 12), { att: 1.0, rel: 1.0, vol: 0.05, bright: 1500 });
  }
  melody(t0, THEME_MAJ, b, 0.48, 0, [0, 1, 2, 3]);
  strings(144.2, 146.6, [48, 55, 60, 65], { att: 0.6, rel: 1.4, vol: 0.06, bright: 1400 }); // Csus
  piano(144.2, 60, 2.2, 0.3); piano(144.2, 65, 2.2, 0.3);
  piano(147.2, 72, 2.5, 0.38); chime(147.25, 84, 0.12);
  chime(149.5, 93, 0.16);
}

console.log('sfx…');
// rain bed intensity / tone per section
const rainAmp = (t) => {
  const segs = [[0, 0.7], [2.95, 0.7], [3.05, 0], [14.5, 0], [18, 0.12], [25, 0.25], [25.2, 0.7], [37, 0.7], [44.9, 0.6], [45.1, 0.28], [49, 0.28], [49.1, 0.55], [61, 0.6], [64, 0.7], [64.2, 0.18], [68, 0.18], [68.2, 0.55], [73, 0.4], [76, 0.25], [81, 0.25], [81.2, 0.6], [85, 0.7], [97, 0.7], [121, 0.75], [124, 0.75], [124.1, 0.3], [129, 0.3], [129.1, 0.75], [131.8, 0.7], [132.1, 0], [151, 0]];
  for (let i = 1; i < segs.length; i++) if (t <= segs[i][0]) { const [a, va] = segs[i - 1], [b, vb] = segs[i]; return lerp(va, vb, (t - a) / (b - a)) * 0.22; }
  return 0;
};
const rainLP = (t) => ((t > 45 && t < 49) || (t > 64.1 && t < 68) || (t > 76 && t < 81) || (t > 124 && t < 129) ? 700 : 7000);
noiseBed(0, 150.4, { amp: rainAmp, lp: rainLP, hp: 400, drops: (t) => (rainAmp(t) > 0.02 ? 40 : 0), send: 0.12 });
// river / flood roar
const roarAmp = (t) => {
  if (t < 3) return 0.35;
  if (t < 13) return 0.05;
  if (t < 25) return 0.05 + (t - 13) / 12 * 0.1;
  if (t < 37) return 0.15 + Math.min(1, (t - 25) / 4) * 0.3;
  if (t < 61) return 0.03;
  if (t < 64) return 0.25;
  if (t < 73) return 0.08;
  if (t < 85) return 0.15;
  if (t < 124) return 0.38;
  if (t < 129) return 0.2;
  if (t < 132) return 0.4;
  return 0.04;
};
noiseBed(0, 150.4, { amp: (t) => roarAmp(t) * 0.3, lp: (t) => (t > 124 && t < 129 ? 250 : 900), brown: true, send: 0.1 });
// thunder
for (const t of [0.05, 32.5, 33.5, 44.2, 58.2, 64.0, 80.0, 82.6, 95.4, 104.8, 122.0]) thunder(t, t === 0.05 ? 0.55 : 0.38);
thunder(126.5, 0.35, false, 2.5);
thunder(20.2, 0.35, true);
// hook
pipMeow(0.85, { f: 900, dur: 0.75, vol: 0.4, contour: (u) => (u < 0.3 ? lerp(1, 1.5, u / 0.3) : lerp(1.5, 1.0, (u - 0.3) / 0.7)), vib: 2 });
splashS(1.55, 0.7, 2.2); whoosh(1.3, 0.5, 0.3);
heartbeat(0.3, 0.35); heartbeat(1.15, 0.4); heartbeat(1.95, 0.45);
// S1
whoosh(2.95, 0.65, 0.35, false);
birds(4, 13, 0.08);
whoosh(11.15, 0.3, 0.12); splashS(11.8, 0.3, 0.6); pipMeow(11.85, { f: 950, dur: 0.3, vol: 0.28 });
sibMeow(12.0, { pan: 0.3 }); sibMeow(12.35, { f: 1100, pan: 0.4 });
purr(12.2, 0.8, 0.12);
// S2
splashS(14.0, 0.18, 0.15); chime(14.0, 96, 0.06);
cough(16.4, 0.28); cough(17.9, 0.3);
whoosh(16, 3, 0.08); whoosh(19.5, 3, 0.1);
pipMeow(21.5, { f: 760, dur: 0.6, vol: 0.22, contour: (u) => lerp(1.1, 0.8, u) });
// S3
steps(25.0, 27.2, 0.18, 0.14);
for (let k = 0; k < 4; k++) sibMeow(26.6 + k * 0.35, { f: 1050 + k * 60, pan: 0.4, vol: 0.2 });
whoosh(27.2, 0.5, 0.15); woodKnock(28.1, 0.4, 160, 0.3);
whoosh(29.0, 0.45, 0.4, true, -0.3); tear(29.3, 1.2, 0.25); creak(30.5, 1.5, 0.15, 40, 0.3);
creak(34, 2, 0.12, 35, 0.4);
mamaMeow(35.0, { vol: 0.15, pan: 0.2 });
// S4
steps(37.0, 42.0, 0.2, 0.14);
whoosh(41.85, 0.3, 0.15);
scratchGlass(43.6, 1.4, 0.15);
pipMeow(43.9, { f: 800, dur: 0.7, vol: 0.3, contour: (u) => (u < 0.4 ? lerp(1, 1.3, u / 0.4) : lerp(1.3, 0.9, (u - 0.4) / 0.6)) });
crackle(45.0, 47.25, 0.06, 10); clink(45.6, 0.18);
pipMeow(45.3, { f: 800, dur: 0.9, vol: 0.18, muffle: 900 });
whoosh(46.3, 0.3, 0.06);
click(47.2, 0.4);
pipMeow(47.65, { f: 700, dur: 0.8, vol: 0.12, muffle: 800, contour: (u) => lerp(1.05, 0.75, u) });
for (let t = 41.0; t < 49; t += 1.0) heartbeat(t, 0.35);
// S5
whoosh(48.85, 0.25, 0.3, true); crunch(49.6, 1.6, 0.18, 3500);
whoosh(51.4, 0.3, 0.2); crunch(52, 2.2, 0.12, 2500); creak(52.5, 1.0, 0.1, 50, -0.2);
for (let k = 0; k < 6; k++) creak(54.6 + k * 0.6, 0.35, 0.12, 80, 0.2, 1.6);
growl(55.0, 1.3, 0.18); growl(56.8, 1.2, 0.2);
whoosh(58.1, 0.5, 0.1);
// S6
splashS(61.0, 0.4, 1); steps(61.3, 63.8, 0.45, 0.1);
whoosh(63.3, 0.6, 0.25); woodKnock(63.95, 0.8, 110); splashS(64.0, 0.8, 2.5); boom(63.95, 0.6, 80, 30, 0.7, SFX);
boom(64.1, 0.5, 60, 25, 1.4, SFX); bubblesS(64.2, 3.8, 14, 0.18, 2.2);
cough(68.3, 0.25);
for (let t = 69.0; t < 73; t += 1.3) heartbeat(t, 0.3);
// S7
chime(73.5, 91, 0.06);
mamaMeow(74.4, { vol: 0.12, muffle: 1500, pan: 0.3 });
whoosh(76.0, 5, 0.12, true); splashS(76.4, 0.15, 3, 0, 3);
pipMeow(81.4, { f: 760, dur: 0.6, vol: 0.32, contour: (u) => (u < 0.5 ? lerp(0.95, 1.2, u / 0.5) : lerp(1.2, 1.05, (u - 0.5) / 0.5)) });
woodKnock(82.2, 0.35, 200);
// S8
for (let t = 85.2; t < 97; t += 0.5 + rnd() * 0.3) splashS(t, 0.18, 0.5, (rnd() - 0.5) * 0.4);
alarm(85.0, 89.0, 0.04);
whoosh(88.8, 0.6, 0.35, true, 0.4); woodKnock(89.55, 0.6, 120, 0.2); splashS(89.6, 0.4, 1);
creak(90.9, 1.6, 0.18, 70, 0.1, 2.2); whoosh(91.6, 0.6, 0.2);
riser(93, 97, 0.1, SFX);
// S9
thunder(97.0, 0.5);
pipMeow(97.6, { f: 850, dur: 0.6, vol: 0.32 });
for (const [j, k] of [[99.5, 0], [101.0, 1], [102.5, 2]]) { whoosh(j, 0.6, 0.15); woodKnock(j + 0.7, 0.4, 170 + k * 20); splashS(j + 0.7, 0.3, 0.6); sibMeow(j + 0.75, { f: 1000 + k * 80 }); }
mamaMeow(107.0, { vol: 0.2, contour: (u) => lerp(1.0, 0.8, u), breath: 0.25 });
// S10
creak(109.2, 0.6, 0.25, 50, 0.3); crunch(109.3, 0.5, 0.2, 900);
mamaMeow(109.55, { f: 560, dur: 0.6, vol: 0.32, contour: (u) => lerp(1.3, 0.9, u) });
splashS(110.0, 0.7, 2.3);
mamaMeow(111.0, { vol: 0.22, breath: 0.3, muffle: 2500 }); mamaMeow(112.9, { vol: 0.2, breath: 0.3, muffle: 2500 });
bubblesS(110.2, 3.8, 10, 0.12);
woodKnock(112.6, 0.15, 400);
for (let k = 0; k < 4; k++) creak(114.1 + k * 0.5, 0.4, 0.15, 70, 0, 1.5);
growl(116.4, 2.4, 0.22);
crunch(116.2, 2.6, 0.08, 4500);
for (let t = 109.4; t < 119; t += 0.6) heartbeat(t, 0.32);
splashS(119.0, 0.5, 1.5);
// S11
for (let k = 0; k < 6; k++) stoneCrack(121.3 + k * 0.32, 0.4);
noiseBed(121, 124, { amp: (t) => 0.05, lp: () => 200, brown: true });
for (let k = 0; k < 5; k++) splashS(122.2 + k * 0.38, 0.35, 1.2, (k % 2 ? 0.3 : -0.3));
for (let k = 0; k < 4; k++) { stoneCrack(124.4 + k * 1.15, 0.35, 3); splashS(124.9 + k * 1.15, 0.25, 1.5, 0, 3); }
for (let t = 124.0; t < 129; t += 1.6) heartbeat(t, 0.4);
whoosh(128.4, 0.7, 0.4, true);
boom(129.0, 0.8, 70, 25, 2.2, SFX); stoneCrack(129.0, 0.7); splashS(129.4, 0.8, 3);
for (let k = 0; k < 8; k++) splashS(129.6 + k * 0.28, 0.3, 1.4, (rnd() - 0.5) * 0.8);
noiseBed(129, 132, { amp: (t) => 0.08 * (1 - (t - 129) / 3), lp: () => 220, brown: true });
// S12
birds(132.5, 147, 0.09);
noiseBed(132, 150, { amp: (t) => 0.035, lp: () => 600, hp: 150, send: 0.1 });
purr(137.4, 1.8, 0.14);
whoosh(140.0, 0.5, 0.18, true, 0.4);
snowMeow(140.6, { vol: 0.3, contour: (u) => (u < 0.3 ? lerp(1.0, 1.15, u / 0.3) : lerp(1.15, 0.8, (u - 0.3) / 0.7)), breath: 0.2 });
snowMeow(145.2, { vol: 0.2, dur: 0.6, contour: (u) => lerp(1.05, 0.8, u), breath: 0.3 });
pipMeow(144.0, { f: 800, dur: 0.35, vol: 0.18 });
for (let t = 147.1; t < 149.3; t += 0.55) splashS(t, 0.12, 0.4);
heartbeat(149.4, 0.6);
whoosh(149.3, 0.4, 0.12);

// ---------------------------------------------------------------- reverb (Freeverb-style)
console.log('reverb…');
function freeverb(inp, spread, room = 0.86, damp = 0.35) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({ b: new Float32Array(d + spread), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map((d) => ({ b: new Float32Array(d + spread), i: 0 }));
  const out = new Float32Array(N);
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015;
    let s = 0;
    for (const c of combs) {
      const y = c.b[c.i];
      c.f = y * (1 - damp) + c.f * damp;
      c.b[c.i] = x + c.f * room;
      if (++c.i >= c.b.length) c.i = 0;
      s += y;
    }
    for (const a of aps) {
      const bo = a.b[a.i];
      const y = -s + bo;
      a.b[a.i] = s + bo * 0.5;
      if (++a.i >= a.b.length) a.i = 0;
      s = y;
    }
    out[n] = s;
  }
  return out;
}
const RL = freeverb(SEND.L, 0), RR = freeverb(SEND.R, 23);

// ---------------------------------------------------------------- mix & master
console.log('master…');
const MG = 1.6, SG = 1.0, RG = 1.5;
if (process.env.STATS) {
  const db = (arr, g, a, z) => { let q = 0; for (let i = a; i < z; i++) q += (arr[i] * g) ** 2; return (10 * Math.log10(q / (z - a) + 1e-12)).toFixed(1); };
  for (let t = 0; t < 150; t += 3) { const a = Math.floor(t * SR), z = Math.floor((t + 3) * SR); console.log(String(t).padStart(4), 'mus', db(MUS.L, MG, a, z).padStart(6), 'sfx', db(SFX.L, SG, a, z).padStart(6)); }
}
const outL = new Float32Array(N), outR = new Float32Array(N);
for (let i = 0; i < N; i++) { outL[i] = MUS.L[i] * MG + SFX.L[i] * SG + RL[i] * RG; outR[i] = MUS.R[i] * MG + SFX.R[i] * SG + RR[i] * RG; }
// DC / rumble cleanup
{ const hl = new Biquad('hp', 28, 0.7), hr = new Biquad('hp', 28, 0.7); for (let i = 0; i < N; i++) { outL[i] = hl.p(outL[i]); outR[i] = hr.p(outR[i]); } }
// loudness target via RMS (approx), then look-ahead limiter
let sum = 0; for (let i = 0; i < N; i++) sum += outL[i] * outL[i] + outR[i] * outR[i];
const rms = Math.sqrt(sum / (2 * N));
const target = 0.15; // ~ -17.7 dBFS RMS before limiting
const pre = target / rms;
const LA = Math.floor(0.005 * SR), ceil = 0.89;
const gainArr = new Float32Array(N);
let g = 1;
const peaks = new Float32Array(N);
for (let i = 0; i < N; i++) peaks[i] = Math.max(Math.abs(outL[i]), Math.abs(outR[i])) * pre;
// running max over look-ahead window
const dq = []; const winMax = new Float32Array(N);
for (let i = N - 1; i >= 0; i--) {
  while (dq.length && peaks[dq[dq.length - 1]] <= peaks[i]) dq.pop();
  dq.push(i);
  while (dq[0] > i + LA) dq.shift();
  winMax[i] = peaks[dq[0]];
}
for (let i = 0; i < N; i++) {
  const need = winMax[i] > ceil ? ceil / winMax[i] : 1;
  if (need < g) g = need; else g = g + (need - g) * 0.0004;
  gainArr[i] = g;
}
const pcm = Buffer.alloc(44 + N * 4);
pcm.write('RIFF', 0); pcm.writeUInt32LE(36 + N * 4, 4); pcm.write('WAVE', 8); pcm.write('fmt ', 12);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(2, 22); pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 4, 28); pcm.writeUInt16LE(4, 32); pcm.writeUInt16LE(16, 34); pcm.write('data', 36); pcm.writeUInt32LE(N * 4, 40);
let clipped = 0;
for (let i = 0; i < N; i++) {
  let l = Math.tanh(outL[i] * pre * gainArr[i] * 1.05) / 1.05, r = Math.tanh(outR[i] * pre * gainArr[i] * 1.05) / 1.05;
  if (Math.abs(l) > 0.99 || Math.abs(r) > 0.99) clipped++;
  pcm.writeInt16LE(Math.round(clamp(l, -1, 1) * 32767), 44 + i * 4);
  pcm.writeInt16LE(Math.round(clamp(r, -1, 1) * 32767), 46 + i * 4);
}
writeFileSync(new URL('./out/audio.wav', import.meta.url), pcm);
console.log('done. pre-gain', pre.toFixed(3), 'clipped samples', clipped);
