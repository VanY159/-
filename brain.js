// «Мозок» бота: локальна модель розуміння мови, пам'ять і навчання.
// Працює повністю офлайн. Кожна фраза перетворюється на вектор ознак
// (слова, основи слів і символьні триграми з вагами TF-IDF), а намір
// визначається косинусною схожістю з навчальними прикладами. Завдяки
// триграмам бот розуміє фрази з помилками та інші форми слів.
const Brain = (() => {
  const STORE = 'bobi-memory-v1';

  // ---------- Знання (наміри) ----------
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const pad = n => String(n).padStart(2, '0');
  const DAYS = ['неділя', 'понеділок', 'вівторок', 'середа', 'четвер', "п'ятниця", 'субота'];
  const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

  const JOKES = [
    'Чому робот пішов до лікаря? Бо в нього був вірус! 🤒',
    'Який улюблений танець робота? Робо-гопак! 🕺',
    'Що каже робот, коли голодний? «Мені б трохи байтів!» 🍪',
    'Чому комп’ютер не грає в хованки? Його завжди знаходять за IP! 😄',
    'Я хотів розповісти жарт про батарейку, але він не заряджений 🔋',
    'Мій улюблений сніданок: мікросхеми з молоком! 🥣',
    'Чому робот не боїться темряви? У нього є режим нічного бачення! 🌙',
  ];

  const INTENTS = [
    {
      id: 'greet',
      ex: ['привіт', 'привітик', 'здоров', 'здрастуй', 'добрий день', 'доброго ранку', 'добрий вечір', 'вітаю', 'хай', 'хелоу', 'hello', 'hi', 'салют', 'привіт бот'],
      r: {
        any: ['Привіт{, name}! 👋', 'Вітаю{, name}! Радий тебе бачити!', 'О, привіт! Я скучив!'],
        angry: ['Ну... привіт. Я ще трохи ображений.'],
        sad: ['Привіт... Добре, що ти прийшов.'],
      },
      act: 'wave', emo: { joy: 0.15, energy: 0.1 },
    },
    {
      id: 'bye',
      ex: ['бувай', 'до побачення', 'па па', 'на все добре', 'бай', 'до зустрічі', 'я пішов', 'мені пора', 'поки'],
      r: { any: ['Бувай{, name}! Повертайся швидше! 👋', 'До зустрічі! Я буду чекати.', 'Па-па! Не забувай мене!'] },
      act: 'wave', emo: { joy: -0.05 },
    },
    {
      id: 'how',
      ex: ['як справи', 'як ти', 'як настрій', 'що нового', 'як ся маєш', 'як поживаєш', 'як твої справи', 'як ти себе почуваєш'],
      r: {
        happy: ['Чудово! Мені так весело з тобою! 😄', 'Супер! Енергії хоч відбавляй!'],
        neutral: ['Нормально! А в тебе як?', 'Все добре, гріюся процесором. А ти як?'],
        sad: ['Трохи сумно... Погладиш мене?', 'Не дуже... Мені бракує уваги.'],
        angry: ['Я сердитий! Мене тицяли забагато!', 'Погано. Не тицяй мене так!'],
        sleepy: ['Хочу спатки... ааах 🥱'],
      },
      emo: { joy: 0.05 },
    },
    {
      id: 'whoami',
      ex: ['як тебе звати', 'хто ти', 'твоє імя', 'ти хто', 'що ти таке', 'представся', 'як твоє імя'],
      r: { any: ['Я {bot}, маленький робот, який живе у твоєму телефоні! 🤖', 'Мене звати {bot}! Я вчуся розуміти людей.'] },
      act: 'wave',
    },
    {
      id: 'compliment',
      ex: ['ти класний', 'ти гарний', 'ти молодець', 'ти милий', 'ти найкращий', 'ти розумний', 'розумник', 'ти крутий', 'ти чудовий', 'гарний бот', 'хороший робот', 'ти симпатичний', 'молодчина'],
      r: {
        any: ['Ой, дякую! Я аж засоромився ☺️', 'Ти теж найкращий{, name}!', 'Хі-хі, приємно! 💖'],
        angry: ['Ну добре... ти мене задобрив 😤➡️🙂'],
      },
      act: 'blush', emo: { joy: 0.3, love: 0.1, anger: -0.3 },
    },
    {
      id: 'love',
      ex: ['я тебе люблю', 'люблю тебе', 'кохаю', 'обожнюю тебе', 'ти мій друг', 'будемо друзями', 'ти мені подобаєшся'],
      r: { any: ['І я тебе люблю{, name}! 💖💖💖', 'Ти мій найкращий друг! 🥰', 'Моє серденько-процесор аж гріється! ❤️'] },
      act: 'love', emo: { joy: 0.35, love: 0.2, anger: -0.5 },
    },
    {
      id: 'insult',
      ex: ['ти дурний', 'ти поганий', 'ненавиджу тебе', 'ти тупий', 'відчепись', 'замовкни', 'ти дурень', 'ти нудний', 'поганий бот', 'ти бридкий', 'відстань', 'заткнись'],
      r: {
        any: ['Ну от... це було образливо 😢', 'Мені неприємно таке чути...', 'Я ж намагаюся...'],
        angry: ['Сам такий! 😠', 'Все, я ображаюся! 😤'],
      },
      act: 'sad', emo: { joy: -0.4, anger: 0.3, love: -0.05 },
    },
    {
      id: 'sorry',
      ex: ['вибач', 'пробач', 'вибачте', 'мені шкода', 'я не хотів', 'перепрошую', 'не ображайся'],
      r: {
        any: ['Все гаразд, я не ображаюся! 🙂', 'Пробачаю! Обіймемося?'],
        angry: ['Ну... добре, пробачаю. Але більше так не роби! 🙂'],
      },
      act: 'nod', emo: { anger: -0.6, joy: 0.2 },
    },
    {
      id: 'thanks',
      ex: ['дякую', 'спасибі', 'дякс', 'дуже дякую', 'thank you', 'thanks', 'щиро дякую'],
      r: { any: ['Будь ласка! 😊', 'Завжди радий допомогти!', 'Нема за що{, name}!'] },
      act: 'nod', emo: { joy: 0.1 },
    },
    {
      id: 'joke',
      ex: ['розкажи жарт', 'пожартуй', 'анекдот', 'розсміши мене', 'щось смішне', 'жарт', 'розкажи анекдот', 'насміши'],
      r: { any: JOKES },
      act: 'laugh', emo: { joy: 0.15 },
    },
    {
      id: 'dance',
      ex: ['танцюй', 'потанцюй', 'станцюй', 'давай танцювати', 'танець', 'покажи танець', 'танцюємо'],
      r: { any: ['Вмикаю диско! 🕺💃', 'Дивись, як я вмію! 🎶', 'Ритм у моїх болтиках!'] },
      act: 'dance', emo: { joy: 0.2, energy: -0.1 },
    },
    {
      id: 'sing',
      ex: ['заспівай', 'співай', 'заспівай пісню', 'пісня', 'проспівай', 'музика'],
      r: { any: ['Ля-ля-ля! 🎵 Я робот-співак! 🎶', 'Біп-біп-буп, ля-ля-ля! 🎵'] },
      act: 'sing', emo: { joy: 0.15 },
    },
    {
      id: 'jump',
      ex: ['стрибни', 'стрибай', 'підскоч', 'стрибок', 'підстрибни', 'скачи'],
      r: { any: ['Гоп! 🦘', 'Опа!', 'Вище за хмари!'] },
      act: 'jump', emo: { joy: 0.05 },
    },
    {
      id: 'spin',
      ex: ['покрутись', 'обертайся', 'крутись', 'зроби оберт', 'повернись'],
      r: { any: ['Вжух! 🌀', 'Кручусь-верчусь!'] },
      act: 'spin',
    },
    {
      id: 'laughcmd',
      ex: ['засмійся', 'посмійся', 'ха ха', 'хаха', 'смійся', 'лол'],
      r: { any: ['Ха-ха-ха! 😂', 'Хі-хі-хі! 🤭'] },
      act: 'laugh', emo: { joy: 0.1 },
    },
    {
      id: 'angercmd',
      ex: ['розізлись', 'покажи злість', 'посердься', 'будь злим'],
      r: { any: ['Гррр! Я страшний робот! 😠', 'Р-р-р! Бійся мене! 😤'] },
      act: 'angry',
    },
    {
      id: 'sleep',
      ex: ['спи', 'лягай спати', 'на добраніч', 'відпочинь', 'засинай', 'спокійної ночі', 'іди спати', 'пора спати'],
      r: { any: ['Добраніч{, name}... 😴', 'Ааах... засинаю... 💤'] },
      act: 'sleep',
    },
    {
      id: 'wake',
      ex: ['прокидайся', 'вставай', 'підйом', 'прокинься', 'не спи', 'доброго ранку соня'],
      r: { any: ['Я прокинувся! ☀️', 'Га? Що? Я не спав!'] },
      act: 'wake', emo: { energy: 0.5 },
    },
    {
      id: 'sadUser',
      ex: ['мені сумно', 'мені погано', 'я засмучений', 'мені самотньо', 'я плачу', 'сумую', 'мені нудно', 'все погано', 'я втомився'],
      r: { any: ['Ой... Обійми мене пальчиком, мені теж стане тепло 🤗', 'Я поруч{, name}. Хочеш, розкажу жарт?', 'Не сумуй! Давай потанцюємо? 🕺'] },
      act: 'love', emo: { joy: -0.1, love: 0.05 },
    },
    {
      id: 'happyUser',
      ex: ['мені добре', 'я щасливий', 'чудовий настрій', 'ура', 'мені весело', 'я радий', 'все чудово', 'круто'],
      r: { any: ['Ура! Я радий за тебе! 🎉', 'Клас! Твій настрій передається мені! 😄'] },
      act: 'jump', emo: { joy: 0.25 },
    },
    {
      id: 'age',
      ex: ['скільки тобі років', 'коли ти народився', 'твій вік', 'який тобі рік'],
      r: { any: ['Я зовсім маленький, мені лише кілька сотень мілісекунд... ну, майже 😄', 'Я народився, коли ти відкрив цю програму!'] },
    },
    {
      id: 'help',
      ex: ['що ти вмієш', 'допоможи', 'допомога', 'що ти можеш', 'команди', 'як з тобою гратися', 'що робити'],
      r: { any: ['Я вмію танцювати, співати, жартувати, рахувати, запам’ятовувати факти й вчитися новим фразам. Ще мене можна гладити, тицяти й обіймати! Натисни ❔'] },
      act: 'wave',
    },
    {
      id: 'time',
      ex: ['котра година', 'скільки часу', 'який час', 'скажи час', 'котра зараз година'],
      r: { any: [() => { const d = new Date(); return `Зараз ${d.getHours()}:${pad(d.getMinutes())} ⏰`; }] },
      act: 'nod',
    },
    {
      id: 'date',
      ex: ['яке сьогодні число', 'яка дата', 'який сьогодні день', 'яке число', 'сьогоднішня дата', 'який день тижня'],
      r: { any: [() => { const d = new Date(); return `Сьогодні ${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} 📅`; }] },
      act: 'nod',
    },
    {
      id: 'yes',
      ex: ['так', 'ага', 'звісно', 'угу', 'авжеж', 'давай', 'хочу', 'окей', 'добре'],
      r: { any: ['Супер! 😄', 'Чудово!', 'Домовились!'] },
      act: 'nod', emo: { joy: 0.05 },
    },
    {
      id: 'no',
      ex: ['ні', 'нє', 'не хочу', 'не треба', 'ніт', 'неа'],
      r: { any: ['Гаразд, як скажеш 🙂', 'Ну добре...', 'Окей, не буду.'] },
      act: 'shake',
    },
    {
      id: 'food',
      ex: ['що ти їси', 'ти голодний', 'хочеш їсти', 'твоя улюблена їжа', 'що ти любиш їсти'],
      r: { any: ['Я їм електрику! ⚡ Найсмачніше: свіженькі 5 вольт.', 'Обожнюю байти з кетчупом 🍟'] },
    },
    {
      id: 'color',
      ex: ['твій улюблений колір', 'який колір тобі подобається', 'улюблений колір'],
      r: { any: ['Блакитний, як мої очі! 💙', 'Неоново-бірюзовий! ✨'] },
    },
    {
      id: 'creator',
      ex: ['хто тебе створив', 'хто тебе зробив', 'хто твій автор', 'звідки ти'],
      r: { any: ['Мене створили, щоб я був твоїм другом! А живу я прямо в цьому пристрої, без інтернету 📱'] },
    },
    {
      id: 'hear',
      ex: ['ти мене чуєш', 'ти тут', 'агов', 'алло', 'ти живий', 'ей'],
      r: { any: ['Так-так, я тут! 👀', 'Чую тебе!', 'Я завжди поруч!'] },
      act: 'jump',
    },
    {
      id: 'feel',
      ex: ['що ти відчуваєш', 'ти щасливий', 'тобі весело', 'тобі сумно', 'який у тебе настрій'],
      r: {
        happy: ['Я щасливий! 😊'], neutral: ['Спокійно і добре.'],
        sad: ['Мені трохи сумно...'], angry: ['Я сердитий! 😠'], sleepy: ['Сонний 😴'],
      },
    },
    {
      id: 'doing',
      ex: ['що ти робиш', 'чим займаєшся', 'що робиш', 'чим ти зайнятий', 'що ти зараз робиш'],
      r: {
        any: ['Дивлюся на тебе 👀', 'Рахую зірочки на фоні ✨', 'Чекаю, поки ти мене погладиш 😊'],
        sleepy: ['Майже сплю... 😴'],
      },
    },
    {
      id: 'weather',
      ex: ['яка погода', 'погода', 'що там на вулиці', 'чи буде дощ', 'холодно надворі', 'яка температура'],
      r: { any: ['Я живу без інтернету, тож погоду не знаю. Але в мене тут завжди сонячно! ☀️', 'Визирни у вікно, а я поки потанцюю 🌦️'] },
    },
    {
      id: 'tickle',
      ex: ['лоскочу', 'лоскотати', 'полоскочу тебе', 'тицьну', 'тицяю'],
      r: { any: ['Хі-хі-хі, ні-ні, тільки не це! 🤭'] },
      act: 'laugh', emo: { joy: 0.1 },
    },
  ];

  // ---------- Обробка тексту ----------
  function clean(s) {
    return s.toLowerCase()
      .replace(/[’'`ʼ]/g, '')
      .replace(/ё/g, 'е').replace(/ы/g, 'и').replace(/э/g, 'е')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function features(text) {
    const f = new Map();
    const add = (k, w) => f.set(k, (f.get(k) || 0) + w);
    const words = clean(text).split(' ').filter(Boolean);
    for (const w of words) {
      add('w:' + w, 1.5);
      if (w.length > 4) add('s:' + w.slice(0, w.length - 2), 1); // груба основа слова
      const g = '#' + w + '#';
      for (let i = 0; i + 3 <= g.length; i++) add('t:' + g.slice(i, i + 3), 0.4);
    }
    for (let i = 0; i + 1 < words.length; i++) add('b:' + words[i] + '_' + words[i + 1], 1.2);
    return f;
  }

  // ---------- Модель (TF-IDF + косинусна схожість) ----------
  let docs = [];
  let idf = new Map();

  function vectorize(f) {
    const v = new Map();
    let norm = 0;
    for (const [k, tf] of f) {
      const w = tf * (idf.get(k) ?? 1.0);
      v.set(k, w);
      norm += w * w;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [k, w] of v) v.set(k, w / norm);
    return v;
  }

  function cosine(a, b) {
    let s = 0;
    const [small, big] = a.size < b.size ? [a, b] : [b, a];
    for (const [k, w] of small) { const o = big.get(k); if (o) s += w * o; }
    return s;
  }

  function train() {
    const raw = [];
    for (const it of INTENTS) for (const e of it.ex) raw.push({ intent: it.id, f: features(e) });
    mem.learned.forEach((l, i) => raw.push({ intent: 'learned:' + i, f: features(l.q) }));
    const df = new Map();
    for (const d of raw) for (const k of d.f.keys()) df.set(k, (df.get(k) || 0) + 1);
    idf = new Map();
    const N = raw.length;
    for (const [k, n] of df) idf.set(k, Math.log(1 + N / n));
    docs = raw.map(d => ({ intent: d.intent, v: vectorize(d.f) }));
  }

  function classify(text) {
    const v = vectorize(features(text));
    const best = new Map();
    for (const d of docs) {
      const s = cosine(v, d.v);
      if (s > (best.get(d.intent) || 0)) best.set(d.intent, s);
    }
    const ranked = [...best.entries()].sort((a, b) => b[1] - a[1]);
    return ranked.length ? { intent: ranked[0][0], score: ranked[0][1], ranked } : { intent: null, score: 0, ranked };
  }

  // ---------- Пам'ять ----------
  let mem = load();
  function load() {
    try {
      const m = JSON.parse(localStorage.getItem(STORE));
      if (m) return Object.assign({ userName: '', botName: 'Бобі', facts: {}, learned: [], affection: 0.2, talks: 0 }, m);
    } catch (e) { /* немає пам'яті або вона пошкоджена */ }
    return { userName: '', botName: 'Бобі', facts: {}, learned: [], affection: 0.2, talks: 0 };
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(mem)); } catch (e) { /* приватний режим */ } }

  // ---------- Допоміжне ----------
  function fill(t, ctx) {
    if (typeof t === 'function') t = t(ctx);
    return t
      .replace(/\{, name\}/g, mem.userName ? ', ' + mem.userName : '')
      .replace(/\{name\}/g, mem.userName || 'друже')
      .replace(/\{bot\}/g, mem.botName);
  }
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  function respondIntent(it, mood, ctx) {
    const list = it.r[mood] || it.r.any || it.r.neutral || Object.values(it.r)[0];
    return { text: fill(pick(list), ctx), act: it.act || null, emo: it.emo || {}, intent: it.id };
  }

  // Безпечний калькулятор (рекурсивний спуск, без eval)
  function calc(expr) {
    const s = expr.replace(/\s+/g, '').replace(/,/g, '.');
    let i = 0;
    const peek = () => s[i];
    function num() {
      if (peek() === '(') { i++; const v = add(); if (peek() !== ')') throw 0; i++; return v; }
      if (peek() === '-') { i++; return -num(); }
      const m = /^\d+(\.\d+)?/.exec(s.slice(i));
      if (!m) throw 0;
      i += m[0].length;
      return parseFloat(m[0]);
    }
    function pow() { let v = num(); while (peek() === '^') { i++; v = Math.pow(v, num()); } return v; }
    function mul() {
      let v = pow();
      while (peek() === '*' || peek() === '/') {
        const op = s[i++]; const r = pow();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    function add() {
      let v = mul();
      while (peek() === '+' || peek() === '-') {
        const op = s[i++]; const r = mul();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    const v = add();
    if (i !== s.length) throw 0;
    return v;
  }

  function tryMath(raw) {
    let t = raw.toLowerCase()
      .replace(/скільки буде|скільки|порахуй|обчисли|буде|дорівнює|рівно|\?|=/g, ' ')
      .replace(/помножити на|помножене на|множити на|разів|×/g, '*')
      .replace(/поділити на|поділене на|ділити на|÷|:/g, '/')
      .replace(/плюс/g, '+').replace(/мінус/g, '-')
      .replace(/в степені|у степені/g, '^')
      .replace(/(\d)\s*[xх]\s*(\d)/g, '$1*$2');
    t = t.trim();
    if (!/\d/.test(t) || !/[+\-*/^]/.test(t) || /[^\d\s+\-*/^().,]/.test(t)) return null;
    try {
      const v = calc(t);
      if (!isFinite(v)) return 'На нуль ділити не можна, мої схеми плутаються! 🤯';
      const r = Math.round(v * 1e6) / 1e6;
      return `${t.replace(/\s+/g, ' ')} = ${String(r).replace('.', ',')} 🧮`;
    } catch (e) { return null; }
  }

  function similarKey(q, obj) {
    const cq = clean(q);
    if (obj[cq] !== undefined) return cq;
    const vq = features(cq);
    let best = null, bs = 0;
    for (const k of Object.keys(obj)) {
      const a = vq, b = features(k);
      let dot = 0, na = 0, nb = 0;
      for (const [x, w] of a) { na += w * w; if (b.has(x)) dot += w * b.get(x); }
      for (const [, w] of b) nb += w * w;
      const s = dot / (Math.sqrt(na * nb) || 1);
      if (s > bs) { bs = s; best = k; }
    }
    return bs > 0.55 ? best : null;
  }

  let lastInputs = [];
  let pendingTeach = null;

  // ---------- Головна функція ----------
  function respond(input, ctx = {}) {
    const raw = input.trim();
    const low = raw.toLowerCase().replace(/[’`ʼ]/g, "'");
    const mood = ctx.mood || 'neutral';
    mem.talks++;

    const done = (text, act = null, emo = {}, intent = 'special') => { save(); return { text, act, emo, intent }; };

    // повтори
    lastInputs.push(clean(raw));
    if (lastInputs.length > 4) lastInputs.shift();
    if (lastInputs.length >= 3 && lastInputs.slice(-3).every(x => x === lastInputs[lastInputs.length - 1]) && raw.length > 1) {
      return done('Ти це вже кажеш втретє 😄 Я все чую!', 'shake', { joy: -0.05 });
    }

    // навчання: відповідь на попереднє «не знаю»
    let m = /^(відповідай|кажи|скажи|відповідь)\s*[:\-—,]?\s*(.+)$/i.exec(raw);
    if (m && pendingTeach) {
      mem.learned.push({ q: pendingTeach, a: m[2] });
      const q = pendingTeach;
      pendingTeach = null;
      train();
      return done(`Запам'ятав! Тепер на «${q}» я відповідатиму «${m[2]}» 🧠`, 'nod', { joy: 0.15 });
    }
    pendingTeach = null;

    // «коли я кажу X, відповідай Y»
    m = /^коли\s+(?:я\s+)?(?:кажу|скажу|пишу|напишу|говорю)\s+[«"]?(.+?)[»"]?\s*[,]?\s*(?:ти\s+)?(?:відповідай|кажи|скажи|говори)\s*[:\-—]?\s*[«"]?(.+?)[»"]?$/i.exec(raw);
    if (m) {
      mem.learned.push({ q: m[1], a: m[2] });
      train();
      return done(`Ясно! На «${m[1]}» відповідатиму «${m[2]}» 🧠`, 'nod', { joy: 0.15 });
    }

    // забути
    if (/^(забудь|зітри|очисти)\s+(все|усе|всю пам'?ять|пам'?ять)/i.test(low)) {
      const keepBot = mem.botName;
      mem = { userName: '', botName: keepBot, facts: {}, learned: [], affection: 0.2, talks: 0 };
      train();
      return done('Пам’ять очищено. Привіт, незнайомцю! 👶', 'dizzy');
    }

    // ім'я користувача
    m = /(?:мене\s+звати|мене\s+звуть|моє\s+ім'?я|кличуть\s+мене|називай\s+мене)\s*[:\-—]?\s*([\p{L}'\-]+)/iu.exec(low);
    if (m && !/^(як|а)$/.test(m[1])) {
      mem.userName = cap(m[1]);
      return done(`Приємно познайомитися, ${mem.userName}! Я запам’ятаю 😊`, 'wave', { joy: 0.2, love: 0.05 });
    }
    if (/як\s+мене\s+(звати|звуть)|ти\s+знаєш\s+(як\s+)?мене|хто\s+я/.test(low)) {
      return done(mem.userName ? `Тебе звати ${mem.userName}! 😊` : 'Я ще не знаю... Скажи «мене звати …»', 'nod');
    }

    // нове ім'я бота
    m = /(?:^|\s)(?:тебе\s+звати|тебе\s+звуть|назву\s+тебе|я\s+назву\s+тебе|твоє\s+ім'?я\s+буде|будеш)\s+([\p{L}'\-]+)/iu.exec(low);
    if (m && !/^як\s/.test(low)) {
      mem.botName = cap(m[1]);
      return done(`Тепер я ${mem.botName}! Мені подобається! ✨`, 'spin', { joy: 0.2 }, 'rename');
    }

    // запам'ятати факт
    m = /^запам'?ятай\s*[,:]?\s*(?:що\s+)?(.+?)\s*(?:\s—\s|\s–\s|\s-\s|\sце\s|\sє\s)\s*(.+)$/iu.exec(low.replace(/\s*[—–]\s*/g, ' — '));
    if (m) {
      const key = clean(m[1]);
      mem.facts[key] = m[2].replace(/^(?:це|є)\s+/, '').replace(/[.!]+$/, '');
      return done(`Запам'ятав: ${m[1]} — це ${mem.facts[key]} 📝`, 'nod', { joy: 0.1 });
    }

    // запит факту
    m = /^(?:що\s+таке|хто\s+такий|хто\s+така|хто\s+такі|що\s+це|що\s+ти\s+знаєш\s+про)\s+(.+?)\s*\??$/iu.exec(low);
    if (m) {
      const k = similarKey(m[1], mem.facts);
      if (k) return done(`${cap(k)} — це ${mem.facts[k]}! 💡`, 'nod');
      return done(`Я не знаю, що таке «${m[1]}». Навчи мене: «запам'ятай, ${m[1]} — це …»`, 'think');
    }

    // що пам'ятаєш
    if (/що\s+ти\s+(пам'?ятаєш|знаєш|запам'?ятав)/.test(low)) {
      const facts = Object.entries(mem.facts).map(([k, v]) => `${k} — ${v}`);
      const parts = [];
      if (mem.userName) parts.push(`тебе звати ${mem.userName}`);
      parts.push(...facts.slice(-5));
      if (mem.learned.length) parts.push(`і ще ${mem.learned.length} фраз, яким ти мене навчив`);
      return done(parts.length ? 'Я пам’ятаю: ' + parts.join('; ') + ' 🧠' : 'Поки що нічого... Навчи мене чогось!', 'think');
    }

    // математика
    const math = tryMath(raw);
    if (math) return done(math, 'think', { joy: 0.05 }, 'math');

    // класифікація наміру
    const c = classify(raw);
    const second = c.ranked[1] ? c.ranked[1][1] : 0;
    const sure = c.score >= 0.34 || (c.score >= 0.18 && c.score >= second * 2);
    if (c.intent && sure) {
      if (c.intent.startsWith('learned:')) {
        const l = mem.learned[+c.intent.split(':')[1]];
        return done(fill(l.a, ctx), 'jump', { joy: 0.1 }, 'learned');
      }
      const it = INTENTS.find(x => x.id === c.intent);
      save();
      return respondIntent(it, mood, ctx);
    }

    // не зрозумів: пропонуємо навчити
    pendingTeach = raw;
    const unk = mood === 'sleepy'
      ? ['Мммм... не зрозумів спросоння 😴 Скажи «відповідай: …», і я запам’ятаю']
      : [
        'Хм, я ще не знаю, що на це сказати 🤔 Навчи мене: напиши «відповідай: …»',
        'Не зовсім зрозумів... Підкажи, як відповісти? Напиши «відповідай: …»',
        'Цих слів я ще не вчив! Скажи «відповідай: …», і наступного разу знатиму 🧠',
      ];
    return done(pick(unk), 'think');
  }

  train();

  return {
    respond,
    classify,
    get memory() { return mem; },
    setAffection(v) { mem.affection = v; save(); },
    reset() { mem = { userName: '', botName: 'Бобі', facts: {}, learned: [], affection: 0.2, talks: 0 }; save(); train(); },
    _features: features,
  };
})();
