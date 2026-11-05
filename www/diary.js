/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Дневник на храненето: записваш какво си ял (по желание), в неделя MAMA прави оценка на седмицата —
   изчислява, дава становище и съвети. Всичко остава само на телефона. */
const DMEALS = { b: ['Закуска', '🌅'], l: ['Обяд', '☀️'], d: ['Вечеря', '🌙'], s: ['Междинно', '🍎'] };
const DPOR = [[0.5, 'малка'], [1, 'нормална'], [1.5, 'голяма'], [2, 'двойна']];
const DQUICK = [['🥗', 'Салата'], ['🍎', 'Плод'], ['🥛', 'Кисело мляко'], ['🍲', 'Супа'], ['🥪', 'Сандвич'], ['🍕', 'Пица'], ['🥐', 'Баница'], ['🍫', 'Шоколад'], ['🍺', 'Бира'], ['🍷', 'Чаша вино'], ['🥤', 'Газирана напитка'], ['🥜', 'Шепа ядки']];

/* ─── разпознаване: какво има в храната ─── */
const DIARY_KW = {
  veg: /салат|домат|краставиц|морков|зеле|спанак|броколи|чушк|пипер(?!.*черен)|тиквич|патладжан|гъб|карфиол|аспержи|цвекло|марул|рукола|лапад|киселец|тиква|шопска|овчарска|снежанка|таратор|гювеч|зеленчу|лютеница|кьопоолу|туршия|бамя|праз/,
  fruit: /ябълк|банан|портокал|мандарин|грозде|ягод|плод|круш|киви|праскова|кайсия|диня|пъпеш|слив|боровинк|малин|череш|вишн|нар\b|смути|фурми|смокин|грейпфрут|ананас|манго/,
  fish: /риба|рибен|сьомга|скумрия|пъстърва|ципура|лаврак|тон\b|сардин|хамсия|цаца|треска|скарид|миди|калмар|паламуд|сафрид|херинга/,
  processed: /колбас|салам|луканка|суджук|надениц|кренвирш|бекон|шунка|пастърма|хот-дог|хотдог|дебърцин|филе елена|сушен/,
  red: /свинск|телешк|агнешк|кайма|мусака|кебап|кавърма|пържола|бургер|кюфте|сарма|дроб|шкембе|гювеч с месо|яхния|овнешк|говежд|пълнени чушки/,
  poultry: /пил|пуйк|пуешк|патешк/,
  legumes: /боб|леща|нахут|грах|фасул|хумус|соя|едамаме/,
  whole: /пълнозърн|овес|овесен|ръжен|елда|киноа|кафяв ориз|булгур|мюсли|спелта|лимец/,
  dairy: /мляко|кисело|сирене|кашкавал|извара|айрян|йогурт|кефир|скир/,
  sweet: /торта|паста\b|пасти|шоколад|бонбон|бисквит|вафл|сладолед|десерт|кекс|мекиц|палачинк|захар|гофрет|понички|еклер|баклава|тирамису|чийзкейк|мъфин|сладко|халва|локум|крем карамел|козунак|курабии/,
  pastry: /баница|бутер|кроасан|пица|мекиц|понички|кифл|пирож|бюрек|питка|тутманик|катми|милинки|бял хляб|франзела|сандвич|принцес|тост/,
  fried: /пържен|пържени|\bфри\b|чипс|панира|мекиц|понички|шницел|наггетс|кюфтета|кебапчета|кроке|темпура/,
  fast: /дюнер|бургер|пица|хот-дог|хотдог|наггетс|макдоналдс|kfc|фаст|сандвич от бензиностанция|пакетче чипс/,
  drink: /кола|газиран|енергийна|фанта|спрайт|айс ти|нектар|сок от кутия|лимонада|милкшейк/,
  alcohol: /бира|вино|ракия|уиски|водка|коктейл|джин|ром|мастика|узо|ликьор|шампанско/,
  nuts: /ядк|орех|бадем|лешни|кашу|шам-фъстък|фъстъци|семк|тиквено семе|ленено|чиа/,
};
const dX = n => `${n} ${n === 1 ? 'път' : 'пъти'}`;
const dNorm = s => String(s || '').toLowerCase().replace(/ё/g, 'е');
function dClassify(text, rec) {
  const base = dNorm(text);
  const ingTxt = rec && rec.ing ? rec.ing.map(i => dNorm(i[0])).join(' | ') : '';
  const t = base + ' | ' + ingTxt;
  const f = {};
  for (const [k, re] of Object.entries(DIARY_KW)) f[k] = re.test(k === 'sweet' || k === 'pastry' || k === 'fried' || k === 'fast' || k === 'drink' || k === 'alcohol' ? base + (rec && ['dessert', 'pastry'].includes(rec.group) ? ' десерт' : '') : t) ? 1 : 0;
  if (rec) {
    try { const tg = recipeTags(rec); if (tg.fish) f.fish = 1; if (tg.meat && !f.poultry && !f.fish && !f.processed) f.red = f.red || (tg.pork ? 1 : 0); } catch (e) {}
    if (rec.group === 'salad') f.veg = 1;
    if (rec.group === 'dessert') f.sweet = 1;
  }
  // порции зеленчуци/плодове (грубо): салата = 2, гарнитура/ястие със зеленчуци = 1, плод = 1
  f.vegN = f.veg ? (/салат|шопска|овчарска|снежанка|таратор/.test(base) || (rec && rec.group === 'salad') ? 2 : 1) : 0;
  f.fruitN = f.fruit ? (/смути|плодова салата/.test(base) ? 2 : 1) : 0;
  return f;
}
function dKcal(f, meal, por) {
  let k = meal === 's' ? 180 : meal === 'b' ? 380 : 600;
  if (f.alcohol) k = /бира/.test(f._n || '') ? 210 : /ракия|уиски|водка|джин|ром/.test(f._n || '') ? 110 : 130;
  else if (f.drink) k = 160;
  else if (f.fast) k = 850;
  else if (f.sweet && !f.pastry) k = meal === 's' ? 300 : 400;
  else if (f.pastry) k = 450;
  else if (f.fruit && !f.veg && !f.dairy && meal === 's') k = 90;
  else if (f.nuts && meal === 's') k = 180;
  else if (/салат/.test(f._n || '') && !f.red && !f.processed) k = 250;
  else if (/супа|чорба|таратор/.test(f._n || '')) k = 230;
  if (f.fried && !f.fast) k += 150;
  return Math.round(k * (por || 1) / 10) * 10;
}

