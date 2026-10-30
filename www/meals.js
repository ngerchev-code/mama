/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Обяд (12:00) и вечеря (18:30) + известия на телефона за закуска, обяд и вечеря — всеки ден различно предложение. */
const MEAL = {
  b: { at: [7, 0], from: 360, to: 510, ttl: '☀️ Добро утро{N}! Закуска на деня', key: 'bf' },
  l: { at: [12, 0], from: 720, to: 870, ttl: '🍲 Време за обяд{N}!', key: 'lunchD' },
  d: { at: [18, 30], from: 1110, to: 1260, ttl: '🌙 Какво ще вечеряме{N}?', key: 'dinnerD' }
};
function mealPool(kind, date) {
  const m = date.getMonth() + 1;
  const base = r => !r.holiday && inSeason(r, m);
  const fit = kind === 'l' ? r => ['soup', 'main'].includes(r.group) : r => r.group === 'salad' || (r.group === 'main' && r.time <= 60) || (r.group === 'soup' && r.time <= 40);
  let pool = RECIPES.filter(r => base(r) && fit(r) && prefRecipeOk(r, true));
  if (pool.length < 8) pool = RECIPES.filter(r => base(r) && fit(r) && prefRecipeOk(r, false));
  return pool;
}
function mealPick(kind, skip = 0, date = new Date()) {
  if (kind === 'b') return bfPick(skip, date);
  const p = P(), pool = permOf(mealPool(kind, date), kind + date.getFullYear() + p.diet + (p.noPork ? 'np' : '') + p.cuisines.join(','));
  if (!pool.length) return null;
  // обядът и вечерята в един ден не съвпадат
  let r = pool[(dayOfYear(date) + skip) % pool.length];
  if (kind === 'd') { const l = mealPick('l', 0, date); if (l && r && l.id === r.id) r = pool[(dayOfYear(date) + skip + 1) % pool.length]; }
  return r;
}
function nm() { const n = (P().name || '').trim().split(' ')[0]; return n ? ', ' + n : ''; }
function mealShow(kind, skip = 0) {
  if (kind === 'b') return bfShow(skip);
  const r = mealPick(kind, skip); if (!r) return;
  S.guide[MEAL[kind].key] = todayISO(); save();
  const ing = r.ing.filter(i => !/^(сол|пипер|черен пипер|вода)$/i.test(i[0])).slice(0, 6);
  const isL = kind === 'l';
  popup({ theme: isL ? 'linear-gradient(140deg,#0e9f6e 0%,#22c55e 60%,#84cc16 100%)' : 'linear-gradient(140deg,#4338ca 0%,#7c3aed 55%,#c026d3 100%)',
    emoji: groupIcon(r.group), kicker: `${isL ? '🍲 Обяд' : '🌙 Вечеря'}${nm()} · предложение за днес`, title: esc(r.name),
    text: `<div class="bf-meta">⏱️ ${r.time} мин · ${r.serv} порции${!isL && r.group === "salad" ? " · леко за вечерта" : ""}</div><ul class="bf-ing">${ing.map(i => `<li>${esc(i[0])}${i[1] && i[1] !== 'по вкус' ? ` — ${esc(i[1])}` : ''}</li>`).join('')}</ul>`,
    actions: [{ label: '📖 Виж рецептата', primary: true, fn: () => setTimeout(() => showRecipe(r.id), 300) }, { label: '🔄 Друго предложение', fn: () => setTimeout(() => mealShow(kind, skip + 1), 250) }, { label: 'Благодаря', fn: null }] });
}
function mealCheck() {
  if (!P().onboarded) return;
  if (popOpen || document.querySelector('.onb, .tour, #ow, #call, .greet.in') || (typeof sheetOpen === 'function' && sheetOpen())) return;
  const d = new Date(), mins = d.getHours() * 60 + d.getMinutes(), on = S.settings.meals || {};
  for (const k of ['l', 'd']) { const M = MEAL[k]; if (on[k] !== false && mins >= M.from && mins <= M.to && S.guide[M.key] !== todayISO()) return mealShow(k); }
}

