// ============================================================
//  Timeline: 13 scenes, 150 s. Every scene owns its camera.
// ============================================================
'use strict';

const SUNSET = LIGHTS.sunset, DUSK = LIGHTS.dusk, NIGHT = LIGHTS.night, DAWN = LIGHTS.dawn;
const CR = { x: 15.5, z: 39.5 };          // crate stack under the vault
const FLOOD = -1.5;                       // flood water level
const STRIKES = [0.05, 32.5, 33.5, 44.2, 58.2, 64.0, 80.0, 82.6, 95.4, 104.8, 122.0, 126.5];

// ---------------------------------------------------------------- shared pieces
function crateStack(L, wet = 1, topTilt = 0) {
  for (let k = 0; k < 3; k++) {
    at(CR.x + [0, 0.25, -0.2][k], 1.5 - k * 3, CR.z - k * 0.05, () => drawCrate({ s: 3, wet, tilt: k === 2 ? topTilt : 0 }));
  }
}
function sibsOnTop(t, o = {}) {
  const y = -7.5;
  if (!o.skip || !o.skip.includes(1)) at(16.4, y, 39.0, () => drawCatSit({ pal: PAL.sib1, size: 0.78, turn: -0.4, wet: 1, shiver: 1, t, brow: -0.6, pupil: 0.9, shadow: false, mouth: o.mouth1 || 0 }));
  if (!o.skip || !o.skip.includes(2)) at(14.4, y, 39.2, () => drawCatSit({ pal: PAL.sib3, size: 0.74, turn: 0.4, wet: 1, shiver: 1, t: t + 1, tabby: false, brow: -0.6, pupil: 0.9, shadow: false }));
  if (!o.skip || !o.skip.includes(3)) at(15.6, y, 38.7, () => drawCatSit({ pal: PAL.sib2, size: 0.72, turn: 0.1, wet: 1, shiver: 1, t: t + 2, brow: -0.6, pupil: 0.9, shadow: false }));
}
function mamaOnTop(t, o = {}) {
  at(o.x ?? 15.3, o.y ?? -7.5, o.z ?? 39.9, () => drawCatSit(Object.assign({ pal: PAL.mama, size: 1.15, turn: -0.2, wet: 1, shiver: 0.6, t, brow: -0.7, blink: 0.35, shadow: false }, o.cat || {})));
}
function storm(t, k = 1, o = {}) {
  rain(t, { n: 1100 * k, speed: 70, wind: o.wind ?? -0.25, slow: o.slow ?? 1 });
}
function flashFX(t, a = 0.4) {
  const f = flashAt(t, STRIKES);
  if (f > 0.01) fillFrame('rgba(190,210,255,1)', 'lighter', f * a);
  return f;
}
function post(t, o = {}) {
  if (o.grade) grade(o.grade);
  vignette(o.vig ?? 0.55);
  if (o.drops) lensDrops(t, o.drops);
}
function pipOnRaft(t, o = {}) {
  // origin: raft top centre
  drawRaft({ tilt: o.raftTilt ?? 0, top: 0.6, wet: 0.7 });
  ctx.save();
  ctx.translate(o.px ?? 0, -0.3);
  drawCatSit(Object.assign({ pal: PAL.pip, coat: 1, hood: 1, star: true, wet: 1, t, shadow: false }, o.cat || {}));
  ctx.restore();
}
function waterBob(t, seed = 0, a = 0.15) { return Math.sin(t * 2.3 + seed) * a + Math.sin(t * 3.7 + seed * 2) * a * 0.4; }

