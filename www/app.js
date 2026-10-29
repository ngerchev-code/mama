/* MAMA — My Amazing Market Area. Логика на приложението (без външни библиотеки). */
'use strict';

const DEFAULT_DATA_URL = 'https://raw.githubusercontent.com/ngerchev-code/mama/data/v1/';
const KEY = 'mama.v1';
const SOFIA = '68134';
const $ = s => document.querySelector(s);
const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

/* ─── Състояние ─────────────────────────────────────────────────────────── */
const S = loadState();
const D = { meta: null, city: null, national: null, hist: null, news: null, idx: null, loading: false, error: null, weather: null };

function loadState() {
  let s = {};
  try { s = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { s = {}; }
  return Object.assign({
    settings: {}, list: [], trips: [], menus: {}, usage: {}, cache: {}, favs: null, banned: [], customBanned: [],
  }, s, { settings: Object.assign({ city: null, dataUrl: DEFAULT_DATA_URL, coords: null }, s.settings || {}) });
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { // при препълване изчистваме кеша с цени и опитваме отново
    S.cache = {}; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e2) { /* няма какво да се направи */ }
  }
}

/* ─── Помощни ───────────────────────────────────────────────────────────── */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n, d = 2) => (n == null || isNaN(n)) ? '—' : n.toLocaleString('bg-BG', { minimumFractionDigits: d, maximumFractionDigits: d }) + ' €';
const iso = d => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
const todayISO = () => iso(new Date());
const monthKey = d => iso(d).slice(0, 7);
const MONTHS = ['януари', 'февруари', 'март', 'април', 'май', 'юни', 'юли', 'август', 'септември', 'октомври', 'ноември', 'декември'];
const MONTHS_S = ['яну', 'фев', 'мар', 'апр', 'май', 'юни', 'юли', 'авг', 'сеп', 'окт', 'ное', 'дек'];
const WD = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const WD_FULL = ['неделя', 'понеделник', 'вторник', 'сряда', 'четвъртък', 'петък', 'събота'];
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const norm = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
const median = a => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
const sum = a => a.reduce((x, y) => x + y, 0);
const fmtDate = s => { const d = new Date(s); return `${d.getDate()} ${MONTHS_S[d.getMonth()]}`; };
function isoWeek(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-W${String(Math.ceil(((t - y0) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2400); }
function openExt(url) { if (NATIVE) window.location.href = url; else window.open(url, '_blank', 'noopener'); }
function chainName(id) { return (D.meta && D.meta.chains && D.meta.chains[id]) || (CHAIN_INFO[id] && CHAIN_INFO[id].name) || id; }
function chainBadge(id) {
  const c = CHAIN_INFO[id] || { color: '#6b7a75' };
  const n = chainName(id);
  return `<span class="chainbadge" style="background:${c.color};color:${c.ink || '#fff'}">${esc(n.length > 8 ? n.slice(0, 7) + '.' : n)}</span>`;
}
function catName(c) { return (D.meta && D.meta.categories && D.meta.categories[c]) || ''; }

/* Разпознаване на категория по свободен текст */
const SYN = [
  [/^мляко|прясно мляко/, 6], [/кисело мляко|йогурт/, 7], [/сирене/, 8], [/кашкавал/, 11], [/масло(?! олив)|краве масло/, 12],
  [/извара/, 14], [/цяло пиле|^пиле$/, 15], [/пилешко филе|пилешки гърди/, 16], [/пилешк|бутче/, 17], [/плешка/, 18],
  [/свински бут/, 19], [/свинско филе/, 20], [/врат/, 21], [/свинско/, 22], [/шол/, 23], [/телешко/, 24], [/кайма/, 25],
  [/кренвирш|наденица/, 26], [/шунка|салам|колбас/, 27], [/луканка|суджук|сушен/, 28], [/скумрия/, 29], [/риба|ципура|лаврак|сьомга/, 30],
  [/яйц/, 31], [/^боб|зрял боб/, 33], [/леща/, 34], [/ориз/, 35], [/макарон|паста|фиде/, 36], [/спагети/, 37], [/захар/, 38],
  [/^сол/, 39], [/брашно/, 40], [/олио/, 42], [/маслинов/, 43], [/оцет/, 44], [/консерв.*боб|боб консерва/, 46], [/грах/, 47],
  [/доматен|пелати|домати консерва/, 48], [/лютеница/, 49], [/лимон/, 50], [/портокал/, 51], [/банан/, 52], [/ябълк/, 53],
  [/домат/, 54], [/^лук|кромид/, 55], [/морков/, 56], [/зеле/, 57], [/краставиц/, 58], [/чесън/, 59], [/гъби/, 60], [/картоф/, 61],
  [/маслин/, 62], [/кори/, 5], [/баниц/, 68], [/бисквит/, 66], [/кроасан/, 67], [/шоколад/, 69], [/кафе.*зърн/, 71], [/кафе/, 70],
  [/чай/, 72], [/вода/, 73], [/бира/, 74], [/бяло вино/, 75], [/вино/, 76], [/ракия/, 77], [/цигар/, 78], [/препарат|за съдове/, 79],
  [/четка/, 80], [/паста за зъби/, 81], [/шампоан/, 82], [/сапун/, 83], [/мокри кърпи/, 84], [/тоалетна хартия/, 85],
  [/пълнозърнест|ръжен/, 3], [/добруджа/, 2], [/хляб/, 1],
];
function guessCat(text) {
  const t = norm(text);
  for (const [re, c] of SYN) if (re.test(t)) return c;
  return 0;
}

/* Вредни / забранени */
function bannedList() {
  const sel = HARMFUL.filter(h => S.banned.includes(h.id));
  const custom = (S.customBanned || []).map(w => ({ id: 'c:' + w, name: w, icon: '⛔', why: 'Добавено от теб', kw: [norm(w)], cats: [] }));
  return sel.concat(custom);
}
function harmMatch(name, cat, onlyBanned = true) {
  const n = norm(name);
  const pool = onlyBanned ? bannedList() : HARMFUL;
  return pool.find(h => (cat && h.cats.includes(+cat)) || h.kw.some(k => n.includes(k))) || null;
}

/* ─── Данни ─────────────────────────────────────────────────────────────── */
async function fetchJSON(path, maxAgeMin = 120) {
  const key = 'f:' + path;
  const c = S.cache[key];
  if (c && (Date.now() - c.t) < maxAgeMin * 60000) return c.v;
  const url = (S.settings.dataUrl || DEFAULT_DATA_URL).replace(/\/?$/, '/') + path + '?t=' + Math.floor(Date.now() / 600000);
  try {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const v = await r.json();
    S.cache[key] = { t: Date.now(), v }; save();
    return v;
  } catch (e) {
    if (c) return c.v; // офлайн — последните заредени данни
    throw e;
  }
}

async function loadData(force = false) {
  if (D.loading) return;
  D.loading = true; D.error = null;
  if (force) S.cache = {};
  try {
    D.meta = await fetchJSON('meta.json');
    if (!S.settings.city) {
      if (!S.settings.coords) await getCoords();
      S.settings.city = nearestCity(S.settings.coords) || SOFIA; save();
    }
    const [city, national, hist, news] = await Promise.all([
      fetchJSON(`city/${S.settings.city}.json`).catch(() => null),
      fetchJSON('national.json').catch(() => null),
      fetchJSON('hist.json', 360).catch(() => null),
      fetchJSON('news.json', 60).catch(() => null),
    ]);
    D.city = city; D.national = national; D.hist = hist; D.news = news;
    buildIndex();
  } catch (e) {
    D.error = 'Цените още не са налични. ' + (navigator.onLine === false ? 'Няма интернет връзка.' : 'Провери адреса на данните в Настройки.');
  }
  D.loading = false;
  render();
}

function nearestCity(coords) {
  if (!coords || !D.meta) return null;
  let best = null, bd = 1e9;
  for (const c of D.meta.cities) {
    if (c[5] == null || c[3] < 3) continue;
    const d = (c[5] - coords.lat) ** 2 + ((c[6] - coords.lon) * Math.cos(coords.lat * Math.PI / 180)) ** 2;
    if (d < bd) { bd = d; best = c[0]; }
  }
  return best;
}
function cityInfo(ek = S.settings.city) { return D.meta && D.meta.cities.find(c => c[0] === ek); }

/* Индекс по града: категория → верига → продукти */
function buildIndex() {
  const idx = { byCat: {}, byName: {}, chains: [], med: {}, min: {}, promos: [] };
  if (!D.city) { D.idx = idx; return; }
  const chains = new Set();
  for (const r of D.city.items) {
    const [cat, ch, name, price, retail, promo, stores] = r;
    chains.add(ch);
    ((idx.byCat[cat] = idx.byCat[cat] || {})[ch] = idx.byCat[cat][ch] || []).push({ cat, ch, name, price, retail, promo, stores });
    idx.byName[ch + '|' + norm(name)] = price;
    if (promo && retail > price) idx.promos.push({ cat, ch, name, price, retail, off: 1 - price / retail });
  }
  for (const cat in idx.byCat) {
    idx.med[cat] = {}; idx.min[cat] = {};
    for (const ch in idx.byCat[cat]) {
      const ps = idx.byCat[cat][ch].map(p => p.price);
      idx.med[cat][ch] = median(ps); idx.min[cat][ch] = Math.min(...ps);
    }
  }
  idx.chains = [...chains].sort((a, b) => (D.city.stores[b] || 0) - (D.city.stores[a] || 0));
  idx.promos.sort((a, b) => b.off - a.off);
  D.idx = idx;
}

/* Ценови индекс на веригите в града (100 = най-евтината за всяка категория) */
function chainIndex() {
  const idx = D.idx; if (!idx) return [];
  const acc = {};
  for (const cat in idx.med) {
    if (+cat >= 86) continue;
    const m = idx.med[cat]; const ks = Object.keys(m);
    if (ks.length < 3) continue;
    const lo = Math.min(...ks.map(k => m[k]));
    ks.forEach(k => (acc[k] = acc[k] || []).push(m[k] / lo * 100));
  }
  return Object.entries(acc).filter(([, v]) => v.length >= 5)
    .map(([ch, v]) => ({ ch, score: median(v), n: v.length })).sort((a, b) => a.score - b.score);
}

/* Оценка на списъка по вериги */
function itemPrice(item, ch) {
  const idx = D.idx; if (!idx) return null;
  if (item.product) {
    const p = idx.byName[ch + '|' + norm(item.product.name)];
    if (p != null) return p;
  }
  if (item.cat && idx.med[item.cat] && idx.med[item.cat][ch] != null) return idx.med[item.cat][ch];
  return null;
}
function estimate(items) {
  const idx = D.idx; const out = [];
  if (!idx || !idx.chains.length) return { chains: [], best: null, split: null };
  const priced = items.filter(i => i.cat || i.product);
  for (const ch of idx.chains) {
    let total = 0, covered = 0;
    for (const it of priced) { const p = itemPrice(it, ch); if (p != null) { total += p * (it.qty || 1); covered++; } }
    out.push({ ch, total, covered });
  }
  const maxCov = Math.max(0, ...out.map(o => o.covered));
  out.sort((a, b) => (b.covered - a.covered) || (a.total - b.total));
  const best = out.find(o => o.covered === maxCov && maxCov > 0) || null;
  // Най-добрата комбинация от два магазина
  let split = null;
  const cand = out.filter(o => o.covered > 0).map(o => o.ch).slice(0, 8);
  for (let i = 0; i < cand.length; i++) for (let j = i + 1; j < cand.length; j++) {
    let total = 0, cov = 0; const pick = {};
    for (const it of priced) {
      const a = itemPrice(it, cand[i]), b = itemPrice(it, cand[j]);
      const v = a == null ? b : b == null ? a : Math.min(a, b);
      if (v != null) { total += v * (it.qty || 1); cov++; pick[it.id] = (a != null && (b == null || a <= b)) ? cand[i] : cand[j]; }
    }
    if (cov >= maxCov && (!split || total < split.total)) split = { a: cand[i], b: cand[j], total, cov, pick };
  }
  if (split && best && best.total - split.total < 0.5) split = null;
  return { chains: out, best, split, priced: priced.length, unpriced: items.length - priced.length };
}

/* ─── Навигация ─────────────────────────────────────────────────────────── */
const TITLES = {
  home: ['MAMA', 'My Amazing Market Area'], prices: ['Цени', ''], list: ['Списък за пазар', ''], recipes: ['Меню и рецепти', ''],
  more: ['Още', 'My Amazing Market Area'], stats: ['Статистика', ''], news: ['Новини', ''], stores: ['Магазини и карта', ''],
  online: ['Онлайн пазаруване', ''], doctor: ['My Doctor', 'Хранителен режим и показатели'], banned: ['Забранени храни', ''], settings: ['Настройки', ''],
};
const TOP = ['home', 'prices', 'list', 'recipes', 'more'];
let current = 'home'; const stack = [];
function go(name, push = true) {
  if (push && current !== name && !TOP.includes(name)) stack.push(current);
  if (TOP.includes(name)) stack.length = 0;
  current = name;
  document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.id === 's-' + name));
  const navName = TOP.includes(name) ? name : 'more';
  document.querySelectorAll('nav.bottom button').forEach(b => b.classList.toggle('active', b.dataset.go === navName));
  const t = TITLES[name] || ['MAMA', ''];
  $('#title').textContent = t[0];
  $('#subtitle').textContent = name === 'home' ? t[1] : (t[1] || subtitleFor(name));
  $('#appbar').classList.toggle('has-back', !TOP.includes(name));
  render();
  window.scrollTo(0, 0);
}
function subtitleFor() { const c = cityInfo(); return c ? c[1] : 'My Amazing Market Area'; }
function back() { if (sheetOpen()) return closeSheet(); if (stack.length) go(stack.pop(), false); else if (current !== 'home') go('home'); }

function render() {
  const f = { home: renderHome, prices: renderPrices, list: renderList, recipes: renderRecipes, more: renderMore, stats: renderStats,
    news: renderNews, stores: renderStores, online: renderOnline, banned: renderBanned, settings: renderSettings, doctor: renderDoctor }[current];
  if (f) f($('#s-' + current));
  const n = S.list.filter(i => !i.done).length;
  const b = $('#listBadge'); b.hidden = !n; b.textContent = n;
}

/* Sheet */
function openSheet(html, onMount) { $('#sheetBody').innerHTML = html; $('#sheet').classList.add('open'); $('#scrim').classList.add('open'); if (onMount) onMount($('#sheetBody')); }
function closeSheet() { $('#sheet').classList.remove('open'); $('#scrim').classList.remove('open'); }
function sheetOpen() { return $('#sheet').classList.contains('open'); }

/* ─── Икони ─────────────────────────────────────────────────────────────── */
const I = {
  plus: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>',
  del: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16a6.47 6.47 0 0 0 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 14.5 9 2.5 2.5 0 0 1 12 11.5z"/></svg>',
  cart: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 18a2 2 0 1 0 2 2 2 2 0 0 0-2-2zm10 0a2 2 0 1 0 2 2 2 2 0 0 0-2-2zM7.2 14.8h9.5a2 2 0 0 0 1.75-1.03L22 7.2 20.25 6l-3.55 6.8H8.1L4.3 4H1v2h2l3.6 7.6-1.35 2.44A2 2 0 0 0 7 19h12v-2H7.4z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M10.59 9.17 5.41 4 4 5.41l5.17 5.17zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4zm.33 9.41-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04z"/></svg>',
};

/* ─── Време ─────────────────────────────────────────────────────────────── */
function getCoords() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => {
      const c = { lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), t: Date.now() };
      S.settings.coords = c; save(); res(c);
    }, () => res(null), { enableHighAccuracy: false, timeout: 9000, maximumAge: 30 * 60000 });
  });
}
async function loadWeather() {
  const cached = S.cache.weather;
  if (cached && Date.now() - cached.t < 30 * 60000) { D.weather = cached.v; return; }
  let c = await getCoords();
  let place = 'Твоето местоположение';
  if (!c) {
    const ci = cityInfo() || (D.meta ? null : null);
    if (ci && ci[5] != null) { c = { lat: ci[5], lon: ci[6] }; place = ci[1]; }
    else { c = { lat: 42.698, lon: 23.322 }; place = 'гр. София'; }
  }
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FSofia&forecast_days=5`;
  try {
    const r = await fetch(url); if (!r.ok) throw 0;
    const v = await r.json(); v.place = place;
    D.weather = v; S.cache.weather = { t: Date.now(), v }; save();
  } catch (e) { D.weather = cached ? cached.v : null; D.weatherFail = !D.weather; }
  if (current === 'home') render();
}
function weatherCard() {
  const w = D.weather;
  if (!w) return `<div class="card"><h2>🌤️ Времето</h2><div class="muted small">${D.weatherFail ? 'Прогнозата не е достъпна в момента — провери интернет връзката.' : 'Зареждане на прогнозата…'}</div></div>`;
  const cur = w.current, [txt, ico] = WEATHER_CODES[cur.weather_code] || ['', '🌡️'];
  const days = w.daily.time.map((t, i) => {
    const [, ic] = WEATHER_CODES[w.daily.weather_code[i]] || ['', '🌡️'];
    return `<div>${i ? WD[new Date(t).getDay()] : 'днес'}<b>${ic}</b>${Math.round(w.daily.temperature_2m_max[i])}° / ${Math.round(w.daily.temperature_2m_min[i])}°<br><span class="muted">${w.daily.precipitation_probability_max[i] ?? 0}%☔</span></div>`;
  }).join('');
  return `<div class="card"><h2>🌤️ Времето <span class="muted small" style="font-weight:400">· ${esc(w.place)}</span></h2>
    <div class="wx-now"><div class="ico">${ico}</div><div><div class="big">${Math.round(cur.temperature_2m)}°C</div>
    <div class="muted small">${esc(txt)} · усеща се ${Math.round(cur.apparent_temperature)}° · вятър ${Math.round(cur.wind_speed_10m)} км/ч</div></div></div>
    <div class="wx-days">${days}</div></div>`;
}

/* ─── Меню за седмицата ─────────────────────────────────────────────────── */
function recipeBlocked(r) { return r.ing.map(i => harmMatch(i[0], i[2])).find(Boolean) || null; }
function seeded(seed) { let s = 0; for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function inSeason(r, m) { return r.season === 'all' || r.season.includes(m); }
function weekMenu(reroll = false) {
  const wk = isoWeek();
  let ids = S.menus[wk];
  const valid = ids && ids.every(id => { const r = RECIPES.find(x => x.id === id); return r && !recipeBlocked(r); });
  if (!valid || reroll) {
    const rnd = reroll ? Math.random : seeded(wk);
    const m = new Date().getMonth() + 1;
    const ok = r => !recipeBlocked(r);
    const pick = (arr, n, prefer) => {
      const pool = [...arr].sort(() => rnd() - .5);
      pool.sort((a, b) => (prefer(b) - prefer(a)));
      return pool.slice(0, n);
    };
    const season = r => (r.season !== 'all' && r.season.includes(m)) ? 1 : 0;
    const soups = RECIPES.filter(r => r.group === 'soup' && ok(r) && inSeason(r, m));
    const mains = RECIPES.filter(r => r.group === 'main' && ok(r) && inSeason(r, m));
    const salads = RECIPES.filter(r => r.group === 'salad' && ok(r) && inSeason(r, m));
    const chosen = [...pick(soups, 1, () => rnd()), ...pick(mains, soups.length ? 2 : 3, season)];
    ids = [...chosen.slice(0, 3), ...pick(salads, 1, season)].map(r => r.id);
    S.menus = { [wk]: ids }; save();
  }
  return ids.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
}
function groupIcon(g) { return (RECIPE_GROUPS.find(x => x.id === g) || {}).icon || '🍽️'; }
function recipeTile(r) {
  const b = recipeBlocked(r);
  return `<div class="tile ${b ? 'blocked' : ''}" data-recipe="${r.id}"><div class="emo">${groupIcon(r.group)}</div>
    <div class="t">${esc(r.name)}</div><div class="muted small">⏱ ${r.time} мин · ${r.serv} порции${b ? ` · <span class="tag bad">${esc(b.name)}</span>` : ''}</div></div>`;
}
function addIngredients(r) {
  let n = 0;
  for (const [name, , cat] of r.ing) {
    if (/по вкус|щипка/.test(name)) continue;
    const base = name.replace(/\s*\(.*\)/, '');
    if (S.list.some(i => !i.done && norm(i.name) === norm(base))) continue;
    S.list.push({ id: uid(), name: base, cat: cat || guessCat(base), qty: 1, done: false, from: r.name, added: Date.now() });
    n++;
  }
  save(); render();
  return n;
}
function showRecipe(id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return;
  const b = recipeBlocked(r);
  const est = estimate(r.ing.filter(i => i[2]).map(i => ({ id: i[0], cat: i[2], qty: 1 })));
  openSheet(`<h3>${groupIcon(r.group)} ${esc(r.name)}</h3>
    <div class="muted small">⏱ ${r.time} мин · ${r.serv} порции · ${esc((RECIPE_GROUPS.find(g => g.id === r.group) || {}).name || '')}</div>
    ${b ? `<div class="notice bad" style="margin-top:10px">⛔ Съдържа продукт от забранените: <b>${esc(b.name)}</b></div>` : ''}
    <div class="section-title" style="margin-left:0">Продукти</div>
    <ul class="list">${r.ing.map(([n, q, c]) => { const h = harmMatch(n, c); return `<li class="li" style="cursor:default"><div class="grow">${esc(n)}${h ? ` <span class="tag bad">${esc(h.name)}</span>` : drCatTag(c).replace(' · ', ' ')}</div><div class="muted">${esc(q)}</div></li>`; }).join('')}</ul>
    ${est.best ? `<div class="notice good" style="margin-top:8px">🛒 Ориентировъчно най-изгодно в <b>${esc(chainName(est.best.ch))}</b> — ок. ${eur(est.best.total)} за основните продукти</div>` : ''}
    <div class="section-title" style="margin-left:0">Приготвяне</div>
    <ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <button class="btn primary block" id="addIng" style="margin-top:14px">${I.cart} Добави продуктите в списъка</button>`,
  el => el.querySelector('#addIng').onclick = () => { const n = addIngredients(r); closeSheet(); toast(n ? `Добавени ${n} продукта в списъка` : 'Продуктите вече са в списъка'); });
}

/* ─── Предложения ───────────────────────────────────────────────────────── */
function suggestions() {
  const out = { save: [], season: [], mine: [], health: [] };
  const idx = D.idx;
  const open = S.list.filter(i => !i.done);
  if (idx) {
    // Промоции за продукти от списъка
    for (const it of open) {
      const p = idx.promos.find(p => (it.cat && p.cat === it.cat) || norm(p.name).includes(norm(it.name)));
      if (p) out.save.push(['🏷️', `<b>${esc(it.name)}</b>: промоция в ${esc(chainName(p.ch))} — ${eur(p.price)} вместо ${eur(p.retail)} (−${Math.round(p.off * 100)}%)`]);
      if (out.save.length >= 4) break;
    }
    const ci = chainIndex();
    if (ci.length >= 2) out.save.push(['📉', `В ${esc(subtitleFor())} най-ниско ценово ниво днес има <b>${esc(chainName(ci[0].ch))}</b>; ${esc(chainName(ci[ci.length - 1].ch))} е средно с ${Math.round(ci[ci.length - 1].score - ci[0].score)}% по-скъпа.`]);
    const e = estimate(open);
    if (e.best && e.chains.length > 1) {
      const worst = e.chains.filter(c => c.covered === e.best.covered).slice(-1)[0];
      if (worst && worst.total - e.best.total > 1) out.save.push(['🛒', `Списъкът ти е най-евтин в <b>${esc(chainName(e.best.ch))}</b> — спестяваш ок. ${eur(worst.total - e.best.total)} спрямо ${esc(chainName(worst.ch))}.`]);
    }
  }
  const m = new Date().getMonth() + 1;
  out.season.push(['🍂', `Сезонно през ${MONTHS[m - 1]}: ${SEASONAL[m].join(', ')} — обикновено са по-евтини и по-вкусни.`]);
  const sr = RECIPES.filter(r => r.season !== 'all' && r.season.includes(m) && !recipeBlocked(r)).slice(0, 3);
  if (sr.length) out.season.push(['🍲', `Подходящо за сезона: ${sr.map(r => esc(r.name)).join(', ')}.`]);
  // Моите навици
  const mk = monthKey(new Date()), pk = monthKey(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1));
  const cur = sum(S.trips.filter(t => t.date.startsWith(mk)).map(t => t.amount));
  const prev = sum(S.trips.filter(t => t.date.startsWith(pk)).map(t => t.amount));
  if (prev > 0 && cur > 0) {
    const d = Math.round((cur / prev - 1) * 100);
    out.mine.push([d > 0 ? '📈' : '📉', `Този месец си похарчил ${eur(cur)} — ${d > 0 ? 'с ' + d + '% повече' : 'с ' + Math.abs(d) + '% по-малко'} от целия минал месец (${eur(prev)}).`]);
  } else if (cur > 0) out.mine.push(['💶', `Похарчени този месец: ${eur(cur)} в ${S.trips.filter(t => t.date.startsWith(mk)).length} пазарувания.`]);
  const planned = S.trips.filter(t => t.date.startsWith(mk) && t.planned > 0);
  if (planned.length) {
    const over = sum(planned.map(t => t.amount)) - sum(planned.map(t => t.planned));
    out.mine.push([over > 0 ? '⚠️' : '✅', over > 0 ? `При пазаруване по списък си дал ${eur(over)} над ориентировъчната сума.` : `Пазаруваш по списъка в рамките на прогнозата — браво.`]);
  }
  if (!S.trips.length) out.mine.push(['📝', 'Отбелязвай всяко пазаруване с бутона „Пазарувах“ в Списък — така MAMA ще ти води статистиката.']);
  // Здраве
  const harmful = open.map(i => [i, harmMatch(i.name, i.cat)]).filter(x => x[1]);
  harmful.slice(0, 3).forEach(([i, h]) => out.health.push(['⛔', `<b>${esc(i.name)}</b> е от забранените ти храни (${esc(h.name)}).`]));
  drSuggest().forEach(x => out.health.push(x));
  if (!S.banned.length && !S.customBanned.length) out.health.push(['🩺', 'Избери храни, които искаш да избягваш, в „Забранени храни“ — ще ги маркираме в цените, списъка и рецептите.']);
  return out;
}
function suggestHTML(s) {
  const groups = [['save', '💰 Спести'], ['mine', '📊 Твоят пазар'], ['season', '🌱 Сезонно'], ['health', '🩺 Здраве']];
  return groups.filter(([k]) => s[k].length).map(([k, t]) => `<div class="small muted" style="font-weight:700;margin-top:8px">${t}</div>` +
    s[k].map(([e, h]) => `<div class="suggest"><div class="e">${e}</div><div class="grow">${h}</div></div>`).join('')).join('');
}

/* ─── Начало ────────────────────────────────────────────────────────────── */
function renderHome(el) {
  const mk = monthKey(new Date());
  const trips = S.trips.filter(t => t.date.startsWith(mk));
  const spent = sum(trips.map(t => t.amount));
  const open = S.list.filter(i => !i.done);
  const est = estimate(open);
  const menu = weekMenu();
  const promos = D.idx ? D.idx.promos.filter(p => !harmMatch(p.name, p.cat)).slice(0, 5) : [];
  const news = D.news ? D.news.items.slice(0, 3) : [];
  const ci = cityInfo();
  el.innerHTML = `
    ${D.error ? `<div class="notice warn">⚠️ <div>${esc(D.error)}</div></div>` : ''}
    <div class="card hero">
      <div class="muted small">Похарчени през ${MONTHS[new Date().getMonth()]}</div>
      <div class="big">${eur(spent)}</div>
      <div class="kpis">
        <div class="kpi"><b>${trips.length}</b><span>пазарувания</span></div>
        <div class="kpi"><b>${trips.length ? eur(spent / trips.length, 0) : '—'}</b><span>средна сметка</span></div>
        <div class="kpi"><b>${open.length}</b><span>в списъка</span></div>
      </div>
    </div>
    <div class="grid-actions" style="margin-bottom:12px">
      <button data-go2="stats"><span class="ic">📊</span>Статистика</button>
      <button data-go2="stores"><span class="ic">📍</span>Магазини</button>
      <button data-go2="news"><span class="ic">📰</span>Новини</button>
      <button data-go2="online"><span class="ic">🌐</span>eBay и онлайн</button>
      <button data-go2="banned"><span class="ic">⛔</span>Забранени</button>
      <button data-go2="doctor"><span class="ic">🩺</span>My Doctor</button>
    </div>
    <div class="card"><h2>🛒 Списък за пазар <button class="more" data-go2="list">Отвори</button></h2>
      ${open.length ? (est.best ? `<div class="row"><div class="grow">Най-изгодно: <b>${esc(chainName(est.best.ch))}</b><div class="muted small">${est.best.covered} от ${open.length} продукта с цени · ${esc(ci ? ci[1] : '')}</div></div><div class="price">~${eur(est.best.total)}</div></div>`
        : `<div class="muted">${open.length} продукта · цените ще се покажат след зареждане на данните</div>`)
        : `<div class="muted">Списъкът е празен. Добави продукти или рецепти от менюто.</div>`}
    </div>
    ${weatherCard()}
    <div class="card"><h2>🍽️ Тази седмица готвим <button class="more" data-go2="recipes">Всички</button></h2>
      <div class="menu-grid">${menu.map(recipeTile).join('')}</div>
    </div>
    <div class="card"><h2>💡 Предложения</h2>${suggestHTML(suggestions())}</div>
    ${promos.length ? `<div class="card"><h2>🏷️ Най-големи промоции днес <span class="muted small" style="font-weight:400">· ${esc(ci ? ci[1] : '')}</span></h2>
      <ul class="list">${promos.map(promoLi).join('')}</ul></div>` : ''}
    ${news.length ? `<div class="card"><h2>📰 Новини <button class="more" data-go2="news">Още</button></h2>${news.map(newsItem).join('')}</div>` : ''}
    <div class="muted small" style="text-align:center;margin:14px 0">${D.meta ? `Цени към ${fmtDate(D.meta.date)} · източник: КЗП „Колко струва“` : ''}</div>`;
  bindCommon(el);
}
function promoLi(p) {
  return `<li class="li" data-add-product="${esc(p.ch)}|${esc(p.name)}|${p.cat}">${chainBadge(p.ch)}<div class="grow"><div class="title ellipsis">${esc(p.name)}</div>
    <div class="muted small">${esc(catName(p.cat))} · <span class="tag promo">−${Math.round(p.off * 100)}%</span></div></div>
    <div class="trail"><div class="price">${eur(p.price)}</div><div class="strike">${eur(p.retail)}</div></div></li>`;
}
function newsItem(n) {
  return `<div class="news-item" data-url="${esc(n.u)}"><div class="t">${esc(n.t)}</div><div class="muted small">${esc(n.s || '')} · ${fmtDate(n.d)}${n.gn ? ` · ${esc(n.gn)}` : ''}</div></div>`;
}
function bindCommon(el) {
  el.querySelectorAll('[data-go2]').forEach(b => b.onclick = () => go(b.dataset.go2));
  el.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => showRecipe(b.dataset.recipe));
  el.querySelectorAll('[data-url]').forEach(b => b.onclick = () => openExt(b.dataset.url));
  el.querySelectorAll('[data-add-product]').forEach(b => b.onclick = () => {
    const [ch, name, cat] = b.dataset.addProduct.split('|');
    addProduct({ ch, name, cat: +cat });
  });
}
function addProduct(p) {
  const h = harmMatch(p.name, p.cat);
  S.list.push({ id: uid(), name: p.name, cat: p.cat, qty: 1, done: false, product: { chain: p.ch, name: p.name }, added: Date.now() });
  save(); render();
  toast(h ? `Добавено — внимание: ${h.name}` : 'Добавено в списъка');
}

/* ─── Цени ──────────────────────────────────────────────────────────────── */
let priceGroup = null, priceQuery = '';
function renderPrices(el) {
  if (!D.meta || !D.idx) {
    el.innerHTML = `<div class="card empty"><div class="ico">🏷️</div>${esc(D.error || 'Зареждане на цените…')}</div>`; return;
  }
  const ci = cityInfo();
  const groups = D.meta.groups;
  const g = groups.find(x => x.id === priceGroup) || null;
  const q = norm(priceQuery);
  const index = chainIndex();
  let body = '';
  if (q.length >= 2) {
    const hits = D.city.items.filter(r => norm(r[2]).includes(q) || norm(catName(r[0])).includes(q)).sort((a, b) => a[3] - b[3]).slice(0, 60);
    body = `<div class="card"><h2>Резултати (${hits.length})</h2><ul class="list">${hits.map(r => productLi({ cat: r[0], ch: r[1], name: r[2], price: r[3], retail: r[4], promo: r[5] })).join('') || '<div class="empty">Няма намерени продукти</div>'}</ul></div>`;
  } else {
    const cats = (g ? g.cats : groups.flatMap(x => x.cats)).filter(c => D.idx.byCat[c]);
    const uniq = [...new Set(cats)];
    body = `<div class="card"><h2>${esc(g ? g.name : 'Всички категории')}</h2><ul class="list">${uniq.map(c => {
      const mins = D.idx.min[c]; const chs = Object.keys(mins).sort((a, b) => mins[a] - mins[b]);
      const h = harmMatch(catName(c), c);
      return `<li class="li" data-cat="${c}">${chainBadge(chs[0])}<div class="grow"><div class="title">${esc(catName(c))}${c >= 86 ? ` <span class="muted small">#${c}</span>` : ''}${h ? ` <span class="tag bad">⛔</span>` : ''}</div>
        <div class="muted small">${chs.length} вериги · най-евтино в ${esc(chainName(chs[0]))}</div></div>
        <div class="trail"><div class="muted small">от</div><div class="price">${eur(mins[chs[0]])}</div></div></li>`;
    }).join('')}</ul></div>`;
  }
  el.innerHTML = `
    <div class="row" style="margin-bottom:10px">
      <button class="chip on" id="cityChip">📍 ${esc(ci ? ci[1] : 'Избери град')}</button>
      <span class="muted small">цени към ${fmtDate(D.city ? D.city.date : D.meta.date)}</span>
    </div>
    <div class="field" style="margin-bottom:10px">${I.search}<input id="pq" placeholder="Търси продукт: мляко, сирене, кафе…" value="${esc(priceQuery)}"></div>
    <div class="chips"><button class="chip ${!g ? 'on' : ''}" data-g="">Всички</button>${groups.map(x => `<button class="chip ${g && g.id === x.id ? 'on' : ''}" data-g="${x.id}">${esc(x.name)}</button>`).join('')}</div>
    ${index.length && !q ? `<div class="card"><h2>🏆 Кой магазин е най-евтин тук</h2><div class="bars">${index.map((x, i) => `
      <div class="bar"><span class="ellipsis">${i === 0 ? '🥇 ' : ''}${esc(chainName(x.ch))}</span><div class="track"><div class="fill" style="width:${Math.max(8, 100 - (x.score - index[0].score) * 3)}%;background:${(CHAIN_INFO[x.ch] || {}).color || 'var(--primary)'}"></div></div><span class="v">${i === 0 ? 'най-евтин' : '+' + Math.max(1, Math.round(x.score - index[0].score)) + '%'}</span></div>`).join('')}</div>
      <div class="muted small" style="margin-top:8px">Сравнение на медианните цени по ${index[0].n}+ категории спрямо най-евтината верига в града. Ориентировъчно — разфасовките се различават.</div></div>` : ''}
    ${body}`;
  el.querySelector('#cityChip').onclick = pickCity;
  const pq = el.querySelector('#pq');
  pq.oninput = () => { priceQuery = pq.value; clearTimeout(pq._t); pq._t = setTimeout(() => { renderPrices(el); const n = el.querySelector('#pq'); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 250); };
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { priceGroup = b.dataset.g || null; renderPrices(el); });
  el.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => showCategory(+b.dataset.cat));
  bindProductRows(el);
}
function productLi(p) {
  const h = harmMatch(p.name, p.cat);
  return `<li class="li">${chainBadge(p.ch)}<div class="grow"><div class="title">${esc(p.name)}</div>
    <div class="muted small">${esc(chainName(p.ch))}${p.promo ? ' · <span class="tag promo">промоция</span>' : ''}${p.best ? ' · <span class="tag best">най-евтино</span>' : ''}${h ? ` · <span class="tag bad">⛔ ${esc(h.name)}</span>` : ''}</div></div>
    <div class="trail"><div class="price">${eur(p.price)}</div>${p.promo && p.retail > p.price ? `<div class="strike">${eur(p.retail)}</div>` : ''}
    <button class="btn tonal small" style="margin-top:4px" data-add-product="${esc(p.ch)}|${esc(p.name)}|${p.cat}">+ списък</button></div></li>`;
}
function bindProductRows(el) {
  el.querySelectorAll('[data-add-product]').forEach(b => b.onclick = e => {
    e.stopPropagation();
    const [ch, name, cat] = b.dataset.addProduct.split('|');
    addProduct({ ch, name, cat: +cat });
  });
}
function showCategory(c) {
  const by = D.idx.byCat[c] || {};
  const all = Object.values(by).flat().sort((a, b) => a.price - b.price);
  const lo = all.length ? all[0].price : 0;
  const h = harmMatch(catName(c), c, false);
  const banned = harmMatch(catName(c), c);
  openSheet(`<h3>${esc(catName(c))}</h3><div class="muted small">${all.length} продукта в ${Object.keys(by).length} вериги · ${esc(subtitleFor())}</div>
    ${banned ? `<div class="notice bad" style="margin-top:10px">⛔ <div><b>${esc(banned.name)}</b> — забранено от теб. ${esc(banned.why)}</div></div>` : h ? `<div class="notice warn" style="margin-top:10px">⚠️ <div><b>${esc(h.name)}</b>: ${esc(h.why)}</div></div>` : ''}
    ${drCatNotice(c)}
    ${trendCard(c)}
    <ul class="list">${all.map(p => productLi(Object.assign({}, p, { best: p.price === lo }))).join('')}</ul>`, bindProductRows);
}
function trendCard(cat) {
  const H = D.hist; if (!H || !H.dates || H.dates.length < 2) return '';
  const series = MAIN_CHAINS.concat(Object.keys(H.s).filter(c => !MAIN_CHAINS.includes(c))).filter(ch => H.s[ch] && H.s[ch][cat]).slice(0, 6)
    .map(ch => ({ ch, v: H.s[ch][cat] }));
  if (!series.length) return '';
  const vals = series.flatMap(s => s.v.filter(x => x != null));
  const lo = Math.min(...vals), hi = Math.max(...vals), n = H.dates.length;
  const W = 300, Hh = 70;
  const lines = series.map(s => {
    const pts = s.v.map((v, i) => v == null ? null : `${(i / (n - 1) * W).toFixed(1)},${(Hh - 4 - (hi === lo ? .5 : (v - lo) / (hi - lo)) * (Hh - 8)).toFixed(1)}`).filter(Boolean);
    return `<polyline points="${pts.join(' ')}" fill="none" stroke="${(CHAIN_INFO[s.ch] || {}).color || '#888'}" stroke-width="2" stroke-linejoin="round"/>`;
  }).join('');
  const legend = series.map(s => { const v = s.v.filter(x => x != null); const d = v.length > 1 ? (v[v.length - 1] / v[0] - 1) * 100 : 0;
    return `<span class="small" style="margin-right:10px"><b style="color:${(CHAIN_INFO[s.ch] || {}).color || '#888'}">●</b> ${esc(chainName(s.ch))} ${d >= 0 ? '+' : ''}${d.toFixed(1)}%</span>`; }).join('');
  return `<div class="card" style="box-shadow:none;background:var(--surface-2);margin-top:12px"><div class="small muted">Медианна цена в страната · ${fmtDate(H.dates[0])} – ${fmtDate(H.dates[n - 1])}</div>
    <svg class="spark" viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">${lines}</svg><div>${legend}</div></div>`;
}
function pickCity() {
  if (!D.meta) return;
  const draw = q => D.meta.cities.filter(c => !q || norm(c[1]).includes(norm(q))).slice(0, 60).map(c =>
    `<li class="li" data-city="${c[0]}"><div class="lead">📍</div><div class="grow"><div class="title">${esc(c[1])}</div><div class="muted small">обл. ${esc(c[2])} · ${c[3]} обекта · ${c[4].map(chainName).slice(0, 5).join(', ')}</div></div></li>`).join('');
  openSheet(`<h3>Избери населено място</h3><button class="btn tonal small" id="gpsCity" style="margin:6px 0 10px">${I.map} Най-близко до мен</button>
    <div class="field">${I.search}<input id="cq" placeholder="Търси град или село"></div><ul class="list" id="cl">${draw('')}</ul>`, el => {
    const bind = () => el.querySelectorAll('[data-city]').forEach(b => b.onclick = () => setCity(b.dataset.city));
    el.querySelector('#cq').oninput = e => { el.querySelector('#cl').innerHTML = draw(e.target.value); bind(); };
    el.querySelector('#gpsCity').onclick = async () => { const c = await getCoords(); const n = nearestCity(c); if (n) setCity(n); else toast('Няма достъп до местоположението'); };
    bind();
  });
}
async function setCity(ek) {
  S.settings.city = ek; save(); closeSheet();
  D.city = null; D.idx = null; render();
  try { D.city = await fetchJSON(`city/${ek}.json`); } catch (e) { D.city = null; toast('Няма данни за този град'); }
  buildIndex(); render();
}

/* ─── Списък ────────────────────────────────────────────────────────────── */
function renderList(el) {
  const open = S.list.filter(i => !i.done), done = S.list.filter(i => i.done);
  const est = estimate(S.list);
  const doneEst = estimate(done);
  const allCats = D.meta ? Object.entries(D.meta.categories).filter(([k]) => +k < 86) : [];
  el.innerHTML = `
    <div class="field" style="margin-bottom:12px">${I.plus}<input id="newItem" list="catlist" placeholder="Добави продукт (напр. кисело мляко)"><button class="btn primary small" id="addBtn">Добави</button></div>
    <datalist id="catlist">${allCats.map(([, n]) => `<option value="${esc(n)}">`).join('')}</datalist>
    ${S.list.length ? '' : `<div class="card empty"><div class="ico">🛒</div>Списъкът е празен.<br>Добави продукти тук, от <b>Цени</b> или от рецептите в <b>Меню</b>.</div>`}
    ${est.best ? `<div class="card hero"><div class="muted small">Най-изгодно за целия списък · ${esc(subtitleFor())}</div>
      <div class="row between"><div class="big">${esc(chainName(est.best.ch))}</div><div class="big">~${eur(est.best.total)}</div></div>
      <div class="muted small">${est.best.covered} от ${S.list.length} продукта с налични цени${est.unpriced ? ` · ${est.unpriced} без категория` : ''}</div>
      ${est.split ? `<div class="kpi" style="margin-top:10px">🔀 В два магазина: <b style="display:inline">${esc(chainName(est.split.a))} + ${esc(chainName(est.split.b))}</b> — ~${eur(est.split.total)} (спестяваш ${eur(est.best.total - est.split.total)})</div>` : ''}
    </div>
    <div class="card"><h2>Сравнение по вериги</h2><div class="bars">${est.chains.filter(c => c.covered).map(c => {
      const mx = Math.max(...est.chains.map(x => x.total));
      return `<div class="bar"><span class="ellipsis">${esc(chainName(c.ch))}</span><div class="track"><div class="fill" style="width:${(c.total / mx * 100).toFixed(0)}%;background:${(CHAIN_INFO[c.ch] || {}).color || 'var(--primary)'}"></div></div><span class="v">${eur(c.total)}</span></div>`;
    }).join('')}</div><div class="muted small" style="margin-top:8px">Ориентировъчно — по средната цена на продукта във веригата в града (или по точния продукт, ако си го избрал от Цени). Брой продукти с цена във всяка верига може да се различава.</div></div>` : ''}
    ${open.length ? `<div class="card"><h2>За купуване (${open.length})</h2><ul class="list">${open.map(itemLi).join('')}</ul></div>` : ''}
    ${done.length ? `<div class="card"><h2>В количката (${done.length}) <button class="more" id="clearDone">Изчисти</button></h2><ul class="list">${done.map(itemLi).join('')}</ul>
      <button class="btn accent block" id="tripBtn" style="margin-top:10px">${I.check} Пазарувах — запиши покупката</button>
      ${doneEst.best ? `<div class="muted small" style="margin-top:6px;text-align:center">Ориентировъчно: ~${eur(doneEst.best.total)} в ${esc(chainName(doneEst.best.ch))}</div>` : ''}</div>` : ''}
    ${!done.length && S.list.length ? `<button class="btn tonal block" id="tripBtn">🧾 Запиши пазаруване без списък</button>` : ''}
    ${!S.list.length ? `<button class="btn tonal block" id="tripBtn">🧾 Запиши пазаруване</button>` : ''}`;
  const inp = el.querySelector('#newItem');
  const add = () => {
    const v = inp.value.trim(); if (!v) return;
    const cat = Object.entries(D.meta ? D.meta.categories : {}).find(([, n]) => norm(n) === norm(v));
    const c = cat ? +cat[0] : guessCat(v);
    S.list.unshift({ id: uid(), name: v, cat: c, qty: 1, done: false, added: Date.now() });
    save(); const h = harmMatch(v, c); if (h) toast(`⛔ ${v}: ${h.name}`);
    renderList(el); render(); el.querySelector('#newItem').focus();
  };
  el.querySelector('#addBtn').onclick = add;
  inp.onkeydown = e => { if (e.key === 'Enter') add(); };
  el.querySelectorAll('[data-check]').forEach(b => b.onclick = () => { const it = S.list.find(i => i.id === b.dataset.check); it.done = !it.done; save(); render(); });
  el.querySelectorAll('[data-qty]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.qty.split(':'); const it = S.list.find(i => i.id === id); it.qty = Math.max(1, (it.qty || 1) + +d); save(); render(); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.list = S.list.filter(i => i.id !== b.dataset.del); save(); render(); });
  const cd = el.querySelector('#clearDone'); if (cd) cd.onclick = () => { S.list = S.list.filter(i => !i.done); save(); render(); };
  const tb = el.querySelector('#tripBtn'); if (tb) tb.onclick = () => tripDialog();
}
function itemLi(i) {
  const h = harmMatch(i.name, i.cat);
  let price = '';
  if (D.idx && D.idx.chains.length) {
    const ps = D.idx.chains.map(ch => [ch, itemPrice(i, ch)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]);
    if (ps.length) price = `<div class="price">${eur(ps[0][1] * (i.qty || 1))}</div><div class="muted small">${esc(chainName(ps[0][0]))}</div>`;
  }
  return `<li class="li ${i.done ? 'done' : ''}" style="cursor:default"><button class="check ${i.done ? 'on' : ''}" data-check="${i.id}">${i.done ? I.check : ''}</button>
    <div class="grow"><div class="title">${esc(i.name)}</div><div class="muted small">${esc(i.cat ? catName(i.cat) : 'без категория')}${i.product ? ' · ' + esc(chainName(i.product.chain)) : ''}${i.from ? ' · ' + esc(i.from) : ''}${h ? ` · <span class="tag bad">⛔ ${esc(h.name)}</span>` : drCatTag(i.cat)}</div></div>
    <div class="qty"><button data-qty="${i.id}:-1">−</button><span>${i.qty || 1}</span><button data-qty="${i.id}:1">+</button></div>
    <div class="trail" style="min-width:64px">${price}</div>
    <button class="iconbtn" data-del="${i.id}" aria-label="Изтрий" style="width:32px;height:32px">${I.del}</button></li>`;
}
function tripDialog() {
  const done = S.list.filter(i => i.done);
  const est = estimate(done);
  const chains = (D.idx && D.idx.chains.length ? D.idx.chains : MAIN_CHAINS);
  const def = est.best ? est.best.ch : chains[0];
  const stores = ch => (D.city && D.city.storeList && D.city.storeList[ch]) || [];
  openSheet(`<h3>🧾 Запиши пазаруване</h3><div class="muted small">${done.length ? `${done.length} продукта от списъка` : 'Без списък'}</div>
    <label class="lbl">Магазин (верига)</label>
    <select class="input" id="tc">${chains.map(c => `<option value="${esc(c)}" ${c === def ? 'selected' : ''}>${esc(chainName(c))}</option>`).join('')}<option value="other">Друг магазин / пазар</option><option value="online">Онлайн</option></select>
    <label class="lbl">Обект</label><select class="input" id="ts"></select>
    <label class="lbl">Платена сума (€)</label><input class="input" id="ta" type="number" inputmode="decimal" step="0.01" placeholder="0,00">
    <label class="lbl">Дата</label><input class="input" id="td" type="date" value="${todayISO()}">
    <div class="muted small" id="tp" style="margin-top:8px"></div>
    <button class="btn primary block" id="tsave" style="margin-top:14px">Запиши</button>`, el => {
    const tc = el.querySelector('#tc'), ts = el.querySelector('#ts'), ta = el.querySelector('#ta'), tp = el.querySelector('#tp');
    const upd = () => {
      const st = stores(tc.value);
      ts.innerHTML = `<option value="">—</option>` + st.map(s => `<option>${esc(s)}</option>`).join('');
      const e = est.chains.find(c => c.ch === tc.value);
      tp.textContent = e && e.covered ? `Ориентировъчно по списъка в ${chainName(tc.value)}: ${eur(e.total)}` : '';
      if (e && e.covered && !ta.value) ta.placeholder = e.total.toFixed(2);
    };
    tc.onchange = upd; upd();
    el.querySelector('#tsave').onclick = () => {
      const amount = parseFloat(String(ta.value || ta.placeholder).replace(',', '.'));
      if (!(amount > 0)) { toast('Въведи платената сума'); return; }
      const e = est.chains.find(c => c.ch === tc.value);
      S.trips.push({ id: uid(), date: el.querySelector('#td').value || todayISO(), chain: tc.value, store: ts.value, amount,
        planned: e && e.covered ? +e.total.toFixed(2) : 0, fromList: done.length > 0, city: S.settings.city,
        items: done.map(i => ({ n: i.name, c: i.cat, q: i.qty || 1 })) });
      S.list = S.list.filter(i => !i.done);
      save(); closeSheet(); render(); toast('Пазаруването е записано');
    };
  });
}

/* ─── Рецепти ───────────────────────────────────────────────────────────── */
let recipeGroup = 'all';
function renderRecipes(el) {
  const menu = weekMenu();
  const list = RECIPES.filter(r => recipeGroup === 'all' || r.group === recipeGroup);
  el.innerHTML = `
    <div class="card"><h2>🗓️ Тази седмица предлагаме <button class="more" id="reroll">${I.shuffle}</button></h2>
      <div class="muted small" style="margin-bottom:10px">3 местни ястия и 1 салата · сезонни · без забранените ти храни</div>
      <div class="menu-grid">${menu.map(recipeTile).join('')}</div>
      <button class="btn primary block" id="addMenu" style="margin-top:12px">${I.cart} Добави продуктите за седмицата в списъка</button>
    </div>
    <div class="section-title">Директория с рецепти</div>
    <div class="chips"><button class="chip ${recipeGroup === 'all' ? 'on' : ''}" data-rg="all">Всички</button>${RECIPE_GROUPS.map(g => `<button class="chip ${recipeGroup === g.id ? 'on' : ''}" data-rg="${g.id}">${g.icon} ${esc(g.name)}</button>`).join('')}</div>
    ${RECIPE_GROUPS.filter(g => recipeGroup === 'all' || g.id === recipeGroup).map(g => {
      const rs = list.filter(r => r.group === g.id); if (!rs.length) return '';
      return `<div class="card"><h2>${g.icon} ${esc(g.name)}</h2><ul class="list">${rs.map(r => { const b = recipeBlocked(r);
        return `<li class="li" data-recipe="${r.id}"><div class="lead">${g.icon}</div><div class="grow"><div class="title">${esc(r.name)}</div><div class="muted small">⏱ ${r.time} мин · ${r.ing.length} продукта${b ? ` · <span class="tag bad">⛔ ${esc(b.name)}</span>` : ''}</div></div></li>`; }).join('')}</ul></div>`;
    }).join('')}`;
  el.querySelector('#reroll').onclick = () => { weekMenu(true); renderRecipes(el); toast('Ново меню за седмицата'); };
  el.querySelector('#addMenu').onclick = () => { const n = sum(menu.map(addIngredients)); toast(n ? `Добавени ${n} продукта` : 'Продуктите вече са в списъка'); };
  el.querySelectorAll('[data-rg]').forEach(b => b.onclick = () => { recipeGroup = b.dataset.rg; renderRecipes(el); });
  bindCommon(el);
}

/* ─── Още ───────────────────────────────────────────────────────────────── */
function renderMore(el) {
  const items = [
    ['doctor', '🩺', 'My Doctor', 'Персонален хранителен режим, изследвания, към кой лекар'],
    ['stats', '📊', 'Статистика', 'Разходи по месеци, магазини, интензивност, пазарни индекси'],
    ['news', '📰', 'Новини', 'Цени, промоции, проверки и санкции, изтеглени храни'],
    ['stores', '📍', 'Магазини и карта', 'Любими вериги, най-близките обекти в Google Maps'],
    ['online', '🌐', 'eBay и онлайн', 'Търсене в eBay, eMAG, eBag, Amazon и др.'],
    ['banned', '⛔', 'Забранени храни', 'Избери вредните храни, които да избягваш'],
    ['settings', '⚙️', 'Настройки', 'Град, данни, резервно копие'],
  ];
  el.innerHTML = `<div class="card"><ul class="list">${items.map(([id, e, t, d]) => `<li class="li" data-go2="${id}"><div class="lead">${e}</div><div class="grow"><div class="title">${t}</div><div class="muted small">${d}</div></div><span class="muted">›</span></li>`).join('')}</ul></div>
    <div class="card"><h2>За MAMA</h2><div class="small muted">MAMA — My Amazing Market Area. Цените идват от отворените данни на Комисията за защита на потребителите (портал „Колко струва“), които големите вериги подават всеки ден по закон. Прогнозата за времето е от Open-Meteo. Всички твои данни (списък, покупки, статистика) се пазят само на телефона.</div></div>`;
  bindCommon(el);
}

/* ─── Статистика ────────────────────────────────────────────────────────── */
let statMonth = monthKey(new Date());
function renderStats(el) {
  const trips = S.trips.filter(t => t.date.startsWith(statMonth));
  const total = sum(trips.map(t => t.amount));
  const [y, m] = statMonth.split('-').map(Number);
  const byChain = {}; trips.forEach(t => byChain[t.chain] = (byChain[t.chain] || 0) + t.amount);
  const chainRows = Object.entries(byChain).sort((a, b) => b[1] - a[1]);
  const byWd = Array(7).fill(0); trips.forEach(t => byWd[new Date(t.date).getDay()]++);
  const months = []; for (let i = 5; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); const k = monthKey(d); months.push([MONTHS_S[d.getMonth()], sum(S.trips.filter(t => t.date.startsWith(k)).map(t => t.amount)), k === statMonth]); }
  const mx = Math.max(1, ...months.map(x => x[1]));
  const planned = trips.filter(t => t.planned > 0);
  const pSum = sum(planned.map(t => t.planned)), aSum = sum(planned.map(t => t.amount));
  const sorted = [...trips].sort((a, b) => a.date.localeCompare(b.date));
  const gaps = sorted.slice(1).map((t, i) => (new Date(t.date) - new Date(sorted[i].date)) / 86400000);
  const usageDays = Object.keys(S.usage).filter(d => d.startsWith(statMonth)).length;
  const opens = sum(Object.entries(S.usage).filter(([d]) => d.startsWith(statMonth)).map(([, n]) => n));
  const catCount = {}; trips.forEach(t => (t.items || []).forEach(i => { const k = i.c ? catName(i.c) || i.n : i.n; catCount[k] = (catCount[k] || 0) + (i.q || 1); }));
  const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const busyWd = byWd.indexOf(Math.max(...byWd));
  // Пазар
  const nat = D.national;
  const promoShare = nat ? Object.entries(nat.promo).filter(([, v]) => v.rows > 50).map(([ch, v]) => [ch, v.promo / v.rows]).sort((a, b) => b[1] - a[1]).slice(0, 8) : [];
  const ci = chainIndex();
  el.innerHTML = `
    <div class="row between" style="margin-bottom:10px">
      <button class="btn tonal small" id="pm">‹</button><b>${MONTHS[m - 1]} ${y}</b><button class="btn tonal small" id="nm">›</button>
    </div>
    <div class="card hero"><div class="muted small">Похарчени</div><div class="big">${eur(total)}</div>
      <div class="kpis"><div class="kpi"><b>${trips.length}</b><span>пазарувания</span></div>
      <div class="kpi"><b>${trips.length ? eur(total / trips.length, 0) : '—'}</b><span>средна сметка</span></div>
      <div class="kpi"><b>${gaps.length ? (sum(gaps) / gaps.length).toFixed(1) : '—'}</b><span>дни между</span></div></div></div>
    <div class="card"><h2>📈 Последните 6 месеца</h2><div class="cols">${months.map(([l, v, now]) => `<div class="c"><span>${v ? Math.round(v) : ''}</span><i class="${now ? 'now' : ''}" style="height:${(v / mx * 85).toFixed(0)}%"></i>${l}</div>`).join('')}</div></div>
    <div class="card"><h2>🏪 Къде пазарувам</h2>${chainRows.length ? `<div class="bars">${chainRows.map(([ch, v]) => `<div class="bar"><span class="ellipsis">${esc(ch === 'other' ? 'Друг' : ch === 'online' ? 'Онлайн' : chainName(ch))}</span><div class="track"><div class="fill" style="width:${(v / chainRows[0][1] * 100).toFixed(0)}%;background:${(CHAIN_INFO[ch] || {}).color || 'var(--primary)'}"></div></div><span class="v">${eur(v, 0)}</span></div>`).join('')}</div>` : '<div class="muted">Няма записани пазарувания този месец.</div>'}</div>
    <div class="card"><h2>📝 По списък vs реално</h2>${planned.length ? `<div class="row between"><div>Ориентировъчно<div class="price">${eur(pSum)}</div></div><div>Платено<div class="price">${eur(aSum)}</div></div><div>Разлика<div class="price" style="color:${aSum > pSum ? 'var(--bad)' : 'var(--good)'}">${aSum > pSum ? '+' : ''}${eur(aSum - pSum)}</div></div></div>
      <div class="muted small" style="margin-top:6px">${planned.length} от ${trips.length} пазарувания са по списъка.</div>` : '<div class="muted">Още няма пазарувания по списъка с налични цени.</div>'}</div>
    <div class="card"><h2>⚡ Интензивност</h2>
      <div class="cols" style="height:90px">${byWd.map((n, i) => `<div class="c"><span>${n || ''}</span><i style="height:${(n / Math.max(1, ...byWd) * 75).toFixed(0)}%"></i>${WD[i]}</div>`).join('')}</div>
      <div class="small muted" style="margin-top:8px">${trips.length ? `Най-често пазаруваш в ${WD_FULL[busyWd]}.` : ''} Отваряш MAMA в ${usageDays} дни този месец (${opens} пъти).</div></div>
    ${topCats.length ? `<div class="card"><h2>🧺 Какво купувам най-често</h2><ul class="list">${topCats.map(([n, q]) => `<li class="li" style="cursor:default"><div class="grow">${esc(n)}</div><b>${q}×</b></li>`).join('')}</ul></div>` : ''}
    ${trips.length ? `<div class="card"><h2>🧾 Пазарувания</h2><ul class="list">${[...trips].reverse().map(t => `<li class="li" style="cursor:default">${chainBadge(t.chain)}<div class="grow"><div class="title">${esc(t.chain === 'other' ? 'Друг магазин' : t.chain === 'online' ? 'Онлайн' : chainName(t.chain))}</div><div class="muted small">${fmtDate(t.date)}${t.store ? ' · ' + esc(t.store) : ''}${t.items && t.items.length ? ` · ${t.items.length} продукта` : ''}</div></div><div class="trail"><div class="price">${eur(t.amount)}</div><button class="btn tonal small" data-deltrip="${t.id}">изтрий</button></div></li>`).join('')}</ul></div>` : ''}
    <div class="section-title">Пазарът</div>
    ${ci.length ? `<div class="card"><h2>🏆 Ценово ниво на веригите · ${esc(subtitleFor())}</h2><div class="bars">${ci.map(x => `<div class="bar"><span class="ellipsis">${esc(chainName(x.ch))}</span><div class="track"><div class="fill" style="width:${Math.min(100, (x.score - 95) * 4)}%;background:${(CHAIN_INFO[x.ch] || {}).color || 'var(--primary)'}"></div></div><span class="v">${x.score.toFixed(0)}</span></div>`).join('')}</div><div class="muted small" style="margin-top:6px">Индекс 100 = най-ниската медианна цена в категорията.</div></div>` : ''}
    ${promoShare.length ? `<div class="card"><h2>🏷️ Интензивност на промоциите (страната)</h2><div class="bars">${promoShare.map(([ch, v]) => `<div class="bar"><span class="ellipsis">${esc(chainName(ch))}</span><div class="track"><div class="fill" style="width:${(v / promoShare[0][1] * 100).toFixed(0)}%;background:var(--accent)"></div></div><span class="v">${(v * 100).toFixed(1)}%</span></div>`).join('')}</div><div class="muted small" style="margin-top:6px">Дял на цените в промоция от всички подадени към ${D.national ? fmtDate(D.national.date) : ''}.</div></div>` : ''}
    ${D.hist && D.hist.dates.length > 1 ? `<div class="card"><h2>📉 Как се движат цените</h2><select class="input" id="trCat">${D.meta ? Object.entries(D.meta.categories).filter(([k]) => +k < 86).map(([k, n]) => `<option value="${k}" ${k === '6' ? 'selected' : ''}>${esc(n)}</option>`).join('') : ''}</select><div id="trBox">${trendCard('6')}</div></div>` : ''}`;
  el.querySelector('#pm').onclick = () => { statMonth = monthKey(new Date(y, m - 2, 1)); renderStats(el); };
  el.querySelector('#nm').onclick = () => { statMonth = monthKey(new Date(y, m, 1)); renderStats(el); };
  const tr = el.querySelector('#trCat'); if (tr) tr.onchange = () => el.querySelector('#trBox').innerHTML = trendCard(tr.value) || '<div class="muted small">Няма история за тази категория.</div>';
  el.querySelectorAll('[data-deltrip]').forEach(b => b.onclick = () => { if (confirm('Изтриване на пазаруването?')) { S.trips = S.trips.filter(t => t.id !== b.dataset.deltrip); save(); renderStats(el); } });
}

/* ─── Новини ────────────────────────────────────────────────────────────── */
let newsGroup = 'all';
function renderNews(el) {
  const items = D.news ? D.news.items : [];
  const groups = [...new Map(items.map(n => [n.g, n.gn])).entries()];
  const shown = items.filter(n => newsGroup === 'all' || n.g === newsGroup);
  el.innerHTML = `
    <div class="chips"><button class="chip ${newsGroup === 'all' ? 'on' : ''}" data-ng="all">Всички</button>${groups.map(([g, n]) => `<button class="chip ${newsGroup === g ? 'on' : ''}" data-ng="${esc(g)}">${esc(n)}</button>`).join('')}</div>
    <div class="card">${shown.length ? shown.map(newsItem).join('') : `<div class="empty"><div class="ico">📰</div>${D.news ? 'Няма новини в тази група.' : 'Новините се обновяват няколко пъти на ден.'}</div>`}</div>
    <div class="section-title">Официални източници и сайтове</div>
    <div class="card"><ul class="list">${NEWS_SITES.map(s => `<li class="li" data-url="${esc(s.url)}"><div class="lead">🔗</div><div class="grow"><div class="title">${esc(s.name)}</div><div class="muted small">${esc(s.note)}</div></div><span class="muted">↗</span></li>`).join('')}</ul></div>`;
  el.querySelectorAll('[data-ng]').forEach(b => b.onclick = () => { newsGroup = b.dataset.ng; renderNews(el); });
  bindCommon(el);
}

/* ─── Магазини и карта ──────────────────────────────────────────────────── */
let mapChain = null;
function favs() { if (!S.favs) S.favs = [...MAIN_CHAINS]; return S.favs; }
function mapsSearch(q, c) { return c ? `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${c.lat},${c.lon},14z` : `https://www.google.com/maps/search/${encodeURIComponent(q)}`; }
function renderStores(el) {
  const f = favs();
  const c = S.settings.coords || (cityInfo() && cityInfo()[5] != null ? { lat: cityInfo()[5], lon: cityInfo()[6] } : null);
  const chains = [...new Set([...MAIN_CHAINS, ...(D.idx ? D.idx.chains : [])])];
  const sel = mapChain || f[0] || 'kaufland';
  const q = `${chainName(sel)} супермаркет`;
  const embed = c ? `https://maps.google.com/maps?q=${encodeURIComponent(chainName(sel))}&ll=${c.lat},${c.lon}&z=13&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(q + ' ' + subtitleFor())}&z=12&output=embed`;
  const sl = D.city && D.city.storeList ? D.city.storeList : {};
  el.innerHTML = `
    <div class="card"><h2>⭐ Любими вериги</h2><div class="chips" style="flex-wrap:wrap">${chains.map(ch => `<button class="chip ${f.includes(ch) ? 'on' : ''}" data-fav="${esc(ch)}">${f.includes(ch) ? '★' : '☆'} ${esc(chainName(ch))}</button>`).join('')}</div></div>
    <div class="card"><h2>🗺️ Най-близо до теб</h2>
      <div class="chips">${f.map(ch => `<button class="chip ${ch === sel ? 'on' : ''}" data-mc="${esc(ch)}">${esc(chainName(ch))}</button>`).join('')}</div>
      <iframe class="mapframe" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="${esc(embed)}" title="Карта"></iframe>
      <div class="row" style="margin-top:10px;gap:8px">
        <button class="btn primary grow" id="openMaps">${I.map} Отвори в Google Maps</button>
        <button class="btn tonal" id="locBtn">📡</button>
      </div>
      <div class="muted small" style="margin-top:6px">${S.settings.coords ? 'По текущото ти местоположение.' : 'Натисни 📡, за да използваме местоположението ти.'}</div>
    </div>
    ${f.filter(ch => sl[ch]).map(ch => `<div class="card"><h2>${chainBadge(ch)} ${esc(chainName(ch))} · ${sl[ch].length} обекта в ${esc(subtitleFor())}</h2><ul class="list">${sl[ch].slice(0, 30).map(a => `<li class="li" data-nav="${esc(chainName(ch) + ', ' + a)}"><div class="lead">📍</div><div class="grow ellipsis">${esc(a)}</div><span class="tag best">маршрут</span></li>`).join('')}</ul></div>`).join('')}`;
  el.querySelectorAll('[data-fav]').forEach(b => b.onclick = () => { const ch = b.dataset.fav; S.favs = f.includes(ch) ? f.filter(x => x !== ch) : [...f, ch]; save(); renderStores(el); });
  el.querySelectorAll('[data-mc]').forEach(b => b.onclick = () => { mapChain = b.dataset.mc; renderStores(el); });
  el.querySelector('#openMaps').onclick = () => openExt(mapsSearch(chainName(sel), c));
  el.querySelector('#locBtn').onclick = async () => { const cc = await getCoords(); if (!cc) toast('Разреши достъп до местоположението'); renderStores(el); };
  el.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => openExt(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.dataset.nav)}`));
}

/* ─── Онлайн ────────────────────────────────────────────────────────────── */
let onlineQ = '';
function renderOnline(el) {
  el.innerHTML = `
    <div class="card"><h2>🔎 Търси навсякъде</h2>
      <div class="field">${I.search}<input id="oq" placeholder="Какво търсиш? (напр. кафемашина)" value="${esc(onlineQ)}"></div>
      <div class="muted small" style="margin-top:8px">Избери магазин — търсенето се отваря директно в него.</div></div>
    <div class="card"><ul class="list">${ONLINE_SHOPS.map(s => `<li class="li" data-shop="${s.id}"><span class="chainbadge" style="background:${s.color}">${esc(s.name.slice(0, 6))}</span><div class="grow"><div class="title">${esc(s.name)}</div><div class="muted small">Търси „${esc(onlineQ || '…')}“</div></div><span class="muted">↗</span></li>`).join('')}</ul></div>
    <div class="section-title">Сайтовете на веригите</div>
    <div class="card"><ul class="list">${MAIN_CHAINS.concat(['ebag', 'metro', 'cba']).map(ch => `<li class="li" data-url="${esc(CHAIN_INFO[ch].site)}">${chainBadge(ch)}<div class="grow"><div class="title">${esc(CHAIN_INFO[ch].name)}</div><div class="muted small">Сайт, брошури и седмични оферти</div></div><span class="muted">↗</span></li>`).join('')}</ul></div>
    ${S.list.filter(i => !i.done).length ? `<div class="card"><h2>От списъка ти</h2><div class="chips" style="flex-wrap:wrap">${S.list.filter(i => !i.done).slice(0, 12).map(i => `<button class="chip" data-q="${esc(i.name)}">${esc(i.name)}</button>`).join('')}</div></div>` : ''}`;
  const oq = el.querySelector('#oq');
  oq.oninput = () => { onlineQ = oq.value; el.querySelectorAll('[data-shop] .muted.small').forEach(x => x.textContent = `Търси „${onlineQ || '…'}“`); };
  el.querySelectorAll('[data-shop]').forEach(b => b.onclick = () => {
    if (!onlineQ.trim()) { toast('Напиши какво търсиш'); oq.focus(); return; }
    openExt(ONLINE_SHOPS.find(s => s.id === b.dataset.shop).url(onlineQ.trim()));
  });
  el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => { onlineQ = b.dataset.q; renderOnline(el); });
  bindCommon(el);
}

/* ─── Забранени ─────────────────────────────────────────────────────────── */
function renderBanned(el) {
  el.innerHTML = `
    <div class="notice info">ℹ️ <div>Избери храните, които искаш да избягваш. MAMA ще ги маркира в цените, списъка и промоциите и няма да ги включва в седмичното меню. Описанията са общи — за лични хранителни ограничения се консултирай с лекар.</div></div>
    <div class="card"><ul class="list">${HARMFUL.map(h => `<li class="li" style="cursor:default;align-items:flex-start"><div class="lead">${h.icon}</div>
      <div class="grow"><div class="title">${esc(h.name)} <span class="tag ${h.level === 'висок' ? 'bad' : 'warn'}">${h.level === 'висок' ? 'вредно' : 'ограничи'}</span></div><div class="muted small">${esc(h.why)}</div></div>
      <button class="toggle ${S.banned.includes(h.id) ? 'on' : ''}" data-ban="${h.id}" aria-label="Забрани"></button></li>`).join('')}</ul></div>
    <div class="card"><h2>Мои забранени продукти</h2>
      <div class="field">${I.plus}<input id="cb" placeholder="напр. майонеза, палмово масло"><button class="btn primary small" id="cbAdd">Добави</button></div>
      <div class="chips" style="flex-wrap:wrap;margin-top:10px">${S.customBanned.map(w => `<button class="chip on" data-unban="${esc(w)}">⛔ ${esc(w)} ✕</button>`).join('') || '<span class="muted small">Няма добавени.</span>'}</div></div>`;
  el.querySelectorAll('[data-ban]').forEach(b => b.onclick = () => { const id = b.dataset.ban; S.banned = S.banned.includes(id) ? S.banned.filter(x => x !== id) : [...S.banned, id]; save(); renderBanned(el); });
  el.querySelector('#cbAdd').onclick = () => { const v = el.querySelector('#cb').value.trim(); if (v && !S.customBanned.includes(v)) { S.customBanned.push(v); save(); } renderBanned(el); };
  el.querySelectorAll('[data-unban]').forEach(b => b.onclick = () => { S.customBanned = S.customBanned.filter(x => x !== b.dataset.unban); save(); renderBanned(el); });
}

/* ─── Настройки ─────────────────────────────────────────────────────────── */
function renderSettings(el) {
  const ci = cityInfo();
  el.innerHTML = `
    <div class="card"><h2>📍 Населено място</h2><div class="row"><div class="grow">${esc(ci ? ci[1] + ', обл. ' + ci[2] : 'не е избрано')}</div><button class="btn tonal small" id="sc">Смени</button></div></div>
    <div class="card"><h2>🗂️ Данни за цените</h2>
      <div class="muted small">${D.meta ? `Последно обновяване: ${fmtDate(D.meta.date)} · ${Object.keys(D.meta.chains).length} вериги · ${D.meta.cities.length} населени места` : 'Не са заредени.'}</div>
      <label class="lbl">Адрес на данните</label><input class="input" id="du" value="${esc(S.settings.dataUrl)}">
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn primary small" id="dsave">Запази</button><button class="btn tonal small" id="dref">Обнови сега</button></div>
      <div class="muted small" style="margin-top:8px">Източник: ${esc(D.meta ? D.meta.source : 'КЗП „Колко струва“')}</div></div>
    <div class="card"><h2>💾 Резервно копие</h2><div class="muted small">Списък, покупки, менюта и настройки.</div>
      <div class="row" style="margin-top:10px;gap:8px"><button class="btn tonal small" id="exp">Копирай</button><button class="btn tonal small" id="imp">Възстанови</button><button class="btn tonal small" id="rst" style="color:var(--bad)">Изтрий всичко</button></div></div>
    <div class="muted small" style="text-align:center">MAMA — My Amazing Market Area · версия 1.0<br>© 2026 Николай Герчев. Всички права запазени.</div>`;
  el.querySelector('#sc').onclick = pickCity;
  el.querySelector('#dsave').onclick = () => { S.settings.dataUrl = el.querySelector('#du').value.trim() || DEFAULT_DATA_URL; save(); loadData(true); toast('Запазено'); };
  el.querySelector('#dref').onclick = () => { loadData(true); toast('Обновяване…'); };
  el.querySelector('#exp').onclick = async () => {
    const data = JSON.stringify(Object.assign({}, S, { cache: {} }));
    try { await navigator.clipboard.writeText(data); toast('Копирано в клипборда'); }
    catch (e) { openSheet(`<h3>Резервно копие</h3><textarea class="input" rows="8">${esc(data)}</textarea>`); }
  };
  el.querySelector('#imp').onclick = () => openSheet(`<h3>Възстановяване</h3><div class="muted small">Постави копираното резервно копие.</div><textarea class="input" id="impT" rows="8" style="margin-top:8px"></textarea><button class="btn primary block" id="impB" style="margin-top:10px">Възстанови</button>`, s => {
    s.querySelector('#impB').onclick = () => {
      try { const v = JSON.parse(s.querySelector('#impT').value); ['settings', 'list', 'trips', 'menus', 'usage', 'favs', 'banned', 'customBanned', 'doctor'].forEach(k => { if (v[k] !== undefined) S[k] = v[k]; }); save(); closeSheet(); loadData(true); toast('Възстановено'); }
      catch (e) { toast('Невалидни данни'); }
    };
  });
  el.querySelector('#rst').onclick = () => { if (confirm('Да се изтрият ли всички данни в MAMA?')) { localStorage.removeItem(KEY); location.reload(); } };
}

/* ─── Старт ─────────────────────────────────────────────────────────────── */
function init() {
  const d = todayISO(); S.usage[d] = (S.usage[d] || 0) + 1;
  const cutoff = iso(Date.now() - 400 * 86400000); for (const k in S.usage) if (k < cutoff) delete S.usage[k];
  save();
  document.querySelectorAll('nav.bottom button').forEach(b => b.onclick = () => go(b.dataset.go));
  $('#backBtn').onclick = back;
  $('#scrim').onclick = closeSheet;
  $('#refreshBtn').onclick = () => { S.cache.weather = null; loadData(true); loadWeather(); toast('Обновяване…'); };
  document.addEventListener('backbutton', back);
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
    window.Capacitor.Plugins.App.addListener('backButton', () => { if (current === 'home' && !sheetOpen()) window.Capacitor.Plugins.App.exitApp(); else back(); });
  }
  go('home', false);
  loadData().then(loadWeather);
}
document.addEventListener('DOMContentLoaded', init);
