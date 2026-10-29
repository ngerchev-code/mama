/* MAMA — скенер за продукти: баркод → състав, Е-добавки, хранителен светофар, алергени, лични предупреждения. */
'use strict';

/* Е-добавки с повече внимание (по EFSA, IARC и регламент (ЕО) 1333/2008). Всички изброени са разрешени в ЕС, освен ако не е посочено. */
const ADDITIVES = {
  e102: ['Тартразин', 2, 'Азо-оцветител. В ЕС се изисква предупреждение, че може да влияе на активността и вниманието при деца.'],
  e104: ['Хинолиново жълто', 2, 'Оцветител с предупредителен надпис за деца в ЕС (проучване Southampton).'],
  e110: ['Сънсет жълто', 2, 'Азо-оцветител с предупредителен надпис за деца в ЕС.'],
  e122: ['Азорубин', 2, 'Азо-оцветител с предупредителен надпис за деца в ЕС.'],
  e124: ['Понсо 4R', 2, 'Азо-оцветител с предупредителен надпис за деца в ЕС.'],
  e129: ['Червено Алура', 2, 'Азо-оцветител с предупредителен надпис за деца в ЕС.'],
  e127: ['Еритрозин', 2, 'Разрешен само за ограничен кръг продукти; съдържа йод.'],
  e131: ['Патент синьо V', 1, 'Рядко — алергични реакции.'],
  e133: ['Брилянтно синьо', 1, 'Синтетичен оцветител.'],
  e150c: ['Амонячен карамел', 1, 'Може да съдържа 4-MEI; EFSA е определила допустим дневен прием.'],
  e150d: ['Амонячно-сулфитен карамел', 1, 'Използва се в коли; може да съдържа 4-MEI.'],
  e171: ['Титанов диоксид', 3, 'ЗАБРАНЕН като хранителна добавка в ЕС от 2022 г. (EFSA не може да изключи генотоксичност).'],
  e173: ['Алуминий', 2, 'Разрешен само за украса на сладкарски изделия.'],
  e200: ['Сорбинова киселина', 0, 'Консервант, смята се за безопасен в разрешените количества.'],
  e210: ['Бензоена киселина', 1, 'Консервант; може да предизвика реакции при чувствителни хора.'],
  e211: ['Натриев бензоат', 1, 'Консервант. С витамин C може да образува следи от бензен; предупреждение за деца, ако е с азо-оцветители.'],
  e212: ['Калиев бензоат', 1, 'Консервант от групата на бензоатите.'],
  e220: ['Серен диоксид', 2, 'Сулфит — задължителен алерген при над 10 мг/кг; може да провокира астма.'],
  e221: ['Натриев сулфит', 2, 'Сулфит — алерген, може да провокира астма.'],
  e223: ['Натриев метабисулфит', 2, 'Сулфит — алерген, може да провокира астма.'],
  e224: ['Калиев метабисулфит', 2, 'Сулфит — алерген (често във виното).'],
  e228: ['Калиев бисулфит', 2, 'Сулфит — алерген.'],
  e249: ['Калиев нитрит', 2, 'Консервант за месо. Нитритите могат да образуват нитрозамини; EFSA препоръчва ограничен прием.'],
  e250: ['Натриев нитрит', 2, 'Консервант за колбаси. Свързва се с образуване на нитрозамини; преработеното месо е канцероген (IARC, група 1).'],
  e251: ['Натриев нитрат', 2, 'Консервант за месо и сирена; превръща се в нитрит.'],
  e252: ['Калиев нитрат', 2, 'Консервант за месо.'],
  e270: ['Млечна киселина', 0, 'Естествена киселина — безопасна.'],
  e290: ['Въглероден диоксид', 0, 'Газ за газиране — безопасен.'],
  e296: ['Ябълчена киселина', 0, 'Безопасна.'],
  e300: ['Витамин C', 0, 'Антиоксидант — безопасен.'],
  e306: ['Токофероли (вит. E)', 0, 'Антиоксидант — безопасен.'],
  e319: ['TBHQ', 2, 'Синтетичен антиоксидант с нисък допустим прием.'],
  e320: ['BHA', 2, 'Синтетичен антиоксидант; IARC — „възможно канцерогенен“ (група 2B).'],
  e321: ['BHT', 1, 'Синтетичен антиоксидант; продължава да се оценява.'],
  e322: ['Лецитини', 0, 'Емулгатор (обикновено от соя или слънчоглед) — безопасен.'],
  e330: ['Лимонена киселина', 0, 'Безопасна.'],
  e338: ['Фосфорна киселина', 1, 'В колите; високият прием на фосфати е нежелан при бъбречни проблеми.'],
  e339: ['Натриеви фосфати', 1, 'Фосфатите натоварват бъбреците при голям прием; EFSA е ограничила приема.'],
  e340: ['Калиеви фосфати', 1, 'Фосфати — внимание при бъбречни заболявания.'],
  e341: ['Калциеви фосфати', 1, 'Фосфати.'],
  e407: ['Карагенан', 1, 'Сгъстител от водорасли; оценява се влиянието му върху червата.'],
  e412: ['Гуарова гума', 0, 'Сгъстител — безопасен.'],
  e415: ['Ксантанова гума', 0, 'Сгъстител — безопасен.'],
  e420: ['Сорбитол', 1, 'Подсладител; в големи количества има слабително действие.'],
  e421: ['Манитол', 1, 'Подсладител; слабително в големи количества.'],
  e433: ['Полисорбат 80', 1, 'Емулгатор; изследвания върху животни показват ефекти върху чревната флора.'],
  e450: ['Дифосфати', 1, 'Фосфати — внимание при бъбречни заболявания.'],
  e451: ['Трифосфати', 1, 'Фосфати — често в колбаси.'],
  e452: ['Полифосфати', 1, 'Фосфати — често в колбаси и замразено месо.'],
  e466: ['Карбоксиметилцелулоза', 1, 'Емулгатор; проучвания при животни показват ефект върху чревната флора.'],
  e471: ['Моно- и диглицериди', 0, 'Емулгатор, може да е от растителен или животински произход.'],
  e472e: ['DATEM', 0, 'Емулгатор в хлебни изделия.'],
  e476: ['Полиглицерол полирицинолеат', 0, 'Емулгатор в шоколади.'],
  e500: ['Сода бикарбонат', 0, 'Безопасна.'],
  e551: ['Силициев диоксид', 1, 'Против слепване; EFSA препоръча допълнителни данни за наночастици.'],
  e621: ['Мононатриев глутамат', 1, 'Овкусител; при чувствителни хора — главоболие. Съдържа натрий.'],
  e627: ['Динатриев гуанилат', 1, 'Овкусител — обикновено с глутамат.'],
  e631: ['Динатриев инозинат', 1, 'Овкусител — обикновено с глутамат.'],
  e635: ['Рибонуклеотиди', 1, 'Овкусител; не е подходящ при подагра.'],
  e900: ['Диметилполисилоксан', 0, 'Против пенене.'],
  e950: ['Ацесулфам K', 1, 'Подсладител без калории.'],
  e951: ['Аспартам', 2, 'Подсладител; IARC (2023) — „възможно канцерогенен“ (2B). Опасен при фенилкетонурия.'],
  e952: ['Цикламат', 2, 'Подсладител; забранен в някои държави извън ЕС.'],
  e954: ['Захарин', 1, 'Подсладител.'],
  e955: ['Сукралоза', 1, 'Подсладител; изследва се влиянието при нагряване.'],
  e960: ['Стевиол гликозиди', 0, 'Подсладител от стевия — безопасен в разрешените количества.'],
  e1422: ['Модифицирано нишесте', 0, 'Сгъстител — безопасен.'],
};
const LEVEL = [['Безопасна', 'best'], ['Умерено внимание', 'warn'], ['Внимание', 'bad'], ['Забранена в ЕС', 'bad']];
const ALLERGENS = { gluten: 'Глутен', milk: 'Мляко', eggs: 'Яйца', nuts: 'Ядки', peanuts: 'Фъстъци', 'sesame-seeds': 'Сусам', soybeans: 'Соя', fish: 'Риба', crustaceans: 'Ракообразни', molluscs: 'Мекотели', celery: 'Целина', mustard: 'Горчица', lupin: 'Лупина', 'sulphur-dioxide-and-sulphites': 'Сулфити' };
const NOVA = { 1: ['Непреработена храна', 'best'], 2: ['Кулинарна съставка', 'best'], 3: ['Преработена храна', 'warn'], 4: ['Ултрапреработена храна', 'bad'] };

