/* MAMA — умен списък: подреждане по щандове, цветен напредък, предложения; база с покупки от бележки и отчети. */
'use strict';

/* ─── Щандове (типична подредба на българските супермаркети) ──────────── */
const AISLES = [
  { id: 'produce', n: 'Плодове и зеленчуци', e: '🥬', cats: range(50, 61), kw: ['плод', 'зеленчук', 'салата', 'маруля', 'спанак', 'патладжан', 'тиквичк', 'чушк', 'авокадо', 'киви', 'грозде', 'праскови', 'круши', 'ягоди', 'магданоз', 'копър', 'джоджен', 'цвекло', 'тиква'] },
  { id: 'bakery', n: 'Хлебни и тестени', e: '🥖', cats: [1, 2, 3, 4, 5, 67, 68], kw: ['хляб', 'питка', 'кифл', 'багета', 'тесто', 'питa', 'тортили', 'хлебчета', 'кори'] },
  { id: 'dairy', n: 'Мляко, сирена, яйца', e: '🧀', cats: [...range(6, 14), 31, 32], kw: ['мляко', 'сирене', 'кашкавал', 'масло', 'извара', 'яйц', 'сметана', 'моцарела', 'фета', 'кефир', 'айрян', 'йогурт'] },
  { id: 'meat', n: 'Месо и колбаси', e: '🥩', cats: range(15, 28), kw: ['месо', 'кайма', 'пиле', 'пилешк', 'свинск', 'телешк', 'агнешк', 'наденица', 'кренвирш', 'салам', 'шунка', 'луканка', 'бекон'] },
  { id: 'fish', n: 'Риба', e: '🐟', cats: [29, 30], kw: ['риба', 'скумрия', 'сьомга', 'ципура', 'лаврак', 'шаран', 'тон', 'скариди'] },
  { id: 'frozen', n: 'Замразени', e: '🧊', cats: [], kw: ['замраз', 'сладолед', 'пица замр', 'зеленчуков микс'] },
  { id: 'pantry', n: 'Основни храни и консерви', e: '🥫', cats: [...range(33, 49), 62], kw: ['ориз', 'боб', 'леща', 'нахут', 'макарон', 'спагети', 'паста', 'брашно', 'захар', 'сол', 'олио', 'зехтин', 'оцет', 'консерв', 'лютеница', 'маслини', 'булгур', 'кускус', 'овесени', 'подправ', 'мед', 'кетчуп', 'майонеза', 'горчица'] },
  { id: 'baby', n: 'Бебешки', e: '🍼', cats: [63, 64, 65], kw: ['бебе', 'пюре', 'адаптирано'] },
  { id: 'sweets', n: 'Сладко и снаксове', e: '🍫', cats: [66, 69], kw: ['шоколад', 'бисквит', 'вафл', 'бонбон', 'чипс', 'ядки', 'солети', 'орехи', 'бадеми'] },
  { id: 'drinks', n: 'Кафе, чай, напитки', e: '🥤', cats: range(70, 77), kw: ['кафе', 'чай', 'вода', 'сок', 'бира', 'вино', 'ракия', 'кола', 'газирана'] },
  { id: 'home', n: 'Дом и хигиена', e: '🧴', cats: [79, 80, 81, 82, 83, 84, 85], kw: ['препарат', 'прах за пране', 'омекотител', 'тоалетна', 'салфетки', 'шампоан', 'сапун', 'паста за зъби', 'четка', 'кърпи', 'торби', 'фолио', 'гъби за съдове'] },
  { id: 'other', n: 'Други', e: '🛍️', cats: [], kw: [] },
  { id: 'cashier', n: 'При касата', e: '🧾', cats: [78], kw: ['цигар', 'дъвк'] },
];
function range(a, b) { const r = []; for (let i = a; i <= b; i++) r.push(i); return r; }
function aisleOf(name, cat) {
  if (cat) { const a = AISLES.find(x => x.cats.includes(+cat)); if (a) return a; }
  const n = norm(name);
  return AISLES.find(x => x.kw.some(k => n.includes(k))) || AISLES.find(x => x.id === 'other');
}

