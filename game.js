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
function css3(c, a = 1) { return `rgba(${(c[0] * 255) | 0},${(c[1] * 255) | 0},${(c[2] * 255) | 0},${a})`; }

// ---------- timeline ----------
// Ночь идёт с 23:00 до 06:00 (420 игровых минут) за TOTAL реальных секунд.
const TOTAL = 330;
// стопы палитры: [t, skyTop, skyBot, aurora, tint, mote, auroraInt, stars]
const STOPS = [
  [0.00, '#05070d', '#0b1322', '#14405a', '#e8a54a', '#ffd9a0', 0.18, 0.9],
  [0.24, '#070b18', '#17244a', '#3f7ea6', '#9fb4c7', '#cfe4ff', 0.42, 1.0],
  [0.50, '#10082e', '#2c1157', '#d84fd8', '#7df9ff', '#ff7ad9', 0.72, 1.1],
  [0.76, '#16003a', '#4d0f6e', '#ff2ea0', '#ffe14d', '#ff4fd8', 1.00, 1.2],
  [0.90, '#24004d', '#7a1560', '#ff5f3c', '#ff9de2', '#fff06e', 1.10, 0.8],
  [1.00, '#40507e', '#f2b56b', '#ffb86b', '#ffd9a0', '#fff3d9', 0.22, 0.0],
].map(s => [s[0], hex(s[1]), hex(s[2]), hex(s[3]), hex(s[4]), hex(s[5]), s[6], s[7]]);
// энергия (музыка + визуальный накал) по времени ночи
const ESTOPS = [[0, .13], [.24, .34], [.5, .6], [.76, .9], [.86, 1.0], [.93, .3], [1, .07]];

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
// границы стадий по игровым часам: 00:30, 02:00, 04:00, 05:00
const NIGHT_NAMES = [[0, 'ночь первая'], [.214, 'ночь вторая'], [.43, 'ночь третья'], [.714, 'не спи'], [.857, 'рассвет']];

// ---------- слова, которые ловишь ----------
const PHRASES = [
  [ // тихая ночь
    'молоко убежало три дня назад',
    'кто-то оставил свет в коридоре',
    'завтра — это уже сегодня',
    'подушка холодная с обеих сторон',
    'сон стоит на остановке и не садится',
    'в доме напротив тоже не спят',
    'чайник остыл, а я не заметил',
    'тишина немного звенит',
  ],
  [ // вторая ночь
    'корабли ходят по небу',
    'потолок дышит — это нормально',
    'четыре утра — это место, а не время',
    'звёзды — это дырки от кнопок',
    'все города сейчас плывут',
    'глаза закрываются в обратную сторону',
    'батарея на 9% и я тоже',
    'мысли ходят кругами, как вентилятор',
  ],
  [ // третья ночь
    'СЕРДЦЕ СТУЧИТ КАК БАСЫ',
    'громче. ещё громче',
    'я выпил свет из холодильника',
    'кожа помнит все песни',
    'время идёт рябью',
    'я — антенна для чужих сигналов',
    'ночь пахнет клубничной газировкой',
    'НЕ СПИ НЕ СПИ НЕ СПИ',
  ],
  [ // шторм
    'ВСЁ СВЕТИТСЯ ИЗНУТРИ',
    'Я НЕ УСТАЛ Я БЕСКОНЕЧЕН',
    'НЕБО ТРЕЩИТ ПО ШВАМ',
    'ДЕРЖИСЬ ЗА КРОВАТЬ',
    'ЕЩЁ ЧУТЬ-ЧУТЬ',
    'МЫ ПОЧТИ НА МЕСТЕ',
  ],
  [ // рассвет
    'тише. уже почти',
    'корабли дошли',
    'свет прощает всех',
    'можно закрывать глаза',
  ],
];
const WIND_PHRASE = 'попутный ветер';
const CRASH_PHRASE = 'борт! мысли рассыпались';
const END_QUOTES = [
  'спи. корабли дойдут без тебя.',
  'утро умеет ждать — теперь твоя очередь.',
  'всё, что ты поймал, приснится тебе обратно.',
  'ночь кончилась. это не поражение.',
];
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

  // сайдчейн-шина: пады и бас «дышат» под кик
  A.sc = ctx.createGain(); A.sc.connect(A.master);
  A.drums = ctx.createGain(); A.drums.connect(A.master);

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
  A.next = ctx.currentTime + 0.1;
  A.step = 0; A.bar = 0; A.started = true;
  setInterval(schedulerTick, 25);
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
  for (const m of chord) {
    for (const det of [-7, 6]) {
      const o = ctx.createOscillator();
      o.type = e > 0.5 && !A.dawnMode ? 'sawtooth' : 'triangle';
      o.frequency.value = m2f(m); o.detune.value = det + rand(-3, 3);
      o.connect(filt); o.start(t); oscs.push(o);
    }
  }
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
  hp.connect(g); g.connect(A.master);
  const send = ctx.createGain(); send.gain.value = 0.8; g.connect(send); send.connect(A.verbSend);
  for (const det of [-11, 0, 12]) { // суперсоу с глайдом
    const o = ctx.createOscillator();
    o.type = 'sawtooth'; o.detune.value = det;
    o.frequency.setValueAtTime(A.leadPrev, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.055);
    o.connect(hp); o.start(t); o.stop(t + 0.4);
  }
  A.leadPrev = f;
}

function sfxCollect(combo) {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const midi = PENT[combo % PENT.length] + (combo >= PENT.length ? 12 : 0);
  const f = m2f(midi);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
  g.connect(A.master);
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
  src.connect(bp); bp.connect(g); g.connect(A.master);
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
  o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.75);
  const src = ctx.createBufferSource(); src.buffer = A.noise;
  const lp2 = ctx.createBiquadFilter(); lp2.type = 'lowpass'; lp2.frequency.value = 900;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.3, t);
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
  src.connect(lp2); lp2.connect(ng); ng.connect(A.master);
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
  src.connect(bp); bp.connect(g); g.connect(A.master);
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
  o.connect(g); g.connect(A.master);
  const send = ctx.createGain(); send.gain.value = 1.4; g.connect(send); send.connect(A.verbSend);
  o.start(t); o.stop(t + 1.9);
}

function audioDawn() {
  if (!A.started || A.dawnMode) return;
  A.dawnMode = true;
  const t = A.ctx.currentTime;
  A.lp.frequency.cancelScheduledValues(t);
  A.lp.frequency.setValueAtTime(A.lp.frequency.value, t);
  A.lp.frequency.exponentialRampToValueAtTime(2600, t + 6);
  A.lp.frequency.exponentialRampToValueAtTime(9000, t + 20);
}

