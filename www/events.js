/* MAMA — лични събития в календара: меню, бюджет, списък и съвети; предупреждение 7 дни преди. */
'use strict';

const EV_TYPES = [
  { id: 'bday', n: 'Рожден ден', e: '🎂', menu: ['h_banica_kasmet', 'musaka', 'shopska', 'kiufteta', 'snezhanka'], extra: [['Торта', 1.8], ['Безалкохолни', 1.2], ['Вино/бира', 2]], tips: ['Поръчай тортата поне 3 дни по-рано', 'Мезета и салати се правят в деня, основното може ден по-рано', 'Планирай ~250 г месо и 150 г салата на човек'] },
  { id: 'nameday', n: 'Имен ден', e: '🎉', menu: ['h_banica_kasmet', 'sarmi', 'shopska', 'kavarma', 'snezhanka'], extra: [['Сладкиш', 1], ['Напитки', 2.5]], tips: ['Традиционно — баница, салата и основно ястие', 'Сармите и кавармата са още по-вкусни на следващия ден — гответе ден по-рано'] },
  { id: 'guests', n: 'Гости / вечеря', e: '🍽️', menu: ['shopska', 'musaka', 'pile_oriz', 'snezhanka', 'mlyako_oriz'], extra: [['Десерт', 1], ['Напитки', 2]], tips: ['Едно основно ястие на фурна освобождава време за гостите', 'Предястие + основно + десерт е напълно достатъчно'] },
  { id: 'kids', n: 'Детско парти', e: '🎈', menu: ['kiufteta', 'us_pancakes', 'domati_salata', 'it_pomodoro'], extra: [['Торта', 1.5], ['Сокове и вода', 1], ['Плодове', 1], ['Украса', 0.8]], tips: ['Малки порции, които се ядат с ръка', 'Без ядки и твърди дребни храни при малки деца', 'Питайте за алергии предварително'] },
  { id: 'bbq', n: 'Пикник / барбекю', e: '🔥', menu: ['rs_pljeskavica', 'shopska', 'gr_souvlaki', 'tr_coban'], extra: [['Хляб', 0.5], ['Напитки', 2], ['Въглища и прибори', 1]], tips: ['Мариновай месото вечерта преди', 'Хладилна чанта: суровото месо отделно', 'Месото се пече до вътрешна температура над 70 °C'] },
  { id: 'holiday', n: 'Празнична трапеза', e: '🎄', menu: ['h_svinsko_zele', 'sarmi', 'h_banica_kasmet', 'snezhanka', 'h_kozunak'], extra: [['Напитки', 3], ['Десерт', 1.5]], tips: ['Направи списък 7 дни по-рано — преди празник цените и опашките растат', 'Купи трайните продукти още тази седмица'] },
  { id: 'romantic', n: 'Романтична вечеря', e: '💕', menu: ['it_risotto', 'it_caprese', 'jp_teriyaki', 'us_pancakes'], extra: [['Вино', 6], ['Десерт', 3], ['Свещи и цветя', 5]], tips: ['Избери ястие, което се приготвя за 30–40 мин', 'Десерт може да е купешки — плодове и черен шоколад'] },
  { id: 'office', n: 'Почерпка в офиса', e: '💼', menu: ['h_banica_kasmet', 'mekici', 'banica'], extra: [['Безалкохолни', 1], ['Сладки', 1.5]], tips: ['Баница и сладки са най-лесни за пренасяне', 'Еднократни чинии и салфетки'] },
  { id: 'baptism', n: 'Кръщене / голям празник', e: '🕊️', menu: ['h_agneshko', 'shopska', 'sarmi', 'h_kozunak', 'snezhanka'], extra: [['Торта', 2.5], ['Напитки', 4], ['Подаръци за гостите', 2]], tips: ['При над 25 души помислете за ресторант или кетъринг', 'Направете таблица с гостите и менюто'] },
  { id: 'trip', n: 'Пътуване (храна за път)', e: '🚗', menu: ['es_tortilla', 'h_pitka', 'morkovi_salata'], extra: [['Вода', 1], ['Плодове и ядки', 1.5]], tips: ['Храни, които не се развалят без хладилник', 'Вода — по 1,5 л на човек за ден'] },
  { id: 'detox', n: 'Здравословна седмица', e: '🥗', menu: ['leshta', 'zelen', 'ryba_furna', 'shopska', 'in_dal'], extra: [['Плодове', 3]], tips: ['Повече зеленчуци и вода, без сладки напитки', 'Не е нужно гладуване — нормални порции, по-добри храни'] },
  { id: 'other', n: 'Друго събитие', e: '📌', menu: ['shopska', 'pile_oriz'], extra: [], tips: [] },
];
function EVS() { if (!S.events) S.events = []; return S.events; }
function evType(id) { return EV_TYPES.find(t => t.id === id) || EV_TYPES[EV_TYPES.length - 1]; }
function evPlan(ev) {
  const t = evType(ev.type); const ppl = Math.max(1, +ev.people || 4);
  let dishes = t.menu.map(i => RECIPES.find(r => r.id === i)).filter(Boolean).filter(r => dietOk(r, P().diet, P().noPork) && !recipeBlocked(r));
  if (dishes.length < 2) dishes = t.menu.map(i => RECIPES.find(r => r.id === i)).filter(Boolean);
  const scale = r => Math.max(1, Math.ceil(ppl / (r.serv || 4)));
  let food = 0, covered = 0, chain = null;
  const items = []; dishes.forEach(r => r.ing.filter(i => i[2] && !/по вкус|щипка/.test(i[1])).forEach(i => items.push({ id: i[0] + r.id, name: i[0], cat: i[2], qty: scale(r) })));
  if (D.idx && items.length) { const e = estimate(items); if (e.best) { food = e.best.total; covered = e.best.covered; chain = e.best.ch; } }
  if (!food) food = ppl * 6.5; // ориентир, ако няма цени
  const extras = t.extra.map(([n, per]) => [n, per * ppl]);
  const total = food + sum(extras.map(x => x[1]));
  return { t, ppl, dishes, scale, items, food, extras, total, chain, covered };
}
function evDaysLeft(ev) { const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((new Date(ev.date) - t) / 86400000); }