/* ─── данни ─── */
function DIARY() { if (!S.diary) S.diary = { e: [], weeks: {}, remind: false }; return S.diary; }
function dMealNow() { const h = new Date().getHours(), m = new Date().getMinutes(); const x = h * 60 + m; return x < 630 ? 'b' : x < 900 ? 'l' : x < 1050 ? 's' : 'd'; }
function dAdd(name, meal, por = 1, rid = null, date = todayISO()) {
  name = String(name || '').trim().slice(0, 80); if (!name) return null;
  const rec = rid ? RECIPES.find(r => r.id === rid) : RECIPES.find(r => dNorm(r.name) === dNorm(name));
  const f = dClassify(name, rec); f._n = dNorm(name);
  const e = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), d: date, m: meal || dMealNow(), n: name, rid: rec ? rec.id : null, p: por, k: dKcal(f, meal || dMealNow(), por), f, t: Date.now() };
  delete e.f._n;
  DIARY().e.push(e); if (DIARY().e.length > 2000) DIARY().e.splice(0, DIARY().e.length - 2000);
  save(); try { if (typeof statsHit === 'function' && !(S.settings && S.settings.noStats)) statsHit('diary'); } catch (err) {}
  return e;
}
function dWeekDays(ref = new Date()) { const mon = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7)); return [...Array(7)].map((_, i) => { const x = new Date(mon); x.setDate(mon.getDate() + i); return isoD(x); }); }
function isoD(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function dEntries(days) { const set = new Set(days); return DIARY().e.filter(e => set.has(e.d)); }

/* ─── оценка на седмицата ─── */
function dEvaluate(ref = new Date()) {
  const days = dWeekDays(ref), es = dEntries(days);
  const logged = [...new Set(es.map(e => e.d))];
  const nd = logged.length;
  const sumF = k => es.reduce((a, e) => a + ((e.f && e.f[k]) || 0) * (k.endsWith('N') ? (e.p >= 1.5 ? 1.5 : 1) : 1), 0);
  const cnt = k => es.filter(e => e.f && e.f[k]).length;
  const m = {
    days: nd, meals: es.length,
    kcal: nd ? Math.round(es.reduce((a, e) => a + (e.k || 0), 0) / nd / 10) * 10 : 0,
    vf: nd ? (sumF('vegN') + sumF('fruitN')) / nd : 0,
    fish: cnt('fish'), legumes: cnt('legumes'), wholeDays: new Set(es.filter(e => e.f && e.f.whole).map(e => e.d)).size,
    processed: cnt('processed'), red: cnt('red'), sweet: es.filter(e => e.f && (e.f.sweet || (e.f.pastry && !e.f.veg))).length,
    fried: es.filter(e => e.f && (e.f.fried || e.f.fast)).length, drink: cnt('drink'), alcohol: cnt('alcohol'), nuts: cnt('nuts'),
    bfDays: new Set(es.filter(e => e.m === 'b').map(e => e.d)).size,
    variety: new Set(es.map(e => dNorm(e.n))).size,
  };
  // при по-малко записани дни сравняваме пропорционално към цяла седмица
  const scale = nd ? 7 / nd : 1;
  const wk = k => m[k] * scale;
  const health = (typeof hOn === 'function' && hOn()) ? hActive().map(h => h.k) : [];
  const parts = [
    ['vf', 'Зеленчуци и плодове', `${m.vf.toFixed(1)} порции на ден`, '5 на ден (400 г)', 25, Math.min(1, m.vf / 5)],
    ['fish', 'Риба', dX(m.fish), '2 пъти седмично', 10, Math.min(1, wk('fish') / 2)],
    ['legumes', 'Бобови', dX(m.legumes), '2+ пъти седмично', 10, Math.min(1, wk('legumes') / 2)],
    ['whole', 'Пълнозърнести', `${m.wholeDays} от ${nd || 7} дни`, 'всеки ден', 10, nd ? Math.min(1, m.wholeDays / nd) : 0],
    ['processed', 'Колбаси и преработено месо', dX(m.processed), 'колкото по-рядко', health.includes('heart') || health.includes('bp') ? 12 : 10, wk('processed') <= 0.5 ? 1 : wk('processed') <= 2 ? 0.5 : wk('processed') <= 4 ? 0.2 : 0],
    ['red', 'Червено месо', dX(m.red), 'до 3 пъти седмично', health.includes('uric') ? 12 : 10, wk('red') <= 3 ? 1 : wk('red') <= 5 ? 0.5 : 0],
    ['sweet', 'Сладко и тестени', dX(m.sweet), 'до 3 пъти седмично', health.includes('sugar') ? 12 : 10, wk('sweet') <= 3 ? 1 : wk('sweet') <= 6 ? 0.5 : 0],
    ['fried', 'Пържено и фаст фууд', dX(m.fried), 'до 1 път седмично', 5, wk('fried') <= 1 ? 1 : wk('fried') <= 3 ? 0.5 : 0],
    ['drinks', 'Алкохол и сладки напитки', dX(m.alcohol + m.drink), 'възможно най-рядко', 5, wk('alcohol') + wk('drink') <= 2 ? 1 : wk('alcohol') + wk('drink') <= 5 ? 0.5 : 0],
    ['bf', 'Редовна закуска', `${m.bfDays} от ${nd || 7} дни`, 'всеки ден', 5, nd ? Math.min(1, m.bfDays / nd) : 0],
  ];
  const max = parts.reduce((a, p) => a + p[4], 0);
  const score = nd ? Math.round(parts.reduce((a, p) => a + p[4] * p[5], 0) / max * 100) : 0;
  const grade = score >= 85 ? ['Отлично', '🏆'] : score >= 70 ? ['Много добре', '🌟'] : score >= 55 ? ['Добре', '👍'] : score >= 40 ? ['Средно', '🙂'] : ['Има какво да се подобри', '💪'];
  return { days, m, parts, score, grade, nd, health, enough: nd >= 3 && es.length >= 6 };
}
function dVerdict(ev) {
  const { m, parts, nd } = ev;
  const good = parts.filter(p => p[5] >= 0.99).map(p => p[1].toLowerCase());
  const weak = parts.filter(p => p[5] < 0.5).sort((a, b) => b[4] * (1 - b[5]) - a[4] * (1 - a[5]));
  let s = `Тази седмица си записал <b>${m.meals} хранения в ${nd} ${nd === 1 ? 'ден' : 'дни'}</b>. `;
  s += `Средно около <b>${m.kcal} kcal на ден</b> (приблизително, по вида и размера на порцията). `;
  if (good.length) s += `Силна страна: ${good.slice(0, 3).join(', ')}. `;
  if (weak.length) s += `Най-много можеш да спечелиш от: ${weak.slice(0, 2).map(p => p[1].toLowerCase()).join(' и ')}.`;
  else s += 'Нямаш сериозни слаби места — продължавай така.';
  if (m.variety < 8 && m.meals >= 10) s += ' Менюто е доста еднообразно — опитай нови ястия от рецептите.';
  return s;
}
const DTIPS = {
  vf: ['Добави салата към обяда и вечерята и плод като междинно хранене — това са 5 порции.', r => r.group === 'salad'],
  fish: ['Сготви риба 2 пъти тази седмица — скумрия, сьомга или пъстърва на фурна са бързи.', r => { try { return recipeTags(r).fish; } catch (e) { return false; } }],
  legumes: ['Боб, леща или нахут 2 пъти седмично — евтин протеин и фибри.', r => /боб|леща|нахут/.test(dNorm(r.name))],
  whole: ['Смени белия хляб с пълнозърнест и опитай овесена каша сутрин.', r => /овес|пълнозърн|елда|булгур|киноа/.test(dNorm(r.name + ' ' + r.ing.map(i => i[0]).join(' ')))],
  processed: ['Замени колбасите и салама с пуешко филе на фурна, хумус или яйце.', null],
  red: ['Червено месо до 3 пъти седмично — в другите дни пиле, риба или бобови.', null],
  sweet: ['Сладкото до 3 пъти седмично — избирай плод, кисело мляко с мед или здравословен десерт.', r => r.group === 'dessert' && /здрав|без захар|фурм|овес/.test(dNorm((r.note || '') + r.name + (r.dk || '')))],
  fried: ['Пържено и фаст фууд — най-много веднъж седмично. Фурната и тиганът с малко зехтин са добра замяна.', null],
  drinks: ['Вода, айрян или чай вместо сладки напитки; алкохолът — по изключение.', null],
  bf: ['Не пропускай закуската — MAMA предлага закуска всяка сутрин до 08:30.', null],
};
function dTips(ev) {
  const weak = ev.parts.filter(p => p[5] < 0.75).sort((a, b) => b[4] * (1 - b[5]) - a[4] * (1 - a[5])).slice(0, 3);
  return weak.map(p => {
    const [txt, fn] = DTIPS[p[0]] || ['', null];
    let rec = null;
    if (fn) { const pool = RECIPES.filter(r => r.ing && fn(r) && (typeof prefRecipeOk !== 'function' || prefRecipeOk(r, false))); if (pool.length) { const h = [...String(isoWeek()) + p[0]].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7); rec = pool[h % pool.length]; } }
    return { k: p[0], title: p[1], txt, rec };
  });
}

