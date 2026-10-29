/* MAMA — гид: първоначален избор, обиколка, цветни изскачащи подсещания, известия, „Свят“. */
'use strict';

/* ─── Предпочитания ─────────────────────────────────────────────────────── */
function P() {
  if (!S.prefs) S.prefs = { onboarded: false, name: '', diet: 'all', noPork: false, cuisines: ['bg'], household: 2, notif: true };
  if (!S.guide) S.guide = { last: {}, shown: 0, toured: false };
  return S.prefs;
}
function prefRecipeOk(r, strictCuisine = true) {
  const p = P();
  if (recipeBlocked(r)) return false;
  if (!dietOk(r, p.diet, p.noPork)) return false;
  if (strictCuisine && p.cuisines.length && !p.cuisines.includes(r.c || 'bg')) return false;
  return true;
}
function hello() { const n = (P().name || '').trim(); return n ? `Привет, ${esc(n)}!` : 'Привет!'; }
const daysSince = ts => ts ? (Date.now() - ts) / 86400000 : 1e9;
function mark(k) { P(); S.guide.last[k] = Date.now(); save(); }

/* ─── Меню за седмицата според предпочитанията (заменя базовото) ─────────── */
weekMenu = function (reroll = false) {
  const wk = isoWeek(); const p = P();
  const sig = p.diet + (p.noPork ? 'np' : '') + p.cuisines.join(',') + S.banned.join(',');
  let ids = S.menus[wk];
  const valid = ids && S.menuSig === sig && ids.every(id => { const r = RECIPES.find(x => x.id === id); return r && prefRecipeOk(r, false); });
  if (!valid || reroll) {
    const rnd = reroll ? Math.random : seeded(wk + sig);
    const m = new Date().getMonth() + 1;
    const pool = (g, strict) => RECIPES.filter(r => r.group === g && inSeason(r, m) && prefRecipeOk(r, strict));
    const take = (g, n, chosen) => {
      let a = pool(g, true).filter(r => !chosen.includes(r));
      if (a.length < n) a = a.concat(pool(g, false).filter(r => !chosen.includes(r) && !a.includes(r)));
      a = a.map(r => [r, rnd() + ((r.season !== 'all') ? 0.35 : 0)]).sort((x, y) => y[1] - x[1]).map(x => x[0]);
      return a.slice(0, n);
    };
    const chosen = [];
    chosen.push(...take('soup', 1, chosen));
    chosen.push(...take('main', 3 - chosen.length, chosen));
    chosen.push(...take('salad', 1, chosen));
    ids = chosen.map(r => r.id);
    S.menus = { [wk]: ids }; S.menuSig = sig; save();
  }
  return ids.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
};

/* ─── Откъде да купиш ───────────────────────────────────────────────────── */
function recipeShopHTML(r) {
  const idx = D.idx;
  const items = r.ing.filter(i => i[2] && !/по вкус|щипка/.test(i[1])).map(i => ({ id: i[0], name: i[0], cat: i[2], qty: 1 }));
  if (!idx || !idx.chains.length || !items.length) return `<div class="notice info" style="margin-top:8px">🛒 Цените за продуктите ще се покажат, когато се заредят данните за града ти.</div>`;
  const est = estimate(items);
  const rows = items.map(it => {
    const ps = idx.chains.map(ch => [ch, itemPrice(it, ch)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]);
    return { it, best: ps[0] };
  });
  const chains = est.chains.filter(c => c.covered).slice(0, 5);
  const mx = Math.max(...chains.map(c => c.total));
  const best = est.best;
  return `<div class="section-title" style="margin-left:0">🛒 Откъде да купиш · ${esc(subtitleFor())}</div>
    ${best ? `<div class="pop-mini" style="background:linear-gradient(120deg,#0b8a5f,#4fae2e)"><div><div class="small" style="opacity:.85">Най-изгодно за тази рецепта</div><b style="font-size:18px">${esc(chainName(best.ch))}</b> · ~${eur(best.total)}</div>
      <button class="btn small" style="background:#fff;color:#0b8a5f" data-nav-chain="${esc(best.ch)}">📍 Най-близкия</button></div>` : ''}
    <ul class="list">${rows.map(({ it, best: b }) => `<li class="li" style="cursor:default">${b ? chainBadge(b[0]) : '<div class="lead">❔</div>'}<div class="grow"><div class="title">${esc(it.name)}</div><div class="muted small">${esc(catName(it.cat))}${b ? ' · най-евтино в ' + esc(chainName(b[0])) : ' · няма данни'}</div></div><div class="price">${b ? eur(b[1]) : '—'}</div></li>`).join('')}</ul>
    ${chains.length > 1 ? `<div class="bars" style="margin-top:8px">${chains.map(c => `<div class="bar"><span class="ellipsis">${esc(chainName(c.ch))}</span><div class="track"><div class="fill" style="width:${(c.total / mx * 100).toFixed(0)}%;background:${(CHAIN_INFO[c.ch] || {}).color || 'var(--primary)'}"></div></div><span class="v">${eur(c.total)}</span></div>`).join('')}</div>` : ''}
    <div class="muted small" style="margin-top:6px">Ориентировъчно — средна цена за опаковка на продукта във веригата.</div>`;
}
function navNearestChain(ch) {
  const c = S.settings.coords || (cityInfo() && cityInfo()[5] != null ? { lat: cityInfo()[5], lon: cityInfo()[6] } : null);
  openExt(c ? `https://www.google.com/maps/search/${encodeURIComponent(chainName(ch))}/@${c.lat},${c.lon},14z` : `https://www.google.com/maps/search/${encodeURIComponent(chainName(ch) + ' ' + subtitleFor())}`);
}

