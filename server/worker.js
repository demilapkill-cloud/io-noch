// ============================================================
// ЛЕТОПИСЬ БЕССОННИЦ — воркер Cloudflare (тот же уговор, что у node-сервера)
// ============================================================
// Своей машины не надобно вовсе: воркер бесплатен, а хранилище — KV.
// Как поднять — сказано в server/README.md. Уговор с игрою:
//   POST /api/register {name, pass} → {token, name}
//   POST /api/login    {name, pass} → {token, name}
//   POST /api/score    {token, nights, thoughts, time, kills, level} → {ok, rank, rows}
//   GET  /api/top?limit=50          → {rows:[…]}
//
// Пропуск хранится солёным хешем (PBKDF2 — то, что даёт WebCrypto),
// а сама доска лежит одним ключом «board»: имён немного, читать её просто.

const NAME_RE = /^[\p{L}\p{N} _.\-]{2,18}$/u;
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
};
const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS },
  });

const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

async function hashPass(pass, saltHex) {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/../g).map(h => parseInt(h, 16)));
  const kd = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, kd, 256);
  return hex(bits);
}
const rnd = n => hex(crypto.getRandomValues(new Uint8Array(n)));
const key = name => name.toLowerCase();
const num = (v, max) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : 0;
};
// Забег лучше прежнего? По ночам, а при равенстве — по мыслям и времени.
function better(a, b) {
  if (!b) return true;
  if (a.nights !== b.nights) return a.nights > b.nights;
  if (a.thoughts !== b.thoughts) return a.thoughts > b.thoughts;
  return a.time > b.time;
}
const sortRows = rows =>
  rows.sort((a, b) => (b.nights - a.nights) || (b.thoughts - a.thoughts) || (b.time - a.time));

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    const KV = env.BOARD;
    if (!KV) return json({ error: 'хранилище BOARD не привязано' }, 500);

    if (req.method === 'GET' && url.pathname === '/api/top') {
      const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get('limit') || '50', 10) || 50));
      const board = (await KV.get('board', 'json')) || [];
      return json({ rows: sortRows(board).slice(0, limit) });
    }
    if (req.method !== 'POST') return json({ error: 'нет такой дороги' }, 404);

    let body;
    try { body = await req.json(); } catch (_) { return json({ error: 'не разобрать' }, 400); }

    if (url.pathname === '/api/register' || url.pathname === '/api/login') {
      const name = String(body.name || '').trim();
      const pass = String(body.pass || '');
      if (!NAME_RE.test(name)) return json({ error: 'имя от двух до восемнадцати знаков' }, 400);
      if (pass.length < 4) return json({ error: 'пропуск короче четырёх знаков' }, 400);
      const k = 'u:' + key(name);
      const user = await KV.get(k, 'json');
      if (url.pathname === '/api/register') {
        if (user) return json({ error: 'имя занято' }, 409);
        const salt = rnd(16);
        await KV.put(k, JSON.stringify({ name, salt, hash: await hashPass(pass, salt), at: Date.now() }));
      } else {
        if (!user) return json({ error: 'нет такого имени' }, 404);
        if ((await hashPass(pass, user.salt)) !== user.hash) return json({ error: 'пропуск не тот' }, 403);
      }
      const fresh = await KV.get(k, 'json');
      const token = rnd(24);
      await KV.put('t:' + token, key(name), { expirationTtl: 60 * 60 * 24 * 180 });
      return json({ token, name: fresh.name });
    }

    if (url.pathname === '/api/score') {
      const k = await KV.get('t:' + String(body.token || ''));
      const user = k && (await KV.get('u:' + k, 'json'));
      if (!user) return json({ error: 'войди прежде' }, 403);
      const run = {
        name: user.name,
        nights: num(body.nights, 9999),
        thoughts: num(body.thoughts, 999999),
        time: num(body.time, 86400),
        kills: num(body.kills, 999999),
        level: num(body.level, 9999),
        at: Date.now(),
      };
      const board = (await KV.get('board', 'json')) || [];
      const i = board.findIndex(r => key(r.name) === k);
      const isBest = better(run, i >= 0 ? board[i] : null);
      if (isBest) {
        if (i >= 0) board[i] = run; else board.push(run);
        sortRows(board);
        await KV.put('board', JSON.stringify(board.slice(0, 500)));
      }
      const rows = sortRows(board);
      const rank = rows.findIndex(r => key(r.name) === k) + 1;
      return json({ ok: true, best: isBest, rank: rank || null, rows: rows.slice(0, 50) });
    }

    return json({ error: 'нет такой дороги' }, 404);
  },
};
