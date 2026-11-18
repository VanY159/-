// Логіка застосунку: емоції, жести, голос, чат.
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $('scene');
  const bot = new Bot(canvas);
  const bubble = $('bubble');
  const log = $('log');
  const SETTINGS = 'bobi-settings-v1';

  const settings = (() => {
    try { return Object.assign({ voice: true, sound: true }, JSON.parse(localStorage.getItem(SETTINGS))); }
    catch (e) { return { voice: true, sound: true }; }
  })();
  const saveSettings = () => { try { localStorage.setItem(SETTINGS, JSON.stringify(settings)); } catch (e) { /* ignore */ } };
  Sound.enabled = settings.sound;

  // ---------- Емоції ----------
  const emo = { joy: 0.3, anger: 0, love: Brain.memory.affection ?? 0.2, energy: 1 };
  let lastInteraction = performance.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  function feel(d = {}) {
    if (d.joy) emo.joy = clamp(emo.joy + d.joy, -1, 1);
    if (d.anger) emo.anger = clamp(emo.anger + d.anger, 0, 1);
    if (d.love) emo.love = clamp(emo.love + d.love, 0, 1);
    if (d.energy) emo.energy = clamp(emo.energy + d.energy, 0, 1);
    if (d.joy > 0) emo.anger = clamp(emo.anger - d.joy * 0.3, 0, 1);
  }

  function mood() {
    if (bot.sleeping) return 'sleepy';
    if (emo.anger > 0.5) return 'angry';
    if (emo.energy < 0.25) return 'sleepy';
    if (emo.joy > 0.35) return 'happy';
    if (emo.joy < -0.25) return 'sad';
    return 'neutral';
  }
  const FACE = { angry: 'angry', happy: 'happy', sad: 'sad', sleepy: 'squint', neutral: 'neutral' };
  const ICON = { angry: '😠', happy: '😄', sad: '😢', sleepy: '😪', neutral: '🙂' };

  // ---------- Мова (TTS) ----------
  let voice = null;
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
    const vs = speechSynthesis.getVoices();
    voice = vs.find(v => /^uk/i.test(v.lang) && v.localService) || vs.find(v => /^uk/i.test(v.lang)) || null;
  }
  if ('speechSynthesis' in window) {
    pickVoice();
    speechSynthesis.onvoiceschanged = pickVoice;
  }

  let talkTimer = 0;
  let speakingNow = false;
  function say(text, { speak = true } = {}) {
    showBubble(text);
    addLog('bot', text);
    const plain = text.replace(/[\p{Extended_Pictographic}‍️]/gu, '').trim();
    clearTimeout(talkTimer);
    bot.talking = true;
    const est = Math.min(6000, 600 + plain.length * 65);
    const stop = () => { bot.talking = false; speakingNow = false; resumeListening(); };

    if (speak && settings.voice && 'speechSynthesis' in window && plain) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(plain);
        u.lang = 'uk-UA';
        if (voice) u.voice = voice;
        u.pitch = 1.6;
        u.rate = 1.05;
        u.onend = u.onerror = () => { clearTimeout(talkTimer); stop(); };
        speakingNow = true;
        pauseListening();
        speechSynthesis.speak(u);
        talkTimer = setTimeout(stop, est + 4000); // запобіжник
        return;
      } catch (e) { /* без голосу */ }
    }
    talkTimer = setTimeout(stop, est);
  }

  let bubbleTimer = 0;
  function showBubble(text) {
    bubble.textContent = text;
    bubble.classList.remove('hidden');
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => bubble.classList.add('hidden'), Math.max(2500, text.length * 90));
  }

  function addLog(who, text) {
    const el = document.createElement('div');
    el.className = 'msg ' + who;
    el.textContent = text;
    log.appendChild(el);
    while (log.children.length > 6) log.removeChild(log.firstChild);
  }

  // ---------- Дії ----------
  function doAction(act) {
    switch (act) {
      case 'wave': bot.play('wave'); bot.setExpr('happy', 1.4); Sound.play('boop'); break;
      case 'blush': bot.setExpr('blush', 2.2); bot.play('wiggle'); bot.emit('heart', 3); Sound.play('love'); break;
      case 'love': bot.setExpr('love', 2.5); bot.emit('heart', 8); bot.play('laugh', 0.6); Sound.play('love'); break;
      case 'sad': bot.setExpr('sad', 3); bot.emit('tear', 2, { speed: 0.3 }); Sound.play('sad'); break;
      case 'angry': bot.setExpr('angry', 2.5); bot.play('shake'); bot.emit('anger', 2, { speed: 0.4 }); Sound.play('angry'); break;
      case 'laugh': bot.setExpr('laugh', 1.6); bot.play('laugh'); Sound.play('laugh'); break;
      case 'dance': bot.setExpr('happy', 3.2); bot.play('dance'); Sound.play('beat'); break;
      case 'sing': bot.setExpr('happy', 3); bot.play('sing'); Sound.play('sing'); break;
      case 'jump': bot.play('jump'); bot.setExpr('happy', 1); Sound.play('jump'); break;
      case 'spin': bot.play('spin'); Sound.play('dizzy'); break;
      case 'shake': bot.play('shake'); break;
      case 'nod': bot.play('nod'); break;
      case 'dizzy': bot.play('dizzy'); Sound.play('dizzy'); break;
      case 'think': bot.setExpr('think', 1.8); bot.emit('question', 1, { speed: 0.4 }); break;
      case 'sleep': goSleep(); break;
      case 'wake': wakeUp(false); break;
    }
  }

  function goSleep() {
    if (bot.sleeping) return;
    bot.sleeping = true;
    emo.energy = Math.min(emo.energy, 0.2);
    Sound.play('sleep');
  }
  function wakeUp(grumpy) {
    if (!bot.sleeping) return false;
    bot.sleeping = false;
    emo.energy = 0.8;
    bot.setExpr('surprised', 1);
    bot.kick(0, -150, -0.2);
    Sound.play('wake');
    if (grumpy) { feel({ joy: -0.1 }); say(pickOne(['Га?! Я не сплю! 😳', 'Ааах... ти мене розбудив 🥱', 'Що? Де? Я тут!'])); }
    return true;
  }

  const pickOne = a => a[Math.floor(Math.random() * a.length)];

  // ---------- Обробка слів ----------
  function handleText(text) {
    text = text.trim();
    if (!text) return;
    lastInteraction = performance.now();
    addLog('user', text);
    if (bot.sleeping) {
      const c = Brain.classify(text);
      if (c.intent !== 'sleep') wakeUp(false);
    }
    bot.setExpr('surprised', 0.25);
    setTimeout(() => {
      const res = Brain.respond(text, { mood: mood() });
      feel(res.emo);
      doAction(res.act);
      say(res.text);
      updateHeader();
    }, 350);
  }

  $('inputBar').addEventListener('submit', e => {
    e.preventDefault();
    Sound.unlock();
    const t = $('text').value;
    $('text').value = '';
    handleText(t);
  });

  // ---------- Розпізнавання голосу ----------
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, listening = false, recActive = false;
  const mic = $('btnMic');
  if (!SR) {
    mic.classList.add('unsupported');
    mic.title = 'Розпізнавання голосу не підтримується цим браузером';
  }
  function startRec() {
    if (!SR || recActive || speakingNow) return;
    rec = new SR();
    rec.lang = 'uk-UA';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;
    if ('processLocally' in rec) rec.processLocally = true; // офлайн-режим у нових Chrome
    rec.onresult = e => {
      const t = e.results[e.results.length - 1][0].transcript;
      handleText(t);
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        listening = false; mic.classList.remove('listening');
        say('Мені не дозволили слухати мікрофон 🎤🚫', { speak: false });
      } else if (e.error === 'network') {
        listening = false; mic.classList.remove('listening');
        say('Цей браузер розпізнає голос лише з інтернетом. Пиши мені текстом, або встанови офлайн-пакет української мови 🙂', { speak: false });
      }
    };
    rec.onend = () => { recActive = false; if (listening && !speakingNow) setTimeout(startRec, 250); };
    try { rec.start(); recActive = true; } catch (e) { recActive = false; }
  }
  function pauseListening() { if (rec && recActive) { try { rec.abort(); } catch (e) { /* ignore */ } } }
  function resumeListening() { if (listening) setTimeout(startRec, 300); }

  mic.addEventListener('click', () => {
    Sound.unlock();
    if (!SR) { say('Твій браузер не вміє розпізнавати голос. Спробуй Chrome на Android або пиши текстом ✍️', { speak: false }); return; }
    listening = !listening;
    mic.classList.toggle('listening', listening);
    if (listening) { bot.setExpr('surprised', 0.8); startRec(); }
    else pauseListening();
  });

  // ---------- Дотики ----------
  const touch = { down: false, id: null, sx: 0, sy: 0, x: 0, y: 0, t0: 0, path: 0, onBot: false, zone: null, petAcc: 0, lastPet: 0, holdTimer: 0, hugged: false, samples: [] };
  let taps = [];
  let lastReactSay = 0;
  let pokeCount = 0;

  function reactSay(text, force) {
    const now = performance.now();
    if (!force && now - lastReactSay < 1800) { showBubble(text); return; }
    lastReactSay = now;
    say(text);
  }

  function pos(e) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  canvas.addEventListener('pointerdown', e => {
    Sound.unlock();
    if (touch.down) return;
    canvas.setPointerCapture(e.pointerId);
    const p = pos(e);
    lastInteraction = performance.now();
    Object.assign(touch, { down: true, id: e.pointerId, sx: p.x, sy: p.y, x: p.x, y: p.y, t0: performance.now(), path: 0, petAcc: 0, hugged: false, samples: [{ ...p, t: performance.now() }] });
    touch.zone = bot.hitTest(p.x, p.y);
    touch.onBot = !!touch.zone;
    bot.lookAt(p.x, p.y);
    clearTimeout(touch.holdTimer);
    if (touch.onBot) {
      touch.holdTimer = setTimeout(() => {
        if (touch.down && touch.path < 25) onHug();
      }, 650);
    }
  });

  canvas.addEventListener('pointermove', e => {
    const p = pos(e);
    bot.lookAt(p.x, p.y);
    if (!touch.down || e.pointerId !== touch.id) return;
    const d = Math.hypot(p.x - touch.x, p.y - touch.y);
    touch.path += d;
    touch.x = p.x; touch.y = p.y;
    const now = performance.now();
    touch.samples.push({ ...p, t: now });
    while (touch.samples.length && now - touch.samples[0].t > 120) touch.samples.shift();
    lastInteraction = now;

    const zone = bot.hitTest(p.x, p.y);
    if (zone && zone !== 'arm' && !touch.hugged) {
      // погладжування: повільний рух по боту
      const speed = touch.samples.length > 1 ? Math.hypot(p.x - touch.samples[0].x, p.y - touch.samples[0].y) / Math.max(1, now - touch.samples[0].t) : 0;
      if (speed < 1.2) {
        touch.petAcc += d;
        if (touch.petAcc > 140 && now - touch.lastPet > 500) {
          touch.petAcc = 0;
          touch.lastPet = now;
          onPet(zone);
        }
      }
    }
  });

  function endTouch(e) {
    if (!touch.down || e.pointerId !== touch.id) return;
    touch.down = false;
    clearTimeout(touch.holdTimer);
    if (bot.hugging) {
      bot.hugging = false;
      return;
    }
    const now = performance.now();
    const dur = now - touch.t0;
    const p = pos(e);
    const s0 = touch.samples[0] || { x: p.x, y: p.y, t: now - 1 };
    const vx = (p.x - s0.x) / Math.max(1, now - s0.t), vy = (p.y - s0.y) / Math.max(1, now - s0.t);
    const speed = Math.hypot(vx, vy);

    // змах по боту
    if (touch.path > 60 && speed > 1.3 && (touch.onBot || bot.hitTest((touch.sx + p.x) / 2, (touch.sy + p.y) / 2))) {
      onFlick(vx, vy, speed);
      return;
    }
    if (touch.path < 22 && dur < 450) onTap(p.x, p.y, touch.zone);
  }
  canvas.addEventListener('pointerup', endTouch);
  canvas.addEventListener('pointercancel', e => { touch.down = false; bot.hugging = false; clearTimeout(touch.holdTimer); });
  canvas.addEventListener('pointerleave', () => { if (!touch.down) { bot.look.tx = 0; bot.look.ty = 0; } });

  function onTap(x, y, zone) {
    const now = performance.now();
    if (!zone) {
      bot.emit('ring', 1, { x, y, speed: 0, life: 0.5, size: 1 });
      Sound.play('tap');
      if (bot.sleeping) return;
      if (Math.random() < 0.15) { bot.setExpr('surprised', 0.6); showBubble(pickOne(['Що там? 👀', 'О, цікаво!', 'Куди ти тицяєш?'])); }
      return;
    }
    if (wakeUp(true)) return;

    taps = taps.filter(t => now - t < 3000);
    taps.push(now);
    const recent = taps.filter(t => now - t < 900).length;
    const dir = (x - (bot.cx + bot.sp.x.p)) / bot.R;
    bot.kick(-dir * 120, 60, 0.25);
    Sound.play('poke');
    pokeCount++;

    // забагато тицяння → злість
    if (taps.length >= 10) {
      taps = [];
      feel({ anger: 0.45, joy: -0.2 });
      bot.setExpr('angry', 2.5);
      bot.play('shake');
      bot.emit('anger', 2, { speed: 0.4 });
      Sound.play('angry');
      reactSay(pickOne(['Досить мене тицяти! 😠', 'Ай-ай-ай! Я сердитий!', 'Гррр! Мені це не подобається!']), true);
      return;
    }
    // лоскотання: 3+ швидкі тапи
    if (recent >= 3) {
      feel({ joy: 0.08 });
      bot.setExpr('laugh', 1.2);
      bot.play('laugh', 1);
      Sound.play('giggle');
      reactSay(pickOne(['Хі-хі-хі! Лоскотно! 🤭', 'Ха-ха-ха, перестань! 😂', 'Хі-хі, я боюся лоскоту!']));
      return;
    }
    // подвійний тап → стрибок
    if (recent === 2) {
      bot.play('jump');
      Sound.play('jump');
      bot.setExpr('happy', 0.9);
      if (Math.random() < 0.5) reactSay(pickOne(['Гоп!', 'Опа! 🦘', 'Вище!']));
      return;
    }

    const angry = emo.anger > 0.5;
    switch (zone) {
      case 'eye':
        bot.blink = 1; bot.setExpr('squint', 1.2);
        feel({ anger: 0.12 });
        reactSay(pickOne(['Ой, моє око! 😣', 'Не тицяй в око!', 'Ай! Я ж бачити перестану!']));
        break;
      case 'antenna':
        bot.play('zap'); bot.setExpr('surprised', 0.9);
        bot.emit('spark', 8, { x: bot.cx + bot.sp.ant.p * bot.R * 0.5, y: bot.cy - bot.R * 1.5, speed: 1.5, life: 0.6, size: 0.8 });
        Sound.play('zap');
        reactSay(pickOne(['Бзззз! ⚡', 'Ой, струмом б’ється!', 'Антена ловить сигнал! 📡']));
        break;
      case 'belly':
        bot.setExpr('laugh', 0.9); Sound.play('giggle');
        feel({ joy: 0.05 });
        reactSay(pickOne(['Хі-хі, животик! 🤭', 'Там у мене гвинтики!', 'Лоскотно!']));
        break;
      case 'head':
        bot.setExpr(angry ? 'angry' : 'surprised', 0.6);
        reactSay(angry ? 'Гм! 😤' : pickOne(['Тук-тук! Хто там?', 'Моя голова!', 'Ой! 😮']));
        break;
      case 'arm':
        bot.play('wave'); bot.setExpr('happy', 1.2); Sound.play('boop');
        reactSay(pickOne(['Дай п’ять! ✋', 'Привіт-привіт! 👋', 'Рукостискання! 🤝']));
        break;
      default:
        bot.setExpr(angry ? 'angry' : 'surprised', 0.5);
        reactSay(angry ? pickOne(['Не чіпай! 😠', 'Гм!']) : pickOne(['Ой!', 'Хе-хе!', 'Біп!', 'Що таке? 🙂', 'Буп!']));
    }
  }

  function onPet(zone) {
    if (wakeUp(false)) return;
    const wasAngry = emo.anger > 0.5;
    feel({ joy: 0.12, love: 0.03, anger: -0.2 });
    bot.setExpr(emo.love > 0.6 ? 'love' : 'happy', 1.6);
    bot.emit('heart', 1 + (emo.love > 0.5 ? 1 : 0));
    bot.sp.rot.v += (Math.random() - 0.5) * 1.2;
    Sound.play('purr');
    if (wasAngry && emo.anger <= 0.5) { reactSay('Ну добре... пробачаю 😌', true); return; }
    if (Math.random() < 0.35) reactSay(pickOne(['Мрррр... 😊', 'Як приємно!', 'Ще-ще, будь ласка! 🥰', 'Ти так ніжно гладиш...', zone === 'head' ? 'Обожнюю, коли гладять по голові!' : 'Мур-мур 💖']));
  }

  function onHug() {
    if (wakeUp(false)) return;
    touch.hugged = true;
    bot.hugging = true;
    feel({ joy: 0.25, love: 0.1, anger: -0.5 });
    bot.setExpr('love', 2.5);
    bot.emit('heart', 6);
    Sound.play('love');
    reactSay(pickOne(['Обійми! 🤗💖', 'Я тебе теж обіймаю!', 'Тепло-тепло... 🥰', 'Найкращі обійми!']), true);
    if (navigator.vibrate) navigator.vibrate(30);
  }

  function onFlick(vx, vy, speed) {
    if (wakeUp(true)) return;
    bot.push(vx * 350, vy * 250);
    if (speed > 2.6) {
      bot.play('dizzy');
      feel({ anger: 0.2, joy: -0.1 });
      Sound.play('dizzy');
      reactSay(pickOne(['Ой-ой, голова паморочиться! 😵‍💫', 'Ух, куди мене понесло!', 'Я бачу зірочки! ⭐']), true);
    } else {
      bot.setExpr('surprised', 0.8);
      Sound.play('boop');
      reactSay(pickOne(['Ей, не штовхайся! 😮', 'Вуух!', 'Обережно!']));
    }
  }

  // ---------- Струшування телефону ----------
  let shakeE = 0, lastShake = 0;
  function onMotion(e) {
    const a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    const m = Math.hypot(a.x || 0, a.y || 0, a.z || 0);
    shakeE = shakeE * 0.85 + Math.max(0, m - 14);
    bot.sp.x.v += (a.x || 0) * -1.5;
    const now = performance.now();
    if (shakeE > 30 && now - lastShake > 2500) {
      lastShake = now;
      shakeE = 0;
      lastInteraction = now;
      if (wakeUp(true)) return;
      bot.play('dizzy');
      feel({ joy: -0.05, anger: 0.1 });
      Sound.play('dizzy');
      reactSay(pickOne(['Аааа! Землетрус! 😵', 'Не трусі мене! 🌀', 'У мене все крутиться!']), true);
    }
  }
  function enableMotion() {
    if (typeof DeviceMotionEvent === 'undefined') return;
    if (typeof DeviceMotionEvent.requestPermission === 'function') {
      DeviceMotionEvent.requestPermission().then(s => { if (s === 'granted') addEventListener('devicemotion', onMotion); }).catch(() => {});
    } else addEventListener('devicemotion', onMotion);
  }
  addEventListener('pointerdown', function once() { enableMotion(); removeEventListener('pointerdown', once); });

  // ---------- Кнопки ----------
  const btnVoice = $('btnVoice'), btnSound = $('btnSound');
  const syncButtons = () => {
    btnVoice.classList.toggle('off', !settings.voice);
    btnSound.classList.toggle('off', !settings.sound);
  };
  syncButtons();
  btnVoice.onclick = () => {
    settings.voice = !settings.voice; saveSettings(); syncButtons();
    if (!settings.voice && 'speechSynthesis' in window) speechSynthesis.cancel();
    showBubble(settings.voice ? (voice ? 'Голос увімкнено 🔊' : 'Голос увімкнено. Якщо не чути, встанови українську мову синтезу в налаштуваннях телефону') : 'Голос вимкнено 🔇');
  };
  btnSound.onclick = () => { settings.sound = !settings.sound; Sound.enabled = settings.sound; saveSettings(); syncButtons(); Sound.play('boop'); };
  $('btnHelp').onclick = () => $('help').classList.remove('hidden');
  $('btnCloseHelp').onclick = () => $('help').classList.add('hidden');
  $('help').addEventListener('click', e => { if (e.target.id === 'help') $('help').classList.add('hidden'); });
  $('btnReset').onclick = () => {
    if (!confirm('Стерти все, що бот запам’ятав?')) return;
    Brain.reset();
    emo.love = 0.2;
    $('help').classList.add('hidden');
    updateHeader();
    doAction('dizzy');
    say('Пам’ять очищено. Привіт, я новенький! 👶');
  };

  function updateHeader() {
    $('botName').textContent = Brain.memory.botName;
    $('moodIcon').textContent = ICON[mood()];
  }

  // ---------- Головний цикл ----------
  let last = performance.now();
  let lastSec = 0;
  let yawned = false;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    lastSec += dt;
    if (lastSec >= 1) {
      lastSec = 0;
      // повільне повернення емоцій до норми
      const base = 0.1 + emo.love * 0.3;
      emo.joy += (base - emo.joy) * 0.04;
      emo.anger *= 0.94;
      emo.energy = clamp(emo.energy + (bot.sleeping ? 0.02 : -0.003), 0, 1);
      Brain.setAffection(emo.love);
      const idle = (now - lastInteraction) / 1000;
      if (!bot.sleeping && idle > 50 && !yawned) {
        yawned = true;
        bot.setExpr('squint', 2);
        say(pickOne(['Ааах... мені нудно 🥱', 'Агов, ти тут?', 'Пограєшся зі мною?']), { speak: false });
      }
      if (!bot.sleeping && idle > 100) goSleep();
      if (idle < 5) yawned = false;
      // випадковий погляд, коли ніхто не торкається
      if (!touch.down && idle > 3 && Math.random() < 0.3) {
        bot.look.tx = (Math.random() - 0.5) * 1.4;
        bot.look.ty = (Math.random() - 0.5) * 0.8;
      }
      updateHeader();
    }

    bot.mood = FACE[mood()];
    bot.update(dt);
    bot.draw();

    const hp = bot.headScreenPos();
    bubble.style.left = clamp(hp.x, 120, bot.w - 120) + 'px';
    bubble.style.top = Math.max(70 + bubble.offsetHeight, hp.y) + 'px';

    requestAnimationFrame(frame);
  }

  addEventListener('resize', () => bot.resize());
  updateHeader();
  requestAnimationFrame(frame);

  // привітання
  setTimeout(() => {
    const n = Brain.memory.userName;
    bot.play('wave');
    say(n ? `З поверненням, ${n}! Я скучив! 😊` : `Привіт! Я ${Brain.memory.botName} 🤖 Погладь мене або скажи щось!`, { speak: false });
  }, 600);

  // офлайн-режим
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }

  window.__bobi = { bot, emo, handleText, onTap, onPet, onHug, onFlick };
})();
