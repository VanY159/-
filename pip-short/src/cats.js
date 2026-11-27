// ============================================================
//  Characters & props — all vector, drawn in local world units
//  Origin = ground contact point, y up is negative.
// ============================================================
'use strict';

const PAL = {
  pip:   { fur: '#E9883B', dark: '#B4561C', light: '#FBDDB4', eye: '#F3B23A', nose: '#EC8E8C', inner: '#F6A9A4' },
  mama:  { fur: '#8F979F', dark: '#59616A', light: '#DCDFE2', eye: '#86C96D', nose: '#D98B8B', inner: '#E9A5A3' },
  sib1:  { fur: '#9DA4AB', dark: '#646C75', light: '#E4E6E8', eye: '#8FCBEA', nose: '#E39A98', inner: '#F0AFAC' },
  sib2:  { fur: '#B3A99C', dark: '#7A6E61', light: '#EEE7DD', eye: '#9AD0E8', nose: '#E39A98', inner: '#F0AFAC' },
  sib3:  { fur: '#2C2F35', dark: '#17191D', light: '#F3F2EE', eye: '#E8C44C', nose: '#D98F96', inner: '#D9989C', tux: true },
  snow:  { fur: '#F5F1EA', dark: '#D9D1C6', light: '#FFFFFF', eye: '#5BAAE8', nose: '#F0A3A8', inner: '#F5B7B9' },
};
const COAT = { base: '#FFD21F', dark: '#E2A400', hi: '#FFF4AE', line: '#B98200' };

function catOpts(o) {
  return Object.assign({
    pal: PAL.pip, size: 1, turn: 0, blink: 0, mouth: 0, brow: 0, pupil: 0.55, lookX: 0, lookY: 0,
    earBack: 0, sway: 0, wet: 0, coat: 0, hood: 0, star: false, fluffy: false, collar: false,
    squash: 1, tilt: 0, breath: 0, tabby: true, blush: 0.22, shiver: 0, t: 0, shadow: true,
    eyeScale: 1, happy: 0, teeth: 0, lace: false, flip: false, tail: true, legs: 'sit',
  }, o);
}
function furCol(o, c) { return o.wet ? mix(c, shade(c, -0.45), o.wet * 0.55) : hex(c); }

// ---------------------------------------------------------------- eyes
function catEye(o, ex, ey, rx, ry, side) {
  const c = ctx, pal = o.pal;
  if (o.blink >= 0.96 || o.happy > 0.5) {
    c.strokeStyle = '#2a1a12';
    c.lineWidth = 0.035;
    c.lineCap = 'round';
    c.beginPath();
    if (o.happy > 0.5) { c.moveTo(ex - rx, ey + ry * 0.2); c.quadraticCurveTo(ex, ey - ry * 0.9, ex + rx, ey + ry * 0.2); }
    else { c.moveTo(ex - rx, ey); c.quadraticCurveTo(ex, ey + ry * 0.55, ex + rx, ey); }
    c.stroke();
    return;
  }
  // rim
  ellipse(ex, ey, rx * 1.08, ry * 1.07);
  c.fillStyle = '#24160f';
  c.fill();
  // iris
  const ig = c.createRadialGradient(ex, ey + ry * 0.25, 0, ex, ey, ry);
  ig.addColorStop(0, rgba(shade(pal.eye, 0.45)));
  ig.addColorStop(0.55, rgba(pal.eye));
  ig.addColorStop(1, rgba(shade(pal.eye, -0.45)));
  ellipse(ex, ey, rx, ry);
  c.fillStyle = ig;
  c.fill();
  c.save();
  ellipse(ex, ey, rx, ry);
  c.clip();
  // pupil
  const px = ex + o.lookX * rx * 0.3, py = ey + o.lookY * ry * 0.25;
  ellipse(px, py, rx * (0.25 + o.pupil * 0.55), ry * (0.55 + o.pupil * 0.35));
  c.fillStyle = '#0b0705';
  c.fill();
  // highlights
  c.fillStyle = 'rgba(255,255,255,0.96)';
  circle(px - rx * 0.32, py - ry * 0.4, rx * 0.36); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.75)';
  circle(px + rx * 0.34, py + ry * 0.36, rx * 0.14); c.fill();
  // upper lid shadow
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(ex - rx * 1.2, ey - ry * 1.2, rx * 2.4, ry * 0.5);
  // expression lids
  const lidCol = rgba(furCol(o, pal.fur));
  const blinkH = ry * 2.1 * o.blink;
  let li = 0, lo = 0; // inner / outer lid drop
  if (o.brow > 0) { li = ry * 0.95 * o.brow; lo = ry * 0.15 * o.brow; }
  if (o.brow < 0) { lo = ry * 0.85 * -o.brow; li = ry * 0.05; }
  const inner = -side; // inner corner direction (toward nose)
  const xi = ex + inner * rx * 1.2, xo = ex - inner * rx * 1.2;
  const y0 = ey - ry * 1.15;
  c.fillStyle = lidCol;
  c.beginPath();
  c.moveTo(xi, y0 - 0.2); c.lineTo(xo, y0 - 0.2);
  c.lineTo(xo, y0 + lo + blinkH); c.lineTo(xi, y0 + li + blinkH);
  c.closePath();
  c.fill();
  c.strokeStyle = '#24160f';
  c.lineWidth = 0.03;
  c.beginPath(); c.moveTo(xo, y0 + lo + blinkH); c.lineTo(xi, y0 + li + blinkH); c.stroke();
  c.restore();
}

