/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Здравен филтър: изследванията от My Doctor влияят на менютата, рецептите, списъка за пазар и подсещанията.
   Всичко се изчислява в телефона. Информационно — не замества лекар. */
const HG_RULES = {
  heart: { flags: ['ldl', 'hdl', 'tg', 'heart'], why: 'холестерола (LDL)',
    bad: [[/колбас|салам|луканка|суджук|надениц|кренвирш|бекон|шунка|сланина|пастърма|дебърцин/, 3, 'пуешко филе на фурна или хумус'],
      [/маргарин|палмов/, 3, 'зехтин'], [/свинск|свински|свинско/, 2, 'пилешко или пуешко без кожа'],
      [n => /^(краве )?масло(\s|$)/.test(n) && !/фъстъч|кокос|зехтин|олио|маслин/.test(n), 2, 'зехтин'],
      [/сметана/, 2, 'кисело мляко'], [/майонеза/, 2, 'кисело мляко с горчица'], [/кашкавал|маскарпоне|крема сирене|синьо сирене|чедър/, 1, 'извара или по-малко сирене'],
      [/кайма/, 1, 'пуешка кайма'], [/бутер|кроасан|чипс/, 2, 'пълнозърнест хляб'], [/пудра захар|^захар/, 1, 'плодове или малко мед']],
    good: [/овес|овесен/, /боб|леща|нахут/, /риба|сьомга|скумрия|пъстърва|сардин|ципура|треска|тон/, /орех|бадем|лешни|ядк|шам-фъстък/, /зехтин/, /авокадо/, /ленен|чиа/, /пълнозърн|ръжен|елда|киноа|ечемик/],
    tips: ['Повече овес, бобови, риба 2–3 пъти седмично, ядки и зехтин', 'По-малко колбаси, тлъсти меса, масло, сметана и кашкавал', 'Движение поне 30 минути на ден'] },
  sugar: { flags: ['glucose'], why: 'кръвната захар',
    bad: [[/пудра захар|^захар|кондензирано|сироп/, 2, 'плодове'], [/бишкоти|бисквит|торта|вафл|сладко(\s|$)/, 2, 'ядки или плод'], [/бял хляб|^брашно$/, 1, 'пълнозърнест хляб'], [/(^|\s)сок(\s|$)/, 1, 'цял плод']],
    good: [/боб|леща|нахут/, /зеленчу|спанак|броколи|тиквичк/, /пълнозърн|ръжен|овес|елда/, /орех|бадем/], tips: ['Пълнозърнести вместо бели храни', 'Повече зеленчуци и бобови'] },
  bp: { flags: ['bp'], why: 'кръвното налягане',
    bad: [[/колбас|салам|луканка|суджук|надениц|кренвирш|бекон|шунка|пастърма/, 2, 'печено пилешко'], [/туршия|кисели краставички|соев сос|чипс/, 1, 'пресни зеленчуци']],
    good: [/банан|спанак|боб|леща|кисело мляко|цвекло/], tips: ['По-малко сол и колбаси', 'Повече зеленчуци, плодове и кисело мляко'] },
  uric: { flags: ['uric'], why: 'пикочната киселина',
    bad: [[/дроб|сърца|бъбреци|шкембе/, 3, 'пилешко'], [/телешк|агнешк/, 1, 'бобови или яйца'], [/сардин|аншоа/, 1, 'бяла риба'], [/бира/, 2, 'вода']],
    good: [/черeш|вишн|кисело мляко|зеленчу/], tips: ['Повече вода', 'По-малко червено месо и карантии'] }
};
function hOn() { return S.settings.healthGuard !== false && hActive().length > 0; }
function hActive() { let fl; try { fl = (S.doctor && S.doctor.labs) ? drFlags() : new Map(); } catch (e) { return []; } return Object.entries(HG_RULES).filter(([, R]) => R.flags.some(f => fl.has(f))).map(([k, R]) => Object.assign({ k }, R)); }
const hMatch = (rx, n) => typeof rx === 'function' ? rx(n) : rx.test(n);
function hItem(name, act) {
  const n = norm(name); let w = 0, swap = '', why = '';
  for (const R of act) for (const [rx, wt, sw] of R.bad) if (hMatch(rx, n) && wt > w) { w = wt; swap = sw; why = R.why; }
  const good = act.some(R => R.good.some(rx => hMatch(rx, n)));
  return { w, swap, why, good };
}
const H_CACHE = new Map();
function hReport(r) {
  const act = hActive(); if (!act.length || !r || !r.ing) return null;
  const key = r.id + '|' + act.map(a => a.k).join(',');
  if (H_CACHE.has(key)) return H_CACHE.get(key);
  let bad = 0, good = 0; const B = [], G = [];
  r.ing.forEach(i => { const x = hItem(i[0], act); if (x.w) { bad += x.w; B.push({ n: i[0], swap: x.swap, why: x.why }); } else if (x.good) { good++; G.push(i[0]); } });
  const lvl = bad >= 4 ? 'avoid' : bad >= 2 ? 'caution' : good >= 2 ? 'good' : 'ok';
  const out = { lvl, bad: B, good: G, why: [...new Set(B.map(b => b.why))].join(' и ') || act[0].why };
  H_CACHE.set(key, out); return out;
}
function hClear() { H_CACHE.clear(); }