/* Хранителен „светофар“ (на 100 г, по Агенцията по хранителни стандарти на Обединеното кралство) */
function light(v, med, high) { if (v == null || isNaN(v)) return null; return v > high ? 'bad' : v > med ? 'warn' : 'best'; }
function nutriLights(n) {
  const drink = false;
  return [
    ['Мазнини', n.fat_100g, light(n.fat_100g, 3, 17.5), 'г'],
    ['Наситени', n['saturated-fat_100g'], light(n['saturated-fat_100g'], 1.5, 5), 'г'],
    ['Захари', n.sugars_100g, light(n.sugars_100g, drink ? 2.5 : 5, drink ? 11.25 : 22.5), 'г'],
    ['Сол', n.salt_100g, light(n.salt_100g, 0.3, 1.5), 'г'],
  ];
}

/* ─── Търсене в Open Food Facts ────────────────────────────────────────── */
const OFF_FIELDS = 'code,product_name,product_name_bg,generic_name_bg,brands,quantity,image_front_small_url,image_front_url,nutriscore_grade,nova_group,additives_tags,allergens_tags,traces_tags,ingredients_text,ingredients_text_bg,ingredients_text_en,ingredients_analysis_tags,nutriments,labels_tags,categories_tags';
async function offProduct(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}&lc=bg`, { headers: { Accept: 'application/json' } });
  if (!r.ok && r.status !== 404) throw new Error('HTTP ' + r.status);
  const d = await r.json();
  return d && d.status === 1 ? d.product : null;
}
async function offSearch(q) {
  const r = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${OFF_FIELDS}`);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const d = await r.json(); return d.products || [];
}

