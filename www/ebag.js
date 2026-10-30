/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   eBag: пазаруване от вкъщи — подсказки според времето и според домакинството (деца). */
const EBAG = {
  home: 'https://www.ebag.bg/',
  offers: 'https://www.ebag.bg/offers',
  search: q => `https://www.ebag.bg/search/?products%5Bquery%5D=${encodeURIComponent(q)}`
};

/* Домакинство — само по това, което потребителят сам е посочил (настройка или член на семейството 👶/🧒). */
function household() {
  const h = S.settings.household;
  if (h) return h;
  const fam = S.family || [];
  if (fam.some(p => p.e === '👶')) return 'baby';
  if (fam.some(p => p.e === '🧒' || p.e === '👧' || p.e === '👦')) return 'kids';
  return fam.length > 1 ? 'family' : '';
}

const WX_CASES = {
  snow: { e: '❄️', theme: 'linear-gradient(135deg,#4facfe 0%,#00c6fb 100%)', title: 'Сняг е — поръчай до вратата', text: 'Пътищата са хлъзгави. Спести си разходката — eBag носи пазара до вас.',
    picks: ['Минерална вода', 'Хляб', 'Мляко', 'Яйца', 'Ориз', 'Леща', 'Консерви', 'Брашно', 'Чай', 'Мед', 'Свещи', 'Батерии'] },
  cold: { e: '🥶', theme: 'linear-gradient(135deg,#667eea 0%,#4facfe 100%)', title: 'Минусови температури', text: 'Навън е мразовито. Остани на топло — поръчай онлайн и си вземи нещо за имунитета.',
    picks: ['Лимони', 'Портокали', 'Мед', 'Джинджифил', 'Чай', 'Пилешки бульон', 'Супа', 'Чесън', 'Киви', 'Салфетки'] },
  rain: { e: '🌧️', theme: 'linear-gradient(135deg,#5f72bd 0%,#9b23ea 100%)', title: 'Вали — не се мокри', text: 'Без чадър и торби под дъжда: поръчай през eBag и пазарът идва при теб.',
    picks: ['Хляб', 'Мляко', 'Плодове', 'Зеленчуци', 'Паста', 'Сирене', 'Кафе', 'Тоалетна хартия'] },
  heat: { e: '🥵', theme: 'linear-gradient(135deg,#ff9a3d 0%,#ff5e62 100%)', title: 'Жега по обед', text: 'Твърде горещо е за разходка с торби. Поръчай вода и свежи продукти с доставка вечерта.',
    picks: ['Минерална вода', 'Диня', 'Краставици', 'Домати', 'Кисело мляко', 'Айран', 'Лед', 'Слънцезащитен крем', 'Електролити'] }
};
const KID_PICKS = {
  baby: { label: 'За бебето', items: ['Пелени', 'Мокри кърпички', 'Адаптирано мляко', 'Бебешко пюре', 'Бебешка каша', 'Бебешки шампоан', 'Крем за подсичане', 'Вода за бебета'] },
  kids: { label: 'За децата', items: ['Плодово пюре', 'Прясно мляко', 'Кисело мляко', 'Бисквити без захар', 'Банани', 'Ябълки', 'Пълнозърнест хляб', 'Мокри кърпички'] }
};

/* Кое време е „лошо“ — по текущото време и по следващите часове/дни. */
function weatherCase() {
  const w = D.weather; if (!w || !w.current) return null;
  const c = w.current, code = c.weather_code, t = c.temperature_2m, feel = c.apparent_temperature ?? t;
  const h = new Date().getHours(), m = new Date().getMonth();
  const snowC = [71, 73, 75, 77, 85, 86], rainC = [61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99];
  const d0 = w.daily ? { code: w.daily.weather_code[0], max: w.daily.temperature_2m_max[0], min: w.daily.temperature_2m_min[0], pp: (w.daily.precipitation_probability_max || [])[0] || 0 } : null;
  if (snowC.includes(code) || (d0 && snowC.includes(d0.code) && h < 18)) return 'snow';
  if (t <= 0 || feel <= -3) return 'cold';
  if (rainC.includes(code) || (c.precipitation || 0) > 0.3) return 'rain';
  const RW = rainWindows(w)[0];
  if (RW && RW.s - Date.now() < 2 * 3600e3) return RW.snow ? 'snow' : 'rain';
  if (m >= 5 && m <= 8 && h >= 11 && h <= 17 && (t >= 32 || feel >= 33)) return 'heat';
  return null;
}