/* 1) избор на ястия — без неподходящите (меню, обяд, вечеря, теми, десерт за уикенда) */
(function () {
  const bOk = prefRecipeOk;
  prefRecipeOk = function (r, strict) { if (!bOk(r, strict)) return false; if (hOn()) { const h = hReport(r); if (h && h.lvl === 'avoid') return false; } return true; };
  const bBf = bfPick;
  bfPick = function (skip = 0, date = new Date()) {
    let b = bBf(skip, date); if (!hOn()) return b;
    for (let k = 1; k < 8; k++) { const h = hReport(RECIPES.find(x => x.id === 'bf_' + b.i)); if (!h || h.lvl !== 'avoid') return b; b = bBf(skip + k * 7, date); }
    return b;
  };
})();

/* седмичното меню и обяд/вечеря — „внимание“ се заменя с подходящо ястие от същата група */
(function () {
  const lv = r => (hReport(r) || {}).lvl;
  const bWM = weekMenu;
  weekMenu = function (reroll) {
    const m = bWM(reroll); if (!hOn()) return m;
    const used = new Set(m.map(r => r.id)), mon = new Date().getMonth() + 1;
    const alt = (g, want) => RECIPES.find(x => x.group === g && !used.has(x.id) && !x.holiday && inSeason(x, mon) && prefRecipeOk(x, false) && lv(x) === want);
    return m.map(r => { if (lv(r) !== 'caution') return r; const a = alt(r.group, 'good') || alt(r.group, 'ok'); if (a) { used.add(a.id); return a; } return r; });
  };
  const bMP = mealPick;
  mealPick = function (kind, skip = 0, date = new Date()) {
    let r = bMP(kind, skip, date); if (!hOn() || kind === 'b') return r;
    for (let k = 1; k < 6 && r && lv(r) === 'caution'; k++) r = bMP(kind, skip + k * 3, date) || r;
    return r;
  };
})();

/* 2) рецептата — какво е добре и какво да замениш */
(function () {
  const bShow = showRecipe;
  showRecipe = function (id) {
    bShow(id);
    if (!hOn()) return;
    const r = RECIPES.find(x => x.id === id), h = hReport(r), body = $('#sheetBody'); if (!h || !body || body.querySelector('.h-note')) return;
    let html = '';
    if (h.lvl === 'good') html = `<div class="h-note good">❤️ <b>Подходящо за ${esc(hActive()[0].why)}</b><br><span class="small">${esc(h.good.slice(0, 4).join(', '))}</span></div>`;
    else if (h.bad.length) html = `<div class="h-note ${h.lvl === 'avoid' ? 'bad' : 'warn'}">${h.lvl === 'avoid' ? '⛔' : '⚠️'} <b>Заради ${esc(h.why)} — по-добре замени:</b><ul>${h.bad.map(b => `<li>${esc(b.n)} → <b>${esc(b.swap)}</b></li>`).join('')}</ul></div>`;
    if (!html) return;
    const hero = body.querySelector('.recipe-hero'); hero ? hero.insertAdjacentHTML('afterend', html) : body.insertAdjacentHTML('afterbegin', html);
  };
})();