/* Рецепта (заменя базовата): кухня, диета, продукти, откъде да купиш, приготвяне */
showRecipe = function (id) {
  const r = RECIPES.find(x => x.id === id); if (!r) return;
  const b = recipeBlocked(r); const cu = cuisineOf(r);
  const dietWarn = !dietOk(r, P().diet, P().noPork);
  openSheet(`<div class="recipe-hero" style="background:${heroGrad(r)}"><div class="emo-big">${groupIcon(r.group)}</div>
      <div><div class="small" style="opacity:.9">${cu.f} ${esc(cu.n)} · ${esc((RECIPE_GROUPS.find(g => g.id === r.group) || {}).name || '')}</div><h3 style="color:#fff">${esc(r.name)}</h3>
      <div class="small" style="opacity:.9">⏱ ${r.time} мин · ${r.serv} порции</div></div></div>
    <div style="margin:8px 0">${dietBadge(r)}</div>
    ${b ? `<div class="notice bad">⛔ Съдържа продукт от забранените: <b>${esc(b.name)}</b></div>` : ''}
    ${dietWarn ? `<div class="notice warn">⚠️ Не отговаря на избрания ти режим (${esc(DIETS.find(d => d.id === P().diet).n)}${P().noPork ? ', без свинско' : ''}).</div>` : ''}
    <div class="section-title" style="margin-left:0">Продукти</div>
    <ul class="list">${r.ing.map(([n, q, c]) => { const h = harmMatch(n, c); return `<li class="li" style="cursor:default"><div class="grow">${esc(n)}${h ? ` <span class="tag bad">${esc(h.name)}</span>` : (typeof drCatTag === 'function' ? drCatTag(c).replace(' · ', ' ') : '')}</div><div class="muted">${esc(q)}</div></li>`; }).join('')}</ul>
    ${recipeShopHTML(r)}
    <div class="section-title" style="margin-left:0">Приготвяне</div>
    <ol class="steps">${r.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
    <button class="btn primary block" id="addIng" style="margin-top:14px">${I.cart} Добави продуктите в списъка</button>`,
  el => {
    el.querySelector('#addIng').onclick = () => { const n = addIngredients(r); closeSheet(); toast(n ? `Добавени ${n} продукта в списъка` : 'Продуктите вече са в списъка'); };
    el.querySelectorAll('[data-nav-chain]').forEach(x => x.onclick = () => navNearestChain(x.dataset.navChain));
  });
};
function heroGrad(r) {
  const g = { soup: '#ff8a3d,#ff5e62', main: '#0b8a5f,#4fae2e', salad: '#43c6ac,#2bb673', pastry: '#f7b733,#fc4a1a', dessert: '#c471f5,#fa71cd' }[r.group] || '#0b8a5f,#17b26a';
  return `linear-gradient(135deg,${g})`;
}

/* Плочка с флаг и диета (заменя базовата) */
recipeTile = function (r) {
  const b = recipeBlocked(r); const cu = cuisineOf(r);
  return `<div class="tile ${b ? 'blocked' : ''}" data-recipe="${r.id}"><div class="row between"><div class="emo">${groupIcon(r.group)}</div><span style="font-size:20px">${cu.f}</span></div>
    <div class="t">${esc(r.name)}</div><div class="muted small">⏱ ${r.time} мин${recipeTags(r).vegan ? ' · 🌱' : recipeTags(r).veg ? ' · 🥚' : ''}${b ? ` · <span class="tag bad">${esc(b.name)}</span>` : ''}</div></div>`;
};

/* ─── Изскачащ прозорец ─────────────────────────────────────────────────── */
const THEMES = {
  orange: 'linear-gradient(135deg,#ff9a3d 0%,#ff5e62 100%)',
  green: 'linear-gradient(135deg,#11998e 0%,#38ef7d 100%)',
  purple: 'linear-gradient(135deg,#8e2de2 0%,#c471f5 60%,#fa71cd 100%)',
  blue: 'linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)',
  pink: 'linear-gradient(135deg,#ff6a88 0%,#ff99ac 100%)',
  sun: 'linear-gradient(135deg,#f7b733 0%,#fc4a1a 100%)',
  teal: 'linear-gradient(135deg,#0b8a5f 0%,#4fae2e 100%)',
  night: 'linear-gradient(135deg,#1d2b64 0%,#5b86e5 100%)',
};
let popOpen = false;
function popup({ theme = 'green', emoji = '💡', kicker = '', title, text = '', actions = [], key = null }) {
  closePopup(true);
  popOpen = true;
  const wrap = document.createElement('div');
  wrap.className = 'pop'; wrap.id = 'pop';
  wrap.innerHTML = `<div class="pop-card" style="background:${THEMES[theme] || theme}">
    <button class="pop-x" aria-label="Затвори">✕</button>
    <div class="pop-emoji">${emoji}</div>
    ${kicker ? `<div class="pop-kicker">${kicker}</div>` : ''}
    <div class="pop-title">${title}</div>
    ${text ? `<div class="pop-text">${text}</div>` : ''}
    <div class="pop-actions">${actions.map((a, i) => `<button class="pop-btn ${a.primary ? 'primary' : ''}" data-i="${i}">${a.label}</button>`).join('')}</div>
    <div class="pop-bubbles"><i></i><i></i><i></i></div></div>`;
  document.body.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  wrap.querySelector('.pop-x').onclick = () => closePopup();
  wrap.onclick = e => { if (e.target === wrap) closePopup(); };
  wrap.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { const a = actions[+b.dataset.i]; closePopup(); if (a && a.fn) setTimeout(a.fn, 180); });
  if (key) mark(key);
  S.guide.shown = Date.now(); save();
  if (navigator.vibrate) try { navigator.vibrate(18); } catch (e) { /* без вибрация */ }
}
function closePopup(instant) {
  const w = document.getElementById('pop'); popOpen = false;
  if (!w) return;
  if (instant) { w.remove(); return; }
  w.classList.remove('open'); setTimeout(() => w.remove(), 220);
}