/* ─── Оценка на продукта ───────────────────────────────────────────────── */
function analyse(p) {
  const name = p.product_name_bg || p.product_name || p.generic_name_bg || 'Продукт без име';
  const ingr = p.ingredients_text_bg || p.ingredients_text || p.ingredients_text_en || '';
  const adds = (p.additives_tags || []).map(t => t.replace(/^en:/, '').toLowerCase()).map(code => {
    const k = code.replace(/[^a-z0-9]/g, ''); const base = k.replace(/[a-z]$/, '');
    const a = ADDITIVES[k] || ADDITIVES[base];
    return { code: code.toUpperCase(), name: a ? a[0] : '', lvl: a ? a[1] : 0, note: a ? a[2] : 'Разрешена добавка в ЕС.' };
  }).sort((x, y) => y.lvl - x.lvl);
  const allergens = (p.allergens_tags || []).map(t => ALLERGENS[t.replace(/^en:/, '')] || t.replace(/^\w+:/, '')).filter(Boolean);
  const traces = (p.traces_tags || []).map(t => ALLERGENS[t.replace(/^en:/, '')] || t.replace(/^\w+:/, '')).filter(Boolean);
  const an = p.ingredients_analysis_tags || [];
  const vegan = an.includes('en:vegan') ? 1 : an.includes('en:non-vegan') ? -1 : 0;
  const veget = an.includes('en:vegetarian') ? 1 : an.includes('en:non-vegetarian') ? -1 : 0;
  const palm = an.includes('en:palm-oil') ? 1 : an.includes('en:palm-oil-free') ? -1 : 0;
  const n = p.nutriments || {};
  const lights = nutriLights(n);
  // Лични предупреждения
  const warn = [];
  const pr = P();
  const hay = norm(name + ' ' + ingr);
  const banned = bannedList().find(h => h.kw.some(k => hay.includes(k)));
  if (banned) warn.push(['⛔', `От забранените ти храни: <b>${esc(banned.name)}</b>`]);
  if (pr.diet === 'vegan' && vegan === -1) warn.push(['🌱', 'Не е веган продукт']);
  if ((pr.diet === 'veg' || pr.diet === 'vegan') && veget === -1) warn.push(['🥚', 'Не е вегетариански продукт']);
  if (pr.noPork && /свинск|свиня|pork|бекон|шунка/.test(hay)) warn.push(['🐖', 'Съдържа свинско']);
  let fl = new Map(); try { fl = (S.doctor && S.doctor.profile) ? drFlags() : new Map(); } catch (e) { fl = new Map(); }
  const L = Object.fromEntries(lights.map(x => [x[0], x[2]]));
  if (fl.has('bp') && L['Сол'] === 'bad') warn.push(['🩺', 'Много сол — внимание при високо кръвно']);
  if (fl.has('ckd') && (L['Сол'] === 'bad' || adds.some(a => /^E(338|339|340|341|450|451|452)/.test(a.code)))) warn.push(['🩺', 'Сол/фосфати — внимание при бъбречно заболяване']);
  if (fl.has('glucose') && L['Захари'] === 'bad') warn.push(['🩺', 'Много захар — внимание при висока кръвна захар']);
  if ((fl.has('ldl') || fl.has('heart')) && L['Наситени'] === 'bad') warn.push(['🩺', 'Много наситени мазнини — внимание при висок холестерол']);
  if ((fl.has('weight') || fl.has('lose')) && n['energy-kcal_100g'] > 400) warn.push(['🩺', `Калорично: ${Math.round(n['energy-kcal_100g'])} kcal/100 г`]);
  if (fl.has('celiac') && (allergens.includes('Глутен') || traces.includes('Глутен'))) warn.push(['🩺', 'Съдържа (следи от) глутен — неподходящо при целиакия']);
  if (fl.has('uric') && adds.some(a => /^E(627|631|635)/.test(a.code))) warn.push(['🩺', 'Рибонуклеотиди — не са подходящи при подагра']);
  if (adds.some(a => a.code === 'E951')) warn.push(['⚠️', 'Съдържа аспартам — опасен при фенилкетонурия']);
  // Изтеглени продукти в новините
  const recall = (D.news ? D.news.items : []).filter(x => x.g === 'recall').find(x => {
    const words = norm((p.brands || '') + ' ' + name).split(/[\s,.-]+/).filter(w => w.length > 4);
    return words.some(w => norm(x.t).includes(w));
  });
  // Обща оценка 0–100
  let score = 70;
  score += { a: 20, b: 10, c: 0, d: -12, e: -22 }[p.nutriscore_grade] || 0;
  score += { 1: 10, 2: 4, 3: -2, 4: -12 }[p.nova_group] || 0;
  score -= adds.reduce((s, a) => s + [0, 3, 8, 25][a.lvl], 0);
  score -= lights.filter(x => x[2] === 'bad').length * 6;
  if (palm === 1) score -= 4;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const verdict = score >= 70 ? ['Добър избор', 'best', '#12925e'] : score >= 45 ? ['Умерено', 'warn', '#c97a00'] : ['Лош избор', 'bad', '#d23b2f'];
  return { name, ingr, adds, allergens, traces, vegan, veget, palm, lights, warn, recall, score, verdict, n };
}