// ---------------------------------------------------------------- head (shared)
function catHead(o, opts = {}) {
  const c = ctx, pal = o.pal, tn = o.turn;
  const fur = furCol(o, pal.fur), dark = furCol(o, pal.dark), light = furCol(o, pal.light);
  const fl = o.fluffy;
  const hrx = fl ? 0.7 : 0.66, hry = fl ? 0.58 : 0.56;
  // hood (back)
  if (o.coat > 0 && o.hood > 0.5) {
    ellipse(0, 0.04, 0.8, 0.66);
    c.fillStyle = vgrad(-0.6, 0.6, [[0, COAT.hi], [0.35, COAT.base], [1, COAT.dark]]);
    c.fill();
    c.strokeStyle = rgba(COAT.line, 0.8); c.lineWidth = 0.03; c.stroke();
  }
  // ears
  const earS = fl ? 0.72 : 1;
  for (const side of [-1, 1]) {
    const far = side * tn > 0;
    const wk = (far ? 1 - 0.35 * Math.abs(tn) : 1) * earS;
    const eb = o.earBack;
    const bx = side * (fl ? 0.42 : 0.36) + tn * 0.12, by = fl ? -0.3 : -0.36;
    const tipX = bx + side * (0.09 + 0.34 * eb) * earS, tipY = by - 0.5 * earS * (1 - 0.5 * eb);
    const b1x = bx - side * 0.2 * wk, b2x = bx + side * 0.22 * wk;
    c.beginPath();
    c.moveTo(b1x, by + 0.1);
    c.quadraticCurveTo(tipX - side * 0.06, tipY + 0.1, tipX, tipY);
    c.quadraticCurveTo(tipX + side * 0.04, tipY + 0.2, b2x, by + 0.16);
    c.closePath();
    c.fillStyle = rgba(side < 0 ? fur : shade(fur, -0.08));
    c.fill();
    c.beginPath();
    c.moveTo(lerp(b1x, tipX, 0.25), by + 0.05);
    c.quadraticCurveTo(tipX - side * 0.04, tipY + 0.16, lerp(tipX, b1x, 0.1), tipY + 0.1);
    c.quadraticCurveTo(tipX + side * 0.01, tipY + 0.22, lerp(b2x, tipX, 0.3), by + 0.08);
    c.closePath();
    c.fillStyle = rgba(furCol(o, pal.inner), 0.9);
    c.fill();
    // inner tufts
    c.strokeStyle = rgba(light, 0.8); c.lineWidth = 0.018;
    c.beginPath();
    for (let k = 0; k < 3; k++) { const u = 0.35 + k * 0.12; c.moveTo(lerp(bx, tipX, 0.3), by + 0.02 - k * 0.02); c.lineTo(lerp(bx, tipX, u) - side * 0.05, lerp(by, tipY, u + 0.1)); }
    c.stroke();
  }
  // fluffy ruff
  if (fl) {
    c.fillStyle = rgba(fur);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * TAU;
      circle(Math.cos(a) * 0.68, Math.sin(a) * 0.58 + 0.04, 0.17 + 0.04 * hash(i * 3.3));
      c.fill();
    }
  }
  // head
  const hg = c.createRadialGradient(-0.22 + tn * 0.1, -0.25, 0.05, 0, 0, 0.8);
  hg.addColorStop(0, rgba(shade(fur, 0.18)));
  hg.addColorStop(0.6, rgba(fur));
  hg.addColorStop(1, rgba(shade(fur, -0.16)));
  c.fillStyle = hg;
  ellipse(0, 0, hrx, hry);
  c.fill();
  // cheek tufts
  for (const side of [-1, 1]) {
    c.beginPath();
    const cx = side * (hrx - 0.06) + tn * 0.05;
    c.moveTo(cx, -0.06); c.lineTo(cx + side * 0.14, 0.08); c.lineTo(cx - side * 0.02, 0.12);
    c.lineTo(cx + side * 0.1, 0.24); c.lineTo(cx - side * 0.16, 0.3); c.closePath();
    c.fill();
  }
  // tabby / tux marks
  if (o.tabby && !fl) {
    c.strokeStyle = rgba(dark, 0.75);
    c.lineWidth = 0.055; c.lineCap = 'round';
    const fx = tn * 0.26;
    c.beginPath();
    c.moveTo(fx - 0.15, -0.5); c.lineTo(fx - 0.1, -0.3);
    c.moveTo(fx, -0.55); c.lineTo(fx, -0.32);
    c.moveTo(fx + 0.15, -0.5); c.lineTo(fx + 0.1, -0.3);
    for (const side of [-1, 1]) {
      c.moveTo(side * 0.6 + tn * 0.05, 0.02); c.lineTo(side * 0.44 + tn * 0.05, 0.05);
      c.moveTo(side * 0.6 + tn * 0.05, 0.13); c.lineTo(side * 0.46 + tn * 0.05, 0.14);
    }
    c.stroke();
  }
  const nx = tn * (fl ? 0.22 : 0.3);
  if (pal.tux) { // white blaze + muzzle
    c.fillStyle = rgba(light);
    c.beginPath(); c.moveTo(nx - 0.04, -0.2); c.lineTo(nx + 0.04, -0.2); c.lineTo(nx + 0.22, 0.4); c.lineTo(nx - 0.22, 0.4); c.closePath(); c.fill();
  }
  // muzzle
  c.fillStyle = rgba(light, fl ? 1 : 0.9);
  ellipse(nx - 0.11, 0.24, 0.14, 0.11); c.fill();
  ellipse(nx + 0.11, 0.24, 0.14, 0.11); c.fill();
  ellipse(nx, 0.34, 0.12, 0.08); c.fill();
  // blush
  if (o.blush > 0) {
    c.fillStyle = `rgba(255,120,130,${o.blush})`;
    ellipse(-0.4 + tn * 0.16, 0.16, 0.12, 0.07); c.fill();
    ellipse(0.4 + tn * 0.16, 0.16, 0.12, 0.07); c.fill();
  }
  // eyes
  const es = o.eyeScale * (fl ? 1.05 : 1);
  for (const side of [-1, 1]) {
    const far = side * tn > 0;
    const k = far ? 1 - 0.34 * Math.abs(tn) : 1 + 0.05 * Math.abs(tn);
    const ex = side * (fl ? 0.28 : 0.26) + tn * 0.18, ey = fl ? 0.0 : -0.02;
    catEye(o, ex, ey, 0.165 * k * es, 0.19 * es, side);
  }
  // nose
  const ny = fl ? 0.12 : 0.16;
  c.fillStyle = rgba(pal.nose);
  c.beginPath();
  c.moveTo(nx - 0.075, ny - 0.035); c.quadraticCurveTo(nx, ny - 0.07, nx + 0.075, ny - 0.035);
  c.quadraticCurveTo(nx + 0.02, ny + 0.06, nx, ny + 0.06); c.quadraticCurveTo(nx - 0.02, ny + 0.06, nx - 0.075, ny - 0.035);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  ellipse(nx - 0.02, ny - 0.03, 0.025, 0.012); c.fill();
  // mouth
  const my = ny + 0.06;
  if (o.mouth > 0.02) {
    const m = o.mouth;
    c.fillStyle = '#5b1d22';
    ellipse(nx, my + 0.06 + m * 0.05, 0.07 + m * 0.05, 0.02 + m * 0.1); c.fill();
    c.fillStyle = '#e8737b';
    ellipse(nx, my + 0.1 + m * 0.1, 0.05 + m * 0.03, 0.015 + m * 0.04); c.fill();
    if (o.teeth > 0) {
      c.fillStyle = '#fff';
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(nx + s * 0.06, my + 0.04); c.lineTo(nx + s * 0.035, my + 0.04); c.lineTo(nx + s * 0.05, my + 0.1); c.fill(); }
    }
  }
  c.strokeStyle = '#3a2219';
  c.lineWidth = 0.025; c.lineCap = 'round';
  c.beginPath();
  c.moveTo(nx, ny + 0.055); c.lineTo(nx, my + 0.03);
  c.moveTo(nx - 0.11, my + 0.03); c.quadraticCurveTo(nx - 0.05, my + 0.09, nx, my + 0.03);
  c.quadraticCurveTo(nx + 0.05, my + 0.09, nx + 0.11, my + 0.03);
  c.stroke();
  // whiskers
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = 0.012;
  c.beginPath();
  for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x0 = nx + side * 0.16, y0 = ny + 0.08 + i * 0.03;
    c.moveTo(x0, y0); c.quadraticCurveTo(x0 + side * 0.3, y0 - 0.06 + i * 0.03, x0 + side * 0.55, y0 - 0.02 + i * 0.07);
  }
  c.stroke();
  // wet fur spikes / drips
  if (o.wet > 0.3) {
    c.fillStyle = rgba(fur);
    for (let i = 0; i < 9; i++) {
      const a = 0.45 + (i / 8) * (Math.PI - 0.9);
      const x = Math.cos(a) * hrx * 0.98, y = Math.sin(a) * hry * 0.98;
      c.beginPath(); c.moveTo(x - 0.05, y - 0.02); c.lineTo(x + Math.cos(a) * 0.1, y + 0.12); c.lineTo(x + 0.05, y - 0.02); c.fill();
    }
    c.fillStyle = `rgba(200,230,255,${0.6 * o.wet})`;
    for (let i = 0; i < 4; i++) { ellipse(-0.3 + i * 0.2, 0.5 + mod(o.t * 0.8 + i * 0.3, 1) * 0.2, 0.025, 0.04); c.fill(); }
  }
  // hood rim (front)
  if (o.coat > 0 && o.hood > 0.5) {
    c.lineCap = 'round';
    c.strokeStyle = rgba(COAT.base);
    c.lineWidth = 0.17;
    c.beginPath(); c.ellipse(tn * 0.04, 0.06, 0.74, 0.58, 0, Math.PI * 1.04, Math.PI * 1.96); c.stroke();
    c.strokeStyle = rgba(COAT.hi, 0.8);
    c.lineWidth = 0.04;
    c.beginPath(); c.ellipse(tn * 0.04, 0.02, 0.74, 0.58, 0, Math.PI * 1.15, Math.PI * 1.5); c.stroke();
    c.strokeStyle = rgba(COAT.line, 0.7);
    c.lineWidth = 0.02;
    c.beginPath(); c.ellipse(tn * 0.04, 0.14, 0.72, 0.54, 0, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
  }
}