/* ─── Предложение за ястие ─────────────────────────────────────────────── */
function pickDish(exclude = []) {
  const m = new Date().getMonth() + 1;
  const hot = D.weather && D.weather.current && D.weather.current.temperature_2m < 10;
  let pool = RECIPES.filter(r => ['main', 'soup'].includes(r.group) && inSeason(r, m) && prefRecipeOk(r, true) && !exclude.includes(r.id));
  if (pool.length < 3) pool = RECIPES.filter(r => ['main', 'soup'].includes(r.group) && prefRecipeOk(r, false) && !exclude.includes(r.id));
  const recent = S.guide.recent || [];
  pool = pool.filter(r => !recent.includes(r.id)).length ? pool.filter(r => !recent.includes(r.id)) : pool;
  pool = pool.map(r => [r, Math.random() + (hot && r.group === 'soup' ? 0.4 : 0) + (r.season !== 'all' ? 0.3 : 0)]).sort((a, b) => b[1] - a[1]);
  return pool.length ? pool[0][0] : null;
}
function dishPopup(r, tried = []) {
  r = r || pickDish(tried); if (!r) return;
  S.guide.recent = [r.id, ...(S.guide.recent || [])].slice(0, 8); save();
  const cu = cuisineOf(r);
  const est = D.idx ? estimate(r.ing.filter(i => i[2]).map(i => ({ id: i[0], cat: i[2], qty: 1 }))) : null;
  const dd = new Date().getDay(); const day = WD_FULL[dd]; const nice = [0, 3, 6].includes(dd) ? 'Хубава' : 'Хубав';
  popup({
    theme: ['orange', 'sun', 'pink', 'purple'][Math.floor(Math.random() * 4)], emoji: groupIcon(r.group), key: 'dish',
    kicker: `${hello()} ${nice} ${day}`,
    title: `Искаш ли днес да сготвим <u>${esc(r.name)}</u>?`,
    text: `${cu.f} ${esc(cu.n)} · ⏱ ${r.time} мин · ${r.serv} порции${est && est.best ? `<br>🛒 Продуктите ~${eur(est.best.total)} в <b>${esc(chainName(est.best.ch))}</b>` : ''}`,
    actions: [
      { label: '😋 Да, покажи рецептата', primary: true, fn: () => showRecipe(r.id) },
      { label: '🔄 Друго ястие', fn: () => dishPopup(null, [...tried, r.id]) },
      { label: 'Не сега', fn: null },
    ],
  });
}