/* 3) значки ❤️ / ⚠️ върху плочките с рецепти навсякъде */
function hMarkTiles(el) {
  if (!hOn() || !el) return;
  el.querySelectorAll('[data-recipe]').forEach(t => {
    if (t.querySelector('.h-mark')) return; const h = hReport(RECIPES.find(x => x.id === t.dataset.recipe)); if (!h) return;
    const m = h.lvl === 'good' ? '❤️' : h.lvl === 'avoid' ? '⛔' : h.lvl === 'caution' ? '⚠️' : ''; if (!m) return;
    const tt = t.querySelector('.t'); if (tt) tt.insertAdjacentHTML('afterbegin', `<span class="h-mark" title="${h.lvl === 'good' ? 'Подходящо за здравето ти' : 'Внимавай — виж рецептата'}">${m} </span>`);
  });
}
['renderRecipes', 'renderDesserts', 'renderSalads', 'renderWorld'].forEach(fn => {
  if (typeof window[fn] !== 'function') return;
  const base = window[fn];
  window[fn] = function (el) { base.apply(this, arguments); hMarkTiles(el || document.querySelector('.screen.active') || document); };
});
(function () { const bR = render; render = function () { bR(); if (['recipes', 'desserts', 'salads', 'world'].includes(current)) hMarkTiles($('#s-' + current)); }; })();

/* 4) списъкът за пазар — съвети за по-здравословна замяна */
(function () {
  const bList = renderList;
  renderList = function (el) {
    bList(el);
    if (!hOn()) return;
    const act = hActive();
    const hits = S.list.filter(i => !i.done).map(i => ({ i, x: hItem(i.name, act) })).filter(o => o.x.w >= 1);
    if (!hits.length) return;
    el.insertAdjacentHTML('afterbegin', `<div class="card h-card"><h2 style="margin:0 0 6px">❤️ По-здравословно за ${esc(hits[0].x.why)}</h2>
      ${hits.slice(0, 6).map(o => `<div class="row between h-row"><div class="grow"><b>${esc(o.i.name)}</b> → ${esc(o.x.swap)}</div><button class="btn tonal small" data-hswap="${o.i.id}">Замени</button></div>`).join('')}
      <div class="small muted" style="margin-top:6px">Според изследванията ти в My Doctor · информационно, не е лекарски съвет</div></div>`);
    el.querySelectorAll('[data-hswap]').forEach(b => b.onclick = () => {
      const it = S.list.find(x => x.id === b.dataset.hswap); if (!it) return;
      const sw = hItem(it.name, act).swap.split(' или ')[0];
      it.name = sw.charAt(0).toUpperCase() + sw.slice(1); it.cat = guessCat(it.name); save(); toast('Заменено ❤️'); render();
    });
  };
})();