// ---------------------------------------------------------------- HOOK (0–3) & its callback (97–98)
function sHook(lt, T) {
  const zoomT = clamp(lt / 1.5);
  const orbitT = inv(1.5, 3, lt);
  const raft = { x: 10.5, z: 33.5 };
  const by = FLOOD + waterBob(T, 1, 0.18);
  const headY = by - 0.35 - 0.3 - 1.5;
  setCam({ x: lerp(8.4, 13.2, E.io2(orbitT)), y: -3.0, z: lerp(21.5, 24.5, orbitT), F: lerp(1000, 3500, E.in3(zoomT)) * lerp(1, 0.66, E.io2(orbitT)) });
  aim(raft.x, headY, raft.z, W / 2, H * 0.52);
  const hit = Math.exp(-Math.max(0, lt - 1.55) * 4) * (lt > 1.55 ? 1 : 0);
  shakeCam(T, 0.6 + orbitT * 1.6 + hit * 4, 2.2, 3);
  cam.roll += Math.sin(orbitT * Math.PI) * 0.12;
  baseTransform();
  const L = NIGHT;
  drawRiver(L, T, {
    level: FLOOD, rough: 1, flow: 3.5, storm: true, crack: 0.45 + lt * 0.05,
    sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.62, -200, W * 0.45, H * 0.38, 11, f); },
    inside: () => {
      crateStack(L, 1);
    },
    front: () => {
      at(raft.x - 2, FLOOD + 0.3, 35.4, () => drawWave(L, 4.5 + lt * 1.6, 26, T));
      at(raft.x, by, raft.z, () => pipOnRaft(T, { raftTilt: Math.sin(T * 2) * 0.05, cat: { turn: lerp(0.35, -0.55, orbitT), mouth: pulse(lt, 0.8, 1.7, 0.1, 0.3) * 0.9, brow: -0.8, pupil: 0.95, earBack: 0.5, lookX: -0.2 } }));
      splash(raft.x - 1, by, raft.z + 1.2, 1.55, lt, { n: 70, pow: 10, life: 1.2, size: 0.04 });
    },
  });
  storm(T, 1.1);
  glow(W * 0.5, H * 0.5, 700, '#ffc070', 0.12);
  flashFX(T, 0.5);
  post(T, { drops: 0.8, vig: 0.6, grade: { soft: ['#9fc8ff', '#0a1a2a'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S1 (3–13): 12 hours earlier
function s1(lt, T) {
  if (lt < 0.62) { // rewind
    const tr = 3 - lt * 4.6;
    sHook(clamp(tr, 0, 3), clamp(tr, 0, 3));
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 26; i++) {
      const y = mod(hash(i) * H + lt * 4000 * (0.5 + hash(i * 2)), H);
      ctx.fillStyle = `rgba(200,230,255,${0.08 + 0.12 * hash(i * 3)})`;
      ctx.fillRect(0, y, W, 3 + hash(i * 5) * 14);
    }
    ctx.restore();
    fillFrame('#ffffff', 'source-over', E.in3(inv(0.35, 0.62, lt)));
    return;
  }
  const L = SUNSET;
  const u = lt;
  // camera: crane down -> dolly in -> low tracking
  const pipX = kf(u, [[0, 0.6], [6.6, 0.6], [8.2, 2.7, E.io2], [8.8, 3.6, E.out2]]);
  const jump = pulse(u, 8.2, 8.8, 0.3, 0.3);
  if (u < 3.5) {
    const k = inv(0.62, 3.5, u);
    setCam({ x: lerp(-1, 1, k), y: lerp(-47, -7, E.io3(k)), z: lerp(0, 12, E.io2(k)), F: 1050 });
    cam.sy = lerp(-120, 80, E.io2(k));
  } else if (u < 7) {
    const k = inv(3.5, 7, u);
    setCam({ x: lerp(1, 2.2, E.io2(k)), y: lerp(-7, -2.6, E.io2(k)), z: lerp(12, 25.5, E.io2(k)), F: 1100 });
    cam.sy = lerp(80, 120, k);
  } else {
    const k = inv(7, 10, u);
    setCam({ x: pipX - 0.9 + k * 0.6, y: -1.7, z: lerp(26.8, 28.2, k), F: 1150 });
    aim(pipX + 1.1, -1.4, 32.2, W / 2, H * 0.55);
    shakeCam(T, 0.15, 1, 7);
  }
  baseTransform();
  const sibHop = (i) => Math.max(0, Math.sin(T * 6 + i * 2)) * 0.5;
  drawRiver(L, T, {
    level: 2.5, amp: 0.06, flow: 0.4,
    inside: () => {
      at(8, 0, 41, () => drawBox({}));
      at(10.5, -sibHop(0), 39.0, () => drawCatSit({ pal: PAL.sib1, size: 0.78, turn: -0.5, t: T, happy: u > 8.8 && u < 9.8 ? 1 : 0, mouth: u > 8.8 && u < 9.8 ? 0.5 : 0 }));
      at(12.4, -sibHop(1), 39.6, () => drawCatSit({ pal: PAL.sib3, size: 0.74, turn: -0.3, t: T + 3, tabby: false, happy: u > 8.8 && u < 9.8 ? 1 : 0 }));
      at(9.0, 0, 40.2, () => drawCatSide({ pal: PAL.sib2, size: 0.72, flip: true, run: 0.8, gait: T * 12, t: T }));
    },
    front: () => {
      puddle(L, 4.0, 32.6, 1.5, 0.9, T);
      // Mama watching
      const nudge = pulse(u, 9.2, 10, 0.25, 0.25);
      at(6.6, 0, 34.2, () => drawCatSit({ pal: PAL.mama, size: 1.25, turn: -0.55 - nudge * 0.2, t: T, tilt: -0.25 * nudge, blink: (mod(T, 3.3) < 0.12) ? 1 : 0, happy: u > 8.9 && u < 9.3 ? 1 : 0 }));
      // Pip runs, jumps, plops
      const inPuddle = u > 8.8;
      const py = -jump * 1.2;
      at(pipX, py, 32.4, () => {
        if (u < 8.2 && u > 6.6) drawCatSide({ pal: PAL.pip, coat: 1, hood: 0, run: 1, gait: T * 15, t: T, size: 0.95 });
        else if (u >= 8.2 && u < 8.8) drawCatSide({ pal: PAL.pip, coat: 1, hood: 0, stretch: 1, t: T, size: 0.95 });
        else drawCatSit({ pal: PAL.pip, coat: 1, hood: u > 9.5 ? 1 : 0, star: true, size: 0.95, t: T, turn: 0.35, wet: inPuddle ? 0.7 : 0, squash: inPuddle ? 1 - 0.18 * Math.exp(-(u - 8.8) * 6) * Math.cos((u - 8.8) * 30) : 1, mouth: pulse(u, 8.85, 9.3, 0.05, 0.2) * 0.6, blink: inPuddle && u < 9.2 ? 1 : 0, shadow: !inPuddle });
      });
      splash(3.6, 0, 32.5, 8.8, u, { n: 50, pow: 6, life: 0.9 });
    },
  });
  glow(W * 0.5, H * 0.35, 900, '#ffcf8a', 0.18);
  post(T, { vig: 0.45, grade: { soft: ['#ffd7a8', '#3a3050'], softA: 0.4 } });
  fillFrame('#ffffff', 'source-over', 1 - E.out2(inv(0.62, 1.0, u)));
}

// ---------------------------------------------------------------- S2 (13–25): the storm comes
function s2(lt, T) {
  const L = lightMix(SUNSET, DUSK, E.io2(inv(1.5, 10, lt)));
  const pud = { x: 4.0, z: 32.6 };
  if (lt < 2) { // macro raindrop
    setCam({ x: 5.2, y: -0.34, z: 31.3, F: lerp(2300, 2700, E.out2(lt / 2)) });
    aim(pud.x, -0.12, pud.z, W / 2, H * 0.62);
  } else if (lt < 6) {
    const k = E.io3(inv(2, 6, lt));
    setCam({ x: lerp(3.7, 1.5, k), y: lerp(-0.42, -6.5, k), z: lerp(31.5, 17, k), F: lerp(3300, 1100, k) });
    aim(lerp(pud.x, 6.5, k), lerp(-0.05, -3, k), lerp(pud.z, 37, k), W / 2, lerp(H * 0.6, H * 0.55, k));
  } else {
    const k = inv(6, 12, lt);
    const th = lerp(-1.15, 1.15, E.io2(k));
    const tx = 6.9, tz = 38.3, R = 6.4;
    setCam({ x: tx + Math.sin(th) * R, y: -1.9, z: tz - Math.cos(th) * R - 0.6, F: 1250 });
    aim(tx, -1.0, tz, W / 2, H * 0.56);
  }
  baseTransform();
  const rainK = inv(1.5, 10, lt) * 0.45;
  const macro = lt < 2;
  const envFn = () => drawRiver(L, T, {
    level: lerp(2.5, 1.2, inv(2, 12, lt)), amp: 0.08, flow: 0.6, storm: lt > 4, sunY: -26 + lt * 2,
    inside: () => {
      at(8, 0, 41, () => drawBox({ wet: inv(4, 12, lt) * 0.5 }));
      const cough = Math.max(pulse(lt, 3.4, 3.9, 0.05, 0.3), pulse(lt, 4.9, 5.4, 0.05, 0.3));
      at(5.9, 0, 38.6, () => drawCatLie({ pal: PAL.mama, size: 1.25, blink: cough > 0.2 ? 1 : 0.6, headLift: cough * 0.6 + pulse(lt, 8.6, 10.5) * 0.3, mouth: cough * 0.6, t: T, breath: Math.sin(T * 2), brow: -0.5 }));
      const lean = pulse(lt, 8.4, 10.6, 0.5, 0.6);
      at(7.9 - lean * 0.35, 0, 37.7, () => drawCatSit({ pal: PAL.pip, coat: 1, hood: 1, star: true, size: 0.95, t: T, turn: clamp(-0.6 + (cam.x - 6.9) * -0.1, -0.9, 0.9) - lean * 0.3, tilt: -lean * 0.3, brow: -0.6, lookX: -0.6 }));
      at(10.6, 0, 39.3, () => drawCatSit({ pal: PAL.sib1, size: 0.75, turn: -0.4, t: T, brow: -0.3 }));
      at(12.0, 0, 39.9, () => drawCatSit({ pal: PAL.sib3, size: 0.72, turn: -0.2, t: T + 2, tabby: false, brow: -0.3 }));
    },
    front: () => {
      puddle(L, pud.x, pud.z, 1.5, 0.9, T);
      if (false) {
        // the drop
        const ft = inv(0.25, 1.0, lt);
        if (lt < 1.0) at(pud.x, lerp(-1.4, -0.02, ft * ft), pud.z, () => {
          ctx.fillStyle = vgrad(-0.06, 0.06, [[0, '#ffffff', 0.85], [1, '#9cc8e0', 0.6]]);
          ctx.beginPath(); ctx.moveTo(0, -0.11); ctx.bezierCurveTo(0.05, -0.04, 0.06, 0.04, 0, 0.055); ctx.bezierCurveTo(-0.06, 0.04, -0.05, -0.04, 0, -0.11); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.9)'; ellipse(-0.015, -0.01, 0.012, 0.02); ctx.fill();
        });
        // crown + rings
        if (lt > 1.0) {
          const k = lt - 1.0;
          for (let r = 0; r < 4; r++) {
            const rr = (k - r * 0.18) * 0.5;
            if (rr <= 0) continue;
            const pts = [];
            for (let i = 0; i <= 32; i++) { const a = (i / 32) * TAU; pts.push([pud.x + Math.cos(a) * rr, -0.02, pud.z + Math.sin(a) * rr]); }
            line3(pts);
            ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - k / 1.2)})`; ctx.lineWidth = 3; ctx.stroke();
          }
          splash(pud.x, -0.02, pud.z, 1.0, lt, { n: 26, pow: 1.6, g: 9, life: 0.7, size: 0.012, spread: Math.PI, a0: -Math.PI });
        }
      }
      // wind leaves
      for (let i = 0; i < 8; i++) {
        const lx = -10 + mod(T * 6 + hash(i) * 40, 40), ly = -6 + Math.sin(T * 3 + i) * 2 - hash(i * 3) * 6;
        at(lx, ly, 26 + hash(i * 7) * 10, () => { ctx.rotate(T * 4 + i); ctx.fillStyle = 'rgba(160,110,60,0.9)'; ellipse(0, 0, 0.18, 0.08); ctx.fill(); });
      }
    },
  });
  if (macro) layer(envFn, { blur: 9 }); else envFn();
  if (macro) macroDrop(lt, pud);
  rain(T, { n: 900 * rainK, speed: 55, wind: -0.3, alpha: 0.8 });
  if (lt > 7) { const f = flashAt(T, [20.2]) * 0.4; if (f > 0.01) fillFrame('rgba(200,200,255,1)', 'lighter', f * 0.3); }
  post(T, { vig: 0.55, grade: { soft: ['#e8b8a0', '#202840'], softA: 0.4 } });
}

function macroDrop(lt, pud) {
  puddle(lightMix(SUNSET, DUSK, 0), pud.x, pud.z, 1.5, 0.9, lt);
  const ft = inv(0.25, 1.0, lt);
  if (lt < 1.0) at(pud.x, lerp(-0.72, -0.02, ft * ft), pud.z, () => {
    ctx.fillStyle = vgrad(-0.11, 0.06, [[0, '#ffffff', 0.9], [1, '#a8d0e8', 0.75]]);
    ctx.beginPath(); ctx.moveTo(0, -0.11); ctx.bezierCurveTo(0.05, -0.04, 0.06, 0.04, 0, 0.055); ctx.bezierCurveTo(-0.06, 0.04, -0.05, -0.04, 0, -0.11); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 0.004; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ellipse(-0.017, -0.005, 0.012, 0.02); ctx.fill();
  });
  if (lt > 1.0) {
    const k = lt - 1.0;
    for (let r = 0; r < 4; r++) {
      const rr = (k - r * 0.16) * 0.45;
      if (rr <= 0) continue;
      const pts = [];
      for (let i = 0; i <= 40; i++) { const a = (i / 40) * TAU; pts.push([pud.x + Math.cos(a) * rr, -0.02, pud.z + Math.sin(a) * rr]); }
      line3(pts);
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * clamp(1 - k / 1.0)})`; ctx.lineWidth = 3; ctx.stroke();
    }
    // crown
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU, h = Math.sin(clamp(k / 0.35) * Math.PI) * 0.09;
      const rr = 0.03 + k * 0.08;
      at(pud.x + Math.cos(a) * rr, -0.02 - h - hash(i) * h * 0.6, pud.z + Math.sin(a) * rr * 0.6, () => { ctx.fillStyle = 'rgba(235,248,255,0.85)'; circle(0, 0, 0.006 + hash(i * 3) * 0.006); ctx.fill(); });
    }
  }
}

// ---------------------------------------------------------------- S3 (25–37): the flood
function s3(lt, T) {
  const L = NIGHT;
  const level = kf(lt, [[0, 0.6], [4, -1.0, E.io2], [12, FLOOD, E.io2]]);
  const pipPath = (u) => ({ x: kf(u, [[0, 7.2], [2.2, 12.6, E.lin], [3.1, 14.2, E.out2]]), y: kf(u, [[0, 0], [2.2, Math.min(0, level)], [2.75, -4.6, E.out2], [3.1, -4.5, E.in2]]) });
  const pp = pipPath(lt);
  let mb = 0;
  if (lt < 4) {
    setCam({ x: pp.x - 1.2, y: -2.6 + pp.y * 0.4, z: 30.6, F: 1100 });
    aim(pp.x + 0.6, pp.y - 1.2, 38.2, W / 2, H * 0.55);
    shakeCam(T, 1.1, 2.4, 9);
  } else if (lt < 5) {
    const k = E.io3(inv(4, 4.45, lt));
    setCam({ x: lerp(12, -3, k), y: -2.8, z: 30.4, F: 1100 });
    aim(lerp(14, -3.5, k), -1.6, lerp(38.2, 41, k), W / 2, H * 0.55);
    mb = Math.sin(inv(4, 4.45, lt) * Math.PI) * 260;
    shakeCam(T, 0.8, 2, 9);
  } else {
    const k = E.io2(inv(5, 12, lt));
    setCam({ x: lerp(-3, 2, k), y: lerp(-3, -26, k), z: lerp(30.4, 0, k), F: 1100 });
    aim(lerp(-3.5, 8, k), lerp(-1.6, -8, k), lerp(41, 38, k), W / 2, H * 0.5);
    shakeCam(T, 0.35, 1, 9);
  }
  baseTransform();
  const draw = () => {
    baseTransform();
    drawRiver(L, T, {
      level, rough: inv(0, 4, lt), flow: 2 + lt * 0.2, storm: true,
      sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.35, -300, W * 0.55, H * 0.3, 21, f * (lt > 6 ? 1 : 0)); },
      inside: () => {
        // box floats away
        const bf = inv(1.4, 12, lt);
        at(8 - bf * 20, Math.min(0, level) + waterBob(T, 2, 0.2) * bf, 41 + bf * 30, () => drawBox({ wet: 0.6 + bf * 0.4, tilt: Math.sin(T * 1.7) * 0.2 * bf, flapUp: -bf }));
        crateStack(L, 1);
        mamaOnTop(T);
        sibsOnTop(T, { mouth1: pulse(lt, 2, 3, 0.1, 0.3) * 0.6 });
        if (lt < 3.1) at(pp.x, pp.y, 38.2, () => drawCatSide({ pal: PAL.pip, coat: 1, hood: 1, run: lt < 2.2 ? 1 : 0, stretch: lt >= 2.2 ? 1 : 0, gait: T * 16, t: T, size: 0.95, wet: 0.6 }));
        else at(CR.x - 1.2, -4.5, CR.z - 1.65, () => drawCatSit({ pal: PAL.pip, coat: 1, hood: 1, star: true, size: 0.95, t: T, wet: 0.8, turn: 0.4, brow: -0.5, pupil: 0.9, shadow: false }));
        if (lt < 4) splash(pp.x, Math.min(0, level), 38.2, Math.floor(lt * 3) / 3, lt, { n: 14, pow: 3, life: 0.4 });
      },
    });
    storm(T, 1.2);
  };
  if (mb > 2) motionBlur(draw, mb, 0, 8); else draw();
  flashFX(T, 0.5);
  post(T, { drops: 0.7, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S4 (37–49): nobody helped
function s4(lt, T) {
  const L = NIGHT;
  if (lt < 5) { // side dolly
    const px = lerp(-12, 22, lt / 5);
    setCam({ x: px - 0.6, y: -1.35, z: 4.6, F: 1100 });
    aim(px + 0.6, -1.0, 12.5, W / 2, H * 0.6);
    shakeCam(T, 0.25, 1.6, 4);
    baseTransform();
    drawStreetSide(L, T, {
      mid: () => {
        at(px, 0, 12.5, () => drawCatSide({ pal: PAL.pip, coat: 1, hood: 1, run: 1, gait: T * 15, t: T, size: 1, wet: 0.8, brow: 0.3 }));
        const step = Math.floor(lt * 5);
        splash(px - 0.2, 0, 12.5, step / 5, lt, { n: 10, pow: 2.5, life: 0.35, size: 0.05 });
      },
    });
    ripples(T, -0.01, { n: 70, zNear: 2, zFar: 30 });
    storm(T, 1, { wind: -0.15 });
  } else if (lt < 8) { // over the shoulder to the window
    const k = E.io2(inv(5, 8, lt));
    setCam({ x: 29.4, y: -1.9, z: lerp(13.5, 19.2, k), F: 1100 });
    aim(30, -3.6, 24.5, W / 2, H * 0.5);
    shakeCam(T, 0.15, 1, 4);
    baseTransform();
    drawStreetSide(L, T, {
      mid: () => {
        at(30, 0, 24.5, () => drawSnowWindowHouse(L, T, 1, () => {
          ctx.fillStyle = '#7a1f2b'; ellipse(0.2, -1.5, 1.6, 0.35); ctx.fill();
          ctx.save(); ctx.translate(0.2, -1.6); drawCatSit({ pal: PAL.snow, fluffy: true, collar: true, tabby: false, size: 1.1, turn: -0.3, t: T, blink: 0.45, brow: 0.3, shadow: false, lookX: 0.6 }); ctx.restore();
          ctx.fillStyle = 'rgba(220,240,255,0.5)'; ellipse(-1.9, -1.5, 0.5, 0.2); ctx.fill();
        }));
        at(29.6, 0, 22.6, () => drawCatBack({ pal: PAL.pip, coat: 1, hood: 1, t: T, wet: 0.9, pawUp: pulse(lt, 6.6, 8, 0.2, 0.2), tilt: Math.sin(T * 2) * 0.03 }));
      },
    });
    glow(W * 0.52, H * 0.45, 500, '#ffb070', 0.25);
    storm(T, 0.9);
  } else { // inside: Snow turns away, light off
    const k = inv(8, 12, lt);
    setCam({ x: 0.4, y: -2.7, z: lerp(5.8, 3.4, E.out2(k)), F: lerp(1550, 1200, E.out2(k)) });
    aim(0.2, -3.6, 10.5, W / 2, H * 0.5);
    baseTransform();
    const warm = lt < 10.2 ? 1 : Math.max(0, 1 - (lt - 10.2) * 12);
    const turnT = inv(9.3, 9.6, lt);
    drawRoom(T, warm, {
      outside: () => at(-0.7, -1.2, 12.6, () => drawCatSit({ pal: PAL.pip, coat: 1, hood: 1, star: true, size: 0.95, t: T, wet: 1, mouth: pulse(lt, 8.3, 9.2, 0.1, 0.2) * 0.8 + pulse(lt, 10.6, 11.4, 0.1, 0.3) * 0.5, brow: -0.9, pupil: 0.95, shadow: false })),
    });
    // Snow on the bench (z ~ 10)
    at(0.6, -1.2, 10.0, () => {
      const sx = turnT < 1 ? Math.abs(Math.cos(turnT * Math.PI)) : 1;
      ctx.scale(Math.max(sx, 0.05), 1);
      if (turnT < 0.5) drawCatBack({ pal: PAL.snow, fluffy: true, tabby: false, size: 1.1, t: T, shadow: true, tilt: Math.sin(T) * 0.03 });
      else drawCatSit({ pal: PAL.snow, fluffy: true, collar: true, tabby: false, size: 1.1, turn: 0.15, t: T, blink: 0.5, brow: 0.45, shadow: true, lookX: 0.4 });
    });
    if (warm < 1) { // cold window light only
      fillFrame('rgba(10,22,36,1)', 'multiply', 0.0);
      glow(W * 0.5, H * 0.32, 700, '#7fa8d0', 0.25 * (1 - warm));
    }
    if (warm > 0) glow(W * 0.6, H * 0.6, 900, '#ffb070', 0.12 * warm);
  }
  flashFX(T, 0.4);
  post(T, { drops: lt < 8 ? 0.6 : 0, vig: lt >= 10.2 ? 0.75 : 0.55, grade: lt < 8 ? { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } : { soft: ['#ffd0a0', '#101828'], softA: 0.3 } });
}

// ---------------------------------------------------------------- S5 (49–61): building the raft
function s5(lt, T) {
  const L = NIGHT;
  if (lt < 2.5) { // snap zoom on paw + bottle
    const F = lt < 0.25 ? lerp(1300, 2500, E.out5(lt / 0.25)) : lerp(2500, 2750, (lt - 0.25) / 2.25);
    setCam({ x: 0.5, y: -0.55, z: 1.0, F });
    aim(lerp(0.3, 0.62, E.io2(inv(0.6, 2.4, lt))), -0.12, 4.2, W / 2, H * 0.55);
    shakeCam(T, 0.2, 1.4, 2);
    baseTransform();
    drawAlley(L, T);
    const bx = lerp(0.5, 0.95, E.io2(inv(0.9, 2.3, lt)));
    at(bx, -0.08 + waterBob(T, 4, 0.02), 4.2, () => drawBottle({ rot: Math.sin(T * 2) * 0.05 }));
    const pawX = lerp(-0.75, bx - 0.62, E.io2(inv(0.3, 2.2, lt)));
    at(pawX, -0.12, 4.15, () => { // paw with yellow sleeve
      ctx.fillStyle = rgba(COAT.base); rrect(-1.6, -0.2, 1.3, 0.36, 0.14); ctx.fill();
      ctx.fillStyle = rgba(COAT.hi, 0.6); rrect(-1.5, -0.17, 1.1, 0.07, 0.03); ctx.fill();
      ctx.fillStyle = rgba(PAL.pip.fur); ellipse(-0.18, -0.02, 0.26, 0.17); ctx.fill();
      ctx.fillStyle = rgba(PAL.pip.light); ellipse(-0.04, 0.04, 0.12, 0.08); ctx.fill();
      ctx.strokeStyle = rgba(PAL.pip.dark); ctx.lineWidth = 0.02;
      ctx.beginPath(); ctx.moveTo(-0.1, -0.12); ctx.lineTo(-0.02, -0.02); ctx.moveTo(-0.16, -0.14); ctx.lineTo(-0.1, -0.02); ctx.stroke();
    });
    storm(T, 0.5);
  } else if (lt < 5.5) { // overhead, rotating
    const k = inv(2.5, 5.5, lt);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2, H / 2);
    ctx.rotate(lerp(0, Math.PI / 2, E.io2(k)));
    const sc = lerp(150, 205, E.io2(k));
    ctx.scale(sc, sc);
    // water + cobbles from above
    ctx.fillStyle = '#0d2330'; ctx.fillRect(-12, -12, 24, 24);
    for (let i = 0; i < 160; i++) { const x = (hash(i) - 0.5) * 18, y = (hash(i * 3) - 0.5) * 18; ctx.fillStyle = `rgba(60,80,90,${0.3 + hash(i * 5) * 0.3})`; ellipse(x, y, 0.45, 0.3, hash(i) * 3); ctx.fill(); }
    // ripples
    for (let i = 0; i < 26; i++) {
      const ph = mod(T * 1.3 + hash(i * 7), 1);
      ctx.strokeStyle = `rgba(200,230,240,${0.4 * (1 - ph)})`; ctx.lineWidth = 0.02;
      circle((hash(i * 2) - 0.5) * 14, (hash(i * 4) - 0.5) * 14, ph * 0.6); ctx.stroke();
    }
    // door from top
    ctx.save(); ctx.rotate(0.08);
    ctx.fillStyle = '#8e5c2f'; ctx.fillRect(-1.8, -3.2, 3.6, 6.4);
    ctx.strokeStyle = 'rgba(50,28,12,0.6)'; ctx.lineWidth = 0.04;
    ctx.strokeRect(-1.4, -2.8, 2.8, 2.6); ctx.strokeRect(-1.4, 0.2, 2.8, 2.6);
    ctx.fillStyle = '#D9A93F'; circle(1.4, 0, 0.09); ctx.fill();
    // bottles peeking out
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(-1.95, -2.4 + i * 1.6); drawBottle({ rot: Math.PI, cap: i % 2 ? '#E8453C' : '#2E86DE' }); ctx.restore(); }
    for (let i = 0; i < Math.floor(lerp(1, 4.99, k)); i++) { ctx.save(); ctx.translate(1.95, -2.4 + i * 1.6); drawBottle({ cap: i % 2 ? '#2E86DE' : '#E8453C' }); ctx.restore(); }
    // red lace snaking
    ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 0.08; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-1.9, -2.4); ctx.bezierCurveTo(-0.5, -2.2, 0.5, -2.6, 1.9, -2.4); ctx.bezierCurveTo(2.6, -1.5, 3.5, 0.5, 2.6, 2.4); ctx.stroke();
    ctx.restore();
    // Pip from above dragging a bottle
    ctx.save(); ctx.translate(lerp(1.5, 2.6, k), lerp(4.2, 1.2, k)); ctx.rotate(-0.4);
    drawCatTop({ pal: PAL.pip, coat: 1, hood: 1, size: 1, t: T, legsOut: 1 });
    ctx.save(); ctx.translate(0, -1.45); drawBottle({ rot: -Math.PI / 2 + 0.3, cap: '#E8453C' }); ctx.restore();
    ctx.restore();
    ctx.restore();
    // rain from above: dots
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 240; i++) { const x = mod(hash(i) * W + T * 40, W), y = mod(hash(i * 2) * H + T * 30, H); ctx.fillStyle = 'rgba(210,230,240,0.35)'; circle(x, y, 2 + hash(i * 3) * 2); ctx.fill(); }
    ctx.restore();
  } else if (lt < 9) { // low-angle dolly in: pulling the lace
    const k = inv(5.5, 9, lt);
    setCam({ x: 0.3, y: -0.5, z: lerp(1.6, 4.0, E.io2(k)), F: 1100 });
    aim(0.4, -1.3, 7.8, W / 2, H * 0.52);
    cam.sy += 140;
    shakeCam(T, 0.2, 1.5, 6);
    baseTransform();
    drawAlley(L, T);
    const tug = 0.5 + 0.5 * Math.sin(T * 7);
    at(-2.6, -0.15 + waterBob(T, 1, 0.03), 8.6, () => { ctx.scale(0.9, 0.9); drawRaft({ top: 0.5, wet: 0.6 }); });
    at(1.4 + tug * 0.12, 0, 7.6, () => drawCatSide({ pal: PAL.pip, coat: 1, hood: 1, pull: 0.6 + tug * 0.4, lace: true, t: T, wet: 0.9, brow: 0.9, mouth: 0.35, teeth: 1, crouch: 0.3 }));
    storm(T, 0.6);
  } else { // rack focus lace -> eyes
    const k = inv(9.3, 10.4, lt);
    setCam({ x: 0.2, y: -1.4, z: 1.2, F: 1500 });
    aim(0.3, -1.6, 5.6, W / 2, H * 0.48);
    shakeCam(T, 0.12, 1, 6);
    baseTransform();
    layer(() => {
      drawAlley(L, T);
      at(0.3, 0, 5.6, () => drawCatSit({ pal: PAL.pip, coat: 1, hood: 1, star: true, size: 1, t: T, wet: 0.9, turn: 0.2, brow: 0.95, pupil: 0.45, lookX: 0.1 }));
    }, { blur: lerp(14, 0, E.io2(k)) });
    layer(() => {
      at(0, -1.2, 2.2, () => {
        ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 0.11; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-2.2, 1.6); ctx.bezierCurveTo(-0.6, 0.4, 0.4, 0.2, 2.2, -1.4); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,190,190,0.6)'; ctx.lineWidth = 0.03;
        ctx.beginPath(); ctx.moveTo(-2.2, 1.57); ctx.bezierCurveTo(-0.6, 0.37, 0.4, 0.17, 2.2, -1.43); ctx.stroke();
        for (let i = 0; i < 6; i++) { const u = i / 5; ctx.fillStyle = 'rgba(220,240,255,0.7)'; circle(lerp(-2, 2, u), lerp(1.4, -1.2, u) + 0.08, 0.03); ctx.fill(); }
      });
    }, { blur: lerp(0, 16, E.io2(k)), slot: 1 });
    storm(T, 0.5);
  }
  flashFX(T, 0.45);
  post(T, { drops: lt > 2.5 && lt < 5.5 ? 0 : 0.5, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S6 (61–73): failure
function s6(lt, T) {
  const L = NIGHT;
  if (lt < 4) { // launch & flip in the flooded street
    const rz = -205 + lt * 3.2;
    const flip = E.in2(inv(2.95, 3.6, lt));
    setCam({ x: -6.5, y: -1.7, z: rz - 5.6, F: 1100 });
    aim(-6, -1.0, rz, W / 2, H * 0.58);
    shakeCam(T, 0.3 + flip * 3, 2, 8);
    cam.roll += Math.sin(flip * Math.PI) * 0.35;
    baseTransform();
    drawSky(L, T, { storm: true, cloudSpeed: 10 });
    drawCity(L, 420, -14, true);
    drawCanalSide(WORLD.canalL, L, -22, true, T, 0);
    drawCanalSide(WORLD.canalR, L, 10, true, T, 0);
    drawWater(L, T, 0, -22, 10, -400, 0, { rough: 0.6, flow: 2, lights: [[-14, -9, rz + 30, 1.5, 0.5], [2, -9, rz + 50, 1.5, 0.5]] });
    at(-14, 0, rz + 30, () => drawLampPost(9, 1)); at(2, 0, rz + 50, () => drawLampPost(9, 1));
    // log
    const lx = lerp(-20, -7.5, E.in2(inv(1.8, 2.95, lt)));
    at(lx, -0.1, rz + 0.4, () => { ctx.rotate(0.15); ctx.fillStyle = '#4a3020'; rrect(-3.2, -0.35, 6.4, 0.7, 0.35); ctx.fill(); ctx.fillStyle = '#6b4a30'; ellipse(3.2, 0, 0.2, 0.35); ctx.fill(); });
    at(-6, waterBob(T, 3, 0.15) - flip * 0.6, rz, () => {
      ctx.rotate(flip * 2.6);
      drawRaft({ top: 0.55, wet: 0.7 });
      ctx.translate(0, -0.3);
      if (lt < 3.3) drawCatBack({ pal: PAL.pip, coat: 1, hood: 1, t: T, wet: 0.9, shadow: false, tilt: Math.sin(T * 3) * 0.05 });
    });
    splash(-6, 0, rz, 3.2, lt, { n: 90, pow: 11, life: 1.2, size: 0.12 });
    glow3(-14, -9.7, rz + 30, 5, '#ffc070', 0.7); glow3(2, -9.7, rz + 50, 5, '#ffc070', 0.7);
    storm(T, 1.1);
    flashFX(T, 0.45);
    post(T, { drops: 0.7, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
    if (lt > 3.75) fillFrame('#0a2a35', 'source-over', inv(3.75, 4, lt));
  } else if (lt < 7) { // underwater, slow motion
    const k = inv(4, 7, lt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawUnderwater(T * 0.3, k);
    ctx.save();
    ctx.translate(W / 2 + Math.sin(T * 0.7) * 60, H * 0.45 + k * 220);
    ctx.rotate(-0.6 + k * 2.2);
    ctx.scale(330, 330);
    drawCatSide({ pal: PAL.pip, coat: 1, hood: 1, run: 0.5, gait: T * 2.5, t: T, wet: 1, blink: k > 0.6 ? 1 : 0, pupil: 1, brow: -0.8, mouth: 0.3, shadow: false });
    ctx.restore();
    bubbles(T, W / 2 + 40, H * 0.5 + k * 220, 26, 160, 3, 0.4);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(40,120,140,0.5)'; ctx.fillRect(0, 0, W, H); ctx.restore();
    vignette(0.75);
    fillFrame('#0a2a35', 'source-over', 1 - inv(4, 4.3, lt));
  } else { // top-down crane up from Pip lying on the steps
    const k = inv(7, 12, lt);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(W / 2, H * 0.5);
    ctx.rotate(lerp(0.1, 0.55, E.io2(k)));
    const sc = lerp(260, 70, E.io2(k));
    ctx.scale(sc, sc);
    // steps
    for (let i = -8; i < 8; i++) {
      ctx.fillStyle = rgba(mix('#3a4652', '#2a333c', (i + 8) % 2 ? 0.2 : 0.7));
      ctx.fillRect(-14, i * 1.4, 28, 1.35);
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-14, i * 1.4 + 1.2, 28, 0.15);
    }
    // water edge
    ctx.fillStyle = 'rgba(14,32,44,0.92)';
    ctx.beginPath(); ctx.moveTo(-14, 3.5); for (let x = -14; x <= 14; x += 0.5) ctx.lineTo(x, 3.5 + Math.sin(x * 0.9 + T * 1.5) * 0.15); ctx.lineTo(14, 14); ctx.lineTo(-14, 14); ctx.fill();
    // ripples
    for (let i = 0; i < 60; i++) {
      const ph = mod(T * 1.4 + hash(i * 7), 1);
      ctx.strokeStyle = `rgba(200,230,240,${0.35 * (1 - ph)})`; ctx.lineWidth = 0.03;
      circle((hash(i * 2) - 0.5) * 24, (hash(i * 4) - 0.5) * 24, ph * 0.5); ctx.stroke();
    }
    ctx.save(); ctx.translate(0.3, 1.0); ctx.rotate(1.2);
    drawCatTop({ pal: PAL.pip, coat: 1, hood: 1, size: 1, t: T, curl: 0.8 });
    ctx.restore();
    ctx.restore();
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (let i = 0; i < 300; i++) { const x = mod(hash(i) * W + T * 30, W), y = mod(hash(i * 2) * H + T * 20, H); ctx.fillStyle = 'rgba(210,230,240,0.3)'; circle(x, y, 2 + hash(i * 3) * 2.5); ctx.fill(); }
    ctx.restore();
    grade({ mult: '#7f9ab4' });
    vignette(0.75);
  }
}

// ---------------------------------------------------------------- S7 (73–85): he didn't give up
const STEP = { x: 6.5, y: -0.6, z: -180 };
function canalEnv(L, t, o = {}) {
  drawSky(L, t, { storm: true, cloudSpeed: 10 });
  if (o.sky) o.sky();
  drawCity(L, 420, -14, true);
  drawCanalSide(WORLD.canalL, L, -22, true, t, 0);
  drawCanalSide(WORLD.canalR, L, 10, true, t, 0);
  const lamps = [];
  for (let z = -320; z < 0; z += 26) lamps.push([-14, -9, z, 1.6, 0.5], [2, -9, z + 13, 1.6, 0.5]);
  drawWater(L, t, 0, -22, 10, -400, 40, Object.assign({ rough: 0.6, flow: 2.2, lights: lamps.filter((l) => l[2] > cam.z + 1) }, o.water || {}));
  for (const l of lamps) if (l[2] > cam.z + 0.5 && l[2] < cam.z + 200) at(l[0], 0, l[2], () => drawLampPost(9, 1));
  if (o.mid) o.mid();
  for (const l of lamps) if (l[2] > cam.z + 0.5 && l[2] < cam.z + 200) glow3(l[0], -9.7, l[2], 5, '#ffc070', 0.7);
}
function s7(lt, T) {
  const L = NIGHT;
  if (lt < 3) { // eye opens, reflection
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.save();
    ctx.translate(W / 2, H * 0.5);
    const sc = lerp(400, 450, lt / 3);
    ctx.scale(sc, sc);
    const op = lt < 0.4 ? 0 : lt < 1.0 ? E.out2(inv(0.4, 1.0, lt)) * 0.35 : lt < 1.3 ? 0.35 - 0.2 * pulse(lt, 1.0, 1.3, 0.15, 0.15) : lerp(0.35, 1, E.out3(inv(1.3, 2.2, lt)));
    const rb = lerp(0.12, 0, E.io2(inv(1.6, 2.6, lt)));
    drawBigEye({ pal: PAL.pip, open: op, pupil: 0.6, wet: 1, reflect: () => {
      ctx.save();
      ctx.filter = rb > 0.005 ? `blur(${(rb * sc).toFixed(1)}px)` : 'none';
      ctx.fillStyle = 'rgba(40,70,90,0.3)'; ctx.fillRect(-0.6, -0.75, 1.2, 1.5);
      ctx.fillStyle = 'rgba(255,190,110,0.9)'; circle(0.2, -0.42, 0.07); ctx.fill();
      ctx.fillStyle = 'rgba(255,190,110,0.35)'; circle(0.2, -0.42, 0.16); ctx.fill();
      ctx.fillStyle = 'rgba(150,110,70,0.95)';
      ctx.fillRect(-0.16, -0.02, 0.26, 0.2); ctx.fillRect(-0.14, 0.18, 0.26, 0.2); ctx.fillRect(-0.15, 0.38, 0.26, 0.2);
      ctx.fillStyle = 'rgba(180,190,200,0.95)'; circle(-0.03, -0.12, 0.09); circle(-0.13, -0.08, 0.06); circle(0.08, -0.08, 0.06); ctx.fill();
      ctx.fillStyle = 'rgba(120,150,170,0.6)'; ctx.fillRect(-0.6, 0.55, 1.2, 0.3);
      ctx.restore();
    } });
    ctx.restore();
    // rain drops on fur
    for (let i = 0; i < 18; i++) { const x = hash(i) * W, y = mod(hash(i * 2) * H + T * 60 * hash(i * 3), H); ctx.fillStyle = 'rgba(220,240,255,0.5)'; ellipse(x, y, 5, 9); ctx.fill(); }
    grade({ soft: ['#9fc8ff', '#06121c'], softA: 0.3 });
    vignette(0.7);
    return;
  }
  if (lt < 8) { // orbit, slow-mo shake
    const k = inv(3, 8, lt);
    const slowT = 3 + (lt - 3) * 0.3;
    const th = lerp(-1.0, 1.0, E.io2(k));
    const R = 5.2;
    setCam({ x: STEP.x + Math.sin(th) * R, y: -1.8, z: STEP.z - Math.cos(th) * R, F: 1250 });
    aim(STEP.x, STEP.y - 1.3, STEP.z, W / 2, H * 0.54);
    cam.roll = Math.sin(k * Math.PI * 2) * 0.06;
    baseTransform();
    canalEnv(L, T, {
      sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.7, -200, W * 0.4, H * 0.36, 31, f); },
      mid: () => {
        // stone step platform
        fill3([[STEP.x - 3, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, STEP.y, STEP.z + 2.5], [STEP.x - 3, STEP.y, STEP.z + 2.5]], rgba('#3a4652'));
        fill3([[STEP.x - 3, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, 0.5, STEP.z - 2.5], [STEP.x - 3, 0.5, STEP.z - 2.5]], rgba('#2a333c'));
        const spin = lerp(0, Math.PI * 1.5, E.io2(k)) - th * 0.5;
        const front = Math.cos(spin) > -0.2;
        at(STEP.x, STEP.y, STEP.z, () => {
          ctx.scale(lerp(0.8, 1, Math.abs(Math.cos(spin))), 1);
          const sh = { shiver: 3, t: slowT };
          if (front) drawCatSit(Object.assign({ pal: PAL.pip, coat: 1, hood: 0, star: true, t: slowT, wet: lerp(1, 0.4, k), turn: clamp(Math.sin(spin), -0.95, 0.95), blink: 1, mouth: 0.15, earBack: 0.6, shadow: true, tilt: Math.sin(slowT * 40) * 0.12 }, sh));
          else drawCatBack(Object.assign({ pal: PAL.pip, coat: 1, hood: 0, t: slowT, wet: 0.8, tilt: Math.sin(slowT * 40) * 0.12 }, sh));
        });
        // radial spray (slow motion)
        for (let i = 0; i < 70; i++) {
          const a = hash(i * 1.7) * TAU, sp = 1 + hash(i * 3.1) * 2.2;
          const d = mod((lt - 3) * 0.35 * sp + hash(i * 5.3) * 1.5, 2.6);
          const px = STEP.x + Math.cos(a) * d, py = STEP.y - 1.2 + Math.sin(a) * d * 0.7 + d * d * 0.15, pz = STEP.z + Math.sin(a * 1.7) * d * 0.4;
          const p = P(px, py, pz);
          if (!p) continue;
          ctx.fillStyle = `rgba(215,235,250,${0.75 * (1 - d / 2.6)})`;
          ellipse(p.x, p.y, Math.max(1.2, 0.045 * p.s), Math.max(1.5, 0.06 * p.s)); ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - d / 2.6)})`; circle(p.x - 0.015 * p.s, p.y - 0.02 * p.s, Math.max(0.5, 0.015 * p.s)); ctx.fill();
        }
      },
    });
    rain(T, { n: 900, speed: 70, slow: 0.25 });
    flashFX(T, 0.5);
    post(T, { drops: 0.5, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
    return;
  }
  // heroic low-angle push-in
  const k = inv(8, 12, lt);
  setCam({ x: STEP.x - 0.2, y: -0.75, z: lerp(STEP.z - 5.2, STEP.z - 2.9, E.io2(k)), F: lerp(1250, 1500, k) });
  aim(STEP.x + 0.6, STEP.y - 1.5, STEP.z, W / 2, H * 0.5);
  shakeCam(T, 0.12, 1, 4);
  baseTransform();
  canalEnv(L, T, {
    sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.55, -150, W * 0.62, H * 0.4, 41, f); },
    mid: () => {
      fill3([[STEP.x - 3, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, STEP.y, STEP.z + 2.5], [STEP.x - 3, STEP.y, STEP.z + 2.5]], rgba('#3a4652'));
      fill3([[STEP.x - 3, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, STEP.y, STEP.z - 2.5], [STEP.x + 3.5, 0.5, STEP.z - 2.5], [STEP.x - 3, 0.5, STEP.z - 2.5]], rgba('#2a333c'));
      at(STEP.x - 2.6, 0.1 + waterBob(T, 2, 0.06), STEP.z + 0.5, () => { ctx.scale(0.85, 0.85); drawRaft({ top: 0.5, wet: 0.7 }); });
      const grab = inv(9.0, 9.6, lt);
      at(STEP.x + 0.4, STEP.y, STEP.z, () => drawCatSide({ pal: PAL.pip, coat: 1, hood: 0, t: T, wet: 0.5, brow: 0.95, headUp: 1, plank: grab > 0.5, crouch: pulse(lt, 8.8, 9.6, 0.2, 0.2) * 0.4, tilt: -0.1, size: 1.05 }));
      if (grab <= 0.5) at(STEP.x + 1.7, STEP.y - 0.07, STEP.z - 0.3, () => drawPlank(1.4));
    },
  });
  glow(W * 0.5, H * 0.25, 800, '#c8d8ff', 0.15);
  storm(T, 1);
  flashFX(T, 0.6);
  post(T, { drops: 0.6, vig: 0.55, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S8 (85–97): the chase
function s8(lt, T) {
  const L = NIGHT;
  if (lt < 5) { // FPV behind the raft, with a whip pan to the barrel
    const rz = -150 + lt * 10;
    const rx = -6 + Math.sin(lt * 1.3) * 1.8;
    const whip = pulse(lt, 4.0, 4.9, 0.25, 0.4);
    setCam({ x: rx - Math.cos(lt * 1.3) * 0.8, y: -1.25 + Math.sin(T * 5) * 0.08, z: rz - 4.4, F: 1000 });
    aim(rx + whip * 4.5, -0.9, rz, W / 2, H * 0.6);
    cam.roll = -Math.cos(lt * 1.3) * 0.08;
    shakeCam(T, 0.35, 2.2, 5);
    const bump = pulse(lt, 4.55, 4.9, 0.03, 0.3);
    const draw = () => {
      baseTransform();
      canalEnv(L, T, {
        water: { rough: 0.8, flow: 6 },
        mid: () => {
          // submerged car with blinking amber lights
          for (const cz of [-118, -84, -40]) {
            at(-14.5, 0.2, cz, () => { ctx.fillStyle = '#1a2a34'; rrect(-2.2, -0.5, 4.4, 0.9, 0.4); ctx.fill(); });
            const on = mod(T, 0.7) < 0.35;
            if (on) { glow3(-16.2, 0.2, cz, 2.2, '#ff9a2a', 0.8); glow3(-12.8, 0.2, cz, 2.2, '#ff9a2a', 0.8); }
          }
          // barrel
          const bx = lerp(4, rx + 1.6, E.io2(inv(3.6, 4.6, lt)));
          at(bx, -0.3 + waterBob(T, 6, 0.15), rz + 0.8, () => { ctx.scale(0.55, 0.55); drawBarrel({ rot: Math.PI / 2 + Math.sin(T) * 0.2 }); });
          at(rx, waterBob(T, 1, 0.12) - bump * 0.3, rz, () => {
            ctx.rotate(Math.sin(T * 2.2) * 0.06 + bump * 0.2);
            drawRaft({ top: 0.55, wet: 0.7 });
            ctx.translate(0, -0.3);
            drawCatBack({ pal: PAL.pip, coat: 1, hood: 1, t: T, wet: 0.6, shadow: false, pawUp: 0.5 + 0.5 * Math.sin(T * 6), tilt: Math.sin(T * 6) * 0.06 });
          });
          splash(rx + 1.6, 0, rz + 0.8, 4.6, lt, { n: 40, pow: 6, life: 0.8 });
          for (let i = 0; i < 4; i++) splash(rx + (i - 1.5) * 1.2, 0, rz - 1.4, Math.floor(lt * 4) / 4 + i * 0.05, lt, { n: 6, pow: 3, life: 0.4, size: 0.06 });
        },
      });
      storm(T, 1, { wind: -0.4 });
    };
    const mb = Math.sin(inv(4.0, 4.5, lt) * Math.PI) * 180 - Math.sin(inv(4.5, 4.9, lt) * Math.PI) * 120;
    if (Math.abs(mb) > 2) motionBlur(draw, mb, 0, 7); else draw();
  } else if (lt < 8) { // side tracking under the swinging sign (flooded street side)
    const k = inv(5, 8, lt);
    const rx = lerp(-6, 18, k);
    setCam({ x: rx + 0.5, y: -2.2, z: 3.2, F: 1100 });
    aim(rx + 0.8, -2.2, 12.5, W / 2, H * 0.58);
    shakeCam(T, 0.3, 2, 2);
    baseTransform();
    const signX = 9;
    const passing = pulse(rx, signX - 2, signX + 2, 1.2, 1.2);
    drawStreetSide(L, T, {
      level: -2.6,
      mid: () => {
        at(rx, -2.6 + waterBob(T, 1, 0.12), 12.5, () => {
          drawRaft({ top: 0.5, wet: 0.7, tilt: Math.sin(T * 2.5) * 0.05 });
          ctx.translate(0.2, -0.3);
          drawCatSide({ pal: PAL.pip, coat: 1, hood: 1, t: T, wet: 0.6, crouch: 0.2 + passing * 0.6, headUp: 1 - passing, brow: 0.8, plank: true, size: 1 });
        });
        // cable + hanging sign
        line3([[signX - 30, -9.5, 12.5], [signX + 30, -9.5, 12.5]]); ctx.strokeStyle = '#1b1f24'; ctx.lineWidth = 3; ctx.stroke();
        at(signX - 1.7, -9.5, 12.5, () => drawSign({ swing: Math.sin(T * 3.2) * 0.35 * (1 + passing) }));
        splash(rx - 1.5, -2.6, 12.5, Math.floor(lt * 3) / 3, lt, { n: 12, pow: 4, life: 0.5 });
      },
    });
    storm(T, 1);
  } else { // fast dolly forward, bridge ahead
    const k = inv(8, 12, lt);
    const rz = lerp(-48, -6, E.in2(k));
    setCam({ x: -6.2, y: lerp(-1.4, -3.5, k), z: lerp(-62, -26, E.in2(k)), F: 1050 });
    aim(-6, -6, 36, W / 2, H * 0.42);
    shakeCam(T, 0.3, 2, 6);
    baseTransform();
    drawRiver(L, T, {
      level: FLOOD, rough: 1, flow: 6, storm: true, crack: 0.2,
      sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.5, -200, W * 0.48, H * 0.3, 51, f); },
      inside: () => { crateStack(L, 1); mamaOnTop(T); sibsOnTop(T); },
      front: () => {
        drawCanalSide(WORLD.canalL, L, -22, true, T, FLOOD);
        drawCanalSide(WORLD.canalR, L, 10, true, T, FLOOD);
        at(-6, FLOOD + waterBob(T, 1, 0.12), rz, () => { drawRaft({ top: 0.55, wet: 0.7 }); ctx.translate(0, -0.3); drawCatBack({ pal: PAL.pip, coat: 1, hood: 1, t: T, wet: 0.6, shadow: false }); });
      },
    });
    storm(T, 1.1, { wind: -0.35 });
  }
  flashFX(T, 0.5);
  post(T, { drops: 0.8, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S9 (97–109): at the bridge
const RAFT9 = { x: 11.3, z: 37.2 };
function jumpPos(lt, t0) { // sibling jump from crate top to raft
  const k = inv(t0, t0 + 0.7, lt);
  return { k, x: lerp(15.4, RAFT9.x + 0.5, k), y: lerp(-7.5, FLOOD - 0.65, k) - Math.sin(k * Math.PI) * 2.2, z: lerp(39.1, RAFT9.z - 0.2, k) };
}
function s9(lt, T) {
  if (lt < 1) { sHook(lerp(0.2, 1.5, lt), T); return; }
  const L = NIGHT;
  const jumps = [2.5, 4.0, 5.5];
  const landed = jumps.filter((j) => lt > j + 0.7).length;
  let dip = 0; for (const j of jumps) dip += Math.exp(-Math.max(0, lt - j - 0.7) * 5) * (lt > j + 0.7 ? 0.25 : 0);
  const ry = FLOOD + waterBob(T, 1, 0.1) + dip;
  if (lt < 7) {
    const k = inv(1, 7, lt);
    const th = lerp(-0.95, 0.85, E.io2(k));
    const tx = 12.8, tz = 37.8, R = 9.5;
    setCam({ x: tx + Math.sin(th) * R, y: -4.2, z: tz - Math.cos(th) * R, F: 1100 });
    aim(tx, -3.6, tz, W / 2, H * 0.52);
    shakeCam(T, 0.3, 1.5, 3);
  } else if (lt < 9) {
    setCam({ x: RAFT9.x - 1.0, y: -2.1, z: RAFT9.z - 5.2, F: 2100 });
    aim(RAFT9.x + 0.4, ry - 0.5, RAFT9.z, W / 2, H * 0.58);
    shakeCam(T, 0.4, 2, 3);
  } else {
    const k = E.io2(inv(9, 12, lt));
    setCam({ x: 12.6, y: -3.4, z: 29.5, F: 1350 });
    aim(lerp(RAFT9.x, 15.2, k), lerp(ry - 1, -8.6, k), lerp(RAFT9.z, 39.8, k), W / 2, H * 0.52);
    shakeCam(T, 0.2, 1, 3);
  }
  baseTransform();
  drawRiver(L, T, {
    level: FLOOD, rough: 1, flow: 3.5, storm: true, crack: 0.55,
    sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.3, -200, W * 0.5, H * 0.3, 61, f); },
    inside: () => {
      crateStack(L, 1);
      mamaOnTop(T, { cat: { lookY: 0.6, lookX: -0.5 } });
      const skip = [];
      jumps.forEach((j, i) => { if (lt > j) skip.push(i + 1); });
      sibsOnTop(T, { skip });
      // raft and passengers
      at(RAFT9.x, ry, RAFT9.z, () => {
        drawRaft({ top: 0.6, wet: 0.7, tilt: Math.sin(T * 2) * 0.04 });
        ctx.translate(-0.7, -0.3);
        drawCatSit({ pal: PAL.pip, coat: 1, hood: 1, star: true, t: T, wet: 1, turn: 0.4, brow: -0.3, pupil: 0.8, lookY: -0.7, lookX: 0.5, shadow: false, mouth: pulse(lt, 1.6, 2.3) * 0.7 });
        const sibPals = [PAL.sib1, PAL.sib3, PAL.sib2];
        for (let i = 0; i < landed; i++) {
          ctx.save(); ctx.translate(1.0 + i * 0.55, 0.02);
          const sq = 1 - 0.2 * Math.exp(-(lt - jumps[i] - 0.7) * 8);
          drawCatSit({ pal: sibPals[i], size: 0.72, t: T + i, wet: 1, turn: -0.3, tabby: i !== 1, shadow: false, squash: sq, brow: -0.4 });
          ctx.restore();
        }
      });
      jumps.forEach((j, i) => {
        const jp = jumpPos(lt, j);
        if (jp.k > 0 && jp.k < 1) at(jp.x, jp.y, jp.z, () => drawCatSide({ pal: [PAL.sib1, PAL.sib3, PAL.sib2][i], size: 0.72, flip: true, stretch: 1, t: T, wet: 1, tabby: i !== 1 }));
        splash(RAFT9.x + 0.5, FLOOD, RAFT9.z, j + 0.7, lt, { n: 30, pow: 5, life: 0.7 });
      });
    },
  });
  storm(T, 1.1);
  flashFX(T, 0.5);
  post(T, { drops: 0.7, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S10 (109–121): Mama falls
function s10(lt, T) {
  const L = NIGHT;
  const fallK = inv(0.45, 1.0, lt);
  const mamaWater = { x: lerp(14.2, 9.5, inv(1, 6, lt)), z: lerp(38.6, 39.6, inv(1, 6, lt)) };
  if (lt < 1) { // whip pan to mama falling
    const k = E.io3(inv(0, 0.5, lt));
    setCam({ x: 12.5, y: -4, z: 29.5, F: 1250 });
    aim(lerp(RAFT9.x, 15, k), lerp(-2.4, -6.5, k), 38.5, W / 2, H * 0.5);
    shakeCam(T, 0.6, 2, 2);
    const draw = () => {
      baseTransform();
      drawRiver(L, T, {
        level: FLOOD, rough: 1, flow: 3.5, storm: true, crack: 0.6,
        inside: () => {
          crateStack(L, 1, fallK * 0.25);
          at(RAFT9.x, FLOOD + waterBob(T, 1, 0.1), RAFT9.z, () => { drawRaft({ top: 0.6, wet: 0.7 }); });
          const mx = lerp(15.3, 14.2, fallK), my = lerp(-7.5, FLOOD + 0.6, E.in2(fallK));
          at(mx, my, lerp(39.9, 38.6, fallK), () => { ctx.rotate(fallK * 1.2); drawCatSit({ pal: PAL.mama, size: 1.15, wet: 1, t: T, pupil: 1, brow: -0.9, mouth: 0.6, earBack: 1, shadow: false }); });
          splash(14.2, FLOOD, 38.6, 1.0, lt, { n: 80, pow: 9, life: 1.2, size: 0.12 });
        },
      });
      storm(T, 1.1);
    };
    const mb = Math.sin(inv(0, 0.5, lt) * Math.PI) * 220;
    if (mb > 2) motionBlur(draw, 0, -mb, 7); else draw();
  } else if (lt < 5) { // waterline split
    const k = inv(1, 5, lt);
    setCam({ x: mamaWater.x - 0.5, y: FLOOD - 0.02, z: mamaWater.z - 6.5, F: 1200 });
    aim(mamaWater.x, FLOOD, mamaWater.z, W / 2, H * 0.5);
    cam.roll = Math.sin(T * 1.6) * 0.04;
    const bob = Math.sin(T * 3) * 0.2;
    baseTransform();
    const wl = horizonY();
    // above water
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W, wl); ctx.clip(); baseTransform();
    drawRiver(L, T, {
      level: FLOOD, rough: 1, flow: 3.5, storm: true, crack: 0.65,
      inside: () => {
        crateStack(L, 1, 0.25);
        // bottle on lace drifting toward mama
        const bx = lerp(mamaWater.x - 4.5, mamaWater.x - 0.6, E.io2(inv(1.8, 3.6, lt)));
        at(bx, FLOOD - 0.1, mamaWater.z - 0.3, () => drawBottle({ rot: Math.sin(T * 2) * 0.2 }));
        line3([[bx, FLOOD - 0.1, mamaWater.z - 0.3], [mamaWater.x - 8, FLOOD - 0.3, mamaWater.z - 1.5]]); ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 4; ctx.stroke();
        at(mamaWater.x, FLOOD - 0.42 + bob * 0.5, mamaWater.z, () => {
          catHeadOnly({ pal: PAL.mama, wet: 1, t: T, pupil: 1, brow: -0.9, mouth: pulse(lt, 2.0, 2.8, 0.1, 0.3) * 0.7 + (lt > 3.9 ? 0.4 : 0), earBack: 0.8, size: 1.15 });
        });
        splash(mamaWater.x, FLOOD, mamaWater.z, Math.floor(lt * 2.5) / 2.5, lt, { n: 14, pow: 3, life: 0.5 });
      },
    });
    storm(T, 1);
    ctx.restore();
    // under water
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.beginPath(); ctx.rect(0, wl, W, H - wl); ctx.clip();
    ctx.fillStyle = vgrad(wl, H, [[0, '#1d5a68'], [1, '#03121a']]); ctx.fillRect(0, wl, W, H - wl);
    baseTransform();
    at(mamaWater.x - 0.95, FLOOD + 1.0 + bob * 0.5, mamaWater.z, () => {
      ctx.save(); ctx.globalAlpha = 0.85;
      drawCatSide({ pal: PAL.mama, size: 1.15, run: 1, gait: T * 7, t: T, wet: 1, shadow: false, tail: true });
      ctx.restore();
    });
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    bubbles(T, W * 0.55, H * 0.8, 16, 200, 5, 0.8);
    ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = 'rgba(60,140,160,0.6)'; ctx.fillRect(0, wl, W, H - wl);
    ctx.restore();
    // waterline meniscus
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = 'rgba(220,240,250,0.7)'; ctx.lineWidth = 5;
    ctx.beginPath(); for (let x = 0; x <= W; x += 18) { const y = wl + Math.sin(x * 0.03 + T * 4) * 7; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
    ctx.restore();
  } else if (lt < 7) { // close-up: teeth on the lace
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawUnderwater(T, 0.2);
    fillFrame('rgba(10,25,35,1)', 'source-over', 0.6);
    ctx.save();
    ctx.translate(W / 2 + Math.sin(T * 9) * 6, H * 0.5 + Math.sin(T * 3) * 20);
    ctx.scale(820, 820);
    ctx.translate(0, -0.15);
    catHead(catOpts({ pal: PAL.mama, wet: 1, t: T, pupil: 0.95, brow: -0.35, blink: 0.1, mouth: 0.35, teeth: 1, turn: 0.15, earBack: 0.5 }));
    ctx.strokeStyle = '#D7263D'; ctx.lineWidth = 0.065; ctx.lineCap = 'round';
    const pull = Math.sin(T * 10) * 0.02;
    ctx.beginPath(); ctx.moveTo(-1.5, 0.34 + pull); ctx.quadraticCurveTo(0, 0.28, 1.5, 0.18 - pull); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,190,0.6)'; ctx.lineWidth = 0.02;
    ctx.beginPath(); ctx.moveTo(-1.5, 0.32 + pull); ctx.quadraticCurveTo(0, 0.26, 1.5, 0.16 - pull); ctx.stroke();
    ctx.restore();
    for (let i = 0; i < 26; i++) { const x = hash(i) * W, y = mod(hash(i * 2) * H + T * 300, H); ctx.fillStyle = 'rgba(220,240,255,0.45)'; ellipse(x, y, 4, 14); ctx.fill(); }
    grade({ soft: ['#9fc8ff', '#06121c'], softA: 0.3 });
  } else { // Pip pulls; push-in to his face
    const k = inv(7, 12, lt);
    const up = E.io2(inv(9.6, 10.6, lt));
    setCam({ x: RAFT9.x - 1.5, y: -2.4, z: RAFT9.z - 7.5, F: lerp(1150, 1900, E.io2(inv(7, 10, lt))) });
    aim(RAFT9.x + 0.6, FLOOD - 1.6, RAFT9.z, W / 2, H * 0.52);
    shakeCam(T, 0.5 + (lt < 10 ? 0.4 : 0), 2.5, 7);
    baseTransform();
    const tug = 0.5 + 0.5 * Math.sin(T * 8);
    drawRiver(L, T, {
      level: FLOOD, rough: 1, flow: 3.5, storm: true, crack: 0.7,
      inside: () => {
        crateStack(L, 1, 0.25);
        at(RAFT9.x, FLOOD + waterBob(T, 1, 0.1), RAFT9.z, () => {
          drawRaft({ top: 0.6, wet: 0.7, tilt: -0.05 * tug });
          ctx.save(); ctx.translate(-1.2, -0.3);
          const sp = [PAL.sib1, PAL.sib3, PAL.sib2];
          for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-0.4 + i * 0.5, 0); drawCatSit({ pal: sp[i], size: 0.68, t: T + i, wet: 1, turn: 0.5, tabby: i !== 1, shadow: false, brow: -0.6, pupil: 0.9 }); ctx.restore(); }
          ctx.restore();
          ctx.save(); ctx.translate(0.35, -0.3);
          drawCatSide({ pal: PAL.pip, coat: 1, hood: 1, flip: true, pull: lt < 10.4 ? 0.7 + tug * 0.3 : 0, lace: lt < 10.4, t: T, wet: 1, brow: 0.95, mouth: 0.35, teeth: 1, crouch: 0.35 });
          ctx.restore();
          if (up > 0) { ctx.save(); ctx.translate(lerp(3.2, 1.6, up), lerp(1.2, -0.3, up)); drawCatSide({ pal: PAL.mama, size: 1.1, flip: true, stretch: 1 - up, t: T, wet: 1, blink: up > 0.9 ? 1 : 0.3, shadow: false }); ctx.restore(); }
        });
        if (up < 0.05) at(RAFT9.x + 3.6, FLOOD + 0.4 + Math.sin(T * 3) * 0.15, RAFT9.z + 0.5, () => catHeadOnly({ pal: PAL.mama, wet: 1, t: T, brow: -0.6, mouth: 0.3, teeth: 1, size: 1.1 }));
        splash(RAFT9.x + 2, FLOOD, RAFT9.z, 10.0, lt, { n: 50, pow: 6, life: 1 });
      },
    });
    storm(T, 1.1);
  }
  flashFX(T, 0.5);
  if (lt > 1 && lt < 5) vignette(0.5); else post(T, { drops: 0.7, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}
function catHeadOnly(o) {
  o = catOpts(o);
  ctx.save(); ctx.scale(o.size, o.size);
  catHead(o);
  ctx.restore();
}

// ---------------------------------------------------------------- S11 (121–132): the bridge falls
function familyRaft(T, o = {}) {
  drawRaft({ top: 0.6, wet: 0.7, tilt: o.tilt ?? 0 });
  ctx.save(); ctx.translate(0, -0.3);
  ctx.save(); ctx.translate(0.6, 0); drawCatSit({ pal: PAL.mama, size: 1.0, t: T, wet: 1, turn: -0.2, shadow: false, blink: 0.4, brow: -0.4, lookY: o.look ?? 0 }); ctx.restore();
  const sp = [PAL.sib1, PAL.sib3, PAL.sib2];
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-0.3 + i * 0.45, 0.05); drawCatSit({ pal: sp[i], size: 0.62, t: T + i, wet: 1, turn: 0.3 - i * 0.3, tabby: i !== 1, shadow: false, pupil: 0.9, lookY: o.look ?? 0 }); ctx.restore(); }
  ctx.save(); ctx.translate(-1.1, 0); drawCatSit({ pal: PAL.pip, coat: 1, hood: 1, star: true, t: T, wet: 1, turn: 0.5, shadow: false, brow: 0.6, lookY: o.look ?? 0, size: 0.95, plank: false }); ctx.restore();
  ctx.restore();
}
function s11(lt, T) {
  const L = NIGHT;
  if (lt < 3) { // crane up, cracks spread
    const k = E.io2(inv(0, 3, lt));
    setCam({ x: lerp(9, 4, k), y: lerp(FLOOD - 0.4, -24, k), z: lerp(28, 4, k), F: 1100 });
    aim(lerp(RAFT9.x, -2, k), lerp(FLOOD - 1, -24, k), 37, W / 2, H * 0.5);
    shakeCam(T, 0.6 + lt * 0.2, 2, 4);
    baseTransform();
    let removed;
    drawRiver(L, T, {
      level: FLOOD, rough: 1, flow: 3.5, storm: true, crack: lerp(0.7, 1, k),
      sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.6, -200, W * 0.45, H * 0.3, 71, f); },
      inside: () => { crateStack(L, 1, 0.25); at(RAFT9.x - 1, FLOOD + waterBob(T, 1, 0.1), RAFT9.z + inv(0, 3, lt) * 1.5, () => familyRaft(T, { look: -0.8 })); },
      afterFace: () => { removed = fallingStones(L, lt, WORLD.fallers.slice(0, 14), 0.8, 2.0); },
      front: () => dust(T, BR.cx, BR.spring - BR.R, BR.zF, inv(1, 3, lt) * 0.7),
    });
    storm(T, 1.1);
  } else if (lt < 8) { // super slow motion under the arch
    const k = inv(3, 8, lt);
    const sl = 3 + (lt - 3) * 0.2;
    const rz = lerp(38.5, 41.5, k);
    setCam({ x: RAFT9.x - 5.5, y: -2.8, z: rz - 5.5, F: 1150 });
    aim(RAFT9.x - 1, FLOOD - 2.2, rz, W * 0.52, H * 0.55);
    cam.roll = 0.05;
    baseTransform();
    drawRiver(L, sl + 120, {
      level: FLOOD, rough: 1, flow: 0.7, storm: true, crack: 1,
      inside: () => {
        // falling stones inside the vault (slow)
        for (let i = 0; i < 9; i++) {
          const ts = 3 + hash(i * 3.1) * 4;
          const dt = Math.max(0, (lt - ts)) * 0.35;
          if (lt < ts) continue;
          const sx = RAFT9.x - 6 + hash(i * 1.7) * 9, sz = rz - 1 + hash(i * 2.3) * 6;
          const sy = -16 + 0.5 * 30 * dt * dt;
          if (sy < FLOOD) at(sx, sy, sz, () => { ctx.rotate(dt * (hash(i) - 0.5) * 6); ctx.fillStyle = rgba(mix(L.stone, L.stoneDark, hash(i * 9))); rrect(-0.9, -0.6, 1.8, 1.2, 0.25); ctx.fill(); });
          else splash(sx, FLOOD, sz, ts + Math.sqrt((FLOOD + 16) * 2 / 30) / 0.35, lt, { n: 40, pow: 7, life: 1.4, slow: 0.35 });
        }
        at(RAFT9.x - 1, FLOOD + waterBob(sl, 1, 0.1), rz, () => familyRaft(sl, { look: -1 }));
        // dust motes
        for (let i = 0; i < 60; i++) { const p = P(RAFT9.x - 8 + hash(i) * 16, -14 + hash(i * 2) * 14 + mod(lt * 0.3 * hash(i * 3), 3), rz - 2 + hash(i * 5) * 8); if (p) { ctx.fillStyle = `rgba(200,200,200,${0.15 + hash(i * 7) * 0.2})`; circle(p.x, p.y, 0.05 * p.s + 1); ctx.fill(); } }
      },
    });
    rain(T, { n: 500, slow: 0.2, speed: 70 });
  } else { // speed ramp: burst out, wide pull-back, arch collapses
    const k = inv(8, 11, lt);
    const ramp = E.in2(clamp((lt - 8) / 0.8));
    const rz = lerp(38, 16, E.out3(k));
    setCam({ x: lerp(2, -2, k), y: lerp(-4, -22, E.io2(k)), z: lerp(18, -14, E.io2(k)), F: 1100 });
    aim(lerp(RAFT9.x - 2, -4, k), lerp(-3, -16, k), lerp(rz, 36, k), W / 2, H * 0.55);
    shakeCam(T, 1.2 * (1 - k * 0.6), 2.5, 4);
    baseTransform();
    const ck = inv(8.3, 11, lt); // collapse progress
    const dropV = (v) => Math.abs((v.a0 + v.a1) / 2 - Math.PI * 1.5) < ck * 1.4;
    drawRiver(L, T, {
      level: FLOOD, rough: 1, flow: 4, storm: true, crack: 1, dropVous: dropV, erase: true, faceLayer: (fn) => layer(fn, { slot: 1 }), removed: new Set(WORLD.stones.map((s, i) => i).filter((i) => { const s = WORLD.stones[i]; return Math.abs(s.x + s.w / 2 - BR.cx) < ck * 30 && s.y < BR.spring - BR.R + 6; })),
      sky: () => { const f = flashAt(T, STRIKES); bolt(W * 0.4, -200, W * 0.6, H * 0.3, 81, f); },
      inside: () => { crateStack(L, 1, 0.4); },
      afterFace: () => {
        // falling voussoir chunks
        for (const v of WORLD.vous) {
          if (!dropV(v)) continue;
          const t0 = 8.3 + Math.abs((v.a0 + v.a1) / 2 - Math.PI * 1.5) / 1.4 * 2.7;
          const dt = Math.max(0, lt - t0);
          const am = (v.a0 + v.a1) / 2, rm = BR.R + 1.65;
          const cx = BR.cx + Math.cos(am) * rm, cy = BR.spring + Math.sin(am) * rm + 0.5 * 34 * dt * dt;
          if (cy > FLOOD + 2) { splash(cx, FLOOD, BR.zF - 1, t0 + Math.sqrt((FLOOD + 2 - (BR.spring + Math.sin(am) * rm)) * 2 / 34), lt, { n: 30, pow: 9, life: 1.2, size: 0.25 }); continue; }
          at(cx, cy, BR.zF - 0.5 - dt * 2, () => {
            ctx.rotate(dt * (v.c - 0.5) * 3);
            ctx.translate(-Math.cos(am) * rm, -Math.sin(am) * rm);
            ctx.beginPath(); ctx.arc(0, 0, BR.R + 3.3, v.a0, v.a1); ctx.arc(0, 0, BR.R, v.a1, v.a0, true); ctx.closePath();
            ctx.fillStyle = rgba(mix(L.stone, L.stoneDark, v.c)); ctx.fill();
          });
        }
        fallingStones(L, lt, WORLD.fallers, 8.4, 2.4);
      },
      front: () => {
        at(RAFT9.x - 1.5 - k * 3, FLOOD + waterBob(T, 1, 0.12), rz, () => familyRaft(T, { look: k > 0.5 ? 0 : -0.6 }));
        splash(RAFT9.x - 2, FLOOD, rz + 1.5, 8.4, lt, { n: 60, pow: 8, life: 1.2 });
        dust(T, BR.cx, BR.spring - BR.R + 2, BR.zF, ck * 1.2, 3);
      },
    });
    storm(T, 1.1);
    if (lt < 8.2) fillFrame('#ffffff', 'source-over', (1 - inv(8, 8.2, lt)) * 0.6);
  }
  flashFX(T, 0.5);
  post(T, { drops: 0.6, vig: 0.6, grade: { soft: ['#9fc8ff', '#06121c'], softA: 0.35 } });
}

// ---------------------------------------------------------------- S12 (132–150): dawn
const RAFTD = { x: 6, z: 30 }, SNOWH = { x: 17, z: 44 };
function dawnFamily(T, lt, o = {}) {
  drawRaft({ top: 0.6, wet: 0.4, tilt: Math.sin(T * 1.2) * 0.03 });
  ctx.save(); ctx.translate(0, -0.3);
  // family huddled under the yellow raincoat
  ctx.save(); ctx.translate(-0.5, 0);
  const lick = o.lick || 0;
  const sp = [PAL.sib1, PAL.sib3, PAL.sib2];
  ctx.save(); ctx.translate(0.15, 0);
  // coat as blanket over everyone
  ctx.fillStyle = vgrad(-1.6, 0, [[0, COAT.hi], [0.4, COAT.base], [1, COAT.dark]]);
  ctx.beginPath(); ctx.moveTo(-1.3, 0); ctx.bezierCurveTo(-1.4, -0.7, -0.6, -0.85, 0.2, -0.8); ctx.bezierCurveTo(0.9, -0.78, 1.3, -0.6, 1.25, 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = rgba(COAT.line, 0.8); ctx.lineWidth = 0.03; ctx.stroke();
  ctx.fillStyle = rgba(COAT.hi, 0.5); ellipse(-0.6, -0.55, 0.08, 0.2, 0.4); ctx.fill();
  ctx.restore();
  for (let i = 0; i < 3; i++) { ctx.save(); ctx.translate(-0.55 + i * 0.5, -0.45); ctx.scale(0.62, 0.62); ctx.translate(0, 1.5); ctx.save(); ctx.translate(0, -1.5); catHead(catOpts({ pal: sp[i], t: T + i, turn: 0.2 - i * 0.2, tabby: i !== 1, blink: i === 1 ? 1 : 0.3, happy: i === 0 ? 1 : 0 })); ctx.restore(); ctx.restore(); }
  ctx.save(); ctx.translate(0.55 + lick * 0.25, -0.6 * 0); drawCatSit({ pal: PAL.mama, size: 0.95, t: T, turn: -0.5 - lick * 0.3, tilt: -lick * 0.35, blink: lick > 0.3 ? 1 : 0.2, happy: lick > 0.3 ? 1 : 0, mouth: lick * 0.5, coat: 0, shadow: false, brow: 0 }); ctx.restore();
  ctx.restore();
  // Pip (no coat — star patch visible)
  ctx.save(); ctx.translate(1.25, 0);
  drawCatSit(Object.assign({ pal: PAL.pip, coat: 0, star: true, t: T, wet: 0.5, turn: -0.3, shadow: false, size: 0.95, blink: lick > 0.3 ? 1 : 0, happy: lick > 0.3 ? 1 : 0 }, o.pip || {}));
  ctx.restore();
  ctx.restore();
}
function s12(lt, T) {
  const L = DAWN;
  const snowCat = (o = {}) => drawCatSit(Object.assign({ pal: PAL.snow, fluffy: false, collar: true, tabby: false, wet: 1, shiver: 1.4, t: T, brow: -0.85, pupil: 0.95, size: 1.0, shadow: false, mouth: pulse(lt, 8.5, 9.3, 0.1, 0.3) * 0.8 + pulse(lt, 13.2, 13.9, 0.1, 0.2) * 0.5 }, o));
  const houseDraw = () => at(SNOWH.x, 0, SNOWH.z, () => { drawSnowHouse(L); ctx.save(); ctx.translate(0, -1.7); snowCat(); ctx.restore(); });
  if (lt < 4) { // drone pull-back
    const k = E.io2(inv(0, 4, lt));
    setCam({ x: lerp(6, 2, k), y: lerp(-14, -40, k), z: lerp(4, -40, k), F: 1100 });
    aim(lerp(RAFTD.x, 10, k), lerp(-1, -8, k), lerp(RAFTD.z, 60, k), W / 2, H * 0.6);
    cam.roll = lerp(0.04, -0.03, k);
    baseTransform();
    drawDawnTown(L, T);
    houseDraw();
    at(RAFTD.x, waterBob(T, 1, 0.05), RAFTD.z, () => dawnFamily(T, lt));
  } else if (lt < 8) { // dolly in on family
    const k = E.io2(inv(4, 8, lt));
    setCam({ x: 5.6, y: -2.3, z: lerp(20.5, 24.8, k), F: lerp(1100, 1450, k) });
    aim(RAFTD.x + 0.3, -1.3, RAFTD.z, W / 2, H * 0.55);
    shakeCam(T, 0.08, 0.6, 2);
    baseTransform();
    drawDawnTown(L, T);
    houseDraw();
    at(RAFTD.x, waterBob(T, 1, 0.05), RAFTD.z, () => dawnFamily(T, lt, { lick: pulse(lt, 5.4, 7.2, 0.4, 0.5) }));
  } else if (lt < 12) { // whip pan to Snow, push in
    const wk = E.io3(inv(8, 8.5, lt));
    const pk = E.io2(inv(8.6, 12, lt));
    setCam({ x: 8, y: -2.6, z: 26, F: lerp(1300, 2900, pk) });
    aim(lerp(RAFTD.x, SNOWH.x, wk), lerp(-1.3, -3.2, wk), lerp(RAFTD.z, SNOWH.z, wk), W / 2, H * 0.5);
    const draw = () => {
      baseTransform();
      drawDawnTown(L, T);
      houseDraw();
      at(RAFTD.x, waterBob(T, 1, 0.05), RAFTD.z, () => dawnFamily(T, lt));
    };
    const mb = Math.sin(inv(8, 8.5, lt) * Math.PI) * 260;
    if (mb > 2) motionBlur(draw, mb, 0, 8); else draw();
  } else if (lt < 15) { // orbit around Pip deciding
    const k = inv(12, 15, lt);
    const th = lerp(-0.7, 0.6, E.io2(k));
    const R = 6;
    setCam({ x: RAFTD.x + 1.2 + Math.sin(th) * R, y: -2.2, z: RAFTD.z - Math.cos(th) * R, F: 1300 });
    aim(RAFTD.x + 1.2, -1.4, RAFTD.z, W / 2, H * 0.56);
    baseTransform();
    drawDawnTown(L, T);
    houseDraw();
    const look = lt < 13 ? -0.6 : lt < 13.8 ? 0.0 : 0.85;
    at(RAFTD.x, waterBob(T, 1, 0.05), RAFTD.z, () => dawnFamily(T, lt, { pip: { turn: look, lookX: look, brow: lt > 14 ? 0.6 : 0 } }));
  } else { // paddling toward Snow
    const k = inv(15, 17.4, lt);
    const rx = lerp(RAFTD.x + 2, SNOWH.x - 3.5, E.io2(k)), rz = lerp(RAFTD.z + 2, SNOWH.z - 2.6, E.io2(k));
    setCam({ x: rx - 1.0, y: -1.2, z: rz - 6.2 + k * 1.6, F: lerp(1150, 1500, k) });
    aim(lerp(rx + 1, SNOWH.x - 1, k), lerp(-1.2, -2.2, k), lerp(rz, SNOWH.z, k), W / 2, H * 0.55);
    cam.sy += 80;
    baseTransform();
    drawDawnTown(L, T);
    houseDraw();
    at(rx, waterBob(T, 1, 0.05), rz, () => {
      drawRaft({ top: 0.6, wet: 0.4, tilt: Math.sin(T * 1.6) * 0.04 });
      ctx.translate(0.4, -0.3);
      drawCatSide({ pal: PAL.pip, coat: 0, t: T, wet: 0.4, brow: 0.3, plank: true, headUp: 0.6 + k * 0.4, size: 1, run: 0.25, gait: T * 4 });
    });
  }
  glow(W * 0.85, H * 0.3, 900, '#ffe0b0', 0.15);
  post(T, { vig: 0.45, grade: { soft: ['#ffe0c0', '#40405a'], softA: 0.35 } });
  if (lt > 17.4) fillFrame('#000000', 'source-over', 1);
}

// ---------------------------------------------------------------- master
const SCENES = [
  [0, 3, sHook], [3, 13, s1], [13, 25, s2], [25, 37, s3], [37, 49, s4], [49, 61, s5], [61, 73, s6],
  [73, 85, s7], [85, 97, s8], [97, 109, s9], [109, 121, s10], [121, 132, s11], [132, 150, s12],
];
function renderFrame(t) {
  ctx = MAIN;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  let sc = SCENES[SCENES.length - 1];
  for (const s of SCENES) if (t >= s[0] && t < s[1]) { sc = s; break; }
  ctx.save();
  try { sc[2](t - sc[0], t); } catch (e) { console.error('ERR t=' + t.toFixed(3) + ' ' + e.message + ' ' + (e.stack || '').split('\n')[1]); }
  ctx.restore();
  ctx = MAIN;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  // titles
  title(t, 'hook1', 0.25, 2.95, 330, 86);
  title(t, 'hook2', 1.15, 2.95, 450, 96);
  title(t, 'earlier', 3.75, 6.3, 400, 78);
  title(t, 'nobody', 47.4, 49.0, 380, 100);
  title(t, 'notgive1', 77.2, 80.8, 330, 92);
  title(t, 'notgive2', 77.7, 80.8, 450, 104);
  title(t, 'help1', 144.6, 149.35, 330, 92);
  title(t, 'help2', 145.0, 149.35, 450, 108);
  if (t > 149.4) {
    title(t, 'part2', 149.45, 150.2, H / 2 - 20, 120);
    arrow(W / 2, H / 2 + 120, 120, 0, inv(149.5, 149.7, t));
  }
  if (t >= 144.9 && t < 149.35) arrow(W / 2, 600, 110, Math.PI / 2, inv(145.2, 145.6, t) * (1 - inv(149.0, 149.35, t)));
  grain(t, 0.06);
}
