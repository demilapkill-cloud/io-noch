/* ============================================================
   третья ночь — игра про то, как не спать
   killu × fable · 2026
   Одна ночь = ~5.5 минут. Кровать летит по небу, ловит мысли,
   мимо ходят корабли. Чем дольше не спишь — тем громче мир.
   ============================================================ */
(() => {
'use strict';

// ---------- helpers ----------
const TAU = Math.PI * 2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const sstep = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const m2f = m => 440 * Math.pow(2, (m - 69) / 12);
function hex(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function mix3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
// Math.hypot в V8 много медленнее обычного корня, а в кадре его зовут тысячи раз
function hyp(x, y) { return Math.sqrt(x * x + y * y); }
// строки цвета — самый частый мусор кадра; держим их в кэше по огрублённому ключу
const _css = new Map();
function css3(c, a = 1) {
  const r = (c[0] * 255) | 0, g = (c[1] * 255) | 0, b = (c[2] * 255) | 0;
  const qa = (a * 255) | 0;
  const key = ((r << 24) | (g << 16) | (b << 8) | qa) >>> 0;
  let s = _css.get(key);
  if (s === undefined) {
    if (_css.size > 4096) _css.clear();
    s = 'rgba(' + r + ',' + g + ',' + b + ',' + (qa / 255).toFixed(3) + ')';
    _css.set(key, s);
  }
  return s;
}

// ============================================================
// ЯЗЫК И НАСТРОЙКИ
// Русский — родной голос игры, английский идёт вторым; всё видимое
// проходит через tr(), а настройки живут в localStorage.
// ============================================================
const DEFAULT_SET = {
  lang: 'ru', vol: 85, music: 100, sfx: 100,
  quality: 'auto', shake: 100, fx: 100, hud: 'full', fps: false,
  touchSide: 'right', joyR: 78, joyShow: false,
};
let SET = loadSettings();
let LANG = SET.lang;

function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('io-noch-set')) || {}; } catch (_) {}
  const out = Object.assign({}, DEFAULT_SET, s);
  if (out.lang !== 'ru' && out.lang !== 'en') out.lang = 'ru';
  return out;
}
function saveSettings() {
  try { localStorage.setItem('io-noch-set', JSON.stringify(SET)); } catch (_) {}
}
function tr(key, ...args) {
  const d = TXT[LANG] || TXT.ru;
  const v = key in d ? d[key] : TXT.ru[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
}

const TXT = {
  ru: {
    // — надписи мира —
    bossComes: 'корабль-кошмар идёт по небу',
    bossFled: 'рассвет прогнал корабль-кошмар',
    tether: 'нить натянута надёжно',
    hintTether: 'корабль близко — брось нить: она вяжет и жжёт ночь',
    sling: 'разгон',
    snap: 'нить лопнула',
    secondWind: 'второе дыхание',
    dew: 'роса рассветная',
    dawnLine: 'рассвет — а день промелькнёт мимо',
    star: 'павшая звезда',
    waveIn: n => 'волна ' + n + ' — ночь прибывает',
    waveOut: 'волна отхлынула — дыши',
    twinDown: 'тёмный двойник угас',
    rod: 'громоотвод',
    nightText: (n, storm) => (storm ? 'буря · ночь ' : 'ночь ') + n,
    // — HUD —
    thoughts: n => 'мыслей · ' + n,
    tierN: n => 'степень ' + n,
    chain: n => 'чреда ×' + n,
    keyMouse: 'ЛКМ', keySpace: 'пробел', keyShift: 'shift', secShort: 'с',
    wakeLabel: 'бодрость',
    ocBtn: 'заряд',
    bossName: 'корабль-кошмар',
    distK: 'к',
    // — экраны —
    titleBig: 'бесконечная\u00a0ночь',
    titleSub: 'роглайк о шарике света, коему не спится',
    help1: 'мышью — лететь · клик подле корабля — нить · пробел — мерцание',
    help1t: 'коснись — под пальцем родится джойстик, наклоняй его в сторону',
    help2t: 'кнопки под большим пальцем: нить · мерцание · заряд',
    btnTether: 'нить',
    btnBlink: 'мерцание',
    sTouch: 'палец',
    sTouchSide: 'сторона кнопок',
    sideRight: 'справа', sideLeft: 'слева',
    sJoyR: 'размер джойстика',
    sJoyShow: 'показывать джойстик',
    help2: 'shift — оверчардж · бодрость тает всечасно — одни мысли её держат',
    help3: 'луга щедры · разломы гибельны · теченья сносят · скорость жжёт',
    help4: 'всякая пятая ночь приводит корабль-кошмар — бей, покуда фонарь открыт',
    titleHint: 'соблаговоли нажать — и зажгись',
    titleVer: 'killu × fable · роглайк-ответвление «третьей ночи» · наушники надобны непременно',
    bestLine: (n, t, p) => 'славнейшая бессонница · ' + n + ' ноч' + p + ' · ' + t + ' мыслей',
    restHead: (lvl, w, mx) => 'степень ' + lvl + ' · бодрости ' + w + ' из ' + mx,
    restBig: 'дар бессонницы',
    restSub: 'ночь обождёт — избери себе один · клавиши 1 · 2 · 3',
    deathBig: 'ты растворился в ночи',
    deathNight: (n, p) => 'бессонница твоя длилась ' + n + ' ноч' + p,
    stNights: 'ночей выстояно',
    stThoughts: 'мыслей уловлено',
    stKills: 'кошмаров рассеяно',
    stDist: 'неба пройдено',
    againBtn: 'возгореться сызнова',
    pauseTxt: 'пауза',
    pauseSub: 'esc — воротиться в ночь',
    // — созвездие —
    skyHead: 'созвездие пойманных фраз',
    skyBtn: (c, t) => 'созвездие · ' + c + ' из ' + t + ' фраз',
    skyBtnEmpty: 'созвездие пойманных фраз',
    skyCount: (c, t) => c + ' из ' + t,
    skyHint: 'наведи на звезду — она вспомнит свою фразу',
    skyDark: 'эта звезда ещё не зажжена',
    sparkLocked: n => 'зажжётся на ' + n + '-й фразе',
    skyGain: (n, w) => 'созвездие пополнилось · ' + n + ' ' + w,
    skyBack: 'воротиться в ночь',
    // — настройки —
    settings: 'настройки',
    sLang: 'язык',
    sSound: 'звук',
    sVol: 'общая громкость',
    sMusic: 'музыка',
    sSfx: 'звуки',
    sPicture: 'картина',
    sQuality: 'качество',
    qAuto: 'авто', qHigh: 'высокое', qLow: 'низкое',
    sShake: 'тряска экрана',
    sFx: 'помехи и зерно',
    sHud: 'интерфейс',
    sFps: 'счётчик кадров',
    sOn: 'вкл', sOff: 'выкл',
    hFull: 'полный', hLite: 'только полосы', hOff: 'скрыт',
    sMemory: 'память',
    sReset: 'погасить созвездие',
    sResetHint: 'сотрёт все пойманные фразы и искры памяти — навсегда',
    sResetSure: 'точно? нажми ещё раз',
    sResetDone: 'созвездие погашено',
    sClose: 'закрыть',
    sHintPause: 'ночь ждёт, покуда открыты настройки',
  },
  en: {
    bossComes: 'the nightmare ship sails the sky',
    bossFled: 'dawn drove the nightmare ship away',
    tether: 'the thread is drawn taut',
    hintTether: 'a ship is near — cast the thread: it snares and burns the night',
    sling: 'a rush',
    snap: 'the thread snapped',
    secondWind: 'second wind',
    dew: 'dawn dew',
    dawnLine: 'dawn — and the day will flit past',
    star: 'a fallen star',
    waveIn: n => 'wave ' + n + ' — the night rises',
    waveOut: 'the wave has ebbed — breathe',
    twinDown: 'the dark twin has gone out',
    rod: 'lightning rod',
    nightText: (n, storm) => (storm ? 'storm · night ' : 'night ') + n,
    thoughts: n => 'thoughts · ' + n,
    tierN: n => 'tier ' + n,
    chain: n => 'chain ×' + n,
    keyMouse: 'LMB', keySpace: 'space', keyShift: 'shift', secShort: 's',
    wakeLabel: 'wakefulness',
    ocBtn: 'charge',
    bossName: 'the nightmare ship',
    distK: 'k',
    titleBig: 'endless\u00a0night',
    titleSub: 'a roguelike about a wisp that cannot sleep',
    help1: 'mouse — fly · click near a ship — thread · space — blink',
    help1t: 'touch anywhere — a joystick is born under your finger',
    help2t: 'buttons under your thumb: thread · blink · charge',
    btnTether: 'thread',
    btnBlink: 'blink',
    sTouch: 'finger',
    sTouchSide: 'button side',
    sideRight: 'right', sideLeft: 'left',
    sJoyR: 'joystick size',
    sJoyShow: 'show the joystick',
    help2: 'shift — overcharge · wakefulness always drains — only thoughts hold it',
    help3: 'meadows are generous · rifts are deadly · currents carry · speed burns',
    help4: 'every fifth night brings the nightmare ship — strike while its lantern is open',
    titleHint: 'press anywhere — and kindle',
    titleVer: 'killu × fable · a roguelike offshoot of "the third night" · headphones are essential',
    bestLine: (n, t) => 'finest sleeplessness · ' + n + (n === 1 ? ' night · ' : ' nights · ') + t + ' thoughts',
    restHead: (lvl, w, mx) => 'tier ' + lvl + ' · wakefulness ' + w + ' of ' + mx,
    restBig: 'gift of sleeplessness',
    restSub: 'the night will wait — choose one · keys 1 · 2 · 3',
    deathBig: 'you dissolved into the night',
    deathNight: n => 'your sleeplessness lasted ' + n + (n === 1 ? ' night' : ' nights'),
    stNights: 'nights withstood',
    stThoughts: 'thoughts caught',
    stKills: 'nightmares scattered',
    stDist: 'sky travelled',
    againBtn: 'kindle again',
    pauseTxt: 'paused',
    pauseSub: 'esc — return to the night',
    skyHead: 'constellation of caught phrases',
    skyBtn: (c, t) => 'constellation · ' + c + ' of ' + t + ' phrases',
    skyBtnEmpty: 'constellation of caught phrases',
    skyCount: (c, t) => c + ' of ' + t,
    skyHint: 'hover a star — it will recall its phrase',
    skyDark: 'this star is not lit yet',
    sparkLocked: n => 'lights at phrase ' + n,
    skyGain: (n, w) => 'the constellation grew · ' + n + ' ' + w,
    skyBack: 'return to the night',
    settings: 'settings',
    sLang: 'language',
    sSound: 'sound',
    sVol: 'master volume',
    sMusic: 'music',
    sSfx: 'effects',
    sPicture: 'picture',
    sQuality: 'quality',
    qAuto: 'auto', qHigh: 'high', qLow: 'low',
    sShake: 'screen shake',
    sFx: 'glitch and grain',
    sHud: 'interface',
    sFps: 'frame counter',
    sOn: 'on', sOff: 'off',
    hFull: 'full', hLite: 'bars only', hOff: 'hidden',
    sMemory: 'memory',
    sReset: 'extinguish the constellation',
    sResetHint: 'erases every caught phrase and memory spark — for good',
    sResetSure: 'certain? press again',
    sResetDone: 'the constellation is dark again',
    sClose: 'close',
    sHintPause: 'the night waits while settings are open',
  },
};

// звёзды-слова во множественном числе — по-русски трояко, по-английски двояко
function starWord(n) {
  if (LANG === 'en') return n === 1 ? 'new star' : 'new stars';
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return 'новая звезда';
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return 'новые звёзды';
  return 'новых звёзд';
}

// ---------- timeline ----------
// Ночь идёт с 23:00 до 06:00 (420 игровых минут) за TOTAL реальных секунд.
const TOTAL = 330;
// стопы палитры: [t, skyTop, skyBot, aurora, tint, mote, auroraInt, stars]
// дуга замкнута: рассвет на 0.93 плавно стекает обратно в сумерки к 1.0,
// чтобы ночь перетекала в ночь без чёрного обрыва
const STOPS = [
  [0.00, '#05070d', '#0b1322', '#14405a', '#e8a54a', '#ffd9a0', 0.18, 0.9],
  [0.24, '#070b18', '#17244a', '#3f7ea6', '#9fb4c7', '#cfe4ff', 0.42, 1.0],
  [0.50, '#10082e', '#2c1157', '#d84fd8', '#7df9ff', '#ff7ad9', 0.72, 1.1],
  [0.76, '#16003a', '#4d0f6e', '#ff2ea0', '#ffe14d', '#ff4fd8', 1.00, 1.2],
  [0.86, '#24004d', '#7a1560', '#ff5f3c', '#ff9de2', '#fff06e', 1.10, 0.8],
  [0.93, '#40507e', '#f2b56b', '#ffb86b', '#ffd9a0', '#fff3d9', 0.22, 0.0],
  [1.00, '#05070d', '#0b1322', '#14405a', '#e8a54a', '#ffd9a0', 0.18, 0.9],
].map(s => [s[0], hex(s[1]), hex(s[2]), hex(s[3]), hex(s[4]), hex(s[5]), s[6], s[7]]);
// энергия (музыка + визуальный накал) по времени ночи — тоже замкнута
const ESTOPS = [[0, .13], [.24, .34], [.5, .6], [.76, .9], [.86, 1.0], [.93, .3], [1, .13]];

function sampleStops(stops, t) {
  let i = 0;
  while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
  const a = stops[i], b = stops[i + 1];
  const k = sstep((t - a[0]) / (b[0] - a[0] || 1));
  return { a, b, k };
}
function palette(t) {
  const { a, b, k } = sampleStops(STOPS, t);
  return {
    skyA: mix3(a[1], b[1], k), skyB: mix3(a[2], b[2], k),
    aur: mix3(a[3], b[3], k), tint: mix3(a[4], b[4], k), mote: mix3(a[5], b[5], k),
    aurI: lerp(a[6], b[6], k), stars: lerp(a[7], b[7], k),
  };
}
function energyAt(t) {
  const { a, b, k } = sampleStops(ESTOPS, t);
  return lerp(a[1], b[1], k);
}
// ---------- слова, которые ловишь ----------
// Пять ярусов ночи, по ярусу на стадию. Фразы живут парами языков и
// опознаются устойчивым ключом (t<ярус>_<номер>): созвездие помнит именно
// ключи, оттого смена языка не гасит ни одной звезды.
const PH = {
  ru: [
    [ // тихая ночь
      'молоко сбежало тому три дня',
      'свет в коридоре оставлен понапрасну',
      'завтра — оно уже сегодня',
      'подушка холодна с обеих сторон',
      'сон стоит на остановке, да не садится',
      'в доме насупротив тоже не спят',
      'чайник остыл, а я и не приметил',
      'тишина слегка звенит',
    ],
    [ // вторая ночь
      'корабли ходят по небу',
      'потолок дышит — сие нормально',
      'четыре утра — место, а не время',
      'звёзды суть дырки от кнопок',
      'все города ныне плывут',
      'глаза закрываются в обратную сторону',
      'батарея на девяти процентах, и я с нею заодно',
      'мысли ходят кругами, ровно вентилятор',
      'я — малый шар света',
      'нить дрожит, но держит',
    ],
    [ // третья ночь
      'СЕРДЦЕ СТУЧИТ, КАК БАСЫ',
      'громче. ещё громче, сударь',
      'я выпил свет из холодильника',
      'кожа помнит все песни до единой',
      'время идёт рябью',
      'я — антенна для чужих сигналов',
      'ночь пахнет клубничной газировкою',
      'НЕ СПИ НЕ СПИ НЕ СПИ',
      'искры помнят дорогу домой',
      'я свечусь — стало быть, я есть',
    ],
    [ // шторм
      'ВСЁ СВЕТИТСЯ ИЗНУТРИ',
      'Я НЕ УСТАЛ, Я БЕСКОНЕЧЕН',
      'НЕБО ТРЕЩИТ ПО ШВАМ',
      'ДЕРЖИСЬ ЗА СВЕТ',
      'ЕЩЁ ЧУТЬ-ЧУТЬ, СУДАРЬ',
      'МЫ ПОЧТИ НА МЕСТЕ',
    ],
    [ // рассвет
      'тише. уж почти',
      'корабли дошли до пристаней своих',
      'свет прощает всякого',
      'дозволено закрыть глаза',
    ],
  ],
  en: [
    [
      'the milk boiled over three days past',
      'the hallway light was left on for nothing',
      'tomorrow is already today',
      'the pillow is cold on both sides',
      'sleep waits at the stop and will not board',
      'in the house opposite they are not sleeping either',
      'the kettle went cold and I never noticed',
      'the silence rings a little',
    ],
    [
      'ships sail across the sky',
      'the ceiling breathes — this is normal',
      'four in the morning is a place, not a time',
      'the stars are but pinholes',
      'every city is adrift tonight',
      'my eyes are closing the other way',
      'the battery is at nine percent, and so am I',
      'thoughts go round like a fan',
      'I am a small sphere of light',
      'the thread trembles, yet holds',
    ],
    [
      'MY HEART KNOCKS LIKE THE BASS',
      'louder. louder still, good sir',
      'I drank the light out of the fridge',
      'my skin remembers every song',
      'time is moving in ripples',
      'I am an antenna for other men\'s signals',
      'the night smells of strawberry soda',
      'DO NOT SLEEP DO NOT SLEEP DO NOT SLEEP',
      'the sparks remember the way home',
      'I glow, therefore I am',
    ],
    [
      'EVERYTHING GLOWS FROM WITHIN',
      'I AM NOT TIRED, I AM ENDLESS',
      'THE SKY IS SPLITTING AT THE SEAMS',
      'HOLD ON TO THE LIGHT',
      'A LITTLE LONGER, GOOD SIR',
      'WE ARE ALMOST THERE',
    ],
    [
      'hush. almost now',
      'the ships have reached their piers',
      'the light forgives everyone',
      'you are permitted to close your eyes',
    ],
  ],
};
// фраза, что мыслями не ловится вовсе, — её добывают делом
const DEEDS = {
  ru: ['КОРАБЛЬ-КОШМАР ПОШЁЛ КО ДНУ'],
  en: ['THE NIGHTMARE SHIP HAS GONE DOWN'],
};
function phrases() { return PH[LANG] || PH.ru; }
function deeds() { return DEEDS[LANG] || DEEDS.ru; }
function phraseTier(t) {
  if (t < .214) return 0; if (t < .43) return 1; if (t < .714) return 2; if (t < .857) return 3; return 4;
}

// ============================================================
// АУДИО: генеративный движок. Пады → бит → суперсоу → шторм → шкатулка.
// ============================================================
const CHORDS_NIGHT = [ // Am9 · Fmaj7 · Cadd9 · Gmaj7
  [57, 60, 64, 71], [53, 57, 60, 64], [48, 52, 55, 62], [55, 59, 62, 66],
];
const CHORDS_DAWN = [ // A · E · F#m7 · D — мажорное утро
  [57, 61, 64, 68], [52, 56, 59, 64], [54, 57, 61, 64], [50, 54, 57, 61],
];
const PENT = [69, 72, 74, 76, 79, 81, 84, 88]; // ля-минорная пентатоника вверх

const A = {
  ctx: null, started: false, energy: 0, dawnMode: false,
  next: 0, step: 0, bar: 0, bpm: 100,
  chordVoices: [], leadPrev: 440, leadPat: [],
  kickQueue: [], // таймстемпы киков — визуал качается от них
  master: null, sc: null, drums: null, verbSend: null, lp: null,
};

function aNode() { return A.ctx; }

function makeNoiseBuffer(ctx, sec) {
  const buf = ctx.createBuffer(1, Math.max(1, (sec * ctx.sampleRate) | 0), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function audioInit() {
  if (A.started) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  A.ctx = ctx;

  A.master = ctx.createGain(); A.master.gain.value = 0.85;
  A.lp = ctx.createBiquadFilter(); A.lp.type = 'lowpass'; A.lp.frequency.value = 19000; A.lp.Q.value = 0.4;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 18; comp.ratio.value = 5;
  comp.attack.value = 0.004; comp.release.value = 0.24;
  A.master.connect(A.lp); A.lp.connect(comp); comp.connect(ctx.destination);

  // две шины громкости: музыка и звуки — их ползунки живут в настройках
  A.musicBus = ctx.createGain(); A.musicBus.connect(A.master);
  A.sfxBus = ctx.createGain(); A.sfxBus.connect(A.master);
  // сайдчейн-шина: пады и бас «дышат» под кик
  A.sc = ctx.createGain(); A.sc.connect(A.musicBus);
  A.drums = ctx.createGain(); A.drums.connect(A.musicBus);

  // дешёвый generated-реверб
  const verb = ctx.createConvolver();
  const vlen = 2.2, vbuf = ctx.createBuffer(2, (vlen * ctx.sampleRate) | 0, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = vbuf.getChannelData(ch);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.6);
  }
  verb.buffer = vbuf;
  const vg = ctx.createGain(); vg.gain.value = 0.55;
  A.verbSend = ctx.createGain(); A.verbSend.gain.value = 1;
  A.verbSend.connect(verb); verb.connect(vg); vg.connect(A.master);

  A.noise = makeNoiseBuffer(ctx, 1);

  // восьмушечное эхо для лида и звона мыслей
  A.dly = ctx.createDelay(1.5); A.dly.delayTime.value = 0.28;
  const fb = ctx.createGain(); fb.gain.value = 0.34;
  const fLp = ctx.createBiquadFilter(); fLp.type = 'lowpass'; fLp.frequency.value = 3400;
  A.dly.connect(fLp); fLp.connect(fb); fb.connect(A.dly);
  const dlyOut = ctx.createGain(); dlyOut.gain.value = 0.5;
  A.dly.connect(dlyOut); dlyOut.connect(A.master);
  A.dlySend = ctx.createGain(); A.dlySend.gain.value = 1; A.dlySend.connect(A.dly);

  // дыхание ветра — тихий фильтрованный шум, живёт с энергией и перегревом
  const wSrc = ctx.createBufferSource(); wSrc.buffer = makeNoiseBuffer(ctx, 3); wSrc.loop = true;
  const wLp = ctx.createBiquadFilter(); wLp.type = 'lowpass'; wLp.frequency.value = 420; wLp.Q.value = 0.6;
  A.windGain = ctx.createGain(); A.windGain.gain.value = 0.012;
  wSrc.connect(wLp); wLp.connect(A.windGain); A.windGain.connect(A.musicBus);
  wSrc.start();

  A.next = ctx.currentTime + 0.1;
  A.step = 0; A.bar = 0; A.started = true;
  applyAudioSet();
  setInterval(schedulerTick, 25);
}

function panOut(g, worldX, amt) {
  // привязка звука к месту на экране
  const ctx = A.ctx;
  if (worldX === undefined || !ctx.createStereoPanner) { g.connect(A.sfxBus); return; }
  const p = ctx.createStereoPanner();
  p.pan.value = clamp((worldX - cam.x) / (W * 0.6), -1, 1) * (amt || 0.7);
  g.connect(p); p.connect(A.sfxBus);
}

function schedulerTick() {
  if (!A.started || A.ctx.state !== 'running') return;
  while (A.next < A.ctx.currentTime + 0.14) {
    scheduleStep(A.step, A.next);
    A.bpm = A.dawnMode ? 78 : 96 + A.energy * 48;
    A.next += 60 / A.bpm / 4;
    A.step++;
    if (A.step % 16 === 0) A.bar++;
  }
}

function scheduleStep(s, t) {
  const e = A.energy, st = s % 16;
  if (st === 0) {
    playChord(t);
    if (!A.dawnMode) regenLeadPattern();
  }
  if (A.dawnMode) { // музыкальная шкатулка
    if (st % 3 === 0 && Math.random() < 0.7) musicBox(t);
    return;
  }
  // кик
  if (e > 0.28 && (st % 4 === 0 || (e > 0.82 && st === 14))) kick(t);
  // хэты
  if (e > 0.38) {
    if (st % 2 === 1 && Math.random() < 0.35 + e * 0.5) hat(t, false);
    if (st % 4 === 3 && e > 0.55 && Math.random() < 0.4) hat(t, true);
    if (e > 0.78 && Math.random() < (e - 0.78) * 2.2) { // гиперпоп-роллы
      const d = 60 / A.bpm / 8;
      hat(t, false); hat(t + d, false);
      if (e > 0.9) hat(t + d * 0.5, false);
    }
  }
  // саб-бас
  if (e > 0.32 && (st === 0 || st === 6 || st === 10)) sub(t);
  // суперсоу-лид
  if (e > 0.55 && A.leadPat[st] >= 0) lead(t, PENT[A.leadPat[st]]);
}

function regenLeadPattern() {
  A.leadPat = new Array(16).fill(-1);
  let idx = (Math.random() * 4) | 0;
  for (let i = 0; i < 16; i += 2) {
    if (Math.random() < 0.55) {
      A.leadPat[i] = idx;
      idx = clamp(idx + ((Math.random() * 5) | 0) - 2, 0, PENT.length - 1);
      if (Math.random() < 0.18 && i + 1 < 16) A.leadPat[i + 1] = clamp(idx + 2, 0, PENT.length - 1);
    }
  }
}

function playChord(t) {
  const ctx = A.ctx;
  // отпустить прошлый аккорд
  for (const v of A.chordVoices) {
    v.g.gain.cancelScheduledValues(t);
    v.g.gain.setTargetAtTime(0, t, 0.5);
    v.oscs.forEach(o => { try { o.stop(t + 2.5); } catch (_) {} });
  }
  A.chordVoices = [];
  const chords = A.dawnMode ? CHORDS_DAWN : CHORDS_NIGHT;
  const chord = chords[A.bar % chords.length];
  const e = A.energy;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = 360 + e * e * 5200; filt.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.value = 0;
  g.gain.setTargetAtTime(A.dawnMode ? 0.05 : 0.075, t, 0.6);
  filt.connect(g); g.connect(A.sc);
  const send = ctx.createGain(); send.gain.value = 0.5; g.connect(send); send.connect(A.verbSend);
  const oscs = [];
  const lfo = ctx.createOscillator(); lfo.frequency.value = 0.6 + rand(0.3);
  const lfoG = ctx.createGain(); lfoG.gain.value = 3.5;
  lfo.connect(lfoG); lfo.start(t);
  for (const m of chord) {
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = e > 0.5 && !A.dawnMode ? 'sawtooth' : 'triangle';
      o.frequency.value = m2f(m); o.detune.value = det + rand(-3, 3);
      lfoG.connect(o.detune);
      o.connect(filt); o.start(t); oscs.push(o);
    }
  }
  oscs.push(lfo);
  A.chordVoices.push({ g, oscs });
}

function kick(t) {
  const ctx = A.ctx;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, t);
  o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
  g.gain.setValueAtTime(0.9, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  o.connect(g); g.connect(A.drums); o.start(t); o.stop(t + 0.32);
  const cl = ctx.createBufferSource(); cl.buffer = A.noise;
  const clHp = ctx.createBiquadFilter(); clHp.type = 'highpass'; clHp.frequency.value = 3000;
  const clG = ctx.createGain();
  clG.gain.setValueAtTime(0.18, t);
  clG.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
  cl.connect(clHp); clHp.connect(clG); clG.connect(A.drums);
  cl.start(t); cl.stop(t + 0.03);
  // сайдчейн-провал
  A.sc.gain.cancelScheduledValues(t);
  A.sc.gain.setValueAtTime(A.sc.gain.value, t);
  A.sc.gain.linearRampToValueAtTime(0.25, t + 0.015);
  A.sc.gain.setTargetAtTime(1, t + 0.05, 0.09);
  A.kickQueue.push(t);
  if (A.kickQueue.length > 12) A.kickQueue.shift();
}

function hat(t, open) {
  const ctx = A.ctx;
  const src = ctx.createBufferSource(); src.buffer = A.noise;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 8200;
  const g = ctx.createGain();
  const dur = open ? 0.22 : 0.045;
  g.gain.setValueAtTime(0.16, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(hp); hp.connect(g); g.connect(A.drums);
  src.start(t); src.stop(t + dur + 0.02);
}

function sub(t) {
  const ctx = A.ctx;
  const chords = A.dawnMode ? CHORDS_DAWN : CHORDS_NIGHT;
  const root = chords[A.bar % chords.length][0] - 24;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = m2f(root);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.32, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  o.connect(g); g.connect(A.sc); o.start(t); o.stop(t + 0.45);
}

function lead(t, midi) {
  const ctx = A.ctx, f = m2f(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.085, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 320;
  hp.connect(g); g.connect(A.musicBus);
  const send = ctx.createGain(); send.gain.value = 0.8; g.connect(send); send.connect(A.verbSend);
  if (A.dlySend) { const ds = ctx.createGain(); ds.gain.value = 0.4; g.connect(ds); ds.connect(A.dlySend); }
  for (const det of [-11, 0, 12]) { // суперсоу с глайдом
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.detune.value = det;
    o.frequency.setValueAtTime(A.leadPrev, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.055);
    o.connect(hp); o.start(t); o.stop(t + 0.4);
  }
  A.leadPrev = f;
}

function sfxCollect(combo, worldX) {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const midi = PENT[combo % PENT.length] + (combo >= PENT.length ? 12 : 0);
  const f = m2f(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  panOut(g, worldX);
  if (A.dlySend) { const ds = ctx.createGain(); ds.gain.value = 0.3; g.connect(ds); ds.connect(A.dlySend); }
  const send = ctx.createGain(); send.gain.value = 1.2; g.connect(send); send.connect(A.verbSend);
  const o1 = ctx.createOscillator(); o1.type = 'triangle'; o1.frequency.value = f;
  const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = f * 2.005;
  const g2 = ctx.createGain(); g2.gain.value = 0.35;
  o1.connect(g); o2.connect(g2); g2.connect(g);
  o1.start(t); o2.start(t); o1.stop(t + 0.65); o2.stop(t + 0.65);
}

function sfxWind() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = A.noise; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.8;
  bp.frequency.setValueAtTime(420, t);
  bp.frequency.exponentialRampToValueAtTime(2400, t + 1.4);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.16, t + 0.5);
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
  src.connect(bp); bp.connect(g); g.connect(A.sfxBus);
  const send = ctx.createGain(); send.gain.value = 1; g.connect(send); send.connect(A.verbSend);
  src.start(t); src.stop(t + 1.9);
}

function sfxCrash() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(130, t);
  o.frequency.exponentialRampToValueAtTime(28, t + 0.5);
  g.gain.setValueAtTime(0.55, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
  o.connect(g); g.connect(A.sfxBus); o.start(t); o.stop(t + 0.75);
  const src = ctx.createBufferSource(); src.buffer = A.noise;
  const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  src.connect(lp2); lp2.connect(ng); ng.connect(A.sfxBus);
  src.start(t); src.stop(t + 0.45);
}

function sfxRiser() { // вход в шторм
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = A.noise; src.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 2;
  bp.frequency.setValueAtTime(180, t);
  bp.frequency.exponentialRampToValueAtTime(7000, t + 2.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.2, t + 2.4);
  g.gain.exponentialRampToValueAtTime(0.001, t + 3.0);
  src.connect(bp); bp.connect(g); g.connect(A.sfxBus);
  src.start(t); src.stop(t + 3.1);
}

function musicBox(t) {
  const ctx = A.ctx;
  const scale = [81, 83, 85, 88, 90, 93]; // A мажор наверху
  const f = m2f(pick(scale));
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine'; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
  o.connect(g); g.connect(A.musicBus);
  const send = ctx.createGain(); send.gain.value = 1.4; g.connect(send); send.connect(A.verbSend);
  o.start(t); o.stop(t + 1.9);
}

function audioDawn() {
  if (!A.started || A.dawnMode) return;
  A.dawnMode = true;
  const t = A.ctx.currentTime;
  A.lp.frequency.cancelScheduledValues(t);
  A.lp.frequency.setValueAtTime(A.lp.frequency.value, t);
  A.lp.frequency.exponentialRampToValueAtTime(2600, t + 3);
  A.lp.frequency.exponentialRampToValueAtTime(9000, t + 8);
}
function audioNight() { // рассвет стёк — ночь возвращается, фильтр открывается
  if (!A.started || !A.dawnMode) return;
  A.dawnMode = false;
  const t = A.ctx.currentTime;
  A.lp.frequency.cancelScheduledValues(t);
  A.lp.frequency.setValueAtTime(Math.max(200, A.lp.frequency.value), t);
  A.lp.frequency.exponentialRampToValueAtTime(19000, t + 6);
}

// ============================================================
// WEBGL: небо + постобработка поверх 2D-сцены
// ============================================================
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });

const VSH = `
attribute vec2 p; varying vec2 vUv;
void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

// низкорезный проход: градиент + небула + авроры (мягкие — апсэмпл неотличим)
const SKY_FSH = `
precision mediump float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime;
uniform vec3 uSkyA, uSkyB, uAur, uTint;
uniform float uAurI; uniform vec2 uCam;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
float fbm(vec2 p){
  float v=0., a=.5;
  for(int i=0;i<4;i++){ v+=a*noise(p); p=p*2.03+vec2(7.3,3.1); a*=.5; }
  return v;
}
void main(){
  float aspect = uRes.x/uRes.y;
  vec2 uv = vUv;
  vec2 par = uCam * 0.00006;
  float grad = pow(clamp(uv.y,0.,1.), .85);
  vec3 sky = mix(uSkyB, uSkyA, grad);
  float neb = fbm(uv*vec2(aspect,1.)*2.6 + vec2(uTime*.008, 0.) + par*4.);
  sky += uAur * neb * .1 * (.4+uAurI);
  for(int i=0;i<3;i++){
    float fi = float(i);
    float yC = .58 + fi*.11 + .06*sin(uTime*.05+fi*2.1);
    float w = fbm(vec2(uv.x*aspect*1.4 + uTime*.05*(1.+fi*.4) + par.x*10., fi*7.7));
    float band = exp(-abs(uv.y-(yC+(w-.5)*.3))*(15.-5.*w));
    vec3 acol = mix(uAur, uTint, w);
    sky += acol * band * uAurI * (.22+.1*sin(uTime*.6+fi*1.9));
  }
  gl_FragColor = vec4(sky,1.);
}`;

const FSH = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime;
uniform sampler2D uScene;
uniform vec3 uSkyA, uSkyB, uAur, uTint;
uniform float uAurI, uStars, uAberr, uGlitch, uShake, uEnergy, uDawn, uGrain;
uniform vec2 uMoonPos; uniform float uMoonR, uMoon;
uniform vec2 uCam;
uniform sampler2D uSky;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
             mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
}
// Холст заливается в текстуру как есть — без UNPACK_FLIP_Y и без
// UNPACK_PREMULTIPLY_ALPHA: эти два флага гонят пиксели через процессор и
// стоят четверти кадра. Переворот и премножение делаем здесь, даром.
vec4 scn(vec2 uv){
  vec4 c = texture2D(uScene, vec2(uv.x, 1.-uv.y));
  c.rgb *= c.a;
  return c;
}
float starLayer(vec2 uv, float n, float t){
  vec2 g=uv*n; vec2 id=floor(g); vec2 f=fract(g);
  float h=hash(id);
  vec2 sp=vec2(fract(h*13.7), fract(h*7.31))*.8+.1;
  float d=length(f-sp);
  float tw=.55+.45*sin(t*(1.+h*3.5)+h*40.);
  return smoothstep(.09,.0,d)*step(.7,h)*tw;
}
void main(){
  float aspect = uRes.x/uRes.y;
  vec2 uv = vUv;
  // дыхание экрана в шторме
  float br = 1. + sin(uTime*1.7)*.006*uEnergy*uEnergy;
  uv = (uv-.5)*br+.5;
  // тряска
  if(uShake>0.001){
    uv += (vec2(noise(vec2(uTime*40.,3.)), noise(vec2(9.,uTime*43.)))-.5)*.03*uShake;
  }
  vec2 suv = uv;
  // глитч-полосы
  if(uGlitch>0.003){
    float row = floor(suv.y*26. + floor(uTime*9.)*3.7);
    float h = hash(vec2(row, floor(uTime*9.)));
    if(h < uGlitch) suv.x += (hash(vec2(row,1.7))-.5)*.12*uGlitch*8.;
  }

  // --- небо: мягкая часть посчитана низкорезным проходом ---
  vec3 sky = texture2D(uSky, uv).rgb;
  vec2 par = uCam * 0.00006; // параллакс звёзд

  // луна / солнце
  vec2 md = (uv-uMoonPos)*vec2(aspect,1.);
  float d = length(md);
  float disc = smoothstep(uMoonR, uMoonR-.004, d);
  vec3 mcol = mix(vec3(.93,.95,1.), vec3(1.,.84,.5), uDawn);
  sky = mix(sky, mcol, disc*uMoon*.9);
  sky += mcol * exp(-d*7.) * .3 * uMoon;

  // рассветная заливка снизу
  sky = mix(sky, vec3(1.,.86,.62), uDawn * pow(1.-uv.y,1.6) * .85);
  sky += vec3(1.,.9,.7)*uDawn*.12;

  // звёзды
  vec2 sUV = uv*vec2(aspect,1.);
  float st = starLayer(sUV + par*6.,28.,uTime) + starLayer(sUV+7.7 + par*3.,64.,uTime*1.3)*.6;
  sky += vec3(.9,.93,1.)*st*uStars*(uv.y*.75+.25)*(1.-disc)*(1.-uDawn);

  // --- сцена с аберрацией (premultiplied composite) ---
  vec2 dir = suv-.5;
  vec4 c0 = scn(suv);
  float ab = uAberr;
  float r = scn(suv+dir*ab).r;
  float b = scn(suv-dir*ab).b;
  vec3 sceneRGB = vec3(r, c0.g, b);
  vec3 col = sky*(1.-c0.a) + sceneRGB;

  // мягкий блум двумя кольцами
  vec2 px = 6./uRes;
  vec3 bl = vec3(0.);
  bl += scn(suv+vec2( px.x, 0.)).rgb;
  bl += scn(suv+vec2(-px.x, 0.)).rgb;
  bl += scn(suv+vec2(0.,  px.y)).rgb;
  bl += scn(suv+vec2(0., -px.y)).rgb;
  vec3 bl2 = vec3(0.);
  bl2 += scn(suv+vec2( px.x, px.y)*1.8).rgb;
  bl2 += scn(suv+vec2(-px.x,-px.y)*1.8).rgb;
  bl2 += scn(suv+vec2( px.x,-px.y)*1.8).rgb;
  bl2 += scn(suv+vec2(-px.x, px.y)*1.8).rgb;
  col += (bl * .112 + bl2 * .073) * (.6+uEnergy);

  // зерно
  col += (hash(uv*uRes+fract(uTime)*7.)-.5)*.06*uGrain*(.5+uEnergy);

  // насыщенность растёт с энергией
  float l = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(l), col, 1. + uEnergy*.4);

  // сплит-тонирование: тени чуть холоднее, света чуть теплее
  float l2 = dot(col, vec3(.299,.587,.114));
  col += (1.-smoothstep(0., .45, l2)) * vec3(-.010, .004, .028);
  col += smoothstep(.55, 1., l2) * vec3(.026, .012, -.008);

  // виньетка
  float v = smoothstep(1.25,.3, length((uv-.5)*vec2(1.15,1.))*1.5);
  col *= mix(.72,1.,v);

  gl_FragColor = vec4(col,1.);
}`;

function makeShader(type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
  return s;
}
function makeProgram(fsh) {
  const pr = gl.createProgram();
  gl.attachShader(pr, makeShader(gl.VERTEX_SHADER, VSH));
  gl.attachShader(pr, makeShader(gl.FRAGMENT_SHADER, fsh));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
  return pr;
}
const prog = makeProgram(FSH);
const skyProg = makeProgram(SKY_FSH);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
for (const pr of [prog, skyProg]) {
  const lp = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(lp);
  gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 0, 0);
}

const U = {}, SU = {};
gl.useProgram(prog);
for (const n of ['uRes', 'uTime', 'uScene', 'uSky', 'uSkyA', 'uSkyB', 'uAur', 'uTint', 'uAurI', 'uStars',
  'uAberr', 'uGlitch', 'uShake', 'uEnergy', 'uDawn', 'uGrain', 'uMoonPos', 'uMoonR', 'uMoon', 'uCam'])
  U[n] = gl.getUniformLocation(prog, n);
gl.useProgram(skyProg);
for (const n of ['uRes', 'uTime', 'uSkyA', 'uSkyB', 'uAur', 'uTint', 'uAurI', 'uCam'])
  SU[n] = gl.getUniformLocation(skyProg, n);