function productHTML(p) {
  const a = analyse(p);
  const img = p.image_front_small_url || p.image_front_url;
  const ns = (p.nutriscore_grade || '').toLowerCase();
  return `<div class="row" style="gap:12px;align-items:flex-start">
      ${img ? `<img src="${esc(img)}" alt="" style="width:84px;height:84px;object-fit:contain;border-radius:14px;background:#fff">` : '<div class="lead" style="width:84px;height:84px;font-size:38px">📦</div>'}
      <div class="grow"><h3 style="margin:0">${esc(a.name)}</h3><div class="muted small">${esc([p.brands, p.quantity].filter(Boolean).join(' · '))}</div><div class="muted small">Баркод ${esc(p.code || '')}</div></div>
      <div class="score" style="--c:${a.verdict[2]}"><b>${a.score}</b><small>/100</small></div></div>
    <div class="row" style="gap:6px;margin:10px 0;flex-wrap:wrap"><span class="tag ${a.verdict[1]}">${a.verdict[0]}</span>
      ${ns && 'abcde'.includes(ns) ? `<span class="ns ns-${ns}">Nutri-Score ${ns.toUpperCase()}</span>` : ''}
      ${p.nova_group ? `<span class="tag ${NOVA[p.nova_group][1]}">NOVA ${p.nova_group}: ${NOVA[p.nova_group][0]}</span>` : ''}
      ${a.vegan === 1 ? '<span class="tag best">🌱 веган</span>' : a.veget === 1 ? '<span class="tag best">🥚 вегетариански</span>' : ''}
      ${a.palm === 1 ? '<span class="tag warn">🌴 палмово масло</span>' : ''}</div>
    ${a.recall ? `<div class="notice bad">🚨 <div><b>Възможно изтегляне/сигнал:</b> ${esc(a.recall.t)} <a href="#" data-url="${esc(a.recall.u)}">Прочети</a></div></div>` : ''}
    ${a.warn.length ? `<div class="notice warn" style="display:block">${a.warn.map(w => `<div>${w[0]} ${w[1]}</div>`).join('')}</div>` : ''}
    <div class="section-title" style="margin-left:0">🚦 На 100 г</div>
    <div class="lights">${a.lights.map(([n, v, c, u]) => `<div class="lt ${c || ''}"><small>${n}</small><b>${v == null ? '—' : (+v).toLocaleString('bg-BG', { maximumFractionDigits: 1 }) + ' ' + u}</b></div>`).join('')}
      <div class="lt"><small>Енергия</small><b>${a.n['energy-kcal_100g'] != null ? Math.round(a.n['energy-kcal_100g']) + ' kcal' : '—'}</b></div></div>
    <div class="section-title" style="margin-left:0">🧪 Добавки (${a.adds.length})</div>
    ${a.adds.length ? `<ul class="list">${a.adds.map(x => `<li class="li" style="cursor:default;align-items:flex-start"><span class="tag ${LEVEL[x.lvl][1]}" style="min-width:52px;text-align:center">${esc(x.code)}</span><div class="grow"><div class="title">${esc(x.name || x.code)}</div><div class="muted small">${esc(x.note)}</div></div></li>`).join('')}</ul>` : '<div class="muted">Няма обявени Е-добавки.</div>'}
    ${a.allergens.length || a.traces.length ? `<div class="section-title" style="margin-left:0">⚠️ Алергени</div><div>${a.allergens.map(x => `<span class="tag bad" style="margin:2px">${esc(x)}</span>`).join('')}${a.traces.map(x => `<span class="tag warn" style="margin:2px">следи: ${esc(x)}</span>`).join('')}</div>` : ''}
    ${a.ingr ? `<div class="section-title" style="margin-left:0">📋 Състав</div><div class="small">${esc(a.ingr)}</div>` : ''}
    <div class="row" style="gap:8px;margin-top:14px"><button class="btn primary grow" id="scAdd">${I.cart} В списъка</button><button class="btn tonal grow" id="scPrice">🏷️ Цени</button></div>
    <div class="muted small" style="margin-top:10px">Данни: Open Food Facts (отворена база). Оценката е ориентировъчна и не замества етикета.</div>`;
}
function showProduct(p) {
  const a = analyse(p);
  rememberScan(p, a);
  openSheet(productHTML(p), el => {
    el.querySelector('#scAdd').onclick = () => { S.list.push({ id: uid(), name: a.name, cat: guessCat(a.name), qty: 1, done: false, added: Date.now() }); save(); closeSheet(); render(); toast('Добавено в списъка'); };
    el.querySelector('#scPrice').onclick = () => { closeSheet(); priceQuery = a.name.split(' ').slice(0, 2).join(' '); go('prices'); };
    el.querySelectorAll('[data-url]').forEach(b => b.onclick = e => { e.preventDefault(); openExt(b.dataset.url); });
  });
}
function rememberScan(p, a) {
  if (!S.scans) S.scans = [];
  S.scans = [{ code: p.code, name: a.name, brand: p.brands || '', score: a.score, v: a.verdict[1], img: p.image_front_small_url || '', t: Date.now() }, ...S.scans.filter(x => x.code !== p.code)].slice(0, 40);
  save();
}
async function lookup(code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length < 6) { toast('Невалиден баркод'); return; }
  toast('Търся продукта…');
  try {
    const p = await offProduct(code);
    if (p) { p.code = p.code || code; showProduct(p); return; }
    openSheet(`<h3>📦 Продуктът не е намерен</h3><div class="muted">Баркод ${esc(code)} още го няма в отворената база Open Food Facts.</div>
      <div class="notice info" style="margin-top:10px">💡 Можеш да го добавиш за 2 минути (снимка на етикета и състава) — така ще помогнеш и на другите.</div>
      <button class="btn primary block" data-url="https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${esc(code)}" style="margin-top:8px">Добави в Open Food Facts</button>
      <button class="btn tonal block" id="scName" style="margin-top:8px">🔎 Търси по име</button>`, el => {
      el.querySelector('[data-url]').onclick = e => openExt(e.currentTarget.dataset.url);
      el.querySelector('#scName').onclick = () => { closeSheet(); setTimeout(() => $('#scQ') && $('#scQ').focus(), 300); };
    });
  } catch (e) { toast('Няма връзка с базата — опитай пак'); }
}