// ---------------------------------------------------------------- sitting (front / 3-4)
function drawCatSit(o) {
  o = catOpts(o);
  const c = ctx, pal = o.pal, tn = o.turn;
  const fur = furCol(o, pal.fur), dark = furCol(o, pal.dark), light = furCol(o, pal.light);
  c.save();
  const sq = o.squash;
  c.scale(o.size * (o.flip ? -1 : 1) / Math.sqrt(sq), o.size * sq);
  if (o.shiver) c.translate(Math.sin(o.t * 70) * 0.02 * o.shiver, 0);
  if (o.shadow) { c.fillStyle = 'rgba(0,0,0,0.32)'; ellipse(0, 0, 0.85, 0.13); c.fill(); }
  // tail
  if (o.tail) {
    const side = tn >= 0 ? -1 : 1;
    const sw = o.sway;
    c.lineCap = 'round';
    c.strokeStyle = rgba(fur); c.lineWidth = 0.2;
    c.beginPath();
    c.moveTo(side * 0.35, -0.12);
    c.bezierCurveTo(side * 0.95, -0.05, side * (1.05 + sw * 0.2), -0.5, side * (0.9 + sw * 0.35), -0.95 - sw * 0.1);
    c.stroke();
    if (o.tabby) { c.setLineDash([0.1, 0.13]); c.strokeStyle = rgba(dark, 0.7); c.stroke(); c.setLineDash([]); }
  }
  // body
  const bodyPath = () => {
    c.beginPath();
    c.moveTo(-0.34, -1.14);
    c.bezierCurveTo(-0.72, -0.96, -0.8, -0.26, -0.56, -0.03);
    c.quadraticCurveTo(0, 0.05, 0.56, -0.03);
    c.bezierCurveTo(0.8, -0.26, 0.72, -0.96, 0.34, -1.14);
    c.closePath();
  };
  if (o.fluffy) {
    c.fillStyle = rgba(fur);
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; circle(Math.cos(a) * 0.62, -0.6 + Math.sin(a) * 0.62, 0.16); c.fill(); }
  }
  bodyPath();
  const bg = c.createRadialGradient(-0.25, -0.85, 0.05, 0, -0.5, 1.0);
  bg.addColorStop(0, rgba(shade(fur, 0.15))); bg.addColorStop(0.6, rgba(fur)); bg.addColorStop(1, rgba(shade(fur, -0.25)));
  c.fillStyle = bg; c.fill();
  c.save(); bodyPath(); c.clip();
  if (o.tabby && !o.fluffy) {
    c.strokeStyle = rgba(dark, 0.55); c.lineWidth = 0.07; c.lineCap = 'round';
    c.beginPath();
    for (let k = 0; k < 4; k++) for (const s of [-1, 1]) {
      const y = -0.25 - k * 0.22;
      c.moveTo(s * 0.8, y); c.quadraticCurveTo(s * 0.55, y - 0.06, s * 0.42, y + 0.04);
    }
    c.stroke();
  }
  // chest
  c.fillStyle = rgba(light, 0.92);
  ellipse(tn * 0.12, -0.55, 0.3, 0.46); c.fill();
  c.restore();
  if (o.star) { c.save(); c.translate(tn * 0.12, -0.72); starPath(0.15, 0.065); c.fillStyle = '#FFFFFF'; c.fill(); c.restore(); }
  // collar pearls
  if (o.collar) {
    for (let i = -5; i <= 5; i++) {
      const x = i * 0.075 + tn * 0.1, y = -1.08 + i * i * 0.004;
      const g = c.createRadialGradient(x - 0.015, y - 0.015, 0.005, x, y, 0.05);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#b9b4c8');
      c.fillStyle = g; circle(x, y, 0.045); c.fill();
    }
  }
  // raincoat
  if (o.coat > 0) {
    c.globalAlpha = o.coat;
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * 0.06 + tn * 0.1, -1.12);
      c.lineTo(s * 0.44, -1.14);
      c.bezierCurveTo(s * 0.8, -0.98, s * 0.86, -0.4, s * 0.82, -0.14);
      c.quadraticCurveTo(s * 0.5, -0.08, s * 0.15 + tn * 0.1, -0.12);
      c.lineTo(s * 0.06 + tn * 0.1, -1.12);
      c.closePath();
      c.fillStyle = vgrad(-1.1, -0.1, [[0, COAT.hi], [0.3, COAT.base], [1, COAT.dark]]);
      c.fill();
      c.strokeStyle = rgba(COAT.line, 0.85); c.lineWidth = 0.025; c.stroke();
    }
    c.fillStyle = rgba(COAT.hi, 0.45);
    ellipse(-0.5, -0.7, 0.07, 0.3, 0.15); c.fill();
    c.fillStyle = rgba(COAT.line);
    circle(0.17 + tn * 0.1, -0.85, 0.035); c.fill();
    circle(0.17 + tn * 0.1, -0.55, 0.035); c.fill();
    if (o.hood <= 0.5) { // hood down, bunched behind neck
      c.fillStyle = rgba(COAT.base);
      ellipse(0, -1.12, 0.5, 0.14); c.fill();
    }
    c.globalAlpha = 1;
  }
  // front paws
  c.fillStyle = rgba(shade(light, -0.05));
  for (const s of [-1, 1]) { ellipse(s * 0.21 + tn * 0.1, -0.07, 0.15, 0.1); c.fill(); }
  c.strokeStyle = rgba(dark, 0.5); c.lineWidth = 0.015;
  c.beginPath();
  for (const s of [-1, 1]) for (let k = -1; k <= 1; k += 2) { const x = s * 0.21 + tn * 0.1 + k * 0.04; c.moveTo(x, -0.1); c.lineTo(x, -0.02); }
  c.stroke();
  // head
  c.save();
  c.translate(tn * 0.1, -1.5 + o.breath * 0.02);
  c.rotate(o.tilt);
  if (o.shiver) c.translate(Math.sin(o.t * 61) * 0.015 * o.shiver, 0);
  catHead(o);
  c.restore();
  c.restore();
}

