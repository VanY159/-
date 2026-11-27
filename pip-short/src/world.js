// ============================================================
//  Environments: river & bridge, streets, interior, alley,
//  underwater, dawn town. Lighting presets.
// ============================================================
'use strict';

// ---------------------------------------------------------------- lighting presets
const LIGHTS = {
  sunset: {
    sky: ['#4a5f97', '#e9826b', '#ffc77c'], sun: '#ffd88a', sunA: 1,
    stone: '#b39a84', stoneDark: '#7c6553', vault: '#3b2b27', ledge: '#9b8676', wall: '#a48c78',
    waterFar: '#ffb478', waterNear: '#41566a', waterHi: '#ffe0b0', fog: '#f4b48a', fogA: 0.18,
    mult: '#fff0e0', multA: 1, cloud: '#f7b59a', cloudA: 0.55, lamp: 0, windows: 0.15,
  },
  dusk: {
    sky: ['#1c2742', '#4b3d60', '#8f6b84'], sun: '#ff9e7a', sunA: 0.25,
    stone: '#6f6b76', stoneDark: '#4a4652', vault: '#201f29', ledge: '#5a5866', wall: '#625e6c',
    waterFar: '#8b7aa2', waterNear: '#232d3d', waterHi: '#c9b3d6', fog: '#4b4462', fogA: 0.22,
    mult: '#c4bcd8', multA: 1, cloud: '#3c3550', cloudA: 0.85, lamp: 0.6, windows: 0.6,
  },
  night: {
    sky: ['#03080d', '#0a1924', '#183444'], sun: '#000000', sunA: 0,
    stone: '#46525d', stoneDark: '#2a333c', vault: '#10151b', ledge: '#323d47', wall: '#3a4550',
    waterFar: '#2d4e60', waterNear: '#0b1620', waterHi: '#8fb4c8', fog: '#1b3240', fogA: 0.3,
    mult: '#a9bccf', multA: 1, cloud: '#1a2a36', cloudA: 0.95, lamp: 1, windows: 1,
  },
  dawn: {
    sky: ['#5f7fb8', '#f2a896', '#ffd394'], sun: '#fff1c8', sunA: 1,
    stone: '#a99b94', stoneDark: '#756a66', vault: '#3a3036', ledge: '#958a86', wall: '#9a8e88',
    waterFar: '#ffc898', waterNear: '#56668a', waterHi: '#fff2d6', fog: '#f6c2a4', fogA: 0.2,
    mult: '#fff4ec', multA: 1, cloud: '#ffc9b8', cloudA: 0.6, lamp: 0, windows: 0.1,
  },
};
function lightMix(a, b, t) {
  if (typeof a === 'string') a = LIGHTS[a];
  if (typeof b === 'string') b = LIGHTS[b];
  if (t <= 0) return a;
  if (t >= 1) return b;
  const o = {};
  for (const k in a) {
    const va = a[k], vb = b[k];
    if (Array.isArray(va)) o[k] = va.map((c, i) => mix(c, vb[i], t));
    else if (typeof va === 'number') o[k] = lerp(va, vb, t);
    else o[k] = mix(va, vb, t);
  }
  return o;
}

const WORLD = {};
const BR = { zF: 36, zB: 46, cx: -6, R: 26, spring: -6, top: -40, x0: -120, x1: 120, ledgeX0: -4, ledgeX1: 20, wallL: -50 };

// ---------------------------------------------------------------- init (sprites, procedural layouts)
function initWorld() {
  const r = rng(2024);
  // bridge face stones (local coords = world x,y on face)
  const stones = [];
  const inOpening = (x, y) => {
    if (x < BR.cx - BR.R - 0.3 || x > BR.cx + BR.R + 0.3) return false;
    if (y >= BR.spring) return true;
    const dx = x - BR.cx, dy = y - BR.spring;
    return dx * dx + dy * dy < (BR.R + 3.4) * (BR.R + 3.4);
  };
  for (let y = BR.top; y < 2; y += 2.2) {
    let x = BR.x0 + (r() * 3);
    while (x < BR.x1) {
      const w = 3 + r() * 3.5;
      const cx = x + w / 2, cy = y + 1.1;
      if (!inOpening(cx, cy)) stones.push({ x, y, w: w - 0.25, h: 1.95, c: r() });
      x += w;
    }
  }
  const vous = [];
  const N = 27;
  for (let i = 0; i < N; i++) {
    const a0 = Math.PI + (i / N) * Math.PI, a1 = Math.PI + ((i + 1) / N) * Math.PI;
    vous.push({ a0, a1, c: r(), key: i === Math.floor(N / 2) });
  }
  WORLD.stones = stones; WORLD.vous = vous;
  // cracks / falling stones (picked from stones near crown)
  WORLD.fallers = stones.filter((s) => Math.abs(s.x + s.w / 2 - BR.cx) < 22 && s.y > BR.top + 1 && s.y < BR.spring - BR.R + 2)
    .map((s, i) => Object.assign({}, s, { ts: hash(i * 3.7), vx: (hash(i * 1.3) - 0.5) * 3, spin: (hash(i * 2.9) - 0.5) * 4 }));
  // city sprites
  WORLD.cityDay = makeCity(false, 11);
  WORLD.cityNight = makeCity(true, 11);
  WORLD.clouds = makeClouds(5);
  WORLD.storm = makeClouds(9, true);
  // street-side houses (facade plane, local x along street)
  WORLD.streetHouses = makeHouses(-70, 140, 77);
  // canal houses (left and right, along z)
  WORLD.canalL = makeHouses(-320, 0, 91);
  WORLD.canalR = makeHouses(-320, 0, 57);
}

function makeCity(night, seed) {
  const w = 2400, h = 600;
  const c = makeCanvas(w, h), x = c.getContext('2d');
  const r = rng(seed);
  for (let row = 0; row < 3; row++) {
    let px = -30;
    const base = h - row * 18;
    while (px < w) {
      const bw = 40 + r() * 60, bh = 90 + r() * 110 + (2 - row) * 50;
      const dayCols = ['#c48f86', '#b9877f', '#d4a08c', '#a77d84'];
      const col = night ? ['#0b1620', '#0f1c27', '#132430'][row] : dayCols[Math.floor(r() * 4)];
      x.fillStyle = col;
      x.fillRect(px, base - bh, bw, bh);
      x.beginPath();
      const roofH = 20 + r() * 34;
      x.moveTo(px - 4, base - bh); x.lineTo(px + bw / 2, base - bh - roofH); x.lineTo(px + bw + 4, base - bh); x.fill();
      if (r() < 0.5) x.fillRect(px + bw * 0.65, base - bh - roofH * 0.8, 8, roofH * 0.6);
      if (row === 0 && r() < 0.07) { // church tower with dome
        x.fillRect(px + bw / 2 - 14, base - bh - 170, 28, 170);
        x.beginPath(); x.arc(px + bw / 2, base - bh - 170, 18, Math.PI, TAU); x.fill();
        x.fillRect(px + bw / 2 - 2, base - bh - 215, 4, 30);
      }
      for (let wy = base - bh + 16; wy < base - 14; wy += 26) for (let wx = px + 8; wx < px + bw - 10; wx += 16) {
        const lit = r() < (night ? 0.28 : 0.0);
        if (!lit && night) continue;
        x.fillStyle = lit ? `rgba(255,${185 + r() * 45},${105 + r() * 40},0.95)` : 'rgba(255,230,200,0.35)';
        x.fillRect(wx, wy, 7, 11);
      }
      px += bw + r() * 4;
    }
  }
  return c;
}

