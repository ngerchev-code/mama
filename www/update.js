/* © 2026 Николай Герчев — MAMA. Всички права запазени. */
try { const u = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater; if (u) u.notifyAppReady(); } catch (e) {}
/* MAMA — проверка за нова версия и „Какво ново“. */
'use strict';
const UPD_URL = 'https://raw.githubusercontent.com/ngerchev-code/mama/main/docs/changelog.json';
const APK_URL = 'https://github.com/ngerchev-code/mama/releases/latest/download/MAMA.apk';
let BUILD = 0; // номерът на тази версия (записва се при компилирането в build.json)

async function myBuild() {
  try { const r = await fetch('build.json', { cache: 'no-store' }); if (r.ok) BUILD = (await r.json()).code || 0; } catch (e) { BUILD = 0; }
  return BUILD;
}
let REL = null; // { code, web, minNative }
async function latestRelease() {
  try {
    const r = await fetch('https://api.github.com/repos/ngerchev-code/mama/releases/latest', { cache: 'no-store' });
    if (!r.ok) return 0;
    const d = await r.json(); const m = /(\d+)$/.exec(d.tag_name || '');
    if (!m || !(d.assets || []).some(a => a.name === 'MAMA.apk')) return 0;
    const web = (d.assets || []).find(a => a.name === 'web.zip');
    const mn = /minNative:\s*(\d+)/.exec(d.body || '');
    REL = { code: +m[1], web: web ? web.browser_download_url : null, minNative: mn ? +mn[1] : +m[1] };
    return +m[1];
  } catch (e) { return 0; }
}
function UPD() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.CapacitorUpdater; }
async function nativeBuild() { try { const i = await window.Capacitor.Plugins.App.getInfo(); return +i.build || 0; } catch (e) { return 0; } }
/* Обновление „по въздуха“: изтегля новия код и го прилага при следващото отваряне — без нова инсталация */
async function liveUpdate(me) {
  const up = UPD(); if (!up || !REL || !REL.web || REL.code <= me) return false;
  const nat = await nativeBuild();
  if (REL.minNative > nat) return false; // нужна е нова версия на самото приложение
  if (S.guide.liveReady === REL.code) return true;
  try {
    const b = await up.download({ url: REL.web, version: String(REL.code) });
    await up.next({ id: b.id });
    S.guide.liveReady = REL.code; save();
    toast('⬇️ Обновлението е изтеглено — ще се приложи при следващото отваряне');
    return true;
  } catch (e) { return false; }
}
async function changelog() {
  try { const r = await fetch(UPD_URL + '?t=' + Math.floor(Date.now() / 600000), { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) { /* без интернет */ }
  return null;
}
function newsList(cl, from, to) {
  return cl.versions.filter(v => v.code > from && v.code <= to).sort((a, b) => b.code - a.code);
}
function newsHTML(vs) {
  return vs.slice(0, 3).map(v => `<b>${esc(v.title)}</b><br>${v.items.map(i => '• ' + esc(i)).join('<br>')}`).join('<br><br>');
}
async function checkUpdates(manual) {
  P();
  const native = NATIVE;
  const cl = await changelog();
  if (!cl) { if (manual) toast('Няма връзка — опитай по-късно'); return; }
  if (native) {
    const me = BUILD || await myBuild();
    const seen = S.guide.seenBuild || 0;
    // 1) Току-що обновено → „Какво ново“
    if (me && seen && me > seen) {
      const vs = newsList(cl, seen, me);
      S.guide.seenBuild = me; save();
      if (vs.length) return popup({ theme: 'green', emoji: '🎉', kicker: `Версия 1.0.${me}`, title: 'Какво ново в MAMA', text: newsHTML(vs), actions: [{ label: 'Супер!', primary: true, fn: null }] });
    }
    if (me && !seen) { S.guide.seenBuild = me; save(); }
    // 2) Има по-нова версия (готов APK в Releases) → предложение за обновяване
    const rel = await latestRelease();
    if (me && rel > me && await liveUpdate(me)) { if (manual) toast('Новата версия ще се зареди при следващото отваряне'); return; }
    if (me && rel > me && REL && REL.minNative > await nativeBuild()) {
      cl.latest = rel;
      if (!manual && daysSince(S.guide.last.upd) < 1) return;
      const vs = newsList(cl, me, cl.latest);
      return popup({ theme: 'sun', emoji: '🚀', key: 'upd', kicker: `Нова версия 1.0.${cl.latest}`, title: 'Има обновление на MAMA',
        text: (vs.length ? newsHTML(vs) + '<br><br>' : '') + 'Данните ти (списък, покупки, профил) остават.',
        actions: [{ label: '⬇️ Обнови сега', primary: true, fn: () => { openExt(cl.apk || APK_URL); setTimeout(() => toast('Отвори свалния файл MAMA.apk → Инсталирай'), 800); } }, { label: 'По-късно', fn: null }] });
    }
    if (manual) toast(`Имаш най-новата версия (1.0.${me || '?'})`);
  } else {
    // Уеб (iPhone / компютър) — обновява се сама; показваме само „Какво ново“
    const seen = S.guide.seenWeb || 0;
    if (!seen) { S.guide.seenWeb = cl.latest; save(); if (manual) toast('Уеб версията винаги е най-новата'); return; }
    if (cl.latest > seen) {
      const vs = newsList(cl, seen, cl.latest);
      S.guide.seenWeb = cl.latest; save();
      if (vs.length) return popup({ theme: 'green', emoji: '🎉', kicker: 'MAMA е обновена', title: 'Какво ново', text: newsHTML(vs), actions: [{ label: 'Супер!', primary: true, fn: null }] });
    }
    if (manual) toast('Уеб версията винаги е най-новата');
  }
}

/* Ръчна проверка от Настройки */
(function () {
  const base = renderSettings;
  renderSettings = function (el) {
    base(el);
    el.insertAdjacentHTML('afterbegin', `<div class="card"><h2>🚀 Версия</h2><div class="row"><div class="grow">MAMA ${NATIVE ? '1.0.' + (BUILD || '…') : 'уеб'}<div class="muted small">${NATIVE ? 'Проверява сама за нова версия при всяко отваряне' : 'Уеб версията се обновява автоматично'}</div></div><button class="btn tonal small" id="updBtn">Провери</button></div></div>`);
    el.querySelector('#updBtn').onclick = () => checkUpdates(true);
  };
})();

document.addEventListener('DOMContentLoaded', () => {
  myBuild();
  // след първоначалния избор и гида; „Какво ново“ / обновление имат предимство пред другите подсещания
  let n = 0; const t = setInterval(() => {
    n++;
    if (n > 40) return clearInterval(t);
    if (!P().onboarded || document.querySelector('.onb, .tour') || popOpen) return;
    clearInterval(t);
    setTimeout(() => { if (!popOpen) checkUpdates(false); }, 600);
  }, 500);
});
