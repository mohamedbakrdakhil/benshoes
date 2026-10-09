/* Benshoes — serveur de la boutique.
   Zéro dépendance npm : uniquement la bibliothèque standard de Node.
   Sert le site, reçoit les commandes, protège l'espace atelier. */
'use strict';
const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

const PORT = process.env.PORT || 3000;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '.data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(DATA_DIR, 'boutique.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const SESSION_DAYS = 14;

/* ---------- catalogue de référence : le serveur fait foi sur les prix ---------- */
const SIZES = [35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46];
const COLORS = ['noir', 'marron', 'tabac', 'taupe', 'beige', 'marine', 'gris', 'bordeaux'];
const SEED = {
  deux:  { price: 319, colors: ['noir','marron','tabac','beige'], stock: [3,8,12,15,16,14,10,7,4,2,1,0] },
  solo:  { price: 249, colors: ['noir','gris','marine'],          stock: [5,9,13,14,12,11,8,5,3,2,0,0] },
  noor:  { price: 279, colors: ['tabac','beige','noir'],          stock: [6,10,14,16,15,12,9,6,3,1,0,0] },
  atlas: { price: 389, colors: ['noir','taupe','marron'],         stock: [2,5,9,12,13,11,8,6,4,3,2,1] },
  oasis: { price: 349, colors: ['marine','beige','noir'],         stock: [4,7,10,13,14,12,9,5,3,1,1,0] },
  haut:  { price: 399, colors: ['noir','bordeaux','tabac'],       stock: [3,6,11,13,15,13,8,4,2,1,0,0] },
};
const SHIP_FREE = 400, SHIP_COST = 35;
const STATUSES = ['nouvelle','confirmee','expediee','livree','annulee'];

/* ---------- stockage : un fichier JSON, écritures sérialisées ---------- */
let db = { orders: [], catalog: null, seq: 0 };
let writing = Promise.resolve();

function defaultCatalog() {
  const prices = {}, stock = {};
  for (const [id, p] of Object.entries(SEED)) { prices[id] = p.price; stock[id] = p.stock.slice(); }
  return { prices, stock };
}
async function load() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = JSON.parse(await fsp.readFile(DB_FILE, 'utf8'));
    db.orders = Array.isArray(raw.orders) ? raw.orders : [];
    db.catalog = raw.catalog && raw.catalog.prices ? raw.catalog : defaultCatalog();
    db.seq = Number(raw.seq) || 0;
    console.log(`[benkashoes] base chargée : ${db.orders.length} commande(s)`);
  } catch {
    db.catalog = defaultCatalog();
    console.log('[benkashoes] nouvelle base créée');
  }
}
function save() {
  writing = writing.then(async () => {
    const tmp = DB_FILE + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(db), 'utf8');
    await fsp.rename(tmp, DB_FILE);
  }).catch(e => console.error('[benkashoes] échec écriture', e));
  return writing;
}

/* ---------- jetons de session ---------- */
function makeToken() {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const body = String(exp);
  const sig = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
function validToken(tok) {
  if (typeof tok !== 'string' || !tok.includes('.')) return false;
  const i = tok.lastIndexOf('.');
  const body = tok.slice(0, i), sig = tok.slice(i + 1);
  const want = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig), b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return Number(body) > Date.now();
}
function isAdmin(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') && validToken(h.slice(7));
}

/* ---------- limitation du débit ---------- */
const hits = new Map();
function tooMany(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k);
  return arr.length > max;
}
const ipOf = req => (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  || req.socket.remoteAddress || 'inconnu';

/* ---------- utilitaires ---------- */
const str = (v, max) => typeof v === 'string' ? v.trim().slice(0, max) : '';
function newRef() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, '0');
  db.seq = (db.seq + 1) % 10000;
  const A = 'ACDEFHJKLMNPRTUVWXY34789';
  let r = ''; for (let i = 0; i < 4; i++) r += A[crypto.randomInt(A.length)];
  return `BS-${y}-${r}`;
}
function json(res, code, body) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(s);
}
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let n = 0; const chunks = [];
    req.on('data', c => { n += c.length; if (n > limit) { reject(new Error('trop volumineux')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); } catch { reject(new Error('json invalide')); } });
    req.on('error', reject);
  });
}