function makeClouds(seed, storm) {
  const w = 1000, h = 450;
  const c = makeCanvas(w, h), x = c.getContext('2d');
  const r = rng(seed);
  for (let i = 0; i < (storm ? 90 : 46); i++) {
    const cx = r() * w, cy = h * (0.25 + r() * 0.6), rad = 30 + r() * (storm ? 110 : 80);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const a = storm ? 0.5 : 0.35;
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(0.6, `rgba(255,255,255,${a * 0.5})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }
  return c;
}

const FACADE_COLS = ['#5f8a8b', '#c9a15b', '#b46a5a', '#d9cdb4', '#7d6a8a', '#8aa36b', '#c78a6a', '#6a7f9a'];
function makeHouses(a, b, seed) {
  const r = rng(seed);
  const list = [];
  let u = a;
  while (u < b) {
    const w = 9 + r() * 6;
    const h = 16 + r() * 12;
    const cols = Math.max(2, Math.floor(w / 3.6));
    const rows = Math.floor((h - 4) / 4.2);
    const wins = [];
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) wins.push({ i, j, lit: r() < 0.45, warm: r(), curtain: r() < 0.4 });
    list.push({ u0: u, u1: u + w, h, color: FACADE_COLS[Math.floor(r() * FACADE_COLS.length)], cols, rows, wins, roof: r(), chimney: r() < 0.6, awning: r() < 0.35, awnCol: r() < 0.5 ? '#b23a3a' : '#2f6d5a' });
    u += w + 0.15;
  }
  return list;
}

// ---------------------------------------------------------------- sky
function drawSky(L, t, o = {}) {
  const hz = horizonY();
  ctx.save();
  ctx.fillStyle = vgrad(hz - 1700, hz + 40, [[0, L.sky[0]], [0.62, L.sky[1]], [1, L.sky[2]]]);
  ctx.fillRect(-OVER, -OVER, W + OVER * 2, hz + OVER + 40);
  ctx.fillStyle = rgba(L.sky[2]);
  ctx.fillRect(-OVER, hz + 39, W + OVER * 2, H + OVER);
  ctx.restore();
  // sun
  if (L.sunA > 0.01) {
    const sp = P(o.sunX ?? -6, o.sunY ?? -60, 3000);
    if (sp) {
      glow(sp.x, sp.y, 900, L.sun, 0.45 * L.sunA);
      glow(sp.x, sp.y, 260, L.sun, 0.8 * L.sunA);
      ctx.fillStyle = rgba(shade(L.sun, 0.5), L.sunA);
      circle(sp.x, sp.y, 70 * (o.sunSize ?? 1)); ctx.fill();
    }
  }
  // clouds (far billboard), tinted per light
  const cl = tintedClouds(o.storm ? WORLD.storm : WORLD.clouds, L.cloud);
  const drift = t * (o.cloudSpeed ?? 4);
  for (let k = 0; k < 2; k++) {
    const z = 2200 - k * 700;
    const p = P(-1400 + mod(drift * (1 + k), 900) - 450 + k * 300, (o.cloudY ?? -520) - k * 120, z);
    if (!p) continue;
    const w = 3600 * p.s, h = 1500 * p.s;
    ctx.save();
    ctx.globalAlpha = L.cloudA * (o.cloudA ?? 1);
    ctx.drawImage(cl, p.x - w * 0.1, p.y, w, h);
    ctx.restore();
  }
}
function tintedClouds(src, col) {
  const c = WORLD._cloudTint || (WORLD._cloudTint = makeCanvas(src.width, src.height));
  const x = c.getContext('2d');
  x.globalCompositeOperation = 'copy';
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-atop';
  x.fillStyle = rgba(col);
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
  return c;
}

function drawCity(L, z, baseY, night) {
  const img = night ? WORLD.cityNight : WORLD.cityDay;
  const ww = 1300, hh = ww * img.height / img.width;
  const p = P(-ww / 2 - 6, baseY - hh, z);
  if (!p) return;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.drawImage(img, p.x, p.y, ww * p.s, hh * p.s);
  ctx.restore();
  // atmospheric haze
  const hz = horizonY();
  ctx.fillStyle = vgrad(p.y, hz + 10, [[0, L.fog, 0], [1, L.fog, L.fogA * 2.2]]);
  ctx.fillRect(-OVER, p.y, W + OVER * 2, hz + 10 - p.y);
}

// ---------------------------------------------------------------- water plane
function drawWater(L, t, level, x0, x1, z0, z1, o = {}) {
  const zA = Math.max(z0, cam.z + 0.3);
  if (zA >= z1) return;
  if (!path3([[x0, level, zA], [x1, level, zA], [x1, level, z1], [x0, level, z1]])) return;
  const hz = horizonY();
  const pn = P(0, level, zA);
  const yNear = pn ? pn.y : H + OVER;
  const pf = P(0, level, z1);
  const yFar = pf ? pf.y : hz;
  ctx.save();
  ctx.clip();
  const gy0 = hz, gy1 = hz + Math.max(300, (level - cam.y) * cam.F / 3);
  ctx.fillStyle = vgrad(gy0, gy1, [[0, L.waterFar], [0.3, mix(L.waterFar, L.waterNear, 0.55)], [1, L.waterNear]]);
  ctx.fillRect(-OVER, Math.min(yFar, hz) - 2, W + OVER * 2, Math.max(yNear, H + OVER) - Math.min(yFar, hz) + 4);
  // reflections of lights
  if (o.lights) for (const lt of o.lights) {
    const pw = P(lt[0], level, Math.max(lt[2], zA + 0.5));
    if (!pw) continue;
    const a = lt[4] ?? 0.5;
    const len = (o.reflLen ?? 900);
    for (let k = 0; k < 14; k++) {
      const yy = pw.y + k * len / 14;
      const wob = Math.sin(t * 3 + k * 1.7 + lt[0]) * 10 * (1 + k * 0.3);
      const ww = (lt[3] ?? 2) * pw.s * (0.6 + k * 0.08);
      ctx.fillStyle = rgba(lt[5] ?? '#ffd08a', a * (1 - k / 14));
      ctx.fillRect(pw.x - ww / 2 + wob, yy, ww, len / 14 * 0.95);
    }
  }
  // waves (3D rows, flowing along +z)
  const amp = o.amp ?? 0.08, speed = o.flow ?? 0.6, rough = o.rough ?? 0;
  const rows = o.rows ?? 26;
  ctx.lineCap = 'round';
  for (let k = 0; k < rows; k++) {
    const dz = 1.2 * Math.pow(1.16, k);
    const z = cam.z + 1.5 + mod(dz + t * speed * (1 + k * 0.02), dz * 1.16 + 1) + dz * 0.2;
    if (z < zA || z > z1) continue;
    const pts = [];
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const x = lerp(Math.max(x0, cam.x - z * 0.8 - 6), Math.min(x1, cam.x + z * 0.8 + 6), i / n);
      const y = level + Math.sin(x * 0.45 + t * 1.8 + k * 1.3) * amp * (1 + rough * 2) + Math.sin(x * 1.3 - t * 2.6 + k) * amp * 0.4;
      pts.push([x, y, z]);
    }
    const p0 = P(0, level, z);
    const fade = clamp(1 - (z - cam.z) / 140) * clamp((z - cam.z) / 5);
    line3(pts);
    ctx.strokeStyle = rgba(L.waterHi, (0.18 + rough * 0.25) * fade);
    ctx.lineWidth = clamp((0.05 + rough * 0.08) * (p0 ? p0.s : 1), 1, 5);
    ctx.stroke();
  }
  // foam for floods
  if (rough > 0.2) {
    for (let i = 0; i < 70; i++) {
      const d = 2 + hash(i * 1.7) * 50;
      const z = cam.z + mod(d + t * speed * 3, 52) + 1;
      const x = cam.x + (hash(i * 4.3) - 0.5) * z * 1.6;
      if (x < x0 || x > x1 || z < zA) continue;
      const p = P(x, level - 0.05, z);
      if (!p) continue;
      ctx.fillStyle = rgba('#dfeef5', 0.22 * rough * clamp(1 - z / 60));
      ellipse(p.x, p.y, Math.min(0.8 * p.s * (0.5 + hash(i)), 160), Math.min(0.12 * p.s, 14));
      ctx.fill();
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- bridge
function bridgeFacePath(x0 = BR.x0, x1 = BR.x1, bottom = 0) {
  ctx.beginPath();
  ctx.rect(x0, BR.top - 4.5, x1 - x0, bottom - (BR.top - 4.5));
  ctx.moveTo(BR.cx - BR.R, bottom + 1);
  ctx.lineTo(BR.cx - BR.R, BR.spring);
  ctx.arc(BR.cx, BR.spring, BR.R, Math.PI, TAU);
  ctx.lineTo(BR.cx + BR.R, bottom + 1);
  ctx.closePath();
}
// face in local coords (call inside at(0,0,z))
function drawBridgeFace(L, t, o = {}) {
  const c = ctx;
  const bottom = o.bottom ?? 3;
  bridgeFacePath(BR.x0, BR.x1, bottom);
  c.fillStyle = vgrad(BR.top, bottom, [[0, shade(L.stone, 0.05)], [1, L.stoneDark]]);
  c.fill('evenodd');
  c.save();
  bridgeFacePath(BR.x0, BR.x1, bottom);
  c.clip('evenodd');
  // stones
  const removed = o.removed || null;
  for (let i = 0; i < WORLD.stones.length; i++) {
    const s = WORLD.stones[i];
    if (s.y > bottom) continue;
    if (removed && removed.has(i)) continue;
    c.fillStyle = rgba(mix(L.stone, s.c < 0.5 ? L.stoneDark : shade(L.stone, 0.15), Math.abs(s.c - 0.5) * 1.4));
    rrect(s.x, s.y, s.w, s.h, 0.35);
    c.fill();
  }
  c.restore();
  if (removed) {
    c.save();
    if (o.erase) c.globalCompositeOperation = 'destination-out';
    c.fillStyle = o.erase ? '#000' : rgba(shade(L.vault, -0.3));
    for (const i of removed) { const s = WORLD.stones[i]; if (s) c.fillRect(s.x - 0.1, s.y - 0.1, s.w + 0.45, s.h + 0.45); }
    c.restore();
  }
  // voussoirs ring
  const R0 = BR.R, R1 = BR.R + 3.3;
  for (const v of WORLD.vous) {
    if (o.dropVous && o.dropVous(v)) {
      if (o.erase) {
        c.save(); c.globalCompositeOperation = 'destination-out';
        c.beginPath(); c.arc(BR.cx, BR.spring, R1 + 0.6, v.a0 - 0.01, v.a1 + 0.01); c.arc(BR.cx, BR.spring, R0 - 0.1, v.a1 + 0.01, v.a0 - 0.01, true); c.closePath();
        c.fill(); c.restore();
      }
      continue;
    }
    c.beginPath();
    c.arc(BR.cx, BR.spring, R1, v.a0 + 0.004, v.a1 - 0.004);
    c.arc(BR.cx, BR.spring, R0, v.a1 - 0.004, v.a0 + 0.004, true);
    c.closePath();
    c.fillStyle = rgba(mix(shade(L.stone, 0.08), L.stoneDark, v.c * 0.6));
    c.fill();
    if (v.key) { c.strokeStyle = rgba(shade(L.stone, 0.2)); c.lineWidth = 0.15; c.stroke(); }
  }
  // parapet + balusters
  c.fillStyle = rgba(shade(L.stone, 0.1));
  c.fillRect(BR.x0, BR.top - 1.2, BR.x1 - BR.x0, 1.2);
  c.fillStyle = rgba(L.stoneDark);
  for (let x = BR.x0; x < BR.x1; x += 2.2) { rrect(x + 0.5, BR.top - 4.4, 1.0, 3.2, 0.4); c.fill(); }
  c.fillStyle = rgba(shade(L.stone, 0.12));
  c.fillRect(BR.x0, BR.top - 5.2, BR.x1 - BR.x0, 0.9);
  // lamps on parapet
  for (const lx of [-46, 34]) {
    c.save(); c.translate(lx, BR.top - 5.2); drawLampPost(9, L.lamp); c.restore();
  }
  // cracks
  if (o.crack > 0) {
    c.strokeStyle = 'rgba(10,10,12,0.85)';
    c.lineWidth = 0.35; c.lineJoin = 'round';
    const rr = rng(55);
    for (let k = 0; k < 6; k++) {
      let x = BR.cx + (rr() - 0.5) * 8, y = BR.spring - BR.R - 2;
      const n = Math.floor(10 * clamp(o.crack * 1.4 - k * 0.12));
      c.beginPath(); c.moveTo(x, y);
      for (let i = 0; i < n; i++) { x += (rr() - 0.5) * 4 + (k - 2.5) * 0.6; y -= 1.2 + rr() * 1.4; c.lineTo(x, y); }
      c.stroke();
    }
  }
}
// rim light on intrados at night (lamp) etc.
function archPoint(a, z) { return [BR.cx + BR.R * Math.cos(a), BR.spring + BR.R * Math.sin(a), z]; }

function drawVault(L, bottom = 3) {
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI, a1 = Math.PI + ((i + 1) / n) * Math.PI;
    const k = Math.sin((a0 + a1) / 2 - Math.PI); // 0 at sides, 1 at crown
    const col = mix(shade(L.vault, 0.25), L.vault, k);
    fill3([archPoint(a0, BR.zF), archPoint(a1, BR.zF), archPoint(a1, BR.zB), archPoint(a0, BR.zB)], rgba(col));
  }
  // side walls of opening
  for (const s of [-1, 1]) {
    const x = BR.cx + s * BR.R;
    fill3([[x, BR.spring, BR.zF], [x, bottom, BR.zF], [x, bottom, BR.zB], [x, BR.spring, BR.zB]], rgba(shade(L.vault, 0.3)));
  }
  // courses lines on the vault
  ctx.strokeStyle = rgba(shade(L.vault, -0.4), 0.7);
  ctx.lineWidth = 1.2;
  for (let j = 1; j < 5; j++) {
    const z = lerp(BR.zF, BR.zB, j / 5);
    const pts = [];
    for (let i = 0; i <= 20; i++) pts.push(archPoint(Math.PI + (i / 20) * Math.PI, z));
    line3(pts); ctx.stroke();
  }
}

// ---------------------------------------------------------------- river world (A)
// o: { level, flood, rough, flow, crack, removed, dropVous, inside(), front(), night }
function drawRiver(L, t, o = {}) {
  const level = o.level ?? 2.5;
  const lights = [];
  const night = L.lamp > 0.3;
  drawSky(L, t, { storm: o.storm, sunX: o.sunX ?? -6, sunY: o.sunY ?? -26, cloudSpeed: o.storm ? 14 : 4 });
  drawCity(L, 420, -14, L.windows > 0.5);
  if (o.sky) o.sky();
  if (L.lamp > 0) {
    lights.push([-46, BR.top - 15, BR.zF, 2.2, 0.55 * L.lamp], [34, BR.top - 15, BR.zF, 2.2, 0.55 * L.lamp]);
    lights.push([17, -9, 14, 1.6, 0.5 * L.lamp]);
  }
  if (L.sunA > 0.3) lights.push([o.sunX ?? -6, -20, 3000, 30, 0.35 * L.sunA, L.sun]);
  const flooded = level < 0;
  const wx1 = flooded ? 60 : BR.ledgeX0;
  // far zone (beyond bridge)
  ledgeAndWalls(L, t, BR.zB, 600, level);
  drawWater(L, t, level, BR.wallL, wx1, BR.zB, 900, { lights: lights.filter((l) => l[2] > 100), amp: o.amp ?? 0.1, flow: o.flow ?? 0.8, rough: o.rough ?? 0 });
  // under vault zone
  ledgeAndWalls(L, t, BR.zF, BR.zB, level);
  drawWater(L, t, level, BR.wallL, wx1, BR.zF, BR.zB, { amp: o.amp ?? 0.1, flow: o.flow ?? 0.8, rough: o.rough ?? 0 });
  drawVault(L, Math.max(level, 0) + 0.5);
  // under-vault light (back opening glow)
  if (o.inside) o.inside();
  // face
  if (o.faceLayer) o.faceLayer(() => at(0, 0, BR.zF, () => drawBridgeFace(L, t, o)));
  else at(0, 0, BR.zF, () => drawBridgeFace(L, t, o));
  if (o.afterFace) o.afterFace();
  // near zone
  ledgeAndWalls(L, t, cam.z + 0.3, BR.zF, level);
  drawWater(L, t, level, BR.wallL, wx1, -400, BR.zF, { lights, amp: o.amp ?? 0.1, flow: o.flow ?? 0.8, rough: o.rough ?? 0, rows: 30 });
  if (L.lamp > 0) { // lamp post on path
    at(17, Math.min(0, level), 14, () => drawLampPost(9, L.lamp));
  }
  if (o.front) o.front();
  // lamp glows
  if (L.lamp > 0) {
    for (const lx of [-46, 34]) glow3(lx, BR.top - 5.2 - 9.7, BR.zF, 9, '#ffc070', 0.75 * L.lamp);
    glow3(17, -9.7 + Math.min(0, level), 14, 6, '#ffc070', 0.8 * L.lamp);
    // bank street lamps (bokeh)
    for (let z = 60; z < 400; z += 45) { glow3(24, -22, z, 3.5, '#ffbe6a', 0.6 * L.lamp); glow3(-54, -22, z + 20, 3.5, '#ffbe6a', 0.6 * L.lamp); }
  }
}

function ledgeAndWalls(L, t, z0, z1, level) {
  const zA = Math.max(z0, cam.z + 0.3);
  if (zA >= z1) return;
  // right embankment wall (x = ledgeX1), up to street level
  fill3([[BR.ledgeX1, 0.5, zA], [BR.ledgeX1, -14, zA], [BR.ledgeX1, -14, z1], [BR.ledgeX1, 0.5, z1]], rgba(L.wall));
  fill3([[BR.ledgeX1, -14, zA], [BR.ledgeX1 + 4, -14.6, zA], [BR.ledgeX1 + 4, -14.6, z1], [BR.ledgeX1, -14, z1]], rgba(shade(L.wall, 0.12)));
  // wall courses
  ctx.strokeStyle = rgba(shade(L.wall, -0.3), 0.6);
  ctx.lineWidth = 1;
  for (let y = -2; y > -14; y -= 2.4) { line3([[BR.ledgeX1 - 0.01, y, zA], [BR.ledgeX1 - 0.01, y, z1]]); ctx.stroke(); }
  // left embankment wall
  if (cam.x > BR.wallL) {
    fill3([[BR.wallL, level + 2, zA], [BR.wallL, -14, zA], [BR.wallL, -14, z1], [BR.wallL, level + 2, z1]], rgba(shade(L.wall, -0.1)));
  }
  // ledge (path) top
  fill3([[BR.ledgeX0, 0, zA], [BR.ledgeX1, 0, zA], [BR.ledgeX1, 0, z1], [BR.ledgeX0, 0, z1]], rgba(L.ledge));
  if (cam.x < BR.ledgeX0) fill3([[BR.ledgeX0, 0, zA], [BR.ledgeX0, 3, zA], [BR.ledgeX0, 3, z1], [BR.ledgeX0, 0, z1]], rgba(shade(L.ledge, -0.35)));
  // cobbles near camera
  const zc0 = Math.max(zA, cam.z + 0.5), zc1 = Math.min(z1, cam.z + 22);
  if (zc1 > zc0 && cam.y < 0) {
    for (let z = Math.floor(zc0); z < zc1; z += 1) for (let x = BR.ledgeX0 + 0.1; x < BR.ledgeX1 - 0.6; x += 1.25) {
      const off = (Math.floor(z) % 2) * 0.6;
      const xx = x + off;
      if (xx > BR.ledgeX1 - 0.6) continue;
      const hv = hash(xx * 3.1 + z * 7.7);
      fill3([[xx, -0.01, z + 0.06], [xx + 1.1, -0.01, z + 0.06], [xx + 1.1, -0.01, z + 0.92], [xx, -0.01, z + 0.92]], rgba(mix(L.ledge, hv < 0.5 ? shade(L.ledge, -0.18) : shade(L.ledge, 0.12), Math.abs(hv - 0.5) * 1.6)));
    }
  }
  // edge kerb highlight
  ctx.strokeStyle = rgba(shade(L.ledge, 0.2), 0.8);
  ctx.lineWidth = 2;
  line3([[BR.ledgeX0, 0, zA], [BR.ledgeX0, 0, z1]]); ctx.stroke();
}

// Puddle on the ledge reflecting the sky
function puddle(L, x, z, rx, rz, t) {
  const pts = [];
  for (let i = 0; i < 20; i++) { const a = (i / 20) * TAU; pts.push([x + Math.cos(a) * rx * (1 + 0.1 * Math.sin(a * 3)), -0.02, z + Math.sin(a) * rz]); }
  const pc = P(x, 0, z);
  if (pc && path3(pts)) {
    ctx.fillStyle = vgrad(pc.y - rz * pc.s, pc.y + rz * pc.s, [[0, mix(L.sky[0], L.sky[1], 0.5)], [0.6, mix(L.sky[1], '#ffffff', 0.1)], [1, mix(L.sky[2], '#ffffff', 0.3)]]);
    ctx.globalAlpha = 0.92; ctx.fill(); ctx.globalAlpha = 1;
    ctx.save(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, 0.06 * pc.s);
    for (let k = 0; k < 3; k++) { line3([[x - rx * 0.6 + k * 0.3, -0.03, z - rz * 0.2 + k * 0.25], [x + rx * 0.2 + k * 0.3, -0.03, z - rz * 0.25 + k * 0.25]]); ctx.stroke(); }
    ctx.restore();
    ctx.strokeStyle = rgba(shade(L.ledge, -0.35), 0.7); ctx.lineWidth = 3; ctx.stroke();
  }
}

// Big curling wave billboard (local: base at y=0, rises to -h)
function drawWave(L, h, w, t) {
  const c = ctx;
  const crest = (u) => -h * (0.72 + 0.28 * Math.sin(u * 4.2 + t * 1.6)) * (0.9 + 0.1 * Math.sin(u * 11 - t * 2.4));
  c.beginPath();
  c.moveTo(-w / 2, 1);
  for (let i = 0; i <= 40; i++) { const u = i / 40; c.lineTo(-w / 2 + u * w, crest(u)); }
  c.lineTo(w / 2, 1);
  c.closePath();
  c.fillStyle = vgrad(-h, 1, [[0, '#cfe6ef'], [0.12, '#5f93a6'], [0.45, '#1f4c60'], [1, '#0a1c28']]);
  c.fill();
  // streaks on the face of the wave
  c.strokeStyle = 'rgba(200,235,245,0.25)';
  c.lineWidth = h * 0.02;
  for (let k = 0; k < 7; k++) {
    c.beginPath();
    for (let i = 0; i <= 30; i++) { const u = i / 30, x = -w / 2 + u * w; const y = crest(u) * (0.85 - k * 0.1) + Math.sin(u * 20 + k + t * 3) * h * 0.02; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  // foam crest
  c.lineCap = 'round';
  for (const [lw, a] of [[0.16, 0.35], [0.08, 0.9]]) {
    c.strokeStyle = `rgba(235,246,252,${a})`;
    c.lineWidth = h * lw;
    c.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40; const x = -w / 2 + u * w; i ? c.lineTo(x, crest(u)) : c.moveTo(x, crest(u)); }
    c.stroke();
  }
  // spray streaks blowing off the crest
  c.strokeStyle = 'rgba(225,240,248,0.55)';
  c.lineWidth = h * 0.012;
  for (let i = 0; i < 46; i++) {
    const u = hash(i * 1.3), x = -w / 2 + u * w, y0 = crest(u);
    const ph = mod(t * 1.5 + hash(i * 4.1), 1);
    c.beginPath(); c.moveTo(x + ph * h * 0.3, y0 - ph * h * 0.25); c.lineTo(x + ph * h * 0.3 + h * 0.08, y0 - ph * h * 0.25 - h * 0.05); c.stroke();
  }
}

// ---------------------------------------------------------------- facades
function drawFacadeLocal(hs, L, night, o = {}) {
  const c = ctx;
  for (const hh of hs) {
    if (o.u0 !== undefined && (hh.u1 < o.u0 || hh.u0 > o.u1)) continue;
    const w = hh.u1 - hh.u0;
    const col = mix(hh.color, '#0d1720', night ? 0.62 : 0.15);
    c.fillStyle = rgba(col);
    c.fillRect(hh.u0, -hh.h, w, hh.h + 1);
    // roof
    c.fillStyle = rgba(night ? '#0b1218' : '#4a3a3a');
    if (hh.roof < 0.5) { c.beginPath(); c.moveTo(hh.u0 - 0.4, -hh.h); c.lineTo(hh.u0 + w / 2, -hh.h - 4 - hh.roof * 4); c.lineTo(hh.u1 + 0.4, -hh.h); c.fill(); }
    else { c.fillRect(hh.u0 - 0.3, -hh.h - 2.2, w + 0.6, 2.2); }
    if (hh.chimney) c.fillRect(hh.u0 + w * 0.7, -hh.h - 5.5, 1.1, 3.5);
    // cornice
    c.fillStyle = rgba(shade(col, 0.15));
    c.fillRect(hh.u0, -hh.h, w, 0.5);
    c.fillRect(hh.u0, -4.2, w, 0.35);
    // windows
    const cw = w / hh.cols;
    for (const wi of hh.wins) {
      const x = hh.u0 + wi.i * cw + cw * 0.25, y = -hh.h + 2.2 + wi.j * 4.2;
      if (y > -5) continue;
      const lit = wi.lit && night;
      c.fillStyle = lit ? rgba(mix('#ffcf7a', '#ffa84a', wi.warm)) : rgba(night ? '#16222c' : '#3f5466');
      c.fillRect(x, y, cw * 0.5, 2.6);
      if (lit && wi.curtain) { c.fillStyle = 'rgba(160,60,50,0.7)'; c.fillRect(x, y, cw * 0.14, 2.6); c.fillRect(x + cw * 0.36, y, cw * 0.14, 2.6); }
      c.fillStyle = rgba(shade(col, 0.2)); c.fillRect(x - 0.15, y + 2.6, cw * 0.5 + 0.3, 0.25);
    }
    // ground floor: door / shop
    if (!o.noGround) {
      c.fillStyle = rgba(night ? '#0e151b' : '#3b2e2a');
      c.fillRect(hh.u0 + w * 0.15, -3.4, 1.6, 3.4);
      c.fillStyle = night && hh.wins[0].lit ? rgba('#ffc46a', 0.9) : rgba(night ? '#1b2833' : '#536a7a');
      c.fillRect(hh.u0 + w * 0.45, -3.2, w * 0.45, 2.2);
      if (hh.awning) { c.fillStyle = rgba(mix(hh.awnCol, '#000', night ? 0.5 : 0)); poly([[hh.u0 + w * 0.4, -3.9], [hh.u0 + w * 0.95, -3.9], [hh.u0 + w + 0.3, -3.0], [hh.u0 + w * 0.35, -3.0]]); c.fill(); }
    }
  }
}

// Facade plane along z (canal street): side = -1 left (faces +x), +1 right (faces -x)
function drawCanalSide(hs, L, x, night, t, level) {
  const zMin = cam.z + 0.5;
  for (const hh of hs) {
    if (hh.u1 < zMin || hh.u0 > cam.z + 260) continue;
    const z0 = Math.max(hh.u0, zMin), z1 = hh.u1;
    const col = mix(hh.color, '#0d1720', night ? 0.6 : 0.15);
    // wall
    fill3([[x, level + 1, z0], [x, -hh.h, z0], [x, -hh.h, z1], [x, level + 1, z1]], rgba(col));
    // roof band
    fill3([[x, -hh.h, z0], [x, -hh.h - 2.5, z0], [x, -hh.h - 2.5, z1], [x, -hh.h, z1]], rgba(night ? '#0b1218' : '#4a3a3a'));
    // cornice line
    ctx.strokeStyle = rgba(shade(col, 0.2)); ctx.lineWidth = 2;
    line3([[x, -hh.h, z0], [x, -hh.h, z1]]); ctx.stroke();
    // windows
    const cw = (hh.u1 - hh.u0) / hh.cols;
    for (const wi of hh.wins) {
      const za = hh.u0 + wi.i * cw + cw * 0.25, zb = za + cw * 0.5;
      if (zb < zMin) continue;
      const y = -hh.h + 2.2 + wi.j * 4.2;
      if (y > level - 3.5) continue;
      const lit = wi.lit && night;
      fill3([[x, y, Math.max(za, zMin)], [x, y + 2.6, Math.max(za, zMin)], [x, y + 2.6, zb], [x, y, zb]], lit ? rgba(mix('#ffcf7a', '#ffa84a', wi.warm)) : rgba(night ? '#16222c' : '#3f5466'));
    }
  }
}

// ---------------------------------------------------------------- underwater (screen space)
function drawUnderwater(t, depth = 0.5) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = vgrad(0, H, [[0, mix('#2f7f8f', '#0f3a48', depth)], [0.5, mix('#0f4a58', '#082430', depth)], [1, '#020a10']]);
  ctx.fillRect(0, 0, W, H);
  // god rays
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 9; i++) {
    const x = W * (0.1 + 0.1 * i) + Math.sin(t * 0.6 + i) * 60;
    const g = ctx.createLinearGradient(x, 0, x + 200, H * 0.8);
    g.addColorStop(0, 'rgba(150,230,240,0.16)'); g.addColorStop(1, 'rgba(150,230,240,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x - 30, -10); ctx.lineTo(x + 40, -10); ctx.lineTo(x + 320, H); ctx.lineTo(x + 120, H); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  // surface shimmer
  ctx.strokeStyle = 'rgba(200,250,255,0.35)'; ctx.lineWidth = 6;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 20) { const y = 60 + Math.sin(x * 0.02 + t * 2) * 14; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
  ctx.stroke();
  // particles
  for (let i = 0; i < 120; i++) {
    const x = mod(hash(i) * W + Math.sin(t * 0.5 + i) * 30, W), y = mod(hash(i * 3.3) * H - t * 20 * hash(i * 7), H);
    ctx.fillStyle = `rgba(190,230,230,${0.15 + hash(i * 5) * 0.25})`;
    circle(x, y, 1.5 + hash(i * 9) * 3); ctx.fill();
  }
  ctx.restore();
}
function bubbles(t, x, y, n, spread, seed = 1, slow = 1) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const tt = t * slow;
    const life = 1.6 + hash(i + seed) * 1.5;
    const ph = mod(tt / life + hash(i * 2.3 + seed), 1);
    const bx = x + (hash(i * 4.1 + seed) - 0.5) * spread + Math.sin(tt * 4 + i) * 12;
    const by = y - ph * 900;
    const r = 4 + hash(i * 6.7 + seed) * 14;
    ctx.strokeStyle = `rgba(220,250,255,${0.6 * (1 - ph)})`;
    ctx.lineWidth = 2.5;
    circle(bx, by, r); ctx.stroke();
    ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - ph)})`;
    circle(bx - r * 0.35, by - r * 0.35, r * 0.25); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- interior (Snow's room)
function drawRoom(t, warm, o = {}) {
  // world: back wall at z=12 with window x∈[-3.2,3.2], y∈[-8.5,-1.2]; floor y=0
  const wallCol = mix('#1a2633', '#c98f5f', warm);
  fill3([[-30, -30, 12], [30, -30, 12], [30, 5, 12], [-30, 5, 12]], rgba(wallCol));
  // wallpaper stripes
  ctx.save();
  for (let x = -24; x < 24; x += 1.6) {
    if (x > -3.6 && x < 3.6) continue;
    fill3([[x, -30, 11.99], [x + 0.5, -30, 11.99], [x + 0.5, 0, 11.99], [x, 0, 11.99]], rgba(shade(wallCol, 0.08), 0.6));
  }
  ctx.restore();
  // window outside view (clip)
  if (path3([[-3.2, -8.5, 12], [3.2, -8.5, 12], [3.2, -1.2, 12], [-3.2, -1.2, 12]])) {
    ctx.save(); ctx.clip();
    const p = P(0, -4, 12);
    ctx.fillStyle = vgrad(p.y - 600, p.y + 500, [[0, '#06111a'], [1, '#1d3a4c']]);
    ctx.fillRect(-OVER, -OVER, W + OVER * 2, H + OVER * 2);
    // outside street lamp + houses silhouettes
    glow3(5, -9, 40, 7, '#ffc070', 0.6);
    fill3([[-30, -25, 60], [30, -25, 60], [30, 2, 60], [-30, 2, 60]], 'rgba(10,20,28,0.9)');
    for (let i = 0; i < 12; i++) { const x = -20 + i * 4, y = -18 + (i % 3) * 5; fill3([[x, y, 59.9], [x + 1.2, y, 59.9], [x + 1.2, y + 2, 59.9], [x, y + 2, 59.9]], hash(i) < 0.5 ? 'rgba(255,190,110,0.8)' : 'rgba(30,45,55,1)'); }
    if (o.outside) o.outside();
    rain(t, { n: 400, zNear: 13, zFar: 40, alpha: 0.8 });
    ctx.restore();
  }
  // glass streaks
  ctx.save();
  if (path3([[-3.2, -8.5, 11.98], [3.2, -8.5, 11.98], [3.2, -1.2, 11.98], [-3.2, -1.2, 11.98]])) {
    ctx.clip();
    for (let i = 0; i < 14; i++) {
      const x = -3 + hash(i) * 6, y0 = -8.5 + mod(hash(i * 2) * 8 + t * (0.5 + hash(i * 3)), 8);
      const p0 = P(x, y0, 11.98), p1 = P(x + 0.05, y0 + 0.9, 11.98);
      ctx.strokeStyle = 'rgba(200,225,240,0.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
  }
  ctx.restore();
  // window frame & cross bars
  const frame = rgba(mix('#0c1218', '#f0e2c8', warm));
  for (const [a, b, c2, d] of [[-3.5, -8.8, 7, 0.35], [-3.5, -1.3, 7, 0.4], [-3.5, -8.8, 0.35, 7.6], [3.15, -8.8, 0.35, 7.6], [-0.12, -8.8, 0.24, 7.6], [-3.5, -5.0, 7, 0.22]]) {
    fill3([[a, b, 11.95], [a + c2, b, 11.95], [a + c2, b + d, 11.95], [a, b + d, 11.95]], frame);
  }
  // curtains
  const curt = mix('#2a0d12', '#9b2335', warm);
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -6.2 : 3.3, x1 = s < 0 ? -3.3 : 6.2;
    fill3([[x0, -10, 11.9], [x1, -10, 11.9], [x1 + s * 0.4, 0, 11.9], [x0, 0, 11.9]], rgba(curt));
    ctx.strokeStyle = rgba(shade(curt, -0.4), 0.6); ctx.lineWidth = 3;
    for (let k = 1; k < 4; k++) { const x = lerp(x0, x1, k / 4); line3([[x, -10, 11.89], [x + s * 0.1 * k, 0, 11.89]]); ctx.stroke(); }
  }
  // floor
  fill3([[-30, 0, 0.5], [30, 0, 0.5], [30, 0, 12], [-30, 0, 12]], rgba(mix('#0d141b', '#5a3020', warm)));
  // sill / bench where Snow sits
  fill3([[-4, -1.2, 9], [4, -1.2, 9], [4, -1.2, 11.9], [-4, -1.2, 11.9]], rgba(mix('#141c24', '#7a4a32', warm)));
  fill3([[-4, -1.2, 9], [4, -1.2, 9], [4, 0, 9], [-4, 0, 9]], rgba(mix('#0e141a', '#5e3624', warm)));
  // fireplace glow from the right
  if (warm > 0) {
    const f = 0.85 + 0.15 * Math.sin(t * 13) * Math.sin(t * 7.3);
    glow(W * 1.05, H * 0.62, 900, '#ff8a3a', 0.55 * warm * f);
    glow(W * 0.5, H * 0.35, 1100, '#ffb070', 0.18 * warm);
  }
}

// ---------------------------------------------------------------- dawn town (E)
function drawDawnTown(L, t, o = {}) {
  drawSky(L, t, { sunX: o.sunX ?? 40, sunY: o.sunY ?? -40, sunSize: 1.4 });
  drawWater(L, t, 0, -2000, 2000, cam.z + 0.3, 3000, { amp: 0.05, flow: 0.15, rows: 30 });
  const sp = P(o.sunX ?? 40, 0, 3000);
  if (sp) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 26; k++) {
      const y = sp.y + Math.pow(k / 26, 1.6) * (H + OVER - sp.y);
      const w = 40 + k * 14 + Math.sin(t * 2 + k) * 12;
      ctx.fillStyle = `rgba(255,230,180,${0.22 * (1 - k / 26)})`;
      ellipse(sp.x + Math.sin(t * 1.3 + k * 0.7) * 8, y, w, 6 + k * 1.2); ctx.fill();
    }
    ctx.restore();
  }
  // rooftops poking out of the water (sorted far->near)
  const roofs = WORLD.dawnRoofs || (WORLD.dawnRoofs = (() => {
    const r = rng(303), arr = [];
    for (let i = 0; i < 60; i++) arr.push({ x: (r() - 0.5) * 360, z: 40 + r() * 420, w: 8 + r() * 10, h: 4 + r() * 6, col: FACADE_COLS[Math.floor(r() * 8)], ch: r() < 0.6 });
    return arr.sort((a, b) => b.z - a.z);
  })());
  for (const rf of roofs) {
    if (Math.abs(rf.x - 10) < 14 && rf.z < 60) continue;
    at(rf.x, 0, rf.z, () => {
      const c = ctx;
      c.fillStyle = rgba(mix(rf.col, L.fog, 0.35)); c.fillRect(-rf.w / 2, -rf.h * 0.5, rf.w, rf.h * 0.5 + 0.2);
      c.fillStyle = rgba(mix('#5a3a3a', L.fog, 0.4));
      c.beginPath(); c.moveTo(-rf.w / 2 - 0.4, -rf.h * 0.5); c.lineTo(0, -rf.h * 1.2); c.lineTo(rf.w / 2 + 0.4, -rf.h * 0.5); c.fill();
      if (rf.ch) c.fillRect(rf.w * 0.2, -rf.h * 1.25, 0.9, 2.2);
      c.fillStyle = rgba(shade(rf.col, 0.25), 0.5); c.fillRect(-rf.w * 0.3, -rf.h * 0.42, rf.w * 0.15, rf.h * 0.25); c.fillRect(rf.w * 0.15, -rf.h * 0.42, rf.w * 0.15, rf.h * 0.25);
    });
  }
  // atmospheric fog band
  const hz = horizonY();
  ctx.fillStyle = vgrad(hz - 220, hz + 160, [[0, L.fog, 0], [0.5, L.fog, 0.35], [1, L.fog, 0]]);
  ctx.fillRect(-OVER, hz - 220, W + OVER * 2, 380);
  // broken bridge remnant far away
  at(-60, 0, 260, () => {
    const c = ctx; c.fillStyle = rgba(mix(L.stoneDark, L.fog, 0.5));
    c.fillRect(-40, -16, 22, 16.5); c.fillRect(18, -16, 22, 16.5);
    c.beginPath(); c.moveTo(-18, -16); c.lineTo(-10, -12); c.lineTo(-14, -6); c.lineTo(-18, -4); c.fill();
    c.beginPath(); c.moveTo(18, -16); c.lineTo(11, -11); c.lineTo(15, -5); c.lineTo(18, -3); c.fill();
  });
  // birds
  for (let i = 0; i < 7; i++) {
    const bx = -60 + i * 9 + t * 6, by = -50 - hash(i) * 20 + Math.sin(t + i) * 2, bz = 160 + i * 10;
    const p = P(bx, by, bz);
    if (!p) continue;
    const fl = Math.sin(t * 9 + i * 2) * 0.6;
    ctx.strokeStyle = 'rgba(60,40,50,0.7)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(p.x - 1.4 * p.s, p.y - fl * p.s); ctx.quadraticCurveTo(p.x - 0.6 * p.s, p.y - 0.6 * p.s, p.x, p.y); ctx.quadraticCurveTo(p.x + 0.6 * p.s, p.y - 0.6 * p.s, p.x + 1.4 * p.s, p.y - fl * p.s); ctx.stroke();
  }
}
// Snow's half-submerged house at dawn (facade billboard)
function drawSnowHouse(L) {
  const c = ctx;
  c.fillStyle = rgba(mix('#c9a15b', '#f2c9a0', 0.25)); c.fillRect(-9, -16, 18, 16.3);
  c.fillStyle = rgba('#5a3a3a'); c.beginPath(); c.moveTo(-10, -16); c.lineTo(0, -23); c.lineTo(10, -16); c.fill();
  c.fillStyle = rgba(shade('#c9a15b', -0.3)); c.fillRect(-9, -0.6, 18, 0.9); // waterline stain
  // window with sill (Snow sits here)
  c.fillStyle = '#2a3442'; c.fillRect(-2.6, -7.2, 5.2, 5.6);
  c.fillStyle = 'rgba(255,220,180,0.25)'; c.fillRect(-2.4, -7, 2.3, 5.2);
  c.fillStyle = '#efe4d2'; c.fillRect(-3, -1.7, 6, 0.5); // sill
  c.fillStyle = '#efe4d2'; c.fillRect(-2.7, -7.4, 5.4, 0.35); c.fillRect(-0.12, -7.2, 0.24, 5.6);
  // upper windows
  c.fillStyle = '#3a4656';
  c.fillRect(-7, -13.5, 3, 3.6); c.fillRect(4, -13.5, 3, 3.6);
  c.fillStyle = 'rgba(255,230,190,0.3)'; c.fillRect(-7, -13.5, 1.3, 3.6); c.fillRect(4, -13.5, 1.3, 3.6);
}


// ---------------------------------------------------------------- street side (B): facade row along x at z=34
const STREET = { z: 34, lampZ: 7.5 };
function drawStreetSide(L, t, o = {}) {
  const level = o.level ?? 0.01;
  const night = L.windows > 0.5;
  drawSky(L, t, { storm: true, cloudSpeed: 10 });
  drawCity(L, 420, 0, night);
  const u0 = cam.x - 60, u1 = cam.x + 60;
  at(0, 0, STREET.z, () => drawFacadeLocal(WORLD.streetHouses, L, night, { u0, u1 }));
  if (o.behind) o.behind();
  // sidewalk & kerb
  fill3([[u0, -0.3, 30.5], [u1, -0.3, 30.5], [u1, -0.3, STREET.z], [u0, -0.3, STREET.z]], rgba(shade(L.ledge, 0.05)));
  fill3([[u0, -0.3, 30.5], [u1, -0.3, 30.5], [u1, 0, 30.5], [u0, 0, 30.5]], rgba(shade(L.ledge, -0.2)));
  // street + reflection
  if (path3([[u0, 0, cam.z + 0.3], [u1, 0, cam.z + 0.3], [u1, 0, 30.5], [u0, 0, 30.5]])) {
    ctx.save();
    ctx.clip();
    const hz = horizonY();
    ctx.fillStyle = vgrad(hz, H + 200, [[0, shade(L.ledge, -0.2)], [1, shade(L.ledge, -0.55)]]);
    ctx.fillRect(-OVER, hz - 400, W + OVER * 2, H + OVER * 2);
    ctx.globalAlpha = 0.28;
    at(0, 0, STREET.z, () => { ctx.scale(1, -1); drawFacadeLocal(WORLD.streetHouses, L, night, { u0, u1, noGround: true }); });
    ctx.globalAlpha = 1;
    // cobble rows
    ctx.strokeStyle = rgba(shade(L.ledge, -0.6), 0.5);
    ctx.lineWidth = 1.5;
    for (let z = Math.ceil(cam.z + 1); z < 30.5; z += 1) { line3([[u0, -0.01, z], [u1, -0.01, z]]); ctx.stroke(); }
    ctx.restore();
  }
  if (level < 0) drawWater(L, t, level, u0, u1, cam.z, STREET.z + 0.5, { amp: 0.12, flow: 1.4, rough: 0.6, rows: 22, lights: o.lights });
  if (o.mid) o.mid();
  // foreground lamp posts
  for (let x = Math.floor((cam.x - 40) / 16) * 16; x < cam.x + 40; x += 16) {
    at(x + 6, Math.min(0, level), STREET.lampZ, () => drawLampPost(9, 1));
  }
  if (o.front) o.front();
  for (let x = Math.floor((cam.x - 40) / 16) * 16; x < cam.x + 40; x += 16) glow3(x + 6, Math.min(0, level) - 9.7, STREET.lampZ, 5, '#ffc070', 0.75);
}

// Snow's house front with a big lit window (local coords, base at y=0)
function drawSnowWindowHouse(L, t, warm, inside) {
  const c = ctx;
  c.fillStyle = rgba(mix('#c9a15b', '#121c25', 0.55));
  c.fillRect(-7, -22, 14, 22.3);
  c.fillStyle = rgba(mix('#e9dcc2', '#1a2630', 0.5));
  c.fillRect(-3.6, -7.5, 7.2, 0.5); c.fillRect(-3.8, -1.3, 7.6, 0.5);
  // interior through window
  c.save();
  c.beginPath(); c.rect(-3.2, -7.0, 6.4, 5.7); c.clip();
  c.fillStyle = vgrad(-7, -1.3, [[0, mix('#1a2633', '#d79a62', warm)], [1, mix('#0e151c', '#8a4a2a', warm)]]);
  c.fillRect(-3.2, -7, 6.4, 5.7);
  if (warm > 0) { // fireplace glow
    const g = c.createRadialGradient(2.6, -2.2, 0.1, 2.6, -2.2, 4);
    g.addColorStop(0, `rgba(255,170,80,${0.8 * warm})`); g.addColorStop(1, 'rgba(255,120,40,0)');
    c.fillStyle = g; c.fillRect(-3.2, -7, 6.4, 5.7);
  }
  c.fillStyle = rgba(mix('#2a0d12', '#9b2335', warm)); c.fillRect(-3.2, -7, 1.0, 5.7); c.fillRect(2.2, -7, 1.0, 5.7);
  if (inside) inside();
  // glass reflection
  c.fillStyle = 'rgba(180,210,230,0.12)';
  c.beginPath(); c.moveTo(-3.2, -7); c.lineTo(-1.2, -7); c.lineTo(-3.2, -3.5); c.fill();
  c.restore();
  c.fillStyle = rgba(mix('#e9dcc2', '#1a2630', 0.45));
  c.fillRect(-3.4, -7.2, 6.8, 0.25); c.fillRect(-0.1, -7.0, 0.2, 5.7); c.fillRect(-3.4, -7.2, 0.25, 6); c.fillRect(3.15, -7.2, 0.25, 6);
  // upper windows dark
  c.fillStyle = '#16222c';
  for (const x of [-5, 2]) for (const y of [-19, -13.5]) c.fillRect(x, y, 3, 3.6);
  c.fillStyle = 'rgba(255,200,120,0.85)'; c.fillRect(2, -13.5, 3, 3.6);
}

// ---------------------------------------------------------------- alley (C)
function drawAlley(L, t, o = {}) {
  // back brick wall at z=10
  fill3([[-30, -40, 10], [30, -40, 10], [30, 0.5, 10], [-30, 0.5, 10]], rgba('#3a2a28'));
  at(0, 0, 10, () => {
    const c = ctx;
    const r = rng(12);
    for (let y = -0.6; y > -24; y -= 0.65) {
      const off = (Math.round(y / 0.65) % 2) * 0.7;
      for (let x = -24 + off; x < 24; x += 1.4) {
        const v = r();
        c.fillStyle = rgba(mix('#6e3b2e', '#3b2420', v * 0.8));
        c.fillRect(x, y, 1.3, 0.56);
      }
    }
    // drainpipe
    c.fillStyle = '#2a3036'; c.fillRect(4.5, -24, 0.45, 24);
    for (let y = -22; y < 0; y += 3) c.fillRect(4.35, y, 0.75, 0.25);
    // wet sheen
    c.fillStyle = vgrad(-24, 0, [[0, '#000000', 0], [1, '#9fc4d8', 0.18]]);
    c.fillRect(-24, -24, 48, 24);
  });
  // ground water
  drawWater(L, t, 0, -30, 30, cam.z, 10, { amp: 0.02, flow: 0.15, rows: 14 });
  ripples(t, 0, { n: 70, zNear: 1, zFar: 10, size: 0.6 });
}

// ---------------------------------------------------------------- falling stones & chunks
function fallingStones(L, t, list, t0, dur, slow = 1, until = 1e9) {
  const removed = new Set();
  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    const ts = t0 + s.ts * dur;
    if (t < ts) continue;
    removed.add(WORLD.stones.indexOf(WORLD.stones.find((q) => q.x === s.x && q.y === s.y)));
    const dt = Math.min(t - ts, until) * slow;
    const y = s.y + 0.5 * 32 * dt * dt;
    if (y > 4) continue;
    const z = BR.zF - 0.6 - dt * 1.5;
    at(s.x + s.w / 2 + s.vx * dt, y + s.h / 2, z, () => {
      ctx.rotate(s.spin * dt);
      ctx.fillStyle = rgba(mix(L.stone, L.stoneDark, s.c));
      rrect(-s.w / 2, -s.h / 2, s.w, s.h, 0.3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(-s.w / 2, s.h / 4, s.w, s.h / 4);
    });
  }
  return removed;
}
function dust(t, x, y, z, amt, seed = 1) {
  if (amt <= 0) return;
  for (let i = 0; i < 26; i++) {
    const a = hash(i + seed) * TAU, d = hash(i * 2 + seed) * 10 * amt;
    const p = P(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.5 - amt * 3, z - 1);
    if (!p) continue;
    glow(p.x, p.y, (2 + hash(i * 3) * 4) * p.s, '#9aa0a8', 0.25 * amt, 'source-over');
  }
}
