/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Търсене навсякъде: екрани, настройки и действия, рецепти, продукти и цени, празници, дневник, книга с рецепти.
   Работи и с латиница („musaka“ → „мусака“), без интернет. */
(function () {
  /* ─── индекс на екрани и действия ─── */
  const sheetDo = (fn) => () => { closeSearch(); setTimeout(fn, 120); };
  const goTo = (s) => sheetDo(() => go(s));
  const setTo = (fn) => sheetDo(() => { go('settings'); setTimeout(fn, 250); });
  const scrollTo = (re) => () => { const h = [...document.querySelectorAll('#s-settings .card h2')].find(x => re.test(x.textContent)); if (h) h.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const ACTIONS = [
    ['🏠', 'Начало', 'начало home главна', goTo('home')],
    ['🏷️', 'Цени', 'цени продукти сравнение вериги евтино', goTo('prices')],
    ['🛒', 'Списък за пазар', 'списък пазар покупки shopping list', goTo('list')],
    ['🍽️', 'Меню и рецепти', 'меню рецепти седмично готвене ястия', goTo('recipes')],
    ['🍽️', 'Дневник на храненето', 'дневник какво ядох хранене калории оценка седмица', goTo('diary')],
    ['📊', 'Оценка на седмицата', 'оценка седмица хранене съвети резултат', sheetDo(() => { go('diary'); typeof dWeekSheet === 'function' && dWeekSheet(); })],
    ['➕', 'Запиши хранене', 'запиши ядох изядох добави хранене', sheetDo(() => typeof dAddSheet === 'function' && dAddSheet())],
    ['🩺', 'My Doctor', 'доктор лекар здраве изследвания холестерол захар кръвна режим', goTo('doctor')],
    ['📄', 'Качи изследвания (PDF/снимка)', 'изследвания pdf снимка резултати лаборатория качи', goTo('doctor')],
    ['📷', 'Скенер на баркод', 'скенер баркод състав алергени добавки е-кодове', goTo('scan')],
    ['🚶', 'Активност и крачки', 'крачки активност разходка калории', goTo('activity')],
    ['💪', 'FIT — тренировки', 'фит fit тренировка фитнес спорт зала упражнения', sheetDo(() => typeof openFit === 'function' && openFit())],
    ['📊', 'Статистика на разходите', 'статистика разходи пари месец бюджет', goTo('stats')],
    ['📰', 'Новини', 'новини цени санкции изтеглени храни', goTo('news')],
    ['📍', 'Магазини и карта', 'магазини карта близо вериги kaufland lidl billa', goTo('stores')],
    ['🌐', 'Онлайн пазаруване', 'онлайн ebay emag amazon поръчка', goTo('online')],
    ['🧺', 'eBag — поръчка до вкъщи', 'ebag доставка поръчка вкъщи онлайн', goTo('online')],
    ['⛔', 'Забранени храни', 'забранени вредни алергии избягвам', goTo('banned')],
    ['🌍', 'Свят — кухни по държави', 'свят кухни държави италианска гръцка азиатска', goTo('world')],
    ['📅', 'Календар и празници', 'календар празници имен ден пости', goTo('calendar')],
    ['🍰', 'Сладкарница — десерти', 'десерти сладко торта сладкиш рожден ден', goTo('desserts')],
    ['🥗', 'Салатен бар', 'салати салата', goTo('salads')],
    ['💬', 'На масата — чат', 'чат съобщения видео разговор гласови семейство', goTo('chat')],
    ['❤️', 'Моята книга с рецепти', 'книга любими запазени рецепти мои', goTo('recipes')],
    ['🗓️', 'Тематична седмица', 'тематична седмица тема кухня', sheetDo(() => typeof themeSheet === 'function' && themeSheet())],
    ['🎄', 'Брояч до Нова година', 'нова година брояч празник', sheetDo(() => typeof nySheet === 'function' && nySheet())],
    ['⚙️', 'Настройки', 'настройки опции', goTo('settings')],
    ['🔔', 'Подсещания за храна (известия)', 'известия нотификации подсещане закуска обяд вечеря аларма', setTo(scrollTo(/Подсещания/))],
    ['💾', 'Архив на данните', 'архив резервно копие запази възстанови нов телефон backup', setTo(scrollTo(/Архив/))],
    ['🔒', 'Поверителност', 'поверителност лични данни gdpr политика', setTo(scrollTo(/Поверителност/))],
    ['🛠️', 'Грешки и поддръжка', 'грешки бъг проблем отчет поддръжка', sheetDo(() => typeof errSheet === 'function' && errSheet())],
    ['📍', 'Град и местоположение', 'град населено място местоположение локация', setTo(() => window.scrollTo(0, 0))],
    ['🔄', 'Провери за обновление', 'обновление версия ъпдейт update нова версия', sheetDo(() => { if (typeof checkUpdates === 'function') { toast('Проверявам за обновление…'); checkUpdates(true); } })],
  ];

  /* ─── нормализиране и латиница → кирилица ─── */
  const LAT = [['sht', 'щ'], ['sh', 'ш'], ['ch', 'ч'], ['zh', 'ж'], ['yu', 'ю'], ['ya', 'я'], ['ts', 'ц'], ['a', 'а'], ['b', 'б'], ['v', 'в'], ['g', 'г'], ['d', 'д'], ['e', 'е'], ['z', 'з'], ['i', 'и'], ['y', 'й'], ['k', 'к'], ['l', 'л'], ['m', 'м'], ['n', 'н'], ['o', 'о'], ['p', 'п'], ['r', 'р'], ['s', 'с'], ['t', 'т'], ['u', 'у'], ['f', 'ф'], ['h', 'х'], ['c', 'ц'], ['w', 'в'], ['x', 'кс'], ['q', 'я'], ['j', 'й']];
  const nz = s => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[„“"'.,!?()]/g, ' ').replace(/\s+/g, ' ').trim();
  function toCyr(s) { let o = '', i = 0; while (i < s.length) { const m = LAT.find(([l]) => s.startsWith(l, i)); if (m) { o += m[1]; i += m[0].length; } else { o += s[i]; i++; } } return o; }
  function variants(q) { const a = nz(q); const v = [a]; if (/[a-z]/.test(a)) v.push(toCyr(a)); return [...new Set(v)].filter(Boolean); }
  // оценка: начало на думата > съдържа > всички думи
  function scoreText(text, qs) {
    const t = nz(text); let best = 0;
    for (const q of qs) {
      if (!q) continue;
      if (t === q) best = Math.max(best, 100);
      else if (t.startsWith(q)) best = Math.max(best, 80);
      else if (t.includes(' ' + q)) best = Math.max(best, 65);
      else if (t.includes(q)) best = Math.max(best, 45);
      else { const ws = q.split(' ').filter(w => w.length > 1); if (ws.length > 1 && ws.every(w => t.includes(w))) best = Math.max(best, 40); }
    }
    return best;
  }

  /* ─── търсене ─── */
  let prodCache = null, prodStamp = null;
  function products() {
    const idx = D && D.idx; if (!idx) return [];
    if (prodCache && prodStamp === idx) return prodCache;
    const m = new Map();
    for (const cat in idx.byCat) for (const ch in idx.byCat[cat]) for (const p of idx.byCat[cat][ch]) {
      const k = nz(p.name); const x = m.get(k);
      if (!x || p.price < x.price) m.set(k, Object.assign({}, p, { n: (x ? x.n : 0) + 1 })); else x.n++;
    }
    prodCache = [...m.values()]; prodStamp = idx; return prodCache;
  }
  function run(q) {
    const qs = variants(q); if (!qs[0] || qs[0].length < 2) return null;
    const out = { act: [], rec: [], prod: [], hol: [], diary: [] };
    ACTIONS.forEach(a => { const s = Math.max(scoreText(a[1], qs), scoreText(a[2], qs) - 5); if (s) out.act.push([s, a]); });
    RECIPES.forEach(r => { if (r.holiday && !r.name) return; const s = Math.max(scoreText(r.name, qs), r.ing ? scoreText(r.ing.map(i => i[0]).join(' '), qs) - 30 : 0); if (s > 0) out.rec.push([s + (typeof isSaved === 'function' && isSaved(r.id) ? 8 : 0), r]); });
    products().forEach(p => { const s = scoreText(p.name, qs); if (s) out.prod.push([s - (p.n > 1 ? 0 : 3), p]); });
    try { const y = new Date().getFullYear(); const t = new Date(); t.setHours(0, 0, 0, 0); [...holidaysOf(y), ...holidaysOf(y + 1)].filter(h => h.date >= t).forEach(h => { const s = scoreText(h.n + ' ' + (h.names || []).join(' '), qs); if (s && !out.hol.some(x => x[1].id === h.id)) out.hol.push([s, h]); }); } catch (e) {}
    try { const seen = new Set(); (S.diary && S.diary.e || []).slice().reverse().forEach(e => { const k = nz(e.n); if (seen.has(k)) return; const s = scoreText(e.n, qs); if (s) { seen.add(k); out.diary.push([s, e]); } }); } catch (e) {}
    for (const k in out) out[k] = out[k].sort((a, b) => b[0] - a[0]).map(x => x[1]);
    return out;
  }

  /* ─── интерфейс ─── */
  let box = null;
  function closeSearch() { if (!box) return; box.classList.remove('in'); const b = box; box = null; setTimeout(() => b.remove(), 180); }
  function openSearch(initial = '') {
    if (box) return box.querySelector('input').focus();
    box = document.createElement('div'); box.id = 'srch'; box.className = 'srch';
    box.innerHTML = `<div class="srch-bar"><button class="iconbtn" id="srBack" aria-label="Затвори">${'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20z"/></svg>'}</button>
      <input id="srIn" type="search" enterkeyhint="search" autocomplete="off" placeholder="Търси във MAMA: мусака, мляко, известия…" value="${esc(initial)}"><button class="iconbtn" id="srClr" aria-label="Изчисти">✕</button></div>
      <div class="srch-body" id="srBody"></div>`;
    document.body.appendChild(box); requestAnimationFrame(() => box && box.classList.add('in'));
    const inp = box.querySelector('#srIn'), body = box.querySelector('#srBody');
    box.querySelector('#srBack').onclick = closeSearch;
    box.querySelector('#srClr').onclick = () => { inp.value = ''; draw(); inp.focus(); };
    let t = null; inp.oninput = () => { clearTimeout(t); t = setTimeout(draw, 120); };
    inp.onkeydown = e => { if (e.key === 'Enter') { const first = body.querySelector('[data-i]'); if (first) first.click(); } if (e.key === 'Escape') closeSearch(); };
    let items = [];
    function row(icon, title, sub, fn, extra = '') { items.push(fn); return `<li class="li" data-i="${items.length - 1}"><div class="lead">${icon}</div><div class="grow"><div class="title">${title}</div>${sub ? `<div class="muted small">${sub}</div>` : ''}</div>${extra}</li>`; }
    function sec(title, html, more) { return html ? `<div class="srch-sec">${title}${more ? ` <span class="muted small">· ${more}</span>` : ''}</div><ul class="list">${html}</ul>` : ''; }
    function hl(text, q) { const s = esc(text); const qs = variants(q).filter(x => x.length > 1); for (const x of qs) { const i = String(text).toLowerCase().replace(/ё/g, 'е').indexOf(x); if (i >= 0) return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + x.length)) + '</mark>' + esc(text.slice(i + x.length)); } return s; }
    function draw() {
      items = [];
      const q = inp.value.trim(), r = run(q);
      if (!r) {
        const rec = (S.srch || []).slice(0, 6);
        body.innerHTML = (rec.length ? `<div class="srch-sec">Последни търсения</div><div class="chips" style="padding:0 4px">${rec.map(x => `<button class="chip" data-rq="${esc(x)}">${esc(x)}</button>`).join('')}</div>` : '') +
          `<div class="srch-sec">Бърз достъп</div><div class="srch-grid">${ACTIONS.filter(a => /^(Цени|Списък за пазар|Меню и рецепти|Дневник на храненето|My Doctor|Скенер на баркод|Сладкарница|Салатен бар|Календар|На масата|Настройки|FIT)/.test(a[1])).map(a => `<button data-qa="${esc(a[1])}"><span>${a[0]}</span>${esc(a[1].replace(/ —.*/, ''))}</button>`).join('')}</div>`;
        body.querySelectorAll('[data-rq]').forEach(b => b.onclick = () => { inp.value = b.dataset.rq; draw(); });
        body.querySelectorAll('[data-qa]').forEach(b => b.onclick = () => { const a = ACTIONS.find(x => x[1] === b.dataset.qa); a && a[3](); });
        return;
      }
      const remember = () => { S.srch = [q, ...(S.srch || []).filter(x => nz(x) !== nz(q))].slice(0, 8); save(); };
      let html = '';
      html += sec('Екрани и настройки', r.act.slice(0, 5).map(a => row(a[0], hl(a[1], q), '', () => { remember(); a[3](); })).join(''));
      html += sec('Рецепти', r.rec.slice(0, 8).map(x => row(groupIcon(x.group), hl(x.name, q), `${x.time ? x.time + ' мин' : ''}${x.c && typeof COUNTRIES !== 'undefined' && COUNTRIES[x.c] ? ' · ' + esc(COUNTRIES[x.c].n || '') : ''}${typeof isSaved === 'function' && isSaved(x.id) ? ' · ❤️ в книгата' : ''}`, sheetDo(() => { remember(); showRecipe(x.id); }))).join(''), r.rec.length > 8 ? `още ${r.rec.length - 8}` : '');
      html += sec('Продукти и цени', r.prod.slice(0, 8).map(p => row('🏷️', hl(p.name, q), `от <b>${eur(p.price)}</b> в ${esc(chainName(p.ch))}${p.n > 1 ? ` · в ${p.n} вериги` : ''}${p.promo ? ' · 🔥 промоция' : ''}`,
        sheetDo(() => { remember(); priceQuery = p.name; go('prices'); }), `<button class="btn tonal small" data-add="${items.length}" aria-label="Добави в списъка">+</button>`)).join(''), r.prod.length > 8 ? `още ${r.prod.length - 8}` : '');
      html += sec('Празници', r.hol.slice(0, 4).map(h => row(h.emo || '🎉', hl(h.n, q), h.date.toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', weekday: 'short' }), sheetDo(() => { remember(); showHoliday(h.id, h.date); }))).join(''));
      html += sec('От дневника', r.diary.slice(0, 3).map(e => row('🍽️', hl(e.n, q), `${new Date(e.d + 'T12:00').toLocaleDateString('bg-BG', { day: 'numeric', month: 'short' })} · запиши отново`, sheetDo(() => { remember(); typeof dAdd === 'function' && dAdd(e.n, typeof dMealNow === 'function' ? dMealNow() : 'l', e.p || 1, e.rid); toast('Записано в дневника'); }))).join(''));
      body.innerHTML = html || `<div class="srch-empty"><div style="font-size:40px">🔍</div><b>Няма резултати за „${esc(q)}“</b><div class="muted small" style="margin-top:6px">Опитай с друга дума или добави „${esc(q)}“ в списъка.</div>
        <button class="btn primary small" id="srAddQ" style="margin-top:12px">🛒 Добави „${esc(q)}“ в списъка</button></div>`;
      body.querySelectorAll('[data-i]').forEach(li => li.onclick = e => { if (e.target.closest('[data-add]')) return; items[+li.dataset.i](); });
      body.querySelectorAll('[data-add]').forEach(b => b.onclick = e => {
        e.stopPropagation(); const p = r.prod[[...body.querySelectorAll('[data-add]')].indexOf(b)]; if (!p) return;
        if (S.list.some(i => !i.done && norm(i.name) === norm(p.name))) return toast('Вече е в списъка');
        S.list.push({ id: uid(), name: p.name, cat: p.cat, qty: 1, done: false, product: { chain: p.ch, name: p.name }, added: Date.now() }); save(); remember();
        b.textContent = '✓'; b.disabled = true; toast(`Добавено в списъка: ${p.name}`);
      });
      const aq = body.querySelector('#srAddQ'); if (aq) aq.onclick = () => { S.list.push({ id: uid(), name: q, cat: guessCat(q), qty: 1, done: false, added: Date.now() }); save(); toast('Добавено в списъка'); closeSearch(); };
    }
    draw(); setTimeout(() => inp.focus(), 200);
  }

  /* бутон в горната лента */
  const bar = document.getElementById('appbar'), ref = document.getElementById('refreshBtn');
  if (bar && !document.getElementById('searchBtn')) {
    const b = document.createElement('button'); b.className = 'iconbtn'; b.id = 'searchBtn'; b.setAttribute('aria-label', 'Търсене');
    b.innerHTML = I.search; b.onclick = () => openSearch();
    ref ? bar.insertBefore(b, ref) : bar.appendChild(b);
  }
  /* поле за търсене на началния екран */
  const bHome = renderHome;
  renderHome = function (el) {
    bHome.apply(this, arguments);
    if (el.querySelector('#homeSrch')) return;
    el.insertAdjacentHTML('afterbegin', `<button class="home-srch" id="homeSrch">${I.search}<span>Търси рецепти, продукти, настройки…</span></button>`);
    const hs = el.querySelector('#homeSrch'); hs.onclick = () => openSearch();
    setTimeout(() => { if (hs.parentNode === el && el.firstElementChild !== hs) el.prepend(hs); }, 0);
  };
  /* „Назад“ затваря търсенето */
  const bBack = back;
  back = function () { if (box) return closeSearch(); return bBack.apply(this, arguments); };
  const bb = document.getElementById('backBtn'); if (bb) bb.onclick = () => back();
  const bSO = sheetOpen; sheetOpen = function () { return !!box || bSO.apply(this, arguments); };
  window.openSearch = openSearch; window.closeSearch = closeSearch; window.mamaSearch = run;
})();
