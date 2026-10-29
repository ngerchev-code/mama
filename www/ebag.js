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
  const head = W ? `${W.e} ${W.title}` : (hh === 'baby' ? '👶 Пазарувай от вкъщи' : '👨‍👩‍👧 Пазарувай от вкъщи');
  const sub = W ? W.text : 'С малко дете е по-лесно: поръчай нужното онлайн и вземи доставката до вратата.';
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
  loadWeather = async function () { await bw(); if (current === 'home') render(); setTimeout(ebagNudge, 2500); };
})();