/* ─── екран ─── */
let dDay = null;
function renderDiary(el) {
  const D_ = DIARY(); if (!dDay) dDay = todayISO();
  const es = D_.e.filter(e => e.d === dDay);
  const dt = new Date(dDay + 'T12:00');
  const isToday = dDay === todayISO();
  const ev = dEvaluate(dt);
  const days = dWeekDays(dt);
  const perDay = days.map(d => D_.e.filter(e => e.d === d).length);
  const kcal = es.reduce((a, e) => a + (e.k || 0), 0);
  el.innerHTML = `
    <div class="card dy-hero"><div class="row between" style="align-items:center">
      <button class="btn tonal small" id="dyPrev" aria-label="Предишен ден">‹</button>
      <div style="text-align:center"><b style="font-size:18px">${isToday ? 'Днес' : esc(dt.toLocaleDateString('bg-BG', { weekday: 'long' }))}</b><div class="small" style="opacity:.9">${esc(dt.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long' }))} · ${es.length} ${es.length === 1 ? 'хранене' : 'хранения'}${kcal ? ` · ~${kcal} kcal` : ''}</div></div>
      <button class="btn tonal small" id="dyNext" aria-label="Следващ ден" ${isToday ? 'disabled' : ''}>›</button></div></div>
    ${Object.entries(DMEALS).map(([k, [t, e]]) => { const xs = es.filter(x => x.m === k); return `<div class="card"><div class="row between" style="align-items:center"><h2 style="margin:0">${e} ${t}</h2><button class="btn tonal small" data-add="${k}">+ Добави</button></div>
      ${xs.length ? `<ul class="list" style="margin-top:6px">${xs.map(x => `<li class="li"><div class="grow"><div class="title">${esc(x.n)}${x.p !== 1 ? ` <span class="muted small">· ${esc((DPOR.find(p => p[0] === x.p) || [0, ''])[1])} порция</span>` : ''}</div><div class="muted small">~${x.k} kcal${dBadges(x.f)}</div></div>${x.rid ? `<button class="btn tonal small" data-rec="${x.rid}" aria-label="Рецепта">📖</button>` : ''}<button class="btn tonal small" data-del="${x.id}" aria-label="Изтрий">✕</button></li>`).join('')}</ul>` : `<div class="muted small" style="margin-top:6px">Нищо записано</div>`}</div>`; }).join('')}
    <div class="card"><h2>📊 Седмицата</h2>
      <div class="dy-bars">${days.map((d, i) => `<div class="dy-bar ${d === dDay ? 'on' : ''}" data-day="${d}"><span style="height:${Math.min(100, perDay[i] * 22)}%"></span><i>${['П', 'В', 'С', 'Ч', 'П', 'С', 'Н'][i]}</i></div>`).join('')}</div>
      ${ev.enough ? `<div class="row between" style="align-items:center;margin-top:10px"><div><b style="font-size:22px">${ev.score}</b>/100 · ${ev.grade[1]} ${esc(ev.grade[0])}</div><button class="btn primary small" id="dyEval">Оценка и съвети</button></div>`
        : `<div class="muted small" style="margin-top:8px">За оценка запиши поне 3 дни (засега ${ev.nd}). В неделя вечер MAMA ще ти даде оценка, становище и съвети.</div>${ev.nd ? '<button class="btn tonal small" id="dyEval" style="margin-top:8px">Предварителна оценка</button>' : ''}`}
    </div>
    <div class="card"><label class="row between" style="align-items:center"><span>🔔 Подсещай ме вечер в 20:30 да запиша</span><input type="checkbox" id="dyRem" ${D_.remind ? 'checked' : ''} style="width:24px;height:24px;accent-color:#0e7a5c"></label>
      <div class="muted small" style="margin-top:6px">Дневникът е по желание и остава само на телефона. Калориите са приблизителни — MAMA не е медицинско изделие.</div></div>`;
  el.querySelector('#dyPrev').onclick = () => { const x = new Date(dDay + 'T12:00'); x.setDate(x.getDate() - 1); dDay = isoD(x); renderDiary(el); };
  el.querySelector('#dyNext').onclick = () => { if (isToday) return; const x = new Date(dDay + 'T12:00'); x.setDate(x.getDate() + 1); dDay = isoD(x); renderDiary(el); };
  el.querySelectorAll('[data-add]').forEach(b => b.onclick = () => dAddSheet(b.dataset.add, dDay));
  el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { D_.e = D_.e.filter(x => x.id !== b.dataset.del); save(); renderDiary(el); });
  el.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => showRecipe(b.dataset.rec));
  el.querySelectorAll('[data-day]').forEach(b => b.onclick = () => { if (b.dataset.day <= todayISO()) { dDay = b.dataset.day; renderDiary(el); } });
  const ev_ = el.querySelector('#dyEval'); if (ev_) ev_.onclick = () => dWeekSheet(dt);
  el.querySelector('#dyRem').onchange = e => { D_.remind = e.target.checked; save(); dSchedule(); toast(e.target.checked ? 'Ще те подсещам в 20:30' : 'Подсещането е изключено'); };
}
function dBadges(f) {
  if (!f) return '';
  const b = [];
  if (f.vegN) b.push('🥬'); if (f.fruitN) b.push('🍎'); if (f.fish) b.push('🐟'); if (f.legumes) b.push('🫘'); if (f.whole) b.push('🌾');
  if (f.processed) b.push('🌭'); if (f.sweet) b.push('🍬'); if (f.fried || f.fast) b.push('🍟'); if (f.alcohol) b.push('🍷'); if (f.drink) b.push('🥤');
  return b.length ? ' · ' + b.join(' ') : '';
}
function dAddSheet(meal = dMealNow(), date = todayISO()) {
  let por = 1, m = meal;
  const today = date === todayISO();
  const sug = [];
  try { if (today) { const b = bfPick(0); if (b) sug.push(['b', b.n, 'bf_' + b.i]); const l = mealPick('l', 0); if (l) sug.push(['l', l.name, l.id]); const d = mealPick('d', 0); if (d) sug.push(['d', d.name, d.id]); } } catch (e) {}
  const recent = [...new Map(DIARY().e.slice().reverse().map(e => [dNorm(e.n), e])).values()].slice(0, 6);
  openSheet(`<h3>🍽️ Какво яде?</h3>
    <div class="chips" id="dyMeal" style="margin:6px 0 10px">${Object.entries(DMEALS).map(([k, [t, e]]) => `<button class="chip ${k === m ? 'on' : ''}" data-m="${k}">${e} ${t}</button>`).join('')}</div>
    <input id="dyIn" class="input" placeholder="напр. боб чорба, шопска салата, баница…" autocomplete="off" style="width:100%">
    <ul class="list" id="dySug" style="margin-top:4px"></ul>
    <div class="muted small" style="margin:10px 0 4px">Порция</div>
    <div class="chips" id="dyPor">${DPOR.map(([v, t]) => `<button class="chip ${v === 1 ? 'on' : ''}" data-p="${v}">${t}</button>`).join('')}</div>
    <button class="btn primary block" id="dyOk" style="margin-top:12px">Запиши</button>
    ${sug.length ? `<div class="muted small" style="margin:14px 0 4px">Предложенията на MAMA за днес</div><div class="chips">${sug.map(([k, n, id]) => `<button class="chip" data-q="${esc(n)}" data-r="${id}" data-mm="${k}">${DMEALS[k][1]} ${esc(n)}</button>`).join('')}</div>` : ''}
    ${recent.length ? `<div class="muted small" style="margin:14px 0 4px">Наскоро</div><div class="chips">${recent.map(e => `<button class="chip" data-q="${esc(e.n)}" ${e.rid ? `data-r="${e.rid}"` : ''}>${esc(e.n)}</button>`).join('')}</div>` : ''}
    <div class="muted small" style="margin:14px 0 4px">Бързо</div><div class="chips">${DQUICK.map(([e, n]) => `<button class="chip" data-q="${n}">${e} ${n}</button>`).join('')}</div>`, el => {
    const inp = el.querySelector('#dyIn'), list = el.querySelector('#dySug');
    let rid = null;
    const commit = (name, r, mm) => {
      const e = dAdd(name, mm || m, por, r || rid, date); if (!e) { inp.focus(); return; }
      toast(`Записано: ${e.n}`); closeSheet(); if (current === 'diary') renderDiary($('#s-diary'));
    };
    inp.oninput = () => {
      rid = null; const q = dNorm(inp.value.trim());
      if (q.length < 2) { list.innerHTML = ''; return; }
      const hits = RECIPES.filter(r => dNorm(r.name).includes(q)).slice(0, 6);
      list.innerHTML = hits.map(r => `<li class="li" data-pick="${r.id}"><div class="lead">${groupIcon(r.group)}</div><div class="grow"><div class="title">${esc(r.name)}</div></div></li>`).join('');
      list.querySelectorAll('[data-pick]').forEach(li => li.onclick = () => { const r = RECIPES.find(x => x.id === li.dataset.pick); inp.value = r.name; rid = r.id; list.innerHTML = ''; });
    };
    inp.onkeydown = e => { if (e.key === 'Enter') commit(inp.value); };
    el.querySelectorAll('#dyMeal [data-m]').forEach(b => b.onclick = () => { m = b.dataset.m; el.querySelectorAll('#dyMeal .chip').forEach(c => c.classList.toggle('on', c === b)); });
    el.querySelectorAll('#dyPor [data-p]').forEach(b => b.onclick = () => { por = +b.dataset.p; el.querySelectorAll('#dyPor .chip').forEach(c => c.classList.toggle('on', c === b)); });
    el.querySelector('#dyOk').onclick = () => commit(inp.value);
    el.querySelectorAll('[data-q]').forEach(b => b.onclick = () => commit(b.dataset.q, b.dataset.r, b.dataset.mm));
    setTimeout(() => inp.focus(), 250);
  });
}
function dWeekSheet(ref = new Date()) {
  const ev = dEvaluate(ref), tips = dTips(ev);
  const wk = isoWeek(ref), prevKey = isoWeek(new Date(ref.getTime() - 7 * 864e5));
  const prev = (DIARY().weeks || {})[prevKey];
  if (ev.enough) { DIARY().weeks[wk] = { s: ev.score, d: ev.nd, k: ev.m.kcal }; save(); }
  const ring = `<svg viewBox="0 0 120 120" width="120" height="120" aria-label="Оценка ${ev.score} от 100"><circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="12"/><circle cx="60" cy="60" r="50" fill="none" stroke="#fde68a" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(ev.score / 100 * 314).toFixed(0)} 314" transform="rotate(-90 60 60)"/><text x="60" y="68" text-anchor="middle" font-size="30" font-weight="800" fill="#fff">${ev.score}</text></svg>`;
  openSheet(`<div class="dy-score">${ring}<div><div class="small" style="opacity:.9">Оценка на седмицата${ev.enough ? '' : ' · предварителна'}</div><h3 style="color:#fff;margin:2px 0">${ev.grade[1]} ${esc(ev.grade[0])}</h3>
      ${prev ? `<div class="small" style="opacity:.95">${ev.score > prev.s ? `▲ с ${ev.score - prev.s} точки по-добре от миналата седмица` : ev.score < prev.s ? `▼ с ${prev.s - ev.score} точки под миналата седмица` : 'Колкото миналата седмица'}</div>` : ''}</div></div>
    <p style="margin:12px 2px">${dVerdict(ev)}</p>
    ${ev.health.length ? `<div class="notice">❤️ Оценката отчита изследванията ти в My Doctor — по-голяма тежест на ${esc(hActive().map(h => h.why).join(', '))}.</div>` : ''}
    <table class="dy-tbl"><tr><th>Показател</th><th>Ти</th><th>Цел</th><th></th></tr>
      ${ev.parts.map(p => `<tr><td>${esc(p[1])}</td><td>${esc(p[2])}</td><td class="muted">${esc(p[3])}</td><td>${p[5] >= 0.99 ? '✅' : p[5] >= 0.5 ? '🟡' : '🔴'}</td></tr>`).join('')}</table>
    ${tips.length ? `<div class="section-title" style="margin-left:0">Съвети за следващата седмица</div>${tips.map(t => `<div class="card" style="margin:8px 0"><b>${esc(t.title)}</b><div class="small" style="margin-top:4px">${esc(t.txt)}</div>${t.rec ? `<button class="btn tonal small" data-rec="${t.rec.id}" style="margin-top:8px">📖 ${esc(t.rec.name)}</button>` : ''}</div>`).join('')}` : ''}
    ${typeof fitCard === 'function' ? fitCard('health') : ''}
    <button class="btn block" id="dyShare" style="margin-top:10px">📨 Сподели резултата</button>
    <p class="muted small" style="margin-top:10px">Сметките са по записаното в дневника и препоръките на СЗО и Българските препоръки за здравословно хранене. Калориите са приблизителни. Не е медицински съвет.</p>`, el => {
    el.querySelectorAll('[data-rec]').forEach(b => b.onclick = () => showRecipe(b.dataset.rec));
    if (typeof bindFit === 'function') bindFit(el);
    el.querySelector('#dyShare').onclick = async () => {
      const txt = `🍽️ Моята седмица в MAMA: ${ev.score}/100 — ${ev.grade[0]} ${ev.grade[1]}\n${ev.m.vf.toFixed(1)} порции зеленчуци и плодове на ден, риба ${dX(ev.m.fish)}, бобови ${dX(ev.m.legumes)}.\nhttps://ngerchev-code.github.io/mama/`;
      try { const SH = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share; if (SH) return await SH.share({ text: txt }); if (navigator.share) return await navigator.share({ text: txt }); } catch (e) { return; }
      try { await navigator.clipboard.writeText(txt); toast('Копирано'); } catch (e) {}
    };
  });
}

