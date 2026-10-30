/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   „Сладкарница“ — десерти по вид (здравословни, уникални, известни, домашни) и повод (рожден ден, празници, зима, лято). */
const DK = [['all', '🍰', 'Всички'], ['healthy', '💚', 'Здравословни'], ['unique', '✨', 'Уникални'], ['classic', '⭐', 'Известни'], ['home', '🏡', 'Домашни']];
const DOCC = [['', 'Всеки повод'], ['birthday', '🎂 Рожден ден'], ['holiday', '🎄 Празници'], ['winter', '❄️ Зима'], ['summer', '☀️ Лято']];
let dKind = 'all', dOcc = '';
function dessertsAll() { return RECIPES.filter(r => r.group === 'dessert'); }
function dSeason() { const m = new Date().getMonth(); return (m >= 10 || m <= 2) ? 'winter' : (m >= 5 && m <= 8) ? 'summer' : ''; }
function renderDesserts(el) {
  const all = dessertsAll();
  const list = all.filter(r => (dKind === 'all' || r.dk === dKind || (!r.dk && dKind === 'home')) && (!dOcc || (r.occ || []).includes(dOcc)));
  const tip = { healthy: 'С плодове, ядки и кисело мляко — без или с малко захар.', unique: 'Нещо различно, с което да изненадаш.', classic: 'Десертите, които всички обичат.', home: 'Рецептите на мама и баба.' }[dKind] || 'Над 40 десерта — избери вид и повод.';
  el.innerHTML = `<div class="card des-hero"><div class="row" style="gap:12px;align-items:center"><div class="th-e">🍰</div><div class="grow"><b style="font-size:19px">Сладкарница</b><div class="small" style="opacity:.92">${esc(tip)}</div></div></div></div>
    <div class="chips" style="flex-wrap:wrap">${DK.map(([k, e, n]) => `<button class="chip ${dKind === k ? 'on' : ''}" data-dk="${k}">${e} ${n}</button>`).join('')}</div>
    <div class="chips" style="flex-wrap:wrap;margin-top:6px">${DOCC.map(([k, n]) => `<button class="chip ${dOcc === k ? 'on' : ''}" data-do="${k}">${n}</button>`).join('')}</div>
    <div class="muted small" style="margin:10px 4px">${list.length} ${list.length === 1 ? 'десерт' : 'десерта'}</div>
    <div class="menu-grid">${list.map(r => `<div class="tile" data-recipe="${r.id}"><div class="row between"><div class="emo">${({ healthy: '💚', unique: '✨', classic: '⭐' })[r.dk] || '🍮'}</div><span class="small">${(r.occ || []).map(o => ({ birthday: '🎂', holiday: '🎄', winter: '❄️', summer: '☀️' })[o]).join('')}</span></div><div class="t">${esc(r.name)}</div><div class="muted small">⏱ ${r.time} мин${recipeTags(r).vegan ? ' · 🌱' : ''}</div></div>`).join('') || '<div class="muted small">Няма десерти с тези филтри.</div>'}</div>`;
  el.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { dKind = b.dataset.dk; renderDesserts(el); });
  el.querySelectorAll('[data-do]').forEach(b => b.onclick = () => { dOcc = b.dataset.do; renderDesserts(el); });
  el.querySelectorAll('[data-recipe]').forEach(t => t.onclick = () => showRecipe(t.dataset.recipe));
}
/* десерт за уникенда — известие в събота 15:30 */
function weekendDessert(date) {
  const s = (date.getMonth() >= 10 || date.getMonth() <= 2) ? 'winter' : (date.getMonth() >= 5 && date.getMonth() <= 8) ? 'summer' : '';
  let pool = dessertsAll().filter(r => r.dk && prefRecipeOk(r, false)); if (!pool.length) return null;
  const sea = pool.filter(r => !s || (r.occ || []).includes(s) || r.dk === 'healthy'); if (sea.length >= 4) pool = sea;
  pool = permOf(pool, 'des' + date.getFullYear());
  return pool[Math.floor(dayOfYear(date) / 7) % pool.length];
}
async function scheduleDesserts() {
  const ln = typeof LN === 'function' && LN(); if (!ln) return;
  try {
    await ln.cancel({ notifications: [0, 1, 2, 3].map(i => ({ id: 1400 + i })) }).catch(() => {});
    if (S.settings.dessertNotif === false) return;
    if ((await ln.checkPermissions()).display !== 'granted') return;
    const list = [], now = new Date();
    for (let w = 0; w < 4; w++) {
      const at = new Date(now); at.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7) + w * 7); at.setHours(15, 30, 0, 0);
      if (at <= now) continue;
      const r = weekendDessert(at); if (!r) continue;
      list.push({ id: 1400 + w, channelId: 'meals', title: '🍰 Сладко за уикенда', body: `${r.name} · ${r.time} мин. ${r.note || ''} Натисни за рецептата 👉`.trim(), schedule: { at, allowWhileIdle: true }, extra: { recipeId: r.id }, smallIcon: 'ic_stat_mama', iconColor: '#DB2777' });
    }
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) {}
}
(function () {
  TITLES.desserts = ['Сладкарница', 'Десерти за всеки повод'];
  const bRender = render;
  render = function () { if (current === 'desserts') { renderDesserts($('#s-desserts')); return; } bRender(); };
  const bR = renderRecipes;
  renderRecipes = function (el) {
    bR(el);
    const n = dessertsAll().length, s = dSeason();
    const html = `<div class="card des-hero" id="desCard" style="cursor:pointer"><div class="row" style="gap:12px;align-items:center"><div class="th-e">🍰</div><div class="grow"><b style="font-size:17px">Сладкарница · ${n} десерта</b><div class="small" style="opacity:.92">Здравословни, уникални, известни и домашни${s === 'winter' ? ' · ❄️ зимни' : s === 'summer' ? ' · ☀️ летни' : ''}</div></div><span style="font-size:22px">›</span></div></div>`;
    const book = el.querySelector('.book-card'); book ? book.insertAdjacentHTML('afterend', html) : el.insertAdjacentHTML('afterbegin', html);
    el.querySelector('#desCard').onclick = () => { dOcc = s; go('desserts'); };
  };
  const bSet = renderSettings;
  renderSettings = function (el) {
    bSet(el);
    setTimeout(() => {
      const card = [...el.querySelectorAll('.card h2')].find(h => /Подсещания за храна/.test(h.textContent)); if (!card || el.querySelector('#desN')) return;
      const c = card.closest('.card'), anchor = c.querySelector('#nStat');
      const html = `<label class="row between" style="padding:8px 0;align-items:center"><span>🍰 Сладко за уикенда · събота 15:30</span><input type="checkbox" id="desN" ${S.settings.dessertNotif !== false ? 'checked' : ''} style="width:24px;height:24px;accent-color:#0e7a5c"></label>`;
      anchor ? anchor.insertAdjacentHTML('beforebegin', html) : c.insertAdjacentHTML('beforeend', html);
      el.querySelector('#desN').onchange = e => { S.settings.dessertNotif = e.target.checked; save(); scheduleDesserts(); toast(e.target.checked ? 'Включено' : 'Изключено'); };
    }, 0);
  };
})();
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(scheduleDesserts, 6000);
  const ln = typeof LN === 'function' && LN();
  if (ln) ln.addListener('localNotificationActionPerformed', a => { const x = (a && a.notification && a.notification.extra) || {}; if (x.recipeId) setTimeout(() => { go('desserts'); showRecipe(x.recipeId); }, 900); });
});