/* ─── известия на телефона за следващите 7 дни ─── */
async function scheduleMeals(ask) {
  const ln = LN(); if (!ln) return;
  try {
    let st = await ln.checkPermissions();
    if (st.display !== 'granted' && ask) st = await ln.requestPermissions();
    const ids = []; for (let i = 0; i < 24; i++) ids.push({ id: 1100 + i });
    await ln.cancel({ notifications: ids }).catch(() => {});
    if (st.display !== 'granted') return;
    try { await ln.createChannel({ id: 'meals', name: 'Закуска, обяд и вечеря', description: 'Предложение за храна три пъти дневно', importance: 4, visibility: 1, vibration: true }); } catch (e) {}
    const on = S.settings.meals || {}, now = new Date(), list = [];
    for (let day = 0; day < 7; day++) {
      ['b', 'l', 'd'].forEach((k, j) => {
        if (on[k] === false) return;
        const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + day, MEAL[k].at[0], MEAL[k].at[1]);
        if (at <= now) return;
        const r = mealPick(k, 0, at); if (!r) return;
        const body = k === 'b' ? `${r.e} ${r.n} · ${r.min} мин. Натисни за рецептата.` : k === 'l' ? `Днес предлагаме: ${r.name} (${r.time} мин). Натисни за рецептата 👉` : `Идея за вечерта: ${r.name} · ${r.time} мин. Виж как се прави 👉`;
        list.push({ id: 1100 + day * 3 + j, channelId: 'meals', title: MEAL[k].ttl.replace('{N}', nm()), body, largeBody: body, schedule: { at, allowWhileIdle: true }, extra: { meal: k }, smallIcon: 'ic_stat_mama', iconColor: '#0E7A5C' });
      });
    }
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) { /* известията не са критични */ }
}
function mealsAskOnce() {
  if (!LN() || S.settings.mealsAsked || !P().onboarded || popOpen) return false;
  S.settings.mealsAsked = 1; save();
  popup({ theme: 'linear-gradient(140deg,#f76b1c 0%,#22c55e 100%)', emoji: '🔔', kicker: 'Ново в MAMA', title: 'Да те подсещам ли за храната?',
    text: 'Всеки ден по едно вкусно и здравословно предложение:<br>☀️ <b>07:00</b> закуска<br>🍲 <b>12:00</b> обяд<br>🌙 <b>18:30</b> вечеря<br><span class="small">Можеш да ги изключиш от Настройки.</span>',
    actions: [{ label: '🔔 Да, подсещай ме', primary: true, fn: () => scheduleMeals(true) }, { label: 'Не сега', fn: null }] });
  return true;
}

/* ─── Настройки ─── */
(function () {
  const bSet = renderSettings;
  renderSettings = function (el) {
    bSet(el);
    const on = S.settings.meals || {};
    const row = (k, e, t) => `<label class="row between" style="padding:8px 0;align-items:center"><span>${e} ${t}</span><input type="checkbox" data-meal="${k}" ${on[k] !== false ? 'checked' : ''} style="width:24px;height:24px;accent-color:#0e7a5c"></label>`;
    el.insertAdjacentHTML('beforeend', `<div class="card"><h2>🔔 Подсещания за храна</h2><div class="muted small">Известие на телефона и предложение в приложението.</div>
      ${row('b', '☀️', 'Закуска · 07:00')}${row('l', '🍲', 'Обяд · 12:00')}${row('d', '🌙', 'Вечеря · 18:30')}
      ${LN() ? '<button class="btn tonal small" id="mealTest" style="margin-top:6px">Разреши известията</button>' : ''}</div>`);
    el.querySelectorAll('[data-meal]').forEach(c => c.onchange = () => { S.settings.meals = Object.assign({}, S.settings.meals, { [c.dataset.meal]: c.checked }); save(); scheduleMeals(false); toast(c.checked ? 'Включено' : 'Изключено'); });
    const t = el.querySelector('#mealTest'); if (t) t.onclick = async () => { await scheduleMeals(true); const st = await LN().checkPermissions(); toast(st.display === 'granted' ? 'Известията са разрешени ✓' : 'Разреши ги от настройките на телефона'); };
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => scheduleMeals(false), 4000);
  setTimeout(() => { if (!mealsAskOnce()) mealCheck(); }, 9000);
  setInterval(mealCheck, 20000);
  const ln = LN();
  if (ln) ln.addListener('localNotificationActionPerformed', a => { const x = (a && a.notification && a.notification.extra) || {}; if (x.meal) setTimeout(() => { closePopup && closePopup(true); go('home'); mealShow(x.meal); }, 900); });
});
document.addEventListener('visibilitychange', () => { if (!document.hidden) { setTimeout(mealCheck, 3500); scheduleMeals(false); } });