/* ─── Камера ───────────────────────────────────────────────────────────── */
let zReader = null;
async function startScan() {
  if (!window.ZXing) { toast('Скенерът не е зареден'); return; }
  const ov = document.createElement('div'); ov.className = 'scan-ov';
  ov.innerHTML = `<video playsinline muted></video><div class="scan-frame"><i></i></div>
    <div class="scan-top"><b>Насочи камерата към баркода</b><div class="small">EAN / UPC — на гърба на опаковката</div></div>
    <button class="pop-btn primary scan-close">Затвори</button>`;
  document.body.appendChild(ov);
  const video = ov.querySelector('video');
  const close = () => { try { zReader && zReader.reset(); } catch (e) { /* */ } zReader = null; ov.remove(); };
  ov.querySelector('.scan-close').onclick = close;
  try {
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.CODE_128]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    zReader = new ZXing.BrowserMultiFormatReader(hints, 250);
    await zReader.decodeFromConstraints({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } }, video, (res) => {
      if (res && zReader) {
        const code = res.getText();
        if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* */ }
        close(); lookup(code);
      }
    });
  } catch (e) {
    close();
    openSheet(`<h3>📷 Няма достъп до камерата</h3><div class="muted">Разреши достъп до камерата за MAMA в настройките на телефона или въведи баркода ръчно.</div>`);
  }
}