function ebagChips(items) {
  return `<div class="chips" style="flex-wrap:wrap">${items.map(n => `<button class="chip" data-eb="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
}
function ebagCard(where) {
  const wc = weatherCase(), hh = household(), kid = KID_PICKS[hh];
  const open = S.list.filter(i => !i.done);
  if (where === 'home' && !wc && !kid) return '';
  const W = wc && WX_CASES[wc];
  const head = W ? `${W.e} ${W.title}` : kid ? (hh === 'baby' ? '👶 Пазарувай от вкъщи' : '🧒 Пазарувай от вкъщи') : '🛒 Пазарът до вратата';
  const sub = W ? W.text : kid ? 'С дете е по-лесно: поръчай нужното онлайн и вземи доставката до вратата.' : 'Храни и всичко за дома от eBag — поръчай целия си списък с доставка.';
  return `<div class="card ebag" ${W ? `style="background:${W.theme}"` : ''}>
    <div class="row between"><h2 style="margin:0">${head}</h2><span class="ebag-logo">eBag</span></div>
    <div class="small" style="margin:6px 0 10px;opacity:.95">${sub}</div>
    ${W ? `<div class="small ebag-lbl">Предложения за времето:</div>${ebagChips(W.picks)}` : ''}
    ${kid ? `<div class="small ebag-lbl">${kid.label}:</div>${ebagChips(kid.items)}` : ''}
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn ebag-btn" data-ebgo="${open.length ? 'list' : 'home'}">🛒 ${open.length ? `Поръчай списъка (${open.length})` : 'Отвори eBag'}</button>
      <button class="btn ebag-ghost" data-ebgo="offers">🏷️ Оферти</button>
      ${W || kid ? `<button class="btn ebag-ghost" data-ebadd="1">＋ В списъка</button>` : ''}
    </div></div>`;
}
function ebagListSheet() {
  const open = S.list.filter(i => !i.done);
  openSheet(`<h3>🛒 Списъкът в eBag</h3><div class="muted small">Натисни продукт — отваря се търсенето в eBag (или в приложението eBag, ако е инсталирано). Отметни го, когато го добавиш в количката.</div>
    <ul class="list" style="margin-top:8px">${open.map(i => `<li class="li" data-ebi="${i.id}"><div class="lead">🛍️</div><div class="grow"><div class="title">${esc(i.name)}</div><div class="muted small">${i.qty > 1 ? i.qty + ' бр. · ' : ''}търси в eBag ↗</div></div><button class="iconbtn" data-ebdone="${i.id}" aria-label="Готово" style="width:36px;height:36px">✓</button></li>`).join('')}</ul>
    <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary" id="ebHome">Към кошницата в eBag</button></div>`, el => {
    el.querySelectorAll('[data-ebi]').forEach(b => b.onclick = e => { if (e.target.closest('[data-ebdone]')) return; const it = S.list.find(x => x.id === b.dataset.ebi); if (it) openExt(EBAG.search(it.name)); });
    el.querySelectorAll('[data-ebdone]').forEach(b => b.onclick = () => { const it = S.list.find(x => x.id === b.dataset.ebdone); if (it) { it.done = true; it.doneAt = Date.now(); save(); } b.closest('li').remove(); render(); });
    el.querySelector('#ebHome').onclick = () => openExt('https://www.ebag.bg/cart');
  });
}
function bindEbag(el) {
  el.querySelectorAll('[data-eb]').forEach(b => b.onclick = () => openExt(EBAG.search(b.dataset.eb)));
  el.querySelectorAll('[data-ebgo]').forEach(b => b.onclick = () => { const g = b.dataset.ebgo; if (g === 'list') ebagListSheet(); else openExt(EBAG[g]); });
  el.querySelectorAll('[data-ebadd]').forEach(b => b.onclick = () => {
    const wc = weatherCase(), kid = KID_PICKS[household()];
    const names = [...(wc ? WX_CASES[wc].picks.slice(0, 6) : []), ...(kid ? kid.items.slice(0, 4) : [])];
    let n = 0; names.forEach(name => { if (S.list.some(i => !i.done && norm(i.name) === norm(name))) return; S.list.push({ id: uid(), name, cat: guessCat(name), qty: 1, done: false, from: 'eBag', added: Date.now() }); n++; });
    save(); toast(n ? `Добавени ${n} продукта в списъка` : 'Вече са в списъка'); render();
  });
}

