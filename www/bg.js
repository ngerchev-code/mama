/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Фон на приложението: нов фон „Утро“ по подразбиране + избор в Настройки. */
(function () {
  const BGS = [['morning', 'Утро', 'linear-gradient(135deg,#bdeedd,#d5e9fb,#ffe0c4)'], ['sea', 'Море', 'linear-gradient(135deg,#bfe9fb,#c9f3ea)'], ['sunset', 'Залез', 'linear-gradient(135deg,#ffd3b0,#ffd1de,#fff1b3)'],
    ['lavender', 'Лавандула', 'linear-gradient(135deg,#ddd3ff,#d9f5e8)'], ['clean', 'Чисто', '#f1f4f3'], ['classic', 'Класически', 'linear-gradient(135deg,#d9f6c8,#c9f3e2,#ffe2d2)']];
  const apply = () => { const v = (S.settings && S.settings.bg) || 'morning'; if (v === 'classic') document.body.removeAttribute('data-bg'); else document.body.setAttribute('data-bg', v); };
  apply();
  const bS = renderSettings;
  renderSettings = function (el) {
    bS.apply(this, arguments);
    if (el.querySelector('#bgPick')) return;
    const cur = (S.settings && S.settings.bg) || 'morning';
    const html = `<div class="card" id="bgCard"><h2>🎨 Фон на приложението</h2><div class="bg-pick" id="bgPick">${BGS.map(([k, n, g]) => `<button data-bg="${k}" class="${k === cur ? 'on' : ''}" style="background:${g}">${n}</button>`).join('')}</div></div>`;
    const first = el.querySelector('.card'); first ? first.insertAdjacentHTML('afterend', html) : el.insertAdjacentHTML('afterbegin', html);
    el.querySelectorAll('#bgPick [data-bg]').forEach(b => b.onclick = () => { S.settings.bg = b.dataset.bg; save(); apply(); el.querySelectorAll('#bgPick button').forEach(x => x.classList.toggle('on', x === b)); toast('Фонът е сменен'); });
  };
})();
