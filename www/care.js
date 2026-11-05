/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Поддръжка: дневник на грешките (само на телефона + анонимен брояч), архив във файл, поверителност. */
(function () {
  const PRIVACY_URL = 'https://ngerchev-code.github.io/mama/privacy.html';
  const appVer = () => { try { return (typeof BUILD !== 'undefined' && BUILD) || ''; } catch (e) { return ''; } };

  /* ─── грешки ─── */
  let sentThisRun = 0;
  function logErr(msg, src, line) {
    try {
      msg = String(msg || 'грешка').slice(0, 300);
      if (/ResizeObserver|Script error\.?$|cancel/i.test(msg)) return; // шум от браузъра / отказ от потребителя
      S.errlog = (S.errlog || []).filter(e => e.m !== msg).slice(-29);
      S.errlog.push({ t: Date.now(), m: msg, s: String(src || '').split('/').pop().slice(0, 60), l: line || 0, v: appVer() });
      save();
      if (sentThisRun < 3 && typeof statsHit === 'function' && !(S.settings && S.settings.noStats)) { sentThisRun++; statsHit('err'); }
    } catch (e) {}
  }
  window.addEventListener('error', e => logErr(e.message, e.filename, e.lineno));
  window.addEventListener('unhandledrejection', e => logErr((e.reason && (e.reason.message || e.reason)) || 'обещание без обработка', 'promise', 0));

  function errReport() {
    const log = S.errlog || [];
    return `MAMA отчет · ${new Date().toLocaleString('bg-BG')} · версия ${appVer() || '?'} · ${navigator.userAgent.replace(/\(.*?\)/, '').slice(0, 80)}\n` +
      (log.length ? log.slice(-15).map(e => `${new Date(e.t).toLocaleString('bg-BG')} | ${e.m} | ${e.s}:${e.l} | v${e.v}`).join('\n') : 'Няма записани грешки.');
  }
  function errSheet() {
    const log = (S.errlog || []).slice().reverse();
    openSheet(`<h3>🛠️ Грешки и поддръжка</h3>
      <div class="muted small" style="margin-bottom:10px">Записват се само на телефона. В отчета няма лични данни — само текстът на грешката и версията.</div>
      ${log.length ? `<ul class="list">${log.slice(0, 15).map(e => `<li class="li"><div class="grow"><div class="title" style="font-size:14px">${esc(e.m)}</div><div class="muted small">${new Date(e.t).toLocaleString('bg-BG')} · ${esc(e.s)}:${e.l}</div></div></li>`).join('')}</ul>` : '<div class="notice good">✅ Няма записани грешки.</div>'}
      <div class="row" style="gap:8px;margin-top:12px"><button class="btn primary small" id="erShare">📨 Изпрати отчет</button>${log.length ? '<button class="btn tonal small" id="erClr">Изчисти</button>' : ''}</div>`, el => {
      el.querySelector('#erShare').onclick = () => shareText(errReport(), 'MAMA отчет за грешки');
      const c = el.querySelector('#erClr'); if (c) c.onclick = () => { S.errlog = []; save(); closeSheet(); toast('Изчистено'); };
    });
  }
  async function shareText(text, title) {
    const SH = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share;
    try { if (SH) return await SH.share({ title, text, dialogTitle: title }); if (navigator.share) return await navigator.share({ title, text }); } catch (e) { return; }
    try { await navigator.clipboard.writeText(text); toast('Копирано'); } catch (e) {}
  }

  /* ─── архив във файл ─── */
  const SKIP = ['cache'];
  async function backupSave() {
    const data = {}; Object.keys(S).forEach(k => { if (!SKIP.includes(k)) data[k] = S[k]; });
    const json = JSON.stringify({ app: 'MAMA', v: 1, at: new Date().toISOString(), data });
    const fname = `MAMA-архив-${todayISO()}.json`;
    const FS = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Filesystem;
    const SH = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share;
    if (NATIVE && FS && SH) {
      try {
        const r = await FS.writeFile({ path: fname, data: json, directory: 'CACHE', encoding: 'utf8' });
        await SH.share({ title: 'MAMA архив', text: 'Архив на MAMA — запази го в Google Drive, имейл или файловете на телефона', url: r.uri, dialogTitle: 'Къде да запазя архива?' });
        S.guide.lastBackup = Date.now(); save();
      } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Неуспешно запазване'); }
      return;
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000); S.guide.lastBackup = Date.now(); save();
  }
  function backupLoad() {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json,text/plain';
    inp.onchange = async () => {
      const f = inp.files && inp.files[0]; if (!f) return;
      try {
        const o = JSON.parse(await f.text()); const d = o && o.app === 'MAMA' ? o.data : o;
        if (!d || typeof d !== 'object' || !d.prefs) throw new Error('bad');
        popup({ theme: 'linear-gradient(140deg,#0b6b50,#1e3a8a)', emoji: '📂', kicker: 'Архив', title: 'Да възстановя ли данните?',
          text: `Архив от ${o.at ? new Date(o.at).toLocaleString('bg-BG') : 'неизвестна дата'}. Текущите списък, рецепти и настройки ще бъдат заменени.`,
          actions: [{ label: 'Възстанови', primary: true, fn: () => { Object.keys(d).forEach(k => { if (!SKIP.includes(k)) S[k] = d[k]; }); save(); toast('Възстановено'); setTimeout(() => location.reload(), 600); } }, { label: 'Отказ', fn: null }] });
      } catch (e) { toast('Това не е архив на MAMA'); }
    };
    inp.click();
  }

  /* ─── настройки ─── */
  const bS = renderSettings;
  renderSettings = function (el) {
    bS.apply(this, arguments);
    try {
      const card = [...el.querySelectorAll('.card')].find(c => /Резервно копие/.test(c.textContent));
      const last = S.guide && S.guide.lastBackup;
      const html = `<div class="card" id="careBk"><h2>💾 Архив на данните</h2><div class="muted small">Списък, книга с рецепти, менюта, My Doctor и настройки — в един файл. Запази го в Google Drive или имейл, за да не ги загубиш при смяна на телефона.${last ? `<br>Последен архив: ${new Date(last).toLocaleDateString('bg-BG')}` : ''}</div>
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn primary small" id="bkSave">💾 Запази във файл</button><button class="btn tonal small" id="bkLoad">📂 Зареди от файл</button><button class="btn tonal small" id="bkRst" style="color:var(--bad)">Изтрий всичко</button></div></div>
        <div class="card"><h2>🔒 Поверителност и поддръжка</h2><div class="muted small">Здравните данни и списъците остават само на телефона. MAMA не продава и не споделя данни.</div>
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn tonal small" id="pvOpen">Политика за поверителност</button><button class="btn tonal small" id="erOpen">🛠️ Грешки${(S.errlog || []).length ? ` (${S.errlog.length})` : ''}</button></div></div>`;
      if (card) { const rst = card.querySelector('#rst'); card.insertAdjacentHTML('afterend', html); card.remove(); }
      else el.insertAdjacentHTML('beforeend', html);
      el.querySelector('#bkSave').onclick = backupSave;
      el.querySelector('#bkLoad').onclick = backupLoad;
      el.querySelector('#bkRst').onclick = () => popup({ theme: 'linear-gradient(140deg,#7f1d1d,#be123c)', emoji: '🗑️', kicker: 'Внимание', title: 'Да изтрия ли всички данни?', text: 'Списък, рецепти, менюта, My Doctor и настройки ще изчезнат. Направи архив преди това.',
        actions: [{ label: 'Изтрий', primary: true, fn: () => { localStorage.removeItem(KEY); location.reload(); } }, { label: '💾 Първо архив', fn: () => setTimeout(backupSave, 300) }, { label: 'Отказ', fn: null }] });
      el.querySelector('#pvOpen').onclick = () => openExt(PRIVACY_URL);
      el.querySelector('#erOpen').onclick = errSheet;
      // авторските права и версията — най-долу, с истинския номер на версията
      const cp = [...el.querySelectorAll('.muted.small')].find(x => /Всички права запазени/.test(x.textContent));
      if (cp) { const v = appVer(); if (v) cp.innerHTML = cp.innerHTML.replace(/версия 1\.0\b/, 'версия 1.0.' + v); el.appendChild(cp); }
    } catch (e) { logErr(e.message, 'care.js', 0); }
  };

  /* напомняне за архив веднъж месечно, ако има какво да се пази */
  function backupNudge() {
    try {
      if (!P().onboarded) return;
      const g = S.guide, has = (S.list || []).length + ((S.book && S.book.saved) || []).length + ((S.doctor && S.doctor.labs) || []).length;
      if (has < 5) return;
      const since = Date.now() - (g.lastBackup || g.firstRun || 0);
      if (!g.firstRun) { g.firstRun = Date.now(); save(); return; }
      if (since < 30 * 864e5 || (g.bkAsk && Date.now() - g.bkAsk < 14 * 864e5)) return;
      g.bkAsk = Date.now(); save();
      popup({ theme: 'linear-gradient(140deg,#0b6b50,#1e3a8a)', emoji: '💾', kicker: 'Грижа за данните', title: 'Да запазя ли архив?',
        text: 'Списъкът, рецептите и My Doctor са само на този телефон. Един файл в Google Drive ги пази, ако смениш или загубиш телефона.',
        actions: [{ label: '💾 Запази архив', primary: true, fn: () => setTimeout(backupSave, 300) }, { label: 'По-късно', fn: null }] });
    } catch (e) {}
  }
  document.addEventListener('DOMContentLoaded', () => setTimeout(backupNudge, 90000));
  window.errSheet = errSheet; window.backupSave = backupSave;
})();