function makeTex(filter) {
  const t = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
const sceneTex = makeTex(gl.LINEAR);
const skyTex = makeTex(gl.LINEAR);
const skyFbo = gl.createFramebuffer();
let sceneTexW = 0, sceneTexH = 0, skyW = 0, skyH = 0;

function allocGlTextures() {
  // сцена: хранилище выделяется один раз на размер, кадры льются texSubImage2D;
  // размер сцены может быть ниже выхода — билинейный апсэмпл мягок для свечений
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, scene.width, scene.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  sceneTexW = scene.width; sceneTexH = scene.height;
  // небо: треть разрешения хватает мягким градиентам
  skyW = Math.max(64, Math.ceil(glCanvas.width * 0.35));
  skyH = Math.max(64, Math.ceil(glCanvas.height * 0.35));
  gl.bindTexture(gl.TEXTURE_2D, skyTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, skyW, skyH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, skyFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, skyTex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
gl.useProgram(prog);
gl.uniform1i(U.uScene, 0);
gl.uniform1i(U.uSky, 1);

// ============================================================
// ИГРА: бесконечная ночь. Мир без краёв, плоскость ночи сама
// вращается и кренится (изометрия живёт своей жизнью).
// ============================================================
const scene = document.createElement('canvas');
const sc = scene.getContext('2d');
// плавность — приоритет №1: выход GL в родном разрешении экрана (больше
// экран всё равно не покажет), а 2D-сцена рисуется в динамическом масштабе —
// адаптивный контроллер в frame() держит кадр лёгким
let W = 0, H = 0, DPR = 1;
let outDPR = 1;      // разрешение выхода: родное, кап 2
let outCap = 2;      // последний рубеж контроллера — снизить и выход
let sceneScale = 1;  // динамическое разрешение сцены (0.55…1)
// Потолки числа пикселей. Стоимость кадра прямо пропорциональна им: выход
// платит шейдером (блум — восемь выборок на пиксель), сцена платит дважды —
// заполнением холста и заливкой всего холста в текстуру каждый кадр. На
// больших экранах родное разрешение съедает кадр целиком, оттого потолки
// стоят всегда, а не только когда стало плохо.
let OUT_PX = 2.6e6;   // ≈ 2150×1210 — выше глаз почти не различает сквозь блум
let SCENE_PX = 1.5e6; // сцена вся из мягких свечений, ей хватает меньшего

function resize() {
  W = window.innerWidth; H = window.innerHeight;
  const area = Math.max(1, W * H);
  outDPR = Math.min(window.devicePixelRatio || 1, outCap, Math.sqrt(OUT_PX / area));
  DPR = Math.min(outDPR * sceneScale, Math.sqrt(SCENE_PX / area));
  glCanvas.width = Math.max(2, (W * outDPR) | 0); glCanvas.height = Math.max(2, (H * outDPR) | 0);
  scene.width = Math.max(2, (W * DPR) | 0); scene.height = Math.max(2, (H * DPR) | 0);
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  allocGlTextures();
}
let resizeT = 0;
function resizeSoon(ms) { clearTimeout(resizeT); resizeT = setTimeout(resize, ms || 120); }
window.addEventListener('resize', () => resizeSoon(120));
// поворот экрана и уползающие панели Safari меняют высоту не сразу
window.addEventListener('orientationchange', () => resizeSoon(280));
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => resizeSoon(160));
resize();

const cloudSpr = document.createElement('canvas');
cloudSpr.width = 300; cloudSpr.height = 140;
{
  const g = cloudSpr.getContext('2d');
  for (let i = 0; i < 10; i++) {
    const x = 60 + Math.random() * 180, y = 50 + Math.random() * 40, r = 34 + Math.random() * 44;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(255,255,255,.028)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg;
    g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
  }
}

const IO_COL = [0.56, 0.815, 1];
// общие цвета частиц: один массив на всех — так отрисовка кладёт их одной заливкой
const COL_LAMP = [1, 0.72, 0.35], COL_HEAT = [1, 0.62, 0.3];
const COL_RIFT = [0.5, 0.25, 0.7], COL_FOE = [0.5, 0.28, 0.66];
const COL_KILL = [0.72, 0.4, 0.9], COL_HURT = [1, 0.4, 0.55];
const NIGHT_LEN = 90;

// параллакс-пыль: дальний и ближний слои для ощущения глубины
const dustFar = [], dustNear = [];
for (let i = 0; i < 46; i++) dustFar.push({
  x: Math.random() * 4000, y: Math.random() * 3000,
  r: rand(0.5, 1.3), a: rand(0.12, 0.3), tw: rand(TAU),
});
for (let i = 0; i < 13; i++) dustNear.push({
  x: Math.random() * 4000, y: Math.random() * 3000,
  r: rand(2.5, 5.5), a: rand(0.04, 0.1), tw: rand(TAU),
});
function wrapCoord(v, span) { return ((v % span) + span) % span; }

// ---------- системы бесконечной карты: луга, разломы, течения ----------
const CELL = 1400;
const zoneCache = new Map();
function hash2(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }
function zoneOfCell(gx, gy) {
  const key = gx + ',' + gy;
  if (zoneCache.has(key)) return zoneCache.get(key);
  if (zoneCache.size > 200) zoneCache.clear();
  const h = hash2(gx, gy);
  const jx = (hash2(gx + 7, gy + 3) - 0.5) * 0.5, jy = (hash2(gx + 1, gy + 9) - 0.5) * 0.5;
  const cx = (gx + 0.5 + jx) * CELL, cy = (gy + 0.5 + jy) * CELL;
  let z = null;
  if (h < 0.15) z = { type: 'meadow', x: cx, y: cy, r: 380 + hash2(gx + 2, gy) * 180, seed: h * 97 };
  else if (h < 0.27) z = { type: 'rift', x: cx, y: cy, r: 340 + hash2(gx + 4, gy) * 160, seed: h * 97 };
  else if (h < 0.40) {
    const a = hash2(gx + 5, gy + 5) * TAU;
    z = { type: 'current', x: cx, y: cy, r: 420 + hash2(gx + 6, gy) * 200, dx: Math.cos(a), dy: Math.sin(a), seed: h * 97 };
  }
  zoneCache.set(key, z);
  return z;
}
function zonesNear(x, y, rad, out) {
  out.length = 0;
  const g0x = Math.floor((x - rad) / CELL), g1x = Math.floor((x + rad) / CELL);
  const g0y = Math.floor((y - rad) / CELL), g1y = Math.floor((y + rad) / CELL);
  for (let gx = g0x; gx <= g1x; gx++) for (let gy = g0y; gy <= g1y; gy++) {
    const z = zoneOfCell(gx, gy);
    if (z) out.push(z);
  }
  return out;
}
// зону под точкой ищем обходом клеток — без промежуточного массива:
// зовётся на всякую пойманную мысль и всякий кадр
function zoneAt(x, y, type) {
  const g0x = Math.floor((x - CELL) / CELL), g1x = Math.floor((x + CELL) / CELL);
  const g0y = Math.floor((y - CELL) / CELL), g1y = Math.floor((y + CELL) / CELL);
  for (let gx = g0x; gx <= g1x; gx++) for (let gy = g0y; gy <= g1y; gy++) {
    const z = zoneOfCell(gx, gy);
    if (!z || (type && z.type !== type)) continue;
    const dx = x - z.x, dy = y - z.y;
    if (dx * dx + dy * dy < z.r * z.r) return z;
  }
  return null;
}

const DEATH_QUOTES = {
  ru: [
    'и свету случается моргнуть.',
    'кошмары и сами кого-то страшатся.',
    'погасни, отдохни — и возгорись сызнова.',
    'ночь долга, да искры упрямы.',
    'раствориться — ещё не исчезнуть.',
  ],
  en: [
    'even the light blinks now and then.',
    'nightmares are afraid of something too.',
    'go out, rest — and kindle anew.',
    'the night is long, but sparks are stubborn.',
    'to dissolve is not yet to vanish.',
  ],
};

// ---------- созвездие пойманных фраз (память между бессонницами) ----------
// всякая пойманная впервые фраза остаётся звездою на небе игрока навсегда;
// чем полнее созвездие, тем с бо́льшим наследством начинается новая ночь.
// Хранятся ключи (t2_5, d_0), а не сами строки, — созвездие переживает и
// смену языка, и любую правку списков.
const SKY_NAMES = {
  ru: ['тихая ночь', 'вторая ночь', 'третья ночь', 'буря', 'рассвет', 'добыча'],
  en: ['quiet night', 'second night', 'third night', 'the storm', 'dawn', 'deeds'],
};
function skyGroups() { return phrases().concat([deeds()]); }
function skyNames() { return SKY_NAMES[LANG] || SKY_NAMES.ru; }
function phraseKey(gi, pi) { return (gi < 5 ? 't' + gi : 'd') + '_' + pi; }
let SKY = loadSkySet();
function loadSkySet() {
  let raw = [];
  try { raw = JSON.parse(localStorage.getItem('io-noch-sky')) || []; } catch (_) { return new Set(); }
  // старые записи хранили русские строки — перевести их в ключи
  const byStr = new Map();
  PH.ru.concat([DEEDS.ru]).forEach((tier, gi) => tier.forEach((p, pi) => byStr.set(p, phraseKey(gi, pi))));
  const out = new Set();
  for (const v of raw) out.add(byStr.has(v) ? byStr.get(v) : v);
  return out;
}
function saveSky() {
  try { localStorage.setItem('io-noch-sky', JSON.stringify([...SKY])); } catch (_) {}
}
function catchKey(key) { // запись идёт лишь на новой звезде — раз в несколько ночей
  if (SKY.has(key)) return false;
  SKY.add(key); saveSky(); return true;
}
function skyTotal() { let n = 0; for (const tier of skyGroups()) n += tier.length; return n; }
function skyCaught() {
  let n = 0;
  skyGroups().forEach((tier, gi) => tier.forEach((p, pi) => { if (SKY.has(phraseKey(gi, pi))) n++; }));
  return n;
}

// искры памяти — наследство созвездия, мягкое и накопительное
const SPARKS = [
  { n: 5,  id: 'mem',  apply: r => { r.wakeMax += 10; r.wake += 10; } },
  { n: 10, id: 'warm', apply: r => r.healBonus += 1 },
  { n: 16, id: 'ring', apply: r => r.spirits++ },
  { n: 22, id: 'blink', apply: r => r.relocCd = Math.max(3, r.relocCd - 1) },
  { n: 28, id: 'reach', apply: r => r.pickupR *= 1.15 },
  { n: 34, id: 'swift', apply: r => r.speed *= 1.1 },
  { n: 0,  id: 'dawn', apply: r => r.secondWind = true },
];
function sparkNeed(s) { return s.n === 0 ? skyTotal() : s.n; }
function applySparks(r) {
  const c = skyCaught();
  for (const s of SPARKS) if (c >= sparkNeed(s)) s.apply(r);
}

// ---------- дары бессонницы (прокачка по очкам) ----------
const UPGRADES = [
  { id: 'spark',   name: 'искра-побратим', desc: 'к хороводу твоему пристаёт новый спирит', apply: r => r.spirits++ },
  { id: 'round',   name: 'широкий хоровод',    desc: 'орбита спиритов делается на треть просторней', apply: r => r.orbitR *= 1.3 },
  { id: 'spin',    name: 'неистовый хоровод',  desc: 'искры кружатся с вящей быстротою', apply: r => r.spinMul *= 1.4 },
  { id: 'tea',     name: 'настой полуночи',    desc: 'предел бодрости возрастает на 25, да и глоток тотчас', apply: r => { r.wakeMax += 25; r.wake = Math.min(r.wakeMax, r.wake + 20); } },
  { id: 'calm',    name: 'тихое горение',    desc: 'бодрость тает пятою долей медленней', apply: r => r.drainMul *= 0.8 },
  { id: 'dawn',    name: 'тёплое зарево',       desc: 'всякая мысль целит на 2 сильнее', apply: r => r.healBonus += 2 },
  { id: 'thread',  name: 'нить за горизонт',      desc: 'к кораблю возможно привязаться издалече', apply: r => r.tetherR *= 1.45 },
  { id: 'chain',   name: 'неразрывная связь',       desc: 'доколе держишься за корабль — бодрость не тает вовсе', once: true, apply: r => r.chain = true },
  { id: 'light',   name: 'попутный свет',          desc: 'свет летит пятою долей быстрее', apply: r => r.speed *= 1.2 },
  { id: 'breath',  name: 'зов мерцания',     desc: 'мерцание возвращается двумя секундами ранее', apply: r => r.relocCd = Math.max(3, r.relocCd - 2) },
  { id: 'echo',    name: 'эхо света',         desc: 'мерцание вспыхивает и разгоняет кошмаров окрест', once: true, apply: r => r.echo = true },
  { id: 'coolfl',  name: 'холодное пламя',    desc: 'свет терпит скорость дольше — перегрев наступает позже', apply: r => r.hotMul *= 1.35 },
  { id: 'flow',    name: 'узда ветров', desc: 'теченья несут тебя туда, куда сам изволишь лететь', once: true, apply: r => r.flow = true },
  { id: 'riftg',   name: 'милость разлома',      desc: 'мысли подле разломов целят вдвое', once: true, apply: r => r.riftGift = true },
  { id: 'magnet',  name: 'жадное сияние', desc: 'мысли сами льнут к теплу твоему', apply: r => r.pickupR *= 1.4 },
  { id: 'grav',    name: 'дальний зов',  desc: 'дальние мысли плывут к тебе неспешно', apply: r => r.gravity++ },
  { id: 'horizon', name: 'щедрый горизонт',   desc: 'мысли рождаются приметно чаще', apply: r => r.moteRateMul *= 0.75 },
  { id: 'feast',   name: 'пир из кошмаров',   desc: 'рассеянный кошмар, случается, оставляет мысль', apply: r => r.feast = Math.min(0.9, r.feast + 0.45) },
  { id: 'blanket', name: 'стёганая броня',    desc: 'всё ранит четвертью слабее', apply: r => r.dmgMul *= 0.75 },
  { id: 'stormh',  name: 'сердце бури',       desc: 'в ночи бурные урон тебе вдвое меньше', once: true, apply: r => r.stormHeart = true },
  { id: 'wind2',   name: 'второе дыхание',    desc: 'единожды за бессонницу смертный удар тебя не гасит', rare: true, once: true, apply: r => r.secondWind = true },
  { id: 'starf',   name: 'звёздный час',      desc: 'павшие звёзды сыплются с неба приметно чаще', apply: r => r.starRateMul *= 0.62 },
  { id: 'keen',    name: 'неугасимый рой',      desc: 'погасшая искра возгорается на треть скорее', apply: r => r.sparkCdMul *= 0.7 },
  { id: 'dew',     name: 'роса рассветная',   desc: 'всякий рассвет омывает тебя дюжиной бодрости', apply: r => r.dawnDew += 12 },
  { id: 'chreda',  name: 'долгая чреда',      desc: 'чреда мыслей держится вдвое дольше', apply: r => r.comboMul *= 1.8 },
  { id: 'zharcz',  name: 'жар чреды',         desc: 'при чреде от пяти всякая мысль дарит лишнее очко опыта', once: true, apply: r => r.comboXp = true },
  { id: 'rod',     name: 'громоотвод',        desc: 'молния тебя не ранит — напротив, бодрит', rare: true, once: true, apply: r => r.boltRod = true },
  { id: 'veil',    name: 'вуаль мерцания',    desc: 'после мерцания ночь не смеет тронуть тебя две с половиной секунды', once: true, apply: r => r.relocVeil = true },
  { id: 'zhatva',  name: 'жатва бури',        desc: 'в ночи бурные всякая мысль дарит лишнее очко опыта', once: true, apply: r => r.stormXp = true },
  { id: 'skoro',   name: 'небесный скороход', desc: 'предел скорости твоей отодвигается ввысь', apply: r => r.maxSpd += 140 },
];

// английские имена даров и искр — те же формулы, другой язык
const UP_EN = {
  spark:   ['kindred spark', 'another spirit joins your round'],
  round:   ['widening round', 'the orbit of the spirits grows a third wider'],
  spin:    ['frenzied round', 'the sparks whirl with greater speed'],
  tea:     ['midnight brew', 'wakefulness gains 25, and a sip at once'],
  calm:    ['quiet burning', 'wakefulness drains a fifth slower'],
  dawn:    ['warm afterglow', 'every thought heals 2 more'],
  thread:  ['thread past the horizon', 'a ship may be bound from farther off'],
  chain:   ['unbroken bond', 'while you hold to a ship, wakefulness does not drain at all'],
  light:   ['following light', 'the light flies a fifth faster'],
  breath:  ['call of the blink', 'the blink returns two seconds sooner'],
  echo:    ['echo of light', 'the blink flares and scatters the nightmares around'],
  coolfl:  ['cold flame', 'the light bears speed longer — it overheats later'],
  flow:    ['bridle of winds', 'the currents carry you wherever you please'],
  riftg:   ['mercy of the rift', 'thoughts near rifts heal twice over'],
  magnet:  ['greedy radiance', 'thoughts cling to your warmth'],
  grav:    ['distant call', 'far thoughts drift slowly toward you'],
  horizon: ['generous horizon', 'thoughts are born markedly more often'],
  feast:   ['feast of nightmares', 'a scattered nightmare may leave a thought behind'],
  blanket: ['quilted armour', 'all harm is a quarter weaker'],
  stormh:  ['heart of the storm', 'in storm nights harm to you is halved'],
  wind2:   ['second wind', 'once a run a mortal blow does not put you out'],
  starf:   ['hour of stars', 'fallen stars rain markedly more often'],
  keen:    ['unquenched swarm', 'a spent spark rekindles a third sooner'],
  dew:     ['dawn dew', 'every dawn washes you with a dozen wakefulness'],
  chreda:  ['long chain', 'the chain of thoughts holds twice as long'],
  zharcz:  ['heat of the chain', 'at a chain of five every thought grants an extra point'],
  rod:     ['lightning rod', 'lightning does not harm you — it rouses you'],
  veil:    ['veil of the blink', 'after a blink the night dares not touch you for two and a half seconds'],
  zhatva:  ['storm harvest', 'in storm nights every thought grants an extra point'],
  skoro:   ['sky courier', 'the limit of your speed is pushed higher'],
};
function upName(u) { const e = UP_EN[u.id]; return LANG === 'en' && e ? e[0] : u.name; }
function upDesc(u) { const e = UP_EN[u.id]; return LANG === 'en' && e ? e[1] : u.desc; }

const SPARK_TXT = {
  ru: {
    mem:   ['искра памяти',   'предел бодрости выше на 10'],
    warm:  ['искра тепла',    'всякая мысль целит на 1 сильнее'],
    ring:  ['искра хоровода', 'лишний спирит с самого начала'],
    blink: ['искра мерцания', 'мерцание возвращается секундой ранее'],
    reach: ['искра простора', 'мысли льнут к тебе охотнее'],
    swift: ['искра полёта',   'свет летит на десятую долю быстрее'],
    dawn:  ['искра рассвета', 'бессонница начинается со вторым дыханием'],
  },
  en: {
    mem:   ['spark of memory', 'the limit of wakefulness is 10 higher'],
    warm:  ['spark of warmth', 'every thought heals 1 more'],
    ring:  ['spark of the round', 'an extra spirit from the very start'],
    blink: ['spark of the blink', 'the blink returns a second sooner'],
    reach: ['spark of reach', 'thoughts cling to you more readily'],
    swift: ['spark of flight', 'the light flies a tenth faster'],
    dawn:  ['spark of dawn', 'every sleepless run begins with a second wind'],
  },
};
function sparkTxt(s) { return (SPARK_TXT[LANG] || SPARK_TXT.ru)[s.id]; }

// иконки даров — тонкий штрих в духе созвездий
const ICONS = {
  spark:   '<path d="M12 3l1.8 7.2L21 12l-7.2 1.8L12 21l-1.8-7.2L3 12l7.2-1.8z"/>',
  round:   '<circle cx="12" cy="12" r="7.5"/><circle cx="19.5" cy="12" r="1.5"/>',
  spin:    '<path d="M5.5 12a6.5 6.5 0 1 1 2 4.6"/><path d="M5 13.5l.6 3.3 3.2-.9"/>',
  tea:     '<path d="M6 10h9v3.5a4.5 4.5 0 0 1-9 0z"/><path d="M15 11h2.4a2 2 0 0 1 0 4H15"/><path d="M9 7c0-1.2 1-1.4 1-2.6M12 7c0-1.2 1-1.4 1-2.6"/>',
  calm:    '<path d="M3 12c2-4.5 4-4.5 6 0s4 4.5 6 0 4-4.5 6 0"/>',
  dawn:    '<path d="M3 17h18"/><path d="M7 17a5 5 0 0 1 10 0"/><path d="M12 6v3M5.5 9.5l1.8 1.8M18.5 9.5l-1.8 1.8"/>',
  thread:  '<path d="M4 18C8 7 14 19 20 7"/><circle cx="20" cy="6.5" r="1.6"/>',
  chain:   '<rect x="3.5" y="9" width="9" height="6" rx="3"/><rect x="11.5" y="9" width="9" height="6" rx="3"/>',
  light:   '<circle cx="15" cy="12" r="4.5"/><path d="M3 9h6M3 12h5M3 15h6"/>',
  breath:  '<path d="M12 5a7 7 0 0 1 7 7M12 8.5a3.5 3.5 0 0 1 3.5 3.5"/><circle cx="12" cy="12" r="1"/><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12M12 19a7 7 0 0 1-7-7"/>',
  echo:    '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9"/>',
  coolfl:  '<path d="M12 3c3 4 6 6 6 10a6 6 0 0 1-12 0c0-4 3-6 6-10z"/><path d="M12 10v6M9.5 13h5"/>',
  flow:    '<path d="M12 12a3 3 0 1 0 3-3 5 5 0 1 0 5 5 8 8 0 1 1-8-8"/>',
  riftg:   '<path d="M12 3l-2.5 6 3.5 2-3 5 3.5 2L11 21"/><path d="M7 12h2M15 11h2"/>',
  magnet:  '<path d="M7 4v7a5 5 0 0 0 10 0V4"/><path d="M7 4h3.5v4H7M13.5 4H17v4h-3.5"/>',
  grav:    '<circle cx="12" cy="12" r="2.2"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(-24 12 12)"/>',
  horizon: '<path d="M3 15h18"/><circle cx="7" cy="8" r="1"/><circle cx="13" cy="5.5" r="1"/><circle cx="18" cy="9" r="1"/>',
  feast:   '<path d="M4 12a8 8 0 0 1 16 0c-2.6 0-2.6 2-5.3 2s-2.7-2-5.4-2-2.7 2-5.3 2z"/><circle cx="12" cy="8" r="1.2"/>',
  blanket: '<path d="M4 9c3-2.5 5-2.5 8 0s5 2.5 8 0"/><path d="M4 14c3-2.5 5-2.5 8 0s5 2.5 8 0"/><path d="M4 9v5M20 9v5"/>',
  stormh:  '<path d="M12 20s-7-4.5-7-9.5A4 4 0 0 1 12 8a4 4 0 0 1 7 2.5c0 5-7 9.5-7 9.5z"/><path d="M12.5 9.5L10.8 13h2.4l-1.7 3.2"/>',
  wind2:   '<path d="M3 9c4 0 5-3 8-3s4 3 8 3M3 15c4 0 5 3 8 3s4-3 8-3"/><path d="M12 9.5l.9 2 2 .5-2 .5-.9 2-.9-2-2-.5 2-.5z"/>',
  starf:   '<path d="M4 4l9 9"/><path d="M15 12l1.2 3 3 1.2-3 1.2-1.2 3-1.2-3-3-1.2 3-1.2z"/>',
  keen:    '<path d="M13 3l-2 6.5 4 1.5-6 10 1.5-8-4-1.5z"/>',
  dew:     '<path d="M12 3.5c3.2 4.6 6 7.4 6 11a6 6 0 0 1-12 0c0-3.6 2.8-6.4 6-11z"/><path d="M9.5 14a3 3 0 0 0 2 2.6"/>',
  chreda:  '<circle cx="5" cy="18" r="1.6"/><circle cx="11" cy="13" r="1.6"/><circle cx="17" cy="8" r="1.6"/><path d="M6.2 16.9l3.5-2.8M12.2 11.9l3.5-2.8"/>',
  zharcz:  '<circle cx="6" cy="18" r="1.4"/><circle cx="11" cy="16" r="1.4"/><path d="M17 3c2.4 3.2 4 5.2 4 8a4.5 4.5 0 1 1-9 0c0-2.8 2.6-4.8 5-8z"/>',
  rod:     '<path d="M12 3L9.5 9.5h3L10 16"/><path d="M4 20h16M8 17.5L4 20M16 17.5l4 2.5"/>',
  veil:    '<path d="M4 5c2 3 4 4.5 8 4.5S18 8 20 5"/><path d="M6 8.5c-.6 2.8-.4 6 .4 9M12 9.5c-.2 3 0 6.5.4 9M18 8.5c.6 2.8.4 6-.4 9"/>',
  zhatva:  '<path d="M13 3l-2 6 3.5 1.5L9 20l1.5-7L7 11.5z"/><circle cx="17.5" cy="16.5" r="2.5"/>',
  skoro:   '<path d="M5 6l6 6-6 6M12 6l6 6-6 6"/>',
};

function newRun() {
  const r = {
    night: 1, wake: 100, wakeMax: 100,
    level: 1, xp: 0, xpNext: 8,
    spirits: 3, orbitR: 52, spinMul: 1, pickupR: 48, speed: 1, dmgMul: 1,
    drainMul: 1, healBonus: 0, relocCd: 8, tetherR: 240,
    secondWind: false, echo: false, chain: false, stormHeart: false,
    feast: 0, gravity: 0, moteRateMul: 1,
    hotMul: 1, flow: false, riftGift: false,
    sparkCdMul: 1, comboMul: 1, comboXp: false, boltRod: false,
    relocVeil: false, stormXp: false, maxSpd: 900, starRateMul: 1, dawnDew: 0,
    kills: 0, thoughts: 0, comboBest: 0, dist: 0, bosses: 0, newStars: 0, taken: [], offerHist: [],
  };
  applySparks(r); // наследство созвездия
  return r;
}
let RUN = newRun();

const S = {
  mode: 'title', t: 0, time: 0, playT: 0, paused: false,
  combo: 0, comboT: 0,
  shake: 0, glitch: 0,
  hurtT: 0, stormFired: false, dawnFired: false, bossDone: false,
  reachShip: null, tetherHinted: false, strain: 0,
  pal: palette(0), energy: 0.13,
};
function isStormNight() { return RUN.night % 3 === 0; }
function difficulty() { return Math.min(9, S.playT / 70 + (RUN.night - 1) * 0.35); }

// ---------- камера и живая изометрия ----------
const cam = { x: 0, y: 0 };
const view = { rot: 0, tilt: 0.85, cos: 1, sin: 0 };

function updateView() {
  // чистое 2D: без вращения и качания — управление всегда честное.
  // объём даёт фиксированный лёгкий наклон + глубинный масштаб + параллакс.
  view.rot = 0; view.cos = 1; view.sin = 0;
  view.tilt = 0.9;
}
// Плоскость игры не вращается (решено в v2.1), оттого проекция — сдвиг,
// наклон по вертикали и глубинный масштаб. Объект выдаётся из кольцевого
// запаса: в кадре таких вызовов тысячи, и мусорить ими нельзя.
const _projRing = [];
for (let i = 0; i < 64; i++) _projRing.push({ x: 0, y: 0, k: 1 });
let _projI = 0;
function proj(x, y) {
  const dy = y - cam.y;
  const p = _projRing[_projI = (_projI + 1) & 63];
  p.x = W / 2 + (x - cam.x);
  p.y = H / 2 + dy * view.tilt;
  const k = 1 + dy * 0.00028;
  p.k = k < 0.78 ? 0.78 : k > 1.28 ? 1.28 : k;
  return p;
}
const _pw = { x: 0, y: 0 };
function pointerWorld() {
  _pw.x = cam.x + pointer.x - W / 2;
  _pw.y = cam.y + (pointer.y - H / 2) / view.tilt;
  return _pw;
}
function spawnRing(rMin, rMax) {
  const a = rand(TAU), d = rand(rMin, rMax);
  return { x: cam.x + Math.cos(a) * d, y: cam.y + Math.sin(a) * d };
}
function viewR() { return hyp(W, H) * 0.55; }

const visZones = []; // зоны вокруг камеры, раз в кадр (массив переиспользуется)
const io = {
  x: 0, y: 0, vx: 0, vy: 0, trail: [], heat: 0,
  spirits: [],
  reloc: { phase: 'idle', timer: 0, cd: 0, rx: 0, ry: 0 },
  oc: false, tether: null,
};
const pointer = { x: 0, y: 0, active: false };
let steerTX = 0, steerTY = 0; // куда правит игрок — по этому уходит швырок с нити
const keys = {};
let motes = [], ships = [], enemies = [], bolts = [], parts = [], texts = [], shots = [], clouds = [], stars = [], webs = [];
let moteTimer = 0, shipTimer = 4, shotTimer = 3, eTimer = 3, boltTimer = 8, starTimer = 18;
// волны: ночь временами накатывает всей толпой, потом отпускает
const WAVE = { n: 0, timer: 40, active: false, left: 0, spawnT: 0, theme: null };
// корабль-кошмар: всякая пятая ночь приводит его из-за края неба
let boss = null, anchors = [];
const BOSS_S = 2.4;                     // во сколько крат он больше доброго корабля
function bossLamp(b) {                  // фонарь-сердце на носу — единственное уязвимое место
  return { x: b.x + b.dir * 100 * BOSS_S, y: b.y - 14 * BOSS_S };
}

function syncSpirits() {
  while (io.spirits.length < RUN.spirits) io.spirits.push({ ang: rand(TAU), cd: 0 });
}

function resetWorld(attract) {
  motes = []; ships = []; enemies = []; bolts = []; parts = []; texts = []; shots = []; stars = [];
  clouds = [];
  io.heat = 0; starTimer = 18;
  for (let i = 0; i < 6; i++) clouds.push({
    x: rand(W + 600), y: rand(H * 0.1, H * 0.9), s: rand(0.8, 2.2), v: rand(4, 12), a: rand(0.25, 0.6),
  });
  io.x = 0; io.y = 0; io.vx = 0; io.vy = 0; io.trail = [];
  io.reloc = { phase: 'idle', timer: 0, cd: 0, rx: 0, ry: 0 };
  io.tether = null; io.oc = false;
  cam.x = 0; cam.y = 0;
  syncSpirits();
  pointer.x = W * 0.5; pointer.y = H * 0.45;
  S.t = 0; S.playT = 0; S.combo = 0; S.hurtT = 0; S.shake = 0; S.glitch = 0; S.stormFired = false; S.dawnFired = false;
  webs = [];
  S.reachShip = null; S.tetherHinted = false;
  boss = null; anchors = []; S.bossDone = false;
  bossHud.classList.remove('on');
  WAVE.n = 0; WAVE.timer = 40; WAVE.active = false; WAVE.left = 0;
  moteTimer = 0.5; shipTimer = attract ? 2 : 5; eTimer = attract ? 1e9 : 3; boltTimer = 9;
  if (attract) for (let i = 0; i < 7; i++) spawnMote(true);
}

// ---------- спавны ----------
function spawnMote(closeOk) {
  const p = closeOk ? spawnRing(80, viewR() * 0.8) : spawnRing(140, viewR() * 1.05);
  motes.push({
    x: p.x, y: p.y,
    vx: rand(-12, 12), vy: rand(-8, 8),
    r: rand(5, 8), seed: rand(TAU), life: 30, born: 0,
  });
}
function spawnMoteAt(x, y, life) {
  motes.push({ x, y, vx: rand(-20, 20), vy: rand(-20, 20), r: rand(5, 7), seed: rand(TAU), life: life || 14, born: 0 });
}
function spawnShip() {
  const near = Math.random() < 0.6;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const scl = near ? rand(0.85, 1.15) : rand(0.4, 0.6);
  const speed = (near ? rand(38, 66) : rand(16, 30)) * (0.7 + S.energy * 0.8);
  const p = spawnRing(viewR() + 150, viewR() + 320);
  ships.push({ x: p.x, y: p.y, vx: speed * dir, scl, near, dir, bob: rand(TAU) });
}
function spawnEnemy(type) {
  const D = difficulty();
  const p = spawnRing(viewR() + 60, viewR() + 260);
  const base = { x: p.x, y: p.y, vx: 0, vy: 0, seed: rand(TAU), type };
  // короста: к глубокой ночи кошмары обрастают бронёю и с одной искры не гаснут
  const crust = D >= 3.5 ? 2 : 1;
  if (type === 'nm') enemies.push({ ...base, r: rand(14, 22), sp: 50 + D * 11, dmg: 17, hp: crust, flashT: 0 });
  else if (type === 'shade') {
    const n = 4 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) enemies.push({
      ...base, x: p.x + rand(-60, 60), y: p.y + rand(-60, 60),
      r: rand(6, 9), sp: 100 + D * 12, dmg: 7, seed: rand(TAU), type: 'shade',
    });
  } else if (type === 'dasher') enemies.push({ ...base, r: 11, sp: 74 + D * 9, dmg: 24, st: 'seek', stT: 0, dx: 0, dy: 0 });
  else if (type === 'siren') enemies.push({ ...base, r: 16, sp: 8, dmg: 8, ringR: 150, pulse: rand(TAU) });
  else if (type === 'eater') enemies.push({ ...base, r: 12, sp: 64 + D * 8, dmg: 12, eaten: 0, hp: D >= 4.5 ? 2 : 1, flashT: 0 });
  else if (type === 'eye') enemies.push({ ...base, r: 13, sp: 30 + D * 4, dmg: 16, st: 'drift', stT: rand(2, 4), aim: 0 });
  else if (type === 'moth') {
    const n = 3 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) enemies.push({
      ...base, x: p.x + rand(-50, 50), y: p.y + rand(-50, 50),
      r: 7, sp: 115 + D * 10, dmg: 0, seed: rand(TAU), type: 'moth',
      latched: false, la: 0, stun: 0, burn: 0,
    });
  }
  else if (type === 'weaver') enemies.push({ ...base, r: 12, sp: 34, dmg: 12, webT: rand(2, 4) });
  else if (type === 'antio') enemies.push({
    ...base, r: 9, sp: 55 + D * 6, dmg: 20, hp: 3, flashT: 0,
    blinkT: rand(4, 6), orbR: 48,
    esp: [{ ang: rand(TAU), cd: 0 }, { ang: rand(TAU), cd: 0 }, { ang: rand(TAU), cd: 0 }],
  });
}
function pickEnemyType() {
  const D = difficulty();
  const table = [['nm', 3]];
  if (D >= 0.7) table.push(['shade', 2]);
  if (D >= 1.5) table.push(['dasher', 2]);
  if (D >= 2 && enemies.filter(e => e.type === 'siren').length < 2) table.push(['siren', 1]);
  if (D >= 2.5) table.push(['eater', 1.5]);
  if (D >= 0.9) table.push(['moth', 1.6]);
  if (D >= 1.2 && enemies.filter(e => e.type === 'eye').length < 2) table.push(['eye', 1.2]);
  if (D >= 1.8 && enemies.filter(e => e.type === 'weaver').length < 2) table.push(['weaver', 1]);
  // тёмный двойник — редкий, один за раз
  if (D >= 3 && !enemies.some(e => e.type === 'antio')) table.push(['antio', 0.35]);
  let sum = 0; for (const t of table) sum += t[1];
  let roll = Math.random() * sum;
  for (const t of table) { roll -= t[1]; if (roll <= 0) return t[0]; }
  return 'nm';
}
// ---------- корабль-кошмар ----------
function spawnBoss() {
  const p = spawnRing(viewR() + 260, viewR() + 420);
  const hp = 12 + Math.floor(RUN.night / 5) * 3;
  boss = {
    x: p.x, y: p.y, vx: 0, vy: 0, dir: p.x > io.x ? -1 : 1,
    hp, hpMax: hp, st: 'sail', stT: 6, cycle: 0,
    bob: rand(TAU), seed: rand(TAU), open: 0, flashT: 0,
    dropT: 2, volley: 0, volleyT: 0,
  };
  spawnText(io.x, io.y - 130, tr('bossComes'), true);
  sfxRiser();
  S.glitch = Math.max(S.glitch, 0.7);
  S.shake = Math.max(S.shake, 0.5);
  bossHud.classList.add('on');
}