/* ─── Подсещания ───────────────────────────────────────────────────────── */
function candidates() {
  const p = P(); const g = S.guide; const L = g.last;
  const open = S.list.filter(i => !i.done);
  const lastTrip = S.trips.length ? Math.max(...S.trips.map(t => new Date(t.date).getTime())) : 0;
  const wd = new Date().getDay(); const h = new Date().getHours();
  const out = [];
  // 1. Ястие — до два пъти седмично
  if (daysSince(L.dish) >= 3 && h >= 9) out.push({ pr: 90, fn: () => dishPopup() });
  // 2. Забранени продукти в списъка
  const bad = open.map(i => [i, harmMatch(i.name, i.cat)]).filter(x => x[1]);
  if (bad.length && daysSince(L.banned) >= 2) out.push({ pr: 85, fn: () => popup({ theme: 'pink', emoji: '⛔', key: 'banned', kicker: 'Внимание', title: bad.length === 1 ? 'Един продукт от списъка е в забранените ти храни' : `${bad.length} продукта от списъка са в забранените ти храни`, text: bad.slice(0, 3).map(([i, hh]) => `• <b>${esc(i.name)}</b> — ${esc(hh.name)}`).join('<br>'), actions: [{ label: 'Виж списъка', primary: true, fn: () => go('list') }, { label: 'ОК', fn: null }] }) });
  // 3. Промоция за продукт от списъка
  if (D.idx && open.length && daysSince(L.promo) >= 2) {
    const hit = open.map(it => [it, D.idx.promos.find(pp => (it.cat && pp.cat === it.cat))]).find(x => x[1]);
    if (hit) out.push({ pr: 80, fn: () => popup({ theme: 'sun', emoji: '🏷️', key: 'promo', kicker: 'Промоция за теб', title: `${esc(hit[0].name)} е с −${Math.round(hit[1].off * 100)}% в ${esc(chainName(hit[1].ch))}`, text: `${esc(hit[1].name)} — <b>${eur(hit[1].price)}</b> вместо ${eur(hit[1].retail)}`, actions: [{ label: '📍 Към магазина', primary: true, fn: () => navNearestChain(hit[1].ch) }, { label: 'Виж списъка', fn: () => go('list') }] }) });
  }
  // 4. Време за пазар
  if (open.length >= 3 && (wd === 5 || wd === 6 || daysSince(lastTrip) > 6) && daysSince(L.shop) >= 2) {
    const e = estimate(open);
    out.push({ pr: 70, fn: () => popup({ theme: 'teal', emoji: '🛒', key: 'shop', kicker: hello(), title: `Време за пазар? В списъка има ${open.length} продукта`, text: e.best ? `Най-изгодно днес: <b>${esc(chainName(e.best.ch))}</b> · ~${eur(e.best.total)}${e.split ? `<br>🔀 или ${esc(chainName(e.split.a))} + ${esc(chainName(e.split.b))} · ~${eur(e.split.total)}` : ''}` : '', actions: [{ label: 'Отвори списъка', primary: true, fn: () => go('list') }, ...(e.best ? [{ label: `📍 Най-близкия ${esc(chainName(e.best.ch))}`, fn: () => navNearestChain(e.best.ch) }] : [])] }) });
  }
  // 5. Времето
  const w = D.weather && D.weather.current;
  if (w && daysSince(L.weather) >= 3) {
    const code = w.weather_code; const t = w.temperature_2m;
    const rainy = [61, 63, 65, 80, 81, 82, 95].includes(code);
    if (t < 8 || rainy) {
      const soup = RECIPES.filter(r => r.group === 'soup' && prefRecipeOk(r, false))[Math.floor(Math.random() * 5)];
      if (soup) out.push({ pr: 60, fn: () => popup({ theme: 'night', emoji: rainy ? '🌧️' : '🥶', key: 'weather', kicker: `${Math.round(t)}°C навън`, title: rainy ? 'Вали — идеално време за топла супа у дома' : 'Студено е — какво ще кажеш за топла чорба?', text: `Предлагаме: <b>${esc(soup.name)}</b> · ⏱ ${soup.time} мин`, actions: [{ label: '🥣 Покажи рецептата', primary: true, fn: () => showRecipe(soup.id) }, { label: 'Не сега', fn: null }] }) });
    } else if (t > 27) {
      out.push({ pr: 55, fn: () => popup({ theme: 'blue', emoji: '☀️', key: 'weather', kicker: `${Math.round(t)}°C навън`, title: 'Горещо е — нещо леко и свежо?', text: 'Салата, таратор или гаспачо и много вода. 💧', actions: [{ label: 'Виж салатите', primary: true, fn: () => { recipeGroup = 'salad'; go('recipes'); } }] }) });
    }
  }
  // 6. Запиши пазаруване
  if (S.trips.length && daysSince(lastTrip) > 8 && daysSince(L.trip) >= 5) out.push({ pr: 40, fn: () => popup({ theme: 'blue', emoji: '🧾', key: 'trip', kicker: 'Статистика', title: 'Пазарува ли тези дни?', text: 'Запиши сметката за 10 секунди — така MAMA ще ти показва къде отиват парите.', actions: [{ label: 'Запиши пазаруване', primary: true, fn: () => { go('list'); setTimeout(() => tripDialog(), 250); } }, { label: 'Не сега', fn: null }] }) });
  // 7. Свят — веднъж седмично
  if (daysSince(L.world) >= 7) {
    const others = CUISINES.filter(c => !p.cuisines.includes(c.id) && RECIPES.some(r => r.c === c.id && prefRecipeOk(r, false)));
    const c = others[Math.floor(Math.random() * others.length)];
    if (c) out.push({ pr: 35, fn: () => popup({ theme: 'purple', emoji: c.f, key: 'world', kicker: '🌍 Пътешествие с вкус', title: `Тази седмица опитай кухнята на ${esc(c.n)}`, text: esc(c.d), actions: [{ label: 'Покажи ястията', primary: true, fn: () => showCuisine(c.id) }, { label: 'Не сега', fn: null }] }) });
  }
  // 8. Сезонно
  if (daysSince(L.season) >= 10) {
    const m = new Date().getMonth() + 1;
    out.push({ pr: 30, fn: () => popup({ theme: 'green', emoji: '🍂', key: 'season', kicker: `Сезонно през ${MONTHS[m - 1]}`, title: 'Купувай сезонно — по-евтино и по-вкусно', text: SEASONAL[m].map(x => `<span class="pop-chip">${esc(x)}</span>`).join(' '), actions: [{ label: 'Сезонни рецепти', primary: true, fn: () => go('recipes') }] }) });
  }
  // 9. My Doctor
  if ((!S.doctor || !S.doctor.profile) && daysSince(L.doctor) >= 12 && daysSince(p.onbAt) > 1) out.push({ pr: 25, fn: () => popup({ theme: 'teal', emoji: '🩺', key: 'doctor', kicker: 'My Doctor', title: 'Искаш ли персонален хранителен режим?', text: '2 минути въпроси — цели, изследвания, хронични състояния — и MAMA ще подбира храната за теб.', actions: [{ label: 'Започни', primary: true, fn: () => { go('doctor'); setTimeout(() => drWizard(0), 300); } }, { label: 'По-късно', fn: null }] }) });
  return out.sort((a, b) => b.pr - a.pr);
}
function guideTick(force) {
  if (!P().onboarded || popOpen || sheetOpen() || document.querySelector('.onb, .tour')) return;
  if (!force && daysSince(S.guide.shown) < 0.25) return; // не по-често от 6 часа
  const c = candidates(); if (c.length) c[0].fn();
}