function starPath(R, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r : R;
    i ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

// ---------------------------------------------------------------- side (walk / run / stand / pull)
// o.gait: phase (radians); o.run: 0..1 amplitude; o.crouch; o.stretch (jump)
function drawCatSide(o) {
  o = catOpts(Object.assign({ gait: 0, run: 0, crouch: 0, stretch: 0, headUp: 0, pull: 0 }, o));
  const c = ctx, pal = o.pal;
  const fur = furCol(o, pal.fur), dark = furCol(o, pal.dark), light = furCol(o, pal.light);
  c.save();
  c.scale(o.size * (o.flip ? -1 : 1), o.size);
  if (o.shadow) { c.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(0, 0, 1.0, 0.12); c.fill(); }
  const ph = o.gait, A = 0.75 * o.run;
  const bob = -Math.abs(Math.sin(ph)) * 0.08 * o.run - o.stretch * 0.25;
  const by = -0.74 + o.crouch * 0.28 + bob;
  const bodyRot = o.stretch * -0.12 + o.pull * 0.12;
  c.save();
  c.translate(0, by);
  c.rotate(bodyRot);
  // legs (far first)
  const legLen = 0.62 * (1 - o.crouch * 0.4);
  const leg = (jx, theta, near, lift) => {
    const fx = jx + Math.sin(theta) * legLen, fy = 0.14 + Math.cos(theta) * legLen - lift;
    c.strokeStyle = rgba(near ? fur : shade(fur, -0.25));
    c.lineWidth = 0.18; c.lineCap = 'round';
    c.beginPath(); c.moveTo(jx, 0.05); c.quadraticCurveTo(jx + Math.sin(theta) * legLen * 0.5 - 0.04, 0.14 + legLen * 0.45, fx, fy); c.stroke();
    c.fillStyle = rgba(near ? light : shade(light, -0.25));
    ellipse(fx + 0.05, fy + 0.02, 0.1, 0.065); c.fill();
  };
  const st = o.stretch;
  const thF = (p) => (st > 0 ? 0.9 * st : A * Math.sin(ph + p)) - o.pull * 0.5;
  const thB = (p) => (st > 0 ? -0.8 * st : A * Math.sin(ph + Math.PI + p)) - o.pull * 0.3;
  const lift = (th) => Math.max(0, th) * 0.12 * o.run;
  leg(0.45, thF(0.6), false, lift(thF(0.6)));
  leg(-0.5, thB(0.6), false, lift(thB(0.6)));
  // tail
  if (o.tail) {
    c.strokeStyle = rgba(fur); c.lineWidth = 0.18; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.72, -0.12);
    c.bezierCurveTo(-1.1, -0.25, -1.15 + o.sway * 0.2, -0.75, -0.95 + o.sway * 0.35, -1.05 - o.run * 0.1);
    c.stroke();
    if (o.tabby) { c.setLineDash([0.1, 0.13]); c.strokeStyle = rgba(dark, 0.7); c.stroke(); c.setLineDash([]); }
  }
  // body
  const bpath = () => { ellipse(0, 0, 0.82, 0.42); };
  const bg = c.createLinearGradient(0, -0.45, 0, 0.45);
  bg.addColorStop(0, rgba(shade(fur, 0.12))); bg.addColorStop(0.6, rgba(fur)); bg.addColorStop(1, rgba(shade(fur, -0.2)));
  bpath(); c.fillStyle = bg; c.fill();
  c.save(); bpath(); c.clip();
  c.fillStyle = rgba(light, 0.9); ellipse(0.25, 0.38, 0.6, 0.2); c.fill();
  if (o.tabby) {
    c.strokeStyle = rgba(dark, 0.55); c.lineWidth = 0.08;
    c.beginPath();
    for (let k = 0; k < 5; k++) { const x = -0.55 + k * 0.26; c.moveTo(x, -0.45); c.quadraticCurveTo(x + 0.06, -0.2, x - 0.02, 0.0); }
    c.stroke();
  }
  c.restore();
  // coat on body
  if (o.coat > 0) {
    c.save();
    c.beginPath();
    c.moveTo(-0.86, 0.05);
    c.bezierCurveTo(-0.9, -0.55, 0.8, -0.62, 0.86, -0.02);
    c.quadraticCurveTo(0.6, 0.18, 0.3, 0.12); c.quadraticCurveTo(0, 0.2, -0.3, 0.12); c.quadraticCurveTo(-0.6, 0.18, -0.86, 0.05);
    c.closePath();
    c.fillStyle = vgrad(-0.5, 0.2, [[0, COAT.hi], [0.35, COAT.base], [1, COAT.dark]]);
    c.fill();
    c.strokeStyle = rgba(COAT.line, 0.85); c.lineWidth = 0.025; c.stroke();
    c.fillStyle = rgba(COAT.hi, 0.5); ellipse(-0.1, -0.3, 0.35, 0.05, -0.05); c.fill();
    c.restore();
  }
  // near legs
  leg(0.45 + 0.05, thF(0), true, lift(thF(0)));
  leg(-0.5 + 0.05, thB(0), true, lift(thB(0)));
  c.restore();
  // head
  c.save();
  const hx = 0.78 + o.stretch * 0.15 + o.pull * 0.1, hy = by - 0.42 - o.headUp * 0.1 + o.pull * 0.12;
  c.translate(hx, hy);
  c.rotate(o.tilt + bodyRot * 0.5);
  c.scale(0.86, 0.86);
  const ho = Object.assign({}, o, { turn: 0.62 });
  catHead(ho);
  if (o.lace) { // lace in teeth
    c.strokeStyle = '#D7263D'; c.lineWidth = 0.07; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0.1, 0.32); c.lineTo(-1.6, 0.9 + o.pull * 0.2); c.stroke();
    c.strokeStyle = 'rgba(255,200,200,0.5)'; c.lineWidth = 0.02;
    c.beginPath(); c.moveTo(0.1, 0.3); c.lineTo(-1.6, 0.88 + o.pull * 0.2); c.stroke();
  }
  if (o.plank) { // plank held in mouth
    c.save(); c.translate(0.2, 0.33); c.rotate(-0.15);
    c.fillStyle = '#9A6A3A'; rrect(-0.15, -0.06, 1.2, 0.13, 0.04); c.fill();
    c.strokeStyle = 'rgba(60,35,15,0.6)'; c.lineWidth = 0.015;
    c.beginPath(); c.moveTo(0, -0.02); c.lineTo(1, -0.01); c.moveTo(0.1, 0.03); c.lineTo(0.9, 0.035); c.stroke();
    c.restore();
  }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- lying (side)