function updateBoss(dt) {
  const b = boss;
  b.bob += dt;
  b.flashT = Math.max(0, b.flashT - dt);
  b.stT -= dt;
  const dx = io.x - b.x, dy = io.y - b.y, d = hyp(dx, dy) || 1;
  const lamp = bossLamp(b);

  if (b.st === 'sail') {
    // идёт на свет, роняя тени с палубы
    const want = Math.sign(d - 300);
    b.vx += (dx / d * 82 * want - b.vx) * dt * 0.9;
    b.vy += (dy / d * 82 * want - b.vy) * dt * 0.9;
    b.dropT -= dt;
    if (b.dropT <= 0 && enemies.length < 22) {
      b.dropT = rand(1.4, 2.2);
      enemies.push({
        x: b.x + rand(-120, 120), y: b.y + rand(0, 50), vx: 0, vy: rand(20, 60),
        r: rand(6, 9), sp: 100 + difficulty() * 12, dmg: 7, seed: rand(TAU), type: 'shade',
      });
    }
    if (b.stT <= 0) {
      b.cycle++;
      if (b.cycle % 2 === 1) { b.st = 'volley'; b.stT = 3.4; b.volley = 3; b.volleyT = 0.7; }
      else { b.st = 'lantern'; b.stT = 4.6; }
    }
  } else if (b.st === 'volley') {
    // залп якорями — тяжёлые, медленные, уклониться можно
    b.vx *= 0.94; b.vy *= 0.94;
    b.volleyT -= dt;
    if (b.volleyT <= 0 && b.volley > 0) {
      b.volley--; b.volleyT = 0.5;
      const a = Math.atan2(io.y - lamp.y, io.x - lamp.x) + rand(-0.07, 0.07);
      anchors.push({ x: lamp.x, y: lamp.y, vx: Math.cos(a) * 330, vy: Math.sin(a) * 330, t: 0, life: 4.5, seed: rand(TAU) });
      sfxZap(b.x);
    }
    if (b.stT <= 0) { b.st = 'sail'; b.stT = rand(5, 6.5); }
  } else { // 'lantern' — фонарь открыт: бей, покуда светит
    b.vx *= 0.9; b.vy *= 0.9;
    b.open = Math.min(1, b.open + dt * 2.5);
    if (d < 340) RUN.wake -= 3.2 * dt; // свет фонаря вытягивает бодрость
    if (Math.random() < dt * 20)
      newPart(lamp.x + rand(-20, 20), lamp.y + rand(-20, 20),
        rand(-40, 40), rand(-70, -20), rand(0.4, 0.9), COL_LAMP, rand(0.8, 2.2));
    if (b.stT <= 0) { b.st = 'sail'; b.stT = rand(5, 6.5); b.dropT = 1.2; }
  }
  if (b.st !== 'lantern') b.open = Math.max(0, b.open - dt * 2);

  b.x += b.vx * dt; b.y += b.vy * dt;
  if (Math.abs(b.vx) > 18) b.dir = b.vx < 0 ? -1 : 1;

  // искры разбивают фонарь, покуда он открыт
  if (b.open > 0.5) {
    const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
    for (const sp of io.spirits) {
      if (sp.cd > 0) continue;
      const sx = io.x + Math.cos(sp.ang) * orbR, sy = io.y + Math.sin(sp.ang) * orbR * 0.82;
      if (hyp(sx - lamp.x, sy - lamp.y) < 30) {
        sp.cd = 1.6 * RUN.sparkCdMul;
        b.hp--; b.flashT = 0.25;
        burst(lamp.x, lamp.y, [1, 0.75, 0.4], 16, 260);
        sfxKill(b.x);
        S.shake = Math.max(S.shake, 0.2);
        if (b.hp <= 0) { killBoss(); return; }
        break;
      }
    }
  }
  // борт корабля-кошмара давит — область по силуэту корпуса
  if (hyp((io.x - b.x) / 3.2, io.y - b.y) < 72) damageIo(22, b.x, b.y);
}

function killBoss() {
  const b = boss;
  boss = null; anchors = [];
  bossHud.classList.remove('on');
  RUN.bosses++;
  S.bossDone = true;
  S.shake = 1; S.glitch = 0.8;
  burst(b.x, b.y, [1, 0.8, 0.5], 70, 520);
  burst(b.x, b.y, [0.7, 0.4, 1], 50, 420);
  sfxCrash(); sfxChoice();
  for (let i = 0; i < 12; i++) spawnMoteAt(b.x + rand(-220, 220), b.y + rand(-140, 140), 26);
  for (let i = 0; i < 2; i++) {
    const p = spawnRing(160, 420);
    stars.push({ x: p.x, y: p.y, t: 0, life: 16, seed: rand(TAU) });
  }
  if (catchKey(phraseKey(5, 0))) RUN.newStars++;
  spawnText(b.x, b.y - 90, deeds()[0], true);
  RUN.xp += RUN.xpNext - RUN.xp; // добыча стоит целой степени
  levelUp();
}

function spawnBolt() {
  // молния бьёт по небу, а не по темени: место выбирается поодаль от света,
  // а предупреждение долгое — уклониться надлежит быть возможно всегда
  let x = cam.x + rand(-W * 0.45, W * 0.45);
  if (Math.abs(x - io.x) < 110) x = io.x + (x < io.x ? -1 : 1) * rand(110, 260);
  bolts.push({ x, t: 0, warn: 1.35, strike: 0.22, hitDone: false });
}
const TEXT_SS = 2; // спрайт фразы в 2× — чёткость при глубинном масштабе
const GAME_FONT = '"SAO UI", "Trebuchet MS", sans-serif'; // единый шрифт игры
const _measC = document.createElement('canvas');
const _measG = _measC.getContext('2d');
function spawnText(x, y, str, big) {
  const fs = big ? 30 : 24;
  const font = '400 ' + fs * TEXT_SS + 'px ' + GAME_FONT;
  const pad = 30 * TEXT_SS;
  _measG.font = font;
  const tw = Math.ceil(_measG.measureText(str).width);
  const mc = document.createElement('canvas');
  const mg = mc.getContext('2d');
  mc.width = tw + pad * 2; mc.height = fs * TEXT_SS + pad * 2;
  mg.font = font; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  mg.shadowColor = css3(S.pal.tint, 0.8); mg.shadowBlur = 18 * TEXT_SS;
  mg.fillStyle = big ? css3(S.pal.mote, 1) : 'rgba(235,232,225,.95)';
  mg.fillText(str, mc.width / 2, mc.height / 2);
  texts.push({ x, y, str, a: 0, t: 0, big: !!big, vy: rand(-14, -8), spr: mc });
  if (texts.length > 6) texts.shift();
}
// Частицы — самая многочисленная мелочь кадра, оттого у них свой запас
// объектов: ни одного нового за кадр, снятие обменом с хвостом.
const partPool = [];
let partCap = 420;
function newPart(x, y, vx, vy, life, col, r) {
  if (parts.length >= partCap) return null;
  const p = partPool.length ? partPool.pop() : { x: 0, y: 0, vx: 0, vy: 0, life: 0, t: 0, col: null, r: 0 };
  p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = life; p.t = 0; p.col = col; p.r = r;
  parts.push(p);
  return p;
}
function freePart(i) {
  const p = parts[i];
  parts[i] = parts[parts.length - 1];
  parts.pop();
  if (partPool.length < 700) partPool.push(p);
}
function burst(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), v = rand(30, sp || 260);
    if (!newPart(x, y, Math.cos(a) * v, Math.sin(a) * v, rand(0.4, 1.1), col, rand(1, 3))) return;
  }
}

// ---------- новые звуки ----------
function sfxZap(worldX) {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = A.noise;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  src.connect(hp); hp.connect(g); panOut(g, worldX);
  src.start(t); src.stop(t + 0.25);
  const o = ctx.createOscillator(), og = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.14);
  og.gain.setValueAtTime(0.12, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(og); og.connect(A.sfxBus); o.start(t); o.stop(t + 0.18);
}
function sfxKill(worldX) {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.28);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.connect(g); panOut(g, worldX); o.start(t); o.stop(t + 0.35);
}
function sfxHurt() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, t);
  o.frequency.exponentialRampToValueAtTime(35, t + 0.22);
  g.gain.setValueAtTime(0.34, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 700;
  o.connect(lp2); lp2.connect(g); g.connect(A.sfxBus); o.start(t); o.stop(t + 0.32);
}
function sfxReloc(back) {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(back ? 880 : 320, t);
  o.frequency.exponentialRampToValueAtTime(back ? 320 : 880, t + 0.18);
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(g); g.connect(A.sfxBus);
  const send = ctx.createGain(); send.gain.value = 1; g.connect(send); send.connect(A.verbSend);
  o.start(t); o.stop(t + 0.25);
}
function sfxChoice() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  [69, 73, 76].forEach((m, i) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = m2f(m + 12);
    const tt = t + i * 0.07;
    g.gain.setValueAtTime(0.001, tt);
    g.gain.exponentialRampToValueAtTime(0.14, tt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, tt + 0.7);
    o.connect(g); g.connect(A.sfxBus);
    const send = ctx.createGain(); send.gain.value = 1.2; g.connect(send); send.connect(A.verbSend);
    o.start(tt); o.stop(tt + 0.75);
  });
}

// ---------- ввод ----------
// На касании палец — штурвал: куда ведёшь, туда и летит свет. Цель берётся
// чуть выше самого пальца, чтобы он не закрывал искру собою; величина
// отступа живёт в настройках. Действия ушли на кнопки под большой палец —
// оттого перетаскивание больше ни с чем не спорит.
let TOUCH = matchMedia('(pointer: coarse)').matches;
let steerId = null;
function uiHit(e) {
  return !!(e.target && e.target.closest &&
    e.target.closest('#touchPad,#setBtn,#setPanel,.veil:not(.hidden)'));
}
function setPointer(e) {
  pointer.x = e.clientX; pointer.y = e.clientY;
  pointer.active = true;
}
// Невидимый джойстик: в миг касания под пальцем рождается его основание, и
// дальше важен лишь наклон — направление и сила. Тянуть палец через весь
// экран не нужно. Если палец уходит за край круга, основание ползёт следом,
// оттого стик никогда не «кончается».
const joy = { on: false, ax: 0, ay: 0, fx: 0, fy: 0, nx: 0, ny: 0, mag: 0 };
let touchSteer = false;
function joyStart(e) {
  joy.on = true; touchSteer = true;
  joy.ax = joy.fx = e.clientX; joy.ay = joy.fy = e.clientY;
  joy.nx = joy.ny = joy.mag = 0;
}
function joyMove(e) {
  joy.fx = e.clientX; joy.fy = e.clientY;
  let dx = joy.fx - joy.ax, dy = joy.fy - joy.ay;
  const R = SET.joyR, d = hyp(dx, dy);
  if (d > R) {                       // основание тянется следом за пальцем
    const back = 1 - R / d;
    joy.ax += dx * back; joy.ay += dy * back;
    dx *= R / d; dy *= R / d;
  }
  const dead = 5;
  if (d <= dead) { joy.nx = joy.ny = joy.mag = 0; return; }
  const l = hyp(dx, dy) || 1;
  joy.nx = dx / l; joy.ny = dy / l;
  joy.mag = Math.min(1, (l - dead) / Math.max(1, R - dead));
}
function joyEnd() { joy.on = false; joy.mag = 0; }
function audioUnlock() { // iOS будит звук лишь изнутри касания
  try { if (A.started && A.ctx.state === 'suspended' && !S.paused) A.ctx.resume(); } catch (_) {}
}
window.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { touchSteer = false; setPointer(e); return; }
  if (steerId === e.pointerId) joyMove(e);
}, { passive: true });
window.addEventListener('pointerdown', e => {
  if (uiHit(e)) return;
  if (e.pointerType === 'mouse') {
    touchSteer = false;
    setPointer(e);
    if (S.mode !== 'play' || S.paused) return;
    toggleTether();
    return;
  }
  audioUnlock();
  if (steerId !== null) return; // второй палец не перехватывает штурвал
  steerId = e.pointerId;
  joyStart(e);
});
for (const ev of ['pointerup', 'pointercancel']) {
  window.addEventListener(ev, e => { if (steerId === e.pointerId) { steerId = null; joyEnd(); } });
}
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (S.mode === 'level' && ['1', '2', '3'].includes(e.key)) {
    const card = document.querySelector('.dream[data-key="' + e.key + '"]');
    if (card) card.click();
    return;
  }
  if (e.key === 'Escape') {
    if (!setPanel.classList.contains('hidden')) { closeSettings(); return; }
    if (S.mode === 'play') togglePause();
  }
  if ((e.key === ' ' || e.code === 'Space') && S.mode === 'play' && !S.paused) { e.preventDefault(); tryRelocate(); }
  if (e.key === 'Shift') io.oc = true;
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
  if (e.key === 'Shift') io.oc = false;
});
const ocBtn = document.getElementById('ocBtn');
const btnTether = document.getElementById('btnTether');
const btnBlink = document.getElementById('btnBlink');
ocBtn.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  audioUnlock(); io.oc = true; ocBtn.classList.add('held');
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave'])
  ocBtn.addEventListener(ev, () => { io.oc = false; ocBtn.classList.remove('held'); });
btnTether.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  audioUnlock();
  if (S.mode === 'play' && !S.paused) toggleTether();
});
btnBlink.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  audioUnlock();
  if (S.mode === 'play' && !S.paused) tryRelocate();
});
if (TOUCH) document.body.classList.add('touch');
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.mode === 'play' && !S.paused) togglePause();
});

function togglePause() {
  S.paused = !S.paused;
  document.getElementById('pauseScreen').classList.toggle('hidden', !S.paused);
  if (A.started) { S.paused ? A.ctx.suspend() : A.ctx.resume(); }
}

// Нить — поводок и коса разом. Держась за корабль, ты волен летать в круге
// подле него, а сама нить, натянутая от света к корме, вяжет и жжёт всё,
// что её пересекает. С палубы притом сыплются мысли. Плата — круг: далеко
// от корабля не улетишь, покуда держишься. Отпустил — швырнёт вперёд.
const TETHER_LEASH = 380;   // радиус полной воли; дальше — упругая оттяжка
const TETHER_BITE = 24;     // полутолщина нити
const TETHER_BURN = 0.6;    // сколько ночи тлеть в нити до погибели
function shipInReach() {
  let best = null, bd = RUN.tetherR;
  for (const sh of ships) {
    if (!sh.near) continue;
    const d = hyp(io.x - sh.x, io.y - sh.y);
    if (d < bd) { bd = d; best = sh; }
  }
  return best;
}
function toggleTether() {
  if (io.tether) { releaseTether(); return; }
  const best = S.reachShip || shipInReach();
  if (best) {
    io.tether = best;
    best.cargoT = 1.2;
    sfxWind();
    spawnText(best.x, best.y - 70 * best.scl, tr('tether'));
  }
}
function releaseTether(snapped) {
  const sh = io.tether;
  io.tether = null;
  S.strain = 0;
  if (!sh) return;
  let dx, dy;
  if (snapped) { // лопнула — уносит прочь от корабля
    const ax = sh.x - sh.dir * 60 * sh.scl, ay = sh.y - 30 * sh.scl;
    dx = io.x - ax; dy = io.y - ay;
  } else {       // отпустил сам — швырок туда, куда правишь
    dx = steerTX - io.x; dy = steerTY - io.y;
  }
  let l = hyp(dx, dy);
  if (l < 40) { dx = sh.dir; dy = -0.2; l = hyp(dx, dy); }
  io.vx += dx / l * (snapped ? 620 : 540);
  io.vy += dy / l * (snapped ? 620 : 540);
  burst(io.x, io.y, IO_COL, 18, 260);
  sfxWind();
  spawnText(io.x, io.y - 50, tr(snapped ? 'snap' : 'sling'));
}

function echoBlast(x, y) {
  burst(x, y, IO_COL, 30, 340);
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (hyp(e.x - x, e.y - y) < 130 + e.r) {
      killEnemy(i);
    }
  }
}

function tryRelocate() {
  if (io.reloc.cd > 0 || io.reloc.phase !== 'idle') return;
  io.reloc.rx = io.x; io.reloc.ry = io.y;
  shakeOffMoths();
  burst(io.x, io.y, IO_COL, 16, 220);
  const pw = pointerWorld();
  io.x = pw.x; io.y = pw.y; io.vx = 0; io.vy = 0;
  io.trail = [];
  io.reloc.phase = 'out'; io.reloc.timer = 2.5; io.reloc.cd = RUN.relocCd;
  S.hurtT = Math.max(S.hurtT, relocGuard());
  burst(io.x, io.y, IO_COL, 16, 220);
  if (RUN.echo) echoBlast(io.x, io.y);
  sfxReloc(false);
}

