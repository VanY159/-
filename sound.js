// Синтезовані звуки через WebAudio: файли не потрібні, усе працює офлайн.
const Sound = (() => {
  let ctx = null;
  let enabled = true;

  function ac() {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, { type = 'sine', vol = 0.15, slide = 0, delay = 0 } = {}) {
    if (!enabled) return;
    const a = ac();
    if (!a) return;
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const fx = {
    poke() { tone(520, 0.12, { type: 'triangle', slide: 260 }); },
    boop() { tone(700, 0.09, { type: 'sine', slide: -300 }); },
    giggle() { [0, 0.09, 0.18, 0.27].forEach((d, i) => tone(800 + i * 90, 0.07, { type: 'triangle', delay: d, vol: 0.1 })); },
    laugh() { for (let i = 0; i < 6; i++) tone(600 + (i % 2) * 180, 0.08, { type: 'square', delay: i * 0.1, vol: 0.05 }); },
    purr() { for (let i = 0; i < 4; i++) tone(140 + Math.random() * 20, 0.18, { type: 'sawtooth', delay: i * 0.16, vol: 0.035 }); },
    love() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, { delay: i * 0.08, vol: 0.09 })); },
    zap() { tone(1400, 0.25, { type: 'sawtooth', slide: -1200, vol: 0.06 }); tone(90, 0.2, { type: 'square', vol: 0.04 }); },
    angry() { tone(180, 0.3, { type: 'sawtooth', slide: -60, vol: 0.07 }); },
    sad() { tone(500, 0.5, { type: 'sine', slide: -220, vol: 0.08 }); },
    jump() { tone(300, 0.25, { type: 'sine', slide: 600, vol: 0.1 }); },
    dizzy() { for (let i = 0; i < 5; i++) tone(900 - i * 120, 0.1, { type: 'triangle', delay: i * 0.08, vol: 0.07 }); },
    wake() { [400, 600, 900].forEach((f, i) => tone(f, 0.1, { delay: i * 0.07, vol: 0.08 })); },
    sleep() { tone(300, 0.6, { type: 'sine', slide: -150, vol: 0.06 }); },
    tap() { tone(1200, 0.04, { type: 'sine', vol: 0.05 }); },
    sing() {
      const melody = [523, 587, 659, 523, 659, 698, 784, 784, 698, 659, 587, 523];
      melody.forEach((f, i) => tone(f, 0.22, { type: 'triangle', delay: i * 0.24, vol: 0.08 }));
    },
    beat() {
      for (let i = 0; i < 12; i++) {
        tone(i % 2 ? 220 : 110, 0.1, { type: 'square', delay: i * 0.25, vol: 0.05 });
        if (i % 4 === 2) tone(880, 0.06, { type: 'triangle', delay: i * 0.25 + 0.12, vol: 0.04 });
      }
    },
  };

  return {
    play(name) { try { fx[name] && fx[name](); } catch (e) { /* audio is optional */ } },
    unlock() { ac(); },
    get enabled() { return enabled; },
    set enabled(v) { enabled = v; },
  };
})();