function drawCatLie(o) {
  o = catOpts(Object.assign({ headLift: 0 }, o));
  const c = ctx, pal = o.pal;
  const fur = furCol(o, pal.fur), dark = furCol(o, pal.dark), light = furCol(o, pal.light);
  c.save();
  c.scale(o.size * (o.flip ? -1 : 1), o.size);
  if (o.shadow) { c.fillStyle = 'rgba(0,0,0,0.3)'; ellipse(0.1, 0, 1.25, 0.14); c.fill(); }
  // tail curled
  c.strokeStyle = rgba(fur); c.lineWidth = 0.18; c.lineCap = 'round';
  c.beginPath(); c.moveTo(-0.85, -0.2); c.bezierCurveTo(-1.35, -0.1, -1.0, 0.02, -0.3 + o.sway * 0.1, -0.06); c.stroke();
  if (o.tabby) { c.setLineDash([0.1, 0.13]); c.strokeStyle = rgba(dark, 0.7); c.stroke(); c.setLineDash([]); }
  const br = 1 + o.breath * 0.05;
  ellipse(0, -0.36 * br, 0.98, 0.37 * br);
  const g = c.createLinearGradient(0, -0.75, 0, 0);
  g.addColorStop(0, rgba(shade(fur, 0.12))); g.addColorStop(1, rgba(shade(fur, -0.2)));
  c.fillStyle = g; c.fill();
  if (o.tabby) {
    c.save(); ellipse(0, -0.36 * br, 0.98, 0.37 * br); c.clip();
    c.strokeStyle = rgba(dark, 0.55); c.lineWidth = 0.08;
    c.beginPath(); for (let k = 0; k < 5; k++) { const x = -0.6 + k * 0.28; c.moveTo(x, -0.75); c.quadraticCurveTo(x + 0.06, -0.5, x - 0.02, -0.25); }
    c.stroke(); c.restore();
  }
  if (o.coat > 0) {
    c.beginPath(); c.moveTo(-0.95, -0.25); c.bezierCurveTo(-0.9, -0.85, 0.8, -0.9, 0.95, -0.3); c.quadraticCurveTo(0, -0.1, -0.95, -0.25);
    c.fillStyle = vgrad(-0.8, -0.2, [[0, COAT.hi], [0.4, COAT.base], [1, COAT.dark]]); c.fill();
    c.strokeStyle = rgba(COAT.line, 0.8); c.lineWidth = 0.025; c.stroke();
  }
  // paws front
  c.fillStyle = rgba(light);
  ellipse(1.12, -0.06, 0.18, 0.08); c.fill();
  ellipse(0.95, -0.04, 0.17, 0.08); c.fill();
  // head
  c.save();
  c.translate(1.0, -0.5 - o.headLift * 0.3);
  c.rotate(0.12 - o.headLift * 0.15 + o.tilt);
  c.scale(0.85, 0.85);
  catHead(Object.assign({}, o, { turn: 0.5 }));
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- from behind
function drawCatBack(o) {
  o = catOpts(o);
  const c = ctx, pal = o.pal;
  const fur = furCol(o, pal.fur), dark = furCol(o, pal.dark);
  c.save();
  c.scale(o.size, o.size);
  if (o.shadow) { c.fillStyle = 'rgba(0,0,0,0.32)'; ellipse(0, 0, 0.85, 0.13); c.fill(); }
  if (o.fluffy) {
    c.fillStyle = rgba(shade(fur, -0.06));
    for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; circle(Math.cos(a) * 0.62, -0.6 + Math.sin(a) * 0.62, 0.16); c.fill(); }
    for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; circle(Math.cos(a) * 0.66, -1.52 + Math.sin(a) * 0.56, 0.16); c.fill(); }
  }
  // body
  c.beginPath();
  c.moveTo(-0.34, -1.14); c.bezierCurveTo(-0.72, -0.96, -0.8, -0.26, -0.56, -0.03);
  c.quadraticCurveTo(0, 0.05, 0.56, -0.03); c.bezierCurveTo(0.8, -0.26, 0.72, -0.96, 0.34, -1.14); c.closePath();
  c.fillStyle = vgrad(-1.1, 0, [[0, shade(fur, 0.1)], [1, shade(fur, -0.25)]]); c.fill();
  if (o.coat > 0) {
    c.beginPath();
    c.moveTo(-0.44, -1.16); c.bezierCurveTo(-0.84, -0.98, -0.9, -0.4, -0.84, -0.12);
    c.quadraticCurveTo(0, -0.02, 0.84, -0.12); c.bezierCurveTo(0.9, -0.4, 0.84, -0.98, 0.44, -1.16); c.closePath();
    c.fillStyle = vgrad(-1.1, -0.1, [[0, COAT.hi], [0.35, COAT.base], [1, COAT.dark]]); c.fill();
    c.strokeStyle = rgba(COAT.line, 0.85); c.lineWidth = 0.025; c.stroke();
    c.strokeStyle = rgba(COAT.line, 0.5); c.beginPath(); c.moveTo(0, -1.1); c.lineTo(0, -0.1); c.stroke();
  }
  // tail up
  c.strokeStyle = rgba(fur); c.lineWidth = 0.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0.1, -0.12); c.bezierCurveTo(0.6, 0.0, 0.75 + o.sway * 0.2, -0.6, 0.55 + o.sway * 0.4, -1.05); c.stroke();
  if (o.tabby) { c.setLineDash([0.1, 0.13]); c.strokeStyle = rgba(dark, 0.7); c.stroke(); c.setLineDash([]); }
  // head from behind
  c.save();
  c.translate(0, -1.52);
  c.rotate(o.tilt);
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(s * 0.12, -0.3); c.quadraticCurveTo(s * 0.4, -0.85 + o.earBack * 0.3, s * (0.45 + o.earBack * 0.3), -0.86 + o.earBack * 0.4); c.lineTo(s * 0.6, -0.2); c.closePath();
    c.fillStyle = rgba(shade(fur, -0.05)); c.fill();
  }
  ellipse(0, 0, 0.66, 0.56);
  c.fillStyle = vgrad(-0.6, 0.6, [[0, shade(fur, 0.08)], [1, shade(fur, -0.2)]]); c.fill();
  if (o.tabby) {
    c.strokeStyle = rgba(dark, 0.6); c.lineWidth = 0.06;
    c.beginPath(); for (let k = -1; k <= 1; k++) { c.moveTo(k * 0.18, -0.5); c.lineTo(k * 0.15, -0.1); } c.stroke();
  }
  if (o.coat > 0 && o.hood > 0.5) {
    ellipse(0, 0.08, 0.74, 0.6);
    c.fillStyle = vgrad(-0.6, 0.6, [[0, COAT.hi], [0.4, COAT.base], [1, COAT.dark]]);
    c.fill();
    c.strokeStyle = rgba(COAT.line, 0.8); c.lineWidth = 0.03; c.stroke();
    c.fillStyle = rgba(COAT.hi, 0.45); ellipse(-0.3, -0.15, 0.2, 0.08, -0.4); c.fill();
  }
  if (o.coat > 0 && o.hood > 0.5) {
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * 0.2, -0.36); c.quadraticCurveTo(s * 0.4, -0.85 + o.earBack * 0.3, s * (0.45 + o.earBack * 0.3), -0.86 + o.earBack * 0.4); c.lineTo(s * 0.56, -0.3); c.closePath();
      c.fillStyle = rgba(shade(fur, -0.05)); c.fill();
    }
  }
  if (o.pawUp > 0) { // raised paw (scratching)
    c.strokeStyle = rgba(fur); c.lineWidth = 0.17; c.lineCap = 'round';
    const k = o.pawUp, sx = 0.35;
    c.beginPath(); c.moveTo(sx, 0.7); c.quadraticCurveTo(sx + 0.15, 0.2 - k * 0.3, sx + 0.05, -0.2 - k * 0.5 + Math.sin(o.t * 18) * 0.08 * k); c.stroke();
  }
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- from above
function drawCatTop(o) {
  o = catOpts(Object.assign({ curl: 0, legsOut: 0 }, o));
  const c = ctx, pal = o.pal;
  const fur = furCol(o, pal.fur), dark = furCol(o, pal.dark), light = furCol(o, pal.light);
  c.save();
  c.scale(o.size, o.size);
  // legs
  c.fillStyle = rgba(shade(fur, -0.1));
  for (const [x, y] of [[-0.42, -0.3], [0.42, -0.3], [-0.4, 0.45], [0.4, 0.45]]) {
    const k = o.legsOut;
    ellipse(x * (1 + k * 0.6) + Math.sin(o.t * 9 + x * 5) * 0.05 * k, y + Math.cos(o.t * 9 + y * 4) * 0.08 * k, 0.12, 0.17); c.fill();
  }
  // tail
  c.strokeStyle = rgba(fur); c.lineWidth = 0.2; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 0.75);
  c.bezierCurveTo(0.1 + o.curl * 0.6, 1.25, 0.6 + o.curl * 0.3, 1.1 - o.curl * 0.6, 0.5 + o.sway * 0.3, 0.6 - o.curl * 0.4); c.stroke();
  if (o.tabby) { c.setLineDash([0.1, 0.13]); c.strokeStyle = rgba(dark, 0.7); c.stroke(); c.setLineDash([]); }
  ellipse(0, 0.12, 0.44, 0.74);
  c.fillStyle = rgba(fur); c.fill();
  if (o.tabby) {
    c.save(); ellipse(0, 0.12, 0.44, 0.74); c.clip();
    c.strokeStyle = rgba(dark, 0.6); c.lineWidth = 0.08;
    c.beginPath(); for (let k = 0; k < 6; k++) { const y = -0.45 + k * 0.22; c.moveTo(-0.5, y); c.quadraticCurveTo(0, y - 0.1, 0.5, y); } c.stroke();
    c.restore();
  }
  if (o.coat > 0) {
    ellipse(0, 0.02, 0.5, 0.66);
    c.fillStyle = rgba(COAT.base); c.fill();
    c.strokeStyle = rgba(COAT.line, 0.8); c.lineWidth = 0.03; c.stroke();
    c.fillStyle = rgba(COAT.hi, 0.5); ellipse(-0.18, -0.1, 0.08, 0.35); c.fill();
  }
  // head
  c.save(); c.translate(0, -0.8);
  for (const s of [-1, 1]) {
    c.beginPath(); c.moveTo(s * 0.12, -0.2); c.lineTo(s * 0.4, -0.55); c.lineTo(s * 0.42, -0.05); c.closePath();
    c.fillStyle = rgba(fur); c.fill();
    c.beginPath(); c.moveTo(s * 0.2, -0.2); c.lineTo(s * 0.37, -0.43); c.lineTo(s * 0.37, -0.12); c.closePath();
    c.fillStyle = rgba(pal.inner, 0.8); c.fill();
  }
  circle(0, 0, 0.44); c.fillStyle = rgba(shade(fur, 0.05)); c.fill();
  if (o.coat > 0 && o.hood > 0.5) { c.beginPath(); c.arc(0, 0.05, 0.47, 0.2, Math.PI - 0.2); c.strokeStyle = rgba(COAT.base); c.lineWidth = 0.16; c.stroke(); }
  if (o.tabby) { c.strokeStyle = rgba(dark, 0.6); c.lineWidth = 0.05; c.beginPath(); for (let k = -1; k <= 1; k++) { c.moveTo(k * 0.12, -0.35); c.lineTo(k * 0.1, -0.05); } c.stroke(); }
  // closed eyes / nose
  c.strokeStyle = '#2a1a12'; c.lineWidth = 0.03;
  c.beginPath(); c.moveTo(-0.24, -0.3); c.quadraticCurveTo(-0.16, -0.26, -0.08, -0.3); c.moveTo(0.08, -0.3); c.quadraticCurveTo(0.16, -0.26, 0.24, -0.3); c.stroke();
  c.fillStyle = rgba(light); ellipse(0, -0.36, 0.14, 0.08); c.fill();
  c.restore();
  c.restore();
}