// расстояние от кошмара до натянутой нити — отрезок «свет → корма»
function threadHit(e) {
  const sh = io.tether;
  if (!sh) return false;
  const bx = sh.x - sh.dir * 60 * sh.scl, by = sh.y - 30 * sh.scl;
  const vx = bx - io.x, vy = by - io.y;
  const wx = e.x - io.x, wy = e.y - io.y;
  const l2 = vx * vx + vy * vy || 1;
  let t = (wx * vx + wy * vy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const px = io.x + vx * t - e.x, py = io.y + vy * t - e.y;
  const r = TETHER_BITE + e.r;
  return px * px + py * py < r * r;
}

function killEnemy(i) {
  const e = enemies[i];
  enemies.splice(i, 1);
  RUN.kills++;
  burst(e.x, e.y, COL_KILL, 18, 260);
  sfxKill(e.x);
  if (e.type === 'eater' && e.eaten > 0) {
    for (let k = 0; k < Math.min(e.eaten, 5); k++) spawnMoteAt(e.x + rand(-30, 30), e.y + rand(-30, 30));
  } else if (Math.random() < RUN.feast) {
    spawnMoteAt(e.x, e.y);
  }
}

function damageIo(dmg, srcX, srcY) {
  if (S.hurtT > 0) return;
  let mul = RUN.dmgMul;
  if (RUN.stormHeart && isStormNight()) mul *= 0.5;
  RUN.wake -= dmg * mul;
  S.hurtT = 1.1; S.shake = Math.max(S.shake, 0.7); S.glitch = Math.max(S.glitch, 0.6);
  S.combo = 0;
  sfxHurt();
  burst(io.x, io.y, COL_HURT, 22, 320);
  if (srcX !== undefined) {
    const dx = io.x - srcX, dy = io.y - srcY, d = hyp(dx, dy) || 1;
    io.vx += dx / d * 340; io.vy += dy / d * 340;
  }
  checkDissolve();
  updateHud();
}
function checkDissolve() {
  if (RUN.wake > 0) return;
  if (RUN.secondWind) {
    RUN.secondWind = false;
    RUN.wake = 40;
    spawnText(io.x, io.y - 60, tr('secondWind'), true);
    burst(io.x, io.y, [1, 0.86, 0.5], 40, 420);
    sfxChoice();
  } else die();
}

// ---------- апдейт ----------
function update(dt) {
  const playing = S.mode === 'play';
  if (playing) {
    S.playT += dt;
    S.t += dt / NIGHT_LEN;
    if (S.t >= 1) { // ночь перетекает в следующую без остановки
      S.t -= 1;
      RUN.night++;
      S.stormFired = false; S.dawnFired = false; S.bossDone = false;
      audioNight();
      spawnText(io.x, io.y - 100, tr('nightText', RUN.night, isStormNight()), true);
    }
    if (!S.stormFired && S.t >= 0.714) { S.stormFired = true; sfxRiser(); S.glitch = Math.max(S.glitch, 0.5); }
    if (!S.dawnFired && S.t >= 0.88) { // рассвет: свет разливается и стекает в сумерки
      S.dawnFired = true;
      audioDawn();
      if (RUN.dawnDew > 0) {
        RUN.wake = Math.min(RUN.wakeMax, RUN.wake + RUN.dawnDew);
        spawnText(io.x, io.y - 60, tr('dew'), true);
        burst(io.x, io.y, [1, 0.9, 0.7], 24, 300);
      }
      spawnText(io.x, io.y - 110, tr('dawnLine'), true);
    }
  }
  S.pal = palette(S.t);
  const D = difficulty();
  S.energy = clamp(energyAt(S.t) + Math.min(0.18, D * 0.02) + (isStormNight() && playing ? 0.1 : 0), 0, 1);
  A.energy = playing ? S.energy : 0.12;
  if (A.started && A.windGain)
    A.windGain.gain.value = 0.008 + S.energy * 0.028 + io.heat * 0.07;
  updateView();
  zonesNear(cam.x, cam.y, viewR() + 300, visZones);

  const ksp = 620 * dt;
  if (!touchSteer && (keys['ArrowLeft'] || keys['ArrowRight'] || keys['ArrowUp'] || keys['ArrowDown'] ||
    keys['a'] || keys['d'] || keys['w'] || keys['s'] || keys['ф'] || keys['в'] || keys['ц'] || keys['ы']))
    pointer.active = true;
  if (keys['ArrowLeft'] || keys['a'] || keys['ф']) pointer.x -= ksp;
  if (keys['ArrowRight'] || keys['d'] || keys['в']) pointer.x += ksp;
  if (keys['ArrowUp'] || keys['w'] || keys['ц']) pointer.y -= ksp;
  if (keys['ArrowDown'] || keys['s'] || keys['ы']) pointer.y += ksp;
  pointer.x = clamp(pointer.x, 10, W - 10); pointer.y = clamp(pointer.y, 10, H - 20);

  // --- Ио ---
  if (playing) {
    // бодрость тает всегда
    const drainOff = RUN.chain && io.tether;
    if (!drainOff) RUN.wake -= (1.0 + 0.30 * Math.min(D, 8)) * RUN.drainMul * dt;

    if (io.reloc.phase === 'out') {
      io.reloc.timer -= dt;
      if (io.reloc.timer <= 0) {
        shakeOffMoths();
        burst(io.x, io.y, IO_COL, 14, 200);
        io.x = io.reloc.rx; io.y = io.reloc.ry;
        io.vx = 0; io.vy = 0; io.trail = [];
        io.reloc.phase = 'idle';
        S.hurtT = Math.max(S.hurtT, relocGuard());
        burst(io.x, io.y, IO_COL, 14, 200);
        if (RUN.echo) echoBlast(io.x, io.y);
        sfxReloc(true);
      }
    }
    io.reloc.cd = Math.max(0, io.reloc.cd - dt);

    let tx, ty, k = 7.5 * RUN.speed;
    // направление правки помним — по нему уходит швырок с нити
    if (touchSteer) {
      // цель — впереди Ио по наклону стика; чем сильнее наклон, тем дальше
      // цель, а с нею и скорость. Палец замер — Ио гасит ход и висит.
      const lead = joy.on ? 410 * joy.mag : 0;
      tx = io.x + joy.nx * lead;
      ty = io.y + joy.ny * lead / view.tilt;
      const P = proj(tx, ty);
      pointer.x = clamp(P.x, 10, W - 10);
      pointer.y = clamp(P.y, 10, H - 20);
    } else {
      const pw = pointerWorld();
      tx = pw.x; ty = pw.y;
    }
    let slowMul = 1;
    for (const e of enemies) { // сирены вяжут движение
      if (e.type === 'siren' && hyp(io.x - e.x, io.y - e.y) < e.ringR) slowMul = 0.62;
    }
    for (const wb of webs) { // паутина вяжет крепче
      if (hyp(io.x - wb.x, io.y - wb.y) < wb.r) { slowMul = Math.min(slowMul, 0.5); RUN.wake -= 2 * dt; }
    }
    if (io.tether) {
      const sh = io.tether;
      if (!ships.includes(sh)) io.tether = null;
      else {
        // цель — своя, куда правишь, туда и летишь: поводок вмешивается
        // не здесь, а после, и не стеной, а натяжением
        // с палубы сыплется добро — за то и держатся
        sh.cargoT = (sh.cargoT || 0) - dt;
        if (sh.cargoT <= 0) {
          sh.cargoT = 3.2;
          spawnMoteAt(sh.x + rand(-70, 70) * sh.scl, sh.y + 30 * sh.scl, 14);
        }
      }
    }
    steerTX = tx; steerTY = ty;   // и под нитью тоже: по этому уходит швырок
    io.vx += ((tx - io.x) * k * slowMul - io.vx * 3.4) * dt;
    io.vy += ((ty - io.y) * k * slowMul - io.vy * 3.4) * dt;

    // ветровые течения: сносят в свою сторону (или в твою — с даром)
    const cur = zoneAt(io.x, io.y, 'current');
    if (cur) {
      if (RUN.flow) {
        const l = hyp(io.vx, io.vy) || 1;
        io.vx += io.vx / l * 170 * dt; io.vy += io.vy / l * 170 * dt;
      } else {
        io.vx += cur.dx * 165 * dt; io.vy += cur.dy * 165 * dt;
      }
    }

    // перегрев: слишком быстрый свет рвёт ночь
    let spd = hyp(io.vx, io.vy);
    if (spd > RUN.maxSpd) { io.vx *= RUN.maxSpd / spd; io.vy *= RUN.maxSpd / spd; spd = RUN.maxSpd; }
    const HOT = 430 * RUN.hotMul;
    if (spd > HOT) io.heat = Math.min(1, io.heat + (spd / HOT - 1) * 2 * dt);
    else io.heat = Math.max(0, io.heat - dt * 1.2);
    if (io.heat > 0.5) {
      RUN.wake -= (io.heat - 0.5) * 5 * dt;
      if (Math.random() < dt * 14)
        newPart(io.x - io.vx * 0.06 + rand(-8, 8), io.y - io.vy * 0.06 + rand(-8, 8),
          -io.vx * 0.15 + rand(-30, 30), -io.vy * 0.15 + rand(-30, 30),
          rand(0.3, 0.7), COL_HEAT, rand(1, 2.4));
      if (io.heat > 0.85 && Math.random() < dt * 0.6) {
        // из разорванной ночи за спиной выползает тень
        const l = spd || 1;
        enemies.push({
          x: io.x - io.vx / l * 420, y: io.y - io.vy / l * 420,
          vx: 0, vy: 0, r: rand(6, 9), sp: 110 + difficulty() * 11, dmg: 6,
          seed: rand(TAU), type: 'shade',
        });
      }
    }

    io.x += io.vx * dt; io.y += io.vy * dt;
    if (io.tether) {
      // Внутри круга — полная воля. За кругом нить натягивается и тянет
      // назад тем сильнее, чем дальше ушёл, — упруго, а не стеной. Рванул
      // совсем далеко — нить лопается и швыряет вперёд. Стены нет нигде.
      const sh = io.tether;
      const ax = sh.x - sh.dir * 60 * sh.scl, ay = sh.y - 30 * sh.scl;
      const dx2 = io.x - ax, dy2 = io.y - ay, d2 = hyp(dx2, dy2) || 1;
      if (d2 > TETHER_LEASH) {
        const over = (d2 - TETHER_LEASH) / TETHER_LEASH;
        S.strain = Math.min(1, over * 2.4);
        const pull = Math.min(1, over * 2.6) * 2000;
        io.vx -= dx2 / d2 * pull * dt;
        io.vy -= dy2 / d2 * pull * dt;
        if (d2 > TETHER_LEASH * 1.5) releaseTether(true);
      } else S.strain = 0;
    } else S.strain = 0;
    RUN.dist += spd * dt;
    io.trail.unshift({ x: io.x, y: io.y });
    if (io.trail.length > 22) io.trail.pop();

    if (io.oc) {
      RUN.wake -= 3.5 * dt;
      if (RUN.wake <= 0) { RUN.wake = 1; io.oc = false; ocBtn.classList.remove('held'); }
    }
    checkDissolve();
    if (S.mode !== 'play') return; // растворился прямо сейчас

    const spinMul = (io.oc ? 2.2 : 1) * RUN.spinMul;
    for (const sp of io.spirits) {
      sp.ang += dt * 1.7 * spinMul;
      sp.cd = Math.max(0, sp.cd - dt);
    }
  }

  if (playing) { // корабль в досягаемости — подсказать единожды за бессонницу
    S.reachShip = io.tether ? null : shipInReach();
    if (S.reachShip && !S.tetherHinted && S.playT > 4) {
      S.tetherHinted = true;
      spawnText(S.reachShip.x, S.reachShip.y - 80 * S.reachShip.scl, tr('hintTether'), true);
    }
  } else S.reachShip = null;

  // камера догоняет свет
  cam.x += (io.x + io.vx * 0.4 - cam.x) * Math.min(1, dt * 2.5);
  cam.y += (io.y + io.vy * 0.4 - cam.y) * Math.min(1, dt * 2.5);

  // --- таймеры мира ---
  moteTimer -= dt;
  const moteRate = (playing ? lerp(1.3, 0.55, S.energy) : 2.4) * RUN.moteRateMul;
  if (moteTimer <= 0 && motes.length < 26) {
    // луга мыслей: рядом с лугом мысли рождаются в нём и щедрее
    const meadows = visZones.filter(z => z.type === 'meadow');
    if (meadows.length && Math.random() < 0.6) {
      const z = pick(meadows);
      const a = rand(TAU), rr = Math.sqrt(Math.random()) * z.r * 0.85;
      spawnMoteAt(z.x + Math.cos(a) * rr, z.y + Math.sin(a) * rr, 30);
      moteTimer = moteRate * 0.55;
    } else {
      spawnMote(!playing);
      moteTimer = moteRate;
    }
  }
  // упавшие звёзды — редкий подарок неба
  if (playing) {
    starTimer -= dt;
    if (starTimer <= 0 && stars.length < 2) {
      starTimer = rand(22, 40) * RUN.starRateMul;
      const p = spawnRing(220, viewR() * 0.8);
      stars.push({ x: p.x, y: p.y, t: 0, life: 14, seed: rand(TAU) });
      burst(p.x, p.y, [1, 1, 1], 20, 300);
    }
  }
  for (let i = stars.length - 1; i >= 0; i--) {
    const st = stars[i];
    st.t += dt;
    if (st.t > st.life) { stars.splice(i, 1); continue; }
    if (playing && hyp(io.x - st.x, io.y - st.y) < RUN.pickupR + 8) {
      stars.splice(i, 1);
      RUN.wake = Math.min(RUN.wakeMax, RUN.wake + 15);
      RUN.xp += 3;
      if (RUN.xp >= RUN.xpNext) levelUp();
      burst(st.x, st.y, [1, 0.95, 0.8], 30, 380);
      spawnText(st.x, st.y - 46, tr('star'), true);
      sfxChoice();
      updateHud();
    }
  }
  shipTimer -= dt;
  if (shipTimer <= 0 && ships.length < 3) { spawnShip(); shipTimer = lerp(15, 8, S.energy) * rand(0.8, 1.3); }
  shotTimer -= dt;
  if (shotTimer <= 0) {
    shotTimer = lerp(9, 2.2, S.energy) * rand(0.6, 1.5);
    shots.push({ x: rand(W * 0.2, W), y: rand(H * 0.05, H * 0.35), vx: -rand(500, 900), vy: rand(120, 260), t: 0, life: rand(0.5, 0.9) });
  }
  if (playing) {
    // --- корабль-кошмар: всякая пятая ночь ---
    if (!boss && !S.bossDone && RUN.night % 5 === 0 && S.t > 0.22 && S.t < 0.8) spawnBoss();
    if (boss && S.t >= 0.9) { // рассвет прогоняет его за край неба
      spawnText(io.x, io.y - 130, tr('bossFled'), true);
      boss = null; anchors = []; S.bossDone = true;
      bossHud.classList.remove('on');
    }
    // --- волны: ночь накатывает толпой и отступает с дарами ---
    if (!WAVE.active && !boss) {
      WAVE.timer -= dt;
      if (WAVE.timer <= 0 && S.playT > 25) {
        WAVE.active = true; WAVE.n++;
        WAVE.left = Math.min(16, 4 + WAVE.n * 2 + Math.floor(D));
        WAVE.spawnT = 0.4;
        WAVE.theme = pickEnemyType();
        spawnText(io.x, io.y - 120, tr('waveIn', WAVE.n), true);
        sfxRiser();
        S.glitch = Math.max(S.glitch, 0.4);
      }
    } else if (WAVE.left > 0) {
      WAVE.spawnT -= dt;
      if (WAVE.spawnT <= 0) {
        WAVE.spawnT = rand(0.25, 0.6);
        spawnEnemy(Math.random() < 0.65 ? WAVE.theme : pickEnemyType());
        WAVE.left--;
      }
    } else if (enemies.length <= 3) {
      WAVE.active = false;
      WAVE.timer = rand(34, 50);
      spawnText(io.x, io.y - 120, tr('waveOut'), true);
      // отлив оставляет мысли кольцом окрест
      for (let k2 = 0; k2 < 6; k2++) {
        const a2 = k2 / 6 * TAU + rand(0.5);
        spawnMoteAt(io.x + Math.cos(a2) * rand(130, 260), io.y + Math.sin(a2) * rand(110, 220), 18);
      }
      if (Math.random() < 0.5) {
        const p2 = spawnRing(220, 520);
        stars.push({ x: p2.x, y: p2.y, t: 0, life: 14, seed: rand(TAU) });
      }
      sfxChoice();
    }
    eTimer -= dt;
    const cap = Math.min(5 + D * 2.2, 20);
    if (eTimer <= 0 && enemies.length < cap && !WAVE.active && !boss) {
      // разломы: рядом с ними ночь рожает чаще и прямо из трещины
      const rifts = visZones.filter(z => z.type === 'rift');
      if (rifts.length && Math.random() < 0.6) {
        const z = pick(rifts);
        const ty = pickEnemyType();
        spawnEnemy(ty);
        const e = enemies[enemies.length - 1];
        if (e && e.type !== 'antio') {
          const a = rand(TAU), rr = rand(60, 220);
          e.x = z.x + Math.cos(a) * rr; e.y = z.y + Math.sin(a) * rr;
        }
        eTimer = lerp(2.5, 0.95, D / 9) * rand(0.5, 0.8);
      } else {
        spawnEnemy(pickEnemyType());
        eTimer = lerp(2.5, 0.95, D / 9) * rand(0.8, 1.25);
      }
    }
    if (RUN.night >= 2 || isStormNight()) {
      boltTimer -= dt;
      if (boltTimer <= 0) {
        spawnBolt();
        boltTimer = lerp(10, 3.8, D / 9) * (S.t > 0.714 ? 0.72 : 1) * rand(0.8, 1.3);
      }
    }
  }

  // --- мысли ---
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.born += dt;
    m.x += m.vx * dt; m.y += m.vy * dt;
    const dx = io.x - m.x, dy = io.y - m.y, d = hyp(dx, dy);
    if (playing && io.tether && d < 320 && d > 1) { m.x += dx / d * 200 * dt; m.y += dy / d * 200 * dt; }
    else if (playing && RUN.gravity > 0 && d < 170 * (1 + RUN.gravity * 0.4) && d > 1) {
      const f = 55 * RUN.gravity;
      m.x += dx / d * f * dt; m.y += dy / d * f * dt;
    }
    if (m.born > m.life || hyp(m.x - cam.x, m.y - cam.y) > viewR() * 2.5) { motes.splice(i, 1); continue; }
    if (playing && d < RUN.pickupR) {
      motes.splice(i, 1);
      collectMote(m);
    }
  }

  // --- корабли ---
  for (let i = ships.length - 1; i >= 0; i--) {
    const sh = ships[i];
    sh.x += sh.vx * dt; sh.bob += dt * 0.9;
    if (hyp(sh.x - cam.x, sh.y - cam.y) > viewR() * 2.4 && io.tether !== sh) { ships.splice(i, 1); continue; }
    if (Math.random() < 0.35)
      newPart(sh.x - sh.dir * 90 * sh.scl + rand(-10, 10), sh.y + rand(-6, 18) * sh.scl,
        rand(-10, 10), rand(4, 22), rand(0.6, 1.4), S.pal.tint, rand(0.6, 1.8));
    if (playing && sh.near && io.tether !== sh) {
      const dx = io.x - sh.x, dy = io.y - (sh.y + Math.sin(sh.bob) * 6);
      if (hyp(dx / 1.6, dy) < 68 * sh.scl) damageIo(12, sh.x, sh.y);
    }
  }

  // --- враги ---
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (hyp(e.x - cam.x, e.y - cam.y) > viewR() * 2.6) { enemies.splice(i, 1); continue; }
    if (playing) updateEnemy(e, dt);
    e.x += e.vx * dt; e.y += e.vy * dt;
    if (!playing) continue;
    if (e.dead) { killEnemy(i); continue; } // мотылёк сгорел в оверчардже
    // нить вяжет и жжёт всё, что её пересекает
    if (io.tether && e.type !== 'antio' && threadHit(e)) {
      const slow = Math.pow(0.12, dt);
      e.vx *= slow; e.vy *= slow;
      e.threadT = (e.threadT || 0) + dt;
      if (Math.random() < dt * 12)
        newPart(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r),
          rand(-40, 40), rand(-60, -10), rand(0.2, 0.5), IO_COL, rand(0.6, 1.6));
      if (e.threadT >= TETHER_BURN) {
        e.threadT = 0;
        if (e.hp > 1) { e.hp--; e.flashT = 0.22; burst(e.x, e.y, IO_COL, 10, 200); sfxKill(e.x); }
        else { killEnemy(i); continue; }
      }
    } else if (e.threadT) e.threadT = Math.max(0, e.threadT - dt);
    if (e.type === 'moth' && e.latched && io.tether) { // прицепившийся тоже горит на нити
      e.latched = false; e.stun = 1.6;
      e.vx = rand(-160, 160); e.vy = rand(-160, 160);
    }
    // тёмный двойник: свои правила боя
    if (e.type === 'antio') {
      if (io.tether && threadHit(e)) { // двойника нить лишь вяжет и точит вдвое дольше
        const slow = Math.pow(0.35, dt);
        e.vx *= slow; e.vy *= slow;
        e.threadT = (e.threadT || 0) + dt;
        if (e.threadT >= TETHER_BURN * 2) {
          e.threadT = 0; e.hp--; e.flashT = 0.25;
          burst(e.x, e.y, IO_COL, 12, 220); sfxKill(e.x);
          if (e.hp <= 0) {
            enemies.splice(i, 1); RUN.kills++;
            for (let k3 = 0; k3 < 4; k3++) spawnMoteAt(e.x + rand(-40, 40), e.y + rand(-40, 40), 20);
            RUN.xp += 2;
            if (RUN.xp >= RUN.xpNext) levelUp();
            burst(e.x, e.y, [0.7, 0.4, 1], 40, 420);
            spawnText(e.x, e.y - 50, tr('twinDown'), true);
            continue;
          }
        }
      }
      const orbR2 = RUN.orbitR * (io.oc ? 1.6 : 1);
      let died = false;
      for (const sp of io.spirits) {
        if (sp.cd > 0) continue;
        const sx = io.x + Math.cos(sp.ang) * orbR2;
        const sy = io.y + Math.sin(sp.ang) * orbR2 * 0.82;
        // искра об искру — обе гаснут
        let clashed = false;
        for (const esp of e.esp) {
          if (esp.cd > 0) continue;
          const ex = e.x + Math.cos(esp.ang) * e.orbR;
          const ey = e.y + Math.sin(esp.ang) * e.orbR * 0.82;
          if (hyp(sx - ex, sy - ey) < 14) {
            sp.cd = 2 * RUN.sparkCdMul; esp.cd = 2; clashed = true;
            burst((sx + ex) / 2, (sy + ey) / 2, [0.8, 0.6, 1], 10, 200);
            break;
          }
        }
        if (clashed) continue;
        // искра по ядру — двойник тускнеет
        if (hyp(sx - e.x, sy - e.y) < 12 + e.r) {
          sp.cd = 4 * RUN.sparkCdMul;
          e.hp--; e.flashT = 0.25;
          burst(e.x, e.y, [0.55, 0.25, 0.75], 14, 240);
          sfxKill(e.x);
          if (e.hp <= 0) {
            enemies.splice(i, 1);
            RUN.kills++;
            for (let k2 = 0; k2 < 4; k2++) spawnMoteAt(e.x + rand(-40, 40), e.y + rand(-40, 40), 20);
            RUN.xp += 2;
            if (RUN.xp >= RUN.xpNext) levelUp();
            burst(e.x, e.y, [0.7, 0.4, 1], 40, 420);
            spawnText(e.x, e.y - 50, tr('twinDown'), true);
            died = true;
          }
          break;
        }
      }
      if (died) continue;
      // его искры жалят Ио
      for (const esp of e.esp) {
        if (esp.cd > 0) continue;
        const ex = e.x + Math.cos(esp.ang) * e.orbR;
        const ey = e.y + Math.sin(esp.ang) * e.orbR * 0.82;
        if (hyp(ex - io.x, ey - io.y) < 18) {
          esp.cd = 2;
          damageIo(12, ex, ey);
          break;
        }
      }
      // ядро об ядро — больно, но двойник живёт
      const dd = hyp(io.x - e.x, io.y - e.y);
      if (dd < 16 + e.r) {
        damageIo(e.dmg, e.x, e.y);
        const l = dd || 1;
        e.vx -= (io.x - e.x) / l * 260; e.vy -= (io.y - e.y) / l * 260;
      }
      continue;
    }
    // спириты рассеивают
    let dead = false;
    const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
    for (const sp of io.spirits) {
      if (sp.cd > 0) continue;
      const sx = io.x + Math.cos(sp.ang) * orbR;
      const sy = io.y + Math.sin(sp.ang) * orbR * 0.82;
      if (hyp(sx - e.x, sy - e.y) < 12 + e.r) {
        sp.cd = (e.type === 'siren' ? 6 : 4) * RUN.sparkCdMul;
        if (e.hp > 1) { // короста трескается, да кошмар держится
          e.hp--; e.flashT = 0.22;
          burst(e.x, e.y, [0.7, 0.45, 0.9], 10, 200);
          sfxKill(e.x);
        } else { killEnemy(i); dead = true; }
        break;
      }
    }
    if (dead) continue;
    // контакт
    const d = hyp(io.x - e.x, io.y - e.y);
    if (d < 16 + e.r) {
      if (e.type === 'moth') { // мотылёк не ранит — прицепляется
        if (!e.latched && e.stun <= 0) {
          const latchedN = enemies.filter(x => x.type === 'moth' && x.latched).length;
          if (latchedN < 3) {
            e.latched = true; e.burn = 0;
            e.la = Math.atan2(e.y - io.y, e.x - io.x);
            burst(io.x, io.y, [0.75, 0.4, 0.85], 8, 160);
          }
        }
        continue;
      }
      const dmg = e.type === 'dasher' && e.st !== 'dash' ? 10 : e.dmg;
      damageIo(dmg, e.x, e.y);
      if (e.type !== 'siren') {
        if (e.hp > 1) { // бронированный не рассыпается от удара — лишь отлетает
          e.hp--; e.flashT = 0.22;
          const l = d || 1;
          e.vx -= (io.x - e.x) / l * 300; e.vy -= (io.y - e.y) / l * 300;
        } else { killEnemy(i); RUN.kills--; } // смерть об Ио — не в счёт рассеянных
      }
      continue;
    }
    // поле сирены сосёт бодрость
    if (e.type === 'siren' && d < e.ringR) RUN.wake -= 5 * dt;
  }
  // --- корабль-кошмар и его якоря ---
  if (boss && playing) updateBoss(dt);
  for (let i = anchors.length - 1; i >= 0; i--) {
    const an = anchors[i];
    an.t += dt;
    an.x += an.vx * dt; an.y += an.vy * dt;
    an.vx *= 0.995; an.vy *= 0.995;
    if (an.t > an.life) { anchors.splice(i, 1); continue; }
    if (!playing) continue;
    if (hyp(io.x - an.x, io.y - an.y) < 26) {
      anchors.splice(i, 1);
      damageIo(14, an.x, an.y);
      burst(an.x, an.y, [0.6, 0.35, 0.8], 18, 260);
      continue;
    }
    // искра сбивает якорь на лету
    const orbR4 = RUN.orbitR * (io.oc ? 1.6 : 1);
    for (const sp of io.spirits) {
      if (sp.cd > 0) continue;
      const sx = io.x + Math.cos(sp.ang) * orbR4, sy = io.y + Math.sin(sp.ang) * orbR4 * 0.82;
      if (hyp(sx - an.x, sy - an.y) < 18) {
        sp.cd = 1.2 * RUN.sparkCdMul;
        anchors.splice(i, 1);
        burst(an.x, an.y, [0.8, 0.6, 1], 14, 220);
        sfxKill(an.x);
        break;
      }
    }
  }
  if (playing) checkDissolve();

  // --- паутины ловца снов ---
  for (let i = webs.length - 1; i >= 0; i--) {
    const wb = webs[i];
    wb.t += dt;
    if (wb.t > wb.life || hyp(wb.x - cam.x, wb.y - cam.y) > viewR() * 2.6) { webs.splice(i, 1); continue; }
    if (!playing) continue;
    // искра рвёт паутину
    const orbR3 = RUN.orbitR * (io.oc ? 1.6 : 1);
    for (const sp of io.spirits) {
      if (sp.cd > 0) continue;
      const sx = io.x + Math.cos(sp.ang) * orbR3;
      const sy = io.y + Math.sin(sp.ang) * orbR3 * 0.82;
      if (hyp(sx - wb.x, sy - wb.y) < 26) {
        sp.cd = 2 * RUN.sparkCdMul;
        webs.splice(i, 1);
        burst(wb.x, wb.y, [0.72, 0.78, 0.9], 14, 200);
        sfxKill(wb.x);
        break;
      }
    }
  }

  // --- молнии ---
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.t += dt;
    if (b.t > b.warn && !b.hitDone) {
      b.hitDone = true;
      sfxZap(b.x);
      S.shake = Math.max(S.shake, 0.4); S.glitch = Math.max(S.glitch, 0.35);
      if (S.mode === 'play' && Math.abs(io.x - b.x) < 24) {
        if (RUN.boltRod) { // громоотвод: разряд бодрит
          RUN.wake = Math.min(RUN.wakeMax, RUN.wake + 8);
          spawnText(io.x, io.y - 60, tr('rod'), false);
          burst(io.x, io.y, [1, 0.9, 0.5], 20, 300);
        } else damageIo(12, b.x, io.y + 50);
      }
    }
    if (b.t > b.warn + b.strike) bolts.splice(i, 1);
  }

  // --- частицы, тексты, звёзды, облака ---
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98;
    if (p.t > p.life) freePart(i);
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const tx = texts[i];
    tx.t += dt; tx.y += tx.vy * dt;
    tx.a = tx.t < 0.5 ? tx.t / 0.5 : Math.max(0, 1 - (tx.t - 2.6) / 1.6);
    if (tx.t > 4.2) texts.splice(i, 1);
  }
  for (let i = shots.length - 1; i >= 0; i--) {
    const s2 = shots[i];
    s2.t += dt; s2.x += s2.vx * dt; s2.y += s2.vy * dt;
    if (s2.t > s2.life) shots.splice(i, 1);
  }
  for (const c of clouds) {
    c.x += c.v * dt * (0.5 + S.energy);
  }

  S.hurtT = Math.max(0, S.hurtT - dt);
  S.shake = Math.max(0, S.shake - dt * 1.8);
  S.glitch = Math.max(0, S.glitch - dt * 1.4);
  S.comboT -= dt;
  if (S.comboT <= 0 && S.combo > 0) { S.combo = 0; updateHud(); }

  if (A.started) {
    const now = A.ctx.currentTime;
    while (A.kickQueue.length && A.kickQueue[0] <= now) {
      A.kickQueue.shift();
      if (S.energy > 0.55) {
        S.shake = Math.max(S.shake, S.energy * 0.12);
        if (S.energy > 0.8 && Math.random() < 0.35) S.glitch = Math.max(S.glitch, 0.25);
      }
    }
  }
}

function updateEnemy(e, dt) {
  const dx = io.x - e.x, dy = io.y - e.y, d = hyp(dx, dy) || 1;
  if (e.flashT > 0) e.flashT = Math.max(0, e.flashT - dt);
  if (e.type === 'nm' || e.type === 'shade') {
    const wob = Math.sin(S.time * 1.3 + e.seed) * 40;
    e.vx += ((dx / d * e.sp + Math.cos(e.seed) * wob * 0.02) - e.vx) * dt * 1.5;
    e.vy += ((dy / d * e.sp + Math.sin(e.seed) * wob * 0.02) - e.vy) * dt * 1.5;
  } else if (e.type === 'eater') {
    let target = null, td = 600;
    for (const m of motes) {
      const md = hyp(m.x - e.x, m.y - e.y);
      if (md < td) { td = md; target = m; }
    }
    if (target) {
      const tx2 = target.x - e.x, ty2 = target.y - e.y, l = hyp(tx2, ty2) || 1;
      e.vx += (tx2 / l * e.sp - e.vx) * dt * 1.6;
      e.vy += (ty2 / l * e.sp - e.vy) * dt * 1.6;
      if (l < e.r + 8) {
        motes.splice(motes.indexOf(target), 1);
        e.eaten++; e.r = Math.min(30, e.r + 1.6);
      }
    } else {
      e.vx += (Math.cos(e.seed + S.time * 0.4) * 40 - e.vx) * dt;
      e.vy += (Math.sin(e.seed + S.time * 0.4) * 40 - e.vy) * dt;
    }
  } else if (e.type === 'siren') {
    e.vx = Math.cos(e.seed + S.time * 0.15) * e.sp;
    e.vy = Math.sin(e.seed + S.time * 0.15) * e.sp;
    e.pulse += dt * 2;
  } else if (e.type === 'antio') {
    // тёмный двойник: держится рядом, мерцает, крутит свои спириты
    const want = d - 190;
    e.vx += (dx / d * e.sp * Math.sign(want) - e.vx) * dt * 1.2;
    e.vy += (dy / d * e.sp * Math.sign(want) - e.vy) * dt * 1.2;
    for (const sp of e.esp) {
      sp.ang -= dt * 2.1; // крутится в другую сторону, чем у Ио
      sp.cd = Math.max(0, sp.cd - dt);
    }
    e.flashT = Math.max(0, e.flashT - dt);
    e.blinkT -= dt;
    if (e.blinkT <= 0) {
      e.blinkT = rand(4, 7);
      burst(e.x, e.y, [0.55, 0.25, 0.75], 16, 240);
      const a = rand(TAU), rr = rand(150, 240);
      e.x = io.x + Math.cos(a) * rr; e.y = io.y + Math.sin(a) * rr;
      e.vx = 0; e.vy = 0;
      burst(e.x, e.y, [0.55, 0.25, 0.75], 16, 240);
      sfxReloc(true);
    }
  } else if (e.type === 'eye') {
    // око бессонницы: дрейфует поодаль, целится взглядом, бьёт лучом
    e.stT -= dt;
    if (e.st === 'drift') {
      const want = d - 340;
      e.vx += (dx / d * e.sp * Math.sign(want) + Math.cos(e.seed + S.time * 0.5) * 20 - e.vx) * dt * 1.4;
      e.vy += (dy / d * e.sp * Math.sign(want) - e.vy) * dt * 1.4;
      if (e.stT <= 0 && d < 720) { e.st = 'aim'; e.stT = 0.85; }
    } else if (e.st === 'aim') {
      e.vx *= 0.9; e.vy *= 0.9;
      e.aim = Math.atan2(dy, dx); // ведёт взглядом до последнего
      if (e.stT <= 0) {
        e.st = 'fire'; e.stT = 0.28;
        sfxZap(e.x);
        S.shake = Math.max(S.shake, 0.25);
        const ux = Math.cos(e.aim), uy = Math.sin(e.aim);
        const px = io.x - e.x, py = io.y - e.y;
        const t2 = px * ux + py * uy;
        if (t2 > 0 && t2 < 760 && Math.abs(px * uy - py * ux) < 30) damageIo(e.dmg, e.x, e.y);
      }
    } else if (e.stT <= 0) { e.st = 'drift'; e.stT = rand(3.5, 5.5); }
  } else if (e.type === 'moth') {
    // мотылёк тьмы: летит на свет, прицепляется и пьёт бодрость;
    // стряхнуть — скоростью или мерцанием, сжечь — оверчарджем
    e.stun = Math.max(0, e.stun - dt);
    if (e.latched) {
      e.x = io.x + Math.cos(e.la + S.time * 1.5) * 17;
      e.y = io.y + Math.sin(e.la + S.time * 1.5) * 14;
      e.vx = 0; e.vy = 0;
      RUN.wake -= 2.6 * dt;
      if (io.oc) {
        e.burn += dt;
        if (e.burn > 0.7) e.dead = true;
      } else if (hyp(io.vx, io.vy) > 620) {
        e.latched = false; e.stun = 1.6;
        e.vx = rand(-180, 180); e.vy = rand(-180, 180);
        burst(e.x, e.y, [0.75, 0.4, 0.85], 6, 140);
      }
    } else if (e.stun > 0) { e.vx *= 0.95; e.vy *= 0.95; }
    else {
      const fl = Math.sin(S.time * 7 + e.seed) * 90;
      e.vx += ((dx / d * e.sp) + Math.cos(e.seed) * fl * 0.4 - e.vx) * dt * 2.2;
      e.vy += ((dy / d * e.sp) + Math.sin(e.seed) * fl * 0.4 - e.vy) * dt * 2.2;
    }
  } else if (e.type === 'weaver') {
    // ловец снов: бродит поодаль и ткёт паутины поперёк пути
    e.vx += (Math.cos(e.seed + S.time * 0.3) * e.sp - e.vx) * dt;
    e.vy += (Math.sin(e.seed + S.time * 0.3) * e.sp - e.vy) * dt;
    const want = d - 260;
    e.vx += dx / d * Math.sign(want) * 30 * dt;
    e.vy += dy / d * Math.sign(want) * 30 * dt;
    e.webT -= dt;
    if (e.webT <= 0 && webs.length < 6) {
      e.webT = rand(5, 8);
      webs.push({ x: e.x, y: e.y, r: 95, t: 0, life: 16, seed: rand(TAU) });
      burst(e.x, e.y, [0.65, 0.72, 0.85], 8, 120);
    }
  } else if (e.type === 'dasher') {
    e.stT += dt;
    if (e.st === 'seek') {
      const want = d - 260;
      e.vx += (dx / d * e.sp * Math.sign(want) - e.vx) * dt * 2;
      e.vy += (dy / d * e.sp * Math.sign(want) - e.vy) * dt * 2;
      if (Math.abs(want) < 60 && e.stT > 1) { e.st = 'tele'; e.stT = 0; e.dx = dx / d; e.dy = dy / d; }
    } else if (e.st === 'tele') {
      e.vx *= 0.9; e.vy *= 0.9;
      e.dx = dx / d; e.dy = dy / d; // целится до последнего
      if (e.stT > 0.7) { e.st = 'dash'; e.stT = 0; }
    } else if (e.st === 'dash') {
      e.vx = e.dx * 760; e.vy = e.dy * 760;
      if (e.stT > 0.45) { e.st = 'rest'; e.stT = 0; }
    } else { // rest
      e.vx *= 0.92; e.vy *= 0.92;
      if (e.stT > 1.2) { e.st = 'seek'; e.stT = 0; }
    }
  }
}