/* Онлайн екранът: работещи бутони + eBag най-отгоре */
ONLINE_SHOPS.forEach(s => { s.home = { ebay: 'https://www.ebay.com/', ebayde: 'https://www.ebay.de/', emag: 'https://www.emag.bg/', ebag: EBAG.home, kauflandmp: 'https://www.kaufland.bg/', aliexpress: 'https://www.aliexpress.com/', amazon: 'https://www.amazon.de/', olx: 'https://www.olx.bg/' }[s.id]; });
(function () {
  const i = ONLINE_SHOPS.findIndex(s => s.id === 'ebag'); if (i > 0) ONLINE_SHOPS.unshift(ONLINE_SHOPS.splice(i, 1)[0]);
  const base = renderOnline;
  renderOnline = function (el) {
    base(el);
    el.insertAdjacentHTML('afterbegin', ebagCard('online'));
    el.querySelectorAll('[data-shop]').forEach(b => {
      const s = ONLINE_SHOPS.find(x => x.id === b.dataset.shop);
      b.onclick = () => { const q = (onlineQ || '').trim(); openExt(q ? s.url(q) : s.home); };
      const sub = b.querySelector('.muted.small'); if (sub && !(onlineQ || '').trim()) sub.textContent = 'Отвори магазина · или напиши какво търсиш';
    });
    const oq = el.querySelector('#oq');
    if (oq) oq.addEventListener('input', () => el.querySelectorAll('[data-shop] .muted.small').forEach(x => x.textContent = oq.value.trim() ? `Търси „${oq.value}“` : 'Отвори магазина · или напиши какво търсиш'));
    bindEbag(el);
  };
  const bHome = renderHome;
  renderHome = function (el) {
    bHome(el);
    const html = ebagCard('home'); if (!html) return;
    el.insertAdjacentHTML('afterbegin', html);
    bindEbag(el);
  };
  const bList = renderList;
  renderList = function (el) {
    bList(el);
    if (!weatherCase() && !KID_PICKS[household()]) return;
    if (!S.list.some(i => !i.done)) return;
    el.insertAdjacentHTML('afterbegin', `<div class="card ebag-mini row between"><div class="grow"><b>${weatherCase() ? WX_CASES[weatherCase()].e + ' Лошо време' : '👶 От вкъщи'}</b><div class="small muted">Поръчай списъка през eBag с доставка</div></div><button class="btn primary small" data-ebgo="list">eBag ↗</button></div>`);
    bindEbag(el);
  };
  const bSet = renderSettings;
  renderSettings = function (el) {
    bSet(el);
    const v = S.settings.household || '';
    const O = [['', 'Не посочвам'], ['me', 'Само аз'], ['family', 'Семейство'], ['kids', 'С деца'], ['baby', 'С бебе / малко дете']];
    el.insertAdjacentHTML('beforeend', `<div class="card"><h2>🏠 Домакинство</h2><div class="muted small">По избор. Само за по-подходящи предложения (напр. бебешки продукти и пазаруване от вкъщи). Остава само на телефона ти.</div>
      <div class="chips" style="flex-wrap:wrap;margin-top:8px">${O.map(([k, l]) => `<button class="chip ${v === k ? 'on' : ''}" data-hh="${k}">${l}</button>`).join('')}</div></div>`);
    el.querySelectorAll('[data-hh]').forEach(b => b.onclick = () => { S.settings.household = b.dataset.hh; save(); toast('Запазено'); renderSettings(el); });
  };
})();

/* Изскачащо предложение — веднъж на ден при лошо време, веднъж седмично за семейства с малко дете. */
function ebagNudge() {
  if (popOpen || document.querySelector('.onb, .tour') || !P().onboarded) return;
  const today = todayISO(), wc = weatherCase(), hh = household(), g = S.guide;
  if (wc && g.ebagWx !== today + wc) {
    g.ebagWx = today + wc; save();
    const W = WX_CASES[wc], kid = KID_PICKS[hh];
    return popup({ theme: W.theme, emoji: W.e, kicker: 'Пазарувай от вкъщи · eBag', title: W.title,
      text: `${W.text}${kid ? `<br><br>${hh === 'baby' ? '👶' : '🧒'} Не забравяй: ${kid.items.slice(0, 3).join(', ').toLowerCase()}.` : ''}`,
      actions: [{ label: '🛒 Поръчай през eBag', primary: true, fn: () => S.list.some(i => !i.done) ? ebagListSheet() : openExt(EBAG.home) }, { label: 'Предложения', fn: () => go('online') }, { label: 'По-късно', fn: null }] });
  }
  if (!wc && (hh === 'baby' || hh === 'kids') && (!g.ebagKid || Date.now() - g.ebagKid > 7 * 864e5)) {
    g.ebagKid = Date.now(); save();
    const kid = KID_PICKS[hh];
    return popup({ theme: 'purple', emoji: hh === 'baby' ? '👶' : '🧒', kicker: 'Пазарувай от вкъщи · eBag', title: 'Спести си ходенето с детето',
      text: `Поръчай онлайн и вземи доставката до вратата.<br>Често нужни: ${kid.items.slice(0, 5).join(', ').toLowerCase()}.`,
      actions: [{ label: '🛒 Към eBag', primary: true, fn: () => go('online') }, { label: 'По-късно', fn: null }] });
  }
}
(function () {
  const bw = loadWeather;
  loadWeather = async function () { await bw(); if (current === 'home') render(); setTimeout(ebagNudge, 2500); scheduleWxNotif(); };
})();

