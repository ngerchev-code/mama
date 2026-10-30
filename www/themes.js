/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Тематична седмица + ново съдържание (рецепти и теми) от content.json — обновява се без нова версия на приложението. */
const CONTENT_URL = 'https://ngerchev-code.github.io/mama/content.json';
let CONTENT = null;
const WDAYS = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];

function applyContent(c) {
  if (!c || !Array.isArray(c.themes)) return;
  CONTENT = c;
  (c.recipes || []).forEach(r => { if (!r || !r.id || RECIPES.some(x => x.id === r.id)) return; RECIPES.push(Object.assign({ season: 'all', serv: 2, steps: [] }, r)); });
}
async function loadContent() {
  const cached = S.cache.content;
  if (cached && cached.v) applyContent(cached.v);
  if (!CONTENT) { try { const r = await fetch('content.json', { cache: 'no-store' }); if (r.ok) applyContent(await r.json()); } catch (e) {} }
  if (cached && Date.now() - cached.t < 6 * 3600e3) return;
  try {
    const r = await fetch(CONTENT_URL + '?t=' + Date.now(), { cache: 'no-store' }); if (!r.ok) return;
    const c = await r.json();
    if (!CONTENT || (c.v || 0) >= (CONTENT.v || 0)) { applyContent(c); S.cache.content = { t: Date.now(), v: c }; save(); }
  } catch (e) {}
}

/* ─── коя е темата ─── */
function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; }
function themeFor(date = new Date()) {
  if (!CONTENT) return null;
  const wk = isoWeek(date), mon = mondayOf(date), start = new Date((CONTENT.startMonday || '2026-11-02') + 'T00:00');
  let id = (CONTENT.schedule || {})[wk];
  if (!id) {
    const n = Math.round((mon - start) / (7 * 864e5)); if (n < 0) return null;
    const rot = CONTENT.rotation || CONTENT.themes.map(t => t.id); id = rot[n % rot.length];
  }
  const th = CONTENT.themes.find(t => t.id === id); if (!th) return null;
  return Object.assign({ wk, mon, day: (date.getDay() + 6) % 7 }, th);
}
function nextTheme() { const d = new Date(); d.setDate(d.getDate() + 7); return themeFor(d); }
function inFast(d) { const m = d.getMonth() + 1, day = d.getDate(); return (m === 11 && day >= 15) || (m === 12 && day <= 24); }
function themeDishes(th) {
  const P_ = th.pick || {};
  let pool = RECIPES.filter(r => !r.holiday && !['breakfast', 'dessert', 'pastry'].includes(r.group) && prefRecipeOk(r, false) && (
    (P_.c && P_.c.includes(r.c || 'bg')) || (P_.group && r.group === P_.group) || (P_.tag && recipeTags(r)[P_.tag]) || (P_.maxTime && r.time <= P_.maxTime) || (P_.ids && P_.ids.includes(r.id))));
  if (inFast(th.mon)) { const f = pool.filter(r => recipeTags(r).vegan || (recipeTags(r).fish && !recipeTags(r).meat)); if (f.length >= 5) pool = f; }
  if (!pool.length) return [];
  pool = permOf(pool, th.id + th.wk);
  return WDAYS.map((_, i) => pool[i % pool.length]);
}
function themeDish(date = new Date()) { const th = themeFor(date); if (!th) return null; const ds = themeDishes(th); return ds[th.day] || null; }

/* обядът в тематичната седмица = ястието на деня */
(function () {
  const base = mealPick;
  mealPick = function (kind, skip = 0, date = new Date()) {
    if (kind === 'l' && !skip) { const d = themeDish(date); if (d) return d; }
    return base(kind, skip, date);
  };
})();

