/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Брояч до Нова година (винаги видим) + мостове към FIT. */
(function () {
  /* ─── брояч ─── */
  const pad = n => String(n).padStart(2, '0');
  function nyTarget(now = new Date()) {
    // 1 януари: празнуваме цял ден, после броим до следващата
    if (now.getMonth() === 0 && now.getDate() === 1) return { party: true, year: now.getFullYear() };
    return { at: new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0), year: now.getFullYear() + 1 };
  }
  function parts(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return { d: Math.floor(s / 86400), h: Math.floor(s / 3600) % 24, m: Math.floor(s / 60) % 60, s: s % 60 }; }
  const dWord = d => d === 1 ? 'ден' : 'дни';

  const bar = document.createElement('button');
  bar.id = 'nyBar'; bar.className = 'ny-bar'; bar.setAttribute('aria-label', 'Брояч до Нова година');
  const ab = document.getElementById('appbar');
  if (ab) ab.insertAdjacentElement('afterend', bar);
  const place = () => { if (ab) bar.style.top = ab.offsetHeight + 'px'; };
  place(); window.addEventListener('resize', place); setTimeout(place, 800);

  function tick() {
    const t = nyTarget();
    if (t.party) { bar.innerHTML = `<span class="ny-e">🎆</span><b>Честита Нова ${t.year} година!</b><span class="ny-go">›</span>`; return; }
    const p = parts(t.at - Date.now());
    bar.innerHTML = `<span class="ny-e">🎄</span><span class="ny-l">До Нова година</span><span class="ny-t"><b>${p.d}</b><i>${dWord(p.d)}</i> <b>${pad(p.h)}:${pad(p.m)}:${pad(p.s)}</b></span><span class="ny-go">›</span>`;
    const box = document.getElementById('nyBig');
    if (box) box.innerHTML = [[p.d, dWord(p.d)], [pad(p.h), 'часа'], [pad(p.m), 'мин'], [pad(p.s), 'сек']].map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('');
  }
  tick(); setInterval(tick, 1000);

  function nySheet() {
    const t = nyTarget();
    const dishes = ['h_banica_kasmet', 'h_svinsko_zele', 'snezhanka', 'h_pitka'].map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
    const d = t.party ? 0 : parts(t.at - Date.now()).d;
    const plan = d > 30 ? 'Има време — направи си план за подаръците и менюто без стрес.' : d > 7 ? 'Време е да напазаруваш трайните продукти и напитките — сега цените са по-ниски, отколкото в последната седмица.' : d > 1 ? 'Последна права! Пресните продукти — 1–2 дни преди празника.' : 'Остава съвсем малко — нека е весело! 🥂';
    openSheet(`<div class="ny-hero"><div class="small" style="opacity:.9">${t.party ? 'Днес е' : 'Остават до'}</div><h3 style="color:#fff;margin:2px 0 10px">${t.party ? `🎆 Нова ${t.year} година!` : `🎄 Нова ${t.year} година`}</h3>${t.party ? '<div style="font-size:15px">Здраве, късмет и берекет! Сурва, сурва година!</div>' : '<div class="ny-big" id="nyBig"></div>'}</div>
      <div class="notice good" style="margin-top:12px">🛒 ${plan}</div>
      ${dishes.length ? `<div class="section-title" style="margin-left:0">Новогодишна трапеза</div><ul class="list">${dishes.map(r => `<li class="li" data-r="${r.id}"><div class="lead">${groupIcon(r.group)}</div><div class="grow"><div class="title">${esc(r.name)}</div><div class="muted small">${r.time} мин</div></div><span class="muted">›</span></li>`).join('')}</ul>
      <button class="btn primary block" id="nyAdd" style="margin-top:10px">🛒 Добави продуктите в списъка</button>` : ''}
      ${fitCard('ny')}
      <button class="btn block" id="nyShare" style="margin-top:10px">📨 Прати брояча на приятели</button>`, el => {
      tick();
      el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => showRecipe(b.dataset.r));
      const a = el.querySelector('#nyAdd'); if (a) a.onclick = () => { let n = 0; dishes.forEach(r => n += addIngredients(r)); toast(`Добавени ${n} продукта в списъка`); closeSheet(); };
      el.querySelector('#nyShare').onclick = nyShare;
      bindFit(el);
    });
    usageHit('ny');
  }
  async function nyShare() {
    const t = nyTarget(), p = t.party ? null : parts(t.at - Date.now());
    const txt = t.party ? `🎆 Честита Нова ${t.year} година! Здраве и късмет! — от MAMA` : `🎄 До Нова ${t.year} година остават ${p.d} ${dWord(p.d)}! Менюто, списъкът и подаръците — с MAMA: https://ngerchev-code.github.io/mama/`;
    try { const Sh = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share; if (Sh) return await Sh.share({ text: txt }); if (navigator.share) return await navigator.share({ text: txt }); } catch (e) { return; }
    try { await navigator.clipboard.writeText(txt); toast('Копирано — постави го във Viber'); } catch (e) {}
  }
  bar.onclick = nySheet;
  window.nySheet = nySheet;

  /* ─── мостове към FIT ─── */
  const FIT_MSG = {
    ny: ['🎯 Новогодишно обещание', 'Започни годината във форма — FIT ти дава 12-седмична програма от 1 януари.'],
    recipe: ['💪 Баланс след хапването', 'Леки 20 минути с FIT и вечерята е „изгорена“.'],
    dessert: ['🍰 Сладко без угризения', 'Една кратка тренировка във FIT и десертът е заслужен.'],
    salad: ['🥗 Салатата + движение', 'Храната е половината. Другата половина — FIT тренировки за начинаещи.'],
    health: ['❤️ Движението лекува', 'Холестерол, кръвна захар, налягане — редовното движение помага. Започни леко с FIT.'],
    home: ['💪 FIT — Fitness Intelligent Team', 'Снимаш уреда във фитнеса — FIT ти казва как се ползва. Програми за начинаещи, 12 седмици.'],
    activity: ['🏋️ Крачките са началото', 'Добави сила и гъвкавост — FIT има кратки тренировки за всеки ден.'],
    list: ['🏃 Пазарът е готов?', 'Чудесно! Сега 15 минути за тялото — FIT те води стъпка по стъпка.'],
  };
  function fitCard(k) { const [t, d] = FIT_MSG[k] || FIT_MSG.home; return `<div class="card fit-bridge" data-fitb="${k}"><div class="fit-ic">💪</div><div class="grow"><b>${t}</b><div class="small">${d}</div></div><span class="fit-go">FIT ›</span></div>`; }
  function bindFit(el) { el.querySelectorAll('[data-fitb]').forEach(b => b.onclick = () => { usageHit('fit_' + b.dataset.fitb); S.guide.fitTap = Date.now(); save(); openFit(); }); }
  function usageHit(k) { try { if (typeof statsHit === 'function' && !(S.settings && S.settings.noStats)) statsHit(k); } catch (e) {} }
  window.fitCard = fitCard; window.bindFit = bindFit;

  const wrap = (fn, k, where) => {
    const b = window[fn]; if (typeof b !== 'function') return;
    window[fn] = function (el) {
      const r = b.apply(this, arguments);
      try { if (el && !el.querySelector('[data-fitb]')) { where === 'top' ? el.insertAdjacentHTML('afterbegin', fitCard(k)) : el.insertAdjacentHTML('beforeend', fitCard(k)); bindFit(el); } } catch (e) {}
      return r;
    };
  };
  // начало: картата след първите няколко карти, не най-отгоре
  (function () {
    const b = renderHome;
    renderHome = function (el) {
      b.apply(this, arguments);
      try {
        if (el.querySelector('[data-fitb]')) return;
        const cards = el.querySelectorAll(':scope > .card'); const at = cards[Math.min(3, cards.length - 1)];
        at ? at.insertAdjacentHTML('afterend', fitCard('home')) : el.insertAdjacentHTML('beforeend', fitCard('home'));
        bindFit(el);
      } catch (e) {}
    };
  })();
  wrap('renderDesserts', 'dessert'); wrap('renderSalads', 'salad'); wrap('renderList', 'list'); wrap('renderDoctor', 'health'); wrap('renderActivity', 'activity', 'top');

  // рецепта: мост в долния панел
  const bShow = showRecipe;
  showRecipe = function (id) {
    const r = bShow.apply(this, arguments);
    try { const body = document.getElementById('sheetBody'); const rec = RECIPES.find(x => x.id === id);
      if (body && rec && !body.querySelector('[data-fitb]')) { body.insertAdjacentHTML('beforeend', fitCard(rec.group === 'dessert' || rec.group === 'pastry' ? 'dessert' : 'recipe')); bindFit(body); } } catch (e) {}
    return r;
  };

  // веднъж седмично (неделя или понеделник следобед) — представяне на FIT, ако не е отварян наскоро
  function fitIntro() {
    if (!P().onboarded || popOpen || (typeof sheetOpen === 'function' && sheetOpen())) return;
    const g = S.guide, now = new Date(), wk = isoWeek();
    if (g.fitWeek === wk || (g.fitTap && Date.now() - g.fitTap < 7 * 864e5)) return;
    if (![0, 1, 3].includes(now.getDay()) || now.getHours() < 16 || now.getHours() >= 22) return;
    g.fitWeek = wk; save();
    popup({ theme: 'linear-gradient(140deg,#1e1b4b 0%,#6d28d9 55%,#be185d 100%)', emoji: '💪', kicker: 'Запознай се с FIT', title: 'Храната е половината. Другата — движение.',
      text: 'FIT е сестринското приложение на MAMA:<ul class="bf-ing"><li>📸 Снимаш уред във фитнеса — казва ти как се ползва</li><li>🗓️ 12-седмична програма за начинаещи</li><li>⏱️ Тренировки от 15 минути — и у дома</li></ul>Безплатно, без регистрация.',
      actions: [{ label: '💪 Отвори FIT', primary: true, fn: () => { g.fitTap = Date.now(); save(); usageHit('fit_pop'); openFit(); } }, { label: 'По-късно', fn: null }] });
  }
  document.addEventListener('DOMContentLoaded', () => { setTimeout(fitIntro, 40000); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden) setTimeout(fitIntro, 30000); });

  // 1 януари 10:00 — новогодишно известие с мост към FIT
  async function scheduleNY() {
    const ln = typeof LN === 'function' && LN(); if (!ln) return;
    try {
      if ((await ln.checkPermissions()).display !== 'granted') return;
      const now = new Date(), y = now.getMonth() === 0 && now.getDate() === 1 && now.getHours() < 10 ? now.getFullYear() : now.getFullYear() + 1;
      const list = [
        { id: 1600, channelId: 'meals', title: `🎆 Честита Нова ${y} година!`, body: 'Здраве и късмет от MAMA! Новогодишно обещание? FIT има 12-седмична програма — започни днес 💪', schedule: { at: new Date(y, 0, 1, 10, 0), allowWhileIdle: true }, extra: { fit: 1 }, smallIcon: 'ic_stat_mama', iconColor: '#6D28D9' },
        { id: 1601, channelId: 'meals', title: '🎄 Остава една седмица до Нова година', body: 'Менюто, списъкът и баницата с късмети — всичко е в MAMA. Натисни 👉', schedule: { at: new Date(y - 1, 11, 24, 17, 0), allowWhileIdle: true }, extra: { ny: 1 }, smallIcon: 'ic_stat_mama', iconColor: '#1D4ED8' },
      ].filter(n => n.schedule.at > now);
      await ln.cancel({ notifications: [{ id: 1600 }, { id: 1601 }] }).catch(() => {});
      if (list.length) await ln.schedule({ notifications: list });
      ln.addListener('localNotificationActionPerformed', a => { const x = (a && a.notification && a.notification.extra) || {}; if (x.fit) setTimeout(openFit, 900); if (x.ny) setTimeout(nySheet, 900); });
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(scheduleNY, 7000));
})();