/* ─── „Да пазаруваме заедно“ — приветлив помощник при влизане в Онлайн ─── */
const OW_HELLO = [
  ['🛍️', 'Хайде на пазар — без да ставаш от дивана!', 'Кажи какво ти се търси днес, а аз ще намеря къде е най-удобно.'],
  ['😉', 'Ти казваш КАКВО, аз казвам КЪДЕ', 'Сподели какво търсиш и нека заедно изберем най-добрия магазин.'],
  ['🧺', 'Какво липсва вкъщи днес?', 'Мляко, кафе или нови слушалки — пиши смело, ще го намерим.'],
  ['🌈', 'Днес пазаруваме с усмивка', 'Една дума стига. Аз ще подредя магазините вместо теб.'],
  ['🕵️', 'Мисия: перфектната покупка', 'Подскажи ми какво търсим и тръгваме на лов за изгодно.']
];
const OW_IDEAS = ['☕ Кафе', '🧀 Сирене', '🍫 Шоколад', '🧴 Почистващи', '🧻 Тоалетна хартия', '🐶 Храна за куче', '🎧 Слушалки', '🍳 Тиган', '🎁 Подарък'];
function owRoute(q) {
  const t = norm(q);
  if (/телефон|слушал|лаптоп|таблет|телевиз|зарядн|кабел|часовник|камера|кафемашин|прахосмук|миксер|тиган|тенджер|лампа|играчк|подарък|принтер|мишка|клавиат/.test(t)) return ['emag', 'ebay', 'amazon', 'kauflandmp', 'olx', 'ebag', 'aliexpress', 'ebayde'];
  if (/ретро|колекц|употреб|антик|винтидж|монет|марка|рядк|стар /.test(t)) return ['ebay', 'olx', 'ebayde', 'emag', 'amazon', 'aliexpress', 'ebag', 'kauflandmp'];
  return ['ebag', 'kauflandmp', 'emag', 'ebay', 'amazon', 'olx', 'aliexpress', 'ebayde'];
}
const OW_WHY = { ebag: 'Храни и всичко за дома с доставка до вратата', emag: 'Техника, дом и подаръци с бърза доставка', ebay: 'Огромен избор, вкл. редки и употребявани неща', ebayde: 'eBay Германия — често по-евтино в ЕС', amazon: 'Amazon Германия — доставка до България', olx: 'Обяви от хора около теб', aliexpress: 'Евтино, но с по-дълга доставка', kauflandmp: 'Kaufland онлайн маркетплейс' };