/* ─── Първоначален избор ───────────────────────────────────────────────── */
function onboarding(step = 0) {
  const p = P();
  const steps = [
    () => `<div class="onb-emoji">🧺</div><h2>Добре дошъл в MAMA</h2><div class="onb-sub">My Amazing Market Area — твоят гид за пазаруване, цени и готвене.</div>
      <label class="lbl" style="color:#fff">Как да те наричаме?</label><input class="input" id="onbName" placeholder="Име (по желание)" value="${esc(p.name)}">`,
    () => `<div class="onb-emoji">🥗</div><h2>Как се храниш?</h2><div class="onb-sub">Ще подбираме рецепти и предложения според това.</div>
      <div class="onb-grid">${DIETS.map(d => `<button class="onb-opt ${p.diet === d.id ? 'on' : ''}" data-diet="${d.id}"><span>${d.e}</span><b>${esc(d.n)}</b><small>${esc(d.d)}</small></button>`).join('')}</div>
      <button class="onb-opt wide ${p.noPork ? 'on' : ''}" id="onbPork"><span>🐖</span><b>Без свинско</b></button>`,
    () => `<div class="onb-emoji">🌍</div><h2>Коя кухня обичаш?</h2><div class="onb-sub">Избери една или няколко — менюто за седмицата ще е от тях.</div>
      <div class="onb-flags">${CUISINES.map(c => `<button class="onb-flag ${p.cuisines.includes(c.id) ? 'on' : ''}" data-cu="${c.id}"><span>${c.f}</span>${esc(c.n)}</button>`).join('')}</div>`,
    () => `<div class="onb-emoji">🔔</div><h2>Подсещания</h2><div class="onb-sub">${LN() ? 'Два пъти седмично ще те питаме какво да сготвим, а в петък ще ти напомним за списъка за пазар.' : 'Когато отваряш MAMA, ще ти предлагаме ястия, промоции и напомняния за списъка за пазар.'}</div>
      <label class="lbl" style="color:#fff">Колко души сте вкъщи?</label>
      <div class="onb-grid">${[1, 2, 3, 4, 5].map(n => `<button class="onb-opt small ${p.household === n ? 'on' : ''}" data-hh="${n}"><b>${n}${n === 5 ? '+' : ''}</b></button>`).join('')}</div>
      ${LN() ? `<button class="onb-opt wide ${p.notif ? 'on' : ''}" id="onbNotif"><span>🔔</span><b>Изпращай ми известия</b></button>` : ''}`,
  ];
  let el = document.querySelector('.onb');
  if (!el) { el = document.createElement('div'); el.className = 'onb'; document.body.appendChild(el); }
  el.innerHTML = `<div class="onb-in">
      <div class="onb-dots">${steps.map((_, i) => `<i class="${i <= step ? 'on' : ''}"></i>`).join('')}</div>
      <div class="onb-body">${steps[step]()}</div>
      <div class="onb-nav">${step ? '<button class="pop-btn" id="onbBack">Назад</button>' : '<span></span>'}<button class="pop-btn primary" id="onbNext">${step === steps.length - 1 ? 'Да започваме 🚀' : 'Напред'}</button></div></div>`;
  const q = s => el.querySelector(s);
  el.querySelectorAll('[data-diet]').forEach(b => b.onclick = () => { p.diet = b.dataset.diet; onboarding(step); });
  if (q('#onbPork')) q('#onbPork').onclick = () => { p.noPork = !p.noPork; onboarding(step); };
  el.querySelectorAll('[data-cu]').forEach(b => b.onclick = () => { const id = b.dataset.cu; p.cuisines = p.cuisines.includes(id) ? p.cuisines.filter(x => x !== id) : [...p.cuisines, id]; b.classList.toggle('on'); });
  el.querySelectorAll('[data-hh]').forEach(b => b.onclick = () => { p.household = +b.dataset.hh; onboarding(step); });
  if (q('#onbNotif')) q('#onbNotif').onclick = () => { p.notif = !p.notif; onboarding(step); };
  if (q('#onbBack')) q('#onbBack').onclick = () => onboarding(step - 1);
  q('#onbNext').onclick = async () => {
    if (q('#onbName')) p.name = q('#onbName').value.trim().slice(0, 30);
    if (step === 2 && !p.cuisines.length) p.cuisines = ['bg'];
    save();
    if (step < steps.length - 1) return onboarding(step + 1);
    p.onboarded = true; p.onbAt = Date.now(); S.menus = {}; save();
    el.classList.add('out'); setTimeout(() => el.remove(), 300);
    if (p.notif) await setupNotifications(true);
    go('home');
    setTimeout(startTour, 450);
  };
}