/* ---------- validation d'une commande ---------- */
function buildOrder(input, source) {
  const rawItems = Array.isArray(input.items) ? input.items.slice(0, 20) : [];
  if (!rawItems.length) return { error: 'Aucun article dans la commande.' };
  const items = [];
  for (const it of rawItems) {
    const p = SEED[it && it.id];
    if (!p) return { error: 'Modèle inconnu.' };
    const colorKey = COLORS.includes(it.colorKey) && p.colors.includes(it.colorKey) ? it.colorKey : null;
    if (!colorKey) return { error: 'Couleur indisponible pour ce modèle.' };
    const size = Number(it.size);
    if (!SIZES.includes(size)) return { error: 'Pointure invalide.' };
    const q = Math.floor(Number(it.q));
    if (!(q >= 1 && q <= 10)) return { error: 'Quantité invalide.' };
    items.push({ id: it.id, name: str(it.name, 40) || it.id, color: str(it.color, 40), colorKey, size, q,
                 unit: Number(db.catalog.prices[it.id] ?? p.price) });
  }
  // stock
  const need = {};
  for (const it of items) { const k = it.id + ':' + it.size; need[k] = (need[k] || 0) + it.q; }
  for (const [k, q] of Object.entries(need)) {
    const [id, size] = k.split(':');
    const have = (db.catalog.stock[id] || SEED[id].stock)[SIZES.indexOf(Number(size))] ?? 0;
    if (have < q) return { error: `Stock insuffisant : ${id} en pointure ${size}.` };
  }
  const c = input.customer || {};
  const customer = { name: str(c.name, 80), phone: str(c.phone, 40), email: str(c.email, 120),
                     addr: str(c.addr, 200), zip: str(c.zip, 20), city: str(c.city, 80), country: str(c.country, 60) || 'Maroc' };
  if (!customer.name) return { error: 'Le nom du client est obligatoire.' };
  if (source === 'boutique') {
    for (const k of ['phone', 'addr', 'city']) if (!customer[k]) return { error: 'Coordonnées de livraison incomplètes.' };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(customer.email)) return { error: 'Adresse e-mail invalide.' };
  }
  const sub = items.reduce((a, i) => a + i.unit * i.q, 0);
  const ship = sub >= SHIP_FREE ? 0 : SHIP_COST;
  // décrément du stock
  for (const [k, q] of Object.entries(need)) {
    const [id, size] = k.split(':');
    const arr = (db.catalog.stock[id] || SEED[id].stock).slice();
    const ix = SIZES.indexOf(Number(size));
    arr[ix] = Math.max(0, (arr[ix] ?? 0) - q);
    db.catalog.stock[id] = arr;
  }
  return { order: { ref: newRef(), createdAt: new Date().toISOString(),
    status: source === 'atelier' ? 'confirmee' : 'nouvelle', source, items, customer,
    note: str(input.note, 500), sub, ship, total: sub + ship, currency: 'MAD', stockDeducted: true } };
}

/* ---------- fichiers statiques ---------- */
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8' };
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname).replace(/\\+/g, '/');
  if (rel.endsWith('/')) rel += 'index.html';
  const file = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403).end('Interdit'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      const idx = path.join(PUBLIC_DIR, 'index.html');
      return fs.createReadStream(idx).on('error', () => res.writeHead(404).end('Introuvable'))
        .once('open', () => res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-cache' })).pipe(res);
    }
    const ext = path.extname(file).toLowerCase();
    const cache = ext === '.html' ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream',
      'content-length': st.size, 'cache-control': cache });
    fs.createReadStream(file).pipe(res);
  });
}

