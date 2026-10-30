/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   „Моята книга с рецепти“ — запазени любими рецепти, закуските в директорията и собствени рецепти. */
const QTY_RX = /^([\d½¼¾⅓]+(?:[.,\-–]\d+)?\s*(?:г|кг|мл|л|ч\.л\.|с\.л\.|ч\.ч\.|бр\.?|шепа|шепи|филия|филии|скилидка|скилидки|парче|чаша|глава|глави|връзка)?)\s+(.+)$/i;
function splitIng(line) {
  const t = String(line).trim(), m = QTY_RX.exec(t);
  const name = m ? m[2] : t;
  return [name.charAt(0).toUpperCase() + name.slice(1), m ? m[1] : '', 0];
}
function BOOK() { if (!S.book) S.book = { saved: [], own: [] }; return S.book; }
const isSaved = id => BOOK().saved.includes(id);
function toggleSave(id) {
  const b = BOOK(); if (isSaved(id)) b.saved = b.saved.filter(x => x !== id); else b.saved.unshift(id);
  save(); toast(isSaved(id) ? '❤️ Запазено в „Моята книга“' : 'Премахнато от книгата'); return isSaved(id);
}

/* закуските — и в директорията */
RECIPE_GROUPS.unshift({ id: 'breakfast', name: 'Закуски', icon: '🍳' });
const BF_TAGS = { vegan: { vegan: true, veg: true, pesc: true }, veg: { veg: true, pesc: true }, pesc: { pesc: true }, all: {} };
BREAKFASTS.forEach((b, i) => RECIPES.push({ id: 'bf_' + i, name: b.name || b.n, group: 'breakfast', time: b.min, serv: 1, season: 'all', ing: b.ing.map(splitIng), steps: b.st, _tags: Object.assign({ pork: false }, BF_TAGS[b.d] || {}), note: b.why }));
function ownToRecipe(o) { return { id: o.id, name: o.name, group: o.group, time: o.time || 30, serv: o.serv || 2, season: 'all', ing: o.ing, steps: o.steps, own: true }; }
BOOK().own.forEach(o => RECIPES.push(ownToRecipe(o)));

/* сърце в прозореца на рецептата */
(function () {
  const bShow = showRecipe;
  showRecipe = function (id) {
    bShow(id);
    const body = $('#sheetBody'); if (!body || body.querySelector('.book-heart')) return;
    const r = RECIPES.find(x => x.id === id); if (!r) return;
    body.insertAdjacentHTML('afterbegin', `<button class="book-heart ${isSaved(id) ? 'on' : ''}" aria-label="Запази в книгата">${isSaved(id) ? '❤️' : '🤍'}</button>`);
    const h = body.querySelector('.book-heart');
    h.onclick = () => { const on = toggleSave(id); h.classList.toggle('on', on); h.textContent = on ? '❤️' : '🤍'; if (current === 'recipes') renderRecipes($('#s-recipes')); };
    if (r.note) { const st = body.querySelector('ol, .steps'); if (st) st.insertAdjacentHTML('afterend', `<div class="bf-why" style="color:#0e7a5c;margin-top:8px">💚 ${esc(r.note)}</div>`); }
    if (r.own) body.insertAdjacentHTML('beforeend', `<button class="btn tonal block" id="ownDel" style="margin-top:12px">🗑️ Изтрий моята рецепта</button>`), body.querySelector('#ownDel').onclick = () => {
      if (!confirm('Да изтрия ли рецептата?')) return; BOOK().own = BOOK().own.filter(o => o.id !== id); BOOK().saved = BOOK().saved.filter(x => x !== id);
      const k = RECIPES.findIndex(x => x.id === id); if (k >= 0) RECIPES.splice(k, 1); save(); closeSheet(); render();
    };
  };
})();

/* „Моята книга“ най-отгоре в Меню */
function ownRecipeSheet() {
  openSheet(`<h3>✍️ Моя рецепта</h3>
    <input class="input" id="orN" placeholder="Име (напр. Баница на баба)" maxlength="60">
    <div class="chips" style="flex-wrap:wrap;margin:10px 0">${RECIPE_GROUPS.map((g, i) => `<button class="chip ${i === 0 ? 'on' : ''}" data-og="${g.id}">${g.icon} ${esc(g.name)}</button>`).join('')}</div>
    <div class="row" style="gap:8px"><input class="input" id="orT" type="number" inputmode="numeric" placeholder="Минути" style="max-width:110px"><input class="input" id="orS" type="number" inputmode="numeric" placeholder="Порции" style="max-width:110px"></div>
    <div class="small muted" style="margin-top:10px">Продукти — по един на ред (напр. „500 г брашно“):</div>
    <textarea class="input" id="orI" rows="5" placeholder="500 г брашно&#10;3 яйца&#10;400 г сирене"></textarea>
    <div class="small muted" style="margin-top:10px">Как се приготвя — всяка стъпка на нов ред:</div>
    <textarea class="input" id="orP" rows="5" placeholder="Разбий яйцата…&#10;Добави сиренето…"></textarea>
    <button class="btn primary block" id="orOk" style="margin-top:12px">📖 Запази в книгата</button>`, el => {
    let grp = RECIPE_GROUPS[0].id;
    el.querySelectorAll('[data-og]').forEach(b => b.onclick = () => { grp = b.dataset.og; el.querySelectorAll('[data-og]').forEach(x => x.classList.toggle('on', x === b)); });
    el.querySelector('#orOk').onclick = () => {
      const name = el.querySelector('#orN').value.trim(); const ing = el.querySelector('#orI').value.split('\n').map(x => x.trim()).filter(Boolean);
      if (!name || !ing.length) return toast('Напиши име и поне един продукт');
      const o = { id: 'own_' + uid(), name: name.slice(0, 60), group: grp, time: +el.querySelector('#orT').value || 30, serv: +el.querySelector('#orS').value || 2, ing: ing.slice(0, 40).map(splitIng), steps: el.querySelector('#orP').value.split('\n').map(x => x.trim()).filter(Boolean).slice(0, 30) };
      BOOK().own.unshift(o); BOOK().saved.unshift(o.id); RECIPES.push(ownToRecipe(o)); save(); closeSheet(); toast('📖 Рецептата е в книгата ти'); render();
    };
  });
}
(function () {
  const bR = renderRecipes;
  renderRecipes = function (el) {
    bR(el);
    const saved = BOOK().saved.map(id => RECIPES.find(r => r.id === id)).filter(Boolean);
    el.insertAdjacentHTML('afterbegin', `<div class="card book-card"><h2>📖 Моята книга с рецепти <span class="book-n">${saved.length}</span></h2>
      ${saved.length ? `<div class="menu-grid">${saved.slice(0, 40).map(recipeTile).join('')}</div>` : `<div class="book-empty">Натисни 🤍 на рецепта, за да я запазиш тук — от менюто, закуската, обяда или вечерята. Можеш да добавиш и твои рецепти.</div>`}
      <button class="btn tonal block" id="ownAdd" style="margin-top:10px">✍️ Добави своя рецепта</button></div>`);
    el.querySelector('#ownAdd').onclick = ownRecipeSheet;
    el.querySelectorAll('.book-card [data-recipe]').forEach(t => t.onclick = () => showRecipe(t.dataset.recipe));
  };
})();