/* ─── Обиколка (гид) ───────────────────────────────────────────────────── */
const TOUR = [
  { sel: 'nav.bottom [data-go="home"]', t: '🏠 Начало', d: 'Тук виждаш разходите за месеца, времето, менюто и предложенията — всичко на едно място.' },
  { sel: 'nav.bottom [data-go="prices"]', t: '🏷️ Цени', d: 'Сравни цените на Kaufland, Lidl, Billa, Fantastico, T Market и др. в твоя град.' },
  { sel: 'nav.bottom [data-go="list"]', t: '🛒 Списък', d: 'Добави продуктите — MAMA ще ти каже къде е най-евтино да ги купиш.' },
  { sel: 'nav.bottom [data-go="recipes"]', t: '🍲 Меню', d: 'Всяка седмица 3 ястия и салата според вкуса ти + директория „Свят“ с кухни от 20 държави.' },
  { sel: 'nav.bottom [data-go="more"]', t: '✨ Още', d: 'Статистика, My Doctor, новини, карта на магазините, eBay и забранени храни.' },
  { sel: '#refreshBtn', t: '🔄 Обнови', d: 'Цените се обновяват сами 3 пъти на ден, но можеш и ръчно.' },
];
function startTour(i = 0) {
  document.querySelectorAll('.tour').forEach(x => x.remove());
  if (i >= TOUR.length) { P(); S.guide.toured = true; save(); setTimeout(() => dishPopup(), 600); return; }
  const s = TOUR[i]; const t = document.querySelector(s.sel);
  if (!t) return startTour(i + 1);
  const r = t.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'tour';
  const below = r.top < window.innerHeight / 2;
  el.innerHTML = `<div class="tour-hole" style="left:${r.left - 6}px;top:${r.top - 6}px;width:${r.width + 12}px;height:${r.height + 12}px"></div>
    <div class="tour-tip" style="${below ? `top:${r.bottom + 14}px` : `bottom:${window.innerHeight - r.top + 14}px`}">
      <div class="small" style="opacity:.8">Стъпка ${i + 1} от ${TOUR.length}</div><b style="font-size:17px">${s.t}</b><div style="margin:6px 0 12px">${s.d}</div>
      <div class="row between"><button class="pop-btn" id="tSkip">Пропусни</button><button class="pop-btn primary" id="tNext">${i === TOUR.length - 1 ? 'Готово' : 'Напред'}</button></div></div>`;
  document.body.appendChild(el);
  el.querySelector('#tNext').onclick = () => startTour(i + 1);
  el.querySelector('#tSkip').onclick = () => startTour(TOUR.length);
}