/* ─── прозорци и карта ─── */
function themeSheet() {
  const th = themeFor(); if (!th) return;
  const ds = themeDishes(th);
  openSheet(`<div class="th-hero"><div class="th-e">${th.e}</div><div><div class="small" style="opacity:.9">Тематична седмица</div><h3 style="color:#fff;margin:2px 0">${esc(th.n)}</h3></div></div>
    <p class="small" style="margin:10px 2px">${esc(th.about)}</p>
    <ul class="list">${ds.map((r, i) => `<li class="li ${i === th.day ? 'th-today' : ''}" data-r="${r.id}"><div class="lead">${groupIcon(r.group)}</div><div class="grow"><div class="muted small">${WDAYS[i]}${i === th.day ? ' · днес' : ''}</div><div class="title">${esc(r.name)}</div></div><span class="muted small">${r.time} мин</span></li>`).join('')}</ul>
    <div class="th-tip">💡 ${esc(th.tip || '')}</div>
    <button class="btn primary block" id="thAdd" style="margin-top:10px">🛒 Добави продуктите за седмицата в списъка</button>`, el => {
    el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => showRecipe(b.dataset.r));
    el.querySelector('#thAdd').onclick = () => { let n = 0; [...new Set(ds)].forEach(r => n += addIngredients(r)); toast(`Добавени ${n} продукта в списъка`); closeSheet(); };
  });
}
function themeCard() {
  const th = themeFor();
  if (!th) { const nx = nextTheme(); return nx ? `<div class="card th-card" id="thCard"><div class="row" style="gap:12px;align-items:center"><div class="th-e">${nx.e}</div><div class="grow"><div class="small" style="opacity:.9">От понеделник започва</div><b style="font-size:17px">${esc(nx.n)}</b><div class="small" style="opacity:.9">Всеки ден ново ястие от темата</div></div></div></div>` : ''; }
  const d = themeDish();
  return `<div class="card th-card" id="thCard"><div class="row" style="gap:12px;align-items:center"><div class="th-e">${th.e}</div><div class="grow"><div class="small" style="opacity:.9">Тематична седмица · ден ${th.day + 1} от 7</div><b style="font-size:17px">${esc(th.n)}</b>${d ? `<div class="small" style="opacity:.95">Днес: <b>${esc(d.name)}</b></div>` : ''}</div><span style="font-size:22px">›</span></div></div>`;
}
function themePopup() {
  const th = themeFor(); if (!th) return false;
  const g = S.guide, d = themeDish();
  const intro = g.thWeek !== th.wk; // първото отваряне за седмицата — представяне
  g.thWeek = th.wk; g.thDay = todayISO(); save();
  const ds = themeDishes(th);
  popup({ theme: 'linear-gradient(140deg,#7c3aed 0%,#db2777 55%,#f97316 100%)', emoji: th.e,
    kicker: intro ? (th.day === 0 ? 'Започва нова тематична седмица!' : 'Тази седмица в MAMA') : `Тематична седмица · ${WDAYS[th.day]}`,
    title: intro ? esc(th.n) : `Днес: ${esc(d ? d.name : th.n)}`,
    text: intro ? `${esc(th.about)}<ul class="bf-ing">${ds.slice(0, 7).map((r, i) => `<li><b>${WDAYS[i].slice(0, 3)}</b> — ${esc(r.name)}</li>`).join('')}</ul>` : `${esc(th.n)} ${th.e} · ден ${th.day + 1} от 7<div class="th-tip" style="margin-top:10px">💡 ${esc(th.tip || '')}</div>`,
    actions: [{ label: d ? '📖 Рецептата за днес' : '🗓️ Менюто на седмицата', primary: true, fn: () => setTimeout(() => d ? showRecipe(d.id) : themeSheet(), 300) }, { label: '🗓️ Цялата седмица', fn: () => setTimeout(themeSheet, 300) }, { label: 'Супер!', fn: null }] });
  return true;
}
function themeCheck() {
  const th = themeFor(); if (!th || !P().onboarded) return;
  if (popOpen || document.querySelector('.onb, .tour, #ow, #call, .greet.in') || (typeof sheetOpen === 'function' && sheetOpen())) return;
  const g = S.guide;
  if (g.thWeek !== th.wk) return themePopup();                       // представяне на седмицата
  if (g.thDay !== todayISO() && g.bf !== todayISO() && new Date().getHours() >= 6) return themePopup(); // всеки ден веднъж, ако не е имало сутрешен прозорец
}
(function () {
  const bHome = renderHome;
  renderHome = function (el) {
    bHome(el);
    const html = themeCard(); if (!html) return;
    const anchor = el.querySelector('.card:not(.ebag):not(.chat-hero)');
    anchor ? anchor.insertAdjacentHTML('beforebegin', html) : el.insertAdjacentHTML('afterbegin', html);
    const c = el.querySelector('#thCard'); if (c && themeFor()) c.onclick = themeSheet;
  };
  const bR = renderRecipes;
  renderRecipes = function (el) {
    bR(el);
    const th = themeFor(); if (!th) return;
    el.insertAdjacentHTML('afterbegin', themeCard());
    el.querySelector('#thCard').onclick = themeSheet;
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  loadContent().then(() => { render(); setTimeout(() => typeof scheduleMeals === 'function' && scheduleMeals(false), 1500); });
  setTimeout(themeCheck, 12000);
  setInterval(themeCheck, 25000);
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { loadContent(); setTimeout(themeCheck, 5000); } });