/* ─── История на покупките (от бележки и списък) ──────────────────────── */
function purchaseLog() {
  const out = [];
  S.trips.forEach(t => (t.items || []).forEach(i => out.push({ n: i.n, c: i.c, p: i.p, q: i.q || 1, d: t.date, ch: t.chain })));
  return out;
}
function suggestions2() {
  const log = purchaseLog(); const inList = new Set(S.list.filter(i => !i.done).map(i => norm(i.name)));
  const dism = S.listDismiss || {}; const now = Date.now();
  const by = {};
  log.forEach(x => { const k = norm(x.n).replace(/\s+\d.*$/, '').slice(0, 30); if (!k) return; (by[k] = by[k] || { n: x.n, c: x.c, dates: [] }).dates.push(x.d); });
  const sug = [];
  Object.entries(by).forEach(([k, v]) => {
    if (inList.has(k) || [...inList].some(x => x.includes(k) || k.includes(x))) return;
    if (dism[k] && now - dism[k] < 7 * 86400000) return;
    const ds = [...new Set(v.dates)].sort(); if (ds.length < 2) return;
    const gaps = ds.slice(1).map((d, i) => (new Date(d) - new Date(ds[i])) / 86400000);
    const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const since = (now - new Date(ds[ds.length - 1])) / 86400000;
    if (since >= avg * 0.85) sug.push({ k, n: v.n, c: v.c, why: `купуваш го на ~${Math.round(avg)} дни, последно преди ${Math.round(since)}`, score: since / avg + ds.length / 10 });
  });
  // продукти от менюто за седмицата, които липсват
  try { weekMenu().forEach(r => r.ing.filter(i => i[2] && !/по вкус|щипка/.test(i[1])).slice(0, 4).forEach(i => { const k = norm(i[0]); if (!inList.has(k) && !(dism[k] && now - dism[k] < 7 * 86400000) && !sug.some(s => s.k === k)) sug.push({ k, n: i[0], c: i[2], why: `за ${r.name}`, score: 0.5 }); })); } catch (e) { /* */ }
  // основни продукти, които често се забравят
  if (!log.length) ['Хляб', 'Прясно мляко', 'Яйца', 'Кисело мляко', 'Домати'].forEach(n => { const k = norm(n); if (!inList.has(k) && !(dism[k] && now - dism[k] < 7 * 86400000)) sug.push({ k, n, c: guessCat(n), why: 'често се купува', score: 0.2 }); });
  return sug.sort((a, b) => b.score - a.score).slice(0, 8);
}