// ---------------------------------------------------------------- big eye close-up
// local: eye radius ~1; o.open 0..1; o.reflect(ctx) draws inside pupil
function drawBigEye(o) {
  const c = ctx, pal = o.pal || PAL.pip;
  const fur = furCol(o, pal.fur);
  // fur field
  c.fillStyle = rgba(shade(fur, -0.15));
  c.fillRect(-6, -6, 12, 12);
  c.save();
  c.lineCap = 'round';
  const r = rng(42);
  for (let i = 0; i < 520; i++) {
    const a = r() * TAU, d = 1.05 + r() * 4.5;
    const x = Math.cos(a) * d * 1.15, y = Math.sin(a) * d;
    c.strokeStyle = rgba(r() < 0.25 ? pal.dark : r() < 0.5 ? shade(fur, 0.2) : fur, 0.75);
    c.lineWidth = 0.035 + r() * 0.04;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a + 0.3) * 0.35, y + Math.sin(a + 0.3) * 0.35 + 0.12); c.stroke();
  }
  c.restore();
  const op = clamp(o.open ?? 1);
  // eye socket
  c.save();
  c.beginPath(); c.ellipse(0, 0, 1.08, 0.9 * Math.max(op, 0.02), 0, 0, TAU);
  c.fillStyle = '#1d120c'; c.fill();
  c.beginPath(); c.ellipse(0, 0, 1.0, 0.84 * Math.max(op, 0.02), 0, 0, TAU); c.clip();
  const ig = c.createRadialGradient(0, 0.2, 0.05, 0, 0, 1.0);
  ig.addColorStop(0, rgba(shade(pal.eye, 0.5))); ig.addColorStop(0.5, rgba(pal.eye)); ig.addColorStop(0.92, rgba(shade(pal.eye, -0.5))); ig.addColorStop(1, '#2a1607');
  c.fillStyle = ig; c.fillRect(-1.2, -1, 2.4, 2);
  // fibres
  const r2 = rng(9);
  for (let i = 0; i < 140; i++) {
    const a = r2() * TAU;
    c.strokeStyle = r2() < 0.5 ? 'rgba(255,240,180,0.25)' : 'rgba(120,60,10,0.3)';
    c.lineWidth = 0.01 + r2() * 0.02;
    c.beginPath(); c.moveTo(Math.cos(a) * 0.3, Math.sin(a) * 0.4); c.lineTo(Math.cos(a) * 0.95, Math.sin(a) * 0.84); c.stroke();
  }
  // pupil
  const pw = 0.3 + (o.pupil ?? 0.5) * 0.25;
  c.beginPath(); c.ellipse(0, 0, pw, 0.72, 0, 0, TAU);
  c.fillStyle = '#050302'; c.fill();
  if (o.reflect) { c.save(); c.beginPath(); c.ellipse(0, 0, 0.98, 0.83, 0, 0, TAU); c.clip(); o.reflect(); c.restore(); }
  // highlights
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.beginPath(); c.moveTo(-0.55, -0.5); c.quadraticCurveTo(-0.3, -0.65, -0.12, -0.55); c.lineTo(-0.2, -0.28); c.quadraticCurveTo(-0.42, -0.3, -0.6, -0.22); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.6)'; circle(0.45, 0.42, 0.06); c.fill();
  c.restore();
  // lids
  c.fillStyle = rgba(fur);
  c.beginPath(); c.ellipse(0, 0, 1.1, 0.92 * Math.max(op, 0.02), 0, 0, TAU); c.rect(2, -2, -4, 4); c.fill('evenodd');
  c.strokeStyle = '#1d120c'; c.lineWidth = 0.06;
  c.beginPath(); c.ellipse(0, 0, 1.06, 0.88 * Math.max(op, 0.02), 0, Math.PI, TAU); c.stroke();
}

