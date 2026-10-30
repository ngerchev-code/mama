/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   „Салатен бар“ — салати по вид (леки, засищащи, известни, домашни, уникални) и повод. */
const SK = [['all', '🥗', 'Всички'], ['light', '🌿', 'Леки'], ['protein', '💪', 'Засищащи'], ['classic', '⭐', 'Известни'], ['home', '🏡', 'Домашни'], ['unique', '✨', 'Уникални']];
const SOCC = [['', 'Всеки повод'], ['holiday', '🎄 Празници'], ['summer', '☀️ Лято'], ['winter', '❄️ Зима'], ['lunchbox', '🍱 За работа'], ['grill', '🔥 Към скара']];
let sKind = 'all', sOcc = '';
function saladKind(r) { return r.sk || ((r.c || 'bg') === 'bg' ? 'home' : 'classic'); }
function saladOcc(r) {
  if (r.occ) return r.occ;
  const o = []; if (Array.isArray(r.season) && r.season.some(m => m >= 6 && m <= 8)) o.push('summer');
  if (/зеле|цвекло|кисело зеле|чушки/i.test(r.name)) o.push('winter');
  return o;
}
function saladsAll() { return RECIPES.filter(r => r.group === 'salad' && !/хумус|гуакамоле|задушено/i.test(r.name)); }
function renderSalads(el) {
  const list = saladsAll().filter(r => (sKind === 'all' || saladKind(r) === sKind) && (!sOcc || saladOcc(r).includes(sOcc)));
  const tip = { light: 'Малко калории, много свежест.', protein: 'С боб, нахут, яйца, риба или пиле — цял обяд в купа.', classic: 'Салатите, познати по целия свят.', home: 'Българската трапеза, както у дома.', unique: 'Необичайни комбинации, с които да изненадаш.' }[sKind] || 'Над 50 салати — избери вид и повод.';
  const E = { light: '🌿', protein: '💪', classic: '⭐', home: '🏡', unique: '✨' };
  el.innerHTML = `<div class="card sal-hero"><div class="row" style="gap:12px;align-items:center"><div class="th-e">🥗</div><div class="grow"><b style="font-size:19px">Салатен бар</b><div class="small" style="opacity:.92">${esc(tip)}</div></div></div></div>
    <div class="chips" style="flex-wrap:wrap">${SK.map(([k, e, n]) => `<button class="chip ${sKind === k ? 'on' : ''}" data-sk="${k}">${e} ${n}</button>`).join('')}</div>
    <div class="chips" style="flex-wrap:wrap;margin-top:6px">${SOCC.map(([k, n]) => `<button class="chip ${sOcc === k ? 'on' : ''}" data-so="${k}">${n}</button>`).join('')}</div>
    <div class="muted small" style="margin:10px 4px">${list.length} ${list.length === 1 ? 'салата' : 'салати'}</div>
    <div class="menu-grid">${list.map(r => `<div class="tile" data-recipe="${r.id}"><div class="row between"><div class="emo">${E[saladKind(r)] || '🥗'}</div><span class="small">${saladOcc(r).map(o => ({ holiday: '🎄', summer: '☀️', winter: '❄️', lunchbox: '🍱', grill: '🔥' })[o]).join('')}</span></div><div class="t">${esc(r.name)}</div><div class="muted small">⏱ ${r.time} мин${recipeTags(r).vegan ? ' · 🌱' : recipeTags(r).veg ? ' · 🥚' : ''}</div></div>`).join('') || '<div class="muted small">Няма салати с тези филтри.</div>'}</div>`;
  el.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { sKind = b.dataset.sk; renderSalads(el); });
  el.querySelectorAll('[data-so]').forEach(b => b.onclick = () => { sOcc = b.dataset.so; renderSalads(el); });
  el.querySelectorAll('[data-recipe]').forEach(t => t.onclick = () => showRecipe(t.dataset.recipe));
}
(function () {
  TITLES.salads = ['Салатен бар', 'Салати за всеки повод'];
  const bRender = render;
  render = function () { if (current === 'salads') { renderSalads($('#s-salads')); return; } bRender(); };
  const bR = renderRecipes;
  renderRecipes = function (el) {
    bR(el);
    const n = saladsAll().length, s = dSeason();
    const html = `<div class="card sal-hero" id="salCard" style="cursor:pointer"><div class="row" style="gap:12px;align-items:center"><div class="th-e">🥗</div><div class="grow"><b style="font-size:17px">Салатен бар · ${n} салати</b><div class="small" style="opacity:.92">Леки, засищащи, известни, домашни и уникални</div></div><span style="font-size:22px">›</span></div></div>`;
    const des = el.querySelector('#desCard'); des ? des.insertAdjacentHTML('afterend', html) : el.insertAdjacentHTML('afterbegin', html);
    el.querySelector('#salCard').onclick = () => { sOcc = s; go('salads'); };
  };
})();