/* ─── Нов екран „Списък“ ───────────────────────────────────────────────── */
renderList = function (el) {
  const sortMode = S.listSort || 'aisle';
  const all = S.list; const open = all.filter(i => !i.done), done = all.filter(i => i.done);
  const est = estimate(all.filter(i => !i.done).length ? all : all);
  const pct = all.length ? Math.round(done.length / all.length * 100) : 0;
  const sug = suggestions2();
  const allCats = D.meta ? Object.entries(D.meta.categories).filter(([k]) => +k < 86) : [];
  const groups = sortMode === 'aisle'
    ? AISLES.map(a => [a, all.filter(i => aisleOf(i.name, i.cat).id === a.id)]).filter(x => x[1].length)
    : [[{ id: 'all', n: 'Както съм добавил', e: '📝' }, all]];
  const row = i => {
    const h = harmMatch(i.name, i.cat);
    let price = '';
    if (D.idx && D.idx.chains.length) { const ps = D.idx.chains.map(ch => [ch, itemPrice(i, ch)]).filter(x => x[1] != null).sort((a, b) => a[1] - b[1]); if (ps.length) price = `<div class="price">${eur(ps[0][1] * (i.qty || 1))}</div><div class="muted small">${esc(chainName(ps[0][0]))}</div>`; }
    return `<li class="li lrow ${i.done ? 'got' : 'need'}" style="cursor:default"><button class="check ${i.done ? 'on' : ''}" data-check="${i.id}">${i.done ? I.check : ''}</button>
      <div class="grow" data-check2="${i.id}"><div class="title">${esc(i.name)}</div><div class="muted small">${esc(i.cat ? catName(i.cat) : '')}${i.from ? ' · ' + esc(i.from) : ''}${h ? ` · <span class="tag bad">⛔ ${esc(h.name)}</span>` : (typeof drCatTag === 'function' ? drCatTag(i.cat) : '')}</div></div>
      <div class="qty"><button data-qty="${i.id}:-1">−</button><span>${i.qty || 1}</span><button data-qty="${i.id}:1">+</button></div>
      <div class="trail" style="min-width:60px">${price}</div>
      <button class="iconbtn" data-del="${i.id}" aria-label="Изтрий" style="width:30px;height:30px">${I.del}</button></li>`;
  };
  el.innerHTML = `
    <div class="field" style="margin-bottom:10px">${I.plus}<input id="newItem" list="catlist" placeholder="Добави продукт (напр. кисело мляко)"><button class="btn primary small" id="addBtn">Добави</button></div>
    <datalist id="catlist">${allCats.map(([, n]) => `<option value="${esc(n)}">`).join('')}</datalist>
    ${sug.length ? `<div class="card sug-card"><h2>💡 Да не забравиш <span class="muted small" style="font-weight:400">· натисни, за да добавиш</span></h2><div class="sug-chips">${sug.map(s => `<span class="sug" data-sk="${esc(s.k)}"><button data-sadd="${esc(s.k)}" title="${esc(s.why)}">+ ${esc(s.n)}</button><button data-sdis="${esc(s.k)}" aria-label="Скрий">✕</button></span>`).join('')}</div>
      <div class="muted small" style="margin-top:6px">${esc(sug[0].why)}</div></div>` : ''}
    ${all.length ? `<div class="card prog-card"><div class="row between"><b>🛒 ${done.length} от ${all.length} взети</b><span class="muted small">${pct}%</span></div>
      <div class="prog"><i style="width:${pct}%"></i></div>
      <div class="row" style="margin-top:8px;gap:6px;flex-wrap:wrap"><button class="chip ${sortMode === 'aisle' ? 'on' : ''}" data-sort="aisle">🗺️ По щандове</button><button class="chip ${sortMode === 'added' ? 'on' : ''}" data-sort="added">📝 По добавяне</button>
      ${done.length ? '<button class="chip" id="clearDone">🧹 Изчисти взетите</button>' : ''}</div></div>` : `<div class="card empty"><div class="ico">🛒</div>Списъкът е празен.<br>Добави продукти тук, от <b>Цени</b>, от рецептите или от предложенията горе.</div>`}
    ${groups.map(([a, items]) => `<div class="card aisle-card"><h2>${a.e} ${esc(a.n)} <span class="muted small" style="font-weight:400">${items.filter(i => i.done).length}/${items.length}</span></h2><ul class="list">${items.sort((x, y) => (x.done - y.done)).map(row).join('')}</ul></div>`).join('')}
    ${est.best ? `<div class="card hero"><div class="muted small">Най-изгодно за целия списък · ${esc(subtitleFor())}</div>
      <div class="row between"><div class="big">${esc(chainName(est.best.ch))}</div><div class="big">~${eur(est.best.total)}</div></div>
      <div class="muted small">${est.best.covered} от ${all.length} продукта с налични цени</div>
      ${est.split ? `<div class="kpi" style="margin-top:10px">🔀 В два магазина: <b style="display:inline">${esc(chainName(est.split.a))} + ${esc(chainName(est.split.b))}</b> — ~${eur(est.split.total)}</div>` : ''}</div>` : ''}
    ${done.length ? `<button class="btn accent block" id="tripBtn">${I.check} Пазарувах — запиши покупката</button>` : `<button class="btn tonal block" id="tripBtn">🧾 Запиши пазаруване</button>`}`;
  const inp = el.querySelector('#newItem');
  const addName = (v, c) => {
    const k = norm(v); const ex = S.list.find(i => !i.done && norm(i.name) === k);
    if (ex) { ex.qty = (ex.qty || 1) + 1; toast(`${v} вече е в списъка — бройката е увеличена`); }
    else { S.list.unshift({ id: uid(), name: v, cat: c || guessCat(v), qty: 1, done: false, added: Date.now() }); const h = harmMatch(v, c); if (h) toast(`⛔ ${v}: ${h.name}`); }
    save();
  };
  const add = () => {
    const v = inp.value.trim(); if (!v) return;
    const cat = Object.entries(D.meta ? D.meta.categories : {}).find(([, n]) => norm(n) === norm(v));
    addName(v, cat ? +cat[0] : 0); render(); const n = $('#newItem'); if (n) n.focus();
  };
  el.querySelector('#addBtn').onclick = add;
  inp.onkeydown = e => { if (e.key === 'Enter') add(); };
  const toggle = id => { const it = S.list.find(i => i.id === id); if (!it) return; it.done = !it.done; it.doneAt = it.done ? Date.now() : null; save(); render(); if (it.done && S.list.every(i => i.done)) toast('🎉 Всичко е взето! Запиши покупката.'); };
  el.querySelectorAll('[data-check]').forEach(b => b.onclick = () => toggle(b.dataset.check));
  el.querySelectorAll('[data-check2]').forEach(b => b.onclick = () => toggle(b.dataset.check2));
  el.querySelectorAll('[data-qty]').forEach(b => b.onclick = () => { const [id, d] = b.dataset.qty.split(':'); const it = S.list.find(i => i.id === id); it.qty = Math.max(1, (it.qty || 1) + +d); save(); render(); });
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { S.list = S.list.filter(i => i.id !== b.dataset.del); save(); render(); });
  el.querySelectorAll('[data-sort]').forEach(b => b.onclick = () => { S.listSort = b.dataset.sort; save(); render(); });
  el.querySelectorAll('[data-sadd]').forEach(b => b.onclick = () => { const s = sug.find(x => x.k === b.dataset.sadd); if (s) { addName(s.n, s.c); render(); } });
  el.querySelectorAll('[data-sdis]').forEach(b => b.onclick = () => { S.listDismiss = S.listDismiss || {}; S.listDismiss[b.dataset.sdis] = Date.now(); save(); render(); });
  const cd = el.querySelector('#clearDone'); if (cd) cd.onclick = () => { S.list = S.list.filter(i => !i.done); save(); render(); };
  el.querySelector('#tripBtn').onclick = () => tripDialog();
};