// ---------------------------------------------------------------- props
function drawRaft(o = {}) {
  const c = ctx;
  const top = o.top ?? 0.55;   // visible depth of top face
  const wet = o.wet ?? 0.4;
  c.save();
  c.rotate(o.tilt ?? 0);
  // bottles underneath
  for (let i = 0; i < 5; i++) {
    const x = -1.45 + i * 0.72;
    c.fillStyle = 'rgba(160,215,235,0.55)';
    ellipse(x, 0.3, 0.3, 0.16); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)'; ellipse(x - 0.08, 0.24, 0.16, 0.04); c.fill();
    c.fillStyle = i % 2 ? '#E8453C' : '#2E86DE'; rrect(x + 0.28, 0.24, 0.1, 0.12, 0.02); c.fill();
  }
  // front edge
  c.fillStyle = mixHex('#5d3a1c', '#3a2412', wet);
  c.fillRect(-1.75, 0, 3.5, 0.24);
  // top face
  c.beginPath();
  c.moveTo(-1.75, 0); c.lineTo(1.75, 0); c.lineTo(1.6, -top); c.lineTo(-1.6, -top); c.closePath();
  const g = c.createLinearGradient(0, -top, 0, 0);
  g.addColorStop(0, mixHex('#a56d39', '#6e4524', wet)); g.addColorStop(1, mixHex('#8a5a2e', '#563719', wet));
  c.fillStyle = g; c.fill();
  // door panels
  c.strokeStyle = 'rgba(50,28,12,0.55)'; c.lineWidth = 0.03;
  c.beginPath();
  c.moveTo(-1.45, -0.08); c.lineTo(-0.1, -0.08); c.lineTo(-0.12, -top + 0.08); c.lineTo(-1.35, -top + 0.08); c.closePath();
  c.moveTo(0.1, -0.08); c.lineTo(1.45, -0.08); c.lineTo(1.35, -top + 0.08); c.lineTo(0.12, -top + 0.08); c.closePath();
  c.stroke();
  c.strokeStyle = 'rgba(255,220,170,0.12)'; c.lineWidth = 0.02;
  c.beginPath(); for (let k = 1; k < 4; k++) { const y = -top * k / 4; c.moveTo(-1.6, y); c.lineTo(1.6, y + 0.01); } c.stroke();
  // knob
  c.fillStyle = '#D9A93F'; circle(1.5, -top * 0.5, 0.06); c.fill();
  // lace bands
  for (const x of [-0.95, 0.95]) {
    c.strokeStyle = '#D7263D'; c.lineWidth = 0.07;
    c.beginPath(); c.moveTo(x - 0.05, -top); c.lineTo(x + 0.02, 0); c.lineTo(x + 0.02, 0.3); c.stroke();
    c.strokeStyle = 'rgba(255,190,190,0.6)'; c.lineWidth = 0.02;
    c.beginPath(); c.moveTo(x - 0.06, -top); c.lineTo(x + 0.01, 0); c.stroke();
  }
  c.restore();
}
function mixHex(a, b, t) { return rgba(mix(a, b, clamp(t))); }

function drawPlank(len = 1.6) {
  const c = ctx;
  c.fillStyle = '#9A6A3A'; rrect(-len / 2, -0.07, len, 0.14, 0.05); c.fill();
  c.strokeStyle = 'rgba(60,35,15,0.6)'; c.lineWidth = 0.015;
  c.beginPath(); c.moveTo(-len / 2 + 0.1, -0.02); c.lineTo(len / 2 - 0.1, -0.015); c.moveTo(-len / 2 + 0.2, 0.03); c.lineTo(len / 2 - 0.2, 0.035); c.stroke();
}

function drawBox(o = {}) {
  const c = ctx;
  const w = o.w ?? 5.6, h = o.h ?? 4.2, d = o.d ?? 2.4;
  const wet = o.wet ?? 0;
  const dx = d * 0.55, dy = -d * 0.32;
  const front = mixHex('#C99A5A', '#7d5a2e', wet), side = mixHex('#A47941', '#5e4220', wet), flap = mixHex('#DDB06E', '#8a6a3a', wet);
  c.save();
  c.rotate(o.tilt ?? 0);
  // back flap
  c.fillStyle = side;
  poly([[-w / 2 + dx, -h + dy], [w / 2 + dx, -h + dy], [w / 2 + dx - 0.3, -h + dy - 1.4], [-w / 2 + dx + 0.3, -h + dy - 1.5]]); c.fill();
  // interior dark
  c.fillStyle = '#2a1a0e';
  poly([[-w / 2, -h], [w / 2, -h], [w / 2 + dx, -h + dy], [-w / 2 + dx, -h + dy]]); c.fill();
  // blanket
  c.fillStyle = mixHex('#B23A3A', '#5a1c1c', wet);
  poly([[-w / 2 + 0.3, -h + 0.05], [w / 2 - 0.4, -h + 0.05], [w / 2 - 0.6, -h + 1.4], [-w / 2 + 1.2, -h + 1.1]]); c.fill();
  c.strokeStyle = 'rgba(255,230,200,0.35)'; c.lineWidth = 0.06;
  c.beginPath(); for (let k = 0; k < 5; k++) { const x = -w / 2 + 0.6 + k * 0.9; c.moveTo(x, -h + 0.05); c.lineTo(x - 0.1, -h + 1.2); } c.stroke();
  // side face
  c.fillStyle = side;
  poly([[w / 2, 0], [w / 2, -h], [w / 2 + dx, -h + dy], [w / 2 + dx, dy]]); c.fill();
  // front face
  c.fillStyle = front; c.fillRect(-w / 2, -h, w, h);
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(-w / 2, -h * 0.3, w, h * 0.3);
  // tape & print
  c.fillStyle = 'rgba(230,200,140,0.8)'; c.fillRect(-0.4, -h, 0.8, h * 0.35);
  c.strokeStyle = 'rgba(60,35,15,0.55)'; c.lineWidth = 0.12; c.lineCap = 'round';
  c.beginPath();
  for (const x of [-1.7, -1.1]) { c.moveTo(x, -1.0); c.lineTo(x, -2.0); c.moveTo(x - 0.25, -1.7); c.lineTo(x, -2.0); c.lineTo(x + 0.25, -1.7); }
  c.stroke();
  // front flap open forward
  c.fillStyle = flap;
  poly([[-w / 2, -h], [w / 2, -h], [w / 2 - 0.2, -h - 0.6 - (o.flapUp ?? 0)], [-w / 2 + 0.2, -h - 0.7 - (o.flapUp ?? 0)]]); c.fill();
  // edge dark lines
  c.strokeStyle = 'rgba(60,35,15,0.4)'; c.lineWidth = 0.04;
  c.strokeRect(-w / 2, -h, w, h);
  if (wet > 0.3) { // sagging / torn
    c.fillStyle = 'rgba(30,20,10,0.35)';
    poly([[-w / 2, -0.8], [-w / 2 + 1.5, -1.2], [-w / 2 + 2.4, -0.4], [-w / 2 + 1, 0]]); c.fill();
  }
  c.restore();
}

