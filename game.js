/* ============================================================
   третья ночь — игра про то, как не спать
   killu · 2026
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
// Русский — родной голос игры, английский и немецкий идут следом; всё видимое
// проходит через tr(), а настройки живут в localStorage.
// ============================================================
// Раскладка правится игроком, оттого живёт в настройках, а не в коде.
// Клавиши хранятся строчными латинскими, а нажатие приводится к ним через
// e.code: иначе кириллица и Shift давали бы совсем другие буквы, и раскладка
// ломалась бы у всякого, кто пишет не по-английски.
const DEFAULT_KEYS = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD',
  tether: 'KeyQ', blink: 'KeyR', charge: 'KeyE', halt: 'Mouse0',
};
const DEFAULT_SET = {
  lang: 'ru', vol: 85, music: 100, sfx: 100,
  quality: 'auto', shake: 100, fx: 100, hud: 'full', fps: false,
  text: true,           // летучие строки мира — по желанию гасятся целиком
  steer: 'keys',        // чем править на ПК: 'keys' — WASD, 'mouse' — за прицелом
  keys: Object.assign({}, DEFAULT_KEYS),
  touchSide: 'right', joyR: 78, joyShow: false,
  // облики: четыре гнезда-выбора да три слоя-переключателя — они складываются
  visuals: { trail: 'default', shell: 'default', spirits: 'default', halo: 'default',
    dust: false, ring: false, emberSp: false },
};
let SET = loadSettings();
let LANG = SET.lang;

function loadSettings() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem('io-noch-set')) || {}; } catch (_) {}
  const out = Object.assign({}, DEFAULT_SET, s);
  out.visuals = Object.assign({}, DEFAULT_SET.visuals, s.visuals); // облики — гнездом
  out.keys = Object.assign({}, DEFAULT_KEYS, s.keys);              // раскладка — тоже
  if (!['ru', 'en', 'de'].includes(out.lang)) out.lang = 'ru';
  if (out.steer !== 'keys' && out.steer !== 'mouse') out.steer = 'keys';
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
    bossWhale: 'левиафан бессонницы всплывает из глуби',
    bossWhaleEat: 'левиафан глотает мысли',
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
    // — жители ночи —
    lm_lighthouse: 'уснувший фонарь',
    lm_lighthouse_lit: 'фонарь разгорелся — в свете его бодрость тает вдвое медленней',
    lm_graveyard: 'кладбище кораблей',
    lm_graveyard_hint: 'мысли меж рёбер сытнее вдвое',
    lm_whale: 'небесный кит',
    lm_lamplighter: 'фонарщик',
    lm_starfall: 'звездопад',
    lm_star: 'уснувшая звезда',
    lm_star_hint: 'побудь рядом — разбуди её, коли отважишься',
    lm_star_wake: 'звезда пробудилась — и ночь глядит на вас',
    lm_pedlar: 'сонный меняла',
    lm_pedlar_amber: n => n + ' мыслей — за глоток бодрости',
    lm_pedlar_violet: n => n + ' бодрости — за горсть мыслей',
    lm_pedlar_done: 'меняла кланяется и правит прочь',
    lm_pedlar_poor: 'меняла качает головой — вам нечем платить',
    lm_nest: 'гнездо кошмаров',
    lm_nest_hint: 'задержись подле — и выжги его',
    lm_nest_cry: 'гнездо кричит',
    lm_nest_done: 'гнездо погасло',
    hint_intro: 'ночь бесконечна, и ты в ней — огонёк',
    hint_motes: 'лови мысли — они одни держат наяву',
    hint_wake: 'бодрость тает; иссякнет — растворишься',
    hint_foe: 'кошмары чуют свет — уводи его прочь',
    // — HUD —
    thoughts: n => 'мысли · ' + n,
    tierN: n => 'уровень ' + n,
    chain: n => 'серия ×' + n,
    keyMouse: 'ЛКМ', keyMouse2: 'ПКМ', keySpace: 'пробел', keyShift: 'shift', secShort: 'с',
    wakeLabel: 'силы',
    ocBtn: 'ускорение',
    bossName: 'корабль-кошмар',
    bossNameWhale: 'левиафан бессонницы',
    distK: 'к',
    // — экраны —
    titleBig: 'бесконечная\u00a0ночь',
    titleSub: 'роглайк о шарике света, которому не спится',
    btnTether: 'трос',
    btnBlink: 'рывок',
    sTouch: 'палец',
    sTouchSide: 'сторона кнопок',
    sideRight: 'справа', sideLeft: 'слева',
    sJoyR: 'размер джойстика',
    sJoyShow: 'показывать джойстик',
    titleHint: 'нажмите на огонёк',
    mPlay: 'играть',
    mSky: 'созвездие',
    mSkyN: (c, t) => 'созвездие · ' + c + '/' + t,
    mMeta: 'улучшения',
    mSkins: 'внешний вид',
    mTutor: 'обучение',
    mBoard: 'таблица',
    bd_head: 'таблица лидеров',
    bd_world: n => 'общая таблица · ' + n,
    bd_local: 'локальная таблица — общая появится, когда в настройках указан адрес сервера',
    bd_off: 'сервер не указан — сохраняются только ваши результаты',
    bd_login: 'войти',
    bd_reg: 'создать аккаунт',
    bd_out: 'выйти',
    bd_name_ph: 'имя',
    bd_pass_ph: 'пароль',
    bd_col_place: '№', bd_col_name: 'игрок', bd_col_nights: 'ночей', bd_col_thoughts: 'мыслей',
    bd_empty: 'таблица пуста — ваш забег станет первым',
    bd_wait: 'загрузка…',
    bd_fail: 'сервер не отвечает',
    bd_hi: n => 'вы вошли как ' + n,
    bd_sent: n => 'результат отправлен · место ' + n,
    bd_sent_no: 'отправлено; прошлый результат был лучше',
    bd_guest: 'вы играете без аккаунта — результаты сохраняются только здесь',
    bd_you: 'вы',
    sBoard: 'адрес сервера таблицы',
    sBoardHint: 'пусто — общей таблицы нет, только свои результаты',
    wd_head: 'внешний вид',
    wd_sub: 'украшения за созвездия · на игру не влияют',
    wd_count: (n, t) => 'открыто ' + n + ' из ' + t,
    wd_grp_shell: 'оболочка — цвет света',
    wd_grp_trail: 'след',
    wd_grp_spirits: 'спириты',
    wd_grp_halo: 'ореолы',
    wd_worn: 'надето · снять',
    wd_have: 'открыто · надеть',
    wd_new: n2 => 'новый облик — «' + n2 + '»',
    wd_lock_theme: n2 => 'нужно собрать созвездие «' + n2 + '»',
    wd_lock_themes: n2 => 'нужно собрать созвездий: ' + n2,
    wd_lock_phr: n2 => 'нужно поймать фраз: ' + n2,
    titleVer: 'killu · ответвление «третьей ночи» · лучше в наушниках',
    bestLine: (n, t, p) => 'лучший забег · ' + n + ' ноч' + p + ' · ' + t + ' мыслей',
    restHead: (lvl, w, mx) => 'уровень ' + lvl + ' · силы ' + w + ' из ' + mx,
    restBig: 'улучшение',
    restSub: 'выберите одно улучшение · клавиши 1 · 2 · 3',
    deathBig: 'вы растворились в ночи',
    deathNight: (n, p) => 'вы продержались ' + n + ' ноч' + p,
    stNights: 'ночей прожито',
    stThoughts: 'мыслей собрано',
    stKills: 'кошмаров рассеяно',
    stDist: 'пройдено',
    stTime: 'ночь длилась',
    stWaves: 'волн отбито',
    stShips: 'кораблей потоплено',
    stStars: 'звёзд открыто',
    stLevel: 'уровень',
    stBest: 'рекорд',
    starLit: 'новая звезда зажглась в созвездии',
    themeDone: r => 'созвездие собрано · ' + r + ' — ваш',
    skyEquip: 'надеть',
    skyWorn: 'надето',
    purseHead: 'мысли идут в копилку',
    deathSkip: 'нажмите, чтобы пропустить',
    deathVoid: 'бездна забрала и корабль, и привязь.',
    titleBtn: 'в меню',
    againBtn: 'играть снова',
    pauseTxt: 'пауза',
    pauseSub: 'esc — продолжить',
    // — созвездие —
    skyHead: 'созвездие пойманных фраз',
    skyBtn: (c, t) => 'созвездие · ' + c + ' из ' + t + ' фраз',
    skyBtnEmpty: 'созвездие пойманных фраз',
    skyCount: (c, t) => c + ' из ' + t,
    skyHint: 'наведите на звезду, чтобы увидеть фразу',
    skyDark: 'звезда ещё не открыта',
    sparkLocked: n => 'зажжётся на ' + n + '-й фразе',
    skyGain: (n, w) => 'созвездие пополнилось · ' + n + ' ' + w,
    skyBack: 'назад',
    // — настройки —
    settings: 'настройки',
    sLang: 'язык',
    sSound: 'звук',
    sVol: 'общая громкость',
    sMusic: 'музыка',
    sSfx: 'звуки',
    sPicture: 'графика',
    sQuality: 'качество',
    qAuto: 'авто', qHigh: 'высокое', qLow: 'низкое',
    sShake: 'тряска экрана',
    sFx: 'помехи и зернистость',
    sHud: 'интерфейс',
    sFps: 'счётчик кадров',
    sOn: 'вкл', sOff: 'выкл',
    hFull: 'полный', hLite: 'только полосы', hOff: 'скрыт',
    sControls: 'управление',
    sSteer: 'как двигаться',
    steerKeys: 'клавишами',
    steerMouse: 'за курсором',
    sSteerHint: 'клавишами — свет летит, пока клавиша нажата; за курсором — как раньше, свет всё время тянется к прицелу',
    sKeys: 'клавиши',
    sKeysHint: 'нажмите строку, затем новую клавишу; правая и левая кнопки мыши тоже подойдут',
    sKeyWait: 'нажмите клавишу…',
    sKeyReset: 'вернуть как было',
    sKeyBusy: 'эта клавиша занята игрой',
    act_up: 'вверх', act_down: 'вниз', act_left: 'влево', act_right: 'вправо',
    act_tether: 'трос', act_blink: 'рывок', act_charge: 'ускорение', act_halt: 'остановиться',
    sText: 'летающие надписи',
    sTextHint: 'фразы и вести ночи, всплывающие поверх игры',
    sMemory: 'сохранения',
    sReset: 'сбросить созвездие',
    sResetHint: 'сотрёт все пойманные фразы — навсегда',
    sResetSure: 'точно? нажмите ещё раз',
    sResetDone: 'созвездие сброшено',
    sClose: 'закрыть',
    sHintPause: 'игра на паузе, пока открыты настройки',
  },
  en: {
    bossComes: 'the nightmare ship sails the sky',
    bossWhale: 'the leviathan of sleeplessness rises from the deep',
    bossWhaleEat: 'the leviathan swallows thoughts',
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
    lm_lighthouse: 'the sleeping lantern',
    lm_lighthouse_lit: 'the lantern flares — wakefulness fades half as slow in its light',
    lm_graveyard: 'the ship graveyard',
    lm_graveyard_hint: 'thoughts among the ribs heal twice as much',
    lm_whale: 'the sky whale',
    lm_lamplighter: 'the lamplighter',
    lm_starfall: 'starfall',
    lm_star: 'a sleeping star',
    lm_star_hint: 'linger close — wake her, if you dare',
    lm_star_wake: 'the star awakens — and the night is watching',
    lm_pedlar: 'the drowsy pedlar',
    lm_pedlar_amber: n => n + ' thoughts — for a sip of wakefulness',
    lm_pedlar_violet: n => n + ' wakefulness — for a handful of thoughts',
    lm_pedlar_done: 'the pedlar bows and steers away',
    lm_pedlar_poor: 'the pedlar shakes his head — you have nothing to pay',
    lm_nest: 'a nightmare nest',
    lm_nest_hint: 'linger close — and burn it out',
    lm_nest_cry: 'the nest cries out',
    lm_nest_done: 'the nest is put out',
    hint_intro: 'the night is endless, and you are a wisp within it',
    hint_motes: 'catch thoughts — they alone keep you awake',
    hint_wake: 'wakefulness fades; run dry — and you dissolve',
    hint_foe: 'nightmares smell the light — lead it away',
    thoughts: n => 'thoughts · ' + n,
    tierN: n => 'tier ' + n,
    chain: n => 'chain ×' + n,
    keyMouse: 'LMB', keyMouse2: 'RMB', keySpace: 'space', keyShift: 'shift', secShort: 's',
    wakeLabel: 'wakefulness',
    ocBtn: 'charge',
    bossName: 'the nightmare ship',
    bossNameWhale: 'the leviathan',
    distK: 'k',
    titleBig: 'endless\u00a0night',
    titleSub: 'a roguelike about a wisp that cannot sleep',
    btnTether: 'thread',
    btnBlink: 'blink',
    sTouch: 'finger',
    sTouchSide: 'button side',
    sideRight: 'right', sideLeft: 'left',
    sJoyR: 'joystick size',
    sJoyShow: 'show the joystick',
    titleHint: 'touch the wisp',
    mPlay: 'kindle',
    mSky: 'constellation',
    mSkyN: (c, t) => 'constellation · ' + c + '/' + t,
    mMeta: 'casket',
    mSkins: 'guises',
    mTutor: 'how to play',
    mBoard: 'chronicle',
    bd_head: 'chronicle of sleepless nights',
    bd_world: n => 'world board · ' + n,
    bd_local: 'a local chronicle: the world board stays silent until its address is set in the settings',
    bd_off: 'no world chronicle is set — only your own runs are kept',
    bd_login: 'enter',
    bd_reg: 'take a name',
    bd_out: 'leave',
    bd_name_ph: 'name',
    bd_pass_ph: 'pass',
    bd_col_place: '#', bd_col_name: 'name', bd_col_nights: 'nights', bd_col_thoughts: 'thoughts',
    bd_empty: 'the chronicle is empty — the first sleepless night will be its first line',
    bd_wait: 'reading the chronicle…',
    bd_fail: 'the chronicle did not answer',
    bd_hi: n => 'welcome, ' + n,
    bd_sent: n => 'written into the chronicle · place ' + n,
    bd_sent_no: 'written; an earlier run was better',
    bd_guest: 'you play without a name — the run stays with you',
    bd_you: 'you',
    sBoard: 'chronicle address',
    sBoardHint: 'empty — no world board, only your own runs',
    wd_head: 'guises of the night',
    wd_sub: 'beauty earned by constellations · never touches your strength',
    wd_count: (n, t) => n + ' of ' + t + ' earned',
    wd_grp_shell: 'shell — the hue of light',
    wd_grp_trail: 'trail',
    wd_grp_spirits: 'spirits',
    wd_grp_halo: 'halos',
    wd_worn: 'worn · take off',
    wd_have: 'earned · put on',
    wd_new: n2 => 'the wardrobe grows — "' + n2 + '"',
    wd_lock_theme: n2 => 'the "' + n2 + '" constellation is not yet full',
    wd_lock_themes: n2 => 'complete full trial constellations: ' + n2,
    wd_lock_phr: n2 => 'catch phrases for the sky: ' + n2,
    titleVer: 'killu · a roguelike offshoot of "the third night" · headphones are essential',
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
    stTime: 'the night lasted',
    stWaves: 'tides repelled',
    stShips: 'ships sunk',
    stStars: 'stars kindled',
    stLevel: 'degree of light',
    stBest: 'record',
    starLit: 'a new star is lit in the constellation',
    themeDone: r => 'the constellation is full · ' + r + ' is yours',
    skyEquip: 'wear',
    skyWorn: 'worn',
    purseHead: 'thoughts pour into the casket',
    deathSkip: 'press to skip',
    deathVoid: 'the void took both the ship and its tether.',
    titleBtn: 'to the title',
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
    sControls: 'controls',
    sSteer: 'movement',
    steerKeys: 'keys',
    steerMouse: 'follow cursor',
    sSteerHint: 'keys — the light flies while a key is held; cursor — as before, the light always drifts to the aim',
    sKeys: 'keys',
    sKeysHint: 'click a row, then press a new key; mouse buttons work too',
    sKeyWait: 'press a key…',
    sKeyReset: 'restore defaults',
    sKeyBusy: 'that key belongs to the game',
    act_up: 'up', act_down: 'down', act_left: 'left', act_right: 'right',
    act_tether: 'thread', act_blink: 'blink', act_charge: 'charge', act_halt: 'hold still',
    sText: 'floating text',
    sTextHint: 'phrases and tidings of the night that surface over the game',
    sMemory: 'memory',
    sReset: 'extinguish the constellation',
    sResetHint: 'erases every caught phrase and memory spark — for good',
    sResetSure: 'certain? press again',
    sResetDone: 'the constellation is dark again',
    sClose: 'close',
    sHintPause: 'the night waits while settings are open',
  },
  de: {
    // — inschriften der welt —
    bossComes: 'das albtraumschiff zieht über den himmel',
    bossWhale: 'der leviathan der schlaflosigkeit steigt aus der tiefe',
    bossWhaleEat: 'der leviathan verschlingt gedanken',
    bossFled: 'der morgen vertrieb das albtraumschiff',
    tether: 'der faden ist fest gespannt',
    hintTether: 'ein schiff ist nah — wirf den faden: er bindet und versengt die nacht',
    sling: 'schwung',
    snap: 'der faden riss',
    secondWind: 'zweiter atem',
    dew: 'morgentau',
    dawnLine: 'morgenrot — und der tag huscht vorüber',
    star: 'ein gefallener stern',
    waveIn: n => 'woge ' + n + ' — die nacht steigt',
    waveOut: 'die woge wich — atme',
    twinDown: 'der dunkle zwilling erlosch',
    rod: 'blitzableiter',
    nightText: (n, storm) => (storm ? 'sturm · nacht ' : 'nacht ') + n,
    // — bewohner der nacht —
    lm_lighthouse: 'die schlafende laterne',
    lm_lighthouse_lit: 'die laterne flammt auf — in ihrem schein schwindet wachheit halb so rasch',
    lm_graveyard: 'der schiffsfriedhof',
    lm_graveyard_hint: 'gedanken zwischen den rippen laben doppelt',
    lm_whale: 'der himmelswal',
    lm_lamplighter: 'der laternenanzünder',
    lm_starfall: 'sternfall',
    lm_star: 'ein schlafender stern',
    lm_star_hint: 'weile nahebei — wecke ihn, wenn du dich getraust',
    lm_star_wake: 'der stern erwacht — und die nacht schaut euch an',
    lm_pedlar: 'der schläfrige krämer',
    lm_pedlar_amber: n => n + ' gedanken — für einen schluck wachheit',
    lm_pedlar_violet: n => n + ' wachheit — für eine handvoll gedanken',
    lm_pedlar_done: 'der krämer verneigt sich und zieht davon',
    lm_pedlar_poor: 'der krämer schüttelt den kopf — du hast nichts zum zahlen',
    lm_nest: 'ein albtraumnest',
    lm_nest_hint: 'weile nahebei — und brenne es aus',
    lm_nest_cry: 'das nest schreit auf',
    lm_nest_done: 'das nest ist erloschen',
    hint_intro: 'die nacht ist endlos, und du darin — ein lichtlein',
    hint_motes: 'fange gedanken — sie allein halten dich wach',
    hint_wake: 'wachheit schwindet; versiegt sie, so zerrinnst du',
    hint_foe: 'albträume wittern licht — führe es fort',
    // — HUD —
    thoughts: n => 'gedanken · ' + n,
    tierN: n => 'stufe ' + n,
    chain: n => 'folge ×' + n,
    keyMouse: 'LMT', keyMouse2: 'RMT', keySpace: 'leertaste', keyShift: 'shift', secShort: 's',
    wakeLabel: 'wachheit',
    ocBtn: 'ladung',
    bossName: 'das albtraumschiff',
    bossNameWhale: 'der leviathan',
    distK: 'k',
    // — bildschirme —
    titleBig: 'endlose\u00a0nacht',
    titleSub: 'ein roguelike um ein lichtlein, das keinen schlaf findet',
    btnTether: 'faden',
    btnBlink: 'flackern',
    sTouch: 'finger',
    sTouchSide: 'tastenseite',
    sideRight: 'rechts', sideLeft: 'links',
    sJoyR: 'steuerkreis',
    sJoyShow: 'steuerkreis zeigen',
    titleHint: 'berühre das lichtlein',
    mPlay: 'entflammen',
    mSky: 'sternbild',
    mSkyN: (c, t) => 'sternbild · ' + c + '/' + t,
    mMeta: 'schatulle',
    mSkins: 'gewänder',
    mTutor: 'anleitung',
    mBoard: 'chronik',
    bd_head: 'chronik der schlaflosen nächte',
    bd_world: n => 'welttafel · ' + n,
    bd_local: 'eine hiesige chronik: die welttafel schweigt, bis ihre adresse in den einstellungen steht',
    bd_off: 'keine weltchronik angegeben — nur deine eigenen läufe bleiben',
    bd_login: 'eintreten',
    bd_reg: 'namen nehmen',
    bd_out: 'hinausgehen',
    bd_name_ph: 'name',
    bd_pass_ph: 'losung',
    bd_col_place: '№', bd_col_name: 'name', bd_col_nights: 'nächte', bd_col_thoughts: 'gedanken',
    bd_empty: 'die chronik ist leer — die erste schlaflose nacht wird ihre erste zeile',
    bd_wait: 'die chronik wird gelesen…',
    bd_fail: 'die chronik antwortete nicht',
    bd_hi: n => 'sei gegrüßt, ' + n,
    bd_sent: n => 'in die chronik geschrieben · platz ' + n,
    bd_sent_no: 'geschrieben; ein früherer lauf war besser',
    bd_guest: 'du spielst ohne namen — der lauf bleibt bei dir',
    bd_you: 'du',
    sBoard: 'adresse der chronik',
    sBoardHint: 'leer — keine welttafel, nur eigene läufe',
    wd_head: 'gewänder der nacht',
    wd_sub: 'zier aus sternbildern · an deiner kraft ändert sie nichts',
    wd_count: (n, t) => n + ' von ' + t + ' errungen',
    wd_grp_shell: 'hülle — farbe des lichts',
    wd_grp_trail: 'spur',
    wd_grp_spirits: 'geister',
    wd_grp_halo: 'lichthöfe',
    wd_worn: 'getragen · ablegen',
    wd_have: 'errungen · anlegen',
    wd_new: n2 => 'die garderobe wächst — „' + n2 + '“',
    wd_lock_theme: n2 => 'das sternbild „' + n2 + '“ ist noch nicht voll',
    wd_lock_themes: n2 => 'vollende so viele prüfungsbilder: ' + n2,
    wd_lock_phr: n2 => 'fange so viele sätze fürs sternbild: ' + n2,
    titleVer: 'killu · ein roguelike-seitenzweig der „dritten nacht“ · kopfhörer sind vonnöten',
    bestLine: (n, t) => 'trefflichste schlaflosigkeit · ' + n + (n === 1 ? ' nacht · ' : ' nächte · ') + t + ' gedanken',
    restHead: (lvl, w, mx) => 'stufe ' + lvl + ' · wachheit ' + w + ' von ' + mx,
    restBig: 'gabe der schlaflosigkeit',
    restSub: 'die nacht wartet — wähle eine · tasten 1 · 2 · 3',
    deathBig: 'du zerrannst in der nacht',
    deathNight: n => 'deine schlaflosigkeit währte ' + n + (n === 1 ? ' nacht' : ' nächte'),
    stNights: 'nächte bestanden',
    stThoughts: 'gedanken gefangen',
    stKills: 'albträume zerstreut',
    stDist: 'himmel durchmessen',
    stTime: 'die nacht währte',
    stWaves: 'wogen abgewehrt',
    stShips: 'schiffe versenkt',
    stStars: 'sterne entfacht',
    stLevel: 'stufe des lichts',
    stBest: 'rekord',
    starLit: 'ein neuer stern flammt im sternbild auf',
    themeDone: r => 'das sternbild ist voll · ' + r + ' ist dein',
    skyEquip: 'anlegen',
    skyWorn: 'getragen',
    purseHead: 'gedanken rieseln in die schatulle',
    deathSkip: 'drücke zum überspringen',
    deathVoid: 'die leere nahm schiff und faden zugleich.',
    titleBtn: 'zum titel',
    againBtn: 'aufs neue entflammen',
    pauseTxt: 'pause',
    pauseSub: 'esc — zurück in die nacht',
    // — sternbild —
    skyHead: 'sternbild gefangener sätze',
    skyBtn: (c, t) => 'sternbild · ' + c + ' von ' + t + ' sätzen',
    skyBtnEmpty: 'sternbild gefangener sätze',
    skyCount: (c, t) => c + ' von ' + t,
    skyHint: 'weise auf einen stern — er erinnert sich seines satzes',
    skyDark: 'dieser stern ist noch nicht entfacht',
    sparkLocked: n => 'entflammt beim ' + n + '. satz',
    skyGain: (n, w) => 'das sternbild wuchs · ' + n + ' ' + w,
    skyBack: 'zurück in die nacht',
    // — einstellungen —
    settings: 'einstellungen',
    sLang: 'sprache',
    sSound: 'klang',
    sVol: 'lautstärke',
    sMusic: 'musik',
    sSfx: 'geräusche',
    sPicture: 'bild',
    sQuality: 'güte',
    qAuto: 'auto', qHigh: 'hoch', qLow: 'niedrig',
    sShake: 'bildzittern',
    sFx: 'flimmern und korn',
    sHud: 'anzeigen',
    sFps: 'bildzähler',
    sOn: 'an', sOff: 'aus',
    hFull: 'alles', hLite: 'nur balken', hOff: 'verborgen',
    sControls: 'steuerung',
    sSteer: 'bewegung',
    steerKeys: 'tasten',
    steerMouse: 'dem zeiger folgen',
    sSteerHint: 'tasten — das licht fliegt, solange die taste gedrückt ist; zeiger — wie zuvor, das licht strebt stets zum ziel',
    sKeys: 'tasten',
    sKeysHint: 'zeile anklicken, dann neue taste drücken; maustasten gehen auch',
    sKeyWait: 'taste drücken…',
    sKeyReset: 'zurücksetzen',
    sKeyBusy: 'diese taste gehört dem spiel',
    act_up: 'hoch', act_down: 'runter', act_left: 'links', act_right: 'rechts',
    act_tether: 'faden', act_blink: 'flackern', act_charge: 'ladung', act_halt: 'stillstehen',
    sText: 'fliegende schrift',
    sTextHint: 'sätze und kunde der nacht, die über dem spiel aufsteigen',
    sMemory: 'erinnerung',
    sReset: 'sternbild löschen',
    sResetHint: 'tilgt alle gefangenen sätze und erinnerungsfunken — für immer',
    sResetSure: 'gewiss? drücke noch einmal',
    sResetDone: 'das sternbild ist wieder dunkel',
    sClose: 'schließen',
    sHintPause: 'die nacht wartet, solange die einstellungen offen sind',
  },
};

// звёзды-слова во множественном числе — по-русски трояко, в прочих языках двояко
function starWord(n) {
  if (LANG === 'en') return n === 1 ? 'new star' : 'new stars';
  if (LANG === 'de') return n === 1 ? 'neuer stern' : 'neue sterne';
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
  de: [
    [
      'die milch kochte vor drei tagen über',
      'das licht im flur brennt ganz umsonst',
      'morgen — das ist schon heute',
      'das kissen ist auf beiden seiten kalt',
      'der schlaf steht an der haltestelle und steigt doch nicht ein',
      'im haus gegenüber schläft man ebenfalls nicht',
      'der kessel ward kalt, und ich bemerkte es nicht',
      'die stille klingt ein wenig',
    ],
    [
      'schiffe fahren über den himmel',
      'die decke atmet — dies ist ganz gewöhnlich',
      'vier uhr morgens ist ein ort, keine zeit',
      'die sterne sind nichts als nadellöcher',
      'alle städte treiben heute nacht',
      'die augen schließen sich verkehrt herum',
      'der akku steht bei neun prozent, und ich desgleichen',
      'gedanken drehen sich wie ein ventilator',
      'ich bin ein kleines kügelchen licht',
      'der faden zittert, doch er hält',
    ],
    [
      'MEIN HERZ KLOPFT WIE DER BASS',
      'lauter. noch lauter, mein herr',
      'ich trank das licht aus dem kühlschrank',
      'meine haut erinnert sich jedes liedes',
      'die zeit zieht in wellen',
      'ich bin eine antenne für fremde signale',
      'die nacht riecht nach erdbeerbrause',
      'SCHLAF NICHT SCHLAF NICHT SCHLAF NICHT',
      'die funken kennen den heimweg',
      'ich leuchte — mithin bin ich',
    ],
    [
      'ALLES LEUCHTET VON INNEN',
      'ICH BIN NICHT MÜDE, ICH BIN ENDLOS',
      'DER HIMMEL BIRST AN ALLEN NÄHTEN',
      'HALT DICH ANS LICHT',
      'NUR NOCH EIN WEILCHEN, MEIN HERR',
      'WIR SIND BEINAHE DA',
    ],
    [
      'still. gleich ist es so weit',
      'die schiffe liegen an ihren kais',
      'das licht vergibt einem jeden',
      'du darfst die augen schließen',
    ],
  ],
};
// фраза, что мыслями не ловится вовсе, — её добывают делом
const DEEDS = {
  ru: ['КОРАБЛЬ-КОШМАР ПОШЁЛ КО ДНУ', 'ЛЕВИАФАН УСНУЛ НАВЕКИ'],
  en: ['THE NIGHTMARE SHIP HAS GONE DOWN', 'THE LEVIATHAN SLEEPS FOREVER'],
  de: ['DAS ALBTRAUMSCHIFF IST GESUNKEN', 'DER LEVIATHAN SCHLÄFT AUF EWIG'],
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
//
// Точность здесь непременно highp, а зерно шума вдобавок заворачивается по
// клетке. Причина тому вот какая: авроры смещаются вслед за камерой, и довод
// sin() в хеше растёт вместе с пройденным путём. В mediump (а это на живом
// железе половинная точность, предел 65504) тысяч через сто пикселей довод
// перерастал предел, обращался в бесконечность, а из неё — в NaN. Небо от
// того чернело ровнёхонькой вертикальной чертою, что ползла вслед за камерой:
// слева от черты довод ещё влезал, справа — уже нет. Заворот по 120 клеткам
// держит довод в узде навсегда и швов не даёт вовсе: клетка 120-я хешируется
// как нулевая, оттого стык сходится сам собою.
const SKY_FSH = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime;
uniform vec3 uSkyA, uSkyB, uAur, uTint;
uniform float uAurI; uniform vec2 uCam;
float hash(vec2 p){ p = mod(p, 120.0); return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
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
  return smoothstep(.09,.0,d)*step(.82,h)*tw;
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
  float st = starLayer(sUV + par*6.,28.,uTime) + starLayer(sUV+7.7 + par*3.,64.,uTime*1.3)*.45;
  sky += vec3(.9,.93,1.)*st*uStars*.8*(uv.y*.75+.25)*(1.-disc)*(1.-uDawn);

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
// облики, добытые полными созвездиями. Цвета готовы заранее: в кадре ни один
// из них не рождается заново, оттого краса эта не стоит ни доли миллисекунды.
const SHELL_AMBER = [1, 0.72, 0.36];
const FIREFLY_COL = [1, 0.85, 0.5]; // тёплые огоньки ореола Жителей
const SHELL_NIGHT = [0.66, 0.54, 1];
const SHELL_DAWN = [1, 0.62, 0.72];      // заря, что так и не пришла
const SHELL_AURORA = [0.55, 1, 0.75];    // зелёный огонь северного неба
const EMBER_SP = [1, 0.72, 0.4];         // жар хоровода
const DUST_GOLD = [1, 0.9, 0.62];        // звёздная пыль следа
const FIRE_RAMP = [];
for (let i = 0; i < 8; i++) FIRE_RAMP.push(mix3([1, 0.95, 0.82], [0.95, 0.3, 0.1], i / 7));
// полярный след: кольцо из двенадцати готовых цветов, зелень — синь — сирень
const AUR_RAMP = [];
{
  const st = [[0.4, 1, 0.72], [0.45, 0.8, 1], [0.75, 0.55, 1], [0.4, 1, 0.72]];
  for (let i = 0; i < 12; i++) {
    const t = i / 12 * 3, s = Math.floor(t);
    AUR_RAMP.push(mix3(st[s], st[s + 1], t - s));
  }
}
function ioCol() {
  const s = SET.visuals.shell;
  return s === 'storm_shell' ? SHELL_AMBER : s === 'night_shell' ? SHELL_NIGHT
    : s === 'dawn_shell' ? SHELL_DAWN : s === 'aurora_shell' ? SHELL_AURORA : IO_COL;
}
// общие цвета частиц: один массив на всех — так отрисовка кладёт их одной заливкой
const COL_LAMP = [1, 0.72, 0.35], COL_HEAT = [1, 0.3, 0.22]; // перегрев горит алым
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
// Обучение объявлено загодя: способности спрашивают о нём ещё при заводе
// первого забега, а зоны — с первого же кадра. Само устройство сада — ниже.
const TUTOR = { on: false, stops: [] };
// Зона, поставленная рукою: обычные родятся по хешу клетки, а станам сада
// надобно лечь ровно под себя. Кладём их особо — общий кэш зон подчищается
// на ходу, а сад стоять должен, покуда идёт урок.
const zoneForce = new Map();
function hash2(i, j) { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }

function hash3(x, y, z) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
}

// Клетка, из которой ты улетел, вычищается вслед за тобою — оттого,
// воротившись, ты нашёл бы пустошь. Ночь отрастает: спустя REGROW секунд
// клетка родит вновь, но мыслей уже вполовину, а кошмаров — сполна.
// Оттого сновать взад-вперёд ради мыслей невыгодно, а пустоты нигде нет.
const REGROW = 50;
// Круг, в котором ночь живёт. Он непременно шире круга засева (иначе рождённое
// в дальнем углу клетки гибнет в тот же миг, а клетка уже помечена засеянной —
// оттого мир и выедался). Считаем от клетки, а не от экрана: на малом окне
// экран меньше клетки.
function keepR() { return Math.max(viewR() * 2.6, CELL * 2.25); }
function checkCells() {
  const rad = 1; // кольцо клеток вперёд: дальний угол ближе, чем keepR
  const g0x = Math.floor((cam.x - CELL * rad) / CELL);
  const g1x = Math.floor((cam.x + CELL * rad) / CELL);
  const g0y = Math.floor((cam.y - CELL * rad) / CELL);
  const g1y = Math.floor((cam.y + CELL * rad) / CELL);
  for (let gx = g0x; gx <= g1x; gx++) {
    for (let gy = g0y; gy <= g1y; gy++) {
      const key = gx + ',' + gy;
      const c = RUN.cells.get(key);
      if (c === undefined) {
        RUN.cells.set(key, { t: S.playT, n: 0 });
        populateCell(gx, gy, 1, 0);
      } else if (S.playT - c.t > REGROW) {
        c.t = S.playT; c.n++;
        populateCell(gx, gy, 0.5, c.n);
      }
    }
  }
  if (RUN.cells.size > 700) forgetFarCells();
}

// память о клетках не должна пухнуть без предела: дальние забываются
function forgetFarCells() {
  const lim = CELL * 9;
  for (const key of RUN.cells.keys()) {
    const c = key.indexOf(',');
    const gx = +key.slice(0, c), gy = +key.slice(c + 1);
    if (Math.abs((gx + 0.5) * CELL - cam.x) > lim || Math.abs((gy + 0.5) * CELL - cam.y) > lim)
      RUN.cells.delete(key);
  }
}

function populateCell(gx, gy, factor, visit) {
  const seed = hash3(gx, gy, RUN.runSeed + visit * 7919);
  let _s = seed;
  function rnd(a=1, b) {
    _s = (_s * 16807) % 2147483647;
    const v = (_s - 1) / 2147483646;
    return b === undefined ? v * a : a + v * (b - a);
  }
  const cx = (gx + 0.5) * CELL, cy = (gy + 0.5) * CELL;
  
  // Жители ночи — редкие гости: не чаще одного на два десятка клеток,
  // и не больше двух живых разом, иначе чудо делается обыденностью
  if (visit === 0 && rnd() < 0.065 && landmarks.length < 3) {
    const types = ['lighthouse', 'graveyard', 'whale', 'lamplighter', 'starfall', 'star', 'pedlar', 'nest'];
    const type = types[Math.floor(rnd(0, types.length))];
    const lx = cx + rnd(-CELL/2.5, CELL/2.5), ly = cy + rnd(-CELL/2.5, CELL/2.5);

    if (type === 'lighthouse') landmarks.push({ type, x: lx, y: ly, state: 'dark', t: 0 });
    else if (type === 'star') landmarks.push({ type, x: lx, y: ly, state: 'asleep', prog: 0, t: 0, seed: rnd(TAU) });
    else if (type === 'pedlar') {
      const a = rnd(TAU);
      landmarks.push({ type, x: lx, y: ly, vx: Math.cos(a)*14, vy: Math.sin(a)*14, state: 'trade', cd: 0, t: 0 });
    }
    else if (type === 'nest') landmarks.push({ type, x: lx, y: ly, state: 'alive', prog: 0, t: rnd(3, 6), cried: false });
    else if (type === 'graveyard') {
      landmarks.push({ type, x: lx, y: ly, r: 250 });
      // гнездятся ловцы снов
      for(let i=0; i<2; i++) spawnEnemy('weaver', lx + rnd(-100, 100), ly + rnd(-100, 100), true);
    }
    else if (type === 'whale') {
      const a = rnd(TAU);
      landmarks.push({ type, x: lx, y: ly, vx: Math.cos(a)*25, vy: Math.sin(a)*25, t: 2 });
    }
    else if (type === 'lamplighter') {
      const a = rnd(TAU);
      landmarks.push({ type, x: lx, y: ly, vx: Math.cos(a)*40, vy: Math.sin(a)*40, t: 1 });
    }
    else if (type === 'starfall') landmarks.push({ type, x: lx, y: ly, state: 'wait', t: 0 });
  }

  // Motes: budget per cell is proportional to difficulty or meadow.
  // Щедрый горизонт правит здесь: прежний таймер мыслей упразднён вместе с
  // прочими, и дар, на нём державшийся, не делал ровно ничего.
  // Потолок непременен: мысли — единственное лекарство, и коли их число
  // растёт вместе с облётанным простором, то быстрый полёт кормит без предела
  // и бодрость перестаёт быть угрозою вовсе (замер: 94 из 100 через две ночи).
  // Впрочем, скупость вышла чрезмерной — небо казалось пустым; засев и потолок
  // подняты на треть: мыслей приметно гуще, а потолок всё так же держит меру.
  let moteCount = Math.floor(rnd(3, 6.5) * factor / RUN.moteRateMul);
  const cap = 34 + Math.floor(RUN.moteRateMul < 1 ? 10 : 0);
  moteCount = Math.max(0, Math.min(moteCount, cap - motes.length));
  const z = zoneOfCell(gx, gy);
  if (z && z.type === 'meadow') moteCount = Math.floor(moteCount * 2.5);
  for (let i = 0; i < moteCount; i++) {
    const mx = cx + rnd(-CELL/2, CELL/2), my = cy + rnd(-CELL/2, CELL/2);
    const m = allocMote();
    Object.assign(m, { x: mx, y: my, vx: rnd(-8, 8), vy: rnd(-5, 5), r: rnd(4, 6.2), seed: rnd(TAU), life: 100000, born: 0 });
    motes.push(m);
  }
  
  // Падучие звёзды — и звёздный час, что делает их чаще (тоже был впустую)
  if (rnd() < 0.08 * factor / RUN.starRateMul) {
    const mx = cx + rnd(-CELL/2, CELL/2), my = cy + rnd(-CELL/2, CELL/2);
    stars.push({ x: mx, y: my, t: 0, life: 100000, seed: rnd(TAU) });
  }

  // Спящие кошмары. Клетка родит тем гуще, чем глубже ночь: на первых минутах
  // почти пусто, к утру — тесно. Держать круг живым нам обходится дорого, оттого
  // счёт вышел скупой.
  const D0 = difficulty();
  let eCount = Math.floor(rnd(0, 1.5 + D0 * 0.3));
  if (z && z.type === 'rift') eCount = Math.floor(eCount * 2.2) + 1;
  for (let i = 0; i < eCount; i++) {
    const ex = cx + rnd(-CELL/2, CELL/2), ey = cy + rnd(-CELL/2, CELL/2);
    // types: shade, nm, dasher, siren, eater, eye, moth, weaver
    const r = rnd();
    let type = 'nm';
    if (r < 0.3) type = 'shade';
    else if (r < 0.45) type = 'moth';
    else if (r < 0.55) type = 'dasher';
    else if (r < 0.65) type = 'eye';
    else if (r < 0.75) type = 'weaver';
    else if (r < 0.85) type = 'siren';
    else if (r < 0.95) type = 'eater';
    
    spawnEnemy(type, ex, ey, true); // sleeping = true
  }
}

function zoneOfCell(gx, gy) {
  const key = gx + ',' + gy;
  const forced = zoneForce.get(key); // сад обучения кладёт свои зоны сам
  if (forced !== undefined) return forced;
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
  de: [
    'auch dem lichte widerfährt bisweilen ein blinzeln.',
    'auch albträume fürchten sich vor irgendetwas.',
    'erlisch, ruhe aus — und entflamme aufs neue.',
    'die nacht ist lang, doch funken sind eigensinnig.',
    'zerfließen heißt noch nicht verschwinden.',
  ],
};


const metaBtn = document.getElementById('metaBtn');
const metaScreen = document.getElementById('metaScreen');
const metaBackBtn = document.getElementById('metaBackBtn');
const metaList = document.getElementById('metaList');
const metaThoughts = document.getElementById('metaThoughts');

metaBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation(); e.preventDefault();
  renderMeta();
  metaScreen.classList.remove('hidden');
});
metaBackBtn.addEventListener('pointerdown', (e) => {
  e.stopPropagation(); e.preventDefault();
  metaScreen.classList.add('hidden');
});

function renderMeta() {
  metaThoughts.textContent = tr('meta_thoughts', META.thoughts);
  metaList.innerHTML = '';

  // — способности: их изучают и возвышают прежде даров —
  const abHead = document.createElement('div');
  abHead.style.cssText = 'font-family:var(--font-mono);font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:4px 0 2px;text-align:left';
  abHead.textContent = tr('ab_head');
  metaList.appendChild(abHead);
  ABILITIES.forEach(a => {
    const lvl = META.ab[a.id] || 0;
    const isMax = lvl >= a.max;
    const cost = isMax ? 0 : a.costs[lvl];
    const div = document.createElement('div');
    div.style.cssText = 'background:rgba(143,208,255,0.06);padding:15px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;gap:12px;';
    const info = document.createElement('div');
    info.style.textAlign = 'left';
    const state = lvl === 0 ? `<span style="color:#c6cfda;font-size:15px;">· ${tr('ab_locked')}</span>`
      : `<span style="color:#8fd0ff;font-size:15px;">· ${tr('ab_lvl', lvl)}${isMax ? '' : ' / ' + a.max}</span>`;
    info.innerHTML = `<div style="color:#cfe6ff;font-size:20px;margin-bottom:6px">${tr('ab_' + a.id)} ${state}</div>
                      <div style="color:#bcd0e0;font-size:15px;">${tr('ab_' + a.id + '_desc')}</div>`;
    div.appendChild(info);
    const btn = document.createElement('button');
    btn.className = 'sky-link';
    btn.style.margin = '0';
    btn.style.flexShrink = '0';
    if (isMax) {
      btn.textContent = 'MAX';
      btn.disabled = true;
      btn.style.opacity = '0.5';
    } else {
      btn.textContent = tr('meta_buy') + cost;
      if (META.thoughts < cost) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      } else {
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          META.thoughts -= cost;
          META.ab[a.id] = lvl + 1;
          saveMeta();
          renderMeta();
        });
      }
    }
    div.appendChild(btn);
    metaList.appendChild(div);
  });

  const upHead = document.createElement('div');
  upHead.style.cssText = abHead.style.cssText;
  upHead.style.marginTop = '18px';
  upHead.textContent = tr('meta_head');
  metaList.appendChild(upHead);

  META_UP.forEach(u => {
    // строки, что точат ещё не изученную способность, до времени молчат
    if (u.id === 'blink' && (META.ab.blink || 0) < 1) return;
    if (u.id === 'tether' && (META.ab.tether || 0) < 1) return;
    const lvl = META.up[u.id] || 0;
    const isMax = lvl >= u.max;
    const cost = metaCost(u.id, lvl);
    const div = document.createElement('div');
    div.style.cssText = 'background:rgba(255,255,255,0.05);padding:15px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;';
    
    const info = document.createElement('div');
    info.style.textAlign = 'left';
    info.innerHTML = `<div style="color:#ffd9a0;font-size:20px;margin-bottom:6px">${tr('meta_' + u.id)} ${isMax ? '' : `<span style="color:#c6cfda;font-size:16px;">(${lvl}/${u.max})</span>` }</div>
                      <div style="color:#bcd0e0;font-size:16px;">${tr('meta_' + u.id + '_desc')}</div>`;
    div.appendChild(info);
    
    const btn = document.createElement('button');
    btn.className = 'sky-link';
    btn.style.margin = '0';
    if (isMax) {
      btn.textContent = 'MAX';
      btn.disabled = true;
      btn.style.opacity = '0.5';
    } else {
      btn.textContent = tr('meta_buy') + cost;
      if (META.thoughts < cost) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
      } else {
        btn.addEventListener('pointerdown', (e) => {
          e.stopPropagation();
          META.thoughts -= cost;
          META.up[u.id] = lvl + 1;
          saveMeta();
          renderMeta();
        });
      }
    }
    div.appendChild(btn);
    metaList.appendChild(div);
  });
}


// ---------- Созвездия (Испытания и Визуал) ----------
const C_THEMES = {
  storm: { name: { ru: 'Буря', en: 'The Storm', de: 'der sturm' }, rewardType: 'shell', rewardId: 'storm_shell', rewardName: { ru: 'Штормовая оболочка (янтарная)', en: 'Storm Shell (Amber)', de: 'sturmhülle (bernstein)' } },
  ships: { name: { ru: 'Корабли', en: 'Ships', de: 'schiffe' }, rewardType: 'spirits', rewardId: 'ship_spirits', rewardName: { ru: 'Спириты-кометы', en: 'Comet Spirits', de: 'kometengeister' } },
  tether: { name: { ru: 'Нить', en: 'The Thread', de: 'der faden' }, rewardType: 'trail', rewardId: 'tether_trail', rewardName: { ru: 'Огненный след', en: 'Fiery Trail', de: 'feuerspur' } },
  night: { name: { ru: 'Глубокие ночи', en: 'Deep Nights', de: 'tiefe nächte' }, rewardType: 'shell', rewardId: 'night_shell', rewardName: { ru: 'Полуночная оболочка', en: 'Midnight Shell', de: 'nachthülle' } },
  folk: { name: { ru: 'Жители', en: 'The Folk', de: 'die bewohner' }, rewardType: 'halo', rewardId: 'folk_halo', rewardName: { ru: 'Ореол светлячков', en: 'Firefly Halo', de: 'glühwurmkranz' } }
};

// имена и описания испытаний живут языковыми парами — берём по нынешнему языку
// Тексты сада называют клавиши, а те правятся игроком: вместо самих букв в
// строках стоят метки вида {blink}, и они подменяются нынешней раскладкой.
function nm(pair) {
  const v = (pair && pair[LANG]) || (pair && pair.ru) || '';
  return v.indexOf('{') < 0 ? v : v.replace(/\{(\w+)\}/g, (m, a) => SET.keys[a] ? keyName(SET.keys[a]) : m);
}

const CHALLENGES = [
  // Буря
  { id: 'c_storm_1', theme: 'storm', desc: { ru: 'Пережить первый шторм', en: 'Survive the first storm', de: 'den ersten sturm überstehen' } },
  { id: 'c_storm_2', theme: 'storm', desc: { ru: 'Пережить шторм без урона', en: 'Survive a storm unharmed', de: 'einen sturm unversehrt überstehen' } },
  { id: 'c_storm_3', theme: 'storm', desc: { ru: 'Собрать 20 мыслей в шторм', en: 'Catch 20 thoughts in a storm', de: 'im sturm 20 gedanken fangen' } },
  { id: 'c_storm_4', theme: 'storm', desc: { ru: 'Рассеять 10 врагов в шторм', en: 'Scatter 10 enemies in a storm', de: 'im sturm 10 feinde zerstreuen' } },
  // Корабли
  { id: 'c_ships_1', theme: 'ships', desc: { ru: 'Потопить корабль-кошмар', en: 'Sink the nightmare ship', de: 'das albtraumschiff versenken' } },
  { id: 'c_ships_2', theme: 'ships', desc: { ru: 'Отвязаться за секунду до дыры', en: 'Release a second before the void', de: 'den faden eine sekunde vor der leere lösen' } },
  { id: 'c_ships_3', theme: 'ships', desc: { ru: 'Привязаться к 5 кораблям за ночь', en: 'Tether to 5 ships in one night', de: 'sich in einer nacht an 5 schiffe binden' } },
  { id: 'c_ships_4', theme: 'ships', desc: { ru: 'Уклониться от залпа якорей', en: 'Dodge an anchor volley', de: 'einem ankerhagel ausweichen' } },
  // Нить
  { id: 'c_tether_1', theme: 'tether', desc: { ru: 'Сжечь нитью 5 врагов разом', en: 'Burn 5 enemies at once with thread', de: '5 feinde zugleich mit dem faden verbrennen' } },
  { id: 'c_tether_2', theme: 'tether', desc: { ru: 'Сжечь 20 врагов нитью за ночь', en: 'Burn 20 enemies with thread in one night', de: 'in einer nacht 20 feinde mit dem faden verbrennen' } },
  { id: 'c_tether_3', theme: 'tether', desc: { ru: 'Порвать нить (до упора)', en: 'Snap the thread by force', de: 'den faden mit gewalt zerreißen' } },
  { id: 'c_tether_4', theme: 'tether', desc: { ru: 'Убить тёмного двойника нитью', en: 'Slay the dark twin with thread', de: 'den dunklen zwilling mit dem faden erschlagen' } },
  // Ночи
  { id: 'c_night_1', theme: 'night', desc: { ru: 'Дожить до 4-й ночи', en: 'Reach the 4th night', de: 'die 4. nacht erreichen' } },
  { id: 'c_night_2', theme: 'night', desc: { ru: 'Дожить до 8-й ночи', en: 'Reach the 8th night', de: 'die 8. nacht erreichen' } },
  { id: 'c_night_3', theme: 'night', desc: { ru: 'Дожить до 12-й ночи', en: 'Reach the 12th night', de: 'die 12. nacht erreichen' } },
  { id: 'c_night_4', theme: 'night', desc: { ru: 'Собрать 100 мыслей за забег', en: 'Catch 100 thoughts in one run', de: 'in einem lauf 100 gedanken fangen' } },
  // Жители
  { id: 'c_folk_1', theme: 'folk', desc: { ru: 'Разжечь уснувший фонарь', en: 'Kindle the sleeping lantern', de: 'die schlafende laterne entfachen' } },
  { id: 'c_folk_2', theme: 'folk', desc: { ru: 'Разбудить уснувшую звезду', en: 'Wake the sleeping star', de: 'den schlafenden stern wecken' } },
  { id: 'c_folk_3', theme: 'folk', desc: { ru: 'Сторговаться с менялой', en: 'Strike a deal with the pedlar', de: 'mit dem krämer handelseinig werden' } },
  { id: 'c_folk_4', theme: 'folk', desc: { ru: 'Выжечь гнездо кошмаров', en: 'Burn out a nightmare nest', de: 'ein albtraumnest ausbrennen' } }
];

let STARS_DATA = loadStars();
function loadStars() {
  try { return JSON.parse(localStorage.getItem('io-noch-stars')) || { completed: [] }; }
  catch (_) { return { completed: [] }; }
}
// Наследство прежних созвездий. Искры памяти отменены (сила живёт в шкатулке),
// оттого за всякую пойманную прежде фразу разом отсыпается по пятнадцати мыслей.
// Самих фраз не трогаем: небо остаётся при игроке — это его память, не валюта.
function skyBounty() {
  if (META.skyBounty) return;
  META.skyBounty = true;
  const caught = SKY.size;
  if (caught > 0) META.thoughts += caught * 15;
  saveMeta();
}
function saveStars() {
  localStorage.setItem('io-noch-stars', JSON.stringify(STARS_DATA));
}
function unlockChallenge(id) {
  if (STARS_DATA.completed.includes(id)) return;
  STARS_DATA.completed.push(id);
  saveStars();
  spawnText(io.x, io.y - 140, tr('starLit'), true);
  sfxChoice();
  const ch = CHALLENGES.find(c => c.id === id);
  if (ch && checkThemeCompleted(ch.theme)) {
    const th = C_THEMES[ch.theme];
    spawnText(io.x, io.y - 180, tr('themeDone', nm(th.rewardName)), true);
    equipVisual(th); // добытый облик надевается сам — за ним и шли
  }
  checkWardrobeNews(); // счёт полных созвездий мог отпереть облик из гардероба
}
// облик, дарованный полным созвездием: оболочка, след или свита
function equipVisual(th) {
  SET.visuals[th.rewardType] = SET.visuals[th.rewardType] === th.rewardId ? 'default' : th.rewardId;
  saveSettings();
}
function checkThemeCompleted(themeId) {
  const req = CHALLENGES.filter(c => c.theme === themeId).length;
  const have = CHALLENGES.filter(c => c.theme === themeId && STARS_DATA.completed.includes(c.id)).length;
  return have >= req;
}

// Stats tracking for challenges
let CH_STATS = {
  stormDmg: 0, stormThoughts: 0, stormKills: 0,
  shipsTethered: new Set(), anchorDodged: false,
  tetherKillsCombo: 0, tetherKillsNight: 0
};

// ---------- созвездие пойманных фраз (память между бессонницами) ----------
// всякая пойманная впервые фраза остаётся звездою на небе игрока навсегда;
// чем полнее созвездие, тем с бо́льшим наследством начинается новая ночь.
// Хранятся ключи (t2_5, d_0), а не сами строки, — созвездие переживает и
// смену языка, и любую правку списков.
const SKY_NAMES = {
  ru: ['тихая ночь', 'вторая ночь', 'третья ночь', 'буря', 'рассвет', 'добыча'],
  en: ['quiet night', 'second night', 'third night', 'the storm', 'dawn', 'deeds'],
  de: ['stille nacht', 'zweite nacht', 'dritte nacht', 'der sturm', 'morgenrot', 'taten'],
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
  SKY.add(key); saveSky();
  checkWardrobeNews(); // порог фраз мог отпереть облик — пусть скажется
  return true;
}
function skyTotal() { let n = 0; for (const tier of skyGroups()) n += tier.length; return n; }
function skyCaught() {
  let n = 0;
  skyGroups().forEach((tier, gi) => tier.forEach((p, pi) => { if (SKY.has(phraseKey(gi, pi))) n++; }));
  return n;
}

// Искр памяти более нет: созвездие силы не даёт вовсе. Сила покупается
// мыслями в шкатулке, а небо хранит память и дарит облик — иначе два
// наследства складывались бы и ломали всякий счёт.


// ---------- Метапрогрессия (Шкатулка мыслей) ----------
let META = loadMeta();
function loadMeta() {
  let m;
  try { m = JSON.parse(localStorage.getItem('io-noch-meta')) || {}; } catch (_) { m = {}; }
  m.thoughts = m.thoughts || 0;
  m.up = m.up || {};
  // способности изучаются за мысли; спириты дарованы от рождения первой степенью
  m.ab = Object.assign({ tether: 0, blink: 0, charge: 0, spirits: 1 }, m.ab || {});
  return m;
}
function saveMeta() {
  try { localStorage.setItem('io-noch-meta', JSON.stringify(META)); } catch (_) {}
}

// подсказки первой ночи: каждая является единожды за всю жизнь сохранения,
// в прозе мира и без стрелок — ночь сама учит, ей лишь дать слово
let HINTS = (() => {
  try { return JSON.parse(localStorage.getItem('io-noch-hints')) || {}; }
  catch (_) { return {}; }
})();
function onceHint(key) {
  if (HINTS[key]) return;
  HINTS[key] = 1;
  try { localStorage.setItem('io-noch-hints', JSON.stringify(HINTS)); } catch (_) {}
  spawnText(io.x, io.y - 90, tr(key), true);
}
skyBounty(); // разом, при первом запуске новой поры — SKY и META уже на месте
// Прежний рост в 1,7 за ступень взлетал так круто, что верхние ступени были
// недосягаемы вовсе; ступеней ныне больше, оттого и рост положе — путь дольше,
// да каждый шаг по силам.
function metaCost(id, lvl) {
  const up = META_UP.find(u => u.id === id);
  return Math.floor(up.baseCost * Math.pow(1.45, lvl));
}
// Ступеней у обычных даров вдвое больше прежнего, да шаг каждой мельче:
// потолок силы остался тем же (иначе шкатулка съела бы всякую опасность), а
// дорога к нему сделалась дробной — есть что взять и на десятой ночи.
const META_UP = [
  { id: 'startWake', baseCost: 15, max: 14, apply: (r, lvl) => { r.wakeMax += lvl * 4; r.wake += lvl * 4; } },
  { id: 'drain', baseCost: 20, max: 14, apply: (r, lvl) => { r.drainMul *= Math.pow(0.97, lvl); } },
  { id: 'spirit', baseCost: 350, max: 1, apply: (r, lvl) => { r.spirits += lvl; } },
  { id: 'blink', baseCost: 25, max: 8, apply: (r, lvl) => { r.relocCd = Math.max(3, r.relocCd - lvl * 0.3); } },
  { id: 'speed', baseCost: 20, max: 12, apply: (r, lvl) => { r.speed *= Math.pow(1.02, lvl); } },
  { id: 'tether', baseCost: 20, max: 10, apply: (r, lvl) => { r.tetherR += lvl * 14; } },
  { id: 'xp', baseCost: 40, max: 10, apply: (r, lvl) => { r.metaXp = (r.metaXp || 0) + lvl * 0.11; } },
  { id: 'revive', baseCost: 800, max: 1, apply: (r, lvl) => { if (lvl > 0) r.secondWind = true; } },
];
TXT.ru.meta_head = 'Улучшения';
TXT.ru.meta_thoughts = n => 'Мыслей в копилке: ' + n;
TXT.ru.meta_startWake = 'Запас сил'; TXT.ru.meta_startWake_desc = 'Запас сил больше.';
TXT.ru.meta_drain = 'Тлеющий уголь'; TXT.ru.meta_drain_desc = 'Силы тают медленнее.';
TXT.ru.meta_spirit = 'Свита света'; TXT.ru.meta_spirit_desc = 'Лишний спирит с самого начала.';
TXT.ru.meta_blink = 'Лёгкость бытия'; TXT.ru.meta_blink_desc = 'Рывок восстанавливается быстрее.';
TXT.ru.meta_speed = 'Быстрый шаг'; TXT.ru.meta_speed_desc = 'Свет летит быстрее обычного.';
TXT.ru.meta_tether = 'Крепкая нить'; TXT.ru.meta_tether_desc = 'Трос цепляет корабли с большего расстояния.';
TXT.ru.meta_xp = 'Ясность ума'; TXT.ru.meta_xp_desc = 'Каждая мысль приносит больше опыта.';
TXT.ru.meta_revive = 'Ещё одна ночь'; TXT.ru.meta_revive_desc = 'Один раз за забег вы не погибаете.';
TXT.ru.meta_buy = 'Купить за ';

// ---------- способности: их надобно изучать и возвышать ----------
const ABILITIES = [
  { id: 'tether',  max: 3, costs: [30, 60, 110] },
  { id: 'blink',   max: 3, costs: [25, 55, 100] },
  { id: 'charge',  max: 3, costs: [40, 80, 140] },
  { id: 'spirits', max: 3, costs: [0, 70, 150] },
];
// отладочный лётчик мерит живучесть при первой степени всего — прежняя база
const BOT = { on: false, tx: 0, ty: 0 };
const BOT_AB = { tether: 1, blink: 1, charge: 1, spirits: 1 };
function abLvl(id) { return BOT.on ? BOT_AB[id] : Math.max(TUTOR.on ? 1 : 0, META.ab[id] || 0); }

TXT.ru.ab_head = 'Способности';
TXT.ru.ab_tether = 'трос';
TXT.ru.ab_tether_desc = 'Цепляет вас к кораблю: трос тянет вас за ним и сжигает кошмаров, которые его пересекают. II — трос длиннее · III — жжёт сильнее.';
TXT.ru.ab_blink = 'рывок';
TXT.ru.ab_blink_desc = 'Переносит вас туда, куда смотрит прицел. На старом месте остаётся след: нажмите ещё раз — и вернётесь к нему с любого расстояния, если не прошла минута. II — откат короче · III — след сжигает кошмаров.';
TXT.ru.ab_charge = 'ускорение';
TXT.ru.ab_charge_desc = 'Свет разгорается: спириты кружат вдвое быстрее, перегрева нет, силы тают вдвое медленнее. Выше уровень — дольше держится (3 / 4½ / 6 с).';
TXT.ru.ab_spirits = 'спириты';
TXT.ru.ab_spirits_desc = 'Искры кружат вокруг вас и сами жгут кошмаров. II — четвёртая искра · III — пятая.';
TXT.ru.ab_lvl = n => 'уровень ' + n;
TXT.ru.ab_locked = 'не открыто';
TXT.en.ab_head = 'Abilities';
TXT.en.ab_tether = 'thread';
TXT.en.ab_tether_desc = 'bind yourself to a ship: the thread carries you and burns nightmares. II — longer thread · III — burns fiercer.';
TXT.en.ab_blink = 'blink';
TXT.en.ab_blink_desc = 'step to where you point; a trace stays behind, and a second press returns you to it from any distance, so long as a minute has not passed. II — returns sooner · III — the trace burns nightmares.';
TXT.en.ab_charge = 'charge';
TXT.en.ab_charge_desc = 'the light flares up: spirits whirl twice as fast, overheat is silent, wakefulness drains at half strength. Higher tier — burns longer (3 / 4½ / 6 s).';
TXT.en.ab_spirits = 'spirits';
TXT.en.ab_spirits_desc = 'the round of sparks that burn the night. II — a fourth spark · III — a fifth.';
TXT.en.ab_lvl = n => 'tier ' + n;
TXT.en.ab_locked = 'not learned';

TXT.en.meta_head = 'Casket of Thoughts';
TXT.en.meta_thoughts = n => 'Thoughts in stash: ' + n;
TXT.en.meta_startWake = 'Reserve of Strength'; TXT.en.meta_startWake_desc = 'The light holds more wakefulness.';
TXT.en.meta_drain = 'Smoldering Ember'; TXT.en.meta_drain_desc = 'Wakefulness drains slower.';
TXT.en.meta_spirit = 'Retinue of Light'; TXT.en.meta_spirit_desc = 'An extra spirit from the start.';
TXT.en.meta_blink = 'Lightness of Being'; TXT.en.meta_blink_desc = 'Blink returns sooner.';
TXT.en.meta_speed = 'Swift Step'; TXT.en.meta_speed_desc = 'The light flies faster.';
TXT.en.meta_tether = 'Sturdy Thread'; TXT.en.meta_tether_desc = 'The thread reaches ships from farther.';
TXT.en.meta_xp = 'Clarity of Mind'; TXT.en.meta_xp_desc = 'Every thought grants more experience.';
TXT.en.meta_revive = 'One More Night'; TXT.en.meta_revive_desc = 'Once a run, death steps aside.';
TXT.en.meta_buy = 'Take for ';

TXT.de.meta_head = 'schatulle der gedanken';
TXT.de.meta_thoughts = n => 'gedanken im vorrat: ' + n;
TXT.de.meta_startWake = 'kräftereserve'; TXT.de.meta_startWake_desc = 'das licht birgt mehr wachheit.';
TXT.de.meta_drain = 'glimmende kohle'; TXT.de.meta_drain_desc = 'wachheit schwindet langsamer.';
TXT.de.meta_spirit = 'gefolge des lichts'; TXT.de.meta_spirit_desc = 'ein zusätzlicher geist von anbeginn.';
TXT.de.meta_blink = 'leichtes sein'; TXT.de.meta_blink_desc = 'das flackern kehrt eher wieder.';
TXT.de.meta_speed = 'flinker schritt'; TXT.de.meta_speed_desc = 'das licht fliegt geschwinder.';
TXT.de.meta_tether = 'fester faden'; TXT.de.meta_tether_desc = 'der faden erreicht schiffe aus größerer ferne.';
TXT.de.meta_xp = 'klarer sinn'; TXT.de.meta_xp_desc = 'jeder gedanke schenkt mehr erfahrung.';
TXT.de.meta_revive = 'noch eine nacht'; TXT.de.meta_revive_desc = 'einmal je lauf tritt der tod beiseite.';
TXT.de.meta_buy = 'nehmen für ';

TXT.de.ab_head = 'fähigkeiten';
TXT.de.ab_tether = 'faden';
TXT.de.ab_tether_desc = 'binde dich an ein schiff: der faden trägt dich und versengt albträume. II — längerer faden · III — heißere glut.';
TXT.de.ab_blink = 'flackern';
TXT.de.ab_blink_desc = 'tritt dorthin, wohin du weist; zurück bleibt eine spur, und ein zweiter druck bringt dich heim — aus jeder ferne, solange keine minute verstrich. II — eher bereit · III — die spur versengt albträume.';
TXT.de.ab_charge = 'ladung';
TXT.de.ab_charge_desc = 'das licht flammt auf: geister kreisen doppelt so rasch, überhitzen schweigt, wachheit schwindet nur halb. höhere stufe — längere glut (3 / 4½ / 6 s).';
TXT.de.ab_spirits = 'geister';
TXT.de.ab_spirits_desc = 'ein reigen von funken, der die nacht versengt. II — ein vierter funke · III — ein fünfter.';
TXT.de.ab_lvl = n => 'stufe ' + n;
TXT.de.ab_locked = 'nicht erlernt';

function applyMeta(r) {
  applyAbilities(r); // способности кладут основу; дары шкатулки строят поверх
  for (const u of META_UP) {
    const lvl = META.up[u.id] || 0;
    if (lvl > 0) u.apply(r, lvl);
  }
}

// След мерцания живёт минуту и зовёт назад с любой дали: расстояние ему не
// указ, указ ему одно лишь время. Приманка же (та, что манит кошмаров и жжёт
// их на III степени) тлеет по-прежнему считанные секунды — иначе брошенный
// след обратился бы в вечную ловушку, что выкашивает ночь без хозяина.
const ECHO_HOLD = 60;

function applyAbilities(r) {
  r.spirits = 2 + Math.max(1, abLvl('spirits'));   // I — три искры, далее гуще
  const tl = abLvl('tether');
  if (tl >= 2) r.tetherR *= 1.25;
  r.threadBurnMul = tl >= 3 ? 0.7 : 1;             // III: нить прожигает скорее
  const bl = abLvl('blink');
  if (bl >= 2) r.relocCd = Math.max(3, r.relocCd - 2);
  r.echoLife = 2.2 + bl * 0.4;                     // приманка тлеет дольше со степенью
  r.echoHold = ECHO_HOLD;                          // а сам след держит целую минуту
  r.echoBurn = bl >= 3;
  const cl = abLvl('charge');
  r.ocDur = [0, 3, 4.5, 6][cl];
  r.ocCd = 14;
}

// ---------- дары бессонницы (прокачка по очкам) ----------
const UPGRADES = [
  { id: 'spark', ab: 'spirits',   name: 'искра-побратим', desc: 'к хороводу твоему пристаёт новый спирит', apply: r => r.spirits++ },
  { id: 'round', ab: 'spirits',   name: 'широкий хоровод',    desc: 'орбита спиритов делается на треть просторней', apply: r => r.orbitR *= 1.3 },
  { id: 'spin', ab: 'spirits',    name: 'неистовый хоровод',  desc: 'искры кружатся с вящей быстротою', apply: r => r.spinMul *= 1.4 },
  { id: 'tea',     name: 'настой полуночи',    desc: 'предел бодрости возрастает на 25, да и глоток тотчас', apply: r => { r.wakeMax += 25; r.wake = Math.min(r.wakeMax, r.wake + 20); } },
  { id: 'calm',    name: 'тихое горение',    desc: 'бодрость тает пятою долей медленней', apply: r => r.drainMul *= 0.8 },
  { id: 'dawn',    name: 'тёплое зарево',       desc: 'всякая мысль целит на 2 сильнее', apply: r => r.healBonus += 2 },
  { id: 'thread', ab: 'tether',  name: 'нить за горизонт',      desc: 'к кораблю возможно привязаться издалече', apply: r => r.tetherR *= 1.45 },
  { id: 'chain', ab: 'tether',   name: 'неразрывная связь',       desc: 'доколе держишься за корабль — бодрость тает вчетверо медленней', once: true, apply: r => r.chain = true },
  { id: 'light',   name: 'попутный свет',          desc: 'свет летит пятою долей быстрее', apply: r => r.speed *= 1.2 },
  { id: 'breath', ab: 'blink',  name: 'зов мерцания',     desc: 'мерцание возвращается двумя секундами ранее', apply: r => r.relocCd = Math.max(3, r.relocCd - 2) },
  { id: 'echo', ab: 'blink',    name: 'эхо света',         desc: 'мерцание вспыхивает и разгоняет кошмаров окрест', once: true, apply: r => r.echo = true },
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
  { id: 'keen', ab: 'spirits',    name: 'неугасимый рой',      desc: 'погасшая искра возгорается на треть скорее', apply: r => r.sparkCdMul *= 0.7 },
  { id: 'dew',     name: 'роса рассветная',   desc: 'всякий рассвет омывает тебя дюжиной бодрости', apply: r => r.dawnDew += 12 },
  { id: 'chreda',  name: 'долгая чреда',      desc: 'чреда мыслей держится вдвое дольше', apply: r => r.comboMul *= 1.8 },
  { id: 'zharcz',  name: 'жар чреды',         desc: 'при чреде от пяти всякая мысль дарит лишнее очко опыта', once: true, apply: r => r.comboXp = true },
  { id: 'rod',     name: 'громоотвод',        desc: 'молния тебя не ранит — напротив, бодрит', rare: true, once: true, apply: r => r.boltRod = true },
  { id: 'veil', ab: 'blink',    name: 'вуаль мерцания',    desc: 'после мерцания ночь не смеет тронуть тебя две с половиной секунды', once: true, apply: r => r.relocVeil = true },
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
  chain:   ['unbroken bond', 'while you hold to a ship, wakefulness drains four times slower'],
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

// немецкие дары держат тот же порядок и те же id, что русские с английскими
const UP_DE = {
  spark:   ['bruderfunke', 'ein weiterer geist gesellt sich zu deinem reigen'],
  round:   ['weiter reigen', 'die bahn der geister wird um ein drittel weiter'],
  spin:    ['rasender reigen', 'die funken kreisen mit größerer hast'],
  tea:     ['mitternachtstrank', 'die wachheit wächst um 25, samt einem schluck sogleich'],
  calm:    ['stille glut', 'wachheit schwindet um ein fünftel langsamer'],
  dawn:    ['warmes nachglühen', 'jeder gedanke heilt um 2 mehr'],
  thread:  ['faden übern horizont', 'ein schiff lässt sich aus größerer ferne binden'],
  chain:   ['unzerreißbares band', 'solange du am schiffe hältst, schwindet wachheit viermal langsamer'],
  light:   ['licht im geleit', 'das licht fliegt um ein fünftel geschwinder'],
  breath:  ['ruf des flackerns', 'das flackern kehrt zwei sekunden eher wieder'],
  echo:    ['echo des lichts', 'das flackern blitzt auf und zerstreut die albträume ringsum'],
  coolfl:  ['kalte flamme', 'das licht erträgt eile länger — es überhitzt später'],
  flow:    ['zügel der winde', 'die ströme tragen dich, wohin zu fliegen dir beliebt'],
  riftg:   ['gnade der kluft', 'gedanken nahe den klüften heilen doppelt'],
  magnet:  ['gieriger schein', 'gedanken schmiegen sich an deine wärme'],
  grav:    ['ferner ruf', 'ferne gedanken treiben gemach zu dir'],
  horizon: ['freigebiger horizont', 'gedanken werden merklich öfter geboren'],
  feast:   ['albtraumgelage', 'ein zerstreuter albtraum lässt bisweilen einen gedanken zurück'],
  blanket: ['gesteppter harnisch', 'aller schaden fällt um ein viertel geringer aus'],
  stormh:  ['herz des sturms', 'in sturmnächten trifft dich nur halber schaden'],
  wind2:   ['zweiter atem', 'einmal je schlaflosigkeit löscht dich ein tödlicher schlag nicht aus'],
  starf:   ['sternenstunde', 'gefallene sterne regnen merklich öfter'],
  keen:    ['unverlöschlicher schwarm', 'ein erloschener funke flammt ein drittel eher auf'],
  dew:     ['morgentau', 'jeder morgen wäscht dich mit einem dutzend wachheit'],
  chreda:  ['lange folge', 'die gedankenfolge hält doppelt so lang'],
  zharcz:  ['glut der folge', 'ab einer folge von fünf schenkt jeder gedanke einen punkt mehr'],
  rod:     ['blitzableiter', 'der blitz schadet dir nicht — vielmehr muntert er dich auf'],
  veil:    ['schleier des flackerns', 'nach dem flackern darf die nacht dich zweieinhalb sekunden nicht anrühren'],
  zhatva:  ['sturmlese', 'in sturmnächten schenkt jeder gedanke einen punkt mehr'],
  skoro:   ['himmelsläufer', 'die grenze deiner eile rückt weiter empor'],
};
const UP_LANG = { en: UP_EN, de: UP_DE };
function upName(u) { const e = UP_LANG[LANG] && UP_LANG[LANG][u.id]; return e ? e[0] : u.name; }
function upDesc(u) { const e = UP_LANG[LANG] && UP_LANG[LANG][u.id]; return e ? e[1] : u.desc; }


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
    runSeed: Math.random() * 1e9 | 0, cells: new Map(),
    night: 1, wake: 100, wakeMax: 100,
    level: 1, xp: 0, xpNext: 8,
    spirits: 3, orbitR: 52, spinMul: 1, pickupR: 48, speed: 1, dmgMul: 1,
    drainMul: 1, healBonus: 0, relocCd: 8, tetherR: 240,
    secondWind: false, echo: false, chain: false, stormHeart: false,
    feast: 0, gravity: 0, moteRateMul: 1,
    hotMul: 1, flow: false, riftGift: false,
    sparkCdMul: 1, comboMul: 1, comboXp: false, boltRod: false,
    relocVeil: false, stormXp: false, maxSpd: 900, starRateMul: 1, dawnDew: 0,
    kills: 0, thoughts: 0, comboBest: 0, dist: 0, bosses: 0, newStars: 0, waves: 0, taken: [], offerHist: [],
  };
  applyMeta(r); // прокачка за мысли
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
// Потолок в девять достигался уже к десятой минуте, и дальше ночь не росла
// вовсе — оттого поздние ночи выходили ровнее ранних. Ныне предел отодвинут.
function difficulty() { return Math.min(13, S.playT / 70 + (RUN.night - 1) * 0.35); }

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
  reloc: { phase: 'idle', timer: 0, hold: 0, cd: 0, rx: 0, ry: 0 },
  oc: false, tether: null,
};
// Прицел, покуда мышь не двинулась, стоит посреди экрана: играя одними
// клавишами, его можно вовсе не тронуть, а рывок целится именно по нему.
const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
window.addEventListener('resize', () => { if (!pointer.active) { pointer.x = W / 2; pointer.y = H / 2; } });
let steerTX = 0, steerTY = 0; // куда правит игрок — по этому уходит швырок с нити
const keys = {};
let motes = [], ships = [], enemies = [], bolts = [], parts = [], texts = [], shots = [], clouds = [], stars = [], webs = [], landmarks = [];
let moteTimer = 0, shipTimer = 4, shotTimer = 3, eTimer = 3, boltTimer = 8, starTimer = 18;
// волны: ночь временами накатывает всей толпой, потом отпускает
const WAVE = { n: 0, timer: 40, active: false, left: 0, spawnT: 0, theme: null };
// корабль-кошмар: всякая пятая ночь приводит его из-за края неба
let boss = null, anchors = [];
const BOSS_S = 2.4;                     // во сколько крат он больше доброго корабля
function bossLamp(b) {                  // уязвимое место: фонарь на носу либо глаз левиафана
  if (b.kind === 'whale') return { x: b.x + b.dir * -52 * BOSS_S, y: b.y - 12 * BOSS_S };
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
  io.reloc = { phase: 'idle', timer: 0, hold: 0, cd: 0, rx: 0, ry: 0 };
  io.tether = null; io.oc = false; io.ocT = 0; io.ocCd = 0; io.spin = 0;
  cam.x = 0; cam.y = 0;
  syncSpirits();
  pointer.x = W * 0.5; pointer.y = H * 0.45;
  S.t = 0; S.playT = 0; S.combo = 0; S.hurtT = 0; S.shake = 0; S.glitch = 0; S.stormFired = false; S.dawnFired = false;
  webs = [];
  landmarks = [];
  S.reachShip = null; S.tetherHinted = false;
  boss = null; anchors = []; S.bossDone = false;
  bossHud.classList.remove('on');
  WAVE.n = 0; WAVE.timer = 40; WAVE.active = false; WAVE.left = 0;
  moteTimer = 0.5; shipTimer = attract ? 2 : 5; eTimer = attract ? 1e9 : 3; boltTimer = 9;
  if (attract) for (let i = 0; i < 7; i++) spawnMote(true);
}

// ---------- спавны ----------
const motePool = [];
function allocMote() { return motePool.length ? motePool.pop() : {}; }
function freeMote(m) { if (motePool.length < 500) motePool.push(m); }

const enemyPool = [];
function allocEnemy() { return enemyPool.length ? enemyPool.pop() : {}; }
function freeEnemy(e) { e.burnE = 0; if (enemyPool.length < 500) enemyPool.push(e); }

function spawnMote(closeOk) {
  const p = closeOk ? spawnRing(80, viewR() * 0.8) : spawnRing(140, viewR() * 1.05);
  const m = allocMote();
  Object.assign(m, { x: p.x, y: p.y, vx: rand(-12, 12), vy: rand(-8, 8), r: rand(4, 6.2), seed: rand(TAU), life: 30, born: 0 });
  motes.push(m);
}
function spawnMoteAt(x, y, life) {
  const m = allocMote();
  Object.assign(m, { x, y, vx: rand(-20, 20), vy: rand(-20, 20), r: rand(4, 5.6), seed: rand(TAU), life: life || 14, born: 0 });
  motes.push(m);
}
function spawnShip() {
  const near = Math.random() < 0.6;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const scl = near ? rand(0.85, 1.15) : rand(0.4, 0.6);
  const speed = (near ? rand(38, 66) : rand(16, 30)) * (0.7 + S.energy * 0.8);
  const p = spawnRing(viewR() + 150, viewR() + 320);
  ships.push({ x: p.x, y: p.y, vx: speed * dir, scl, near, dir, bob: rand(TAU), life: rand(60, 180) });
}
function spawnEnemy(type, ax, ay, sleeping) {
  const D = difficulty();
  let x, y;
  if (ax !== undefined) { x = ax; y = ay; }
  else { const p = spawnRing(viewR() + 60, viewR() + 260); x = p.x; y = p.y; }

  const base = { x, y, vx: 0, vy: 0, seed: rand(TAU), type, sleeping: !!sleeping, threadT: 0, dead: false };
  const crust = D >= 3.5 ? 2 : 1;
  const pushE = (props) => { const e = allocEnemy(); Object.assign(e, base, props); enemies.push(e); };

  if (type === 'nm') pushE({ r: rand(14, 22), sp: 65 + D * 14, dmg: 22, hp: crust, flashT: 0 });
  else if (type === 'shade') {
    const n = 4 + (Math.random() * 3 | 0);
    for (let i = 0; i < n; i++) pushE({
      x: x + rand(-60, 60), y: y + rand(-60, 60),
      r: rand(6, 9), sp: 115 + D * 15, dmg: 10, seed: rand(TAU)
    });
  } else if (type === 'dasher') pushE({ r: 11, sp: 85 + D * 12, dmg: 30, st: 'seek', stT: 0, dx: 0, dy: 0 });
  else if (type === 'siren') pushE({ r: 16, sp: 8, dmg: 8, ringR: 150, pulse: rand(TAU) });
  else if (type === 'eater') pushE({ r: 12, sp: 70 + D * 10, dmg: 16, eaten: 0, hp: D >= 4.0 ? 2 : 1, flashT: 0 });
  else if (type === 'eye') pushE({ r: 13, sp: 30 + D * 4, dmg: 16, st: 'drift', stT: rand(2, 4), aim: 0 });
  else if (type === 'moth') {
    const n = 3 + (Math.random() * 2 | 0);
    for (let i = 0; i < n; i++) pushE({
      x: x + rand(-50, 50), y: y + rand(-50, 50),
      r: 7, sp: 115 + D * 10, dmg: 0, seed: rand(TAU),
      latched: false, la: 0, stun: 0, burn: 0
    });
  }
  else if (type === 'weaver') pushE({ r: 12, sp: 34, dmg: 12, webT: rand(2, 4) });
  else if (type === 'antio') pushE({
    r: 9, sp: 55 + D * 6, dmg: 20, hp: 3, flashT: 0, blinkT: rand(4, 6), orbR: 48,
    esp: [{ ang: rand(TAU), cd: 0 }, { ang: rand(TAU), cd: 0 }, { ang: rand(TAU), cd: 0 }]
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
function spawnBoss(kindWish) {
  const p = spawnRing(viewR() + 260, viewR() + 420);
  // всякая десятая ночь из глуби подымается левиафан, прочие пятые — корабль
  const kind = kindWish || (RUN.night % 10 === 0 ? 'whale' : 'ship');
  const hp = kind === 'whale' ? 14 + Math.floor(RUN.night / 10) * 4 : 12 + Math.floor(RUN.night / 5) * 3;
  boss = {
    kind, x: p.x, y: p.y, vx: 0, vy: 0, dir: p.x > io.x ? -1 : 1,
    hp, hpMax: hp, st: kind === 'whale' ? 'deep' : 'sail', stT: kind === 'whale' ? 4 : 6, cycle: 0,
    bob: rand(TAU), seed: rand(TAU), open: 0, flashT: 0,
    dropT: 2, volley: 0, volleyT: 0, tx: 0, ty: 0, circ: rand(TAU), eaten: 0,
  };
  document.getElementById('bossNameEl').textContent = tr(kind === 'whale' ? 'bossNameWhale' : 'bossName');
  spawnText(io.x, io.y - 130, tr(kind === 'whale' ? 'bossWhale' : 'bossComes'), true);
  sfxRiser();
  S.glitch = Math.max(S.glitch, 0.7);
  S.shake = Math.max(S.shake, 0.5);
  bossHud.classList.add('on');
}

function updateWhaleBoss(b, dt) {
  b.bob += dt;
  b.flashT = Math.max(0, b.flashT - dt);
  b.stT -= dt;
  const eye = bossLamp(b);

  if (b.st === 'deep') {
    // тень кружит поодаль под плёнкою ночи — неуязвим и не вредит
    b.circ += dt * 0.55;
    const tx = io.x + Math.cos(b.circ) * 470, ty = io.y + Math.sin(b.circ) * 310;
    const dx = tx - b.x, dy = ty - b.y, dd = hyp(dx, dy) || 1;
    b.vx += (dx / dd * 230 - b.vx) * dt * 1.2;
    b.vy += (dy / dd * 230 - b.vy) * dt * 1.2;
    if (b.stT <= 0) {
      b.st = 'aim'; b.stT = 1.25;
      // метит с упреждением — стоять на месте безопаснее, чем удирать по прямой
      b.tx = io.x + io.vx * 0.75; b.ty = io.y + io.vy * 0.75;
      sfxZap(b.x);
    }
  } else if (b.st === 'aim') {
    const dx = b.tx - b.x, dy = b.ty - b.y, dd = hyp(dx, dy) || 1;
    b.vx += (dx / dd * 900 - b.vx) * dt * 3;
    b.vy += (dy / dd * 900 - b.vy) * dt * 3;
    if (b.stT <= 0 || dd < 60) {
      b.x = b.tx; b.y = b.ty; b.vx *= 0.1; b.vy *= 0.1;
      burst(b.tx, b.ty, [1, 0.5, 0.45], 40, 420);
      S.shake = Math.max(S.shake, 0.7);
      sfxCrash();
      if (hyp((io.x - b.tx) / 1.6, io.y - b.ty) < 150) damageIo(26, b.tx, b.ty);
      // глотает мысли окрест — оттого голоднее становится сама ночь
      let ate = 0;
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        if (hyp(m.x - b.tx, m.y - b.ty) < 300) { freeMote(m); motes.splice(i, 1); ate++; }
      }
      b.eaten += ate;
      if (ate > 0) spawnText(b.tx, b.ty - 110, tr('bossWhaleEat'), true);
      b.st = 'surfaced'; b.stT = 3.4;
    }
  } else { // 'surfaced' — глаз открыт: бей, покуда глядит
    b.open = Math.min(1, b.open + dt * 2.5);
    b.vx *= 0.92; b.vy *= 0.92;
    if (hyp((io.x - b.x) / 3, io.y - b.y) < 60) damageIo(20, b.x, b.y);
    if (b.stT <= 0) {
      b.cycle++;
      if (b.cycle % 2 === 0 && enemies.length < 20) spawnEnemy('moth', b.x, b.y, false);
      b.st = 'deep'; b.stT = rand(3.5, 5);
    }
  }
  if (b.st !== 'surfaced') b.open = Math.max(0, b.open - dt * 3);

  b.x += b.vx * dt; b.y += b.vy * dt;
  if (Math.abs(b.vx) > 18) b.dir = b.vx < 0 ? -1 : 1;

  // искры разбивают глаз, покуда он открыт
  if (b.open > 0.5) {
    const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
    for (const sp of io.spirits) {
      if (sp.cd > 0) continue;
      const sx = io.x + Math.cos(sp.ang) * orbR, sy = io.y + Math.sin(sp.ang) * orbR * 0.82;
      if (hyp(sx - eye.x, sy - eye.y) < 34) {
        sp.cd = 1.6 * RUN.sparkCdMul;
        b.hp--; b.flashT = 0.25;
        burst(eye.x, eye.y, [1, 0.6, 0.5], 16, 260);
        sfxKill(b.x);
        S.shake = Math.max(S.shake, 0.2);
        if (b.hp <= 0) { killBoss(); return; }
        break;
      }
    }
  }
}

function updateBoss(dt) {
  const b = boss;
  if (b.kind === 'whale') { updateWhaleBoss(b, dt); return; }
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
  RUN.bosses++; unlockChallenge('c_ships_1');
  S.bossDone = true;
  S.shake = 1; S.glitch = 0.8;
  burst(b.x, b.y, [1, 0.8, 0.5], 70, 520);
  burst(b.x, b.y, [0.7, 0.4, 1], 50, 420);
  sfxCrash(); sfxChoice();
  // левиафан возвращает проглоченное — сверх обычной добычи
  const loot = 12 + Math.min(10, b.eaten || 0);
  for (let i = 0; i < loot; i++) spawnMoteAt(b.x + rand(-220, 220), b.y + rand(-140, 140), 26);
  for (let i = 0; i < 2; i++) {
    const p = spawnRing(160, 420);
    stars.push({ x: p.x, y: p.y, t: 0, life: 16, seed: rand(TAU) });
  }
  const di = b.kind === 'whale' ? 1 : 0; // каждому чудищу — свой подвиг на небе
  if (catchKey(phraseKey(5, di))) RUN.newStars++;
  spawnText(b.x, b.y - 90, deeds()[di], true);
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
const GAME_FONT = '"SAO UI", "Trebuchet MS", sans-serif'; // узорный: летучие фразы мира
// Таблички сада — не украшение, а учебник: их читают внимательно и целиком,
// оттого набраны они тем же обычным шрифтом, что и весь интерфейс.
const UI_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const _measC = document.createElement('canvas');
const _measG = _measC.getContext('2d');
function spawnText(x, y, str, big) {
  if (!SET.text) return; // надписи выключены — ночь молчит
  // Строку читают на бегу, поверх свечений и зерна: оттого начертание плотное,
  // кегль щедрый, а под буквами — двойная тёмная ножка. Цвет крупной строки
  // берётся из палитры ночи, но непременно осветляется к белому: сама палитра
  // в разгар ночи уходит в маджентовый, и строка тонула в собственном небе.
  const fs = big ? 32 : 26;
  const font = '600 ' + fs * TEXT_SS + 'px ' + GAME_FONT;
  const pad = 30 * TEXT_SS;
  _measG.font = font;
  const tw = Math.ceil(_measG.measureText(str).width);
  const mc = document.createElement('canvas');
  const mg = mc.getContext('2d');
  mc.width = tw + pad * 2; mc.height = fs * TEXT_SS + pad * 2;
  mg.font = font; mg.textAlign = 'center'; mg.textBaseline = 'middle';
  mg.shadowColor = 'rgba(5,6,10,.92)'; mg.shadowBlur = 9 * TEXT_SS;
  mg.fillStyle = 'rgba(5,6,10,.9)';
  mg.fillText(str, mc.width / 2, mc.height / 2 + 1.5 * TEXT_SS);
  mg.fillText(str, mc.width / 2, mc.height / 2 + 1.5 * TEXT_SS);
  mg.shadowBlur = 14 * TEXT_SS;
  mg.fillStyle = big ? css3(mix3(S.pal.mote, [1, 1, 1], 0.45), 1) : 'rgba(246,244,240,1)';
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

// капель мыслей, что сыплются в шкатулку на листе итогов
function sfxTick(k) {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.07, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  g.connect(A.sfxBus);
  const send = ctx.createGain(); send.gain.value = 0.8; g.connect(send); send.connect(A.verbSend);
  const o = ctx.createOscillator(); o.type = 'triangle';
  o.frequency.value = m2f(PENT[k % PENT.length] + 12);
  o.connect(g); o.start(t); o.stop(t + 0.25);
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
// Нажатия помним дважды: по букве (для цифр, Esc и Enter) и по физическому
// коду — на нём стоит вся правка, оттого раскладка не зависит от языка.
const codes = Object.create(null);
function held(act) {
  const c = SET.keys[act];
  return !!(c && codes[c]);
}
function actOf(code) { // какое дело привязано к этой клавише
  for (const a in SET.keys) if (SET.keys[a] === code) return a;
  return null;
}
let haltHeld = false; // левая кнопка держит свет на месте
let keyGrab = null;   // настройки ждут клавишу: сюда кладётся ловец
// Имя клавиши для подсказок: коды вида KeyQ читать игроку незачем.
function keyName(code) {
  if (!code) return '—';
  if (code === 'Mouse0') return tr('keyMouse');
  if (code === 'Mouse2') return tr('keyMouse2');
  if (code === 'Space') return tr('keySpace');
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Arrow')) return { Up: '↑', Down: '↓', Left: '←', Right: '→' }[code.slice(5)] || code;
  if (code.startsWith('Shift')) return 'shift';
  if (code.startsWith('Control')) return 'ctrl';
  if (code.startsWith('Alt')) return 'alt';
  if (code === 'Tab') return 'tab';
  return code;
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
    // Кнопки мыши идут через ту же раскладку, что и клавиши: 'Mouse0' и 'Mouse2'
    // — такие же коды. Правая, если ничем не занята, по старой привычке кидает нить.
    const act = actOf('Mouse' + e.button);
    if (act === 'halt') haltHeld = true; // держать свет на месте
    else if (act === 'tether') toggleTether();
    else if (act === 'blink') tryRelocate();
    else if (act === 'charge') startOvercharge();
    else if (e.button === 2) toggleTether();
    return;
  }
  audioUnlock();
  if (steerId !== null) return; // второй палец не перехватывает штурвал
  steerId = e.pointerId;
  joyStart(e);
});
for (const ev of ['pointerup', 'pointercancel']) {
  window.addEventListener(ev, e => {
    if (e.pointerType === 'mouse' && actOf('Mouse' + e.button) === 'halt') haltHeld = false;
    if (steerId === e.pointerId) { steerId = null; joyEnd(); }
  });
}
window.addEventListener('blur', () => { haltHeld = false; for (const k in codes) codes[k] = false; });
window.addEventListener('contextmenu', e => {
  if (S.mode === 'play' || keyWaiting) e.preventDefault(); // ловля клавиши ждёт и правую кнопку
});
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  codes[e.code] = true;
  if (keyGrab) { keyGrab(e); return; } // настройки ловят клавишу для переназначения
  if (S.mode === 'play' && !S.paused) { // дела по нынешней раскладке
    const act = actOf(e.code);
    if (act === 'tether') { e.preventDefault(); toggleTether(); }
    else if (act === 'blink') { e.preventDefault(); tryRelocate(); }
    else if (act === 'charge') { e.preventDefault(); startOvercharge(); }
    else if (act === 'halt') e.preventDefault();
  }
  if (S.mode === 'level' && ['1', '2', '3'].includes(e.key)) {
    const card = document.querySelector('.dream[data-key="' + e.key + '"]');
    if (card) card.click();
    return;
  }
  if (e.key === 'Escape') {
    if (!setPanel.classList.contains('hidden')) { closeSettings(); return; }
    if (S.mode === 'title') { titleScreen.classList.remove('open'); return; }
    if (S.mode === 'play') togglePause();
  }
  // Enter на титуле зажигает сразу, минуя меню — как в osu
  if (e.key === 'Enter' && S.mode === 'title' && titleScreen &&
      !titleScreen.classList.contains('hidden') &&
      skyScreen.classList.contains('hidden') && metaScreen.classList.contains('hidden') &&
      skinScreen.classList.contains('hidden')) startRun();
  // Пробел и Shift оставлены сверх раскладки: к ним привыкли за десять версий
  if (e.code === 'Space' && S.mode === 'play' && !S.paused && SET.keys.blink !== 'Space') {
    e.preventDefault(); tryRelocate();
  }
  if (e.key === 'Shift' && SET.keys.charge !== 'ShiftLeft') startOvercharge();
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
  codes[e.code] = false;
});
const ocBtn = document.getElementById('ocBtn');
const btnTether = document.getElementById('btnTether');
const btnBlink = document.getElementById('btnBlink');
// заряд более не держится пальцем: нажал — и свет горит своё время сам
function startOvercharge() {
  if (abLvl('charge') < 1 || S.mode !== 'play' || S.paused) return;
  if (io.oc || io.ocCd > 0) return;
  io.oc = true;
  io.ocT = RUN.ocDur;
  ocBtn.classList.add('held');
  burst(io.x, io.y, [1, 0.72, 0.35], 18, 240);
  sfxChoice();
}
ocBtn.addEventListener('pointerdown', e => {
  e.preventDefault(); e.stopPropagation();
  audioUnlock(); startOvercharge();
});
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
  if (abLvl('tether') < 1) return; // нить ещё не изучена
  if (io.tether) { releaseTether(); return; }
  const best = S.reachShip || shipInReach();
  if (best) {
    io.tether = best;
    if (playing) {
      CH_STATS.shipsTethered.add(best);
      if (CH_STATS.shipsTethered.size >= 5) unlockChallenge('c_ships_3');
    }
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
  if (abLvl('blink') < 1) return; // мерцание ещё не изучено
  // вторым нажатием — назад к отголоску (по воле, не по принуждению)
  if (io.reloc.phase === 'echo' && !BOT.on) {
    shakeOffMoths();
    burst(io.x, io.y, IO_COL, 14, 200);
    const far = hyp(io.reloc.rx - io.x, io.reloc.ry - io.y) > viewR();
    io.x = io.reloc.rx; io.y = io.reloc.ry;
    io.vx = 0; io.vy = 0; io.trail = [];
    // возврат издалека камерою не догоняется — иначе мир промчался бы мимо
    if (far) { cam.x = io.x; cam.y = io.y; checkCells(); }
    io.reloc.phase = 'idle';
    S.hurtT = Math.max(S.hurtT, relocGuard());
    burst(io.x, io.y, IO_COL, 14, 200);
    if (RUN.echo) echoBlast(io.x, io.y);
    sfxReloc(true);
    return;
  }
  if (io.reloc.cd > 0 || io.reloc.phase !== 'idle') return;
  io.reloc.rx = io.x; io.reloc.ry = io.y;
  shakeOffMoths();
  burst(io.x, io.y, IO_COL, 16, 220);
  const pw = BOT.on ? BOT : pointerWorld();
  io.x = pw.tx !== undefined ? pw.tx : pw.x;
  io.y = pw.ty !== undefined ? pw.ty : pw.y;
  io.vx = 0; io.vy = 0;
  io.trail = [];
  // позади тлеет отголосок-приманка: кошмары летят на него, не на тебя,
  // а сам след держит минуту — воротиться можно хоть с края ночи
  io.reloc.phase = 'echo'; io.reloc.timer = RUN.echoLife;
  io.reloc.hold = RUN.echoHold; io.reloc.cd = RUN.relocCd;
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
  freeEnemy(enemies.splice(i, 1)[0]);
  RUN.kills++;
  if (isStormNight()) {
    CH_STATS.stormKills++;
    if (CH_STATS.stormKills >= 10) unlockChallenge('c_storm_4');
  }
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
  if (isStormNight()) CH_STATS.stormDmg += dmg * mul;
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
  if (TUTOR.on) { RUN.wake = RUN.wakeMax * 0.5; return; } // в саду не растворяются
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
    if (!TUTOR.on) S.t += dt / NIGHT_LEN; // в саду ночь стоит на месте
    if (S.t >= 1) { // ночь перетекает в следующую без остановки
      S.t -= 1;
      RUN.night++;
      if (RUN.night === 4) unlockChallenge('c_night_1');
      if (RUN.night === 8) unlockChallenge('c_night_2');
      if (RUN.night === 12) unlockChallenge('c_night_3');
      if (RUN.night > 1 && (RUN.night - 1) % 3 === 0) {
        unlockChallenge('c_storm_1');
        if (CH_STATS.stormDmg === 0) unlockChallenge('c_storm_2');
        CH_STATS.stormDmg = 0; CH_STATS.stormThoughts = 0; CH_STATS.stormKills = 0;
      }
      CH_STATS.tetherKillsNight = 0;
      CH_STATS.shipsTethered.clear();
      
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
  if (TUTOR.on) updateTutor(dt); else checkCells(); // сад разложен рукою, не хешем

  // Прицел ходит за мышью и никуда не бегает сам: клавиши правят светом, а
  // прицел нужен мерцанию — оно переносит ровно туда, куда он смотрит.
  pointer.x = clamp(pointer.x, 10, W - 10); pointer.y = clamp(pointer.y, 10, H - 20);

  // --- Ио ---
  if (playing) {
    // бодрость тает всегда — полного стопа нет нигде, лишь замедления,
    // зато сама трата чуть мягче прежней: у игрока больше времени
    const chainMul = (RUN.chain && io.tether) ? 0.25 : 1;
    const ocSlow = io.oc ? 0.55 : 1; // заряд бережёт свет, но не гасит трату
    if (!TUTOR.on) RUN.wake -= (0.92 + 0.38 * Math.min(D, 11)) * RUN.drainMul * chainMul * ocSlow * dt;

    if (io.reloc.phase === 'echo') {
      io.reloc.timer = Math.max(0, io.reloc.timer - dt); // приманка дотлевает скоро
      io.reloc.hold -= dt;
      if (io.reloc.hold <= 0) io.reloc.phase = 'idle';   // след остыл — дороги назад нет
    }
    io.reloc.cd = Math.max(0, io.reloc.cd - dt);

    let tx, ty, k = 7.5 * RUN.speed;
    // направление правки помним — по нему уходит швырок с нити
    if (BOT.on) { // отладочный лётчик: замеряет выживаемость без живых рук
      const t2 = botTarget();
      tx = t2.x; ty = t2.y;
    } else if (touchSteer) {
      // цель — впереди Ио по наклону стика; чем сильнее наклон, тем дальше
      // цель, а с нею и скорость. Палец замер — Ио гасит ход и висит.
      const lead = joy.on ? 410 * joy.mag : 0;
      tx = io.x + joy.nx * lead;
      ty = io.y + joy.ny * lead / view.tilt;
      const P = proj(tx, ty);
      pointer.x = clamp(P.x, 10, W - 10);
      pointer.y = clamp(P.y, 10, H - 20);
    } else if (SET.steer === 'keys') {
      // Клавишами правят самим светом: нажал — полетел, отпустил — встал.
      // Прежде WASD лишь двигали прицел, а свет вечно летел к нему, и стоять
      // на месте было нельзя вовсе.
      let dx = 0, dy = 0;
      if (held('left') || keys['ArrowLeft']) dx -= 1;
      if (held('right') || keys['ArrowRight']) dx += 1;
      if (held('up') || keys['ArrowUp']) dy -= 1;
      if (held('down') || keys['ArrowDown']) dy += 1;
      const l = hyp(dx, dy);
      if (l > 0) {
        tx = io.x + (dx / l) * 430;
        ty = io.y + (dy / l) * 430 / view.tilt;
      } else { tx = io.x; ty = io.y; } // ничего не нажато — стоит
    } else {
      const pw = pointerWorld();
      tx = pw.x; ty = pw.y;
    }
    // Левая кнопка держит свет на месте: не просто отпускает правку, а гасит
    // ход, чтобы можно было замереть и переждать, а не проплывать по инерции.
    if (haltHeld || held('halt')) {
      tx = io.x; ty = io.y;
      const brake = Math.pow(0.015, dt);
      io.vx *= brake; io.vy *= brake;
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
    if (io.oc) io.heat = Math.max(0, io.heat - dt * 2); // заряд глушит перегрев
    else if (spd > HOT) io.heat = Math.min(1, io.heat + (spd / HOT - 1) * 2 * dt);
    else io.heat = Math.max(0, io.heat - dt * 1.2);
    if (!io.oc && io.heat > 0.5) {
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
        if (d2 > TETHER_LEASH * 1.5) { releaseTether(true); unlockChallenge('c_tether_3'); }
      } else S.strain = 0;
    } else S.strain = 0;
    RUN.dist += spd * dt;
    io.trail.unshift({ x: io.x, y: io.y });
    if (io.trail.length > 22) io.trail.pop();
    // звёздная пыль: в полёте с огонька осыпаются золотые искорки
    if (SET.visuals.dust && spd > 110 && Math.random() < dt * 13)
      newPart(io.x - io.vx * 0.05 + rand(-7, 7), io.y - io.vy * 0.05 + rand(-7, 7),
        rand(-14, 14), rand(-10, 16), rand(0.35, 0.8), DUST_GOLD, rand(0.5, 1.1));

    if (io.oc) {
      io.ocT -= dt;
      if (io.ocT <= 0) { io.oc = false; io.ocCd = RUN.ocCd; ocBtn.classList.remove('held'); }
    }
    io.ocCd = Math.max(0, io.ocCd - dt);
    checkDissolve();
    if (S.mode !== 'play') return; // растворился прямо сейчас

    // хоровод как в доте: искры на равных промежутках круга; новая искра
    // встраивается плавно — все раздвигаются, уступая ей место
    const spinMul = (io.oc ? 2 : 1) * RUN.spinMul;
    io.spin = (io.spin || 0) + dt * 1.7 * spinMul;
    const nSp = io.spirits.length;
    for (let si = 0; si < nSp; si++) {
      const sp = io.spirits[si];
      const want = io.spin + si * TAU / nSp;
      let dAng = (want - sp.ang) % TAU;
      if (dAng > Math.PI) dAng -= TAU; else if (dAng < -Math.PI) dAng += TAU;
      sp.ang += dAng * Math.min(1, dt * 5);
      sp.cd = Math.max(0, sp.cd - dt);
    }
  }

  if (playing) { // корабль в досягаемости — подсказать единожды за бессонницу
    S.reachShip = (io.tether || abLvl('tether') < 1) ? null : shipInReach();
    if (S.reachShip && !S.tetherHinted && S.playT > 4) {
      S.tetherHinted = true;
      spawnText(S.reachShip.x, S.reachShip.y - 80 * S.reachShip.scl, tr('hintTether'), true);
    }
  } else S.reachShip = null;

  // камера догоняет свет
  cam.x += (io.x + io.vx * 0.4 - cam.x) * Math.min(1, dt * 2.5);
  cam.y += (io.y + io.vy * 0.4 - cam.y) * Math.min(1, dt * 2.5);

  // --- таймеры мира ---

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
  if (!TUTOR.on && shipTimer <= 0 && ships.length < 3) { spawnShip(); shipTimer = lerp(15, 8, S.energy) * rand(0.8, 1.3); }
  shotTimer -= dt;
  if (shotTimer <= 0) {
    shotTimer = lerp(9, 2.2, S.energy) * rand(0.6, 1.5);
    shots.push({ x: rand(W * 0.2, W), y: rand(H * 0.05, H * 0.35), vx: -rand(500, 900), vy: rand(120, 260), t: 0, life: rand(0.5, 0.9) });
  }
  if (playing && !TUTOR.on) { // в саду ни волн, ни кораблей-кошмаров
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
      RUN.waves++;
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
    if (m.born > m.life || hyp(m.x - cam.x, m.y - cam.y) > keepR()) { freeMote(motes.splice(i, 1)[0]); continue; }
    if (playing && d < RUN.pickupR) {
      freeMote(motes.splice(i, 1)[0]);
      collectMote(m);
    }
  }

  // --- корабли ---
  for (let i = ships.length - 1; i >= 0; i--) {
    const sh = ships[i];
    sh.x += sh.vx * dt; sh.bob += dt * 0.9;
    if (hyp(sh.x - cam.x, sh.y - cam.y) > keepR() && io.tether !== sh && sh.bh === undefined) { ships.splice(i, 1); continue; }
    if (playing) {
      sh.life -= dt;
      if (sh.life <= 10 && sh.bh === undefined) {
        sh.bh = 10; sh.bhX = sh.x - sh.dir * 160 * sh.scl; sh.bhY = sh.y;
        sfxCrash();
      }
      if (sh.bh !== undefined) {
        sh.bh -= dt;
        sh.x += (sh.bhX - sh.x) * dt * 0.5;
        sh.y += (sh.bhY - sh.y) * dt * 0.5;
        if (sh.bh <= 3 && Math.random() < dt * 4) spawnMoteAt(sh.x + rand(-30, 30), sh.y + rand(-30, 30), 10);
        if (sh.bh <= 0) {
          if (io.tether === sh) die('blackhole');
          else if (sh.bh <= 1.2 && io.tether === null) unlockChallenge('c_ships_2');
          ships.splice(i, 1);
          burst(sh.x, sh.y, [0.1, 0.1, 0.2], 40, 500);
          sfxCrash();
          continue;
        }
      }
    }
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
    if (hyp(e.x - cam.x, e.y - cam.y) > keepR()) { freeEnemy(enemies.splice(i, 1)[0]); continue; }
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
      if (e.threadT >= TETHER_BURN * RUN.threadBurnMul) {
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
        if (e.threadT >= TETHER_BURN * 2 * RUN.threadBurnMul) {
          e.threadT = 0; e.hp--; e.flashT = 0.25;
          burst(e.x, e.y, IO_COL, 12, 220); sfxKill(e.x);
          if (e.hp <= 0) {
            unlockChallenge('c_tether_4');
            freeEnemy(enemies.splice(i, 1)[0]); RUN.kills++;
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
            freeEnemy(enemies.splice(i, 1)[0]);
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

  // --- ландмарки ---
  for (let i = landmarks.length - 1; i >= 0; i--) {
    const lm = landmarks[i];
    if (hyp(lm.x - cam.x, lm.y - cam.y) > viewR() * 3) { landmarks.splice(i, 1); continue; }
    if (!playing) continue;
    
    if (lm.type === 'lighthouse') {
      if (!lm.seen && lm.state === 'dark' && hyp(io.x - lm.x, io.y - lm.y) < 340) {
        lm.seen = true;
        spawnText(lm.x, lm.y - 110, tr('lm_lighthouse'), true);
      }
      if (lm.state === 'dark' && hyp(io.x - lm.x, io.y - lm.y) < 120) {
        lm.state = 'lit'; lm.t = 30;
        spawnText(lm.x, lm.y - 120, tr('lm_lighthouse_lit'), true);
        burst(lm.x, lm.y, [1, 0.9, 0.6], 30, 400);
        unlockChallenge('c_folk_1');
      }
      if (lm.state === 'lit') {
        lm.t -= dt;
        if (lm.t <= 0) lm.state = 'done';
        else {
          // возвращает половину траты — таяние вдвое медленней, но не стоп:
          // полного стопа бодрости в игре нет нигде
          if (hyp(io.x - lm.x, io.y - lm.y) < 250) {
            const lch = (RUN.chain && io.tether) ? 0.25 : 1;
            const loc = io.oc ? 0.55 : 1;
            RUN.wake += (0.92 + 0.38 * Math.min(D, 11)) * RUN.drainMul * lch * loc * 0.5 * dt;
          }
          // отпугивает врагов
          for (const e of enemies) {
            const d = hyp(e.x - lm.x, e.y - lm.y);
            if (d < 250) { e.vx += (e.x - lm.x) / d * 180 * dt; e.vy += (e.y - lm.y) / d * 180 * dt; }
          }
        }
      }
    } else if (lm.type === 'graveyard') {
      if (!lm.seen && hyp(io.x - lm.x, io.y - lm.y) < 300) {
        lm.seen = true;
        spawnText(lm.x, lm.y - 120, tr('lm_graveyard'), true);
        spawnText(lm.x, lm.y - 70, tr('lm_graveyard_hint'));
      }
    } else if (lm.type === 'whale') {
      if (!lm.seen && hyp(io.x - lm.x, io.y - lm.y) < 300) { lm.seen = true; spawnText(lm.x, lm.y - 120, tr('lm_whale'), true); }
      lm.x += lm.vx * dt; lm.y += lm.vy * dt;
      lm.t -= dt;
      if (lm.t <= 0) {
        lm.t = 4;
        spawnMoteAt(lm.x, lm.y, 20); // дыхало
      }
      if (hyp(io.x - lm.x, io.y - lm.y) < 140) {
        const d = hyp(io.x - lm.x, io.y - lm.y) || 1;
        io.vx += (io.x - lm.x) / d * 300 * dt;
        io.vy += (io.y - lm.y) / d * 300 * dt;
        S.shake = Math.max(S.shake, 0.3);
        // будит соседей
        for (const e of enemies) if (hyp(e.x - lm.x, e.y - lm.y) < 600) e.sleeping = false;
      }
    } else if (lm.type === 'lamplighter') {
      if (!lm.seen && hyp(io.x - lm.x, io.y - lm.y) < 300) { lm.seen = true; spawnText(lm.x, lm.y - 40, tr('lm_lamplighter'), true); }
      lm.x += lm.vx * dt; lm.y += lm.vy * dt;
      lm.t -= dt;
      if (lm.t <= 0) {
        lm.t = 2.5;
        const m = allocMote();
        Object.assign(m, { x: lm.x, y: lm.y, vx: 0, vy: 0, r: 7, seed: rand(TAU), life: 40, born: 0, lamplight: true });
        motes.push(m);
      }
    } else if (lm.type === 'starfall') {
      if (lm.state === 'wait' && hyp(io.x - lm.x, io.y - lm.y) < 300) {
        lm.state = 'active'; lm.t = 8;
        spawnText(lm.x, lm.y - 100, tr('lm_starfall'), true);
      }
      if (lm.state === 'active') {
        lm.t -= dt;
        if (Math.random() < dt * 0.4 && stars.length < 5) {
          const p = spawnRing(100, 300);
          stars.push({ x: p.x, y: p.y, t: 0, life: 14, seed: rand(TAU) });
          burst(p.x, p.y, [1, 1, 1], 20, 300);
        }
        if (lm.t <= 0) lm.state = 'done';
      }
    } else if (lm.type === 'star') {
      // уснувшая звезда: разбудишь — одаришь себя и ночь разом
      if (lm.state === 'done') { landmarks.splice(i, 1); continue; }
      const d = hyp(io.x - lm.x, io.y - lm.y);
      if (!lm.seen && lm.state === 'asleep' && d < 320) {
        lm.seen = true;
        spawnText(lm.x, lm.y - 110, tr('lm_star'), true);
        spawnText(lm.x, lm.y - 60, tr('lm_star_hint'));
      }
      if (lm.state === 'asleep') {
        if (d < 95) {
          lm.prog += dt;
          if (Math.random() < dt * 6) sfxTick(Math.floor(lm.prog * 2));
          S.shake = Math.max(S.shake, Math.min(0.25, lm.prog * 0.1));
          if (lm.prog >= 2.5) {
            lm.state = 'awake'; lm.t = 0;
            unlockChallenge('c_folk_2');
            spawnText(lm.x, lm.y - 120, tr('lm_star_wake'), true);
            burst(lm.x, lm.y, [1, 0.95, 0.7], 40, 500);
            sfxZap(lm.x);
            S.glitch = Math.max(S.glitch, 0.4);
            // дар: кольцо мыслей и две падучие звезды
            for (let k = 0; k < 10; k++) {
              const a = k / 10 * TAU;
              spawnMoteAt(lm.x + Math.cos(a) * 120, lm.y + Math.sin(a) * 120, 30);
            }
            for (let k = 0; k < 2; k++)
              stars.push({ x: lm.x + rand(-260, 260), y: lm.y + rand(-260, 260), t: 0, life: 20, seed: rand(TAU) });
            // расплата: ночь просыпается вместе с нею
            for (const e of enemies) if (hyp(e.x - lm.x, e.y - lm.y) < 1100) e.sleeping = false;
            for (let k = 0; k < 3; k++) {
              const a = rand(TAU);
              spawnEnemy(pickEnemyType(), lm.x + Math.cos(a) * rand(420, 620), lm.y + Math.sin(a) * rand(420, 620), false);
            }
          }
        } else lm.prog = Math.max(0, lm.prog - dt * 1.5);
      } else if (lm.state === 'awake') {
        lm.t += dt; lm.y -= 140 * dt; // восходит на небо
        if (lm.t > 2.5) lm.state = 'done';
      }
    } else if (lm.type === 'pedlar') {
      // сонный меняла: два фонаря — два торга, без единого слова лишку
      lm.cd = Math.max(0, lm.cd - dt);
      if (lm.state === 'leaving') { lm.x += lm.vx * dt; lm.y += lm.vy * dt; }
      else {
        lm.x += lm.vx * dt; lm.y += lm.vy * dt;
        const dir = lm.vx < 0 ? -1 : 1;
        const ax = lm.x + 80 * dir, vy2 = lm.y - 34; // янтарный на носу
        const vx2 = lm.x - 80 * dir;                 // лиловый на корме
        if (!lm.seen && hyp(io.x - lm.x, io.y - lm.y) < 320) {
          lm.seen = true;
          spawnText(lm.x, lm.y - 165, tr('lm_pedlar'), true);
          spawnText(lm.x, lm.y - 115, tr('lm_pedlar_amber', 12));
          spawnText(lm.x, lm.y - 70, tr('lm_pedlar_violet', 25));
        }
        if (lm.cd <= 0) {
          if (hyp(io.x - ax, io.y - vy2) < 60) {
            if (RUN.thoughts >= 12) {
              RUN.thoughts -= 12;
              RUN.wake = Math.min(RUN.wakeMax, RUN.wake + 30);
              lm.state = 'leaving';
              const dd = hyp(lm.x - io.x, lm.y - io.y) || 1;
              lm.vx = (lm.x - io.x) / dd * 70; lm.vy = (lm.y - io.y) / dd * 70;
              spawnText(lm.x, lm.y - 110, tr('lm_pedlar_done'), true);
              burst(ax, vy2, [1, 0.8, 0.45], 16, 200);
              sfxChoice();
              unlockChallenge('c_folk_3');
            } else { lm.cd = 3; spawnText(lm.x, lm.y - 110, tr('lm_pedlar_poor')); }
          } else if (hyp(io.x - vx2, io.y - vy2) < 60) {
            if (RUN.wake > 40) {
              RUN.wake -= 25;
              RUN.thoughts += 10;
              lm.state = 'leaving';
              const dd = hyp(lm.x - io.x, lm.y - io.y) || 1;
              lm.vx = (lm.x - io.x) / dd * 70; lm.vy = (lm.y - io.y) / dd * 70;
              spawnText(lm.x, lm.y - 110, tr('lm_pedlar_done'), true);
              burst(vx2, vy2, [0.7, 0.55, 1], 16, 200);
              sfxChoice();
              unlockChallenge('c_folk_3');
            } else { lm.cd = 3; spawnText(lm.x, lm.y - 110, tr('lm_pedlar_poor')); }
          }
        }
      }
    } else if (lm.type === 'nest') {
      // гнездо кошмаров: родит тени, покуда не выжжено
      if (lm.state === 'done') { landmarks.splice(i, 1); continue; }
      const d = hyp(io.x - lm.x, io.y - lm.y);
      if (!lm.seen && d < 320) {
        lm.seen = true;
        spawnText(lm.x, lm.y - 110, tr('lm_nest'), true);
        spawnText(lm.x, lm.y - 60, tr('lm_nest_hint'));
      }
      lm.t -= dt;
      if (lm.t <= 0) {
        lm.t = 7;
        if (enemies.length < 20) {
          const e = allocEnemy();
          Object.assign(e, {
            x: lm.x + rand(-40, 40), y: lm.y + rand(-40, 40), vx: 0, vy: rand(10, 40),
            r: rand(6, 9), sp: 110 + D * 12, dmg: 10, seed: rand(TAU),
            type: 'shade', sleeping: false, threadT: 0, dead: false,
          });
          enemies.push(e);
        }
      }
      if (d < 90) {
        lm.prog += dt;
        if (Math.random() < dt * 6) sfxTick(Math.floor(lm.prog * 3));
        if (!lm.cried && lm.prog > 0.15) {
          lm.cried = true;
          spawnText(lm.x, lm.y - 110, tr('lm_nest_cry'), true);
          for (let k = 0; k < 2; k++) {
            const e = allocEnemy();
            Object.assign(e, {
              x: lm.x + rand(-60, 60), y: lm.y + rand(-60, 60), vx: 0, vy: 0,
              r: rand(6, 9), sp: 115 + D * 12, dmg: 10, seed: rand(TAU),
              type: 'shade', sleeping: false, threadT: 0, dead: false,
            });
            enemies.push(e);
          }
        }
        if (lm.prog >= 2) {
          lm.state = 'done';
          unlockChallenge('c_folk_4');
          spawnText(lm.x, lm.y - 110, tr('lm_nest_done'), true);
          burst(lm.x, lm.y, [1, 0.5, 0.6], 30, 350);
          sfxKill(lm.x);
          for (let k = 0; k < 8; k++) {
            const a = k / 8 * TAU;
            spawnMoteAt(lm.x + Math.cos(a) * 90, lm.y + Math.sin(a) * 90, 25);
          }
        }
      } else lm.prog = Math.max(0, lm.prog - dt * 1.5);
    }
  }

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
  S.phraseT = Math.max(0, (S.phraseT || 0) - dt);
  if (S.comboT <= 0 && S.combo > 0) { S.combo = 0; updateHud(); }

  // первая ночь учит сама — по фразе на урок, и только раз за всю пору
  if (S.mode === 'play' && RUN.night === 1) {
    if (!HINTS.hint_intro && S.playT > 2) onceHint('hint_intro');
    else if (!HINTS.hint_motes && S.playT > 7) onceHint('hint_motes');
    else if (!HINTS.hint_wake && S.playT > 12 && RUN.wake < 55) onceHint('hint_wake');
    else if (!HINTS.hint_foe && S.playT > 5) {
      for (const e of enemies) {
        if (!e.sleeping && hyp(e.x - io.x, e.y - io.y) < 420) { onceHint('hint_foe'); break; }
      }
    }
  }

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
  // отголосок мерцания манит, покуда тлеет: кошмары окрест летят на него, не
  // на свет. Остывший след зовёт одного лишь хозяина — кошмарам он не виден
  let tgx = io.x, tgy = io.y;
  if (io.reloc.phase === 'echo' && io.reloc.timer > 0) {
    const ed = hyp(io.reloc.rx - e.x, io.reloc.ry - e.y);
    if (ed < 560) {
      tgx = io.reloc.rx; tgy = io.reloc.ry;
      if (RUN.echoBurn && ed < 80) { // III степень: приманка ещё и жжёт
        e.burnE = (e.burnE || 0) + dt;
        if (e.burnE > 0.6) e.dead = true;
      }
    }
  }
  const dx = tgx - e.x, dy = tgy - e.y, d = hyp(dx, dy) || 1;
  if (e.sleeping) {
    if (d < viewR() * 0.95) e.sleeping = false; // просыпается, лишь войдя в поле зрения
    else return;
  }
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
        freeMote(motes.splice(motes.indexOf(target), 1)[0]);
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
  if (RUN.thoughts >= 100) unlockChallenge('c_night_4');
  if (isStormNight()) {
    CH_STATS.stormThoughts++;
    if (CH_STATS.stormThoughts >= 20) unlockChallenge('c_storm_3');
  }
  // мысли у разломов ценнее: +1 опыта, а с даром — двойное лечение
  const nearRift = zoneAt(m.x, m.y, 'rift');
  let heal = (4 + RUN.healBonus) * (nearRift && RUN.riftGift ? 2 : 1);
  if (m.lamplight) heal *= 1.5;
  const inGrave = landmarks.some(l => l.type === 'graveyard' && hyp(m.x - l.x, m.y - l.y) < 250);
  if (inGrave) heal *= 2;
  RUN.wake = Math.min(RUN.wakeMax, RUN.wake + heal);
  S.combo++; S.comboT = 3 * RUN.comboMul;
  if (S.combo > RUN.comboBest) RUN.comboBest = S.combo;
  sfxCollect(S.combo - 1, m.x);
  burst(m.x, m.y, S.pal.mote, 12, 200);
  // Фразам положена передышка: мысли ныне лежат россыпями, и без неё
  // подобранная горсть рожала месиво из наслоённых строк.
  const tier = phraseTier(S.t);
  if (RUN.thoughts === 1 || (S.phraseT <= 0 && Math.random() < 0.5)) {
    S.phraseT = 2.6;
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


// Жители ночи рисуются языком игры: тонкий штрих и мягкое свечение,
// ни единой сплошной заливки. Точки кита лежат константой — в кадре ничего
// не рождается.
const WHALE_PTS = [ // созвездие кита: спина, брюхо, хвост — узлы-звёзды
  [-70, -6], [-38, -22], [0, -28], [36, -20], [64, -4],   // спина
  [46, 10], [8, 16], [-30, 12],                            // брюхо
  [78, -14], [86, 8],                                      // хвост двумя перьями
];
const WHALE_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,8],[4,9],[4,5],[5,6],[6,7],[7,0]];
function drawLandmark(lm, p, pal, tm) {
  sc.save(); sc.translate(p.x, p.y); sc.scale(p.k, p.k);
  sc.globalCompositeOperation = 'lighter';
  if (lm.type === 'lighthouse') {
    // небесный фонарь: штриховой купол с рёбрами, тлеющее сердце
    const lit = lm.state === 'lit';
    const breath = 0.5 + 0.5 * Math.sin(tm * (lit ? 4 : 1.2) + lm.x);
    const warm = [1, 0.82, 0.5];
    sc.strokeStyle = css3(lit ? warm : pal.tint, lit ? 0.75 : 0.4);
    sc.lineWidth = 1.4;
    sc.beginPath(); sc.ellipse(0, -46, 30, 40, 0, 0, TAU); sc.stroke();
    sc.lineWidth = 1;
    sc.beginPath(); sc.ellipse(0, -46, 14, 40, 0, 0, TAU); sc.stroke();
    sc.beginPath(); sc.moveTo(-30, -46); sc.lineTo(30, -46); sc.stroke();
    sc.beginPath(); sc.moveTo(-12, -6); sc.lineTo(12, -6); sc.stroke();     // горловина
    sc.beginPath(); sc.moveTo(-9, -86); sc.lineTo(9, -86); sc.stroke();     // макушка
    // кисточка под фонарём — по ней видно, что он висит, а не стоит
    sc.beginPath(); sc.moveTo(0, -6); sc.lineTo(0, 10 + breath * 3); sc.stroke();
    tintGlow(0, -46, lit ? 70 : 34, warm, lit ? 0.6 : 0.14 + breath * 0.1);
    if (lit) {
      tintGlow(0, -46, 250, warm, 0.10 + breath * 0.05);
      // дышащий круг его милости — той же чертой, что круг нити
      sc.strokeStyle = css3(warm, 0.22);
      sc.setLineDash([3, 14]);
      sc.beginPath(); sc.arc(0, -46, 250, tm * 0.25, tm * 0.25 + TAU); sc.stroke();
      sc.setLineDash([]);
    }
  } else if (lm.type === 'graveyard') {
    // рёбра остовов: дуги разной высоты и наклона, будто вмёрзшие в ночь
    sc.strokeStyle = css3(pal.tint, 0.3);
    sc.lineWidth = 1.6;
    for (let i = 0; i < 5; i++) {
      const hx = (i - 2) * 44, tilt = Math.sin(lm.x + i * 2.7) * 0.35;
      const rr = 34 + ((i * 37) % 3) * 14;
      sc.beginPath(); sc.ellipse(hx, 6, rr * 0.55, rr, tilt, Math.PI * 1.05, Math.PI * 1.95); sc.stroke();
    }
    // одинокая мачта с обрывком — тонкой чертой
    sc.lineWidth = 1.1;
    sc.beginPath(); sc.moveTo(52, 8); sc.lineTo(52, -74); sc.stroke();
    sc.beginPath(); sc.moveTo(52, -70); sc.quadraticCurveTo(72, -58 + Math.sin(tm * 1.6) * 4, 66, -40); sc.stroke();
    tintGlow(0, 0, 60, pal.tint, 0.08);
  } else if (lm.type === 'whale') {
    // кит-созвездие: узлы-звёзды и тонкие линии меж ними, как на небе фраз
    const dir = lm.vx < 0 ? -1 : 1;
    sc.strokeStyle = css3(pal.tint, 0.35);
    sc.lineWidth = 1;
    for (const e of WHALE_EDGES) {
      sc.beginPath();
      sc.moveTo(WHALE_PTS[e[0]][0] * dir, WHALE_PTS[e[0]][1]);
      sc.lineTo(WHALE_PTS[e[1]][0] * dir, WHALE_PTS[e[1]][1]);
      sc.stroke();
    }
    sc.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < WHALE_PTS.length; i++) {
      const tw = 0.6 + 0.4 * Math.sin(tm * 2 + i * 1.9);
      sc.beginPath();
      sc.arc(WHALE_PTS[i][0] * dir, WHALE_PTS[i][1], 1.5 + tw, 0, TAU);
      sc.fill();
    }
    // глаз — тёплая звезда чуть ярче прочих
    tintGlow(-52 * dir, -12, 16, [1, 0.9, 0.6], 0.5);
    tintGlow(0, 0, 90, pal.tint, 0.08);
  } else if (lm.type === 'lamplighter') {
    // странник: тёплый огонёк на посохе и шлейф тепла за ним
    const sway = Math.sin(tm * 2.2) * 3;
    sc.strokeStyle = css3(pal.tint, 0.5);
    sc.lineWidth = 1.2;
    sc.beginPath(); sc.moveTo(0, 14); sc.lineTo(0, -26); sc.stroke();        // посох
    sc.beginPath(); sc.moveTo(0, -26); sc.quadraticCurveTo(8, -34, 14, -30 + sway * 0.4); sc.stroke();
    tintGlow(14, -30 + sway * 0.4, 22, [1, 0.8, 0.45], 0.65);
    sc.fillStyle = 'rgba(255,244,220,.95)';
    sc.beginPath(); sc.arc(14, -30 + sway * 0.4, 2.2, 0, TAU); sc.fill();
    tintGlow(-8, 0, 30, pal.tint, 0.12); // само дыхание странника — едва видное
  } else if (lm.type === 'star') {
    // уснувшая звезда: восьмилучевой штрих в колыбели из двух дуг
    const wakeK = lm.state === 'awake' ? 1 : Math.min(1, lm.prog / 2.5);
    const breath = 0.5 + 0.5 * Math.sin(tm * (1 + wakeK * 5) + lm.seed * 7);
    const fade = lm.state === 'awake' ? Math.max(0, 1 - lm.t / 2.5) : 1;
    const warm = [1, 0.94, 0.68];
    sc.globalAlpha = fade;
    sc.strokeStyle = css3(warm, 0.35 + wakeK * 0.45);
    sc.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * TAU + tm * 0.05;
      const len = (i % 2 ? 14 : 26) * (1 + wakeK * 0.4);
      sc.beginPath(); sc.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      sc.lineTo(Math.cos(a) * len, Math.sin(a) * len); sc.stroke();
    }
    // колыбель — две дуги под нею, как гамак меж невидимых снастей
    sc.strokeStyle = css3(pal.tint, 0.3 * fade);
    sc.beginPath(); sc.ellipse(0, 16, 42, 20, 0, Math.PI * 0.15, Math.PI * 0.85); sc.stroke();
    sc.beginPath(); sc.ellipse(0, 22, 58, 26, 0, Math.PI * 0.2, Math.PI * 0.8); sc.stroke();
    tintGlow(0, 0, 26 + wakeK * 60, warm, (0.2 + breath * 0.12 + wakeK * 0.5) * fade);
    sc.globalAlpha = 1;
  } else if (lm.type === 'pedlar') {
    // сонный меняла: чёлн с двумя фонарями — янтарным и лиловым
    const dir = (lm.vx < 0 ? -1 : 1);
    const bob = Math.sin(tm * 1.4 + lm.x * 0.01) * 3;
    sc.strokeStyle = css3(pal.tint, 0.45);
    sc.lineWidth = 1.3;
    // корпус — одна дуга, как долька луны
    sc.beginPath(); sc.moveTo(-58, bob); sc.quadraticCurveTo(0, bob + 26, 58, bob); sc.stroke();
    sc.beginPath(); sc.moveTo(-58, bob); sc.lineTo(58, bob); sc.stroke();
    // коромысла к фонарям
    sc.lineWidth = 1;
    sc.beginPath(); sc.moveTo(46 * dir, bob); sc.lineTo(80 * dir, bob - 34); sc.stroke();
    sc.beginPath(); sc.moveTo(-46 * dir, bob); sc.lineTo(-80 * dir, bob - 34); sc.stroke();
    const amber = [1, 0.8, 0.45], viol = [0.7, 0.55, 1];
    tintGlow(80 * dir, bob - 34, 18, amber, 0.6);
    tintGlow(-80 * dir, bob - 34, 18, viol, 0.6);
    sc.fillStyle = 'rgba(255,244,220,.95)';
    sc.beginPath(); sc.arc(80 * dir, bob - 34, 2, 0, TAU); sc.fill();
    sc.fillStyle = 'rgba(228,220,255,.95)';
    sc.beginPath(); sc.arc(-80 * dir, bob - 34, 2, 0, TAU); sc.fill();
    if (lm.state !== 'leaving') {
      // круги торга — той же чертой, что круг нити
      sc.setLineDash([3, 12]);
      sc.strokeStyle = css3(amber, 0.3);
      sc.beginPath(); sc.arc(80 * dir, bob - 34, 60, tm * 0.3, tm * 0.3 + TAU); sc.stroke();
      sc.strokeStyle = css3(viol, 0.3);
      sc.beginPath(); sc.arc(-80 * dir, bob - 34, 60, -tm * 0.3, -tm * 0.3 + TAU); sc.stroke();
      sc.setLineDash([]);
    }
  } else if (lm.type === 'nest') {
    // гнездо кошмаров: тёмный ком, оплетённый дугами, с тлеющим сердцем
    sc.globalCompositeOperation = 'source-over';
    sc.fillStyle = 'rgba(5,6,10,.55)';
    sc.beginPath(); sc.ellipse(0, 0, 46, 34, 0, 0, TAU); sc.fill();
    sc.globalCompositeOperation = 'lighter';
    const burnK = Math.min(1, lm.prog / 2);
    const ember = [1, 0.45 + burnK * 0.3, 0.55];
    sc.strokeStyle = css3([0.75, 0.5, 0.85], 0.35);
    sc.lineWidth = 1.2;
    for (let i = 0; i < 5; i++) {
      const tilt = Math.sin(lm.x * 0.01 + i * 2.1) * 1.4 + tm * 0.03 * (i % 2 ? 1 : -1);
      sc.beginPath(); sc.ellipse(0, 0, 44 - i * 4, 30 - i * 3, tilt, 0, TAU); sc.stroke();
    }
    const pulse = 0.5 + 0.5 * Math.sin(tm * (2 + burnK * 6));
    tintGlow(0, 0, 16 + burnK * 30, ember, 0.25 + pulse * 0.15 + burnK * 0.5);
  }
  sc.globalCompositeOperation = 'source-over';
  sc.restore();
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
  for (const lm of landmarks) addItem('landmark', lm, lm.y, 350);
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
    else if (it.z === 'landmark') drawLandmark(it.o, it.p, pal, tm);
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

  if (TUTOR.on) drawTutor();

  // фразы — готовые спрайты, тень уже впечена
  for (const tx of texts) {
    const P = proj(tx.x, tx.y);
    const w = tx.spr.width / TEXT_SS * P.k, h = tx.spr.height / TEXT_SS * P.k;
    sc.globalAlpha = tx.a;
    sc.drawImage(tx.spr, clamp(P.x, 130, W - 130) - w / 2, clamp(P.y, 50, H - 40) - h / 2, w, h);
  }
  sc.globalAlpha = 1;

  // Прицел живёт и под нитью — на ПК ему пропадать нельзя. Прежде он был
  // точкою в два пикселя на треть прозрачности и терялся в небе начисто, а
  // меж тем он не украшение: мерцание переносит ровно туда, куда он смотрит.
  // Ныне это малое кольцо с ядром и четырьмя засечками — в тот же свет, что и
  // сам Ио, с тёмной подложкой, чтобы читался и поверх сияний.
  if (S.mode === 'play' && !touchSteer && (pointer.active || !TOUCH)) {
    const px = pointer.x, py = pointer.y;
    const pl = 0.5 + 0.5 * Math.sin(S.time * 3.2);
    const R = 9 + pl * 1.2;
    sc.save();
    sc.globalCompositeOperation = 'lighter';
    tintGlow(px, py, 16, IO_COL, 0.16 + pl * 0.06); // мягкий ореол — виден всегда
    sc.globalCompositeOperation = 'source-over';
    // тёмная подложка: поверх светлых сияний белое кольцо иначе тонет
    sc.strokeStyle = 'rgba(5,6,10,.55)'; sc.lineWidth = 3.4;
    sc.beginPath(); sc.arc(px, py, R, 0, TAU); sc.stroke();
    sc.strokeStyle = css3(IO_COL, 0.85); sc.lineWidth = 1.4;
    sc.beginPath(); sc.arc(px, py, R, 0, TAU); sc.stroke();
    for (let i = 0; i < 4; i++) { // засечки по сторонам света
      const a = i * Math.PI / 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      sc.strokeStyle = 'rgba(5,6,10,.5)'; sc.lineWidth = 3.2;
      sc.beginPath();
      sc.moveTo(px + ca * (R + 3), py + sa * (R + 3));
      sc.lineTo(px + ca * (R + 7), py + sa * (R + 7));
      sc.stroke();
      sc.strokeStyle = css3(IO_COL, 0.7); sc.lineWidth = 1.3;
      sc.beginPath();
      sc.moveTo(px + ca * (R + 3), py + sa * (R + 3));
      sc.lineTo(px + ca * (R + 7), py + sa * (R + 7));
      sc.stroke();
    }
    sc.fillStyle = 'rgba(246,244,240,.95)';
    sc.beginPath(); sc.arc(px, py, 1.9, 0, TAU); sc.fill();
    sc.restore();
  }
  // курсор-спутник на касании: живёт подле Ио с той стороны, куда правим
  if (S.mode === 'play' && touchSteer) {
    let nx = 0, ny = 0;
    if (joy.on && joy.mag > 0.15) { nx = joy.nx; ny = joy.ny; }
    else { const l = hyp(io.vx, io.vy); if (l > 30) { nx = io.vx / l; ny = io.vy / l; } }
    if (nx || ny) {
      const P0 = proj(io.x, io.y);
      const cx2 = P0.x + nx * 46, cy2 = P0.y + ny * 46 * view.tilt;
      const a = Math.atan2(ny * view.tilt, nx);
      sc.save(); sc.translate(cx2, cy2); sc.rotate(a);
      sc.strokeStyle = 'rgba(235,232,225,.5)';
      sc.lineWidth = 1.6; sc.lineCap = 'round';
      sc.beginPath(); sc.moveTo(-4, -4.5); sc.lineTo(3.5, 0); sc.lineTo(-4, 4.5); sc.stroke();
      sc.restore();
    }
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
  const R = 5 * P.k * pulse;
  sc.globalCompositeOperation = 'lighter';
  tintGlow(P.x, P.y, R * 3, [1, 0.95, 0.8], 0.5 * fade);
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
  // Мысль обязана отличаться от пыли и светлячков с одного взгляда: у неё
  // одной есть тёмная обводка-ободок, крупное белое ядро и медленное биение —
  // фон мерцает быстро и мелко, еда бьётся редко и крупно.
  const pulse = 0.75 + 0.35 * Math.sin(tm * 1.6 + m.seed);
  const fade = Math.min(1, m.born * 2, (m.life - m.born));
  const fa = Math.max(0, fade);
  sc.globalAlpha = fa;
  // тёмный ободок под свечением отсекает мысль от любого светлого фона
  sc.fillStyle = 'rgba(5,6,10,.55)';
  sc.beginPath(); sc.arc(P.x, P.y, (m.r * 0.8 + 2) * P.k, 0, TAU); sc.fill();
  sc.globalCompositeOperation = 'lighter';
  tintGlow(P.x, P.y, m.r * 3.2 * pulse * P.k, pal.mote, 0.55 * fa);
  sc.fillStyle = css3([1, 1, 1], 0.97 * fa);
  sc.beginPath(); sc.arc(P.x, P.y, (m.r * 0.45 * pulse + 1.1) * P.k, 0, TAU); sc.fill();
  // блик-крестик — короткий, лишь намёк на грань
  const gl2 = m.r * 1.9 * pulse * P.k;
  sc.strokeStyle = css3([1, 1, 1], 0.5 * fa * pulse);
  sc.lineWidth = 0.9;
  sc.beginPath();
  sc.moveTo(P.x - gl2, P.y); sc.lineTo(P.x + gl2, P.y);
  sc.moveTo(P.x, P.y - gl2); sc.lineTo(P.x, P.y + gl2);
  sc.stroke();
  sc.globalCompositeOperation = 'source-over';
  sc.globalAlpha = 1;
}

function drawShip(sh, P, pal, tm) {
  const s = sh.scl * P.k, d = sh.dir;
  if (sh.bh !== undefined) {
    const br = (10 - sh.bh) * 15 * s;
    sc.beginPath(); sc.arc(P.x - d * 160 * s, P.y, br, 0, TAU);
    sc.fillStyle = 'black'; sc.fill();
    sc.lineWidth = 3; sc.strokeStyle = css3([0.6, 0.2, 0.8], 0.6 + 0.4 * Math.sin(tm * 8)); sc.stroke();
  }
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

function drawWhaleBoss(b, P, pal, tm) {
  const s = BOSS_S * P.k, d = b.dir;
  const deep = b.st === 'deep' || b.st === 'aim';
  // метка прыжка: сжимающийся штриховой круг — единственное честное предупреждение
  if (b.st === 'aim') {
    const wp = proj(b.tx, b.ty);
    const k = Math.max(0, b.stT / 1.25);
    sc.globalCompositeOperation = 'lighter';
    sc.strokeStyle = css3([1, 0.5, 0.45], 0.5 * (1 - k * 0.4));
    sc.lineWidth = 1.6;
    sc.setLineDash([4, 10]);
    sc.beginPath();
    sc.ellipse(wp.x, wp.y, (60 + 240 * k) * wp.k, (60 + 240 * k) * wp.k * view.tilt, 0, 0, TAU);
    sc.stroke();
    sc.setLineDash([]);
    sc.globalCompositeOperation = 'source-over';
  }
  sc.save();
  sc.translate(P.x, P.y);
  sc.globalAlpha = deep ? 0.3 : 1;
  sc.globalCompositeOperation = 'lighter';
  sc.scale(d * s, s);
  sc.rotate(Math.sin(b.bob * 0.4) * 0.03);
  // остов — то же созвездие, что у доброго кита, да выпитое до угольев
  sc.strokeStyle = css3([0.75, 0.35, 0.9], deep ? 0.5 : 0.4);
  sc.lineWidth = 1.1;
  for (const e of WHALE_EDGES) {
    sc.beginPath();
    sc.moveTo(WHALE_PTS[e[0]][0], WHALE_PTS[e[0]][1]);
    sc.lineTo(WHALE_PTS[e[1]][0], WHALE_PTS[e[1]][1]);
    sc.stroke();
  }
  sc.fillStyle = b.flashT > 0 ? 'rgba(255,255,255,.95)' : 'rgba(255,150,140,.9)';
  for (let i = 0; i < WHALE_PTS.length; i++) {
    const tw = 0.6 + 0.4 * Math.sin(tm * 2 + i * 1.9 + b.seed);
    sc.beginPath();
    sc.arc(WHALE_PTS[i][0], WHALE_PTS[i][1], 1.3 + tw, 0, TAU);
    sc.fill();
  }
  // глаз: закрыт — тлеет, открыт — глядит и уязвим
  const ember = [1, 0.55, 0.5];
  if (b.open > 0.05) {
    tintGlow(-52, -12, (10 + b.open * 16), [1, 0.9, 0.7], 0.3 + b.open * 0.5);
    sc.fillStyle = 'rgba(255,244,220,.95)';
    sc.beginPath(); sc.arc(-52, -12, 1.6 + b.open * 1.6, 0, TAU); sc.fill();
  } else tintGlow(-52, -12, 8, ember, 0.25);
  tintGlow(0, 0, 70, ember, deep ? 0.06 : 0.12);
  sc.globalCompositeOperation = 'source-over';
  sc.globalAlpha = 1;
  sc.restore();
}

function drawBoss(b, P, pal, tm) {
  if (b.kind === 'whale') { drawWhaleBoss(b, P, pal, tm); return; }
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
  let ax = sh.x - sh.dir * 60 * sh.scl;
  let ay = sh.y - 30 * sh.scl;
  if (sh.bh !== undefined) {
    const r = Math.random() * 8;
    ax += r; ay -= r;
  }
  const B = proj(ax, ay);
  // круг воли: докуда пускает поводок — чтобы правило читалось глазами;
  // натянешь нить — круг и сама нить наливаются жаром
  const strain = S.strain || 0;
  const isBh = sh.bh !== undefined;
  const tcol = isBh ? [1, 0.2, 0.1] : (strain > 0 ? mix3(IO_COL, [1, 0.5, 0.3], strain) : IO_COL);
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
  const col = ioCol(), fiery = SET.visuals.trail === 'tether_trail';
  const auroraTr = SET.visuals.trail === 'aurora_trail';
  if (io.trail.length > 3) {
    sc.globalCompositeOperation = 'lighter';
    let prev = proj(io.trail[0].x, io.trail[0].y);
    for (let i = 1; i < io.trail.length; i++) {
      const cur = proj(io.trail[i].x, io.trail[i].y);
      const a = 1 - i / io.trail.length;
      // огненный след: у самой искры бел, к хвосту сходит в уголь;
      // полярный — кольцо готовых цветов севера медленно плывёт вдоль хвоста
      sc.strokeStyle = fiery ? css3(FIRE_RAMP[((1 - a) * 7) | 0], a * 0.42)
        : auroraTr ? css3(AUR_RAMP[(i + (tm * 6 | 0)) % 12], a * 0.4)
        : css3(col, a * 0.3);
      sc.lineWidth = a * (fiery ? 9 : auroraTr ? 8 : 7) + 1;
      sc.lineCap = 'round';
      sc.beginPath(); sc.moveTo(prev.x, prev.y); sc.lineTo(cur.x, cur.y); sc.stroke();
      prev = cur;
    }
    sc.globalCompositeOperation = 'source-over';
  }
  if (blink) return;
  const k = P.k;
  // заряд более не раздувает свет — он его разжигает: тёплое сияние поверх
  const ocMul = k;
  if (io.oc) {
    const br = 0.6 + 0.2 * Math.sin(tm * 9);
    tintGlow(P.x, P.y, 56 * k, [1, 0.62, 0.3], br);
  }
  sc.globalCompositeOperation = 'lighter';
  if (io.heat > 0.4) { // раскалился от скорости
    tintGlow(P.x, P.y, 46 * ocMul, [1, 0.24, 0.18], (io.heat - 0.4) * 0.9); // перегрев ал
  }
  tintGlow(P.x, P.y, 36 * ocMul, col, 0.5);
  sc.fillStyle = 'rgba(255,255,255,.97)';
  sc.beginPath(); sc.arc(P.x, P.y, 6 * ocMul, 0, TAU); sc.fill();
  sc.strokeStyle = css3(col, 0.85);
  sc.lineWidth = 1.6;
  sc.beginPath(); sc.arc(P.x, P.y, 11.5 * ocMul + Math.sin(tm * 5) * 1.2, 0, TAU); sc.stroke();
  // медленное внешнее кольцо из трёх дуг
  sc.strokeStyle = css3(col, 0.35);
  sc.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const a0 = -tm * 0.6 + i * TAU / 3;
    sc.beginPath(); sc.arc(P.x, P.y, 22 * ocMul, a0, a0 + 1.4); sc.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const a = tm * 1.1 + i * TAU / 5;
    const rr = (16 + Math.sin(tm * 3.3 + i * 1.7) * 4) * k;
    sc.fillStyle = css3(col, 0.5);
    sc.beginPath();
    sc.arc(P.x + Math.cos(a) * rr, P.y + Math.sin(a) * rr * 0.9, 1.3, 0, TAU);
    sc.fill();
  }
  // ореол светлячков — дар созвездия Жителей: тёплые огоньки блуждают поодаль
  if (SET.visuals.halo === 'folk_halo') {
    for (let i = 0; i < 6; i++) {
      const a = tm * 0.45 * (i % 2 ? 1 : -1) + i * TAU / 6;
      const rr = (30 + Math.sin(tm * 0.9 + i * 2.3) * 8) * k;
      const bl = 0.35 + 0.65 * Math.max(0, Math.sin(tm * 1.4 + i * 2.9));
      const fx = P.x + Math.cos(a) * rr, fy = P.y + Math.sin(a) * rr * 0.85;
      tintGlow(fx, fy, 7, FIREFLY_COL, 0.4 * bl);
      sc.fillStyle = css3(FIREFLY_COL, 0.85 * bl);
      sc.beginPath(); sc.arc(fx, fy, 1.4 + bl, 0, TAU); sc.fill();
    }
  }
  // кольцо орбиты — тонкий обруч с бегущей искрой, поверх прочих ореолов
  if (SET.visuals.ring) {
    const rr2 = 40 * k;
    sc.strokeStyle = css3(col, 0.28);
    sc.lineWidth = 1;
    sc.beginPath(); sc.ellipse(P.x, P.y, rr2, rr2 * 0.82, 0, 0, TAU); sc.stroke();
    const ra = tm * 1.3;
    const rx = P.x + Math.cos(ra) * rr2, ry = P.y + Math.sin(ra) * rr2 * 0.82;
    tintGlow(rx, ry, 6, col, 0.5);
    sc.fillStyle = 'rgba(255,255,255,.9)';
    sc.beginPath(); sc.arc(rx, ry, 1.5, 0, TAU); sc.fill();
  }
  // спириты — позиции в мире, проекция сама их кладёт в наклон плоскости
  const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
  const comets = SET.visuals.spirits === 'ship_spirits';
  const starSp = SET.visuals.spirits === 'star_spirits';
  const spCol = SET.visuals.emberSp ? EMBER_SP : col; // жар хоровода красит искры
  for (const sp of io.spirits) {
    const SP = proj(io.x + Math.cos(sp.ang) * orbR, io.y + Math.sin(sp.ang) * orbR * 0.82);
    if (sp.cd > 0) {
      sc.fillStyle = css3(spCol, 0.18);
      sc.beginPath(); sc.arc(SP.x, SP.y, 1.6, 0, TAU); sc.fill();
    } else {
      // кометы: за всякой искрою тянется короткий хвост по ходу хоровода
      if (comets) {
        const back = sp.ang - 0.42;
        const T = proj(io.x + Math.cos(back) * orbR, io.y + Math.sin(back) * orbR * 0.82);
        sc.strokeStyle = css3(spCol, 0.4);
        sc.lineWidth = 2.2 * SP.k; sc.lineCap = 'round';
        sc.beginPath(); sc.moveTo(T.x, T.y); sc.lineTo(SP.x, SP.y); sc.stroke();
      }
      tintGlow(SP.x, SP.y, 10 * SP.k, spCol, 0.55);
      sc.fillStyle = 'rgba(255,255,255,.95)';
      if (starSp) { // огранка павшей звезды: ромб, вращающийся с хороводом
        const R3 = 3.4 * SP.k;
        sc.save();
        sc.translate(SP.x, SP.y);
        sc.rotate(sp.ang * 2);
        sc.beginPath();
        sc.moveTo(0, -R3); sc.lineTo(R3 * 0.62, 0); sc.lineTo(0, R3); sc.lineTo(-R3 * 0.62, 0);
        sc.closePath(); sc.fill();
        sc.restore();
      } else {
        sc.beginPath(); sc.arc(SP.x, SP.y, 2.4 * SP.k, 0, TAU); sc.fill();
      }
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
  if (io.reloc.phase === 'echo') {
    // Отголосок двулик: покуда тлеет — приманка, манящая кошмаров; после —
    // остывший след, что виден одному хозяину и зовёт назад целую минуту.
    const R2 = proj(io.reloc.rx, io.reloc.ry);
    const lure = io.reloc.timer > 0;
    const fade = Math.max(0.55 * Math.min(1, io.reloc.hold / 3), Math.min(1, io.reloc.timer / 0.6));
    const pl = 0.5 + 0.5 * Math.sin(tm * (lure ? 6 : 2)); // остывший дышит ровнее
    sc.globalCompositeOperation = 'lighter';
    tintGlow(R2.x, R2.y, 24 * R2.k, lure && RUN.echoBurn ? [1, 0.6, 0.4] : IO_COL, (0.3 + pl * 0.25) * fade);
    sc.strokeStyle = css3(IO_COL, (0.45 + 0.2 * pl) * fade);
    sc.lineWidth = 1.2;
    sc.setLineDash([4, 6]);
    sc.beginPath(); sc.arc(R2.x, R2.y, (12 + pl * 3) * R2.k, 0, TAU); sc.stroke();
    sc.setLineDash([]);
    sc.fillStyle = css3([1, 1, 1], 0.6 * fade);
    sc.beginPath(); sc.arc(R2.x, R2.y, 2.5 * R2.k, 0, TAU); sc.fill();
    // Улетев за край, хозяин всё же видит дорогу назад: у самой кромки тлеет
    // стрелка в сторону следа — иначе минуту возврата искать пришлось бы наощупь
    const mg = 26;
    if (R2.x < mg || R2.x > W - mg || R2.y < mg || R2.y > H - mg) {
      const ex = Math.min(W - mg, Math.max(mg, R2.x));
      const ey = Math.min(H - mg, Math.max(mg, R2.y));
      sc.save();
      sc.translate(ex, ey);
      sc.rotate(Math.atan2(R2.y - ey, R2.x - ex));
      sc.fillStyle = css3(IO_COL, (0.35 + pl * 0.25) * fade);
      sc.beginPath();
      sc.moveTo(10, 0); sc.lineTo(-5, 5.5); sc.lineTo(-5, -5.5);
      sc.closePath(); sc.fill();
      sc.restore();
    }
    sc.globalCompositeOperation = 'source-over';
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
  // Расщепление цвета — та самая краса, что съедала читаемость: на пике ночи
  // оно расходилось едва не на дюжину точек, и всякая строка двоилась в глазах.
  // Ныне вполовину скромнее, а в саду обучения и того тише: там надобно читать.
  const abK = TUTOR.on ? 0.5 : 1;
  gl.uniform1f(U.uAberr, (0.0011 + S.energy * S.energy * 0.0042 + S.glitch * 0.007) * fxK * abK);
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
const skTetherKey = document.getElementById('skTetherKey');
const skCharge = document.getElementById('skCharge');
const skChargeKey = document.getElementById('skChargeKey');
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
  // покуда бодрости вдоволь, полоса тиха и не тянет глаз; голос она подаёт,
  // лишь когда впрямь есть о чём — на четверти и ниже
  const col = frac > 0.5 ? 'rgba(143,208,255,.55)' : frac > 0.25 ? '#e8a54a' : '#d8695a';
  elMeter.style.background = col;
  elMeter.style.boxShadow = frac > 0.5 ? 'none' : '0 0 12px ' + col;
  elXp.style.width = (clamp(RUN.xp / RUN.xpNext, 0, 1) * 100).toFixed(1) + '%';
  if (boss) elBossFill.style.width = (clamp(boss.hp / boss.hpMax, 0, 1) * 100).toFixed(1) + '%';
  // полоса способностей: видно, что чем нажать и что уже готово;
  // неизученное не кажет себя вовсе — способности надобно изучить в шкатулке
  const abT = abLvl('tether') > 0, abB = abLvl('blink') > 0, abC = abLvl('charge') > 0;
  skTether.classList.toggle('locked', !abT);
  skBlink.classList.toggle('locked', !abB);
  skCharge.classList.toggle('locked', !abC);
  const blinkOk = io.reloc.phase === 'echo' || (io.reloc.cd <= 0 && io.reloc.phase === 'idle');
  const chargeOk = !io.oc && io.ocCd <= 0;
  const reach = !!S.reachShip;
  skTether.classList.toggle('on', !!io.tether);
  skTether.classList.toggle('ready', !io.tether && reach);
  skBlink.classList.toggle('ready', blinkOk);
  skBlink.classList.toggle('cool', !blinkOk);
  skTetherKey.textContent = keyName(SET.keys.tether);
  skBlinkKey.textContent = (io.reloc.cd > 0 && io.reloc.phase !== 'echo')
    ? io.reloc.cd.toFixed(1) + tr('secShort') : keyName(SET.keys.blink);
  skCharge.classList.toggle('on', io.oc);
  skCharge.classList.toggle('ready', chargeOk);
  skCharge.classList.toggle('cool', !io.oc && !chargeOk);
  skChargeKey.textContent = io.ocCd > 0
    ? io.ocCd.toFixed(1) + tr('secShort') : keyName(SET.keys.charge);
  if (TOUCH) { // кнопки под пальцем показывают, что готово, а что ещё стынет
    btnBlink.classList.toggle('locked', !abB);
    btnTether.classList.toggle('locked', !abT);
    ocBtn.classList.toggle('locked', !abC);
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
      localStorage.setItem('io-noch-best', JSON.stringify(
        Object.assign({}, b, { nights, thoughts })));
  } catch (_) {}
}
// пределы всех прошлых бессонниц: и полосу мерить есть чем, и рекорд видно
function recordRun(stats) {
  const fresh = new Set();
  let b, max;
  try { b = loadBest() || {}; } catch (_) { b = {}; }
  max = b.max || {};
  const prev = Object.assign({}, max);
  for (const k in stats) {
    if (k in max) { if (stats[k] > max[k]) { fresh.add(k); max[k] = stats[k]; } }
    else max[k] = stats[k]; // первая ночь рекордом не считается — не с чем равнять
  }
  b.max = max;
  try { localStorage.setItem('io-noch-best', JSON.stringify(b)); } catch (_) {}
  return { fresh, prev };
}
function showBestLine() {
  const c = skyCaught();
  document.getElementById('skyBtnTxt').textContent = c ? tr('mSkyN', c, skyTotal()) : tr('mSky');
  const b = loadBest();
  // Титул ничего не объясняет — объясняет сад. Оттого тому, кто ещё ни разу
  // не играл, «обучение» в меню светится углями: с него и начинать.
  const tb = document.getElementById('tutorBtn');
  if (tb) tb.classList.toggle('first', !b);
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
  // вместо прежних искр — четыре созвездия испытаний и облик, что они дарят
  const box = document.getElementById('skySparks');
  box.innerHTML = '';
  for (const id in C_THEMES) {
    const th = C_THEMES[id];
    const req = CHALLENGES.filter(ch => ch.theme === id);
    const have = req.filter(ch => STARS_DATA.completed.includes(ch.id)).length;
    const done = have >= req.length;
    const worn = SET.visuals[th.rewardType] === th.rewardId;
    const el = document.createElement('div');
    el.className = 'spark' + (done ? ' lit' : '') + (worn ? ' worn' : '');
    el.innerHTML = '<b>' + nm(th.name) + ' · ' + have + '/' + req.length + '</b><span>' +
      (done ? nm(th.rewardName) + ' — ' + tr(worn ? 'skyWorn' : 'skyEquip') : nm(req[have].desc)) + '</span>';
    if (done) el.addEventListener('click', () => { equipVisual(th); sfxChoice(); openSky(); });
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

// ---------- гардероб обликов ----------
// Всякий облик — чистая краса, силы не даёт вовсе. Гнёзда-выборы (оболочка,
// след, спириты, ореол) и слои-переключатели (пыль, жар, кольцо) складываются
// друг с другом: надеть можно всё разом, и каждый слой рисует своё.
const WARDROBE = [
  { grp: 'shell', slot: 'shell', id: 'storm_shell', theme: 'storm', dot: '#ffb85c',
    name: { ru: 'штормовая оболочка', en: 'storm shell', de: 'sturmhülle' },
    desc: { ru: 'свет Ио отливает янтарём бури', en: 'Io’s light turns storm-amber', de: 'ios licht schimmert im bernstein des sturms' } },
  { grp: 'shell', slot: 'shell', id: 'night_shell', theme: 'night', dot: '#a88aff',
    name: { ru: 'полуночная оболочка', en: 'midnight shell', de: 'nachthülle' },
    desc: { ru: 'сирень и тишь самой глубокой ночи', en: 'lilac and hush of the deepest night', de: 'flieder und schweigen der tiefsten nacht' } },
  { grp: 'shell', slot: 'shell', id: 'dawn_shell', themes: 2, dot: '#ff9eb8',
    name: { ru: 'оболочка зари', en: 'dawn shell', de: 'hülle der morgenröte' },
    desc: { ru: 'розовый свет утра, что так и не пришло', en: 'rose light of a morning that never came', de: 'rosiges licht eines morgens, der niemals kam' } },
  { grp: 'shell', slot: 'shell', id: 'aurora_shell', themes: 5, dot: '#8cffbf',
    name: { ru: 'оболочка сияния', en: 'aurora shell', de: 'nordlichthülle' },
    desc: { ru: 'зелёный огонь северного неба', en: 'green fire of the northern sky', de: 'grünes feuer des nordhimmels' } },
  { grp: 'trail', slot: 'trail', id: 'tether_trail', theme: 'tether', dot: '#ff8a5c',
    name: { ru: 'огненный след', en: 'fiery trail', de: 'feuerspur' },
    desc: { ru: 'за Ио тянется пламя, белое у сердца', en: 'a flame trails behind, white at the heart', de: 'eine flamme folgt io, weiß an ihrem herzen' } },
  { grp: 'trail', slot: 'trail', id: 'aurora_trail', themes: 4, dot: '#7de8ff',
    name: { ru: 'полярный след', en: 'polar trail', de: 'nordlichtspur' },
    desc: { ru: 'след переливается всеми огнями севера', en: 'the trail shimmers with every northern light', de: 'die spur schillert in allen lichtern des nordens' } },
  { grp: 'trail', key: 'dust', id: 'star_dust', phr: 0.25, dot: '#ffe6a0',
    name: { ru: 'звёздная пыль', en: 'star dust', de: 'sternenstaub' },
    desc: { ru: 'в полёте с Ио осыпаются золотые искорки', en: 'golden sparks shake loose as Io flies', de: 'im fluge rieseln goldene funken von io' } },
  { grp: 'spirits', slot: 'spirits', id: 'ship_spirits', theme: 'ships', dot: '#8fd0ff',
    name: { ru: 'спириты-кометы', en: 'comet spirits', de: 'kometengeister' },
    desc: { ru: 'за всякой искрой хоровода — хвост', en: 'every spark of the round drags a tail', de: 'jeder funke im reigen zieht einen schweif' } },
  { grp: 'spirits', slot: 'spirits', id: 'star_spirits', phr: 0.55, dot: '#fff3c8',
    name: { ru: 'спириты-звёзды', en: 'star spirits', de: 'sterngeister' },
    desc: { ru: 'искры огранены, как павшие звёзды', en: 'sparks cut like fallen stars', de: 'funken, geschliffen wie gefallene sterne' } },
  { grp: 'spirits', key: 'emberSp', id: 'ember_spirits', phr: 0.75, dot: '#ffb866',
    name: { ru: 'жар хоровода', en: 'ember round', de: 'glutreigen' },
    desc: { ru: 'спириты горят тёплым углём', en: 'the spirits burn warm as embers', de: 'die geister glühen warm wie kohlen' } },
  { grp: 'halo', slot: 'halo', id: 'folk_halo', theme: 'folk', dot: '#ffd98a',
    name: { ru: 'ореол светлячков', en: 'firefly halo', de: 'glühwurmkranz' },
    desc: { ru: 'тёплые огоньки Жителей блуждают подле', en: 'warm lights of the Folk wander close', de: 'die warmen lichter der bewohner wandeln nahebei' } },
  { grp: 'halo', key: 'ring', id: 'ring_halo', phr: 0.4, dot: '#bfe4ff',
    name: { ru: 'кольцо орбиты', en: 'orbit ring', de: 'bahnenring' },
    desc: { ru: 'тонкое кольцо с бегущей искрой', en: 'a thin ring with a running spark', de: 'ein feiner ring mit eilendem funken' } },
];
const WD_GROUPS = ['shell', 'trail', 'spirits', 'halo'];

function themesDone() {
  let n = 0;
  for (const k in C_THEMES) if (checkThemeCompleted(k)) n++;
  return n;
}
function skinUnlocked(s) {
  if (s.theme) return checkThemeCompleted(s.theme);
  if (s.themes) return themesDone() >= s.themes;
  if (s.phr) return skyCaught() >= Math.ceil(skyTotal() * s.phr);
  return true;
}
function skinLockText(s) {
  if (s.theme) return tr('wd_lock_theme', nm(C_THEMES[s.theme].name));
  if (s.themes) return tr('wd_lock_themes', s.themes);
  return tr('wd_lock_phr', Math.ceil(skyTotal() * s.phr));
}
// Обновки гардероба сказываются вслух единожды: список виденного живёт в
// шкатулке. Награды созвездий объявляет само созвездие («созвездие полно…»),
// оттого вслух идут лишь облики, отпёртые порогами фраз и счётом созвездий.
function checkWardrobeNews() {
  if (!META.wdSeen) META.wdSeen = [];
  let changed = false, ann = 0;
  for (const s of WARDROBE) {
    if (META.wdSeen.includes(s.id) || !skinUnlocked(s)) continue;
    META.wdSeen.push(s.id);
    changed = true;
    if (!s.theme && S.mode === 'play') // редкая пара обновок разом — строки лесенкой
      spawnText(io.x, io.y - 210 - 36 * ann++, tr('wd_new', nm(s.name)), true);
  }
  if (changed) saveMeta();
}

function skinWorn(s) { return s.slot ? SET.visuals[s.slot] === s.id : !!SET.visuals[s.key]; }
function toggleSkin(s) {
  if (s.slot) SET.visuals[s.slot] = skinWorn(s) ? 'default' : s.id;
  else SET.visuals[s.key] = !SET.visuals[s.key];
  saveSettings();
}

const skinScreen = document.getElementById('skinScreen');
const wdList = document.getElementById('wdList');
function renderWardrobe() {
  const have = WARDROBE.filter(skinUnlocked).length;
  document.getElementById('wdCount').textContent = tr('wd_count', have, WARDROBE.length);
  wdList.innerHTML = '';
  for (const grp of WD_GROUPS) {
    const head = document.createElement('div');
    head.className = 'wd-grp';
    head.textContent = tr('wd_grp_' + grp);
    wdList.appendChild(head);
    const row = document.createElement('div');
    row.className = 'wd-row';
    for (const s of WARDROBE) {
      if (s.grp !== grp) continue;
      const open = skinUnlocked(s), worn = open && skinWorn(s);
      const card = document.createElement('div');
      card.className = 'wd-card' + (open ? ' have' : '') + (worn ? ' worn' : '');
      card.innerHTML = '<b><span class="wd-dot" style="background:' + s.dot + '"></span>' + nm(s.name) + '</b>' +
        '<span>' + nm(s.desc) + '</span>' +
        '<i>' + (open ? tr(worn ? 'wd_worn' : 'wd_have') : skinLockText(s)) + '</i>';
      if (open) card.addEventListener('pointerdown', e => {
        e.stopPropagation();
        toggleSkin(s); sfxChoice(); renderWardrobe();
      });
      row.appendChild(card);
    }
    wdList.appendChild(row);
  }
}
document.getElementById('skinBtn').addEventListener('pointerdown', e => {
  e.stopPropagation();
  renderWardrobe();
  skinScreen.classList.remove('hidden');
});
document.getElementById('wdBack').addEventListener('pointerdown', e => {
  e.stopPropagation();
  skinScreen.classList.add('hidden');
});
checkWardrobeNews(); // добытое до этой версии помечается виденным молча: на титуле объявлять некому

// ---------- состояния ----------
const titleScreen = document.getElementById('titleScreen');
const restScreen = document.getElementById('restScreen');
const deathScreen = document.getElementById('deathScreen');
const hud = document.getElementById('hud');

function startRun() {
  TUTOR.on = false; TUTOR.stops = []; zoneForce.clear(); // сад за собою не тянем
  try {
    audioInit();
    if (A.ctx.state === 'suspended') A.ctx.resume();
  } catch (err) { console.warn('audio unavailable', err); }
  RUN = newRun();
  io.spirits = [];
  endLive = null;
  resetWorld(false);
  S.mode = 'play';
  titleScreen.classList.add('hidden');
  titleScreen.classList.remove('open'); // вернувшись, застанем меню сложенным
  deathScreen.classList.add('hidden');
  restScreen.classList.add('hidden');
  skyScreen.classList.add('hidden');
  skinScreen.classList.add('hidden');
  hud.classList.add('on');
  document.body.classList.add('playing');
  updateHud(); updateClock();
}

// ============================================================
// ОБУЧЕНИЕ: сад, где всякая вещь ночи ждёт своей очереди
// ============================================================
// Мир здесь тот же самый, да разложен по порядку: станы стоят чередою вдоль
// пути, и у каждого свой круг — такой же, каким корабль подпускает к себе нить.
// Войдёшь в круг — вещь оживает и показывает себя в деле; выйдешь — замирает и
// убирает за собою, чтобы сад не зарастал. Ночь тут не наступает, бодрость не
// тает и смерти нет: учиться надлежит без страха. Речь пояснений — простая,
// без книжного слога: объяснять надобно понятно, а красоваться после будем.
const TUTOR_R = 300;    // круг, в котором вещь оживает
const TUTOR_GAP = 1500; // шаг между станами; шире клетки, чтобы зоны не спорили
const TU_FOES = ['shade', 'nm', 'dasher', 'eye', 'siren', 'eater', 'moth', 'weaver'];

const TUTOR_STOPS = [
  // Первый стан стоит там же, где рождается свет: управление надобно знать
  // прежде, чем куда-то лететь. Оттого и раскладка в тексте — нынешняя,
  // метки {up} и прочие подменяются живыми клавишами.
  { id: 'move', kind: 'hint',
    t: { ru: 'как лететь', en: 'how to fly', de: 'wie man fliegt' },
    d: { ru: 'Свет летит, пока держишь клавишу: {up} {left} {down} {right} (стрелки тоже годятся). {halt} — замереть на месте. Прицел ходит за мышью: рывок переносит ровно туда, куда он смотрит. Всякую клавишу можно поменять в настройках.',
         en: 'The light flies while you hold a key: {up} {left} {down} {right} (arrows work too). {halt} — hold still. The aim follows your mouse: a blink takes you exactly where it points. Every key can be changed in the settings.',
         de: 'Das licht fliegt, solange du eine taste hältst: {up} {left} {down} {right} (pfeile gehen auch). {halt} — stillstehen. Das ziel folgt der maus: ein flackern bringt dich genau dorthin. Jede taste lässt sich in den einstellungen ändern.' },
    dTouch: { ru: 'Коснись экрана — под пальцем родится джойстик: наклоняй его в ту сторону, куда хочешь лететь, а сила наклона — это скорость. Тянуть палец через весь экран не нужно. Способности живут кнопками под большим пальцем.',
              en: 'Touch the screen — a joystick is born under your finger: tilt it where you want to fly, and how far you tilt is your speed. No need to drag across the screen. The abilities live as buttons under your thumb.',
              de: 'Berühre den schirm — unter dem finger erwacht ein steuerkreis: neige ihn dorthin, wohin du fliegen willst, die neigung ist deine geschwindigkeit. Du musst den finger nicht über den schirm ziehen. Die fähigkeiten sitzen als tasten unter dem daumen.' } },
  { id: 'wake', kind: 'hint',
    t: { ru: 'силы', en: 'your strength', de: 'deine kraft' },
    d: { ru: 'Полоска внизу — твои силы. Они тают всё время и тем быстрее, чем дольше длится ночь. Мысли — единственное, что их возвращает. Опустела полоска — ты растворишься в ночи. В саду этого не случится: здесь силы стоят на месте.',
         en: 'The bar at the bottom is your strength. It drains all the time, and faster the longer the night lasts. Thoughts are the only thing that gives it back. Empty the bar and you dissolve into the night. Not here, though: in the garden it stands still.',
         de: 'Der balken unten ist deine kraft. Sie schwindet stets, und schneller, je länger die nacht währt. Gedanken sind das einzige, was sie zurückgibt. Ist der balken leer, löst du dich in der nacht auf. Nicht hier: im garten steht sie still.' } },
  { id: 'mote', kind: 'mote',
    t: { ru: 'мысль', en: 'a thought', de: 'ein gedanke' },
    d: { ru: 'Твоя еда. Каждая пойманная мысль возвращает немного бодрости и даёт опыт. Просто лети сквозь них — они притянутся сами.',
         en: 'Your food. Every thought you catch gives back a little wakefulness and some experience. Just fly through them — they pull in by themselves.',
         de: 'Deine nahrung. Jeder gefangene gedanke gibt etwas wachheit und erfahrung zurück. Flieg einfach hindurch — sie ziehen von selbst heran.' } },
  { id: 'star', kind: 'star',
    t: { ru: 'падучая звезда', en: 'a falling star', de: 'eine sternschnuppe' },
    d: { ru: 'Редкая находка: даёт сразу много бодрости и опыта. Увидел — не пролетай мимо.',
         en: 'A rare find: it gives a big helping of wakefulness and experience at once. If you see one, do not fly past.',
         de: 'Ein seltener fund: gibt auf einmal viel wachheit und erfahrung. Wenn du eine siehst, flieg nicht vorbei.' } },
  { id: 'blink', kind: 'hint',
    t: { ru: 'рывок — {blink}', en: 'blink — {blink}', de: 'flackern — {blink}' },
    d: { ru: 'Переносит тебя туда, куда указывает курсор. На старом месте остаётся след: нажми ещё раз — и вернёшься к нему с любого расстояния, пока не прошла минута. Лучшее спасение, когда зажали со всех сторон.',
         en: 'It moves you to where the cursor points. A trace stays where you were: press again and you return to it from any distance, as long as a minute has not passed. The best escape when you are boxed in.',
         de: 'Es versetzt dich dorthin, wohin der zeiger weist. Am alten platz bleibt eine spur: drück noch einmal, und du kehrst aus jeder ferne zurück, solange keine minute verging. Die beste rettung, wenn du eingekreist bist.' } },
  { id: 'charge', kind: 'hint',
    t: { ru: 'ускорение — {charge}', en: 'charge — {charge}', de: 'ladung — {charge}' },
    d: { ru: 'Ненадолго разгоняет твой свет: летишь быстрее, бьёшь больнее, а бодрость тает медленнее. Потом заряду нужно время, чтобы набраться снова.',
         en: 'It overcharges your light for a while: you fly faster, hit harder, and wakefulness drains slower. Afterwards it needs time to gather again.',
         de: 'Es lädt dein licht eine weile auf: du fliegst schneller, triffst härter, und die wachheit schwindet langsamer. Danach braucht es zeit, um sich zu sammeln.' } },
  { id: 'ship', kind: 'ship',
    t: { ru: 'корабль и нить', en: 'a ship and the thread', de: 'ein schiff und die spur' },
    d: { ru: 'Корабли идут по небу сами по себе. Подлети ближе и нажми {tether} — бросишь трос. Она тянет тебя следом, жжёт всё, что её пересекает, и с палубы сыплются мысли. Нажми ещё раз, чтобы отвязаться.',
         en: 'Ships sail the sky on their own. Fly close and press {tether} to cast the thread. It pulls you along, burns anything that crosses it, and thoughts spill from the deck. Press again to let go.',
         de: 'Schiffe segeln von selbst über den himmel. Flieg näher und drück {tether}, um die spur zu werfen. Sie zieht dich mit, versengt alles, was sie kreuzt, und vom deck rieseln gedanken. Noch ein druck, und du bist frei.' } },
  { id: 'night', kind: 'hint',
    t: { ru: 'ночь за ночью', en: 'night after night', de: 'nacht um nacht' },
    d: { ru: 'Ночи текут одна за другой, каждые полторы минуты, и с каждой ночь становится злее. Всякая третья — шторм, всякая пятая приводит корабль-кошмар: бить его можно только по фонарю и только пока фонарь открыт. И помни: долгий разгон перегревает свет.',
         en: 'Nights flow one into another every minute and a half, and each one turns meaner. Every third is a storm; every fifth brings the nightmare ship — it can only be struck by the lantern, and only while the lantern is open. And remember: a long dash overheats the light.',
         de: 'Nächte fließen alle anderthalb minuten ineinander, und jede wird böser. Jede dritte ist ein sturm, jede fünfte bringt das albtraumschiff — treffen kann man es nur an der laterne und nur, solange sie offen ist. Und denk daran: langer lauf überhitzt das licht.' } },
  { id: 'shade', kind: 'shade',
    t: { ru: 'тени', en: 'shades', de: 'schatten' },
    d: { ru: 'Летают стайкой и жмутся к свету. Поодиночке слабы, но толпой быстро объедают бодрость. Бей их спиритами — искрами, что кружат вокруг тебя.',
         en: 'They fly in a small flock and crowd towards the light. Weak alone, but a crowd eats your wakefulness fast. Kill them with the spirits — the sparks circling you.',
         de: 'Sie fliegen im schwarm und drängen zum licht. Einzeln schwach, doch im rudel fressen sie die wachheit schnell. Erschlag sie mit den spiriten — den funken, die dich umkreisen.' } },
  { id: 'nm', kind: 'nm',
    t: { ru: 'кошмар', en: 'a nightmare', de: 'ein albtraum' },
    d: { ru: 'Простой преследователь: медленно, но упрямо идёт за твоим светом. Сожги его нитью или дай спиритам сделать своё дело.',
         en: 'A plain chaser: slow but stubborn, it follows your light. Burn it with the thread, or let the spirits do their work.',
         de: 'Ein schlichter verfolger: langsam, aber hartnäckig folgt er deinem licht. Verbrenn ihn mit der spur oder lass die spiriten ihr werk tun.' } },
  { id: 'dasher', kind: 'dasher',
    t: { ru: 'скорохват', en: 'the dasher', de: 'der stürmer' },
    d: { ru: 'Замирает, целится — и бросается рывком по прямой. Как только увидел, что он застыл, уходи в сторону: рывок мимо, и он снова беззащитен.',
         en: 'It stops, takes aim, and lunges in a straight line. The moment you see it freeze, move sideways: the dash misses and it is helpless again.',
         de: 'Er hält an, zielt und stößt geradeaus vor. Sobald du siehst, dass er erstarrt, weich zur seite: der stoß geht ins leere und er ist wieder wehrlos.' } },
  { id: 'eye', kind: 'eye',
    t: { ru: 'око', en: 'the eye', de: 'das auge' },
    d: { ru: 'Медленно плывёт и стреляет в тебя издали. Не стой у него на линии — двигайся поперёк, и выстрелы уйдут в пустоту.',
         en: 'It drifts slowly and shoots at you from afar. Do not stand in its line — move across it, and the shots go into the void.',
         de: 'Es treibt langsam und schießt aus der ferne. Bleib nicht in seiner linie — beweg dich quer, und die schüsse gehen ins leere.' } },
  { id: 'siren', kind: 'siren',
    t: { ru: 'сирена', en: 'the siren', de: 'die sirene' },
    d: { ru: 'Сама почти не двигается, но вокруг неё кольцо, которое тянет к себе и ранит. Не задерживайся внутри кольца.',
         en: 'It barely moves, but a ring around it drags you in and hurts. Do not linger inside the ring.',
         de: 'Sie bewegt sich kaum, doch ein ring um sie zieht dich heran und verletzt. Verweile nicht in diesem ring.' } },
  { id: 'eater', kind: 'eater',
    t: { ru: 'пожиратель', en: 'the eater', de: 'der fresser' },
    d: { ru: 'Ест твои мысли раньше тебя и толстеет с каждой. Гони его первым: убитый, он возвращает всё съеденное.',
         en: 'It eats your thoughts before you do and swells with each one. Kill it first: when it dies, it gives everything back.',
         de: 'Er frisst deine gedanken vor dir und schwillt mit jedem an. Töte ihn zuerst: erschlagen gibt er alles zurück.' } },
  { id: 'moth', kind: 'moth',
    t: { ru: 'мотыльки', en: 'moths', de: 'motten' },
    d: { ru: 'Липнут к свету и виснут на нём, замедляя полёт. Урона не наносят, но с ними не убежишь. Стряхнуть их можно мерцанием.',
         en: 'They cling to the light and hang on it, slowing you down. They deal no damage, but you cannot run with them. A blink shakes them off.',
         de: 'Sie kleben am licht und hängen daran, was dich bremst. Sie verletzen nicht, doch fliehen kannst du so nicht. Ein flackern schüttelt sie ab.' } },
  { id: 'weaver', kind: 'weaver',
    t: { ru: 'ловец снов', en: 'the dreamcatcher', de: 'der traumfänger' },
    d: { ru: 'Плетёт паутину и ждёт. Попал в неё — увяз и стал лёгкой добычей для всех остальных. Рви паутину нитью или облетай стороной.',
         en: 'It weaves a web and waits. Caught in it, you are stuck and easy prey for everything else. Tear the web with the thread, or fly around it.',
         de: 'Er webt ein netz und wartet. Gerätst du hinein, steckst du fest und wirst leichte beute für alle anderen. Zerreiß das netz mit der spur oder flieg außen herum.' } },
  { id: 'bolt', kind: 'bolt',
    t: { ru: 'молния', en: 'lightning', de: 'der blitz' },
    d: { ru: 'Перед ударом небо чертит светлую полосу — это предупреждение, и длится оно долго. Просто уйди с полосы в сторону.',
         en: 'Before the strike the sky draws a bright column — that is the warning, and it lasts a good while. Simply step aside from it.',
         de: 'Vor dem schlag zeichnet der himmel eine helle säule — das ist die warnung, und sie währt lange. Geh einfach zur seite.' } },
  { id: 'meadow', kind: 'meadow',
    t: { ru: 'луг', en: 'a meadow', de: 'eine wiese' },
    d: { ru: 'Тихое место, где мыслей заметно гуще обычного. Здесь стоит задержаться и поесть впрок.',
         en: 'A quiet place where thoughts grow much thicker than usual. Worth lingering here to eat your fill.',
         de: 'Ein stiller ort, wo gedanken viel dichter wachsen als sonst. Hier lohnt es sich zu verweilen und sich satt zu essen.' } },
  { id: 'rift', kind: 'rift',
    t: { ru: 'разлом', en: 'a rift', de: 'ein riss' },
    d: { ru: 'Дурное место: кошмаров вдвое гуще, а мыслей почти нет. Пролетай насквозь и не задерживайся.',
         en: 'A bad place: twice as many nightmares and almost no thoughts. Fly straight through and do not linger.',
         de: 'Ein böser ort: doppelt so viele albträume und fast keine gedanken. Flieg hindurch und verweile nicht.' } },
  { id: 'current', kind: 'current',
    t: { ru: 'течение', en: 'a current', de: 'eine strömung' },
    d: { ru: 'Небесная река. По течению летишь заметно быстрее, против — еле ползёшь. Смотри на стрелки и ложись на них.',
         en: 'A river in the sky. With the current you fly much faster; against it you barely crawl. Watch the arrows and follow them.',
         de: 'Ein fluss am himmel. Mit der strömung fliegst du viel schneller, gegen sie kriechst du nur. Achte auf die pfeile und folge ihnen.' } },
  { id: 'lighthouse', kind: 'lighthouse',
    t: { ru: 'уснувший фонарь', en: 'the sleeping lantern', de: 'die schlafende laterne' },
    d: { ru: 'Потухшая башня. Подлети вплотную — и она загорится: пока горит, бодрость рядом с нею тает вдвое медленнее.',
         en: 'A tower gone dark. Fly right up to it and it kindles: while it burns, wakefulness fades half as fast nearby.',
         de: 'Ein erloschener turm. Flieg dicht heran, und er entzündet sich: solange er brennt, schwindet die wachheit in seiner nähe halb so schnell.' } },
  { id: 'graveyard', kind: 'graveyard',
    t: { ru: 'кладбище кораблей', en: 'the ship graveyard', de: 'der schiffsfriedhof' },
    d: { ru: 'Остовы старых кораблей. Мысли между рёбрами вдвое сытнее, но в них гнездятся ловцы снов — добыча тут с риском.',
         en: 'The ribs of old ships. Thoughts between them feed you twice as well, but dreamcatchers nest there — this harvest carries a risk.',
         de: 'Die rippen alter schiffe. Gedanken dazwischen nähren doppelt, doch traumfänger nisten dort — diese ernte hat ihren preis.' } },
  { id: 'whale', kind: 'whale',
    t: { ru: 'небесный кит', en: 'the sky whale', de: 'der himmelswal' },
    d: { ru: 'Огромный и мирный: тебя он не тронет. Из дыхала веером сыплются мысли — держись рядом и собирай. Столкнёшься — стряхнёт и разбудит округу.',
         en: 'Huge and peaceful: it will not touch you. Thoughts spray from its blowhole — stay close and gather. Bump into it and it shrugs you off and wakes the neighbourhood.',
         de: 'Riesig und friedlich: er tut dir nichts. Aus seinem blasloch sprüht ein fächer von gedanken — bleib nah und sammle. Stößt du an, schüttelt er dich ab und weckt die umgebung.' } },
  { id: 'lamplighter', kind: 'lamplighter',
    t: { ru: 'фонарщик', en: 'the lamplighter', de: 'der laternenanzünder' },
    d: { ru: 'Странник, что идёт своей дорогой и зажигает за собой цепочку мыслей. Лететь за ним и выгодно, и спокойно.',
         en: 'A wanderer who walks his own road and lights a chain of thoughts behind him. Following him is both profitable and calm.',
         de: 'Ein wanderer, der seinen weg geht und hinter sich eine kette von gedanken entzündet. Ihm zu folgen ist einträglich und ruhig.' } },
  { id: 'sleepstar', kind: 'sleepstar',
    t: { ru: 'уснувшая звезда', en: 'a sleeping star', de: 'ein schlafender stern' },
    d: { ru: 'Побудь рядом — и она проснётся, щедро одарив тебя. Но ночь тоже заметит, что ты её разбудил, и пришлёт гостей.',
         en: 'Linger beside her and she wakes, rewarding you richly. But the night notices that you woke her, and sends guests.',
         de: 'Bleib bei ihm, und er erwacht und beschenkt dich reich. Doch die nacht merkt, dass du ihn wecktest, und schickt gäste.' } },
  { id: 'pedlar', kind: 'pedlar',
    t: { ru: 'сонный меняла', en: 'the drowsy pedlar', de: 'der schläfrige händler' },
    d: { ru: 'Меняет мысли на бодрость и обратно. Подлети — и он предложит сделку; согласен, коли есть чем платить.',
         en: 'He trades thoughts for wakefulness and back again. Fly up and he offers a deal — if you have something to pay with.',
         de: 'Er tauscht gedanken gegen wachheit und zurück. Flieg heran, und er bietet einen handel — wenn du etwas zu zahlen hast.' } },
  { id: 'nest', kind: 'nest',
    t: { ru: 'гнездо кошмаров', en: 'a nightmare nest', de: 'ein albtraumnest' },
    d: { ru: 'Из него лезут кошмары, покуда оно живо. Задержись рядом подольше — и выжжешь его совсем.',
         en: 'Nightmares crawl out of it while it lives. Linger beside it long enough and you burn it out for good.',
         de: 'Aus ihm kriechen albträume, solange es lebt. Bleib lange genug daneben, und du brennst es ganz aus.' } },
  { id: 'starfall', kind: 'starfall',
    t: { ru: 'звездопад', en: 'a starfall', de: 'ein sternenfall' },
    d: { ru: 'Редкое событие: небо роняет звёзды целой пригоршней. Лови, пока они не погасли.',
         en: 'A rare event: the sky drops a whole handful of stars. Catch them before they go out.',
         de: 'Ein seltenes ereignis: der himmel lässt eine ganze handvoll sterne fallen. Fang sie, ehe sie erlöschen.' } },
];

function tutorForceZone(st) {
  const key = Math.floor(st.x / CELL) + ',' + Math.floor(st.y / CELL);
  const z = st.kind === 'current'
    ? { type: 'current', x: st.x, y: st.y, r: 380, dx: 1, dy: 0, seed: 11 }
    : { type: st.kind, x: st.x, y: st.y, r: 340, seed: 11 };
  zoneForce.set(key, z);
}

function startTutor() {
  startRun();            // мир заводится обычным чином, а после утихомиривается
  TUTOR.on = true;
  S.t = 0.3;             // ночь замирает в ясной своей поре: ни бури, ни рассвета
  RUN.thoughts = 120;    // менялу надобно чем-то испытать
  RUN.wake = RUN.wakeMax;
  zoneForce.clear();
  TUTOR.stops = TUTOR_STOPS.map((s, i) => ({
    def: s, id: s.id, kind: s.kind, on: false, t: 0, cd: 0,
    x: i * TUTOR_GAP, y: Math.sin(i * 0.85) * 210, // первый — под самым светом
    lines: null, lang: null, lw: 0, wrap: 0,
  }));
  for (const st of TUTOR.stops) if (st.kind === 'meadow' || st.kind === 'rift' || st.kind === 'current') tutorForceZone(st);
  updateHud();
}

function tutorSpawn(st, arr, fn) { // всё, что родилось у стана, метится его именем
  const n = arr.length;
  fn();
  for (let i = n; i < arr.length; i++) arr[i].tu = st.id;
}

function tutorWake(st) {
  st.on = true; st.t = 0; st.cd = 0;
  const x = st.x, y = st.y, k = st.kind;
  if (k === 'mote' || k === 'meadow')
    tutorSpawn(st, motes, () => { for (let i = 0; i < 12; i++) spawnMoteAt(x + rand(-220, 220), y + rand(-170, 170), 1e5); });
  else if (k === 'star')
    tutorSpawn(st, stars, () => stars.push({ x: x + rand(-130, 130), y: y + rand(-90, 90), t: 0, life: 1e5, seed: rand(TAU) }));
  else if (TU_FOES.includes(k))
    tutorSpawn(st, enemies, () => spawnEnemy(k, x + rand(-70, 70), y + rand(-70, 70), false));
  else if (k === 'rift') // о гущине кошмаров надобно рассказывать кошмарами
    tutorSpawn(st, enemies, () => { spawnEnemy('nm', x + 140, y - 90, false); spawnEnemy('shade', x - 150, y + 110, false); });
  else if (k === 'ship')
    tutorSpawn(st, ships, () => ships.push({ x: x - 140, y: y - 30, vx: 24, scl: 1, near: true, dir: 1, bob: rand(TAU), life: 1e5 }));
  else if (k === 'lighthouse')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'lighthouse', x, y, state: 'dark', t: 0, r: 250 }));
  else if (k === 'graveyard')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'graveyard', x, y, r: 250 }));
  else if (k === 'whale')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'whale', x: x - 160, y, vx: 22, vy: 0, t: 2 }));
  else if (k === 'lamplighter')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'lamplighter', x: x - 160, y, vx: 34, vy: 0, t: 1 }));
  else if (k === 'sleepstar')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'star', x, y, state: 'asleep', prog: 0, t: 0, seed: rand(TAU) }));
  else if (k === 'pedlar')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'pedlar', x: x - 120, y, vx: 10, vy: 0, state: 'trade', cd: 0, t: 0 }));
  else if (k === 'nest')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'nest', x, y, state: 'alive', prog: 0, t: 3, cried: false }));
  else if (k === 'starfall')
    tutorSpawn(st, landmarks, () => landmarks.push({ type: 'starfall', x, y, state: 'wait', t: 0 }));
}

function tutorSleep(st) {
  st.on = false;
  for (let i = motes.length - 1; i >= 0; i--) if (motes[i].tu === st.id) freeMote(motes.splice(i, 1)[0]);
  for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].tu === st.id) freeEnemy(enemies.splice(i, 1)[0]);
  for (let i = ships.length - 1; i >= 0; i--) if (ships[i].tu === st.id) {
    if (io.tether === ships[i]) releaseTether();
    ships.splice(i, 1);
  }
  for (let i = stars.length - 1; i >= 0; i--) if (stars[i].tu === st.id) stars.splice(i, 1);
  for (let i = landmarks.length - 1; i >= 0; i--) if (landmarks[i].tu === st.id) landmarks.splice(i, 1);
  if (st.kind === 'weaver') webs.length = 0; // паутина уходит вслед за ловцом
}

// Покуда хозяин в круге, стан держит показ живым: съеденное подсыпается,
// убитое родится вновь, а бродячие жители не уходят за околицу.
function tutorTick(st, dt) {
  st.t += dt;
  const k = st.kind, x = st.x, y = st.y;
  if (k === 'mote' || k === 'meadow') {
    if (!motes.some(m => m.tu === st.id) && (st.cd -= dt) <= 0) {
      st.cd = 1.2;
      tutorSpawn(st, motes, () => { for (let i = 0; i < 12; i++) spawnMoteAt(x + rand(-220, 220), y + rand(-170, 170), 1e5); });
    }
  } else if (k === 'star') {
    if (!stars.some(s2 => s2.tu === st.id) && (st.cd -= dt) <= 0) {
      st.cd = 2.5;
      tutorSpawn(st, stars, () => stars.push({ x: x + rand(-130, 130), y: y + rand(-90, 90), t: 0, life: 1e5, seed: rand(TAU) }));
    }
  } else if (TU_FOES.includes(k)) {
    if (!enemies.some(e => e.tu === st.id) && (st.cd -= dt) <= 0) {
      st.cd = 2.2;
      tutorSpawn(st, enemies, () => spawnEnemy(k, x + rand(-70, 70), y + rand(-70, 70), false));
    }
  } else if (k === 'rift') {
    if (!enemies.some(e => e.tu === st.id) && (st.cd -= dt) <= 0) {
      st.cd = 2.6;
      tutorSpawn(st, enemies, () => { spawnEnemy('nm', x + 140, y - 90, false); spawnEnemy('shade', x - 150, y + 110, false); });
    }
  } else if (k === 'bolt') {
    if ((st.cd -= dt) <= 0) { st.cd = 3.4; spawnBolt(); }
  } else if (k === 'ship') {
    const sh = ships.find(s2 => s2.tu === st.id);
    if (sh && sh.x > x + 520) { sh.x = x - 520; } // корабль ходит кругом, не уплывая
    else if (!sh && (st.cd -= dt) <= 0) {
      st.cd = 2;
      tutorSpawn(st, ships, () => ships.push({ x: x - 140, y: y - 30, vx: 24, scl: 1, near: true, dir: 1, bob: rand(TAU), life: 1e5 }));
    }
  } else {
    // бродячие жители: кит, фонарщик да меняла — возвращаем их к стану
    for (const l of landmarks) {
      if (l.tu !== st.id) continue;
      if (hyp(l.x - x, l.y - y) > 460) { l.x = x - 200; l.y = y; }
    }
    if (k === 'nest' || k === 'sleepstar' || k === 'lighthouse') {
      // выжженное да разбуженное родится вновь, чтобы показ можно было повторить
      const l = landmarks.find(l2 => l2.tu === st.id);
      if (!l && (st.cd -= dt) <= 0) { st.cd = 3; tutorWake(st); }
    }
  }
}

function updateTutor(dt) {
  for (const st of TUTOR.stops) {
    const near = hyp(io.x - st.x, io.y - st.y) < TUTOR_R;
    if (near && !st.on) tutorWake(st);
    else if (!near && st.on) tutorSleep(st);
    if (st.on) tutorTick(st, dt);
  }
}

// Пояснение разбивается на строки единожды на язык: мерить его всякий кадр
// незачем, а языки на ходу меняются.
// У иных станов свой сказ для пальца: джойстик и клавиши — вещи разные.
function stopDesc(st) { return (TOUCH && st.def.dTouch) || st.def.d; }
function tutorLines(st) {
  const maxW = Math.min(430, W - 64); // на телефоне табличка ужимается по экрану
  if (st.lines && st.lang === LANG && st.wrap === maxW) return st.lines;
  st.wrap = maxW;
  _measG.font = '500 17px ' + UI_FONT;
  const out = [];
  let line = '';
  for (const word of nm(stopDesc(st)).split(' ')) {
    const probe = line ? line + ' ' + word : word;
    if (_measG.measureText(probe).width > maxW && line) { out.push(line); line = word; }
    else line = probe;
  }
  if (line) out.push(line);
  _measG.font = '600 21px ' + UI_FONT;
  let w = _measG.measureText(nm(st.def.t)).width;
  _measG.font = '500 17px ' + UI_FONT;
  for (const l of out) w = Math.max(w, _measG.measureText(l).width);
  st.lines = out; st.lang = LANG; st.lw = w;
  return out;
}

// Сад рисуется поверх мира, но под летучими фразами: круг стана, дорожка к
// следующему и табличка с пояснением. Табличка — на тёмной подложке: поверх
// сияний ночи иначе не прочесть, а читать её надобно спокойно.
function drawTutor() {
  const tmw = S.time;
  for (let i = 0; i < TUTOR.stops.length; i++) {
    const st = TUTOR.stops[i];
    if (hyp(st.x - cam.x, st.y - cam.y) > viewR() + 700) continue;
    const P = proj(st.x, st.y);
    const rr = TUTOR_R * P.k;
    // дорожка к следующему стану — чтобы порядок был виден сам собою
    const nx = TUTOR.stops[i + 1];
    if (nx) {
      const P2 = proj(nx.x, nx.y);
      sc.strokeStyle = css3(IO_COL, 0.1);
      sc.lineWidth = 1; sc.setLineDash([3, 14]);
      sc.beginPath(); sc.moveTo(P.x, P.y); sc.lineTo(P2.x, P2.y); sc.stroke();
      sc.setLineDash([]);
    }
    const pl = 0.5 + 0.5 * Math.sin(tmw * 1.6 + i);
    sc.strokeStyle = css3(IO_COL, st.on ? 0.34 + pl * 0.16 : 0.13);
    sc.lineWidth = st.on ? 1.6 : 1;
    sc.setLineDash(st.on ? [] : [6, 10]);
    sc.beginPath();
    sc.ellipse(P.x, P.y, rr, rr * view.tilt, 0, 0, TAU);
    sc.stroke();
    sc.setLineDash([]);

    // Табличка держится своего стана: коли тот далеко за краем, её не рисуем
    // вовсе — иначе пояснения к дальним вещам сгрудились бы у кромки экрана.
    if (P.x < -260 || P.x > W + 260 || P.y < -260 || P.y > H + 260) continue;
    const lines = tutorLines(st);
    const padX = 18, padY = 15, lh = 23;
    const bw = st.lw + padX * 2;
    const bh = 28 + lines.length * lh + padY * 2;
    let bx = P.x - bw / 2;
    let by = P.y - rr * view.tilt - bh - 18;
    bx = clamp(bx, 14, Math.max(14, W - bw - 14));
    by = clamp(by, 92, Math.max(92, H - bh - 96)); // выше — часы, ниже — полосы и кнопки
    const dim = st.on ? 1 : 0.62;
    sc.fillStyle = 'rgba(6,8,12,' + (0.84 * dim + 0.08) + ')';
    sc.beginPath();
    if (sc.roundRect) sc.roundRect(bx, by, bw, bh, 10); else sc.rect(bx, by, bw, bh);
    sc.fill();
    sc.strokeStyle = css3(IO_COL, st.on ? 0.3 : 0.12);
    sc.lineWidth = 1;
    sc.stroke();
    sc.textAlign = 'left'; sc.textBaseline = 'top';
    sc.fillStyle = css3(IO_COL, st.on ? 1 : 0.6);
    sc.font = '600 21px ' + UI_FONT;
    sc.fillText(nm(st.def.t), bx + padX, by + padY);
    sc.font = '500 17px ' + UI_FONT;
    sc.fillStyle = 'rgba(238,242,248,' + (st.on ? 0.97 : 0.58) + ')';
    for (let l = 0; l < lines.length; l++)
      sc.fillText(lines[l], bx + padX, by + padY + 30 + l * lh);
  }
  sc.textAlign = 'center'; sc.textBaseline = 'middle';
}

function exitTutor() {
  if (S.paused) togglePause();
  for (const st of TUTOR.stops) if (st.on) tutorSleep(st);
  TUTOR.on = false;
  TUTOR.stops = [];
  zoneForce.clear();
  endLive = null;
  S.mode = 'title';
  hud.classList.remove('on');
  document.body.classList.remove('playing');
  deathScreen.classList.add('hidden');
  restScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  showBestLine();
}

function levelUp() {
  if (TUTOR.on) { RUN.xp = 0; return; } // в саду дары не раздают — урок важнее
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
    // дары, привязанные к способности, приходят лишь когда способность изучена
    const pool = UPGRADES.filter(u => !(u.once && RUN.taken.includes(u.id)) && !banned.has(u.id) && (!u.ab || abLvl(u.ab) > 0));
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
    d.dataset.up = u.id;
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
  if (BOT.on) { // лётчик берёт назначенный дар, а нет его в тройке — любой
    const want = BOT.gift ? opts.findIndex(u => u.id === BOT.gift) : -1;
    const pickI = want >= 0 ? want : (Math.random() * opts.length) | 0;
    setTimeout(() => box.children[pickI] && box.children[pickI].click(), 120);
  }
}

// ---------- лист итогов ----------
// всякая строка: имя, набегающее число и полоса, что меряет ночь прошлыми ночами.
// goal — мера для полосы, покуда своего рекорда ещё нет: добрая, но не лёгкая ночь
const END_ROWS = [
  { key: 'stNights', val: () => RUN.night, goal: 10 },
  { key: 'stTime', val: () => Math.round(S.playT), always: true, goal: 900,
    fmt: v => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') },
  { key: 'stThoughts', val: () => RUN.thoughts, always: true, goal: 200 },
  { key: 'stKills', val: () => RUN.kills, always: true, goal: 150 },
  { key: 'stWaves', val: () => RUN.waves, goal: 6 },
  { key: 'stShips', val: () => RUN.bosses, goal: 3 },
  { key: 'stStars', val: () => RUN.newStars, goal: 6 },
  { key: 'stLevel', val: () => RUN.level, goal: 12 },
  { key: 'stDist', val: () => Math.round(RUN.dist), goal: 60000,
    fmt: v => (v / 1000).toFixed(1) + tr('distK') },
];
const ROW_IN = 0.26, ROW_RUN = 0.6, PURSE_GAP = 0.45, PURSE_RUN = 1.5, BTN_GAP = 0.5;
let endSeq = 0;      // растёт на всякой смерти — прошлая раскадровка гаснет сама
let endLive = null;  // раскадровка текущего листа, покуда идёт

function buildSheet(cause) {
  const stats = {};
  for (const r of END_ROWS) stats[r.key] = r.val();
  const rec = recordRun(stats);
  const sheet = document.getElementById('endSheet');
  sheet.textContent = '';
  const rows = [];
  for (const r of END_ROWS) {
    const v = stats[r.key];
    if (!v && !r.always) continue; // пустых строк не показываем
    const best = Math.max(rec.prev[r.key] || r.goal || v, v, 1);
    const row = document.createElement('div');
    row.className = 'end-row' + (rec.fresh.has(r.key) ? ' best' : '');
    const line = document.createElement('div'); line.className = 'end-line';
    const name = document.createElement('span'); name.className = 'end-name';
    name.dataset.i18n = r.key;
    name.textContent = tr(r.key);
    const badge = document.createElement('span'); badge.className = 'end-best';
    badge.textContent = tr('stBest');
    name.appendChild(badge);
    const val = document.createElement('span'); val.className = 'end-val';
    val.textContent = r.fmt ? r.fmt(0) : '0';
    line.appendChild(name); line.appendChild(val);
    const bar = document.createElement('div'); bar.className = 'end-bar';
    const fill = document.createElement('div'); fill.className = 'end-fill';
    bar.appendChild(fill);
    row.appendChild(line); row.appendChild(bar);
    sheet.appendChild(row);
    rows.push({ row, val, fill, v, frac: clamp(v / best, 0, 1), fmt: r.fmt });
  }
  const purse = document.getElementById('endPurse');
  const runEl = document.getElementById('purseRun'), metaEl = document.getElementById('purseMeta');
  const before = META.thoughts - RUN.thoughts; // копилка до ссыпания
  runEl.textContent = RUN.thoughts; metaEl.textContent = before;
  purse.classList.remove('in', 'pouring', 'done');
  const btns = document.getElementById('deathBtns'), skip = document.getElementById('deathSkip');
  btns.classList.remove('in'); skip.classList.remove('in');
  document.getElementById('deathQuote').textContent = cause === 'blackhole'
    ? tr('deathVoid') : pick(DEATH_QUOTES[LANG] || DEATH_QUOTES.ru);
  const pourT = RUN.thoughts ? PURSE_RUN : 0;
  const rowsEnd = rows.length * ROW_IN + ROW_RUN;
  return {
    rows, purse, runEl, metaEl, before, btns, skip, pourT, rowsEnd,
    t: 0, seq: endSeq, done: false, tick: -1,
    total: rowsEnd + PURSE_GAP + pourT + BTN_GAP,
  };
}

function endStep(dt) {
  const E = endLive;
  if (!E || E.seq !== endSeq) return;
  E.t += dt;
  for (let i = 0; i < E.rows.length; i++) {
    const r = E.rows[i];
    const k = clamp((E.t - i * ROW_IN) / ROW_RUN, 0, 1);
    if (k <= 0) continue;
    if (!r.shown) { r.shown = true; r.row.classList.add('in'); r.fill.style.width = (r.frac * 100).toFixed(1) + '%'; }
    const e = sstep(k), v = Math.round(r.v * e);
    if (v !== r.last) { r.last = v; r.val.textContent = r.fmt ? r.fmt(v) : v; }
  }
  const pt = E.t - E.rowsEnd - PURSE_GAP;
  if (pt > 0) {
    if (!E.pourShown) { E.pourShown = true; E.purse.classList.add('in', 'pouring'); }
    const k = E.pourT ? clamp(pt / E.pourT, 0, 1) : 1;
    const moved = Math.round(RUN.thoughts * sstep(k));
    if (moved !== E.moved) {
      E.moved = moved;
      E.runEl.textContent = RUN.thoughts - moved;
      E.metaEl.textContent = E.before + moved;
      const tick = Math.floor(k * 12);
      if (tick !== E.tick && k < 1) { E.tick = tick; sfxTick(tick); }
    }
    if (k >= 1 && !E.poured) {
      E.poured = true;
      E.purse.classList.remove('pouring');
      E.purse.classList.add('done'); // отдавшая половина гаснет, копилка остаётся
      sfxChoice();
    }
  }
  if (E.t >= E.total && !E.done) endFinish();
}

function endFinish() {
  const E = endLive;
  if (!E || E.done) return;
  E.done = true;
  for (const r of E.rows) {
    r.row.classList.add('in');
    r.fill.style.width = (r.frac * 100).toFixed(1) + '%';
    r.val.textContent = r.fmt ? r.fmt(r.v) : r.v;
  }
  E.purse.classList.add('in', 'done'); E.purse.classList.remove('pouring');
  E.runEl.textContent = 0; E.metaEl.textContent = E.before + RUN.thoughts;
  E.btns.classList.add('in'); E.skip.classList.add('in');
}

function die(cause) {
  if (BOT.on) console.log('ИТОГ · ночей ' + RUN.night + ' · секунд ' + S.playT.toFixed(0) +
    ' · мыслей ' + RUN.thoughts + ' · степень ' + RUN.level + ' · дары ' + RUN.taken.join(',') +
    ' · смерть ' + (cause || 'бодрость'));
  S.mode = 'death';
  io.oc = false; ocBtn.classList.remove('held');
  document.body.classList.remove('playing');
  saveBest(RUN.night, RUN.thoughts);
  META.thoughts += RUN.thoughts;
  saveMeta();
  if (!TUTOR.on) boardSubmit({ // сад обучения летописи не касается вовсе
    nights: RUN.night, thoughts: RUN.thoughts, time: Math.round(S.playT),
    kills: RUN.kills, level: RUN.level,
  });
  document.getElementById('deathNight').textContent = tr('deathNight', RUN.night, plural(RUN.night));
  endSeq++;
  endLive = buildSheet(cause);
  sfxCrash();
  S.shake = 1; S.glitch = 1;
  burst(io.x, io.y, IO_COL, 60, 500);
  setTimeout(() => deathScreen.classList.remove('hidden'), 1200);
  hud.classList.remove('on');
}

// нажатие где угодно на листе — промотать до конца
deathScreen.addEventListener('pointerdown', e => {
  if (e.target.closest('.end-btn')) return;
  endFinish();
});


// ============================================================
// ЛЕТОПИСЬ БЕССОННИЦ: имя, пропуск и мировая доска
// ============================================================
// Заводить имя необязательно вовсе: без него игра идёт как шла, а забеги
// ложатся в здешнюю летопись — она живёт в самом браузере и никуда не ходит.
// Указан адрес мировой доски — забеги отсылаются туда и становятся вровень с
// чужими. Адрес правится в настройках (или ключом io-noch-board, или ?board=).
// Сам сервер — в папке server: один файл на node либо воркер Cloudflare.
//
// Мера честности здесь простая, как в подобных играх: клиент шлёт свой итог,
// и подделать его при желании можно. Летопись эта — доброе слово, не присяга.
const BOARD = { url: '', acc: null, rows: null, state: 'idle', msg: '', bad: false };

function boardLoad() {
  try {
    BOARD.url = (localStorage.getItem('io-noch-board') || '').trim();
    BOARD.acc = JSON.parse(localStorage.getItem('io-noch-acc') || 'null');
  } catch (_) { BOARD.url = ''; BOARD.acc = null; }
  try { BOARD.local = JSON.parse(localStorage.getItem('io-noch-runs') || '[]'); } catch (_) { BOARD.local = []; }
  if (!Array.isArray(BOARD.local)) BOARD.local = [];
}
function boardSaveAcc() {
  try {
    if (BOARD.acc) localStorage.setItem('io-noch-acc', JSON.stringify(BOARD.acc));
    else localStorage.removeItem('io-noch-acc');
  } catch (_) {}
}
function boardSaveUrl(u) {
  BOARD.url = (u || '').trim().replace(/\/+$/, '');
  try {
    if (BOARD.url) localStorage.setItem('io-noch-board', BOARD.url);
    else localStorage.removeItem('io-noch-board');
  } catch (_) {}
}
// Здешняя летопись хранит десяток лучших забегов — чтобы и без сервера
// было на что смотреть и с чем себя сравнивать.
function boardKeepLocal(run) {
  BOARD.local.push(run);
  BOARD.local.sort((a, b) => (b.nights - a.nights) || (b.thoughts - a.thoughts) || (b.time - a.time));
  BOARD.local = BOARD.local.slice(0, 10);
  try { localStorage.setItem('io-noch-runs', JSON.stringify(BOARD.local)); } catch (_) {}
}

async function boardFetch(path, body) {
  if (!BOARD.url) throw new Error('no-url');
  const opt = body
    ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
    : { method: 'GET' };
  const res = await fetch(BOARD.url + path, opt);
  let data = {};
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) throw new Error(data.error || ('код ' + res.status));
  return data;
}

// Итог забега уходит в летопись сам собою — но лишь коли имя заведено.
// Без имени забег всё равно ложится в здешнюю: своё при себе остаётся всегда.
function boardSubmit(run) {
  boardKeepLocal(run);
  if (!BOARD.url || !BOARD.acc) return;
  boardFetch('/api/score', Object.assign({ token: BOARD.acc.token }, run))
    .then(d => {
      BOARD.rows = d.rows || BOARD.rows;
      BOARD.msg = d.best && d.rank ? tr('bd_sent', d.rank) : tr('bd_sent_no');
      BOARD.bad = false;
      if (!boardScreen.classList.contains('hidden')) renderBoard();
    })
    .catch(err => { // сеть могла и не отозваться — забег уже сохранён у себя
      if (err.message === 'войди прежде') { BOARD.acc = null; boardSaveAcc(); }
      BOARD.msg = tr('bd_fail'); BOARD.bad = true;
    });
}

const boardScreen = document.getElementById('boardScreen');
const bdList = document.getElementById('bdList');
const bdMsg = document.getElementById('bdMsg');
const bdName = document.getElementById('bdName');
const bdPass = document.getElementById('bdPass');
const bdForm = document.getElementById('bdForm');
const bdWho = document.getElementById('bdWho');

function boardRow(cls, place, name, nights, thoughts) {
  const d = document.createElement('div');
  d.className = 'bd-row' + (cls ? ' ' + cls : '');
  d.innerHTML = '<span class="bd-place">' + place + '</span><b></b><i>' + nights + '</i><i>' + thoughts + '</i>';
  d.querySelector('b').textContent = name; // чужое имя — только текстом, не разметкой
  return d;
}

function renderBoard() {
  bdName.placeholder = tr('bd_name_ph');
  bdPass.placeholder = tr('bd_pass_ph');
  const mine = BOARD.acc && BOARD.acc.name;
  bdForm.classList.toggle('hidden', !!mine);
  bdWho.classList.toggle('hidden', !mine);
  if (mine) document.getElementById('bdWhoName').textContent = tr('bd_hi', BOARD.acc.name);
  document.getElementById('bdWhere').textContent =
    BOARD.url ? tr('bd_world', BOARD.url.replace(/^https?:\/\//, '')) : tr('bd_local');
  bdMsg.textContent = BOARD.msg || (BOARD.url ? '' : tr('bd_off'));
  bdMsg.classList.toggle('bad', BOARD.bad);

  bdList.innerHTML = '';
  bdList.appendChild(boardRow('head', tr('bd_col_place'), tr('bd_col_name'), tr('bd_col_nights'), tr('bd_col_thoughts')));
  const world = BOARD.url && BOARD.rows;
  const rows = world ? BOARD.rows : BOARD.local.map(r => Object.assign({ name: mine || tr('bd_you') }, r));
  if (BOARD.url && BOARD.state === 'wait' && !BOARD.rows) {
    const d = document.createElement('div');
    d.className = 'bd-row'; d.textContent = tr('bd_wait');
    bdList.appendChild(d);
    return;
  }
  if (!rows.length) {
    const d = document.createElement('div');
    d.className = 'bd-row'; d.textContent = tr('bd_empty');
    bdList.appendChild(d);
    return;
  }
  rows.forEach((r, i) => {
    const me = mine && r.name === mine;
    bdList.appendChild(boardRow(me ? 'me' : '', i + 1, r.name, r.nights, r.thoughts));
  });
}

function openBoard() {
  BOARD.msg = ''; BOARD.bad = false;
  renderBoard();
  boardScreen.classList.remove('hidden');
  if (!BOARD.url) return;
  BOARD.state = 'wait';
  boardFetch('/api/top?limit=50')
    .then(d => { BOARD.rows = d.rows || []; BOARD.state = 'idle'; renderBoard(); })
    .catch(() => { BOARD.state = 'idle'; BOARD.msg = tr('bd_fail'); BOARD.bad = true; renderBoard(); });
}

function boardAuth(path) {
  const name = bdName.value.trim(), pass = bdPass.value;
  if (!BOARD.url) { BOARD.msg = tr('bd_off'); BOARD.bad = true; renderBoard(); return; }
  BOARD.msg = tr('bd_wait'); BOARD.bad = false; renderBoard();
  boardFetch(path, { name, pass })
    .then(d => {
      BOARD.acc = { name: d.name, token: d.token };
      boardSaveAcc();
      bdPass.value = '';
      BOARD.msg = tr('bd_hi', d.name); BOARD.bad = false;
      renderBoard();
      return boardFetch('/api/top?limit=50').then(t => { BOARD.rows = t.rows || []; renderBoard(); });
    })
    .catch(err => { BOARD.msg = err.message === 'no-url' ? tr('bd_off') : err.message; BOARD.bad = true; renderBoard(); });
}

document.getElementById('boardBtn').addEventListener('pointerdown', e => {
  e.stopPropagation(); e.preventDefault();
  openBoard();
});
document.getElementById('bdBack').addEventListener('pointerdown', e => {
  e.stopPropagation();
  boardScreen.classList.add('hidden');
});
document.getElementById('bdLogin').addEventListener('pointerdown', e => { e.stopPropagation(); boardAuth('/api/login'); });
document.getElementById('bdReg').addEventListener('pointerdown', e => { e.stopPropagation(); boardAuth('/api/register'); });
document.getElementById('bdOut').addEventListener('pointerdown', e => {
  e.stopPropagation();
  BOARD.acc = null; boardSaveAcc();
  BOARD.msg = tr('bd_guest'); BOARD.bad = false;
  renderBoard();
});
bdPass.addEventListener('keydown', e => { if (e.key === 'Enter') boardAuth('/api/login'); });
boardLoad();
// Адрес летописи правится в настройках: поле помнит себя между ночами.
const setBoardIn = document.getElementById('setBoard');
setBoardIn.value = BOARD.url;
setBoardIn.addEventListener('change', () => {
  boardSaveUrl(setBoardIn.value);
  setBoardIn.value = BOARD.url;
  BOARD.rows = null; BOARD.msg = ''; BOARD.bad = false;
});

// ---------- меню-огонёк на титуле ----------
// нажал огонёк — веер кнопок раскрылся; нажал в пустоту — сложился обратно
const menuOrb = document.getElementById('menuOrb');
menuOrb.addEventListener('pointerdown', e => {
  e.stopPropagation();
  audioUnlock();
  titleScreen.classList.toggle('open');
  sfxChoice();
});
document.getElementById('playBtn').addEventListener('pointerdown', e => {
  e.stopPropagation();
  startRun();
});
document.getElementById('menuSetBtn').addEventListener('pointerdown', e => {
  e.stopPropagation();
  openSettings();
});
titleScreen.addEventListener('pointerdown', () => titleScreen.classList.remove('open'));
document.getElementById('againBtn').addEventListener('click', e => {
  e.stopPropagation();
  startRun();
});
document.getElementById('tutorBtn').addEventListener('pointerdown', e => {
  e.stopPropagation(); e.preventDefault();
  startTutor();
});
document.getElementById('pauseExit').addEventListener('click', e => {
  e.stopPropagation();
  if (TUTOR.on) { exitTutor(); return; }
  togglePause();
  endLive = null;
  S.mode = 'title';
  hud.classList.remove('on');
  document.body.classList.remove('playing');
  titleScreen.classList.remove('hidden');
  showBestLine();
});
document.getElementById('titleBtn2').addEventListener('click', e => {
  e.stopPropagation();
  endLive = null;
  S.mode = 'title';
  deathScreen.classList.add('hidden');
  titleScreen.classList.remove('hidden');
  showBestLine();
});

// ---------- панель настроек ----------
const setBtn = document.getElementById('setBtn');
const setPanel = document.getElementById('setPanel');
let pausedBySettings = false, resetArmed = false;

function applyLang() {
  document.documentElement.lang = LANG;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tr(el.dataset.i18n);
  for (const [id, key] of [['btnTether', 'btnTether'], ['btnBlink', 'btnBlink'], ['ocBtn', 'ocBtn']]) {
    const el = document.getElementById(id);
    if (el) { el.setAttribute('aria-label', tr(key)); el.setAttribute('title', tr(key)); }
  }
  showBestLine();
  updateHud(); updateClock();
  if (S.mode === 'level') {
    document.getElementById('restHead').textContent =
      tr('restHead', RUN.level, Math.max(1, Math.ceil(RUN.wake)), RUN.wakeMax);
    for (const d of document.querySelectorAll('.dream[data-up]')) {
      const u = UPGRADES.find(v => v.id === d.dataset.up);
      if (!u) continue;
      d.querySelector('.d-name').textContent = upName(u);
      d.querySelector('.d-desc').textContent = upDesc(u);
    }
  }
  if (S.mode === 'death')
    document.getElementById('deathNight').textContent = tr('deathNight', RUN.night, plural(RUN.night));
  if (!metaScreen.classList.contains('hidden')) renderMeta();
  if (!skyScreen.classList.contains('hidden')) openSky();
  if (!skinScreen.classList.contains('hidden')) renderWardrobe();
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
// Клавиши, что игра держит за собою: ими выбирают сны, закрывают окна и
// начинают ночь, — отдавать их под правку нельзя.
const KEY_RESERVED = ['Escape', 'Enter', 'NumpadEnter', 'Digit1', 'Digit2', 'Digit3'];
const KEY_ORDER = ['up', 'down', 'left', 'right', 'halt', 'tether', 'blink', 'charge'];
const keyList = document.getElementById('keyList');
const keyNote = document.getElementById('keyNote');
let keyWaiting = null; // какое дело ждёт новой клавиши
function renderKeys() {
  if (!keyList) return;
  keyList.innerHTML = '';
  for (const act of KEY_ORDER) {
    const b = document.createElement('button');
    b.className = 'keyrow' + (keyWaiting === act ? ' grab' : '');
    b.dataset.act = act;
    const lbl = document.createElement('span');
    lbl.textContent = tr('act_' + act);
    const kv = document.createElement('i');
    kv.textContent = keyWaiting === act ? '…' : keyName(SET.keys[act]);
    b.append(lbl, kv);
    keyList.appendChild(b);
  }
}
// Ловля клавиши: занятую другим делом не отнимаем молча, а меняем местами —
// иначе раскладка легко остаётся с двумя пустыми местами.
function bindKey(act, code) {
  if (KEY_RESERVED.includes(code)) {
    keyNote.textContent = tr('sKeyBusy');
    return false;
  }
  const held = actOf(code);
  if (held && held !== act) SET.keys[held] = SET.keys[act];
  SET.keys[act] = code;
  saveSettings();
  keyNote.textContent = tr('sKeysHint');
  return true;
}
function startGrab(act) {
  keyWaiting = act;
  keyNote.textContent = tr('sKeyWait');
  keyGrab = e => { // ловец живёт, пока ждём: клавиатуру слушает keydown
    e.preventDefault();
    if (e.code !== 'Escape') bindKey(act, e.code);
    endGrab();
  };
  renderKeys();
}
function endGrab() {
  keyWaiting = null; keyGrab = null;
  for (const st of TUTOR.stops) st.lang = null; // таблички сада зовут клавиши по имени
  renderKeys(); updateHud(); applyLang();
}
if (keyList) {
  let keyClickGuard = false;
  keyList.addEventListener('click', e => {
    const b = e.target.closest('.keyrow'); if (!b) return;
    e.stopPropagation();
    if (keyClickGuard) { keyClickGuard = false; return; }
    if (keyWaiting === b.dataset.act) { endGrab(); return; }
    startGrab(b.dataset.act);
  });
  // Кнопки мыши ловятся нажатием, а не кликом: клик приходит уже после и его
  // приходится гасить, иначе он тут же начал бы новую ловлю на той же строке.
  setPanel.addEventListener('pointerdown', e => {
    if (!keyWaiting || e.pointerType !== 'mouse') return;
    if (e.button !== 0 && e.button !== 2) return;
    e.preventDefault();
    keyClickGuard = !!(e.target.closest && e.target.closest('.keyrow'));
    bindKey(keyWaiting, 'Mouse' + e.button);
    endGrab();
  }, true);
  document.getElementById('keyReset').addEventListener('click', e => {
    e.stopPropagation();
    SET.keys = Object.assign({}, DEFAULT_KEYS);
    saveSettings(); endGrab();
  });
}

function syncSetUI() {
  for (const [id, val] of [['segLang', LANG], ['segQual', SET.quality], ['segHud', SET.hud],
    ['segSide', SET.touchSide], ['segFps', SET.fps ? 'on' : 'off'],
    ['segSteer', SET.steer], ['segText', SET.text ? 'on' : 'off']])
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
  renderKeys();
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
  if (keyWaiting) endGrab();
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
document.getElementById('segSteer').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.steer = b.dataset.v; saveSettings(); syncSetUI();
});
document.getElementById('segText').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  SET.text = b.dataset.v === 'on'; saveSettings(); syncSetUI();
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
const WLOG = { on: false, n: 0 };
// Отладочный лётчик для замеров баланса: держится подальше от кошмаров,
// подбирает ближнюю мысль, мерцает, когда прижали. Играет он хуже человека,
// оттого его смерть — нижняя граница живучести, не средняя.
// (сам объект BOT объявлен выше, до первого newRun — abLvl глядит в него)
function botTarget() {
  let bx = io.x, by = io.y, fear = 0, fx = 0, fy = 0;
  for (const e of enemies) {
    if (e.sleeping) continue;
    const dx = io.x - e.x, dy = io.y - e.y, d = hyp(dx, dy) || 1;
    if (d < 300) { const w = (300 - d) / 300; fear += w; fx += dx / d * w; fy += dy / d * w; }
  }
  if (fear > 0.35) { // прижали — уходим прочь от гущи
    const fd = hyp(fx, fy) || 1;
    bx = io.x + fx / fd * 460; by = io.y + fy / fd * 460;
    if (io.reloc.cd <= 0 && fear > 1.6) { BOT.tx = bx; BOT.ty = by; tryRelocate(); }
    return { x: bx, y: by };
  }
  let best = null, bd = 1e9;
  for (const m of motes) {
    const d = hyp(m.x - io.x, m.y - io.y);
    if (d < bd) { bd = d; best = m; }
  }
  return best ? { x: best.x, y: best.y } : { x: io.x + Math.cos(S.time * 0.4) * 400, y: io.y + Math.sin(S.time * 0.4) * 400 };
}
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
  if (endLive && !endLive.done) endStep(dt);
  // отладка мира: не выедается ли ночь позади (считаем кадрами, а не часами)
  if (WLOG.on && S.mode === 'play' && ++WLOG.n % 180 === 0)
    console.log('МИР: мыслей ' + motes.length + ' · кошмаров ' + enemies.length +
      ' · клеток ' + RUN.cells.size + ' · бодрость ' + RUN.wake.toFixed(0) + '/' + RUN.wakeMax +
      ' · ночь ' + RUN.night + ' · степень ' + RUN.level + ' · время ' + S.playT.toFixed(0));
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
    const qLang = q.get('lang');
    LANG = SET.lang = ['ru', 'en', 'de'].includes(qLang) ? qLang : 'ru';
    applyLang(); syncSetUI();
  }
  if (q.get('perf')) PERF.on = true;
  if (q.get('wlog')) WLOG.on = true;
  if (q.get('hit')) setTimeout(() => { // отладка: что лежит под пальцем посреди экрана
    const pts = [[0.5, 0.5], [0.5, 0.62], [0.5, 0.78], [0.3, 0.5], [0.7, 0.4]];
    const out = pts.map(p => {
      const el = document.elementFromPoint(W * p[0], H * p[1]);
      return p[0] + ',' + p[1] + ' → ' + (el ? (el.id || el.className || el.tagName) : 'ничего');
    });
    console.log('ПОД ПАЛЬЦЕМ · ' + out.join(' · '));
  }, 1500);
  if (q.get('bot')) { // замер живучести: лётчик играет сам, исход пишется в консоль
    BOT.on = true;
    if (q.get('gift')) BOT.gift = q.get('gift');
    setTimeout(() => {
      startRun();
      if (q.get('again')) setInterval(() => { if (S.mode === 'death') startRun(); }, 1500);
    }, 400);
  }
  if (q.get('ab')) { // отладка способностей: ?ab=1,1,1,2 → нить,мерцание,заряд,спириты
    const v = q.get('ab').split(',');
    ['tether', 'blink', 'charge', 'spirits'].forEach((k2, i2) => {
      META.ab[k2] = parseInt(v[i2] || '0', 10) || 0;
    });
  }
  if (q.get('lm')) setTimeout(() => { // отладка жителей: ?lm=lighthouse|graveyard|whale|lamplighter
    const t2 = q.get('lm');
    if (t2 === 'whale' || t2 === 'lamplighter') {
      landmarks.push({ type: t2, x: io.x + 200, y: io.y - 60, vx: t2 === 'whale' ? 25 : 40, vy: 0, t: 1 });
    } else if (t2 === 'star') landmarks.push({ type: t2, x: io.x + 230, y: io.y + 40, state: 'asleep', prog: 0, t: 0, seed: rand(TAU) });
    else if (t2 === 'pedlar') landmarks.push({ type: t2, x: io.x + 230, y: io.y + 40, vx: 14, vy: 0, state: 'trade', cd: 0, t: 0 });
    else if (t2 === 'nest') landmarks.push({ type: t2, x: io.x + 230, y: io.y + 40, state: 'alive', prog: 0, t: 3, cried: false });
    else landmarks.push({ type: t2, x: io.x + 230, y: io.y + 40, state: 'dark', t: 0, r: 250 });
  }, 900);
  if (q.get('look')) { // отладка обликов: ?look=storm_shell,star_dust,ring_halo — по id из гардероба
    for (const id of q.get('look').split(',')) {
      for (const s of WARDROBE) {
        if (s.id !== id) continue;
        if (s.slot) SET.visuals[s.slot] = s.id; else SET.visuals[s.key] = true;
      }
    }
  }
  if (q.get('menu')) setTimeout(() => titleScreen.classList.add('open'), 300); // отладка: меню титула раскрыто
  if (q.get('board') !== null && q.get('board') !== undefined) { // отладка летописи: ?board=<адрес>
    boardSaveUrl(q.get('board'));
    setTimeout(openBoard, 300);
  }
  if (q.get('tutor')) setTimeout(() => { // отладка сада: ?tutor=1 · ?tutor=<номер стана>
    startTutor();
    const n = parseInt(q.get('tutor'), 10);
    if (n > 1 && TUTOR.stops[n - 1]) { // встать подле нужного стана, минуя дорогу
      const st = TUTOR.stops[n - 1];
      io.x = st.x; io.y = st.y + 120; cam.x = io.x; cam.y = io.y;
    }
  }, 400);
  if (q.get('wdall')) { // отладка гардероба: всё добыто, но лишь в памяти — без записи
    STARS_DATA.completed = CHALLENGES.map(c2 => c2.id);
    skyGroups().forEach((tier, gi) => tier.forEach((p2, pi) => SKY.add(phraseKey(gi, pi))));
  }
  if (q.get('wd')) setTimeout(() => { renderWardrobe(); skinScreen.classList.remove('hidden'); }, 300);
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
  if (q.get('die')) setTimeout(() => { // отладка листа итогов: смерть с готовыми числами
    startRun();
    RUN.night = 7; RUN.thoughts = 148; RUN.kills = 96; RUN.waves = 4;
    RUN.bosses = 1; RUN.newStars = 3; RUN.level = 9; RUN.dist = 41200;
    S.playT = 512;
    die(q.get('die') === 'bh' ? 'blackhole' : 'wake');
    if (q.get('skip')) setTimeout(() => { // отладка: сразу конечный вид листа
      endFinish();
      console.log('ЛИСТ · ' + document.getElementById('endSheet').innerText.replace(/\n/g, ' | ') +
        ' · копилка ' + document.getElementById('purseRun').textContent + '→' + document.getElementById('purseMeta').textContent +
        ' · кнопки «' + document.getElementById('deathBtns').className + '»');
    }, 1800);
  }, 500);
  if (q.get('q')) { SET.quality = q.get('q'); applyQuality(); }
  if (q.get('touch')) { // отладка тач-раскладки на настольном браузере
    TOUCH = true;
    document.body.classList.add('touch');
    applyLang(); syncSetUI();
  }
  if (q.get('set')) setTimeout(openSettings, 300);
  if (q.get('meta')) setTimeout(() => { // отладка шкатулки: открыть с деньгами
    META.thoughts = Math.max(META.thoughts, parseInt(q.get('meta')) || 0);
    renderMeta();
    metaScreen.classList.remove('hidden');
    setTimeout(() => { // и сразу пощупать: что лежит на месте первой кнопки
      const btn = metaList.querySelector('button');
      if (btn) {
        const r = btn.getBoundingClientRect();
        const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        console.log('ШКАТУЛКА: на кнопке лежит ' + (el ? (el.id || el.className || el.tagName) : 'ничего') +
          (el === btn ? ' — она сама, клики дойдут' : ' — ЧУЖОЕ, клики не дойдут'));
      }
    }, 600);
  }, 400);
  if (q.get('sky')) { // отладка созвездия: зажечь часть звёзд, памяти не трогая
    skyGroups().forEach((tier, gi) => tier.forEach((p, pi) => { if ((pi + gi) % 2 === 0) SKY.add(phraseKey(gi, pi)); }));
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
        const bst = q.get('boss');
        spawnBoss(bst === 'whale' || bst === 'surfaced' ? 'whale' : undefined);
        boss.x = io.x + 340; boss.y = io.y - 60; boss.dir = -1;
        if (bst === 'lantern') { boss.st = 'lantern'; boss.stT = 30; boss.open = 1; }
        if (bst === 'volley') { boss.st = 'volley'; boss.stT = 30; boss.volley = 3; boss.volleyT = 0.2; }
        if (bst === 'surfaced') { boss.st = 'surfaced'; boss.stT = 30; boss.open = 1; }
      }
    }, 800);
  }
}

})();