/* 5) начален екран — здравен фокус и контролни изследвания */
function hControls() {
  const L = (S.doctor && S.doctor.labs) || {}, fl = (() => { try { return drFlags(); } catch (e) { return new Map(); } })();
  const lastD = k => { const a = L[k]; return a && a.length ? a[a.length - 1].d : null; };
  const add = (d, days) => { const x = new Date(d + 'T09:30'); x.setDate(x.getDate() + days); return x; };
  const out = [];
  if (fl.has('lymph') && lastD('lymph')) out.push({ id: 1500, t: 'Контролна кръвна картина (ПКК)', at: add(lastD('lymph'), 42) });
  if ((fl.has('ldl') || fl.has('tg')) && lastD('ldl')) out.push({ id: 1501, t: 'Повторен липиден профил (холестерол)', at: add(lastD('ldl'), 90) });
  if ((fl.has('bili') || fl.has('liver')) && lastD('bili')) out.push({ id: 1502, t: 'Билирубин + чернодробни ензими (по преценка на лекар)', at: add(lastD('bili'), 42) });
  const crea = L.crea && L.crea.length && L.crea[L.crea.length - 1].v; if (crea && crea > 106 && lastD('crea')) out.push({ id: 1503, t: 'Креатинин с eGFR (контрол)', at: add(lastD('crea'), 42) });
  return out;
}
async function hSchedule() {
  const ln = typeof LN === 'function' && LN(); if (!ln) return;
  try {
    await ln.cancel({ notifications: [1500, 1501, 1502, 1503].map(id => ({ id })) }).catch(() => {});
    if ((await ln.checkPermissions()).display !== 'granted') return;
    const list = hControls().filter(c => c.at > new Date()).map(c => ({ id: c.id, channelId: 'meals', title: '🩺 Време за контролни изследвания', body: `${c.t}. Запиши час при личния лекар или в лаборатория.`, schedule: { at: c.at, allowWhileIdle: true }, extra: { go: 'doctor' }, smallIcon: 'ic_stat_mama', iconColor: '#E11D48' }));
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) {}
}
function hGoodList() { return RECIPES.filter(r => !['breakfast'].includes(r.group) && prefRecipeOk(r, false) && (hReport(r) || {}).lvl === 'good').slice(0, 40); }
function hSheet() {
  const act = hActive(), good = hGoodList();
  openSheet(`<h3>❤️ Храна за ${esc(act.map(a => a.why).join(' и '))}</h3>
    <ul class="small" style="padding-left:18px">${[...new Set(act.flatMap(a => a.tips))].map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <div class="section-title">Подходящи рецепти (${good.length})</div>
    <div class="menu-grid">${good.map(recipeTile).join('')}</div>
    <div class="small muted" style="margin-top:10px">Информационно, по изследванията ти в My Doctor. Целите и лечението се определят от лекар.</div>`, el => {
    el.querySelectorAll('[data-recipe]').forEach(t => t.onclick = () => showRecipe(t.dataset.recipe));
  });
}
(function () {
  const bHome = renderHome;
  renderHome = function (el) {
    bHome(el);
    if (!hOn()) return;
    const act = hActive(), L = S.doctor.labs || {}, p = S.doctor.profile || {};
    const out = IND.map(ind => { const a = L[ind.k]; if (!a || !a.length) return null; const v = a[a.length - 1].v; const e = evalInd(ind, v, p); return e && e.st !== 'ok' && ind.k !== 'bmi' ? { ind, v, e } : null; }).filter(Boolean).sort((a, b) => (b.e.st === 'high' || b.e.st === 'crit') - (a.e.st === 'high' || a.e.st === 'crit')).slice(0, 3);
    const ctr = hControls().filter(c => c.at > new Date(Date.now() - 30 * 864e5)).sort((a, b) => a.at - b.at)[0];
    const menu = (typeof weekMenu === 'function' ? weekMenu() : []).filter(r => (hReport(r) || {}).lvl === 'good').length;
    el.insertAdjacentHTML('afterbegin', `<div class="card h-home" id="hHome"><div class="row between" style="align-items:center"><h2 style="margin:0;color:#fff">❤️ Здравен фокус</h2><span class="small" style="opacity:.9">My Doctor</span></div>
      ${out.map(o => `<div class="small" style="margin-top:6px">• <b>${esc(o.ind.n)}</b> ${String(o.v).replace('.', ',')} ${esc(o.ind.u)} — ${esc(o.e.label)}</div>`).join('')}
      <div class="small" style="margin-top:8px;opacity:.95">Менютата, закуските, обядите, вечерите и списъкът вече се съобразяват с ${esc(act.map(a => a.why).join(' и '))}.${menu ? ` Тази седмица ❤️ ${menu} подходящи ястия.` : ''}</div>
      ${ctr ? `<div class="h-ctr">🩺 ${esc(ctr.t)}: <b>${ctr.at.toLocaleDateString('bg-BG')}</b>${ctr.at < new Date() ? ' — време е!' : ''}</div>` : ''}
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn ebag-btn small" id="hGood">❤️ Подходящи рецепти</button><button class="btn ebag-ghost small" id="hDr">🩺 My Doctor</button></div></div>`);
    el.querySelector('#hGood').onclick = hSheet; el.querySelector('#hDr').onclick = () => go('doctor');
  };
  const bSet = renderSettings;
  renderSettings = function (el) {
    bSet(el);
    if (!hActive().length) return;
    el.insertAdjacentHTML('beforeend', `<div class="card"><h2>❤️ Здравен филтър</h2><label class="row between" style="align-items:center"><span>Съобразявай менютата, рецептите и списъка с изследванията ми</span><input type="checkbox" id="hgOn" ${S.settings.healthGuard !== false ? 'checked' : ''} style="width:24px;height:24px;accent-color:#0e7a5c"></label></div>`);
    el.querySelector('#hgOn').onchange = e => { S.settings.healthGuard = e.target.checked; save(); hClear(); toast(e.target.checked ? 'Включено ❤️' : 'Изключено'); };
  };
  // след ново изследване — пресмятаме отново и пренареждаме подсещанията
  const bSave = save;
  let lastSig = '';
  save = function () { bSave.apply(this, arguments); const sig = JSON.stringify((S.doctor && S.doctor.labs) || {}).length + ':' + (S.curP || ''); if (sig !== lastSig) { lastSig = sig; hClear(); } };
})();
document.addEventListener('DOMContentLoaded', () => { setTimeout(() => { hClear(); hSchedule(); typeof scheduleMeals === 'function' && scheduleMeals(false); }, 7000); });
