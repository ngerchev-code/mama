/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Анонимна статистика: само броячи (инсталации, активни за деня/месеца, версия, платформа).
   Не се изпращат имена, списъци, здравни данни, местоположение или идентификатор на устройството. */
const STATS_NS = 'mama-ngerchev';
function statsPlat() {
  if (NATIVE) return 'android';
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const sa = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  return ios ? (sa ? 'ios' : 'ios-web') : (sa ? 'pwa' : 'web');
}
function statsHit(key) {
  try { fetch(`https://abacus.jasoncameron.dev/hit/${STATS_NS}/${key}`, { mode: 'cors', cache: 'no-store', keepalive: true }).catch(() => {}); } catch (e) {}
}
function statsPing() {
  if (!S.settings || S.settings.noStats) return;
  if (!/^https?:|^capacitor:/.test(location.protocol) || /localhost|127\.0\.0\.1/.test(location.hostname) && !NATIVE) return;
  const st = S.stats || (S.stats = {});
  const d = new Date(), pad = n => String(n).padStart(2, '0');
  const day = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`, mon = day.slice(0, 6);
  const plat = statsPlat();
  const hits = [];
  if (!st.installed) { hits.push('installs', 'installs-' + plat); st.installed = day; }
  if (st.day !== day) { hits.push('d-' + day, 'd-' + plat + '-' + day); st.day = day; }
  if (st.mon !== mon) { hits.push('m-' + mon); st.mon = mon; }
  if (BUILD && st.ver !== BUILD) { hits.push('v-' + BUILD); st.ver = BUILD; }
  hits.push('o-' + day);
  save();
  hits.forEach((k, i) => setTimeout(() => statsHit(k), i * 250));
}
document.addEventListener('DOMContentLoaded', () => setTimeout(statsPing, 4000));
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
  try { window.Capacitor.Plugins.App.addListener('resume', () => setTimeout(statsPing, 1500)); } catch (e) {}
}

/* Настройки: изключване на статистиката */
(function () {
  const base = renderSettings;
  renderSettings = function (el) {
    base(el);
    const on = !S.settings.noStats;
    el.insertAdjacentHTML('beforeend', `<div class="card"><h2>📊 Анонимна статистика</h2><div class="row"><div class="grow">Помагай с броене на потребителите<div class="muted small">Изпраща се само „+1“ за инсталация и активен ден. Без лични данни, списъци или здравна информация.</div></div><input type="checkbox" id="statsSw" style="width:26px;height:26px;accent-color:#0e7a5c" ${on ? 'checked' : ''}></div></div>`);
    el.querySelector('#statsSw').onchange = e => { S.settings.noStats = !e.target.checked; save(); toast(e.target.checked ? 'Статистиката е включена' : 'Статистиката е изключена'); };
  };
})();