// ============================================================
// WEBGL: небо + постобработка поверх 2D-сцены
// ============================================================
const glCanvas = document.getElementById('gl');
const gl = glCanvas.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });

const VSH = `
attribute vec2 p; varying vec2 vUv;
void main(){ vUv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const FSH = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes; uniform float uTime;
uniform sampler2D uScene;
uniform vec3 uSkyA, uSkyB, uAur, uTint;
uniform float uAurI, uStars, uAberr, uGlitch, uShake, uEnergy, uDawn;
uniform vec2 uMoonPos; uniform float uMoonR, uMoon;

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

  // --- небо ---
  float grad = pow(clamp(uv.y,0.,1.), .85);
  vec3 sky = mix(uSkyB, uSkyA, grad);
  float neb = fbm(uv*vec2(aspect,1.)*2.6 + vec2(uTime*.008, 0.));
  sky += uAur * neb * .1 * (.4+uAurI);

  // авроры — три ленты
  for(int i=0;i<3;i++){
    float fi = float(i);
    float yC = .58 + fi*.11 + .06*sin(uTime*.05+fi*2.1);
    float w = fbm(vec2(uv.x*aspect*1.4 + uTime*.05*(1.+fi*.4), fi*7.7));
    float band = exp(-abs(uv.y-(yC+(w-.5)*.3))*(15.-5.*w));
    vec3 acol = mix(uAur, uTint, w);
    sky += acol * band * uAurI * (.22+.1*sin(uTime*.6+fi*1.9));
  }

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
  float st = starLayer(sUV,28.,uTime) + starLayer(sUV+7.7,64.,uTime*1.3)*.6;
  sky += vec3(.9,.93,1.)*st*uStars*(uv.y*.75+.25)*(1.-disc)*(1.-uDawn);

  // --- сцена с аберрацией (premultiplied composite) ---
  vec2 dir = suv-.5;
  vec4 c0 = texture2D(uScene, suv);
  float ab = uAberr;
  float r = texture2D(uScene, suv+dir*ab).r;
  float b = texture2D(uScene, suv-dir*ab).b;
  vec3 sceneRGB = vec3(r, c0.g, b);
  vec3 col = sky*(1.-c0.a) + sceneRGB;

  // дешёвый блум сцены
  vec2 px = 5./uRes;
  vec3 bl = vec3(0.);
  bl += texture2D(uScene, suv+vec2( px.x, 0.)).rgb;
  bl += texture2D(uScene, suv+vec2(-px.x, 0.)).rgb;
  bl += texture2D(uScene, suv+vec2(0.,  px.y)).rgb;
  bl += texture2D(uScene, suv+vec2(0., -px.y)).rgb;
  bl += texture2D(uScene, suv+vec2( px.x, px.y)*1.8).rgb;
  bl += texture2D(uScene, suv+vec2(-px.x,-px.y)*1.8).rgb;
  col += bl * .09 * (.6+uEnergy);

  // зерно
  col += (hash(uv*uRes+fract(uTime)*7.)-.5)*.06*(.5+uEnergy);

  // насыщенность растёт с энергией
  float l = dot(col, vec3(.299,.587,.114));
  col = mix(vec3(l), col, 1. + uEnergy*.4);

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
const prog = gl.createProgram();
gl.attachShader(prog, makeShader(gl.VERTEX_SHADER, VSH));
gl.attachShader(prog, makeShader(gl.FRAGMENT_SHADER, FSH));
gl.linkProgram(prog);
if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
gl.useProgram(prog);

const quad = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
const locP = gl.getAttribLocation(prog, 'p');
gl.enableVertexAttribArray(locP);
gl.vertexAttribPointer(locP, 2, gl.FLOAT, false, 0, 0);

const U = {};
for (const n of ['uRes', 'uTime', 'uScene', 'uSkyA', 'uSkyB', 'uAur', 'uTint', 'uAurI', 'uStars',
  'uAberr', 'uGlitch', 'uShake', 'uEnergy', 'uDawn', 'uMoonPos', 'uMoonR', 'uMoon'])
  U[n] = gl.getUniformLocation(prog, n);

const sceneTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, sceneTex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
// сцена рисуется в premultiplied alpha — композитим её так же
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
gl.uniform1i(U.uScene, 0);

// ============================================================
// ИГРА: рогалик. Ио — шарик света — против бесконечной ночи.
// ============================================================
const scene = document.createElement('canvas');
const sc = scene.getContext('2d');
let W = 0, H = 0, DPR = 1;

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = window.innerWidth; H = window.innerHeight;
  glCanvas.width = (W * DPR) | 0; glCanvas.height = (H * DPR) | 0;
  scene.width = glCanvas.width; scene.height = glCanvas.height;
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
}
window.addEventListener('resize', resize);
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

// фразы Ио вплетаются в общий поток бессонницы
PHRASES[1].push('я — маленький шар света', 'нить дрожит, но держит');
PHRASES[2].push('искры помнят дорогу домой', 'я свечусь, значит я есть');
const DEATH_QUOTES = [
  'даже свет иногда моргает.',
  'кошмары тоже кого-то боятся.',
  'погасни. отдохни. зажгись снова.',
  'ночь длинная, а искры — упрямые.',
];

// ---------- сны (апгрейды между ночами) ----------
const UPGRADES = [
  { id: 'spark', name: 'ещё одна искра', desc: 'к хороводу присоединяется новый спирит', apply: r => r.spirits++ },
  { id: 'round', name: 'шире хоровод', desc: 'орбита спиритов на треть просторнее', apply: r => r.orbitR *= 1.33 },
  { id: 'tea', name: 'крепкий чай', desc: '+25 к пределу бодрости и глоток прямо сейчас', apply: r => { r.wakeMax += 25; r.wake = Math.min(r.wakeMax, r.wake + 15); } },
  { id: 'thread', name: 'длинная нить', desc: 'привязаться к кораблю можно издалека', apply: r => r.tetherR *= 1.45 },
  { id: 'light', name: 'лёгкость', desc: 'свет летит на пятую часть быстрее', apply: r => r.speed *= 1.2 },
  { id: 'breath', name: 'глубокий вдох', desc: 'релокейт возвращается на 2 секунды раньше', apply: r => r.relocCd = Math.max(3, r.relocCd - 2) },
  { id: 'magnet', name: 'магнит для мыслей', desc: 'мысли сами тянутся к тёплому', apply: r => r.pickupR *= 1.5 },
  { id: 'blanket', name: 'толстое одеяло', desc: 'всё ранит на треть слабее', apply: r => r.dmgMul *= 0.7 },
  { id: 'wind2', name: 'второе дыхание', desc: 'один раз за бессонницу смертельный удар не гасит тебя', rare: true, apply: r => r.secondWind = true },
];

function newRun() {
  return {
    night: 1, wake: 100, wakeMax: 100,
    spirits: 3, orbitR: 52, pickupR: 48, speed: 1, dmgMul: 1,
    relocCd: 8, tetherR: 220, secondWind: false,
    kills: 0, thoughts: 0, comboBest: 0, taken: [],
  };
}
let RUN = newRun();

const NIGHT_LEN = 90;
const S = {
  mode: 'title', t: 0, time: 0, paused: false,
  combo: 0, comboT: 0,
  shake: 0, glitch: 0,
  hurtT: 0, stormFired: false,
  pal: palette(0), energy: 0.13,
};
function isStormNight() { return RUN.night % 3 === 0; }

const io = {
  x: 0, y: 0, vx: 0, vy: 0, trail: [],
  spirits: [],           // {ang, cd}
  reloc: { phase: 'idle', timer: 0, cd: 0, rx: 0, ry: 0 },
  oc: false,             // оверчардж
  tether: null,          // корабль
};
const pointer = { x: 0, y: 0, active: false };
const keys = {};
let motes = [], ships = [], nightmares = [], bolts = [], parts = [], texts = [], shots = [], clouds = [];
let moteTimer = 0, shipTimer = 4, shotTimer = 3, nmTimer = 2, boltTimer = 6;

function syncSpirits() {
  while (io.spirits.length < RUN.spirits) io.spirits.push({ ang: rand(TAU), cd: 0 });
}

function resetNight(attract) {
  motes = []; ships = []; nightmares = []; bolts = []; parts = []; texts = []; shots = [];
  clouds = [];
  for (let i = 0; i < 5; i++) clouds.push({
    x: rand(W), y: rand(H * 0.15, H * 0.8), s: rand(0.8, 2.2), v: rand(4, 12), a: rand(0.25, 0.6),
  });
  io.x = W * 0.5; io.y = H * 0.6; io.vx = 0; io.vy = 0; io.trail = [];
  io.reloc = { phase: 'idle', timer: 0, cd: 0, rx: 0, ry: 0 };
  io.tether = null; io.oc = false;
  syncSpirits();
  pointer.x = W * 0.5; pointer.y = H * 0.55;
  S.t = 0; S.combo = 0; S.hurtT = 0; S.shake = 0; S.glitch = 0; S.stormFired = false;
  moteTimer = 0.5; shipTimer = attract ? 2 : 5; nmTimer = attract ? 1e9 : 3.5; boltTimer = 8;
  if (attract) for (let i = 0; i < 6; i++) spawnMote(true);
}

// ---------- спавны ----------
function spawnMote(anywhere) {
  motes.push({
    x: rand(W * 0.08, W * 0.92),
    y: anywhere ? rand(H * 0.12, H * 0.85) : rand(H * 0.1, H * 0.8),
    vx: rand(-12, 12), vy: rand(-8, 8),
    r: rand(5, 8), seed: rand(TAU), life: 26, born: 0,
  });
}
function spawnShip() {
  const near = Math.random() < 0.6;
  const dir = Math.random() < 0.5 ? 1 : -1;
  const scl = near ? rand(0.85, 1.15) : rand(0.4, 0.6);
  const speed = (near ? rand(38, 66) : rand(16, 30)) * (0.7 + S.energy * 0.8);
  ships.push({
    x: dir > 0 ? -180 * scl : W + 180 * scl,
    y: rand(H * 0.12, H * 0.55),
    vx: speed * dir, scl, near, dir, bob: rand(TAU),
  });
}
function spawnNightmare() {
  const side = (Math.random() * 4) | 0;
  const m = 60;
  const p = [
    [rand(W), -m], [rand(W), H + m], [-m, rand(H)], [W + m, rand(H)],
  ][side];
  nightmares.push({
    x: p[0], y: p[1], vx: 0, vy: 0,
    r: rand(14, 22), seed: rand(TAU),
    sp: (40 + Math.min(RUN.night, 10) * 9) * (isStormNight() ? 1.3 : 1),
  });
}
function spawnBolt() {
  bolts.push({ x: rand(W * 0.08, W * 0.92), t: 0, warn: 0.95, strike: 0.22, hitDone: false });
}
function spawnText(x, y, str, big) {
  texts.push({ x, y, str, a: 0, t: 0, big: !!big, vy: rand(-14, -8) });
  if (texts.length > 6) texts.shift();
}
function burst(x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), v = rand(30, sp || 260);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.4, 1.1), t: 0, col, r: rand(1, 3) });
  }
}

// ---------- новые звуки ----------
function sfxZap() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = A.noise;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1800;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  src.connect(hp); hp.connect(g); g.connect(A.master);
  src.start(t); src.stop(t + 0.25);
  const o = ctx.createOscillator(), og = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(900, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.14);
  og.gain.setValueAtTime(0.12, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  o.connect(og); og.connect(A.master); o.start(t); o.stop(t + 0.18);
}
function sfxKill() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(240, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.28);
  g.gain.setValueAtTime(0.3, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
  o.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.35);
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
  o.connect(lp2); lp2.connect(g); g.connect(A.master); o.start(t); o.stop(t + 0.32);
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
  o.connect(g); g.connect(A.master);
  const send = ctx.createGain(); send.gain.value = 1; g.connect(send); send.connect(A.verbSend);
  o.start(t); o.stop(t + 0.25);
}
function sfxChoice() {
  if (!A.started) return;
  const ctx = A.ctx, t = ctx.currentTime;
  for (const [i, m] of [[0, 69], [1, 73], [2, 76]].map((x, i2) => [i2, x[1]])) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = m2f(m + 12);
    const tt = t + i * 0.07;
    g.gain.setValueAtTime(0.001, tt);
    g.gain.exponentialRampToValueAtTime(0.14, tt + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, tt + 0.7);
    o.connect(g); g.connect(A.master);
    const send = ctx.createGain(); send.gain.value = 1.2; g.connect(send); send.connect(A.verbSend);
    o.start(tt); o.stop(tt + 0.75);
  }
}

// ---------- ввод ----------
let lastTap = 0;
window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; });
window.addEventListener('pointerdown', e => {
  pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true;
  if (S.mode !== 'play' || S.paused) return;
  if (e.target && e.target.id === 'ocBtn') return;
  const now = performance.now();
  if (e.pointerType === 'touch' && now - lastTap < 300) { tryRelocate(); lastTap = 0; return; }
  lastTap = now;
  toggleTether();
});
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  if (e.key === 'Escape' && S.mode === 'play') togglePause();
  if ((e.key === ' ' || e.code === 'Space') && S.mode === 'play' && !S.paused) { e.preventDefault(); tryRelocate(); }
  if (e.key === 'Shift') io.oc = true;
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
  if (e.key === 'Shift') io.oc = false;
});
const ocBtn = document.getElementById('ocBtn');
ocBtn.addEventListener('pointerdown', e => { e.stopPropagation(); io.oc = true; ocBtn.classList.add('held'); });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave'])
  ocBtn.addEventListener(ev, () => { io.oc = false; ocBtn.classList.remove('held'); });
if (matchMedia('(pointer: coarse)').matches) document.body.classList.add('touch');
document.addEventListener('visibilitychange', () => {
  if (document.hidden && S.mode === 'play' && !S.paused) togglePause();
});

function togglePause() {
  S.paused = !S.paused;
  document.getElementById('pauseScreen').classList.toggle('hidden', !S.paused);
  if (A.started) { S.paused ? A.ctx.suspend() : A.ctx.resume(); }
}

function toggleTether() {
  if (io.tether) { io.tether = null; return; }
  let best = null, bd = RUN.tetherR;
  for (const sh of ships) {
    if (!sh.near) continue;
    const d = Math.hypot(io.x - sh.x, io.y - sh.y);
    if (d < bd) { bd = d; best = sh; }
  }
  if (best) { io.tether = best; sfxWind(); spawnText(best.x, best.y - 70 * best.scl, 'нить натянулась'); }
}

function tryRelocate() {
  if (io.reloc.cd > 0 || io.reloc.phase !== 'idle') return;
  io.reloc.rx = io.x; io.reloc.ry = io.y;
  burst(io.x, io.y, IO_COL, 16, 220);
  io.x = pointer.x; io.y = pointer.y; io.vx = 0; io.vy = 0;
  io.trail = [];
  io.reloc.phase = 'out'; io.reloc.timer = 2.5; io.reloc.cd = RUN.relocCd;
  S.hurtT = Math.max(S.hurtT, 0.6);
  burst(io.x, io.y, IO_COL, 16, 220);
  sfxReloc(false);
}

function damageIo(dmg, srcX, srcY) {
  if (S.hurtT > 0) return;
  RUN.wake -= dmg * RUN.dmgMul;
  S.hurtT = 1.1; S.shake = Math.max(S.shake, 0.7); S.glitch = Math.max(S.glitch, 0.6);
  S.combo = 0;
  sfxHurt();
  burst(io.x, io.y, [1, 0.4, 0.55], 22, 320);
  if (srcX !== undefined) {
    const dx = io.x - srcX, dy = io.y - srcY, d = Math.hypot(dx, dy) || 1;
    io.vx += dx / d * 340; io.vy += dy / d * 340;
  }
  if (RUN.wake <= 0) {
    if (RUN.secondWind) {
      RUN.secondWind = false;
      RUN.wake = 40;
      spawnText(io.x, io.y - 60, 'второе дыхание', true);
      burst(io.x, io.y, [1, 0.86, 0.5], 40, 420);
      sfxChoice();
    } else {
      die();
    }
  }
  updateHud();
}

// ---------- апдейт ----------
function update(dt) {
  const playing = S.mode === 'play';
  if (playing) {
    S.t = Math.min(1, S.t + dt / NIGHT_LEN);
    if (!S.stormFired && S.t >= 0.714) { S.stormFired = true; sfxRiser(); S.glitch = Math.max(S.glitch, 0.5); }
    if (S.t >= 1) { nightSurvived(); return; }
  }
  S.pal = palette(S.t);
  S.energy = clamp(energyAt(S.t) + Math.min(0.15, RUN.night * 0.015) + (isStormNight() && playing ? 0.1 : 0), 0, 1);
  A.energy = playing ? S.energy : 0.12;

  const ksp = 620 * dt;
  if (keys['ArrowLeft'] || keys['a'] || keys['ф']) pointer.x -= ksp;
  if (keys['ArrowRight'] || keys['d'] || keys['в']) pointer.x += ksp;
  if (keys['ArrowUp'] || keys['w'] || keys['ц']) pointer.y -= ksp;
  if (keys['ArrowDown'] || keys['s'] || keys['ы']) pointer.y += ksp;
  pointer.x = clamp(pointer.x, 20, W - 20); pointer.y = clamp(pointer.y, 20, H - 30);

  // --- Ио ---
  if (playing) {
    // релокейт: возврат
    if (io.reloc.phase === 'out') {
      io.reloc.timer -= dt;
      if (io.reloc.timer <= 0) {
        burst(io.x, io.y, IO_COL, 14, 200);
        io.x = io.reloc.rx; io.y = io.reloc.ry;
        io.vx = 0; io.vy = 0; io.trail = [];
        io.reloc.phase = 'idle';
        S.hurtT = Math.max(S.hurtT, 0.6);
        burst(io.x, io.y, IO_COL, 14, 200);
        sfxReloc(true);
      }
    }
    io.reloc.cd = Math.max(0, io.reloc.cd - dt);

    // тезер тянет за кораблём, иначе — к курсору
    let tx = pointer.x, ty = pointer.y, k = 7.5 * RUN.speed;
    if (io.tether) {
      const sh = io.tether;
      if (!ships.includes(sh)) io.tether = null;
      else {
        tx = sh.x - sh.dir * 60 * sh.scl; ty = sh.y - 46 * sh.scl; k = 14;
        if (Math.hypot(io.x - tx, io.y - ty) > RUN.tetherR * 2.4) io.tether = null;
      }
    }
    io.vx += ((tx - io.x) * k - io.vx * 3.4) * dt;
    io.vy += ((ty - io.y) * k - io.vy * 3.4) * dt;
    io.x += io.vx * dt; io.y += io.vy * dt;
    io.x = clamp(io.x, 30, W - 30); io.y = clamp(io.y, 40, H - 50);
    io.trail.unshift({ x: io.x, y: io.y });
    if (io.trail.length > 22) io.trail.pop();

    // оверчардж жжёт бодрость
    if (io.oc) {
      RUN.wake -= 3.5 * dt;
      if (RUN.wake <= 0) { RUN.wake = 1; io.oc = false; ocBtn.classList.remove('held'); }
    }

    // спириты крутятся
    const spinMul = io.oc ? 2.2 : 1;
    for (const sp of io.spirits) {
      sp.ang += dt * 1.7 * spinMul;
      sp.cd = Math.max(0, sp.cd - dt);
    }
  }

  // --- таймеры мира ---
  moteTimer -= dt;
  const moteRate = playing ? lerp(1.7, 0.6, S.energy) : 2.6;
  if (moteTimer <= 0 && motes.length < (playing ? 8 + S.energy * 22 : 8)) { spawnMote(!playing); moteTimer = moteRate; }
  shipTimer -= dt;
  if (shipTimer <= 0 && ships.length < 3) { spawnShip(); shipTimer = lerp(17, 8, S.energy) * rand(0.8, 1.3); }
  shotTimer -= dt;
  if (shotTimer <= 0) {
    shotTimer = lerp(9, 2.2, S.energy) * rand(0.6, 1.5);
    shots.push({ x: rand(W * 0.2, W), y: rand(H * 0.05, H * 0.35), vx: -rand(500, 900), vy: rand(120, 260), t: 0, life: rand(0.5, 0.9) });
  }
  if (playing) {
    nmTimer -= dt;
    const nmCap = Math.min(2 + RUN.night, 9) + (isStormNight() ? 2 : 0);
    if (nmTimer <= 0 && nightmares.length < nmCap) {
      spawnNightmare();
      nmTimer = lerp(4.5, 1.6, Math.min(1, RUN.night / 8));
    }
    if (RUN.night >= 2 || isStormNight()) {
      boltTimer -= dt;
      if (boltTimer <= 0) {
        spawnBolt();
        boltTimer = lerp(9, 3.2, Math.min(1, RUN.night / 8)) * (S.t > 0.714 ? 0.55 : 1) * rand(0.8, 1.3);
      }
    }
  }

  // --- мысли ---
  for (let i = motes.length - 1; i >= 0; i--) {
    const m = motes[i];
    m.born += dt;
    m.x += m.vx * dt; m.y += m.vy * dt;
    if (m.x < 20 || m.x > W - 20) m.vx *= -1;
    if (m.y < 20 || m.y > H - 30) m.vy *= -1;
    if (playing && io.tether) {
      const dx = io.x - m.x, dy = io.y - m.y, d = Math.hypot(dx, dy);
      if (d < 300 && d > 1) { m.x += dx / d * 200 * dt; m.y += dy / d * 200 * dt; }
    }
    if (m.born > m.life) { motes.splice(i, 1); continue; }
    if (playing && Math.hypot(io.x - m.x, io.y - m.y) < RUN.pickupR) {
      motes.splice(i, 1);
      collectMote(m);
    }
  }

  // --- корабли ---
  for (let i = ships.length - 1; i >= 0; i--) {
    const sh = ships[i];
    sh.x += sh.vx * dt; sh.bob += dt * 0.9;
    if ((sh.dir > 0 && sh.x > W + 200 * sh.scl) || (sh.dir < 0 && sh.x < -200 * sh.scl)) {
      if (io.tether === sh) io.tether = null;
      ships.splice(i, 1); continue;
    }
    if (Math.random() < 0.35) parts.push({
      x: sh.x - sh.dir * 90 * sh.scl + rand(-10, 10), y: sh.y + rand(-6, 18) * sh.scl,
      vx: rand(-10, 10), vy: rand(4, 22), life: rand(0.6, 1.4), t: 0, col: S.pal.tint, r: rand(0.6, 1.8),
    });
    if (playing && sh.near && io.tether !== sh) {
      const dx = io.x - sh.x, dy = io.y - (sh.y + Math.sin(sh.bob) * 6);
      if (Math.hypot(dx / 1.6, dy) < 68 * sh.scl) damageIo(12, sh.x, sh.y);
    }
  }

  // --- кошмары ---
  for (let i = nightmares.length - 1; i >= 0; i--) {
    const nm = nightmares[i];
    if (playing) {
      const dx = io.x - nm.x, dy = io.y - nm.y, d = Math.hypot(dx, dy) || 1;
      const wob = Math.sin(S.time * 1.3 + nm.seed) * 40;
      nm.vx += ((dx / d * nm.sp + Math.cos(nm.seed) * wob * 0.02) - nm.vx) * dt * 1.5;
      nm.vy += ((dy / d * nm.sp + Math.sin(nm.seed) * wob * 0.02) - nm.vy) * dt * 1.5;
    }
    nm.x += nm.vx * dt; nm.y += nm.vy * dt;
    let dead = false;
    // спириты рассеивают кошмары
    if (playing) {
      const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
      for (const sp of io.spirits) {
        if (sp.cd > 0) continue;
        const sx = io.x + Math.cos(sp.ang) * orbR;
        const sy = io.y + Math.sin(sp.ang) * orbR * 0.82;
        if (Math.hypot(sx - nm.x, sy - nm.y) < 12 + nm.r) {
          sp.cd = 4; dead = true;
          RUN.kills++;
          burst(nm.x, nm.y, [0.72, 0.4, 0.9], 20, 260);
          sfxKill();
          break;
        }
      }
      if (!dead && Math.hypot(io.x - nm.x, io.y - nm.y) < 16 + nm.r) {
        damageIo(15, nm.x, nm.y);
        dead = true;
        burst(nm.x, nm.y, [0.72, 0.4, 0.9], 16, 220);
      }
    }
    if (dead) nightmares.splice(i, 1);
  }

  // --- молнии ---
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.t += dt;
    if (b.t > b.warn && !b.hitDone) {
      b.hitDone = true;
      sfxZap();
      S.shake = Math.max(S.shake, 0.4); S.glitch = Math.max(S.glitch, 0.35);
      if (S.mode === 'play' && Math.abs(io.x - b.x) < 30) damageIo(20, b.x, io.y + 50);
    }
    if (b.t > b.warn + b.strike) bolts.splice(i, 1);
  }

  // --- частицы, тексты, звёзды, облака ---
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.98; p.vy *= 0.98;
    if (p.t > p.life) parts.splice(i, 1);
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
    if (c.x > W + 200) { c.x = -300; c.y = rand(H * 0.15, H * 0.8); }
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

function collectMote(m) {
  RUN.thoughts++;
  RUN.wake = Math.min(RUN.wakeMax, RUN.wake + 2);
  S.combo++; S.comboT = 3;
  if (S.combo > RUN.comboBest) RUN.comboBest = S.combo;
  sfxCollect(S.combo - 1);
  burst(m.x, m.y, S.pal.mote, 12, 200);
  const tier = phraseTier(S.t);
  if (RUN.thoughts === 1 || Math.random() < 0.4) {
    spawnText(m.x, clamp(m.y - 40, 60, H - 80), pick(PHRASES[tier]), tier >= 3);
  }
  updateHud();
}

// ---------- отрисовка ----------
function draw() {
  sc.setTransform(DPR, 0, 0, DPR, 0, 0);
  sc.clearRect(0, 0, W, H);
  const pal = S.pal, tm = S.time;

  for (const c of clouds) {
    sc.globalAlpha = 0.35 * c.a;
    sc.drawImage(cloudSpr, c.x - 150 * c.s, c.y - 70 * c.s, 300 * c.s, 140 * c.s);
  }
  sc.globalAlpha = 1;

  for (const s2 of shots) {
    const a = Math.sin(Math.PI * clamp(s2.t / s2.life, 0, 1));
    const gr = sc.createLinearGradient(s2.x, s2.y, s2.x - s2.vx * 0.12, s2.y - s2.vy * 0.12);
    gr.addColorStop(0, css3([1, 1, 1], 0.9 * a));
    gr.addColorStop(1, css3(pal.tint, 0));
    sc.strokeStyle = gr; sc.lineWidth = 1.6; sc.lineCap = 'round';
    sc.beginPath(); sc.moveTo(s2.x, s2.y); sc.lineTo(s2.x - s2.vx * 0.12, s2.y - s2.vy * 0.12); sc.stroke();
  }

  const sorted = [...ships].sort((a, b) => a.scl - b.scl);
  for (const sh of sorted) drawShip(sh, pal, tm);

  for (const nm of nightmares) drawNightmare(nm, tm);

  for (const m of motes) {
    const pulse = 0.8 + 0.25 * Math.sin(tm * 2.4 + m.seed);
    const fade = Math.min(1, m.born * 2, (m.life - m.born));
    sc.globalAlpha = 0.85 * fade;
    sc.globalCompositeOperation = 'lighter';
    tintGlow(m.x, m.y, m.r * 3.2 * pulse, pal.mote, 0.42 * fade);
    sc.fillStyle = css3([1, 1, 1], 0.85 * fade);
    sc.beginPath(); sc.arc(m.x, m.y, m.r * 0.32 * pulse + 0.8, 0, TAU); sc.fill();
    sc.globalCompositeOperation = 'source-over';
    sc.globalAlpha = 1;
  }

  sc.globalCompositeOperation = 'lighter';
  for (const p of parts) {
    const a = 1 - p.t / p.life;
    sc.fillStyle = css3(p.col, a * 0.8);
    sc.beginPath(); sc.arc(p.x, p.y, p.r, 0, TAU); sc.fill();
  }
  sc.globalCompositeOperation = 'source-over';

  if (S.mode === 'play') {
    drawTether(pal, tm);
    drawIo(pal, tm);
  }

  for (const b of bolts) drawBolt(b, pal, tm);

  for (const tx of texts) {
    sc.globalAlpha = tx.a;
    sc.font = (tx.big ? '400 ' : '300 ') + 'italic ' + (tx.big ? 30 : 24) + 'px Cormorant, Georgia, serif';
    sc.textAlign = 'center';
    sc.shadowColor = css3(pal.tint, 0.8); sc.shadowBlur = 18;
    sc.fillStyle = tx.big ? css3(pal.mote, 1) : 'rgba(235,232,225,.95)';
    sc.fillText(tx.str, clamp(tx.x, 150, W - 150), tx.y);
    sc.shadowBlur = 0;
  }
  sc.globalAlpha = 1;

  if (S.mode === 'play' && pointer.active && !io.tether) {
    sc.fillStyle = 'rgba(235,232,225,.35)';
    sc.beginPath(); sc.arc(pointer.x, pointer.y, 2, 0, TAU); sc.fill();
  }
}

function tintGlow(x, y, R, col, a) {
  const rg = sc.createRadialGradient(x, y, 0, x, y, R);
  rg.addColorStop(0, css3(col, a));
  rg.addColorStop(0.4, css3(col, a * 0.35));
  rg.addColorStop(1, css3(col, 0));
  sc.fillStyle = rg;
  sc.beginPath(); sc.arc(x, y, R, 0, TAU); sc.fill();
}

function drawShip(sh, pal, tm) {
  const y = sh.y + Math.sin(sh.bob) * 6 * sh.scl;
  const s = sh.scl, d = sh.dir;
  sc.save();
  sc.translate(sh.x, y);
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
  const lx = sh.x + d * s * -92, ly = y - 16 * s;
  sc.globalCompositeOperation = 'lighter';
  tintGlow(lx, ly, 11 * s, pal.tint, 0.3 * (0.8 + 0.2 * Math.sin(tm * 3 + sh.bob)));
  sc.fillStyle = 'rgba(255,240,210,.9)';
  sc.beginPath(); sc.arc(lx, ly, 1.6 * s, 0, TAU); sc.fill();
  sc.globalCompositeOperation = 'source-over';
}

function drawNightmare(nm, tm) {
  sc.save();
  sc.translate(nm.x, nm.y);
  sc.beginPath();
  const N = 9;
  for (let i = 0; i <= N; i++) {
    const a = i / N * TAU;
    const rr = nm.r * (1 + 0.32 * Math.sin(tm * 2.6 + nm.seed + i * 2.1));
    const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
    i === 0 ? sc.moveTo(px, py) : sc.lineTo(px, py);
  }
  sc.closePath();
  sc.fillStyle = 'rgba(6,4,12,.94)';
  sc.fill();
  sc.strokeStyle = css3([0.72, 0.4, 0.9], 0.55 + 0.2 * Math.sin(tm * 3 + nm.seed));
  sc.lineWidth = 1.3;
  sc.stroke();
  sc.restore();
  if (Math.random() < 0.12) parts.push({
    x: nm.x + rand(-nm.r, nm.r), y: nm.y + rand(-nm.r, nm.r),
    vx: rand(-8, 8), vy: rand(-16, -4), life: rand(0.3, 0.8), t: 0, col: [0.5, 0.28, 0.66], r: rand(0.6, 1.6),
  });
}

function drawBolt(b, pal, tm) {
  if (b.t < b.warn) { // телеграф
    const blink = Math.sin(tm * 22) > 0 ? 0.4 : 0.12;
    const urgency = b.t / b.warn;
    sc.strokeStyle = css3([1, 1, 1], blink * (0.4 + urgency * 0.6));
    sc.lineWidth = 1;
    sc.setLineDash([6, 10]);
    sc.beginPath(); sc.moveTo(b.x, 0); sc.lineTo(b.x, H); sc.stroke();
    sc.setLineDash([]);
  } else { // разряд
    const k = 1 - (b.t - b.warn) / b.strike;
    sc.globalCompositeOperation = 'lighter';
    const gr = sc.createLinearGradient(b.x - 30, 0, b.x + 30, 0);
    gr.addColorStop(0, css3(pal.tint, 0));
    gr.addColorStop(0.5, css3([1, 1, 1], 0.75 * k));
    gr.addColorStop(1, css3(pal.tint, 0));
    sc.fillStyle = gr;
    sc.fillRect(b.x - 30, 0, 60, H);
    // ломаная сердцевина
    sc.strokeStyle = css3([1, 1, 1], 0.95 * k);
    sc.lineWidth = 2.2;
    sc.beginPath();
    let yy = 0; sc.moveTo(b.x, 0);
    while (yy < H) { yy += rand(30, 70); sc.lineTo(b.x + rand(-9, 9), Math.min(yy, H)); }
    sc.stroke();
    sc.globalCompositeOperation = 'source-over';
  }
}

function drawTether(pal, tm) {
  const sh = io.tether;
  if (!sh || !ships.includes(sh)) return;
  const ax = io.x, ay = io.y;
  const bx = sh.x - sh.dir * 60 * sh.scl, by = sh.y - 30 * sh.scl;
  const mx = (ax + bx) / 2, my = (ay + by) / 2 + 24 + Math.sin(tm * 3) * 6;
  sc.globalCompositeOperation = 'lighter';
  sc.strokeStyle = css3(IO_COL, 0.55 + 0.15 * Math.sin(tm * 6));
  sc.lineWidth = 1.6;
  sc.beginPath();
  sc.moveTo(ax, ay);
  sc.quadraticCurveTo(mx, my, bx, by);
  sc.stroke();
  // искры вдоль нити
  for (let i = 0; i < 2; i++) {
    const q = ((tm * 0.7 + i * 0.5) % 1);
    const qx = (1 - q) * (1 - q) * ax + 2 * (1 - q) * q * mx + q * q * bx;
    const qy = (1 - q) * (1 - q) * ay + 2 * (1 - q) * q * my + q * q * by;
    sc.fillStyle = css3(IO_COL, 0.8);
    sc.beginPath(); sc.arc(qx, qy, 1.6, 0, TAU); sc.fill();
  }
  sc.globalCompositeOperation = 'source-over';
}

function drawIo(pal, tm) {
  const blink = S.hurtT > 0.5 && Math.sin(tm * 30) > 0;
  // шлейф света
  if (io.trail.length > 3) {
    sc.globalCompositeOperation = 'lighter';
    for (let i = 1; i < io.trail.length; i++) {
      const a = 1 - i / io.trail.length;
      sc.strokeStyle = css3(IO_COL, a * 0.3);
      sc.lineWidth = a * 7 + 1;
      sc.lineCap = 'round';
      sc.beginPath();
      sc.moveTo(io.trail[i - 1].x, io.trail[i - 1].y);
      sc.lineTo(io.trail[i].x, io.trail[i].y);
      sc.stroke();
    }
    sc.globalCompositeOperation = 'source-over';
  }
  if (blink) return;
  const ocMul = io.oc ? 1.35 : 1;
  sc.globalCompositeOperation = 'lighter';
  // ядро
  tintGlow(io.x, io.y, 36 * ocMul, IO_COL, 0.5);
  sc.fillStyle = 'rgba(255,255,255,.97)';
  sc.beginPath(); sc.arc(io.x, io.y, 6 * ocMul, 0, TAU); sc.fill();
  // кольцо
  sc.strokeStyle = css3(IO_COL, 0.85);
  sc.lineWidth = 1.6;
  sc.beginPath(); sc.arc(io.x, io.y, 11.5 * ocMul + Math.sin(tm * 5) * 1.2, 0, TAU); sc.stroke();
  // усики-протуберанцы
  for (let i = 0; i < 5; i++) {
    const a = tm * 1.1 + i * TAU / 5;
    const rr = 16 + Math.sin(tm * 3.3 + i * 1.7) * 4;
    sc.fillStyle = css3(IO_COL, 0.5);
    sc.beginPath();
    sc.arc(io.x + Math.cos(a) * rr, io.y + Math.sin(a) * rr * 0.9, 1.3, 0, TAU);
    sc.fill();
  }
  // спириты
  const orbR = RUN.orbitR * (io.oc ? 1.6 : 1);
  for (const sp of io.spirits) {
    const sx = io.x + Math.cos(sp.ang) * orbR;
    const sy = io.y + Math.sin(sp.ang) * orbR * 0.82;
    if (sp.cd > 0) {
      sc.fillStyle = css3(IO_COL, 0.18);
      sc.beginPath(); sc.arc(sx, sy, 1.6, 0, TAU); sc.fill();
    } else {
      tintGlow(sx, sy, 10, IO_COL, 0.55);
      sc.fillStyle = 'rgba(255,255,255,.95)';
      sc.beginPath(); sc.arc(sx, sy, 2.4, 0, TAU); sc.fill();
    }
  }
  sc.globalCompositeOperation = 'source-over';
  // кулдаун релокейта — дуга вокруг ядра
  if (io.reloc.cd > 0) {
    const frac = 1 - io.reloc.cd / RUN.relocCd;
    sc.strokeStyle = 'rgba(235,232,225,.4)';
    sc.lineWidth = 1;
    sc.beginPath();
    sc.arc(io.x, io.y, 18, -Math.PI / 2, -Math.PI / 2 + frac * TAU);
    sc.stroke();
  }
  // маркер точки возврата
  if (io.reloc.phase === 'out') {
    sc.strokeStyle = css3(IO_COL, 0.5 + 0.2 * Math.sin(tm * 8));
    sc.lineWidth = 1.2;
    sc.setLineDash([4, 6]);
    sc.beginPath(); sc.arc(io.reloc.rx, io.reloc.ry, 12, 0, TAU); sc.stroke();
    sc.setLineDash([]);
  }
}

// ---------- WebGL кадр ----------
function drawGL() {
  const pal = S.pal, t = S.t;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, sceneTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scene);

  const dawn = sstep((t - 0.87) / 0.11);
  let mx = 0.82 - t * 0.55, my = 0.66 + 0.14 * Math.sin(t * 2.6 + 0.5), mr = 0.042, mvis = 1;
  if (dawn > 0) {
    mx = lerp(mx, 0.5, dawn); my = lerp(my, 0.22, dawn);
    mr = lerp(mr, 0.075, dawn); mvis = lerp(1, 1.15, dawn);
  }
  gl.uniform2f(U.uRes, glCanvas.width, glCanvas.height);
  gl.uniform1f(U.uTime, S.time);
  gl.uniform3f(U.uSkyA, ...pal.skyA);
  gl.uniform3f(U.uSkyB, ...pal.skyB);
  gl.uniform3f(U.uAur, ...pal.aur);
  gl.uniform3f(U.uTint, ...pal.tint);
  gl.uniform1f(U.uAurI, pal.aurI);
  gl.uniform1f(U.uStars, pal.stars);
  gl.uniform1f(U.uAberr, 0.0015 + S.energy * S.energy * 0.008 + S.glitch * 0.01);
  gl.uniform1f(U.uGlitch, S.glitch * 0.6);
  gl.uniform1f(U.uShake, S.shake);
  gl.uniform1f(U.uEnergy, S.energy);
  gl.uniform1f(U.uDawn, dawn);
  gl.uniform2f(U.uMoonPos, mx, my);
  gl.uniform1f(U.uMoonR, mr);
  gl.uniform1f(U.uMoon, mvis);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// ---------- HUD ----------
const elClock = document.getElementById('clock');
const elNight = document.getElementById('nightname');
const elScore = document.getElementById('score');
const elCombo = document.getElementById('combo');
const elMeter = document.getElementById('meterFill');
let hudTimer = 0;

function updateHud() {
  elScore.textContent = 'мыслей · ' + RUN.thoughts;
  if (S.combo >= 2) {
    elCombo.textContent = 'серия ×' + S.combo;
    elCombo.classList.add('hot');
  } else elCombo.classList.remove('hot');
  const frac = clamp(RUN.wake / RUN.wakeMax, 0, 1);
  elMeter.style.width = (frac * 100).toFixed(1) + '%';
  const col = frac > 0.5 ? '#8fd0ff' : frac > 0.25 ? '#e8a54a' : '#d8695a';
  elMeter.style.background = col;
  elMeter.style.boxShadow = '0 0 12px ' + col;
}
function updateClock() {
  const mins = S.t * 420;
  const h = (23 + Math.floor(mins / 60)) % 24;
  const m = Math.floor(mins % 60);
  elClock.textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  const storm = isStormNight();
  elNight.textContent = (storm ? 'шторм · ночь ' : 'ночь ') + RUN.night;
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
  const b = loadBest();
  const el = document.getElementById('bestLine');
  if (b) {
    el.textContent = 'лучшая бессонница · ' + b.nights + ' ноч' + plural(b.nights) + ' · ' + b.thoughts + ' мыслей';
    el.classList.remove('hidden');
  }
}
function plural(n) {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return 'ь';
  if (m >= 2 && m <= 4 && (h < 12 || h > 14)) return 'и';
  return 'ей';
}

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
  resetNight(false);
  S.mode = 'play';
  titleScreen.classList.add('hidden');
  deathScreen.classList.add('hidden');
  restScreen.classList.add('hidden');
  hud.classList.add('on');
  document.body.classList.add('playing');
  updateHud(); updateClock();
}

function nightSurvived() {
  S.mode = 'rest';
  io.oc = false; ocBtn.classList.remove('held');
  document.body.classList.remove('playing');
  document.getElementById('restHead').textContent = 'ночь ' + RUN.night + ' пережита · бодрость ' + Math.ceil(RUN.wake) + '/' + RUN.wakeMax;
  const box = document.getElementById('dreams');
  box.innerHTML = '';
  const pool = UPGRADES.filter(u => !(u.rare && (RUN.secondWind || RUN.taken.includes('wind2'))));
  const opts = [];
  while (opts.length < 3 && pool.length) {
    const u = pool.splice((Math.random() * pool.length) | 0, 1)[0];
    if (u.rare && Math.random() < 0.5 && pool.length >= 3 - opts.length) continue;
    opts.push(u);
  }
  for (const u of opts) {
    const d = document.createElement('button');
    d.className = 'dream' + (u.rare ? ' rare' : '');
    d.innerHTML = '<span class="d-name">' + u.name + '</span><span class="d-desc">' + u.desc + '</span>';
    d.addEventListener('click', () => {
      u.apply(RUN);
      RUN.taken.push(u.id);
      syncSpirits();
      sfxChoice();
      RUN.night++;
      resetNight(false);
      S.mode = 'play';
      restScreen.classList.add('hidden');
      document.body.classList.add('playing');
      updateHud(); updateClock();
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
  document.getElementById('deathNight').textContent = 'бессонница длилась ' + RUN.night + ' ноч' + plural(RUN.night);
  document.getElementById('stNights').textContent = RUN.night;
  document.getElementById('stMoths').textContent = RUN.thoughts;
  document.getElementById('stKills').textContent = RUN.kills;
  document.getElementById('deathQuote').textContent = pick(DEATH_QUOTES);
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

// ---------- цикл ----------
let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.1) dt = 0.1;
  if (S.paused) return;
  S.time += dt;
  update(dt);
  draw();
  drawGL();
  hudTimer -= dt;
  if (hudTimer <= 0 && S.mode === 'play') { hudTimer = 0.25; updateClock(); updateHud(); }
}

if (document.fonts && document.fonts.load) {
  document.fonts.load('italic 300 24px Cormorant');
  document.fonts.load('italic 400 30px Cormorant');
}
showBestLine();
resetNight(true);
requestAnimationFrame(frame);

// отладка: ?auto=1&t=0.5&night=4
{
  const q = new URLSearchParams(location.search);
  if (q.get('auto')) {
    setTimeout(() => {
      startRun();
      const nn = parseInt(q.get('night'));
      if (!isNaN(nn)) { RUN.night = nn; for (let i = 0; i < Math.min(nn, 5); i++) spawnNightmare(); }
      const tt = parseFloat(q.get('t'));
      if (!isNaN(tt)) S.t = clamp(tt, 0, 0.999);
      for (let i = 0; i < 10; i++) spawnMote(true);
      spawnShip(); spawnShip();
      ships.forEach(sh => { sh.x = rand(W * 0.2, W * 0.8); });
      if (q.get('bolt')) { spawnBolt(); bolts[0].t = parseFloat(q.get('bolt')) || 0; }
    }, 800);
  }
}

})();