/* ─── известия: неделя 19:00 оценка; по желание всяка вечер 20:30 ─── */
async function dSchedule() {
  const ln = typeof LN === 'function' && LN(); if (!ln) return;
  try {
    if ((await ln.checkPermissions()).display !== 'granted') return;
    const ids = [1700, 1701, 1702, 1703, 1704, 1705, 1706, 1707, 1708];
    await ln.cancel({ notifications: ids.map(id => ({ id })) }).catch(() => {});
    const list = [], now = new Date(), D_ = DIARY();
    const used = D_.e.some(e => Date.now() - e.t < 21 * 864e5);
    if (used) {
      const sun = new Date(now); sun.setDate(now.getDate() + ((7 - now.getDay()) % 7)); sun.setHours(19, 0, 0, 0); if (sun <= now) sun.setDate(sun.getDate() + 7);
      list.push({ id: 1700, channelId: 'meals', title: '📊 Оценката на седмицата е готова', body: 'Виж как си се хранил тази седмица, становище и 3 съвета от MAMA 👉', schedule: { at: sun, allowWhileIdle: true }, extra: { diary: 'week' }, smallIcon: 'ic_stat_mama', iconColor: '#0E7A5C' });
    }
    if (D_.remind) for (let i = 0; i < 7; i++) {
      const at = new Date(now); at.setDate(now.getDate() + i); at.setHours(20, 30, 0, 0); if (at <= now) continue;
      list.push({ id: 1701 + i, channelId: 'meals', title: '🍽️ Какво яде днес?', body: 'Запиши за 10 секунди — в неделя ще получиш оценка и съвети.', schedule: { at, allowWhileIdle: true }, extra: { diary: 'add' }, smallIcon: 'ic_stat_mama', iconColor: '#0E7A5C' });
    }
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) {}
}