function onlineWizard() {
  if (document.getElementById('ow')) return;
  closePopup && closePopup(true);
  popOpen = true;
  const [e, t, s] = OW_HELLO[Math.floor(Math.random() * OW_HELLO.length)];
  const fromList = S.list.filter(i => !i.done).slice(0, 4).map(i => '📝 ' + i.name);
  const wc = weatherCase(), kid = KID_PICKS[household()];
  const extra = [...(wc ? WX_CASES[wc].picks.slice(0, 2).map(x => WX_CASES[wc].e + ' ' + x) : []), ...(kid ? kid.items.slice(0, 2).map(x => (household() === 'baby' ? '👶 ' : '🧒 ') + x) : [])];
  const ideas = [...new Set([...fromList, ...extra, ...OW_IDEAS])].slice(0, 10);
  const name = (P().name || '').trim().split(' ')[0];
  const w = document.createElement('div'); w.id = 'ow'; w.className = 'ow';
  w.innerHTML = `<div class="ow-card"><button class="ow-x" aria-label="Затвори">✕</button><div class="ow-step" id="owStep"></div></div>`;
  document.body.appendChild(w);
  const step = w.querySelector('#owStep');
  const close = () => { w.classList.remove('in'); popOpen = false; setTimeout(() => w.remove(), 350); };
  w.querySelector('.ow-x').onclick = close;
  w.onclick = ev => { if (ev.target === w) close(); };
  const swap = html => { step.classList.add('out'); setTimeout(() => { step.innerHTML = html; step.classList.remove('out'); }, 180); };

  const ask = () => {
    step.innerHTML = `<div class="ow-mascot">${e}</div>
      <div class="ow-kicker">${name ? `Здрасти, ${esc(name)}!` : 'Здрасти!'} 👋</div>
      <h2 class="ow-title">${t}</h2>
      <p class="ow-text">${s}</p>
      <form class="ow-field" id="owF"><input id="owQ" placeholder="Напр. кафе, пелени, слушалки…" autocomplete="off" enterkeyhint="search"><button class="ow-go" aria-label="Напред">→</button></form>
      <div class="ow-sub">или избери идея:</div>
      <div class="ow-chips">${ideas.map(x => `<button class="ow-chip" data-i="${esc(x)}">${esc(x)}</button>`).join('')}</div>
      <button class="ow-skip" id="owSkip">Ще разгледам сам</button>`;
    const q = step.querySelector('#owQ');
    setTimeout(() => q.focus(), 400);
    step.querySelector('#owF').onsubmit = ev => { ev.preventDefault(); if (q.value.trim()) pick(q.value.trim()); else { q.classList.add('shake'); setTimeout(() => q.classList.remove('shake'), 500); } };
    step.querySelectorAll('[data-i]').forEach(b => b.onclick = () => pick(b.dataset.i.replace(/^\S+\s/, '')));
    step.querySelector('#owSkip').onclick = close;
  };
  const pick = q => {
    onlineQ = q;
    const order = owRoute(q), best = ONLINE_SHOPS.find(x => x.id === order[0]);
    const rest = order.slice(1, 5).map(id => ONLINE_SHOPS.find(x => x.id === id)).filter(Boolean);
    swap(`<div class="ow-mascot">🎯</div>
      <div class="ow-kicker">Търсим: „${esc(q)}“</div>
      <h2 class="ow-title">Ето къде ще го намерим!</h2>
      <button class="ow-best" data-s="${best.id}"><span class="ow-badge">Препоръчвам</span><span class="ow-sname" style="color:${best.color}">${esc(best.name)}</span><span class="ow-why">${OW_WHY[best.id] || ''}</span><span class="ow-arrow">Отвори ↗</span></button>
      <div class="ow-sub">или пробвай и тук:</div>
      <div class="ow-shops">${rest.map(x => `<button class="ow-shop" data-s="${x.id}"><b style="color:${x.color}">${esc(x.name)}</b><span>${OW_WHY[x.id] || ''}</span></button>`).join('')}</div>
      <div class="row" style="gap:8px;justify-content:center;margin-top:12px"><button class="ow-skip" id="owBack">← Друго търсене</button><button class="ow-skip" id="owAdd">＋ В списъка</button></div>`);
    setTimeout(() => {
      step.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { const sh = ONLINE_SHOPS.find(x => x.id === b.dataset.s); close(); render(); openExt(sh.url(q)); });
      step.querySelector('#owBack').onclick = () => { step.classList.add('out'); setTimeout(() => { ask(); step.classList.remove('out'); }, 180); };
      step.querySelector('#owAdd').onclick = () => { if (!S.list.some(i => !i.done && norm(i.name) === norm(q))) { S.list.push({ id: uid(), name: q, cat: guessCat(q), qty: 1, done: false, from: 'Онлайн', added: Date.now() }); save(); } toast('Добавено в списъка 📝'); };
    }, 200);
  };
  ask();
  requestAnimationFrame(() => w.classList.add('in'));
}
(function () {
  const bgo = go;
  go = function (name, push) {
    const prev = current;
    const r = bgo.apply(this, arguments);
    if (name === 'online' && prev !== 'online') setTimeout(onlineWizard, 260);
    return r;
  };
})();