/* ─── Известия (Android) ───────────────────────────────────────────────── */
function LN() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; }
function nextAt(weekday, hour, minute) {
  const d = new Date(); d.setSeconds(0, 0); d.setHours(hour, minute);
  let add = (weekday - d.getDay() + 7) % 7; if (add === 0 && d <= new Date()) add = 7;
  d.setDate(d.getDate() + add); return d;
}
async function setupNotifications(ask) {
  const ln = LN(); const p = P();
  if (!ln) return;
  try {
    if (ask) { const st = await ln.requestPermissions(); if (st.display !== 'granted') { p.notif = false; save(); return; } }
    else { const st = await ln.checkPermissions(); if (st.display !== 'granted') return; }
    await ln.cancel({ notifications: [{ id: 101 }, { id: 102 }, { id: 103 }] }).catch(() => {});
    if (!p.notif) return;
    try { await ln.createChannel({ id: 'mama', name: 'MAMA подсещания', importance: 4, visibility: 1, vibration: true }); } catch (e) { /* стар Android */ }
    const d1 = pickDish(), d2 = pickDish(d1 ? [d1.id] : []);
    const n = (p.name || '').trim();
    const list = [];
    if (d1) list.push({ id: 101, channelId: 'mama', title: `${n ? 'Привет, ' + n : 'Привет'}! 🍲`, body: `Искаш ли днес да сготвим ${d1.name}? Виж рецептата и къде е най-евтино.`, schedule: { at: nextAt(2, 17, 30), allowWhileIdle: true }, extra: { recipe: d1.id }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' });
    if (d2) list.push({ id: 102, channelId: 'mama', title: 'Какво ще готвим през уикенда? 😋', body: `Предлагаме ${d2.name}. Натисни за рецептата и продуктите.`, schedule: { at: nextAt(6, 10, 0), allowWhileIdle: true }, extra: { recipe: d2.id }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' });
    if (S.list.some(i => !i.done)) list.push({ id: 103, channelId: 'mama', title: 'Време за пазар 🛒', body: `В списъка имаш ${S.list.filter(i => !i.done).length} продукта. Виж къде е най-изгодно днес.`, schedule: { at: nextAt(5, 18, 0), allowWhileIdle: true }, extra: { go: 'list' }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' });
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) { /* известията не са критични */ }
}
function bindNotifTaps() {
  const ln = LN(); if (!ln) return;
  ln.addListener('localNotificationActionPerformed', a => {
    const x = (a && a.notification && a.notification.extra) || {};
    setTimeout(() => {
      if (x.recipe) { const r = RECIPES.find(z => z.id === x.recipe); if (r) dishPopup(r); }
      else if (x.go) go(x.go);
    }, 700);
  });
}

/* ─── iPhone: инсталиране като приложение ─────────────────────────────── */
function iosNeedsInstall() {
  const ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  return ios && !standalone;
}
function iosInstallPopup() {
  popup({ theme: 'night', emoji: '📲', key: 'ios', kicker: 'iPhone', title: 'Сложи MAMA на началния екран',
    text: '1. Натисни <b>Сподели</b> <span class="pop-chip">⬆️</span> долу в Safari<br>2. Избери <b>„Добави към началния екран“</b><br>3. Натисни <b>Добави</b><br><br>MAMA ще се отваря на цял екран като приложение, с иконка.',
    actions: [{ label: 'Разбрах', primary: true, fn: null }] });
}

/* ─── Свят ─────────────────────────────────────────────────────────────── */
let worldRegion = 'all';
function renderWorld(el) {
  const p = P();
  const regions = [...new Set(CUISINES.map(c => c.r))];
  const list = CUISINES.filter(c => worldRegion === 'all' || c.r === worldRegion);
  el.innerHTML = `<div class="card hero" style="background:${THEMES.purple}"><div class="big" style="font-size:24px">🌍 Свят</div><div>Най-популярните ястия от ${CUISINES.length} кухни. Филтрирани според режима ти: <b>${esc(DIETS.find(d => d.id === p.diet).n)}</b>${p.noPork ? ', без свинско' : ''}.</div></div>
    <div class="chips"><button class="chip ${worldRegion === 'all' ? 'on' : ''}" data-wr="all">Всички</button>${regions.map(r => `<button class="chip ${worldRegion === r ? 'on' : ''}" data-wr="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <div class="world-grid">${list.map(c => { const n = RECIPES.filter(r => r.c === c.id && prefRecipeOk(r, false)).length; const mine = p.cuisines.includes(c.id);
      return `<button class="world-card ${mine ? 'mine' : ''}" data-cu="${c.id}"><span class="flag">${c.f}</span><b>${esc(c.n)}</b><small>${n} ястия${mine ? ' · ⭐ любима' : ''}</small></button>`; }).join('')}</div>`;
  el.querySelectorAll('[data-wr]').forEach(b => b.onclick = () => { worldRegion = b.dataset.wr; renderWorld(el); });
  el.querySelectorAll('[data-cu]').forEach(b => b.onclick = () => showCuisine(b.dataset.cu));
}
function showCuisine(id) {
  const c = CUISINES.find(x => x.id === id); const p = P();
  const all = RECIPES.filter(r => r.c === id && !recipeBlocked(r));
  const ok = all.filter(r => dietOk(r, p.diet, p.noPork));
  const rest = all.filter(r => !ok.includes(r));
  const mine = p.cuisines.includes(id);
  openSheet(`<div class="recipe-hero" style="background:${THEMES.purple}"><div class="emo-big">${c.f}</div><div><div class="small" style="opacity:.9">${esc(c.r)}</div><h3 style="color:#fff">${esc(c.n)}</h3><div class="small" style="opacity:.9">${esc(c.d)}</div></div></div>
    <button class="btn ${mine ? 'tonal' : 'primary'} block" id="favCu" style="margin:10px 0">${mine ? '✓ В любимите кухни (натисни за премахване)' : '⭐ Добави в любимите кухни'}</button>
    ${ok.length ? `<div class="menu-grid">${ok.map(recipeTile).join('')}</div>` : '<div class="empty">Няма ястия, подходящи за твоя режим.</div>'}
    ${rest.length ? `<div class="section-title" style="margin-left:0">Други ястия от кухнята</div><div class="menu-grid">${rest.map(recipeTile).join('')}</div>` : ''}`, el => {
    el.querySelector('#favCu').onclick = () => { p.cuisines = mine ? p.cuisines.filter(x => x !== id) : [...p.cuisines, id]; if (!p.cuisines.length) p.cuisines = ['bg']; S.menus = {}; save(); closeSheet(); render(); toast(mine ? 'Премахната от любимите' : 'Добавена в любимите — менюто ще включва и нея'); };
    el.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => showRecipe(b.dataset.recipe));
  });
}

/* ─── Начален банер „Съвет“ (цветен, сменя се) ─────────────────────────── */
function tipBanner() {
  const p = P(); const m = new Date().getMonth() + 1;
  const tips = [
    ['orange', '🍲', 'Не знаеш какво да готвиш?', 'Натисни и ще ти предложим ястие', 'dish'],
    ['purple', '🌍', 'Свят', `${CUISINES.length} кухни — от Сърбия и Турция до Япония`, 'world'],
    ['teal', '🩺', 'My Doctor', 'Хранителен режим според показателите ти', 'doctor'],
    ['sun', '🏷️', 'Промоции днес', 'Най-големите намаления в твоя град', 'prices'],
    ['green', '🍂', `Сезонно през ${MONTHS[m - 1]}`, SEASONAL[m].slice(0, 4).join(', '), 'recipes'],
    ['blue', '🧾', 'Пазарува ли?', 'Запиши сметката — следи разходите си', 'trip'],
  ];
  const t = tips[(new Date().getDate() + (S.guide.bannerShift || 0)) % tips.length];
  return `<div class="tip-banner" style="background:${THEMES[t[0]]}" data-tip="${t[4]}"><div class="tip-emo">${t[1]}</div><div class="grow"><b>${esc(t[2])}</b><div class="small">${esc(t[3])}</div></div><div class="tip-go">›</div></div>`;
}
function tipAction(k) {
  ({ dish: () => dishPopup(), world: () => go('world'), doctor: () => go('doctor'), prices: () => go('prices'), recipes: () => go('recipes'), trip: () => { go('list'); setTimeout(() => tripDialog(), 250); } }[k] || (() => {}))();
}

/* ─── Включване в приложението ─────────────────────────────────────────── */
(function wire() {
  TITLES.world = ['Свят', 'Кухни и ястия по държави'];
  const baseRender = render;
  render = function () {
    if (current === 'world') { renderWorld($('#s-world')); const n = S.list.filter(i => !i.done).length; const b = $('#listBadge'); b.hidden = !n; b.textContent = n; return; }
    baseRender();
    if (current === 'home') {
      const h = $('#s-home');
      if (h && !h.querySelector('.tip-banner')) {
        h.insertAdjacentHTML('afterbegin', tipBanner());
        h.querySelector('.tip-banner').onclick = e => tipAction(e.currentTarget.dataset.tip);
      }
    }
    if (current === 'recipes') {
      const el = $('#s-recipes');
      if (el && !el.querySelector('#worldCard')) {
        const first = el.querySelector('.section-title');
        if (first) first.insertAdjacentHTML('beforebegin', `<div class="tip-banner" id="worldCard" style="background:${THEMES.purple}"><div class="tip-emo">🌍</div><div class="grow"><b>Свят — ${CUISINES.length} кухни</b><div class="small">Сърбия, Турция, Гърция, Италия, Индия, Япония, Мексико…</div></div><div class="tip-go">›</div></div>`);
        const wc = el.querySelector('#worldCard'); if (wc) wc.onclick = () => go('world');
        // директорията — само любимите кухни и режима
        const sub = el.querySelector('.card .muted.small');
        const p = P();
        if (sub) sub.textContent = `3 ястия и 1 салата · ${p.cuisines.map(id => (CUISINES.find(c => c.id === id) || {}).f || '').join(' ')} · ${DIETS.find(d => d.id === p.diet).n.toLowerCase()} · без забранените храни`;
      }
    }
    if (current === 'more') {
      const ul = $('#s-more .list');
      if (ul && !ul.querySelector('[data-go2="world"]')) {
        ul.insertAdjacentHTML('afterbegin', `<li class="li" data-go2="world"><div class="lead">🌍</div><div class="grow"><div class="title">Свят</div><div class="muted small">Най-популярните ястия от ${CUISINES.length} кухни</div></div><span class="muted">›</span></li>
          <li class="li" data-guide="prefs"><div class="lead">🎯</div><div class="grow"><div class="title">Моите предпочитания</div><div class="muted small">Хранене, кухни, известия, обиколка на приложението</div></div><span class="muted">›</span></li>`);
        ul.querySelector('[data-go2="world"]').onclick = () => go('world');
        ul.querySelector('[data-guide="prefs"]').onclick = prefsSheet;
      }
    }
  };
  // Директорията в Меню показва любимите кухни и режима
  const baseRecipes = renderRecipes;
  renderRecipes = function (el) {
    const menuIds = weekMenu().map(r => r.id);
    const all = RECIPES.slice();
    const keep = all.filter(r => menuIds.includes(r.id) || prefRecipeOk(r, true) || (recipeBlocked(r) && P().cuisines.includes(r.c)));
    RECIPES.length = 0; RECIPES.push(...(keep.length ? keep : all));
    try { baseRecipes(el); } finally { RECIPES.length = 0; RECIPES.push(...all); }
  };
})();
function prefsSheet() {
  const p = P();
  openSheet(`<h3>🎯 Моите предпочитания</h3>
    <div class="suggest"><div class="e">🥗</div><div class="grow">Хранене: <b>${esc(DIETS.find(d => d.id === p.diet).n)}</b>${p.noPork ? ', без свинско' : ''}</div></div>
    <div class="suggest"><div class="e">🌍</div><div class="grow">Кухни: ${p.cuisines.map(id => { const c = CUISINES.find(x => x.id === id); return c ? c.f + ' ' + esc(c.n) : ''; }).join(', ')}</div></div>
    <div class="suggest"><div class="e">🔔</div><div class="grow">Известия: <b>${p.notif ? 'включени' : 'изключени'}</b> · вт 17:30 и сб 10:00 ястие, пт 18:00 пазар</div></div>
    <button class="btn primary block" id="pfEdit" style="margin-top:12px">Промени</button>
    <button class="btn tonal block" id="pfTour" style="margin-top:8px">🧭 Покажи обиколката отново</button>
    <button class="btn tonal block" id="pfDish" style="margin-top:8px">🍲 Предложи ми ястие сега</button>`, el => {
    el.querySelector('#pfEdit').onclick = () => { closeSheet(); onboarding(1); };
    el.querySelector('#pfTour').onclick = () => { closeSheet(); go('home'); setTimeout(startTour, 350); };
    el.querySelector('#pfDish').onclick = () => { closeSheet(); setTimeout(() => dishPopup(), 250); };
  });
}

document.addEventListener('DOMContentLoaded', () => {
  P(); save();
  bindNotifTaps();
  const ready = () => {
    if (!P().onboarded) { onboarding(0); return; }
    if (iosNeedsInstall() && daysSince(S.guide.last.ios) >= 3) { setTimeout(iosInstallPopup, 900); return; }
    setupNotifications(false);
    if (!S.guide.toured) { setTimeout(startTour, 500); return; }
    setTimeout(() => guideTick(false), 1800);
  };
  // изчакваме първото зареждане на данните (до 6 с)
  let n = 0; const t = setInterval(() => { n++; if ((D.meta || D.error || n > 12) && !D.loading) { clearInterval(t); ready(); } }, 500);
  document.addEventListener('resume', () => setTimeout(() => guideTick(false), 1200));
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.addListener('resume', () => setTimeout(() => guideTick(false), 1200));
});