/* ---------- serveur ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'same-origin');

  if (!p.startsWith('/api/')) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Méthode non autorisée' });
    return serveStatic(req, res, p);
  }

  try {
    /* ouvert à tous : le catalogue */
    if (p === '/api/catalog' && req.method === 'GET') {
      return json(res, 200, { prices: db.catalog.prices, stock: db.catalog.stock, protege: !!ADMIN_PASSWORD });
    }

    /* ouvert à tous : passer commande */
    if (p === '/api/orders' && req.method === 'POST') {
      if (tooMany('cmd:' + ipOf(req), 10, 3600e3)) return json(res, 429, { error: 'Trop de commandes envoyées. Réessayez dans une heure.' });
      const body = await readBody(req);
      const r = buildOrder(body, 'boutique');
      if (r.error) return json(res, 400, { error: r.error });
      db.orders.unshift(r.order); await save();
      console.log(`[benkashoes] commande ${r.order.ref} — ${r.order.total} DH`);
      return json(res, 201, { order: r.order });
    }

    /* connexion à l'espace atelier */
    if (p === '/api/login' && req.method === 'POST') {
      if (tooMany('log:' + ipOf(req), 8, 900e3)) return json(res, 429, { error: 'Trop de tentatives. Réessayez dans 15 minutes.' });
      if (!ADMIN_PASSWORD) return json(res, 503, { error: "Aucun mot de passe n'est configuré sur le serveur." });
      const { password } = await readBody(req, 4096);
      const a = Buffer.from(String(password || '')), b = Buffer.from(ADMIN_PASSWORD);
      const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!ok) { await new Promise(r => setTimeout(r, 400)); return json(res, 401, { error: 'Mot de passe incorrect.' }); }
      return json(res, 200, { token: makeToken() });
    }

    /* tout le reste est réservé à l'atelier */
    if (!isAdmin(req)) return json(res, 401, { error: 'Connexion requise.' });

    if (p === '/api/session' && req.method === 'GET') return json(res, 200, { ok: true });

    if (p === '/api/orders' && req.method === 'GET') return json(res, 200, { orders: db.orders });

    if (p === '/api/orders' && req.method === 'PUT') { // saisie manuelle
      const body = await readBody(req);
      const r = buildOrder(body, 'atelier');
      if (r.error) return json(res, 400, { error: r.error });
      db.orders.unshift(r.order); await save();
      return json(res, 201, { order: r.order });
    }

    const m = p.match(/^\/api\/orders\/([A-Za-z0-9-]{1,24})$/);
    if (m) {
      const i = db.orders.findIndex(o => o.ref === m[1]);
      if (i < 0) return json(res, 404, { error: 'Commande introuvable.' });
      if (req.method === 'PATCH') {
        const body = await readBody(req, 8192);
        if (body.status && !STATUSES.includes(body.status)) return json(res, 400, { error: 'Statut inconnu.' });
        if (body.status) db.orders[i].status = body.status;
        if (typeof body.note === 'string') db.orders[i].note = str(body.note, 500);
        await save();
        return json(res, 200, { order: db.orders[i] });
      }
      if (req.method === 'DELETE') { db.orders.splice(i, 1); await save(); return json(res, 200, { ok: true }); }
    }

    if (p === '/api/catalog' && req.method === 'PUT') {
      const body = await readBody(req);
      const prices = {}, stock = {};
      for (const id of Object.keys(SEED)) {
        const pr = Number(body.prices?.[id]);
        prices[id] = Number.isFinite(pr) && pr >= 0 && pr <= 100000 ? Math.round(pr) : db.catalog.prices[id];
        const arr = body.stock?.[id];
        stock[id] = Array.isArray(arr) && arr.length === SIZES.length
          ? arr.map(v => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 0 ? Math.min(n, 99999) : 0; })
          : (db.catalog.stock[id] || SEED[id].stock).slice();
      }
      db.catalog = { prices, stock }; await save();
      return json(res, 200, { prices, stock });
    }

    return json(res, 404, { error: 'Route inconnue.' });
  } catch (e) {
    console.error('[benkashoes]', e.message);
    return json(res, 400, { error: 'Requête invalide.' });
  }
});

load().then(() => server.listen(PORT, () => {
  console.log(`[benkashoes] en écoute sur le port ${PORT}`);
  if (!ADMIN_PASSWORD) console.warn('[benkashoes] ATTENTION : ADMIN_PASSWORD non défini — espace atelier inaccessible.');
  if (!process.env.SESSION_SECRET) console.warn('[benkashoes] SESSION_SECRET non défini — les sessions seront perdues à chaque redémarrage.');
}));