function drawCrate(o = {}) {
  const c = ctx;
  const s = o.s ?? 3;
  const wet = o.wet ?? 0;
  c.save(); c.rotate(o.tilt ?? 0);
  const dx = s * 0.22, dy = -s * 0.16;
  c.fillStyle = mixHex('#8a5d33', '#4d331c', wet);
  poly([[s / 2, 0], [s / 2, -s], [s / 2 + dx, -s + dy], [s / 2 + dx, dy]]); c.fill();
  c.fillStyle = mixHex('#b07d48', '#6b4a28', wet);
  poly([[-s / 2, -s], [s / 2, -s], [s / 2 + dx, -s + dy], [-s / 2 + dx, -s + dy]]); c.fill();
  c.fillStyle = '#2a1a0e'; c.fillRect(-s / 2, -s, s, s);
  c.fillStyle = mixHex('#a87543', '#5e4022', wet);
  for (let k = 0; k < 4; k++) c.fillRect(-s / 2, -s + k * s * 0.26, s, s * 0.19);
  c.fillRect(-s / 2, -s, s * 0.14, s); c.fillRect(s / 2 - s * 0.14, -s, s * 0.14, s);
  c.strokeStyle = 'rgba(40,22,8,0.5)'; c.lineWidth = 0.04; c.strokeRect(-s / 2, -s, s, s);
  c.fillStyle = 'rgba(30,30,30,0.7)';
  for (const [x, y] of [[-s * 0.43, -s * 0.9], [s * 0.43, -s * 0.9], [-s * 0.43, -s * 0.12], [s * 0.43, -s * 0.12]]) { circle(x, y, 0.05); c.fill(); }
  c.restore();
}

function drawBottle(o = {}) {
  const c = ctx;
  c.save(); c.rotate(o.rot ?? 0);
  c.fillStyle = 'rgba(160,215,235,0.6)';
  rrect(-0.45, -0.15, 0.75, 0.3, 0.12); c.fill();
  c.beginPath(); c.moveTo(0.3, -0.12); c.quadraticCurveTo(0.42, -0.06, 0.48, -0.06); c.lineTo(0.48, 0.06); c.quadraticCurveTo(0.42, 0.06, 0.3, 0.12); c.fill();
  c.fillStyle = o.cap ?? '#2E86DE'; rrect(0.48, -0.07, 0.1, 0.14, 0.02); c.fill();
  c.fillStyle = 'rgba(255,255,255,0.55)'; rrect(-0.38, -0.11, 0.55, 0.05, 0.02); c.fill();
  c.fillStyle = 'rgba(40,140,90,0.55)'; c.fillRect(-0.2, -0.15, 0.25, 0.3);
  c.restore();
}

function drawBarrel(o = {}) {
  const c = ctx;
  c.save(); c.rotate(o.rot ?? 0);
  c.fillStyle = '#7b4f2a';
  c.beginPath(); c.moveTo(-1, -1.4); c.quadraticCurveTo(-1.25, 0, -1, 1.4); c.lineTo(1, 1.4); c.quadraticCurveTo(1.25, 0, 1, -1.4); c.closePath(); c.fill();
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0.3, -1.4, 0.8, 2.8);
  c.fillStyle = '#3d3d42';
  for (const y of [-1.0, -0.3, 0.3, 1.0]) c.fillRect(-1.15, y - 0.08, 2.3, 0.16);
  c.fillStyle = '#9a6a3c'; ellipse(0, -1.4, 1.0, 0.25); c.fill();
  c.restore();
}

function drawSign(o = {}) { // hanging bakery sign, origin at bracket
  const c = ctx;
  c.strokeStyle = '#2b2b30'; c.lineWidth = 0.12;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(3.4, 0); c.stroke();
  c.save(); c.translate(1.7, 0); c.rotate(o.swing ?? 0);
  c.strokeStyle = '#3a3a40'; c.lineWidth = 0.05;
  c.beginPath(); c.moveTo(-1.1, 0); c.lineTo(-1.1, 0.6); c.moveTo(1.1, 0); c.lineTo(1.1, 0.6); c.stroke();
  c.fillStyle = '#6d2f2a'; rrect(-1.5, 0.6, 3, 1.8, 0.2); c.fill();
  c.strokeStyle = '#d9a93f'; c.lineWidth = 0.08; rrect(-1.35, 0.75, 2.7, 1.5, 0.15); c.stroke();
  // bread pictogram
  c.fillStyle = '#e0a458'; ellipse(0, 1.5, 0.85, 0.42); c.fill();
  c.strokeStyle = '#8a5524'; c.lineWidth = 0.07;
  c.beginPath(); for (const x of [-0.4, 0, 0.4]) { c.moveTo(x - 0.12, 1.32); c.lineTo(x + 0.12, 1.66); } c.stroke();
  c.restore();
}

function drawLampPost(h = 9, lit = 1) {
  const c = ctx;
  c.fillStyle = '#1e2329';
  c.fillRect(-0.12, -h, 0.24, h);
  c.fillRect(-0.3, -0.4, 0.6, 0.4);
  c.beginPath(); c.moveTo(-0.45, -h); c.lineTo(0.45, -h); c.lineTo(0.3, -h - 0.25); c.lineTo(-0.3, -h - 0.25); c.fill();
  c.fillStyle = lit ? `rgba(255,${200 + 30 * lit},${120 + 40 * lit},1)` : '#3a3f46';
  poly([[-0.38, -h - 0.25], [0.38, -h - 0.25], [0.3, -h - 1.2], [-0.3, -h - 1.2]]); c.fill();
  c.fillStyle = '#1e2329';
  poly([[-0.5, -h - 1.2], [0.5, -h - 1.2], [0, -h - 1.7]]); c.fill();
}