/* ─── Известия при лошо време (по последната прогноза) — подсеща за поръчка през eBag ─── */
async function scheduleWxNotif() {
  const ln = typeof LN === 'function' && LN(); const w = D.weather; if (!ln || !w || !w.hourly) return;
  try {
    const ids = []; for (let i = 0; i < 10; i++) ids.push({ id: 1200 + i });
    await ln.cancel({ notifications: ids }).catch(() => {});
    if (S.settings.wxNotif === false) return;
    const st = await ln.checkPermissions(); if (st.display !== 'granted') return;
    try { await ln.createChannel({ id: 'wx', name: 'Лошо време', description: 'Подсещане за поръчка от вкъщи при дъжд, сняг, студ и жега', importance: 4, visibility: 1, vibration: true }); } catch (e) {}
    const now = Date.now(), list = [], usedDay = {}, hh = household(), kid = KID_PICKS[hh];
    const kidTxt = kid ? ` ${hh === 'baby' ? '👶' : '🧒'} И за малките: ${kid.items.slice(0, 2).join(', ').toLowerCase()}.` : '';
    const fit = t => { // без нощни известия: 22:00–07:00 → 07:30
      const d = new Date(t); const h = d.getHours();
      if (h >= 22) { d.setDate(d.getDate() + 1); d.setHours(7, 30, 0, 0); } else if (h < 7) d.setHours(7, 30, 0, 0);
      return d;
    };
    const add = (at, key, title, body) => {
      const day = at.toDateString(); if (usedDay[day] || at.getTime() < now + 5 * 60e3 || list.length >= 10) return;
      usedDay[day] = 1;
      list.push({ id: 1200 + list.length, channelId: 'wx', title, body: body + kidTxt, largeBody: body + kidTxt, schedule: { at, allowWhileIdle: true }, extra: { go: 'home' }, smallIcon: 'ic_stat_mama', iconColor: '#7C3AED' });
    };
    // дъжд и сняг — час преди началото
    rainWindows(w).forEach(x => {
      const at = fit(x.s - 3600e3); if (at.getTime() >= x.e) return;
      const when = `${new Date(x.s).toDateString() === at.toDateString() ? 'днес' : 'утре'} от ${hm(x.s)}`;
      if (x.snow) add(at, 'snow', '❄️ Идва сняг — остани на топло', `Сняг ${when} (${durTxt(x.e - x.s)}). Поръчай през eBag и пазарът идва до вратата 🛒`);
      else add(at, 'rain', '🌧️ Скоро завалява — не се мокри', `Дъжд ${when} за ${durTxt(x.e - x.s)}. Без чадър и торби — поръчай през eBag 🛒`);
    });
    // студ и жега — по дневната прогноза
    const Dd = w.daily; if (Dd) Dd.time.forEach((t, i) => {
      const d0 = new Date(t + 'T00:00'); const mn = Dd.temperature_2m_min[i], mx = Dd.temperature_2m_max[i], mo = d0.getMonth();
      if (mn <= -1 && mx <= 4) { const at = new Date(d0); at.setHours(8, 0, 0, 0); add(at, 'cold', `🥶 Мразовит ден: до ${Math.round(mn)}°`, 'Днес е студено навън. Поръчай нужното през eBag с доставка до вратата 🛒'); }
      if (mo >= 5 && mo <= 8 && mx >= 33) { const at = new Date(d0); at.setHours(10, 30, 0, 0); add(at, 'heat', `🥵 Жега до ${Math.round(mx)}° днес`, 'Не мъкни торби в жегата — поръчай вода и свежи продукти през eBag 🛒'); }
    });
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) { /* не е критично */ }
}
(function () {
  const bSet = renderSettings;
  renderSettings = function (el) {
    bSet(el);
    setTimeout(() => {
    const card = [...el.querySelectorAll('.card h2')].find(h => /Подсещания за храна/.test(h.textContent));
    const html = `<label class="row between" style="padding:8px 0;align-items:center"><span>🌧️ Лошо време (дъжд, сняг, студ, жега)</span><input type="checkbox" id="wxN" ${S.settings.wxNotif !== false ? 'checked' : ''} style="width:24px;height:24px;accent-color:#0e7a5c"></label>`;
    if (card) { const c = card.closest('.card'); const btn = c.querySelector('#mealTest'); btn ? btn.insertAdjacentHTML('beforebegin', html) : c.insertAdjacentHTML('beforeend', html); }
    const cb = el.querySelector('#wxN'); if (cb) cb.onchange = () => { S.settings.wxNotif = cb.checked; save(); scheduleWxNotif(); toast(cb.checked ? 'Включено' : 'Изключено'); };
    }, 0);
  };
})();