function collectMote(m) {
  RUN.thoughts++;
  // мысли у разломов ценнее: +1 опыта, а с даром — двойное лечение
  const nearRift = zoneAt(m.x, m.y, 'rift');
  const heal = (4 + RUN.healBonus) * (nearRift && RUN.riftGift ? 2 : 1);
  RUN.wake = Math.min(RUN.wakeMax, RUN.wake + heal);
  S.combo++; S.comboT = 3 * RUN.comboMul;
  if (S.combo > RUN.comboBest) RUN.comboBest = S.combo;
  sfxCollect(S.combo - 1, m.x);
  burst(m.x, m.y, S.pal.mote, 12, 200);
  const tier = phraseTier(S.t);
  if (RUN.thoughts === 1 || Math.random() < 0.35) {
    const list = phrases()[tier];
    const pi = (Math.random() * list.length) | 0;
    if (catchKey(phraseKey(tier, pi))) { // впервые пойманная фраза зажигает звезду навсегда
      RUN.newStars++;
      burst(m.x, m.y - 40, [1, 0.95, 0.82], 16, 240);
    }
    spawnText(m.x, m.y - 40, list[pi], tier >= 3);
  }
  let gain = nearRift ? 2 : 1;
  if (RUN.comboXp && S.combo >= 5) gain++;
  if (RUN.stormXp && isStormNight()) gain++;
  RUN.xp += gain;
  if (RUN.xp >= RUN.xpNext) levelUp();
  updateHud();
}
function relocGuard() { return RUN.relocVeil ? 2.5 : 0.6; }
function shakeOffMoths() { // мерцание сбрасывает прицепившихся мотыльков
  for (const e of enemies) {
    if (e.type === 'moth' && e.latched) {
      e.latched = false; e.stun = 2;
      e.vx = rand(-160, 160); e.vy = rand(-160, 160);
    }
  }
}

// ---------- отрисовка ----------
function draw() {
  sc.setTransform(DPR, 0, 0, DPR, 0, 0);
  sc.clearRect(0, 0, W, H);
  const pal = S.pal, tm = S.time;

  // дымка-облака: экранный слой с параллаксом от камеры
  const span = W + 600;
  for (const c of clouds) {
    const cx = ((c.x - cam.x * 0.35) % span + span) % span - 300;
    const cy = c.y + Math.sin(tm * 0.1 + c.s) * 12 - (cam.y * 0.08 % H) * 0.3;
    sc.globalAlpha = 0.35 * c.a;
    sc.drawImage(cloudSpr, cx - 150 * c.s, cy - 70 * c.s, 300 * c.s, 140 * c.s);
  }
  sc.globalAlpha = 1;

  // дальняя пыль — плывёт вдвое медленнее мира (глубина за спиной)
  {
    const sx = W + 240, sy = H + 240;
    sc.fillStyle = css3(pal.tint, 1);
    for (const d of dustFar) {
      const px = wrapCoord(d.x - cam.x * 0.45, sx) - 120;
      const py = wrapCoord(d.y - cam.y * 0.45, sy) - 120;
      sc.globalAlpha = d.a * (0.7 + 0.3 * Math.sin(tm * 1.3 + d.tw));
      sc.beginPath(); sc.arc(px, py, d.r, 0, TAU); sc.fill();
    }
    sc.globalAlpha = 1;
  }

  // зоны мира — луга, разломы, течения — лежат под всеми сущностями
  for (const z of visZones) drawZone(z, pal, tm);
  // паутины ловца снов — тоже на плоскости мира
  for (const wb of webs) drawWeb(wb, tm);

  // падающие звёзды — атмосфера, экранный слой
  sc.lineWidth = 1.6; sc.lineCap = 'round';
  for (const s2 of shots) { // штрих в два тона вместо градиента на каждый кадр
    const a = Math.sin(Math.PI * clamp(s2.t / s2.life, 0, 1));
    const tx2 = s2.x - s2.vx * 0.12, ty2 = s2.y - s2.vy * 0.12;
    const mx2 = (s2.x + tx2) / 2, my2 = (s2.y + ty2) / 2;
    sc.strokeStyle = css3([1, 1, 1], 0.85 * a);
    sc.beginPath(); sc.moveTo(s2.x, s2.y); sc.lineTo(mx2, my2); sc.stroke();
    sc.strokeStyle = css3(pal.tint, 0.32 * a);
    sc.beginPath(); sc.moveTo(mx2, my2); sc.lineTo(tx2, ty2); sc.stroke();
  }

  // мир: собрать, отсеять ушедшее за край, отсортировать по глубине, нарисовать
  itemN = 0;
  for (const sh of ships) addItem('ship', sh, sh.y + Math.sin(sh.bob) * 6 * sh.scl, 340);
  if (boss) addItem('boss', boss, boss.y, 900);
  for (const an of anchors) addItem('anchor', an, an.y, 90);
  for (const e of enemies) addItem('enemy', e, e.y, FAR_FOE[e.type] ? 900 : 150);
  for (const m of motes) addItem('mote', m, m.y, 90);
  for (const st of stars) addItem('star', st, st.y, 130);
  if (S.mode === 'play') addItem('io', io, io.y, 1e9);
  items.length = itemN;
  items.sort(byDepth);
  for (const it of items) {
    if (it.z === 'ship') drawShip(it.o, it.p, pal, tm);
    else if (it.z === 'boss') drawBoss(it.o, it.p, pal, tm);
    else if (it.z === 'anchor') drawAnchor(it.o, it.p, tm);
    else if (it.z === 'enemy') drawEnemy(it.o, it.p, tm);
    else if (it.z === 'mote') drawMote(it.o, it.p, pal, tm);
    else if (it.z === 'star') drawStar(it.o, it.p, pal, tm);
    else drawIo(it.p, pal, tm);
  }

  // молнии — столбы, воткнутые в плоскость мира
  for (const b of bolts) drawBolt(b, pal, tm);

  // частицы
  // частицы: одна заливка на цвет (вспышка раздаёт всем один и тот же массив),
  // прозрачность — через globalAlpha, форма — квадрат: под блумом не отличить
  // от круга, а стоит втрое дешевле дуги
  sc.globalCompositeOperation = 'lighter';
  let lastCol = null;
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    const dy = p.y - cam.y;
    const sx = W / 2 + (p.x - cam.x), sy = H / 2 + dy * view.tilt;
    if (sx < -24 || sx > W + 24 || sy < -24 || sy > H + 24) continue;
    if (p.col !== lastCol) { sc.fillStyle = css3(p.col, 0.8); lastCol = p.col; }
    sc.globalAlpha = 1 - p.t / p.life;
    let k = 1 + dy * 0.00028;
    k = k < 0.78 ? 0.78 : k > 1.28 ? 1.28 : k;
    const r = p.r * k;
    sc.fillRect(sx - r, sy - r, r + r, r + r);
  }
  sc.globalAlpha = 1;
  sc.globalCompositeOperation = 'source-over';

  // ближняя пыль — проносится в полтора раза быстрее мира (перед камерой)
  {
    const sx = W + 400, sy = H + 400;
    for (const d of dustNear) {
      const px = wrapCoord(d.x - cam.x * 1.55, sx) - 200;
      const py = wrapCoord(d.y - cam.y * 1.55, sy) - 200;
      sc.globalAlpha = 1;
      tintGlow(px, py, d.r * 4, pal.tint, d.a * (0.75 + 0.25 * Math.sin(tm * 0.9 + d.tw)));
    }
  }

  // фразы — готовые спрайты, тень уже впечена
  for (const tx of texts) {
    const P = proj(tx.x, tx.y);
    const w = tx.spr.width / TEXT_SS * P.k, h = tx.spr.height / TEXT_SS * P.k;
    sc.globalAlpha = tx.a;
    sc.drawImage(tx.spr, clamp(P.x, 130, W - 130) - w / 2, clamp(P.y, 50, H - 40) - h / 2, w, h);
  }
  sc.globalAlpha = 1;

  if (S.mode === 'play' && pointer.active && !io.tether && !touchSteer) {
    sc.fillStyle = 'rgba(235,232,225,.35)';
    sc.beginPath(); sc.arc(pointer.x, pointer.y, 2, 0, TAU); sc.fill();
  }
  // джойстик невидим, покуда его не попросят показать
  if (S.mode === 'play' && joy.on && SET.joyShow) {
    const R = SET.joyR;
    sc.strokeStyle = 'rgba(143,208,255,.22)';
    sc.lineWidth = 1;
    sc.beginPath(); sc.arc(joy.ax, joy.ay, R, 0, TAU); sc.stroke();
    sc.fillStyle = 'rgba(143,208,255,.18)';
    sc.beginPath(); sc.arc(joy.ax + joy.nx * R * joy.mag, joy.ay + joy.ny * R * joy.mag, 13, 0, TAU); sc.fill();
  }
}

// Записи списка отрисовки живут в запасе и переиспользуются кадр за кадром.
// Те, чьё дело видно и с края экрана (луч ока, прицел осколка, кольцо сирены,
// громада корабля-кошмара), отсеиваются с большим запасом.
const FAR_FOE = { eye: 1, dasher: 1, siren: 1 };
const items = [], itemPool = [];
let itemN = 0;
function byDepth(a, b) { return a.p.y - b.p.y; }
function addItem(z, o, yy, margin) {
  const dy = yy - cam.y;
  const sx = W / 2 + (o.x - cam.x), sy = H / 2 + dy * view.tilt;
  if (sx < -margin || sx > W + margin || sy < -margin || sy > H + margin) return;
  let it = itemPool[itemN];
  if (!it) it = itemPool[itemN] = { z: '', o: null, p: { x: 0, y: 0, k: 1 } };
  it.z = z; it.o = o;
  it.p.x = sx; it.p.y = sy;
  const k = 1 + dy * 0.00028;
  it.p.k = k < 0.78 ? 0.78 : k > 1.28 ? 1.28 : k;
  items[itemN++] = it;
}

// свечения: кэш спрайтов по квантованному цвету вместо градиента на каждый вызов
const glowCache = new Map();
function glowSprite(col) {
  const qr = Math.round(col[0] * 23), qg = Math.round(col[1] * 23), qb = Math.round(col[2] * 23);
  const key = qr * 576 + qg * 24 + qb;
  let sp = glowCache.get(key);
  if (!sp) {
    if (glowCache.size > 80) glowCache.clear();
    sp = document.createElement('canvas'); sp.width = sp.height = 64;
    const g = sp.getContext('2d');
    const r = (qr / 23 * 255) | 0, g2 = (qg / 23 * 255) | 0, b = (qb / 23 * 255) | 0;
    const rg = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    rg.addColorStop(0, `rgba(${r},${g2},${b},1)`);
    rg.addColorStop(0.4, `rgba(${r},${g2},${b},0.35)`);
    rg.addColorStop(1, `rgba(${r},${g2},${b},0)`);
    g.fillStyle = rg; g.fillRect(0, 0, 64, 64);
    glowCache.set(key, sp);
  }
  return sp;
}
function tintGlow(x, y, R, col, a) {
  const prev = sc.globalAlpha;
  sc.globalAlpha = prev * Math.min(1, a);
  sc.drawImage(glowSprite(col), x - R, y - R, R * 2, R * 2);
  sc.globalAlpha = prev;
}

function drawZone(z, pal, tm) {
  const P = proj(z.x, z.y);
  const R = z.r * P.k;
  if (P.x < -R - 100 || P.x > W + R + 100 || P.y < -R - 100 || P.y > H + R + 100) return;
  if (z.type === 'meadow') {
    // луг мыслей: тёплая поляна со светлячками
    tintGlow(P.x, P.y, R, pal.mote, 0.085 + 0.02 * Math.sin(tm * 0.8 + z.seed));
    sc.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 12; i++) {
      const a = z.seed + i * 2.42, rr = (0.2 + hash2(i, z.seed | 0) * 0.7) * z.r;
      const fx = z.x + Math.cos(a + tm * 0.12) * rr, fy = z.y + Math.sin(a * 1.7 + tm * 0.09) * rr;
      const F = proj(fx, fy);
      const tw = 0.4 + 0.6 * Math.abs(Math.sin(tm * (0.9 + i * 0.13) + i));
      tintGlow(F.x, F.y, 5 * F.k, pal.mote, 0.4 * tw);
      sc.fillStyle = css3([1, 1, 1], 0.65 * tw);
      sc.beginPath(); sc.arc(F.x, F.y, 1.1 * F.k, 0, TAU); sc.fill();
    }
    sc.globalCompositeOperation = 'source-over';
  } else if (z.type === 'rift') {
    // разлом: трещина в ночи, из которой лезут кошмары
    const ang = z.seed;
    const segs = 7;
    sc.save();
    const pulse = 0.5 + 0.25 * Math.sin(tm * 1.6 + z.seed);
    for (const [lw, colA] of [[9, 'rgba(4,2,10,.85)'], [2, css3([0.6, 0.3, 0.85], pulse)]]) {
      sc.strokeStyle = colA; sc.lineWidth = lw; sc.lineCap = 'round';
      sc.beginPath();
      for (let i = 0; i <= segs; i++) {
        const q = i / segs - 0.5;
        const wob = (hash2(i * 3.1, z.seed) - 0.5) * z.r * 0.35;
        const px = z.x + Math.cos(ang) * q * z.r * 1.5 - Math.sin(ang) * wob;
        const py = z.y + Math.sin(ang) * q * z.r * 1.5 + Math.cos(ang) * wob;
        const Q = proj(px, py);
        i === 0 ? sc.moveTo(Q.x, Q.y) : sc.lineTo(Q.x, Q.y);
      }
      sc.stroke();
    }
    sc.restore();
    sc.globalCompositeOperation = 'lighter';
    tintGlow(P.x, P.y, R * 0.55, [0.45, 0.2, 0.65], 0.09 * (0.7 + pulse * 0.5));
    sc.globalCompositeOperation = 'source-over';
    if (Math.random() < 0.15)
      newPart(z.x + rand(-z.r * 0.5, z.r * 0.5), z.y + rand(-z.r * 0.3, z.r * 0.3),
        rand(-8, 8), rand(-30, -10), rand(0.5, 1.2), COL_RIFT, rand(0.7, 1.8));
  } else if (z.type === 'current') {
    // течение: направленные штрихи ветра
    sc.strokeStyle = css3([0.62, 0.71, 0.8], 1);
    sc.lineWidth = 1.1; sc.lineCap = 'round';
    for (let i = 0; i < 11; i++) {
      const s2 = ((hash2(i, z.seed) + tm * 0.14) % 1);
      const off = (hash2(i * 7, z.seed) - 0.5) * z.r * 1.6;
      const px = z.x + z.dx * (s2 * 2 - 1) * z.r - z.dy * off;
      const py = z.y + z.dy * (s2 * 2 - 1) * z.r + z.dx * off;
      if (hyp(px - z.x, py - z.y) > z.r) continue;
      const Q = proj(px, py);
      sc.globalAlpha = Math.sin(s2 * Math.PI) * 0.3;
      sc.beginPath();
      sc.moveTo(Q.x, Q.y);
      sc.lineTo(Q.x + z.dx * 34 * Q.k, Q.y + z.dy * 34 * Q.k * view.tilt);
      sc.stroke();
    }
    sc.globalAlpha = 1;
  }
}

function drawStar(st, P, pal, tm) {
  const fade = Math.min(1, st.t * 2, (st.life - st.t) / 1.5);
  const pulse = 1 + 0.2 * Math.sin(tm * 4 + st.seed);
  const R = 7 * P.k * pulse;
  sc.globalCompositeOperation = 'lighter';
  tintGlow(P.x, P.y, R * 4, [1, 0.95, 0.8], 0.5 * fade);
  sc.fillStyle = css3([1, 1, 1], 0.95 * fade);
  sc.save();
  sc.translate(P.x, P.y);
  sc.rotate(tm * 0.7 + st.seed);
  sc.beginPath(); // ромб-кристалл
  sc.moveTo(0, -R); sc.lineTo(R * 0.62, 0); sc.lineTo(0, R); sc.lineTo(-R * 0.62, 0);
  sc.closePath(); sc.fill();
  sc.restore();
  sc.globalCompositeOperation = 'source-over';
}

function drawMote(m, P, pal, tm) {
  const pulse = 0.8 + 0.25 * Math.sin(tm * 2.4 + m.seed);
  const fade = Math.min(1, m.born * 2, (m.life - m.born));
  sc.globalAlpha = Math.max(0, 0.85 * fade);
  sc.globalCompositeOperation = 'lighter';
  tintGlow(P.x, P.y, m.r * 3.2 * pulse * P.k, pal.mote, 0.42 * Math.max(0, fade));
  sc.fillStyle = css3([1, 1, 1], 0.85 * Math.max(0, fade));
  sc.beginPath(); sc.arc(P.x, P.y, (m.r * 0.32 * pulse + 0.8) * P.k, 0, TAU); sc.fill();
  // блик-крестик
  const gl2 = m.r * 2.6 * pulse * P.k;
  sc.strokeStyle = css3([1, 1, 1], 0.35 * Math.max(0, fade) * pulse);
  sc.lineWidth = 0.7;
  sc.beginPath();
  sc.moveTo(P.x - gl2, P.y); sc.lineTo(P.x + gl2, P.y);
  sc.moveTo(P.x, P.y - gl2); sc.lineTo(P.x, P.y + gl2);
  sc.stroke();
  sc.globalCompositeOperation = 'source-over';
  sc.globalAlpha = 1;
}

function drawShip(sh, P, pal, tm) {
  const s = sh.scl * P.k, d = sh.dir;
  sc.save();
  sc.translate(P.x, P.y);
  sc.scale(d * s, s);
  sc.rotate(Math.sin(sh.bob * 0.7) * 0.03);
  const alpha = sh.near ? 0.92 : 0.55;
  const hull = `rgba(8,10,16,${alpha})`;
  const rim = css3(pal.tint, sh.near ? 0.55 : 0.3);
  sc.beginPath();
  sc.moveTo(-95, 0);
  sc.quadraticCurveTo(-70, 26, -20, 30);
  sc.quadraticCurveTo(45, 30, 80, 8);
  sc.quadraticCurveTo(95, 0, 100, -12);
  sc.lineTo(-88, -10);
  sc.closePath();
  sc.fillStyle = hull; sc.fill();
  sc.strokeStyle = rim; sc.lineWidth = 1.4; sc.stroke();
  sc.strokeStyle = rim; sc.lineWidth = 1.2;
  for (const [mx, mh] of [[-40, 78], [18, 95], [62, 60]]) {
    sc.beginPath(); sc.moveTo(mx, -8); sc.lineTo(mx, -8 - mh); sc.stroke();
    sc.beginPath();
    sc.moveTo(mx, -14 - mh);
    sc.quadraticCurveTo(mx - 34, -mh * 0.55 - 8, mx - 4, -14);
    sc.quadraticCurveTo(mx - 16, -mh * 0.5 - 10, mx, -12 - mh);
    sc.closePath();
    sc.fillStyle = `rgba(20,24,34,${alpha * 0.85})`; sc.fill();
    sc.strokeStyle = rim; sc.stroke();
  }
  sc.restore();
  const lx = P.x + d * s * -92, ly = P.y - 16 * s;
  sc.globalCompositeOperation = 'lighter';
  tintGlow(lx, ly, 11 * s, pal.tint, 0.3 * (0.8 + 0.2 * Math.sin(tm * 3 + sh.bob)));
  sc.fillStyle = 'rgba(255,240,210,.9)';
  sc.beginPath(); sc.arc(lx, ly, 1.6 * s, 0, TAU); sc.fill();
  sc.globalCompositeOperation = 'source-over';
}

function drawBoss(b, P, pal, tm) {
  const s = BOSS_S * P.k, d = b.dir;
  const rim = css3([0.75, 0.35, 0.9], 0.75);
  // поле фонаря — круг, в котором тает бодрость
  if (b.open > 0.05) {
    sc.strokeStyle = css3([1, 0.7, 0.4], 0.1 + b.open * 0.14);
    sc.lineWidth = 1.2;
    sc.beginPath();
    sc.ellipse(P.x, P.y, 340 * P.k, 340 * P.k * view.tilt, 0, 0, TAU);
    sc.stroke();
  }
  sc.save();
  sc.translate(P.x, P.y);
  sc.scale(d * s, s);
  sc.rotate(Math.sin(b.bob * 0.5) * 0.02);
  // корпус — тот же силуэт корабля, да выпитый до черноты
  sc.beginPath();
  sc.moveTo(-98, 0);
  sc.quadraticCurveTo(-72, 30, -20, 34);
  sc.quadraticCurveTo(46, 34, 82, 10);
  sc.quadraticCurveTo(98, 0, 104, -14);
  sc.lineTo(-90, -12);
  sc.closePath();
  sc.fillStyle = b.flashT > 0 ? 'rgba(180,140,220,.95)' : 'rgba(4,3,9,.97)';
  sc.fill();
  sc.strokeStyle = rim; sc.lineWidth = 1.1; sc.stroke();
  // рёбра корпуса
  sc.lineWidth = 0.6;
  sc.strokeStyle = css3([0.6, 0.3, 0.75], 0.4);
  for (let i = -3; i <= 2; i++) {
    sc.beginPath(); sc.moveTo(i * 26, -10); sc.lineTo(i * 26 + 6, 28); sc.stroke();
  }
  // рваные паруса
  for (const [mx, mh] of [[-46, 100], [14, 126], [66, 78]]) {
    sc.strokeStyle = rim; sc.lineWidth = 1;
    sc.beginPath(); sc.moveTo(mx, -10); sc.lineTo(mx, -12 - mh); sc.stroke();
    sc.beginPath();
    sc.moveTo(mx, -16 - mh);
    sc.quadraticCurveTo(mx - 48, -mh * 0.62 - 14, mx - 38, -26);
    for (let i = 0; i <= 6; i++) { // подол, изодранный ветром
      const w = Math.sin(tm * 1.6 + i * 1.9 + b.seed) * 3;
      sc.lineTo(mx - 38 + i / 6 * 38, -26 + (i % 2 ? 13 : 0) + w);
    }
    sc.closePath();
    sc.fillStyle = 'rgba(13,7,22,.92)';
    sc.fill();
    sc.strokeStyle = css3([0.7, 0.35, 0.85], 0.5); sc.stroke();
  }
  sc.restore();
  // фонарь-сердце на носу
  const lp = bossLamp(b), L = proj(lp.x, lp.y);
  const op = b.open;
  sc.globalCompositeOperation = 'lighter';
  tintGlow(L.x, L.y, (24 + op * 46) * P.k, [1, 0.7, 0.34], 0.35 + op * 0.55);
  sc.fillStyle = op > 0.5 ? 'rgba(255,238,205,.97)' : 'rgba(70,34,22,.92)';
  sc.beginPath(); sc.arc(L.x, L.y, (5 + op * 4) * P.k, 0, TAU); sc.fill();
  sc.strokeStyle = css3([1, 0.76, 0.4], 0.45 + op * 0.45);
  sc.lineWidth = 1.4;
  sc.beginPath(); sc.arc(L.x, L.y, (13 + op * 9) * P.k, 0, TAU); sc.stroke();
  if (op > 0.5) { // открыт — бей сюда
    sc.strokeStyle = css3([1, 0.9, 0.7], 0.35 + 0.35 * Math.sin(tm * 9));
    sc.lineWidth = 1;
    sc.setLineDash([4, 7]);
    sc.beginPath(); sc.arc(L.x, L.y, (30 + Math.sin(tm * 3) * 3) * P.k, 0, TAU); sc.stroke();
    sc.setLineDash([]);
  }
  sc.globalCompositeOperation = 'source-over';
}