/* ─── вграждане в приложението ─── */
(function () {
  TITLES.diary = ['Дневник на храненето', 'Какво ям и как се храня'];
  const bRender = render;
  render = function () { if (current === 'diary') { renderDiary($('#s-diary')); return; } bRender(); };
  const bMore = renderMore;
  renderMore = function (el) {
    bMore(el);
    const ul = el.querySelector('.list'); if (!ul || ul.querySelector('[data-diary]')) return;
    const first = ul.querySelector('[data-go2="doctor"]');
    const li = `<li class="li" data-diary><div class="lead">🍽️</div><div class="grow"><div class="title">Дневник на храненето</div><div class="muted small">Какво ям · оценка на седмицата със съвети</div></div><span class="muted">›</span></li>`;
    first ? first.insertAdjacentHTML('beforebegin', li) : ul.insertAdjacentHTML('afterbegin', li);
    ul.querySelector('[data-diary]').onclick = () => go('diary');
  };
  const bHome = renderHome;
  renderHome = function (el) {
    bHome(el);
    try {
      const D_ = DIARY(), t = D_.e.filter(e => e.d === todayISO());
      const ev = dEvaluate(), sunday = new Date().getDay() === 0 && new Date().getHours() >= 17;
      const html = `<div class="card dy-card" id="dyCard"><div class="row" style="gap:12px;align-items:center"><div class="th-e">🍽️</div><div class="grow"><b style="font-size:16px">${sunday && ev.enough ? 'Оценката на седмицата е готова' : 'Дневник на храненето'}</b><div class="small" style="opacity:.92">${sunday && ev.enough ? `${ev.score}/100 · ${esc(ev.grade[0])} — виж съветите` : t.length ? `Днес: ${t.length} ${t.length === 1 ? 'хранене' : 'хранения'} · ~${t.reduce((a, e) => a + e.k, 0)} kcal` : 'Запиши какво яде — в неделя получаваш оценка'}</div></div><button class="btn small dy-plus" id="dyQuick" aria-label="Добави хранене">+</button></div></div>`;
      const cards = el.querySelectorAll(':scope > .card'); const at = cards[Math.min(2, cards.length - 1)];
      at ? at.insertAdjacentHTML('afterend', html) : el.insertAdjacentHTML('beforeend', html);
      el.querySelector('#dyCard').onclick = e => { if (e.target.closest('#dyQuick')) return; sunday && ev.enough ? dWeekSheet() : go('diary'); };
      el.querySelector('#dyQuick').onclick = () => dAddSheet();
    } catch (e) {}
  };
  // рецепта: „Изядох го“
  const bShow = showRecipe;
  showRecipe = function (id) {
    const r = bShow.apply(this, arguments);
    try {
      const body = $('#sheetBody'), rec = RECIPES.find(x => x.id === id);
      if (body && rec && !body.querySelector('#dyAte')) {
        body.insertAdjacentHTML('beforeend', `<button class="btn tonal block" id="dyAte" style="margin-top:10px">🍽️ Изядох го — запиши в дневника</button>`);
        body.querySelector('#dyAte').onclick = () => { const e = dAdd(rec.name, rec.group === 'dessert' ? 's' : dMealNow(), 1, rec.id); if (e) { toast('Записано в дневника'); body.querySelector('#dyAte').disabled = true; body.querySelector('#dyAte').textContent = '✅ Записано в дневника'; dSchedule(); } };
      }
    } catch (e) {}
    return r;
  };
  // предложенията за закуска/обяд/вечеря получават бутон „Изядох това“
  let pend = null;
  const bMeal = mealShow;
  mealShow = function (kind, skip = 0) { try { pend = kind === 'b' ? (() => { const b = bfPick(skip); return b ? { n: b.n, id: 'bf_' + b.i, m: 'b' } : null; })() : (() => { const r = mealPick(kind, skip); return r ? { n: r.name, id: r.id, m: kind } : null; })(); } catch (e) { pend = null; } const x = bMeal.apply(this, arguments); pend = null; return x; };
  const bBf = bfShow;
  bfShow = function (skip = 0) { try { const b = bfPick(skip); pend = b ? { n: b.n, id: 'bf_' + b.i, m: 'b' } : null; } catch (e) { pend = null; } const x = bBf.apply(this, arguments); pend = null; return x; };
  const bPop = popup;
  popup = function (opts) {
    if (pend && opts && Array.isArray(opts.actions) && !opts.actions.some(a => /Изядох/.test(a.label))) {
      const p = pend;
      opts.actions.splice(1, 0, { label: '✅ Изядох това', fn: () => { dAdd(p.n, p.m, 1, p.id); toast('Записано в дневника'); dSchedule(); } });
    }
    return bPop.apply(this, arguments);
  };
  // настройки: превключвател в „Подсещания за храна“
  const bSet = renderSettings;
  renderSettings = function (el) {
    bSet(el);
    setTimeout(() => {
      const h = [...el.querySelectorAll('.card h2')].find(x => /Подсещания за храна/.test(x.textContent)); if (!h || el.querySelector('#dyRemS')) return;
      const c = h.closest('.card'), anchor = c.querySelector('#nStat');
      const html = `<label class="row between" style="padding:8px 0;align-items:center"><span>🍽️ Дневник: подсещане в 20:30</span><input type="checkbox" id="dyRemS" ${DIARY().remind ? 'checked' : ''} style="width:24px;height:24px;accent-color:#0e7a5c"></label>`;
      anchor ? anchor.insertAdjacentHTML('beforebegin', html) : c.insertAdjacentHTML('beforeend', html);
      el.querySelector('#dyRemS').onchange = e => { DIARY().remind = e.target.checked; save(); dSchedule(); toast(e.target.checked ? 'Включено' : 'Изключено'); };
    }, 0);
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(dSchedule, 8000);
  const ln = typeof LN === 'function' && LN();
  if (ln) ln.addListener('localNotificationActionPerformed', a => { const x = (a && a.notification && a.notification.extra) || {}; if (x.diary === 'week') setTimeout(() => { go('diary'); dWeekSheet(); }, 900); if (x.diary === 'add') setTimeout(() => { go('diary'); dAddSheet(); }, 900); });
});