/* ─── Отчети по групи продукти (от касовите бележки) ───────────────────── */
function receiptStatsHTML(monthKeyStr) {
  const trips = S.trips.filter(t => t.date.startsWith(monthKeyStr));
  const items = trips.flatMap(t => (t.items || []).filter(i => i.p).map(i => ({ ...i, ch: t.chain, d: t.date })));
  if (!items.length) return `<div class="card"><h2>🧾 Покупки по групи</h2><div class="muted small">Снимай касовите бележки (Списък → 🧾) — MAMA ще разпредели продуктите по групи и ще показва за какво отиват парите.</div></div>`;
  const by = {}; items.forEach(i => { const a = aisleOf(i.n, i.c); (by[a.id] = by[a.id] || { a, sum: 0, n: 0 }); by[a.id].sum += i.p; by[a.id].n++; });
  const rows = Object.values(by).sort((x, y) => y.sum - x.sum); const tot = sum(rows.map(r => r.sum));
  const prod = {}; items.forEach(i => { const k = norm(i.n).slice(0, 28); (prod[k] = prod[k] || { n: i.n, sum: 0, cnt: 0, prices: [] }); prod[k].sum += i.p; prod[k].cnt++; prod[k].prices.push(i.p); });
  const top = Object.values(prod).sort((a, b) => b.sum - a.sum).slice(0, 8);
  const harm = items.filter(i => harmMatch(i.n, i.c, false)); const harmSum = sum(harm.map(i => i.p));
  const healthy = items.filter(i => ['produce', 'fish'].includes(aisleOf(i.n, i.c).id) || [33, 34, 46, 7].includes(+i.c)); const hSum = sum(healthy.map(i => i.p));
  return `<div class="card"><h2>🧾 Покупки по групи (от бележките)</h2>
      <div class="bars wide">${rows.map(r => `<div class="bar"><span class="ellipsis">${r.a.e} ${esc(r.a.n)}</span><div class="track"><div class="fill" style="width:${(r.sum / rows[0].sum * 100).toFixed(0)}%"></div></div><span class="v">${eur(r.sum, 0)}</span></div>`).join('')}</div>
      <div class="muted small" style="margin-top:6px">${items.length} артикула · ${eur(tot)} разпознати от ${trips.filter(t => t.receipt).length || trips.length} бележки</div></div>
    <div class="card"><h2>🥗 Здравословно срещу вредно</h2><div class="row between"><div>🥗 Плодове, зеленчуци, риба, бобови<div class="price">${eur(hSum)} · ${tot ? Math.round(hSum / tot * 100) : 0}%</div></div><div style="text-align:right">⛔ Колбаси, сладко, алкохол и др.<div class="price" style="color:var(--bad)">${eur(harmSum)} · ${tot ? Math.round(harmSum / tot * 100) : 0}%</div></div></div></div>
    <div class="card"><h2>🏆 За какво харча най-много</h2><ul class="list">${top.map(p => `<li class="li" style="cursor:default"><div class="grow"><div class="title">${esc(p.n)}</div><div class="muted small">${p.cnt}× · ${p.prices.length > 1 ? `цена ${eur(Math.min(...p.prices))}–${eur(Math.max(...p.prices))}` : eur(p.prices[0])}</div></div><b>${eur(p.sum)}</b></li>`).join('')}</ul></div>`;
}
(function wireShop() {
  const base = render;
  render = function () {
    base();
    if (current === 'stats') {
      const el = $('#s-stats'); if (el && !el.querySelector('#rcptStats')) {
        const anchor = [...el.querySelectorAll('.section-title')].find(x => /Пазарът/.test(x.textContent));
        const html = `<div id="rcptStats">${receiptStatsHTML(typeof statMonth !== 'undefined' ? statMonth : monthKey(new Date()))}</div>`;
        if (anchor) anchor.insertAdjacentHTML('beforebegin', html); else el.insertAdjacentHTML('beforeend', html);
      }
    }
  };
  // артикулите от бележката (с цени) винаги отиват в покупката
  const baseTrip = tripDialog;
  tripDialog = function () {
    baseTrip();
    const sv = $('#tsave');
    if (sv) sv.addEventListener('click', () => {
      const r = window._rcptLast; const t = S.trips[S.trips.length - 1];
      if (r && t && r.items && r.items.length) { t.items = r.items.map(i => ({ n: i.n, c: i.c, q: i.q || 1, p: i.p })); t.receipt = true; save(); }
      window._rcptLast = null;
    });
  };
  const baseFill = fillTrip;
  fillTrip = function (r) { window._rcptLast = r; baseFill(r); };
})();