function drawAnchor(an, P, tm) {
  const k = P.k, a = Math.atan2(an.vy, an.vx);
  sc.globalCompositeOperation = 'lighter';
  tintGlow(P.x, P.y, 16 * k, [0.65, 0.3, 0.85], 0.5);
  sc.globalCompositeOperation = 'source-over';
  sc.save();
  sc.translate(P.x, P.y);
  sc.scale(k, k);
  sc.rotate(a + Math.PI / 2 + Math.sin(tm * 6 + an.seed) * 0.15);
  sc.strokeStyle = css3([0.8, 0.5, 0.95], 0.85);
  sc.lineWidth = 1.8; sc.lineCap = 'round';
  sc.beginPath();               // якорь: шток, перекладина, лапы
  sc.moveTo(0, -9); sc.lineTo(0, 7);
  sc.moveTo(-5, -5); sc.lineTo(5, -5);
  sc.moveTo(-7, 3); sc.quadraticCurveTo(0, 12, 7, 3);
  sc.stroke();
  sc.fillStyle = 'rgba(10,6,18,.9)';
  sc.beginPath(); sc.arc(0, -10.5, 2.2, 0, TAU); sc.fill();
  sc.stroke();
  sc.restore();
}

function drawWeb(wb, tm) {
  const P = proj(wb.x, wb.y);
  const a = Math.min(1, wb.t / 0.7, Math.max(0, (wb.life - wb.t) / 1.2));
  if (a <= 0) return;
  const R = wb.r * P.k;
  sc.strokeStyle = css3([0.72, 0.78, 0.9], (0.14 + 0.04 * Math.sin(tm * 2 + wb.seed)) * a);
  sc.lineWidth = 1;
  for (let ring = 1; ring <= 3; ring++) {
    const rr = R * ring / 3;
    sc.beginPath();
    for (let i = 0; i <= 7; i++) {
      const an = i / 7 * TAU + wb.seed;
      const px = P.x + Math.cos(an) * rr, py = P.y + Math.sin(an) * rr * view.tilt;
      i === 0 ? sc.moveTo(px, py) : sc.lineTo(px, py);
    }
    sc.stroke();
  }
  sc.beginPath();
  for (let i = 0; i < 7; i++) {
    const an = i / 7 * TAU + wb.seed;
    sc.moveTo(P.x, P.y);
    sc.lineTo(P.x + Math.cos(an) * R, P.y + Math.sin(an) * R * view.tilt);
  }
  sc.stroke();
}

function drawEnemy(e, P, tm) {
  const k = P.k;
  if (e.type === 'moth') {
    // мотылёк тьмы — рваные крылья бьются о свет
    sc.save();
    sc.translate(P.x, P.y);
    sc.scale(k, k);
    const fl = Math.sin(tm * (e.latched ? 7 : 22) + e.seed) * 0.9;
    if (e.vx || e.vy) sc.rotate(Math.atan2(e.vy, e.vx) + Math.PI / 2);
    sc.fillStyle = e.burn > 0 ? 'rgba(60,20,10,.95)' : 'rgba(10,6,18,.95)';
    sc.strokeStyle = css3(e.burn > 0 ? [1, 0.55, 0.25] : [0.75, 0.4, 0.85], 0.6);
    sc.lineWidth = 1;
    for (const s of [-1, 1]) {
      sc.save(); sc.scale(s, 1); sc.rotate(fl * 0.5);
      sc.beginPath();
      sc.moveTo(1, 0); sc.quadraticCurveTo(9, -7, 8, 1); sc.quadraticCurveTo(7, 6, 1, 3);
      sc.closePath(); sc.fill(); sc.stroke();
      sc.restore();
    }
    sc.fillStyle = css3([0.9, 0.5, 0.9], 0.85);
    sc.beginPath(); sc.ellipse(0, 0, 1.3, 3.4, 0, 0, TAU); sc.fill();
    sc.restore();
    return;
  }
  if (e.type === 'eye') {
    // око бессонницы: глядит, целится, бьёт лучом
    const hot = e.st !== 'drift';
    if (hot) {
      const fire = e.st === 'fire';
      const P2 = proj(e.x + Math.cos(e.aim) * 760, e.y + Math.sin(e.aim) * 760);
      sc.strokeStyle = fire ? 'rgba(255,120,150,.85)' : css3([1, 0.5, 0.6], 0.3 + 0.25 * Math.sin(tm * 26));
      sc.lineWidth = fire ? 4.5 : 1;
      if (!fire) sc.setLineDash([3, 9]);
      sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(P2.x, P2.y); sc.stroke();
      sc.setLineDash([]);
      if (fire) {
        sc.strokeStyle = 'rgba(255,235,245,.9)'; sc.lineWidth = 1.4;
        sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(P2.x, P2.y); sc.stroke();
      }
    }
    sc.save();
    sc.translate(P.x, P.y);
    sc.scale(k, k);
    const dxi = io.x - e.x, dyi = io.y - e.y, di = hyp(dxi, dyi) || 1;
    sc.fillStyle = 'rgba(6,4,12,.95)';
    sc.strokeStyle = css3([0.85, 0.45, 0.6], 0.75);
    sc.lineWidth = 1.3;
    sc.beginPath();
    sc.moveTo(-15, 0); sc.quadraticCurveTo(0, -11, 15, 0); sc.quadraticCurveTo(0, 11, -15, 0);
    sc.closePath(); sc.fill(); sc.stroke();
    // ресницы-лучи
    sc.beginPath();
    for (let i = -2; i <= 2; i++) {
      sc.moveTo(i * 4.5, -7 - Math.abs(i) * -0.5);
      sc.lineTo(i * 6, -11.5 + Math.abs(i) * 0.8);
    }
    sc.stroke();
    // зрачок неотрывно глядит на свет
    sc.fillStyle = hot ? 'rgba(255,110,140,.95)' : 'rgba(200,160,220,.85)';
    sc.beginPath(); sc.arc(dxi / di * 5, dyi / di * 3, hot ? 3.4 : 2.6, 0, TAU); sc.fill();
    sc.restore();
    if (hot) {
      sc.globalCompositeOperation = 'lighter';
      tintGlow(P.x, P.y, 26 * k, [1, 0.45, 0.55], 0.35);
      sc.globalCompositeOperation = 'source-over';
    }
    return;
  }
  if (e.type === 'weaver') {
    // ловец снов — прядильщик с тонкими лапами-нитями
    sc.save();
    sc.translate(P.x, P.y);
    sc.scale(k, k);
    sc.strokeStyle = css3([0.65, 0.72, 0.85], 0.5);
    sc.lineWidth = 1;
    sc.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU + tm * 0.7 + e.seed;
      sc.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      sc.quadraticCurveTo(Math.cos(a) * 12, Math.sin(a) * 12, Math.cos(a + 0.5) * 16, Math.sin(a + 0.5) * 16);
    }
    sc.stroke();
    sc.fillStyle = 'rgba(8,6,14,.95)';
    sc.beginPath(); sc.arc(0, 0, 6, 0, TAU); sc.fill();
    sc.strokeStyle = css3([0.7, 0.78, 0.9], 0.7);
    sc.stroke();
    // глазки-бусины
    sc.fillStyle = css3([0.85, 0.9, 1], 0.7);
    sc.beginPath(); sc.arc(-2, -1.5, 0.9, 0, TAU); sc.fill();
    sc.beginPath(); sc.arc(2, -1.5, 0.9, 0, TAU); sc.fill();
    sc.restore();
    return;
  }
  if (e.type === 'antio') {
    // тёмный двойник — зеркало Ио, погашенное
    const flash = e.flashT > 0;
    sc.globalCompositeOperation = 'lighter';
    tintGlow(P.x, P.y, 34 * k, [0.42, 0.18, 0.6], 0.5);
    sc.globalCompositeOperation = 'source-over';
    sc.fillStyle = flash ? 'rgba(220,190,255,.95)' : 'rgba(8,4,16,.97)';
    sc.beginPath(); sc.arc(P.x, P.y, 6.5 * k, 0, TAU); sc.fill();
    sc.strokeStyle = css3([0.6, 0.3, 0.85], 0.9);
    sc.lineWidth = 1.6;
    sc.beginPath(); sc.arc(P.x, P.y, 11.5 * k + Math.sin(tm * 5 + e.seed) * 1.2, 0, TAU); sc.stroke();
    // индикатор живучести — точки над ядром
    for (let i = 0; i < e.hp; i++) {
      sc.fillStyle = css3([0.7, 0.4, 1], 0.8);
      sc.beginPath(); sc.arc(P.x + (i - (e.hp - 1) / 2) * 6, P.y - 20 * k, 1.4, 0, TAU); sc.fill();
    }
    // тёмные спириты
    sc.globalCompositeOperation = 'lighter';
    for (const esp of e.esp) {
      const EX = proj(e.x + Math.cos(esp.ang) * e.orbR, e.y + Math.sin(esp.ang) * e.orbR * 0.82);
      if (esp.cd > 0) {
        sc.fillStyle = css3([0.5, 0.3, 0.7], 0.2);
        sc.beginPath(); sc.arc(EX.x, EX.y, 1.6, 0, TAU); sc.fill();
      } else {
        tintGlow(EX.x, EX.y, 9 * EX.k, [0.6, 0.3, 0.85], 0.6);
        sc.fillStyle = 'rgba(30,10,50,.95)';
        sc.beginPath(); sc.arc(EX.x, EX.y, 2.6 * EX.k, 0, TAU); sc.fill();
        sc.strokeStyle = css3([0.75, 0.45, 1], 0.9);
        sc.lineWidth = 1;
        sc.beginPath(); sc.arc(EX.x, EX.y, 2.6 * EX.k, 0, TAU); sc.stroke();
      }
    }
    sc.globalCompositeOperation = 'source-over';
    return;
  }
  if (e.type === 'siren') {
    // поле сирены — эллипс в плоскости мира
    sc.strokeStyle = css3([0.72, 0.4, 0.9], 0.22 + 0.1 * Math.sin(e.pulse));
    sc.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const rr = e.ringR * (0.5 + ((e.pulse * 0.25 + i / 3) % 1) * 0.5);
      sc.globalAlpha = 1 - ((e.pulse * 0.25 + i / 3) % 1);
      sc.beginPath();
      sc.ellipse(P.x, P.y, rr * k, rr * k * view.tilt, 0, 0, TAU);
      sc.stroke();
    }
    sc.globalAlpha = 1;
  }
  if (e.type === 'dasher' && e.st === 'tele') {
    // прицел перед рывком
    const T = proj(io.x, io.y);
    sc.strokeStyle = css3([1, 0.5, 0.6], 0.35 + 0.3 * Math.sin(tm * 24));
    sc.lineWidth = 1;
    sc.setLineDash([4, 8]);
    sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(T.x, T.y); sc.stroke();
    sc.setLineDash([]);
  }
  sc.save();
  sc.translate(P.x, P.y);
  sc.scale(k, k);
  const spiky = e.type === 'dasher' ? 0.55 : 0.32;
  const col = e.type === 'shade' ? [0.45, 0.3, 0.6]
    : e.type === 'eater' ? [0.85, 0.45, 0.3]
    : e.type === 'siren' ? [0.5, 0.35, 0.75]
    : e.type === 'dasher' ? [0.95, 0.4, 0.5]
    : [0.72, 0.4, 0.9];
  sc.beginPath();
  const N = e.type === 'dasher' ? 6 : 9;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU;
    const rr = e.r * (1 + spiky * Math.sin(tm * 2.6 + e.seed + i * 2.1));
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    i === 0 ? sc.moveTo(px, py) : sc.lineTo(px, py);
  }
  sc.closePath();
  sc.fillStyle = e.flashT > 0 ? 'rgba(228,206,255,.92)' : 'rgba(6,4,12,.94)';
  sc.fill();
  sc.strokeStyle = css3(col, 0.55 + 0.2 * Math.sin(tm * 3 + e.seed));
  sc.lineWidth = 1.3;
  sc.stroke();
  if (e.hp > 1) { // короста — вторая, костяная кайма
    sc.strokeStyle = css3([0.9, 0.86, 0.8], 0.4);
    sc.lineWidth = 0.9;
    sc.setLineDash([3, 3]);
    sc.beginPath(); sc.arc(0, 0, e.r * 1.32, 0, TAU); sc.stroke();
    sc.setLineDash([]);
  }
  if (e.type === 'eater' && e.eaten > 0) { // сожранные мысли светятся внутри
    sc.fillStyle = css3([1, 0.85, 0.6], 0.5);
    for (let i = 0; i < Math.min(e.eaten, 5); i++) {
      const a = e.seed + i * 2.4 + tm * 0.8;
      sc.beginPath();
      sc.arc(Math.cos(a) * e.r * 0.4, Math.sin(a) * e.r * 0.4, 1.5, 0, TAU);
      sc.fill();
    }
  }
  sc.restore();
  if (Math.random() < 0.1)
    newPart(e.x + rand(-e.r, e.r), e.y + rand(-e.r, e.r),
      rand(-8, 8), rand(-16, -4), rand(0.3, 0.8), COL_FOE, rand(0.6, 1.6));
}

function drawBolt(b, pal, tm) {
  const P1 = proj(b.x, cam.y - 1400);
  const P2 = proj(b.x, cam.y + 1400);
  if (b.t < b.warn) {
    const blink = Math.sin(tm * 22) > 0 ? 0.4 : 0.12;
    const urgency = b.t / b.warn;
    sc.strokeStyle = css3([1, 1, 1], blink * (0.4 + urgency * 0.6));
    sc.lineWidth = 1;
    sc.setLineDash([6, 10]);
    sc.beginPath(); sc.moveTo(P1.x, P1.y); sc.lineTo(P2.x, P2.y); sc.stroke();
    sc.setLineDash([]);
  } else {
    const kk = 1 - (b.t - b.warn) / b.strike;
    sc.globalCompositeOperation = 'lighter';
    sc.strokeStyle = css3(pal.tint, 0.4 * kk);
    sc.lineWidth = 46;
    sc.lineCap = 'round';
    sc.beginPath(); sc.moveTo(P1.x, P1.y); sc.lineTo(P2.x, P2.y); sc.stroke();
    // ломаная сердцевина
    sc.strokeStyle = css3([1, 1, 1], 0.95 * kk);
    sc.lineWidth = 2.2;
    sc.beginPath();
    const segs = 14;
    for (let i = 0; i <= segs; i++) {
      const q = i / segs;
      const x = P1.x + (P2.x - P1.x) * q + (i > 0 && i < segs ? rand(-9, 9) : 0);
      const y = P1.y + (P2.y - P1.y) * q;
      i === 0 ? sc.moveTo(x, y) : sc.lineTo(x, y);
    }
    sc.stroke();
    sc.globalCompositeOperation = 'source-over';
  }
}

function drawTetherLine(P, tm) {
  const sh = io.tether;
  if (!sh || !ships.includes(sh)) return;
  const B = proj(sh.x - sh.dir * 60 * sh.scl, sh.y - 30 * sh.scl);
  // круг воли: докуда пускает поводок — чтобы правило читалось глазами;
  // натянешь нить — круг и сама нить наливаются жаром
  const strain = S.strain || 0;
  const tcol = strain > 0 ? mix3(IO_COL, [1, 0.5, 0.3], strain) : IO_COL;
  sc.strokeStyle = css3(tcol, 0.13 + strain * 0.35);
  sc.lineWidth = 1;
  sc.setLineDash([7, 11]);
  sc.beginPath();
  sc.ellipse(B.x, B.y, TETHER_LEASH * B.k, TETHER_LEASH * B.k * view.tilt, 0, 0, TAU);
  sc.stroke();
  sc.setLineDash([]);
  // нить натянута и горяча: широкое свечение, белое сердце, бегущие искры
  sc.globalCompositeOperation = 'lighter';
  sc.lineCap = 'round';
  sc.strokeStyle = css3(tcol, 0.16 + strain * 0.2);
  sc.lineWidth = 9 + strain * 5;
  sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(B.x, B.y); sc.stroke();
  sc.strokeStyle = css3(tcol, 0.6 + 0.15 * Math.sin(tm * 6) + strain * 0.25);
  sc.lineWidth = 2.4 + strain * 1.6;
  sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(B.x, B.y); sc.stroke();
  sc.strokeStyle = 'rgba(255,255,255,.85)';
  sc.lineWidth = 1;
  sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(B.x, B.y); sc.stroke();
  for (let i = 0; i < 3; i++) {
    const q = (tm * 0.8 + i / 3) % 1;
    sc.fillStyle = css3(IO_COL, 0.9);
    sc.beginPath();
    sc.arc(P.x + (B.x - P.x) * q, P.y + (B.y - P.y) * q, 2.1, 0, TAU);
    sc.fill();
  }
  sc.globalCompositeOperation = 'source-over';
}

function drawIo(P, pal, tm) {
  drawTetherLine(P, tm);
  const blink = S.hurtT > 0.5 && Math.sin(tm * 30) > 0;
  if (io.trail.length > 3) {
    sc.globalCompositeOperation = 'lighter';
    let prev = proj(io.trail[0].x, io.trail[0].y);
    for (let i = 1; i < io.trail.length; i++) {
      const cur = proj(io.trail[i].x, io.trail[i].y);
      const a = 1 - i / io.trail.length;
      sc.strokeStyle = css3(IO_COL, a * 0.3);
      sc.lineWidth = a * 7 + 1;
      sc.lineCap = 'round';
      sc.beginPath(); sc.moveTo(prev.x, prev.y); sc.lineTo(cur.x, cur.y); sc.stroke();
      prev = cur;
    }
    sc.globalCompositeOperation = 'source-over';
  }
  if (blink) return;
  const k = P.k;
  const ocMul = (io.oc ? 1.35 : 1) * k;
  sc.globalCompositeOperation = 'lighter';
  if (io.heat > 0.4) { // раскалился от скорости
    tintGlow(P.x, P.y, 46 * ocMul, [1, 0.55, 0.25], (io.heat - 0.4) * 0.9);
  }
  tintGlow(P.x, P.y, 36 * ocMul, IO_COL, 0.5);
  sc.fillStyle = 'rgba(255,255,255,.97)';
  sc.beginPath(); sc.arc(P.x, P.y, 6 * ocMul, 0, TAU); sc.fill();
  sc.strokeStyle = css3(IO_COL, 0.85);
  sc.lineWidth = 1.6;
  sc.beginPath(); sc.arc(P.x, P.y, 11.5 * ocMul + Math.sin(tm * 5) * 1.2, 0, TAU); sc.stroke();
  // медленное внешнее кольцо из трёх дуг
  sc.strokeStyle = css3(IO_COL, 0.35);
  sc.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a0 = -tm * 0.6 + i * TAU / 3;
    sc.beginPath(); sc.arc(P.x, P.y, 22 * ocMul, a0, a0 + 1.4); sc.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const a = tm * 1.1 + i * TAU / 5;
    const rr = (16 + Math.sin(tm * 3.3 + i * 1.7) * 4) * k;
    sc.fillStyle = css3(IO_COL, 0.5);
    sc.beginPath();
    sc.arc(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr * 0.9, 1.3, 0, TAU);
    sc.fill();
  }
  // спириты — позиции в мире, проекция сама их кладёт в наклон плоскости
  const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
  for (const sp of io.spirits) {
    const SP = proj(io.x + Math.cos(sp.ang) * orbR, io.y + Math.sin(sp.ang) * orbR * 0.82);
    if (sp.cd > 0) {
      sc.fillStyle = css3(IO_COL, 0.18);
      sc.beginPath(); sc.arc(SP.x, SP.y, 1.6, 0, TAU); sc.fill();
    } else {
      tintGlow(SP.x, SP.y, 10 * SP.k, IO_COL, 0.55);
      sc.fillStyle = 'rgba(255,255,255,.95)';
      sc.beginPath(); sc.arc(SP.x, SP.y, 2.4 * SP.k, 0, TAU); sc.fill();
    }
  }
  sc.globalCompositeOperation = 'source-over';
  if (io.reloc.cd > 0) {
    const frac = 1 - io.reloc.cd / RUN.relocCd;
    sc.strokeStyle = 'rgba(235,232,225,.4)';
    sc.lineWidth = 1;
    sc.beginPath();
    sc.arc(P.x, P.y, 18 * k, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
    sc.stroke();
  }
  if (io.reloc.phase === 'out') {
    const R2 = proj(io.reloc.rx, io.reloc.ry);
    sc.strokeStyle = css3(IO_COL, 0.5 + 0.2 * Math.sin(tm * 8));
    sc.lineWidth = 1.2;
    sc.setLineDash([4, 6]);
    sc.beginPath(); sc.arc(R2.x, R2.y, 12 * R2.k, 0, TAU); sc.stroke();
    sc.setLineDash([]);
  }
}

// ---------- WebGL кадр ----------
function drawGL() {
  const pal = S.pal, t = S.t;

  // проход 1: мягкое небо в низком разрешении
  gl.bindFramebuffer(gl.FRAMEBUFFER, skyFbo);
  gl.viewport(0, 0, skyW, skyH);
  gl.useProgram(skyProg);
  gl.uniform2f(SU.uRes, glCanvas.width, glCanvas.height);
  gl.uniform1f(SU.uTime, S.time);
  gl.uniform3f(SU.uSkyA, ...pal.skyA);
  gl.uniform3f(SU.uSkyB, ...pal.skyB);
  gl.uniform3f(SU.uAur, ...pal.aur);
  gl.uniform3f(SU.uTint, ...pal.tint);
  gl.uniform1f(SU.uAurI, pal.aurI);
  gl.uniform2f(SU.uCam, cam.x, cam.y);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  gl.useProgram(prog);

  // сцена: без реаллокации хранилища
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, skyTex);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  const _tu = PERF.on ? performance.now() : 0;
  gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, scene);
  if (PERF.on) PERF.up += performance.now() - _tu;

  // рассвет всходит к 0.93 и стекает к шву ночи — без скачка светила
  const dawn = sstep((t - 0.87) / 0.06) * (1 - sstep((t - 0.945) / 0.055));
  let mx = 0.82 - t * 0.55, my = 0.66 + 0.14 * Math.sin(t * 2.6 + 0.5), mr = 0.042, mvis = 1;
  if (dawn > 0) {
    mx = lerp(mx, 0.5, dawn); my = lerp(my, 0.22, dawn);
    mr = lerp(mr, 0.075, dawn); mvis = lerp(1, 1.15, dawn);
  }
  mvis *= 1 - sstep((t - 0.955) / 0.04); // светило тает у самого шва...
  mvis *= sstep(t / 0.05);               // ...и месяц новой ночи всходит из темноты
  gl.uniform2f(U.uRes, glCanvas.width, glCanvas.height);
  gl.uniform1f(U.uTime, S.time);
  gl.uniform3f(U.uSkyA, ...pal.skyA);
  gl.uniform3f(U.uSkyB, ...pal.skyB);
  gl.uniform3f(U.uAur, ...pal.aur);
  gl.uniform3f(U.uTint, ...pal.tint);
  gl.uniform1f(U.uAurI, pal.aurI);
  gl.uniform1f(U.uStars, pal.stars);
  const fxK = SET.fx / 100;
  gl.uniform1f(U.uAberr, (0.0015 + S.energy * S.energy * 0.008 + S.glitch * 0.01) * fxK);
  gl.uniform1f(U.uGlitch, S.glitch * 0.6 * fxK);
  gl.uniform1f(U.uGrain, fxK);
  gl.uniform1f(U.uShake, S.shake * SET.shake / 100);
  gl.uniform1f(U.uEnergy, S.energy);
  gl.uniform1f(U.uDawn, dawn);
  gl.uniform2f(U.uMoonPos, mx, my);
  gl.uniform1f(U.uMoonR, mr);
  gl.uniform1f(U.uMoon, mvis);
  gl.uniform2f(U.uCam, cam.x, cam.y);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------- HUD ----------
const elClock = document.getElementById('clock');
const elNight = document.getElementById('nightname');
const elScore = document.getElementById('score');
const elCombo = document.getElementById('combo');
const elLvl = document.getElementById('lvl');
const elMeter = document.getElementById('meterFill');
const elXp = document.getElementById('xpFill');
const skTether = document.getElementById('skTether');
const skBlink = document.getElementById('skBlink');
const skBlinkKey = document.getElementById('skBlinkKey');
const skCharge = document.getElementById('skCharge');
const bossHud = document.getElementById('bossHud');
const elFps = document.getElementById('fpsHud');
const elBossFill = document.getElementById('bossFill');
let hudTimer = 0;