function eventEdit(ev, date) {
  const x = ev || { id: uid(), date: date || iso(addD(new Date(), 7)), type: 'guests', title: '', people: 4, budget: '', note: '' };
  openSheet(`<h3>${ev ? '✏️ Събитие' : '📌 Ново събитие'}</h3>
    <label class="lbl">Повод</label><div class="world-grid" style="grid-template-columns:repeat(3,1fr)">${EV_TYPES.map(t => `<button class="world-card ev-t ${x.type === t.id ? 'mine' : ''}" data-t="${t.id}" style="padding:10px 6px;text-align:center;align-items:center"><span style="font-size:24px">${t.e}</span><small style="color:var(--text)">${esc(t.n)}</small></button>`).join('')}</div>
    <label class="lbl">Заглавие</label><input class="input" id="eT" value="${esc(x.title)}" placeholder="напр. Рожден ден на Мария">
    <div class="row" style="gap:8px"><div class="grow"><label class="lbl">Дата</label><input class="input" type="date" id="eD" value="${x.date}"></div><div style="width:100px"><label class="lbl">Души</label><input class="input" id="eP" inputmode="numeric" value="${x.people}"></div></div>
    <label class="lbl">Бюджет (€, по желание)</label><input class="input" id="eB" inputmode="decimal" value="${x.budget}" placeholder="напр. 150">
    <label class="lbl">Бележка</label><input class="input" id="eN" value="${esc(x.note)}" placeholder="напр. двама вегетарианци, без ядки">
    <button class="btn primary block" id="eSave" style="margin-top:12px">Запиши</button>${ev ? '<button class="btn tonal block" id="eDel" style="margin-top:8px;color:var(--bad)">Изтрий</button>' : ''}`, el => {
    let type = x.type;
    el.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { type = b.dataset.t; el.querySelectorAll('.ev-t').forEach(z => z.classList.toggle('mine', z === b)); });
    el.querySelector('#eSave').onclick = () => {
      Object.assign(x, { type, title: el.querySelector('#eT').value.trim() || evType(type).n, date: el.querySelector('#eD').value || x.date, people: Math.max(1, +el.querySelector('#eP').value || 1), budget: el.querySelector('#eB').value.replace(',', '.'), note: el.querySelector('#eN').value.trim() });
      if (!EVS().includes(x)) EVS().push(x); save(); scheduleEvents(); closeSheet(); setTimeout(() => showEvent(x.id), 250); toast('Събитието е записано — ще ти напомним 7 дни преди');
    };
    const d = el.querySelector('#eDel'); if (d) d.onclick = () => { S.events = EVS().filter(z => z.id !== x.id); save(); scheduleEvents(); closeSheet(); render(); };
  });
}
function showEvent(id) {
  const ev = EVS().find(e => e.id === id); if (!ev) return;
  const p = evPlan(ev); const left = evDaysLeft(ev); const bud = parseFloat(ev.budget);
  const timeline = [[7, 'Направи списък и купи трайните продукти и напитките'], [3, 'Поръчай торта/месо, ако е нужно; провери съдовете'], [1, 'Пазарувай пресните продукти; приготви ястията, които стават по-вкусни на другия ден'], [0, 'Салати и топли ястия; подреди масата']];
  openSheet(`<div class="recipe-hero" style="background:${THEMES.orange}"><div class="emo-big">${p.t.e}</div><div><div class="small" style="opacity:.9">${fmtDate(ev.date)} ${new Date(ev.date).getFullYear()} · ${left === 0 ? 'днес' : left > 0 ? 'след ' + left + ' дни' : 'минало'}</div><h3 style="color:#fff">${esc(ev.title)}</h3><div class="small">${p.ppl} души${ev.note ? ' · ' + esc(ev.note) : ''}</div></div></div>
    <div class="card" style="margin-top:10px"><h2>💶 Бюджет</h2>
      <div class="row between"><span>Храна за менюто${p.chain ? ` (най-изгодно в ${esc(chainName(p.chain))})` : ' (ориентир)'}</span><b style="white-space:nowrap">${eur(p.food)}</b></div>
      ${p.extras.map(([n, v]) => `<div class="row between small"><span>${esc(n)}</span><span>${eur(v)}</span></div>`).join('')}
      <div class="row between" style="border-top:1px solid var(--line);margin-top:6px;padding-top:6px"><b>Общо</b><b>${eur(p.total)} · ${eur(p.total / p.ppl)}/човек</b></div>
      ${bud ? `<div class="notice ${p.total <= bud ? 'good' : 'warn'}" style="margin-top:8px">${p.total <= bud ? '✅ В рамките на бюджета' : `⚠️ Над бюджета с ${eur(p.total - bud)} — махни едно ястие, купи напитките от ${esc(chainName(p.chain || 'lidl'))} или избери по-евтино основно (пиле вместо телешко/агнешко).`}</div>` : ''}</div>
    <div class="section-title" style="margin-left:0">🍽️ Предложено меню</div><div class="menu-grid">${p.dishes.map(r => recipeTile(r).replace('</div></div>', `</div><div class="small muted">×${p.scale(r)} от рецептата</div></div>`)).join('')}</div>
    <div class="section-title" style="margin-left:0">🗓️ План</div>${timeline.map(([d, t]) => `<div class="suggest"><div class="e">${left > d ? '⏳' : left === d ? '👉' : '✅'}</div><div class="grow small"><b>${d === 0 ? 'В деня' : d + ' ' + (d === 1 ? 'ден' : 'дни') + ' преди'}</b> — ${esc(t)}</div></div>`).join('')}
    ${p.t.tips.length ? `<div class="section-title" style="margin-left:0">💡 Съвети</div>${p.t.tips.map(t => `<div class="suggest"><div class="e">•</div><div class="grow small">${esc(t)}</div></div>`).join('')}` : ''}
    <button class="btn primary block" id="evList" style="margin-top:12px">${I.cart} Добави продуктите в списъка (за ${p.ppl} души)</button>
    <button class="btn tonal block" id="evEdit" style="margin-top:8px">✏️ Промени</button>`, el => {
    el.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => showRecipe(b.dataset.recipe));
    el.querySelector('#evEdit').onclick = () => eventEdit(ev);
    el.querySelector('#evList').onclick = () => {
      let n = 0; p.items.forEach(it => { const k = norm(it.name); const ex = S.list.find(i => !i.done && norm(i.name) === k); if (ex) ex.qty = Math.max(ex.qty || 1, it.qty); else { S.list.push({ id: uid(), name: it.name, cat: it.cat, qty: it.qty, done: false, from: ev.title, added: Date.now() }); n++; } });
      p.extras.forEach(([nm]) => { if (!S.list.some(i => !i.done && norm(i.name) === norm(nm))) { S.list.push({ id: uid(), name: nm, cat: guessCat(nm), qty: 1, done: false, from: ev.title, added: Date.now() }); n++; } });
      save(); closeSheet(); render(); toast(`Добавени ${n} продукта за „${ev.title}“`);
    };
  });
}
async function scheduleEvents() {
  const ln = LN(); if (!ln || !P().notif) return;
  try {
    const st = await ln.checkPermissions(); if (st.display !== 'granted') return;
    await ln.cancel({ notifications: Array.from({ length: 20 }, (_, i) => ({ id: 800 + i })) }).catch(() => {});
    const now = new Date(); const list = [];
    EVS().filter(e => evDaysLeft(e) >= 1).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10).forEach((e, i) => {
      const t = evType(e.type);
      const at7 = addD(new Date(e.date), -7); at7.setHours(10, 0, 0, 0);
      const at1 = addD(new Date(e.date), -1); at1.setHours(17, 0, 0, 0);
      if (at7 > now) list.push({ id: 800 + i * 2, channelId: 'mama', title: `${t.e} След 7 дни: ${e.title}`, body: `Готово меню, списък и бюджет за ${e.people} души. Натисни, за да планираш.`, schedule: { at: at7, allowWhileIdle: true }, extra: { event: e.id }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' });
      if (at1 > now) list.push({ id: 801 + i * 2, channelId: 'mama', title: `${t.e} Утре: ${e.title}`, body: 'Време за пресните продукти и ястията, които се правят ден по-рано.', schedule: { at: at1, allowWhileIdle: true }, extra: { event: e.id }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' });
    });
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) { /* */ }
}
function eventsCard(month) {
  const evs = EVS().filter(e => !month || e.date.slice(0, 7) === month).sort((a, b) => a.date.localeCompare(b.date));
  return `<div class="card" id="evCard"><h2>📌 Моите събития <button class="more" id="evAdd">+ Добави</button></h2>${evs.length ? `<ul class="list">${evs.map(e => { const t = evType(e.type); const l = evDaysLeft(e); return `<li class="li" data-ev="${e.id}"><div class="lead">${t.e}</div><div class="grow"><div class="title">${esc(e.title)}</div><div class="muted small">${fmtDate(e.date)} · ${e.people} души${e.budget ? ' · бюджет ' + eur(+e.budget, 0) : ''}</div></div><span class="tag ${l < 0 ? '' : l <= 7 ? 'promo' : 'best'}">${l < 0 ? 'минало' : l === 0 ? 'днес' : l + ' дни'}</span></li>`; }).join('')}</ul>` : '<div class="muted small">Добави рожден ден, гости, барбекю, празник — MAMA ще предложи меню, бюджет и списък и ще ти напомни 7 дни преди.</div>'}</div>`;
}

(function wireEv() {
  const baseCal = renderCalendar;
  renderCalendar = function (el) {
    baseCal(el);
    const y = calMonth.getFullYear(), m = calMonth.getMonth(); const mk = `${y}-${String(m + 1).padStart(2, '0')}`;
    const evs = EVS().filter(e => e.date.slice(0, 7) === mk);
    el.querySelectorAll('.cal-d').forEach(b => {
      const d = +b.querySelector('span').textContent; const ds = `${mk}-${String(d).padStart(2, '0')}`;
      const mine = evs.filter(e => e.date === ds);
      if (mine.length) { b.classList.add('ev'); if (!b.querySelector('i')) b.insertAdjacentHTML('beforeend', `<i>${evType(mine[0].type).e}</i>`); else b.insertAdjacentHTML('beforeend', '<em class="evdot"></em>'); }
      b.onclick = () => { if (mine.length) showEvent(mine[0].id); else if (b.dataset.hol) showHoliday(b.dataset.hol, new Date(y, 0, 1)); else eventEdit(null, ds); };
    });
    const cal = el.querySelector('.cal'); const card = cal && cal.closest('.card');
    if (card) {
      card.insertAdjacentHTML('afterend', eventsCard(mk));
      el.querySelector('#evAdd').onclick = () => eventEdit(null);
      el.querySelectorAll('[data-ev]').forEach(b => b.onclick = () => showEvent(b.dataset.ev));
      const hint = card.querySelector('.muted.small'); if (hint) hint.textContent = '🟥 голям празник · 🟩 пости · натисни празен ден, за да добавиш събитие';
    }
  };
  const base = render;
  render = function () {
    base();
    if (current === 'home') {
      const h = $('#s-home'); if (!h || h.querySelector('#evHome')) return;
      const up = EVS().filter(e => { const l = evDaysLeft(e); return l >= 0 && l <= 14; }).sort((a, b) => a.date.localeCompare(b.date))[0];
      if (up) { const t = evType(up.type); const l = evDaysLeft(up);
        h.insertAdjacentHTML('afterbegin', `<div class="tip-banner" id="evHome" style="background:${THEMES.orange}"><div class="tip-emo">${t.e}</div><div class="grow"><b>${l === 0 ? 'Днес' : l === 1 ? 'Утре' : 'След ' + l + ' дни'}: ${esc(up.title)}</b><div class="small">Меню, бюджет и списък за ${up.people} души →</div></div><div class="tip-go">›</div></div>`);
        h.querySelector('#evHome').onclick = () => showEvent(up.id); }
    }
  };
  // 7 дни преди: прозорец за събитие или голям празник
  const baseCand = candidates;
  candidates = function () {
    const c = baseCand();
    const shown = S.guide.ev7 || {};
    const ev = EVS().find(e => { const l = evDaysLeft(e); return l >= 0 && l <= 7 && !shown[e.id]; });
    if (ev) c.push({ pr: 93, fn: () => { S.guide.ev7 = { ...shown, [ev.id]: 1 }; save(); const p = evPlan(ev); const l = evDaysLeft(ev);
      popup({ theme: 'orange', emoji: p.t.e, key: 'ev', kicker: `${l === 0 ? 'Днес' : 'След ' + l + ' дни'} · ${fmtDate(ev.date)}`, title: esc(ev.title), text: `Меню: ${p.dishes.slice(0, 3).map(r => esc(r.name)).join(', ')}<br>💶 Ориентировъчен бюджет: <b>${eur(p.total)}</b> за ${p.ppl} души${ev.budget ? ` (твоят: ${eur(+ev.budget)})` : ''}`, actions: [{ label: '📋 Виж плана', primary: true, fn: () => showEvent(ev.id) }, { label: 'По-късно', fn: null }] }); } });
    const hol = upcomingHolidays(6, 7).find(h => h.big && !shown['h' + h.id + h.date.getFullYear()] && (h.date - new Date()) / 86400000 > 2);
    if (hol) c.push({ pr: 74, fn: () => { S.guide.ev7 = { ...shown, ['h' + hol.id + hol.date.getFullYear()]: 1 }; save(); const dd = Math.ceil((hol.date - new Date()) / 86400000);
      popup({ theme: (TH[hol.t] || TH.church).g, emoji: hol.emo, key: 'hol7', kicker: `След ${dd} дни`, title: `${esc(hol.n)} наближава`, text: 'Празнично меню, списък и бюджет — направи плана сега, преди цените и опашките.', actions: [{ label: '🍽️ Празнично меню', primary: true, fn: () => showHoliday(hol.id) }, { label: '📌 Планирай трапеза', fn: () => eventEdit({ id: uid(), date: iso(hol.date), type: 'holiday', title: hol.n, people: P().household || 4, budget: '', note: '' }) }] }); } });
    return c.sort((a, b) => b.pr - a.pr);
  };
  const ln = LN();
  if (ln) ln.addListener('localNotificationActionPerformed', a => { const e = (a && a.notification && a.notification.extra) || {}; if (e.event) setTimeout(() => { go('calendar'); showEvent(e.event); }, 800); });
})();
document.addEventListener('DOMContentLoaded', () => setTimeout(scheduleEvents, 5000));