/* ─── Екран „Скенер“ ───────────────────────────────────────────────────── */
let scanTab = 'scan';
function renderScan(el) {
  const scans = S.scans || [];
  const news = (D.news ? D.news.items : []).filter(n => ['recall', 'checks', 'labels'].includes(n.g)).slice(0, 8);
  const addList = Object.entries(ADDITIVES).filter(([, a]) => a[1] >= 1).sort((a, b) => b[1][1] - a[1][1]);
  el.innerHTML = `
    <div class="card hero" style="text-align:center"><div style="font-size:46px">📷</div><div class="big" style="font-size:22px">Провери продукт</div>
      <div class="small" style="opacity:.9;margin:4px 0 12px">Състав, Е-добавки, алергени, захар и сол — и дали подхожда на теб</div>
      <button class="btn block" id="scGo" style="background:#fff;color:#0b8a5f;font-size:17px;padding:14px">📷 Сканирай баркод</button></div>
    <div class="field" style="margin-bottom:12px">${I.search}<input id="scQ" placeholder="Баркод или име на продукт"><button class="btn primary small" id="scFind">Търси</button></div>
    <div class="chips"><button class="chip ${scanTab === 'scan' ? 'on' : ''}" data-st="scan">Проверени</button><button class="chip ${scanTab === 'adds' ? 'on' : ''}" data-st="adds">Е-добавки</button><button class="chip ${scanTab === 'news' ? 'on' : ''}" data-st="news">Новини и сигнали</button></div>
    <div id="scBody"></div>`;
  const body = el.querySelector('#scBody');
  if (scanTab === 'scan') {
    body.innerHTML = scans.length ? `<div class="card"><ul class="list">${scans.map(s => `<li class="li" data-code="${esc(s.code)}">${s.img ? `<img src="${esc(s.img)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:10px;background:#fff">` : '<div class="lead">📦</div>'}<div class="grow"><div class="title ellipsis">${esc(s.name)}</div><div class="muted small">${esc(s.brand)} · ${fmtDate(s.t)}</div></div><span class="tag ${s.v}">${s.score}</span></li>`).join('')}</ul></div>`
      : `<div class="card empty"><div class="ico">🧾</div>Тук ще виждаш проверените продукти.<br>Сканирай баркод от опаковка, за да започнеш.</div>`;
  } else if (scanTab === 'adds') {
    body.innerHTML = `<div class="notice info">ℹ️ <div>Добавките с Е-номер са разрешени и оценени от EFSA. Тук са тези, за които има ограничения, предупреждения или продължаващи оценки.</div></div>
      <div class="card"><ul class="list">${addList.map(([k, a]) => `<li class="li" style="cursor:default;align-items:flex-start"><span class="tag ${LEVEL[a[1]][1]}" style="min-width:56px;text-align:center">${k.toUpperCase()}</span><div class="grow"><div class="title">${esc(a[0])}</div><div class="muted small">${esc(a[2])}</div></div></li>`).join('')}</ul></div>`;
  } else {
    body.innerHTML = `<div class="card">${news.length ? news.map(newsItem).join('') : '<div class="muted">Няма нови сигнали.</div>'}</div>
      <div class="card"><ul class="list">
        <li class="li" data-url="https://www.bfsa.bg/"><div class="lead">🏛️</div><div class="grow"><div class="title">БАБХ</div><div class="muted small">Изтеглени и опасни храни в България</div></div><span class="muted">↗</span></li>
        <li class="li" data-url="https://webgate.ec.europa.eu/rasff-window/screen/search"><div class="lead">🇪🇺</div><div class="grow"><div class="title">RASFF Window</div><div class="muted small">Сигнали за опасни храни в ЕС</div></div><span class="muted">↗</span></li>
        <li class="li" data-url="https://kzp.bg/"><div class="lead">⚖️</div><div class="grow"><div class="title">КЗП</div><div class="muted small">Подай сигнал за нарушение</div></div><span class="muted">↗</span></li>
      </ul></div>`;
  }
  el.querySelector('#scGo').onclick = startScan;
  const q = el.querySelector('#scQ');
  const find = async () => {
    const v = q.value.trim(); if (!v) return;
    if (/^\d{6,14}$/.test(v)) return lookup(v);
    toast('Търся…');
    try {
      const list = await offSearch(v);
      if (!list.length) { toast('Няма намерени продукти'); return; }
      openSheet(`<h3>Резултати за „${esc(v)}“</h3><ul class="list">${list.map((p, i) => `<li class="li" data-i="${i}">${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:10px;background:#fff">` : '<div class="lead">📦</div>'}<div class="grow"><div class="title ellipsis">${esc(p.product_name_bg || p.product_name || '—')}</div><div class="muted small">${esc(p.brands || '')} ${p.nutriscore_grade ? '· Nutri-Score ' + p.nutriscore_grade.toUpperCase() : ''}</div></div></li>`).join('')}</ul>`,
        s => s.querySelectorAll('[data-i]').forEach(b => b.onclick = () => showProduct(list[+b.dataset.i])));
    } catch (e) { toast('Няма връзка с базата'); }
  };
  el.querySelector('#scFind').onclick = find;
  q.onkeydown = e => { if (e.key === 'Enter') find(); };
  el.querySelectorAll('[data-st]').forEach(b => b.onclick = () => { scanTab = b.dataset.st; renderScan(el); });
  el.querySelectorAll('[data-code]').forEach(b => b.onclick = () => lookup(b.dataset.code));
  el.querySelectorAll('[data-url]').forEach(b => b.onclick = () => openExt(b.dataset.url));
}

(function wireScan() {
  TITLES.scan = ['Скенер', 'Състав, добавки и алергени'];
  const base = render;
  render = function () { if (current === 'scan') { renderScan($('#s-scan')); return; } base(); };
})();