function updateHud() {
  elScore.textContent = tr('thoughts', RUN.thoughts);
  elLvl.textContent = tr('tierN', RUN.level);
  if (S.combo >= 2) {
    elCombo.textContent = tr('chain', S.combo);
    elCombo.classList.add('hot');
  } else elCombo.classList.remove('hot');
  const frac = clamp(RUN.wake / RUN.wakeMax, 0, 1);
  elMeter.style.width = (frac * 100).toFixed(1) + '%';
  const col = frac > 0.5 ? '#8fd0ff' : frac > 0.25 ? '#e8a54a' : '#d8695a';
  elMeter.style.background = col;
  elMeter.style.boxShadow = '0 0 12px ' + col;
  elXp.style.width = (clamp(RUN.xp / RUN.xpNext, 0, 1) * 100).toFixed(1) + '%';
  if (boss) elBossFill.style.width = (clamp(boss.hp / boss.hpMax, 0, 1) * 100).toFixed(1) + '%';
  // полоса способностей: видно, что чем нажать и что уже готово
  const blinkOk = io.reloc.cd <= 0 && io.reloc.phase === 'idle';
  const reach = !!S.reachShip;
  skTether.classList.toggle('on', !!io.tether);
  skTether.classList.toggle('ready', !io.tether && reach);
  skBlink.classList.toggle('ready', blinkOk);
  skBlink.classList.toggle('cool', !blinkOk);
  skBlinkKey.textContent = io.reloc.cd > 0
    ? io.reloc.cd.toFixed(1) + tr('secShort') : tr('keySpace');
  skCharge.classList.toggle('on', io.oc);
  if (TOUCH) { // кнопки под пальцем показывают, что готово, а что ещё стынет
    btnBlink.classList.toggle('cool', !blinkOk);
    btnBlink.classList.toggle('ready', blinkOk);
    btnTether.classList.toggle('on', !!io.tether);
    btnTether.classList.toggle('ready', !io.tether && reach);
  }
}
function updateClock() {
  // ночь 23:00→06:00 занимает t∈[0,0.93]; дальше день промелькивает мимо —
  // стрелки прокручивают 06:00→23:00 за хвост рассвета
  const mins = S.t < 0.93 ? S.t / 0.93 * 420 : 420 + (S.t - 0.93) / 0.07 * 1020;
  const h = (23 + Math.floor(mins / 60)) % 24;
  const m = Math.floor(mins % 60);
  elClock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  const storm = isStormNight();
  elNight.textContent = tr('nightText', RUN.night, storm);
  elNight.classList.toggle('storm', storm && S.t >= 0.43 && S.t < 0.87);
}

// ---------- рекорд ----------
function loadBest() {
  try { return JSON.parse(localStorage.getItem('io-noch-best')) || null; } catch (_) { return null; }
}
function saveBest(nights, thoughts) {
  try {
    const b = loadBest();
    if (!b || nights > b.nights || (nights === b.nights && thoughts > b.thoughts))
      localStorage.setItem('io-noch-best', JSON.stringify({ nights, thoughts }));
  } catch (_) {}
}
function showBestLine() {
  const c = skyCaught();
  document.getElementById('skyBtn').textContent = c ? tr('skyBtn', c, skyTotal()) : tr('skyBtnEmpty');
  const b = loadBest();
  const el = document.getElementById('bestLine');
  if (b) {
    el.textContent = tr('bestLine', b.nights, b.thoughts, plural(b.nights));
    el.classList.remove('hidden');
  }
}
function plural(n) {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return 'ь';
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return 'и';
  return 'ей';
}

// ---------- экран созвездия ----------
const skyScreen = document.getElementById('skyScreen');
const skyCanvas = document.getElementById('skyCanvas');
const skyCtx = skyCanvas.getContext('2d');
const SKY_LW = 920, SKY_LH = 460;
// шесть облаков звёзд: пять ярусов ночи да добыча
const SKY_CENTERS = [[128, 120], [318, 292], [500, 108], [672, 300], [842, 126], [842, 322]];
let skyStars = [];

function layoutSky() {
  skyStars = [];
  skyGroups().forEach((tier, gi) => {
    const c = SKY_CENTERS[gi] || [460, 230];
    tier.forEach((ph, pi) => {
      const a = hash2(gi * 13 + pi * 3, pi * 7 + gi) * TAU;
      const rr = 24 + hash2(pi + 3, gi + 5) * 70;
      skyStars.push({
        x: c[0] + Math.cos(a) * rr * 1.2, y: c[1] + Math.sin(a) * rr * 0.78,
        ph, got: SKY.has(phraseKey(gi, pi)), gi,
      });
    });
  });
}

function renderSky(hover) {
  layoutSky();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  skyCanvas.width = SKY_LW * dpr; skyCanvas.height = SKY_LH * dpr;
  const g = skyCtx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, SKY_LW, SKY_LH);
  // нити между зажжёнными звёздами одного яруса
  for (let gi = 0; gi < SKY_CENTERS.length; gi++) {
    const pts = skyStars.filter(s => s.gi === gi && s.got);
    if (pts.length < 2) continue;
    g.strokeStyle = 'rgba(143,208,255,.24)'; g.lineWidth = 1;
    g.beginPath();
    pts.forEach((p, i) => i === 0 ? g.moveTo(p.x, p.y) : g.lineTo(p.x, p.y));
    g.stroke();
  }
  // подписи ярусов
  g.font = '10px ' + GAME_FONT;
  g.textAlign = 'center';
  skyNames().forEach((nm, gi) => {
    const c = SKY_CENTERS[gi];
    const total = skyGroups()[gi].length;
    const got = skyStars.filter(s => s.gi === gi && s.got).length;
    g.fillStyle = got ? 'rgba(235,232,225,.42)' : 'rgba(235,232,225,.16)';
    g.fillText(nm + ' · ' + got + '/' + total, c[0], c[1] + 104);
  });
  // сами звёзды
  skyStars.forEach((s, i) => {
    const hl = i === hover;
    if (s.got) {
      const R = hl ? 24 : 15;
      const rg = g.createRadialGradient(s.x, s.y, 0, s.x, s.y, R);
      rg.addColorStop(0, hl ? 'rgba(255,240,210,.75)' : 'rgba(143,208,255,.42)');
      rg.addColorStop(1, 'rgba(143,208,255,0)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(s.x, s.y, R, 0, TAU); g.fill();
      g.fillStyle = hl ? 'rgba(255,246,228,1)' : 'rgba(245,248,255,.92)';
      g.beginPath(); g.arc(s.x, s.y, hl ? 3.2 : 2.1, 0, TAU); g.fill();
    } else {
      g.fillStyle = hl ? 'rgba(235,232,225,.34)' : 'rgba(235,232,225,.13)';
      g.beginPath(); g.arc(s.x, s.y, 1.6, 0, TAU); g.fill();
    }
  });
}

function skyHitTest(ev) {
  const r = skyCanvas.getBoundingClientRect();
  const x = (ev.clientX - r.left) / r.width * SKY_LW;
  const y = (ev.clientY - r.top) / r.height * SKY_LH;
  let best = -1, bd = 20;
  skyStars.forEach((s, i) => {
    const d = hyp(s.x - x, s.y - y);
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}

function openSky() {
  const c = skyCaught(), tot = skyTotal();
  document.getElementById('skyCount').textContent = tr('skyCount', c, tot);
  const box = document.getElementById('skySparks');
  box.innerHTML = '';
  for (const s of SPARKS) {
    const need = sparkNeed(s);
    const el = document.createElement('div');
    el.className = 'spark' + (c >= need ? ' lit' : '');
    const st = sparkTxt(s);
    el.innerHTML = '<b>' + st[0] + '</b><span>' + (c >= need ? st[1] : tr('sparkLocked', need)) + '</span>';
    box.appendChild(el);
  }
  document.getElementById('skyCaption').textContent = tr('skyHint');
  renderSky(-1);
  skyScreen.classList.remove('hidden');
}

skyCanvas.addEventListener('pointermove', ev => {
  const i = skyHitTest(ev);
  const cap = document.getElementById('skyCaption');
  cap.textContent = i < 0 ? tr('skyHint')
    : skyStars[i].got ? '«' + skyStars[i].ph + '»' : tr('skyDark');
  renderSky(i);
});
document.getElementById('skyBtn').addEventListener('pointerdown', e => { e.stopPropagation(); openSky(); });
document.getElementById('skyBack').addEventListener('pointerdown', e => {
  e.stopPropagation();
  skyScreen.classList.add('hidden');
});

// ---------- состояния ----------
const titleScreen = document.getElementById('titleScreen');
const restScreen = document.getElementById('restScreen');
const deathScreen = document.getElementById('deathScreen');
const hud = document.getElementById('hud');

function startRun() {
  try {
    audioInit();
    if (A.ctx.state === 'suspended') A.ctx.resume();
  } catch (err) { console.warn('audio unavailable', err); }
  RUN = newRun();
  io.spirits = [];
  resetWorld(false);
  S.mode = 'play';
  titleScreen.classList.add('hidden');
  deathScreen.classList.add('hidden');
  restScreen.classList.add('hidden');
  skyScreen.classList.add('hidden');
  hud.classList.add('on');
  document.body.classList.add('playing');
  updateHud(); updateClock();
}

function levelUp() {
  RUN.xp -= RUN.xpNext;
  RUN.level++;
  RUN.xpNext = Math.round(8 + RUN.level * 5);
  S.mode = 'level';
  io.oc = false; ocBtn.classList.remove('held');
  document.body.classList.remove('playing');
  document.getElementById('restHead').textContent =
    tr('restHead', RUN.level, Math.max(1, Math.ceil(RUN.wake)), RUN.wakeMax);
  const box = document.getElementById('dreams');
  box.innerHTML = '';
  // тройка всегда свежая: дар, мелькнувший в последних пяти бросках, не выпадает
  // снова, пока память бросков не отпустит его
  let opts = [];
  for (let drop = 0; drop <= RUN.offerHist.length; drop++) {
    const banned = new Set();
    for (let i = drop; i < RUN.offerHist.length; i++)
      for (const id of RUN.offerHist[i]) banned.add(id);
    const pool = UPGRADES.filter(u => !(u.once && RUN.taken.includes(u.id)) && !banned.has(u.id));
    if (pool.length < 3 && drop < RUN.offerHist.length) continue; // отпустить старейший бросок
    opts = [];
    while (opts.length < 3 && pool.length) {
      const u = pool.splice((Math.random() * pool.length) | 0, 1)[0];
      if (u.rare && Math.random() < 0.5 && pool.length >= 3 - opts.length) continue;
      opts.push(u);
    }
    break;
  }
  RUN.offerHist.push(opts.map(u => u.id));
  if (RUN.offerHist.length > 5) RUN.offerHist.shift();
  let dIdx = 0;
  for (const u of opts) {
    const d = document.createElement('button');
    d.className = 'dream' + (u.rare ? ' rare' : '');
    d.dataset.key = String(++dIdx);
    d.innerHTML =
      '<span class="d-orb"><svg class="d-ring" viewBox="0 0 100 100">' +
      '<circle class="r1" cx="50" cy="50" r="46"/><circle class="r2" cx="50" cy="50" r="39"/></svg>' +
      '<span class="d-ic"><svg viewBox="0 0 24 24">' + (ICONS[u.id] || ICONS.spark) + '</svg></span></span>' +
      '<span class="d-name">' + upName(u) + '</span><span class="d-desc">' + upDesc(u) + '</span>';
    d.addEventListener('click', () => {
      u.apply(RUN);
      RUN.taken.push(u.id);
      syncSpirits();
      sfxChoice();
      S.mode = 'play';
      restScreen.classList.add('hidden');
      document.body.classList.add('playing');
      updateHud();
    }, { once: true });
    box.appendChild(d);
  }
  restScreen.classList.remove('hidden');
  updateHud();
}

function die() {
  S.mode = 'death';
  io.oc = false; ocBtn.classList.remove('held');
  document.body.classList.remove('playing');
  saveBest(RUN.night, RUN.thoughts);
  document.getElementById('deathNight').textContent = tr('deathNight', RUN.night, plural(RUN.night));
  document.getElementById('stNights').textContent = RUN.night;
  document.getElementById('stMoths').textContent = RUN.thoughts;
  document.getElementById('stKills').textContent = RUN.kills;
  document.getElementById('stDist').textContent = (RUN.dist / 1000).toFixed(1) + tr('distK');
  const sg = document.getElementById('skyGain');
  if (RUN.newStars > 0) {
    sg.textContent = tr('skyGain', RUN.newStars, starWord(RUN.newStars));
    sg.classList.remove('hidden');
  } else sg.classList.add('hidden');
  document.getElementById('deathQuote').textContent = pick(DEATH_QUOTES[LANG] || DEATH_QUOTES.ru);
  sfxCrash();
  S.shake = 1; S.glitch = 1;
  burst(io.x, io.y, IO_COL, 60, 500);
  setTimeout(() => deathScreen.classList.remove('hidden'), 1200);
  hud.classList.remove('on');
}

titleScreen.addEventListener('pointerdown', startRun);
document.getElementById('againBtn').addEventListener('click', e => {
  e.stopPropagation();
  startRun();
});

// ---------- панель настроек ----------
const setBtn = document.getElementById('setBtn');
const setPanel = document.getElementById('setPanel');
let pausedBySettings = false, resetArmed = false;

function applyLang() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-lines]')) {
    const keys = (TOUCH && el.dataset.i18nLinesTouch) || el.dataset.i18nLines;
    el.innerHTML = keys.split(',').map(k => tr(k)).join('<br>');
  }
  for (const [id, key] of [['btnTether', 'btnTether'], ['btnBlink', 'btnBlink'], ['ocBtn', 'ocBtn']]) {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('aria-label', tr(key)); el.setAttribute('title', tr(key)); }
  }
  showBestLine();
  updateHud(); updateClock();
  if (!setPanel.classList.contains('hidden'))
    document.getElementById('setReset').textContent = resetArmed ? tr('sResetSure') : tr('sReset');
}
function applyAudioSet() {
  if (!A.started) return;
  A.master.gain.value = 0.85 * SET.vol / 100;
  A.musicBus.gain.value = SET.music / 100;
  A.sfxBus.gain.value = SET.sfx / 100;
}
function applyQuality() {
  if (SET.quality === 'high') {        // сильному железу — больше пикселей
    OUT_PX = 4.2e6; SCENE_PX = 2.6e6;
    sceneScale = 1; maxScale = 1;
  } else if (SET.quality === 'low') {
    OUT_PX = 1.5e6; SCENE_PX = 0.85e6;
    sceneScale = 0.8; maxScale = 0.8;
  } else {                             // авто: потолки средние, остальное решает кадр
    OUT_PX = 2.6e6; SCENE_PX = 1.5e6;
    maxScale = 1;
  }
  resize();
}
function applyTouch() {
  document.body.classList.toggle('touch-left', SET.touchSide === 'left');
}
function applyHudMode() {
  document.body.classList.toggle('hud-lite', SET.hud === 'lite');
  document.body.classList.toggle('hud-off', SET.hud === 'off');
  elFps.classList.toggle('on', !!SET.fps);
}
function syncSetUI() {
  for (const [id, val] of [['segLang', LANG], ['segQual', SET.quality], ['segHud', SET.hud],
    ['segSide', SET.touchSide], ['segFps', SET.fps ? 'on' : 'off']])
    for (const b of document.querySelectorAll('#' + id + ' button'))
      b.classList.toggle('on', b.dataset.v === val);
  for (const [rid, vid, val] of [['rngVol', 'valVol', SET.vol], ['rngMusic', 'valMusic', SET.music],
    ['rngSfx', 'valSfx', SET.sfx], ['rngShake', 'valShake', SET.shake], ['rngFx', 'valFx', SET.fx]]) {
    document.getElementById(rid).value = val;
    document.getElementById(vid).textContent = val + '%';
  }
  document.getElementById('rngJoy').value = SET.joyR;
  document.getElementById('valJoy').textContent = SET.joyR;
  for (const b of document.querySelectorAll('#segJoyShow button'))
    b.classList.toggle('on', b.dataset.v === (SET.joyShow ? 'on' : 'off'));
}
function applySettings() {
  applyLang(); applyAudioSet(); applyQuality(); applyHudMode(); applyTouch(); syncSetUI();
}

function openSettings() {
  if (S.mode === 'play' && !S.paused) { // ночь ждёт, покуда открыты настройки
    S.paused = true; pausedBySettings = true;
    if (A.started) A.ctx.suspend();
  }
  resetArmed = false;
  document.getElementById('setReset').textContent = tr('sReset');
  syncSetUI();
  setPanel.classList.remove('hidden');
}
function closeSettings() {
  setPanel.classList.add('hidden');
  if (pausedBySettings) {
    pausedBySettings = false; S.paused = false;
    if (A.started) A.ctx.resume();
  }
}
setBtn.addEventListener('pointerdown', e => {
  e.stopPropagation();
  setPanel.classList.contains('hidden') ? openSettings() : closeSettings();
});
setPanel.addEventListener('pointerdown', e => e.stopPropagation());
document.getElementById('setClose').addEventListener('click', e => { e.stopPropagation(); closeSettings(); });

document.getElementById('segLang').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  LANG = SET.lang = b.dataset.v; saveSettings();
  applyLang(); syncSetUI();
});
document.getElementById('segQual').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.quality = b.dataset.v; saveSettings(); applyQuality(); syncSetUI();
});
document.getElementById('segHud').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.hud = b.dataset.v; saveSettings(); applyHudMode(); syncSetUI();
});
document.getElementById('segFps').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.fps = b.dataset.v === 'on'; saveSettings(); applyHudMode(); syncSetUI();
});
document.getElementById('segJoyShow').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.joyShow = b.dataset.v === 'on'; saveSettings(); syncSetUI();
});
document.getElementById('segSide').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.touchSide = b.dataset.v; saveSettings(); applyTouch(); syncSetUI();
});
for (const [rid, key, sound] of [['rngVol', 'vol', true], ['rngMusic', 'music', true],
  ['rngSfx', 'sfx', true], ['rngShake', 'shake', false], ['rngFx', 'fx', false],
  ['rngJoy', 'joyR', false]]) {
  document.getElementById(rid).addEventListener('input', e => {
    SET[key] = +e.target.value; saveSettings();
    if (sound) applyAudioSet();
    syncSetUI();
  });
}
// созвездие гасится в два нажатия — вещь необратимая
document.getElementById('setReset').addEventListener('click', e => {
  e.stopPropagation();
  if (!resetArmed) { resetArmed = true; e.currentTarget.textContent = tr('sResetSure'); return; }
  SKY = new Set(); saveSky();
  resetArmed = false;
  e.currentTarget.textContent = tr('sResetDone');
  showBestLine();
});

// ---------- цикл ----------
let last = performance.now();
// замер кадра по частям: ?perf=1
const PERF = { on: false, upd: 0, drw: 0, gl: 0, up: 0, frame: 0, n: 0 };
// адаптивное разрешение: скользящее среднее кадра с гистерезисом;
// вниз — быстро, вверх — осторожно и не выше проверенного потолка
let emaMs = 16.7, resPause = 2.5, maxScale = 1, lastUp = -99;
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  if (S.paused) return;
  if (S.mode === 'play') {
    emaMs += (dt * 1000 - emaMs) * 0.06;
    // когда кадр тяжелеет, первой уступает россыпь искр — её убыль незаметна
    partCap = emaMs > 26 ? 190 : emaMs > 20 ? 290 : 420;
  }
  if (S.mode === 'play' && SET.quality === 'auto') {
    resPause -= dt;
    if (resPause <= 0) {
      if (emaMs > 29 && sceneScale > 0.56) {
        if (S.time - lastUp < 9) maxScale = sceneScale; // вверх было рано — запомнить потолок
        sceneScale = Math.max(0.55, sceneScale - 0.15);
        resize(); resPause = 2; emaMs = 20;
      } else if (emaMs > 33 && sceneScale <= 0.56 && outCap > 1) {
        outCap = 1; // последний рубеж: выход в 1× (совсем слабое железо)
        resize(); resPause = 3; emaMs = 20;
      } else if (emaMs < 13.5 && sceneScale < maxScale - 0.01) {
        sceneScale = Math.min(maxScale, sceneScale + 0.15);
        lastUp = S.time;
        resize(); resPause = 3; emaMs = 20;
      }
    }
  }
  S.time += dt;
  if (PERF.on) {
    const t0 = performance.now();
    update(dt);
    const t1 = performance.now();
    draw();
    const t2 = performance.now();
    drawGL();
    const t3 = performance.now();
    PERF.upd += t1 - t0; PERF.drw += t2 - t1; PERF.gl += t3 - t2;
    PERF.frame += dt * 1000; PERF.n++;
    if (PERF.n >= 120) {
      const n = PERF.n;
      console.log('кадр ' + (PERF.frame / n).toFixed(2) + ' мс' +
        ' · update ' + (PERF.upd / n).toFixed(2) +
        ' · draw2d ' + (PERF.drw / n).toFixed(2) +
        ' · gl ' + (PERF.gl / n).toFixed(2) +
        ' (заливка ' + (PERF.up / n).toFixed(2) + ')' +
        ' · сцена ' + scene.width + '×' + scene.height +
        ' · сущностей ' + (enemies.length + motes.length + parts.length));
      PERF.upd = PERF.drw = PERF.gl = PERF.up = PERF.frame = 0; PERF.n = 0;
    }
  } else {
    update(dt);
    draw();
    drawGL();
  }
  hudTimer -= dt;
  if (hudTimer <= 0 && S.mode === 'play') {
    hudTimer = 0.25; updateClock(); updateHud();
    if (SET.fps) elFps.textContent =
      Math.round(1000 / Math.max(1, emaMs)) + ' fps · ' + emaMs.toFixed(1) + ' мс · ' +
      scene.width + '×' + scene.height;
  }
}

if (document.fonts && document.fonts.load) {
  // спрайты фраз пекутся на лету — шрифт должен быть готов заранее
  document.fonts.load('400 48px "SAO UI"');
  document.fonts.load('400 60px "SAO UI"');
}
applySettings();
resetWorld(true);
requestAnimationFrame(frame);

// отладка: ?auto=1&t=0.5&night=4&d=3
{
  const q = new URLSearchParams(location.search);
  if (q.get('lang')) { // отладка языка: не записывая выбор в память
    LANG = SET.lang = q.get('lang') === 'en' ? 'en' : 'ru';
    applyLang(); syncSetUI();
  }
  if (q.get('perf')) PERF.on = true;
  if (q.get('tlog')) setInterval(() => {   // отладка нити: видно ли движение под нею
    if (!io.tether) { console.log('нити нет'); return; }
    const sh = io.tether;
    const ax = sh.x - sh.dir * 60 * sh.scl, ay = sh.y - 30 * sh.scl;
    console.log('НИТЬ: от кормы ' + hyp(io.x - ax, io.y - ay).toFixed(0) +
      ' · цель за ' + hyp(steerTX - io.x, steerTY - io.y).toFixed(0) +
      ' · скорость ' + hyp(io.vx, io.vy).toFixed(0));
  }, 500);
  if (q.get('nofade')) { // отладка: снимки без плавных переходов
    const st = document.createElement('style');
    st.textContent = '*{transition:none !important;animation:none !important}';
    document.head.appendChild(st);
  }
  if (q.get('joysim')) { // отладка джойстика: наклон стика без живого пальца
    const p = q.get('joysim').split(',').map(Number);
    SET.joyShow = true;
    setTimeout(() => {
      TOUCH = true; document.body.classList.add('touch');
      joyStart({ clientX: W / 2, clientY: H * 0.62 });
      joyMove({ clientX: W / 2 + (p[0] || 0), clientY: H * 0.62 + (p[1] || 0) });
    }, 900);
  }
  if (q.get('q')) { SET.quality = q.get('q'); applyQuality(); }
  if (q.get('touch')) { // отладка тач-раскладки на настольном браузере
    TOUCH = true;
    document.body.classList.add('touch');
    applyLang(); syncSetUI();
  }
  if (q.get('set')) setTimeout(openSettings, 300);
  if (q.get('sky')) { // отладка созвездия: зажечь часть звёзд, памяти не трогая
    skyGroups().forEach((tier, gi) => tier.forEach((p, pi) => { if ((pi + gi) % 2 === 0) SKY.add(p); }));
    setTimeout(openSky, 300);
  }
  if (q.get('auto')) {
    setTimeout(() => {
      startRun();
      const nn = parseInt(q.get('night'));
      if (!isNaN(nn)) RUN.night = nn;
      const tt = parseFloat(q.get('t'));
      if (!isNaN(tt)) S.t = clamp(tt, 0, 0.999);
      const dd = parseFloat(q.get('d'));
      if (!isNaN(dd)) S.playT = dd * 70;
      const tx2 = parseFloat(q.get('tx')), ty2 = parseFloat(q.get('ty'));
      if (!isNaN(tx2)) { io.x = tx2; cam.x = tx2; }
      if (!isNaN(ty2)) { io.y = ty2; cam.y = ty2; }
      for (let i = 0; i < 10; i++) spawnMote(true);
      spawnShip(); spawnShip();
      ships.forEach(sh => { const p = spawnRing(200, viewR() * 0.7); sh.x = p.x; sh.y = p.y; });
      if (q.get('web')) webs.push({ x: io.x + 200, y: io.y + 150, r: 95, t: 1, life: 16, seed: 1 });
      for (const ty of (q.get('foes') ? q.get('foes').split(',') : ['nm', 'shade', 'dasher', 'siren', 'eater', 'antio'])) {
        spawnEnemy(ty);
        const e = enemies[enemies.length - 1];
        if (e) { const p = spawnRing(180, viewR() * 0.75); e.x = p.x; e.y = p.y; }
      }
      if (q.get('bolt')) { spawnBolt(); bolts[0].t = parseFloat(q.get('bolt')) || 0; }
      if (q.get('tether')) { // отладка нити: корабль под боком и нить уже брошена
        spawnShip();
        const sh = ships[ships.length - 1];
        sh.near = true; sh.scl = 1; sh.x = io.x + 150; sh.y = io.y - 40; sh.vx = 18;
        toggleTether();
        for (const e of enemies) { e.x = io.x + 60; e.y = io.y - 20; }
      }
      if (q.get('lvl')) levelUp();
      if (q.get('wave')) { WAVE.timer = 0.5; S.playT = Math.max(S.playT, 26); }
      if (q.get('boss')) {
        spawnBoss();
        boss.x = io.x + 340; boss.y = io.y - 60; boss.dir = -1;
        const bst = q.get('boss');
        if (bst === 'lantern') { boss.st = 'lantern'; boss.stT = 30; boss.open = 1; }
        if (bst === 'volley') { boss.st = 'volley'; boss.stT = 30; boss.volley = 3; boss.volleyT = 0.2; }
      }
    }, 800);
  }
}

})();
