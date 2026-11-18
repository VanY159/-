// Малювання та анімація бота на canvas: пружинна фізика, міміка, частинки.
class Bot {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.t = 0;
    // пружини: зсув, масштаб (сплющення) і нахил
    this.sp = {
      x: { v: 0, p: 0 }, y: { v: 0, p: 0 },
      sx: { v: 0, p: 0 }, sy: { v: 0, p: 0 },
      rot: { v: 0, p: 0 }, ant: { v: 0, p: 0 },
    };
    this.look = { x: 0, y: 0, tx: 0, ty: 0 };
    this.blink = 0;
    this.nextBlink = 2;
    this.mood = 'neutral';
    this.expr = null;          // тимчасовий вираз {name, until}
    this.anim = null;          // поточна дія {type, t, dur}
    this.talking = false;
    this.talkAmp = 0;
    this.particles = [];
    this.color = [228, 236, 255];
    this.glow = [110, 243, 255];
    this.sleeping = false;
    this.hugging = false;
    this.animX = 0; this.animY = 0; this.animRot = 0; this.animS = 0; this.armL = 0; this.armR = 0;
    this.stars = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + 0.3, p: Math.random() * 6 }));
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.c.clientWidth, h = this.c.clientHeight;
    this.c.width = Math.round(w * dpr);
    this.c.height = Math.round(h * dpr);
    this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w; this.h = h;
    this.R = Math.min(w * 0.27, h * 0.17, 150);
    this.cx = w / 2;
    this.cy = h * 0.47;
  }

  // ---------- API для реакцій ----------
  kick(dx, dy, squash = 0.25) {
    this.sp.x.v += dx; this.sp.y.v += dy;
    this.sp.sx.v += squash * 6; this.sp.sy.v -= squash * 6;
    this.sp.ant.v += (Math.random() - 0.5) * 12;
  }
  push(vx, vy) {
    this.sp.x.v += vx; this.sp.y.v += vy;
    this.sp.rot.v += vx * 0.01;
    this.sp.ant.v += vx * 0.05;
  }
  setExpr(name, dur = 1.5) { this.expr = { name, until: this.t + dur }; }
  play(type, dur) {
    const d = { jump: 0.7, dance: 3.2, spin: 0.9, shake: 0.6, nod: 0.6, laugh: 1.4, wave: 1.4, dizzy: 2.4, zap: 0.6, sing: 3, wiggle: 0.8 }[type] || 1;
    this.anim = { type, t: 0, dur: dur || d };
  }
  lookAt(px, py) {
    this.look.tx = Math.max(-1, Math.min(1, (px - this.cx) / (this.R * 2)));
    this.look.ty = Math.max(-1, Math.min(1, (py - this.cy) / (this.R * 2)));
  }

  // Визначає, в яку частину бота влучив дотик
  hitTest(px, py) {
    const R = this.R;
    const bx = this.cx + this.sp.x.p, by = this.cy + this.sp.y.p + this.animY;
    const dx = (px - bx) / R, dy = (py - by) / R;
    if (Math.abs(dx) < 0.3 && dy < -0.95 && dy > -1.75) return 'antenna';
    if ((dx * dx) / 1.15 + (dy * dy) / 1.05 > 1) {
      if (Math.abs(dx) < 1.45 && dy > -0.1 && dy < 0.7) return 'arm';
      return null;
    }
    for (const ex of [-0.33, 0.33]) {
      if ((dx - ex) ** 2 + (dy + 0.12) ** 2 < 0.04) return 'eye';
    }
    if (dy < -0.5) return 'head';
    if (dy > 0.42) return 'belly';
    if (Math.abs(dy) < 0.4 && Math.abs(dx) < 0.75) return 'face';
    return 'body';
  }

  emit(type, n = 1, opts = {}) {
    const R = this.R;
    for (let i = 0; i < n; i++) {
      const x = opts.x ?? this.cx + this.sp.x.p + (Math.random() - 0.5) * R * 1.2;
      const y = opts.y ?? this.cy + this.sp.y.p + this.animY - R * (0.6 + Math.random() * 0.4);
      const spd = opts.speed ?? 1;
      this.particles.push({
        type, x, y,
        vx: (Math.random() - 0.5) * 80 * spd,
        vy: (-60 - Math.random() * 80) * spd,
        life: 0, max: opts.life ?? 1.4 + Math.random() * 0.6,
        size: (opts.size ?? 1) * (14 + Math.random() * 10),
        rot: (Math.random() - 0.5) * 0.6,
      });
    }
  }

  get face() {
    if (this.anim && this.anim.type === 'dizzy') return 'dizzy';
    if (this.expr && this.expr.until > this.t) return this.expr.name;
    return this.sleeping ? 'sleep' : this.mood;
  }

  // ---------- Оновлення ----------
  update(dt) {
    this.t += dt;
    const spring = (s, k, c, target = 0) => {
      s.v += (-(s.p - target) * k - s.v * c) * dt;
      s.p += s.v * dt;
    };
    spring(this.sp.x, 120, 9);
    spring(this.sp.y, 120, 9);
    spring(this.sp.sx, 260, 10);
    spring(this.sp.sy, 260, 10);
    spring(this.sp.rot, 90, 7);
    spring(this.sp.ant, 60, 3, this.sp.rot.p * -1.5);

    // погляд
    const L = this.look;
    L.x += (L.tx - L.x) * Math.min(1, dt * 10);
    L.y += (L.ty - L.y) * Math.min(1, dt * 10);

    // кліпання
    this.nextBlink -= dt;
    if (this.nextBlink <= 0) { this.blink = 1; this.nextBlink = 2 + Math.random() * 4; }
    this.blink = Math.max(0, this.blink - dt * 7);

    // розмова
    const target = this.talking ? 0.5 + 0.5 * Math.abs(Math.sin(this.t * 18) * Math.sin(this.t * 7.3)) : 0;
    this.talkAmp += (target - this.talkAmp) * Math.min(1, dt * 20);

    // дії
    this.animX = 0; this.animY = 0; this.animRot = 0; this.armL = 0; this.armR = 0; this.animS = 0;
    const breathe = Math.sin(this.t * (this.sleeping ? 1.4 : 2.2));
    this.animS = breathe * (this.sleeping ? 0.03 : 0.015);
    this.animY = breathe * this.R * 0.02;
    this.armL = this.armR = Math.sin(this.t * 2.2) * 0.06;

    if (this.anim) {
      const a = this.anim;
      a.t += dt;
      const k = Math.min(1, a.t / a.dur), R = this.R;
      switch (a.type) {
        case 'jump': {
          const h = Math.sin(Math.PI * k);
          this.animY = -h * R * 0.9;
          this.animS = k < 0.15 || k > 0.9 ? -0.08 : h * 0.06;
          this.armL = this.armR = -h * 1.4;
          break;
        }
        case 'dance': {
          const b = a.t * 7;
          this.animRot = Math.sin(b) * 0.22;
          this.animX = Math.sin(b) * R * 0.25;
          this.animY = -Math.abs(Math.sin(b)) * R * 0.2;
          this.armL = -1.2 + Math.sin(b) * 0.8;
          this.armR = -1.2 - Math.sin(b) * 0.8;
          if (Math.random() < dt * 3) this.emit('note', 1);
          break;
        }
        case 'sing': {
          const b = a.t * 4;
          this.animRot = Math.sin(b) * 0.1;
          this.animY = -Math.abs(Math.sin(b * 2)) * R * 0.06;
          this.armL = -0.9 + Math.sin(b) * 0.3; this.armR = -0.9 - Math.sin(b) * 0.3;
          if (Math.random() < dt * 4) this.emit('note', 1);
          break;
        }
        case 'spin': this.animRot = Math.PI * 2 * (1 - Math.pow(1 - k, 3)); this.armL = this.armR = -0.8; break;
        case 'shake': this.animX = Math.sin(a.t * 40) * R * 0.08 * (1 - k); break;
        case 'nod': this.animY = Math.sin(k * Math.PI * 3) * R * 0.06; break;
        case 'laugh':
          this.animY = -Math.abs(Math.sin(a.t * 22)) * R * 0.07;
          this.animRot = Math.sin(a.t * 11) * 0.05;
          this.armL = this.armR = -0.4 + Math.sin(a.t * 22) * 0.3;
          break;
        case 'wave': this.armR = -2.3 + Math.sin(a.t * 14) * 0.45; break;
        case 'wiggle': this.animRot = Math.sin(a.t * 30) * 0.08 * (1 - k); break;
        case 'dizzy':
          this.animRot = Math.sin(a.t * 5) * 0.15;
          this.animX = Math.sin(a.t * 3) * R * 0.08;
          if (Math.random() < dt * 5) this.emit('star', 1, { speed: 0.4, life: 0.8 });
          break;
        case 'zap':
          this.animX = (Math.random() - 0.5) * R * 0.08;
          this.animY = (Math.random() - 0.5) * R * 0.08;
          this.armL = this.armR = -1.6;
          break;
      }
      if (a.t >= a.dur) this.anim = null;
    }
    if (this.hugging) { this.armL = this.armR = -2.0; this.animS += 0.04; }

    // колір тіла та сяйва залежно від настрою
    const f = this.face;
    const bodyC = { angry: [255, 205, 205], sad: [205, 220, 255], love: [255, 220, 240], sleep: [190, 200, 230] }[f] || [228, 236, 255];
    const glowC = { angry: [255, 80, 80], sad: [120, 160, 255], love: [255, 110, 200], sleep: [90, 130, 170], happy: [120, 255, 200], laugh: [120, 255, 200], surprised: [255, 230, 110] }[f] || [110, 243, 255];
    for (let i = 0; i < 3; i++) {
      this.color[i] += (bodyC[i] - this.color[i]) * Math.min(1, dt * 4);
      this.glow[i] += (glowC[i] - this.glow[i]) * Math.min(1, dt * 6);
    }

    if (this.sleeping && Math.random() < dt * 0.9) this.emit('z', 1, { speed: 0.4, x: this.cx + this.R * 0.6, y: this.cy - this.R * 0.8 });

    // частинки
    for (const p of this.particles) {
      p.life += dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'tear' || p.type === 'spark') p.vy += 500 * dt;
      else { p.vy *= 0.98; p.vx *= 0.98; }
    }
    this.particles = this.particles.filter(p => p.life < p.max);
  }

  // ---------- Малювання ----------
  draw() {
    const g = this.g, R = this.R;
    const f = this.face;

    // фон
    const night = this.sleeping ? 0.6 : 1;
    const bg = g.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, `rgb(${13 * night},${19 * night},${48 * night})`);
    bg.addColorStop(1, `rgb(${27 * night},${36 * night},${87 * night})`);
    g.fillStyle = bg;
    g.fillRect(0, 0, this.w, this.h);
    for (const s of this.stars) {
      g.globalAlpha = 0.3 + 0.3 * Math.sin(this.t * 1.5 + s.p);
      g.fillStyle = '#cfe0ff';
      g.beginPath(); g.arc(s.x * this.w, s.y * this.h, s.r, 0, 7); g.fill();
    }
    g.globalAlpha = 1;
    // світлова пляма під ботом
    const glw = `rgba(${this.glow.map(Math.round).join(',')},`;
    const halo = g.createRadialGradient(this.cx, this.cy, R * 0.5, this.cx, this.cy, R * 2.6);
    halo.addColorStop(0, glw + '0.18)');
    halo.addColorStop(1, glw + '0)');
    g.fillStyle = halo;
    g.fillRect(0, 0, this.w, this.h);

    const bx = this.cx + this.sp.x.p + this.animX;
    const by = this.cy + this.sp.y.p + this.animY;
    const rot = this.sp.rot.p + this.animRot;
    const sx = 1 + this.sp.sx.p + this.animS;
    const sy = 1 + this.sp.sy.p - this.animS * 0.5;

    // тінь
    const lift = Math.max(0, this.cy - by) / R;
    g.fillStyle = `rgba(0,0,0,${0.3 / (1 + lift)})`;
    g.beginPath();
    g.ellipse(this.cx + this.sp.x.p, this.cy + R * 1.18, R * 0.85 / (1 + lift * 0.5), R * 0.14, 0, 0, 7);
    g.fill();

    g.save();
    g.translate(bx, by + R);       // опора внизу: сплющення від підлоги
    g.rotate(rot);
    g.scale(sx, sy);
    g.translate(0, -R);

    const bodyRGB = this.color.map(Math.round);
    const body = `rgb(${bodyRGB.join(',')})`;
    const bodyDark = `rgb(${bodyRGB.map(v => Math.round(v * 0.62)).join(',')})`;

    // руки
    const arm = (side, ang) => {
      g.save();
      g.translate(side * R * 0.95, R * 0.15);
      g.rotate(-side * (0.45 - ang));
      g.fillStyle = bodyDark;
      g.beginPath();
      g.roundRect(-R * 0.1, -R * 0.06, R * 0.2, R * 0.55, R * 0.1);
      g.fill();
      g.fillStyle = body;
      g.beginPath(); g.arc(0, R * 0.52, R * 0.12, 0, 7); g.fill();
      g.restore();
    };
    arm(-1, this.armL);
    arm(1, this.armR);

    // антена
    const ant = this.sp.ant.p;
    const tipX = Math.sin(ant) * R * 0.55, tipY = -R * 1.0 - Math.cos(ant) * R * 0.5;
    g.strokeStyle = bodyDark;
    g.lineWidth = R * 0.06;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -R * 0.92);
    g.quadraticCurveTo(tipX * 0.3, -R * 1.2, tipX, tipY);
    g.stroke();
    const pulse = 0.7 + 0.3 * Math.sin(this.t * 4);
    g.shadowColor = glw + '1)';
    g.shadowBlur = R * 0.4 * pulse;
    g.fillStyle = glw + '1)';
    g.beginPath(); g.arc(tipX, tipY, R * 0.11, 0, 7); g.fill();
    g.shadowBlur = 0;

    // тіло
    const grad = g.createRadialGradient(-R * 0.35, -R * 0.45, R * 0.1, 0, 0, R * 1.15);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, body);
    grad.addColorStop(1, bodyDark);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(0, 0, R * 1.05, R, 0, 0, 7);
    g.fill();

    // екран-обличчя
    const vw = R * 1.5, vh = R * 0.9, vy = -R * 0.12;
    const visor = '#141b3a';
    g.fillStyle = visor;
    g.beginPath();
    g.roundRect(-vw / 2, vy - vh / 2, vw, vh, R * 0.38);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.07)';
    g.beginPath();
    g.ellipse(-vw * 0.18, vy - vh * 0.3, vw * 0.3, vh * 0.12, -0.2, 0, 7);
    g.fill();

    // очі
    g.save();
    g.beginPath();
    g.roundRect(-vw / 2, vy - vh / 2, vw, vh, R * 0.38);
    g.clip();
    const lx = this.look.x * R * 0.1, ly = this.look.y * R * 0.07;
    g.shadowColor = glw + '1)';
    g.shadowBlur = R * 0.18;
    g.fillStyle = glw + '1)';
    g.strokeStyle = glw + '1)';
    g.lineWidth = R * 0.075;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (const side of [-1, 1]) this.drawEye(f, side * R * 0.33 + lx, vy - R * 0.03 + ly, side, visor);
    this.drawMouth(f, lx * 0.5, vy + R * 0.26 + ly * 0.5);
    g.restore();
    g.shadowBlur = 0;

    // рум'янець
    if (['happy', 'love', 'blush', 'laugh'].includes(f)) {
      g.fillStyle = f === 'blush' ? 'rgba(255,90,140,0.55)' : 'rgba(255,120,160,0.35)';
      for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * R * 0.62, R * 0.12, R * 0.13, R * 0.08, 0, 0, 7); g.fill(); }
    }
    // гвинтики на животику
    g.fillStyle = bodyDark;
    for (const s of [-1, 0, 1]) { g.beginPath(); g.arc(s * R * 0.18, R * 0.62, R * 0.04, 0, 7); g.fill(); }
    g.restore();

    this.drawParticles();
  }

  drawEye(f, x, y, side, visor) {
    const g = this.g, R = this.R;
    const w = R * 0.21, h = R * 0.3;
    const open = 1 - this.blink;
    switch (f) {
      case 'happy': case 'blush':
        g.beginPath(); g.arc(x, y + h * 0.15, w * 0.55, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); return;
      case 'laugh':
        g.beginPath();
        g.moveTo(x - side * w * 0.45, y - h * 0.3);
        g.lineTo(x + side * w * 0.35, y);
        g.lineTo(x - side * w * 0.45, y + h * 0.3);
        g.stroke(); return;
      case 'sleep':
        g.beginPath(); g.arc(x, y - h * 0.1, w * 0.5, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); return;
      case 'love': {
        const s = w * 0.55 * (1 + 0.12 * Math.sin(this.t * 8));
        g.beginPath();
        g.moveTo(x, y + s * 0.9);
        g.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.3, x, y - s * 0.4);
        g.bezierCurveTo(x + s * 0.6, y - s * 1.3, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
        g.fill(); return;
      }
      case 'dizzy': {
        g.save(); g.lineWidth = R * 0.045;
        g.beginPath();
        for (let a = 0; a < Math.PI * 5; a += 0.2) {
          const r = a / (Math.PI * 5) * w * 0.7;
          const ang = a + this.t * 6 * side;
          const px = x + Math.cos(ang) * r, py = y + Math.sin(ang) * r;
          a === 0 ? g.moveTo(px, py) : g.lineTo(px, py);
        }
        g.stroke(); g.restore(); return;
      }
      case 'surprised':
        g.beginPath(); g.ellipse(x, y, w * 0.62, h * 0.62 * Math.max(0.1, open), 0, 0, 7); g.fill();
        g.save(); g.shadowBlur = 0; g.fillStyle = visor;
        g.beginPath(); g.arc(x, y, w * 0.22, 0, 7); g.fill(); g.restore();
        return;
      case 'squint':
        g.beginPath(); g.moveTo(x - w * 0.5, y); g.lineTo(x + w * 0.5, y); g.stroke(); return;
    }
    // базове око + повіки для сумного / злого
    const eh = h * Math.max(0.08, open);
    g.beginPath(); g.roundRect(x - w / 2, y - eh / 2, w, eh, w * 0.45); g.fill();
    if (f === 'angry' || f === 'sad' || f === 'think') {
      g.save();
      g.shadowBlur = 0;
      g.fillStyle = visor;
      g.beginPath();
      const inner = f === 'angry' ? 0.05 : -0.45, outer = f === 'angry' ? -0.45 : 0.05;
      if (f === 'think') {
        g.rect(x - w, y - h, w * 2, h * 0.65);
      } else {
        g.moveTo(x - side * w, y - h);
        g.lineTo(x + side * w, y - h);
        g.lineTo(x + side * w * 0.6, y + h * outer);
        g.lineTo(x - side * w * 0.6, y + h * inner);
      }
      g.closePath(); g.fill();
      g.restore();
    }
  }

  drawMouth(f, x, y) {
    const g = this.g, R = this.R;
    const w = R * 0.24;
    if (this.talkAmp > 0.05 && f !== 'sleep') {
      const h = R * 0.05 + R * 0.14 * this.talkAmp;
      g.beginPath(); g.ellipse(x, y, w * 0.6, h * 0.5, 0, 0, 7); g.fill();
      return;
    }
    g.beginPath();
    switch (f) {
      case 'happy': case 'love': case 'blush':
        g.arc(x, y - w * 0.35, w * 0.7, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); break;
      case 'laugh':
        g.moveTo(x - w * 0.65, y - w * 0.15);
        g.quadraticCurveTo(x, y - w * 0.15, x + w * 0.65, y - w * 0.15);
        g.quadraticCurveTo(x, y + w * 0.9, x - w * 0.65, y - w * 0.15);
        g.fill(); break;
      case 'sad':
        g.arc(x, y + w * 0.55, w * 0.6, Math.PI * 1.2, Math.PI * 1.8); g.stroke(); break;
      case 'angry':
        g.moveTo(x - w * 0.6, y + w * 0.1);
        for (let i = 1; i <= 4; i++) g.lineTo(x - w * 0.6 + i * w * 0.3, y + (i % 2 ? -w * 0.12 : w * 0.1));
        g.stroke(); break;
      case 'surprised':
        g.ellipse(x, y + w * 0.05, w * 0.25, w * 0.32, 0, 0, 7); g.fill(); break;
      case 'sleep':
        g.ellipse(x, y, w * 0.15, w * (0.12 + 0.06 * Math.sin(this.t * 1.4)), 0, 0, 7); g.fill(); break;
      case 'dizzy': case 'think': case 'squint':
        g.moveTo(x - w * 0.5, y);
        g.bezierCurveTo(x - w * 0.2, y - w * 0.2, x + w * 0.2, y + w * 0.2, x + w * 0.5, y);
        g.stroke(); break;
      default:
        g.arc(x, y - w * 0.4, w * 0.55, Math.PI * 0.28, Math.PI * 0.72); g.stroke();
    }
  }

  drawParticles() {
    const g = this.g;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    for (const p of this.particles) {
      const k = p.life / p.max;
      g.globalAlpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
      g.save();
      g.translate(p.x, p.y);
      g.rotate(p.rot + Math.sin(p.life * 4) * 0.2);
      const s = p.size * (0.6 + 0.4 * Math.min(1, k * 4));
      switch (p.type) {
        case 'heart': g.fillStyle = '#ff5fa2'; g.font = `${s}px sans-serif`; g.fillText('♥', 0, 0); break;
        case 'star': g.fillStyle = '#ffe36e'; g.font = `${s}px sans-serif`; g.fillText('★', 0, 0); break;
        case 'note': g.fillStyle = '#9ff7ff'; g.font = `${s}px sans-serif`; g.fillText(Math.random() < 0.5 ? '♪' : '♫', 0, 0); break;
        case 'z': g.fillStyle = '#b9c8ff'; g.font = `bold ${s}px sans-serif`; g.fillText('z', 0, 0); break;
        case 'anger': g.font = `${s}px sans-serif`; g.fillText('💢', 0, 0); break;
        case 'question': g.fillStyle = '#ffe36e'; g.font = `bold ${s}px sans-serif`; g.fillText('?', 0, 0); break;
        case 'tear': g.fillStyle = '#7fb5ff'; g.beginPath(); g.ellipse(0, 0, s * 0.15, s * 0.22, 0, 0, 7); g.fill(); break;
        case 'spark':
          g.strokeStyle = '#fff59e'; g.lineWidth = 2;
          g.beginPath(); g.moveTo(-s * 0.3, 0); g.lineTo(s * 0.3, 0); g.moveTo(0, -s * 0.3); g.lineTo(0, s * 0.3); g.stroke(); break;
        case 'ring':
          g.strokeStyle = 'rgba(160,220,255,0.8)'; g.lineWidth = 2;
          g.beginPath(); g.arc(0, 0, 6 + k * 40, 0, 7); g.stroke(); break;
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }

  headScreenPos() {
    return {
      x: this.cx + this.sp.x.p + (this.animX || 0),
      y: this.cy + this.sp.y.p + (this.animY || 0) - this.R * 1.65,
    };
  }
}
