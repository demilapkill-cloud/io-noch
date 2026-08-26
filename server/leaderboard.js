#!/usr/bin/env node
// ============================================================
// ЛЕТОПИСЬ БЕССОННИЦ — сервер мировой таблицы «бесконечной ночи»
// ============================================================
// Один файл, ни одной зависимости: запускается всюду, где есть node.
// Хранит всё в JSON подле себя (путь правится через BOARD_DB).
//
//   node server/leaderboard.js            # слушает :8791
//   PORT=9000 node server/leaderboard.js
//
// Клиенту довольно указать адрес: в игре — настройки, поле «летопись»,
// или ключ io-noch-board в localStorage, или ?board=<адрес> в ссылке.
//
// Уговор с игрою (тот же, что у воркера Cloudflare):
//   POST /api/register {name, pass}  → {token, name}
//   POST /api/login    {name, pass}  → {token, name}
//   POST /api/score    {token, nights, thoughts, time, kills, level} → {ok, rank, best}
//   GET  /api/top?limit=50           → {rows:[{name, nights, thoughts, time, at}]}
//
// Имя бережётся: пропуск хранится не сам по себе, а солёным хешем.
// Записывается лишь лучший забег имени — летопись помнит вершины, не всё подряд.

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '8791', 10);
const DB_PATH = process.env.BOARD_DB || path.join(__dirname, 'board.json');
const MAX_BODY = 4096;            // больше честной записи не бывает
const NAME_RE = /^[\p{L}\p{N} _.\-]{2,18}$/u;

let DB = { users: {}, tokens: {}, scores: {} };
try {
  if (fs.existsSync(DB_PATH)) DB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
} catch (e) { console.error('летопись повреждена, начинаем с чистой:', e.message); }
DB.users = DB.users || {}; DB.tokens = DB.tokens || {}; DB.scores = DB.scores || {};

let saveT = null;
function save() { // пишем не чаще раза в секунду: записей много, диск один
  if (saveT) return;
  saveT = setTimeout(() => {
    saveT = null;
    fs.writeFile(DB_PATH, JSON.stringify(DB), err => { if (err) console.error('не записалось:', err.message); });
  }, 1000);
}

const hash = (pass, salt) => crypto.scryptSync(pass, salt, 32).toString('hex');
const key = name => name.toLowerCase();

function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let n = 0, chunks = '';
    req.on('data', c => {
      n += c.length;
      if (n > MAX_BODY) { reject(new Error('слишком длинно')); req.destroy(); return; }
      chunks += c;
    });
    req.on('end', () => { try { resolve(JSON.parse(chunks || '{}')); } catch (_) { reject(new Error('не разобрать')); } });
    req.on('error', reject);
  });
}

// Забег лучше прежнего? Сравниваем по ночам, а при равенстве — по мыслям и времени.
function better(a, b) {
  if (!b) return true;
  if (a.nights !== b.nights) return a.nights > b.nights;
  if (a.thoughts !== b.thoughts) return a.thoughts > b.thoughts;
  return a.time > b.time;
}
const num = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};

function topRows(limit) {
  return Object.values(DB.scores)
    .sort((a, b) => (b.nights - a.nights) || (b.thoughts - a.thoughts) || (b.time - a.time))
    .slice(0, limit)
    .map(s => ({ name: s.name, nights: s.nights, thoughts: s.thoughts, time: s.time, at: s.at }));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') return send(res, 204, {});

  if (req.method === 'GET' && url.pathname === '/api/top') {
    const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
    return send(res, 200, { rows: topRows(limit) });
  }

  if (req.method !== 'POST') return send(res, 404, { error: 'нет такой дороги' });

  let body;
  try { body = await readBody(req); } catch (e) { return send(res, 400, { error: e.message }); }

  if (url.pathname === '/api/register' || url.pathname === '/api/login') {
    const name = String(body.name || '').trim();
    const pass = String(body.pass || '');
    if (!NAME_RE.test(name)) return send(res, 400, { error: 'имя от двух до восемнадцати знаков' });
    if (pass.length < 4) return send(res, 400, { error: 'пропуск короче четырёх знаков' });
    const k = key(name);
    const reg = url.pathname === '/api/register';
    const user = DB.users[k];
    if (reg) {
      if (user) return send(res, 409, { error: 'имя занято' });
      const salt = crypto.randomBytes(16).toString('hex');
      DB.users[k] = { name, salt, hash: hash(pass, salt), at: Date.now() };
    } else {
      if (!user) return send(res, 404, { error: 'нет такого имени' });
      const ok = crypto.timingSafeEqual(Buffer.from(hash(pass, user.salt), 'hex'), Buffer.from(user.hash, 'hex'));
      if (!ok) return send(res, 403, { error: 'пропуск не тот' });
    }
    const token = crypto.randomBytes(24).toString('hex');
    DB.tokens[token] = k;
    save();
    return send(res, 200, { token, name: DB.users[k].name });
  }

  if (url.pathname === '/api/score') {
    const k = DB.tokens[String(body.token || '')];
    if (!k || !DB.users[k]) return send(res, 403, { error: 'войди прежде' });
    const run = {
      name: DB.users[k].name,
      nights: num(body.nights, 9999),
      thoughts: num(body.thoughts, 999999),
      time: num(body.time, 86400),
      kills: num(body.kills, 999999),
      level: num(body.level, 9999),
      at: Date.now(),
    };
    const prev = DB.scores[k];
    const isBest = better(run, prev);
    if (isBest) { DB.scores[k] = run; save(); }
    const rows = topRows(200);
    const rank = rows.findIndex(r => r.name === run.name) + 1;
    return send(res, 200, { ok: true, best: isBest, rank: rank || null, rows: rows.slice(0, 50) });
  }

  return send(res, 404, { error: 'нет такой дороги' });
});

server.listen(PORT, () => console.log('летопись слушает :' + PORT + ' · книга ' + DB_PATH));
