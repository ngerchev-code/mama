/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Удобство: автоматичните прозорци не се трупат един върху друг; „Назад“ затваря първо отворения прозорец. */
(function () {
  let lastTap = 0, autoCount = 0, lastClose = 0, timer = null;
  const Q = [], MAX_AUTO = 3, GAP = 20000;
  document.addEventListener('pointerdown', () => { lastTap = Date.now(); }, true);
  const base = popup, baseClose = closePopup;
  const busy = () => popOpen || document.querySelector('.sheet.open, #ow, #call, .onb, .tour');
  closePopup = function (instant) { const was = popOpen; baseClose.apply(this, arguments); if (was) { lastClose = Date.now(); pump(); } };
  popup = function (opts) {
    const user = Date.now() - lastTap < 2000;
    const vital = /обновление|какво ново|аларми и напомняния|подсещам ли/i.test(`${opts.title || ''} ${opts.kicker || ''}`);
    if (user || vital) return base(opts);
    if (busy() || Date.now() - lastClose < GAP) { if (Q.length < 4) Q.push(opts); pump(); return; }
    if (autoCount >= MAX_AUTO) return;
    autoCount++; return base(opts);
  };
  function pump() {
    clearTimeout(timer); if (!Q.length) return;
    timer = setTimeout(() => {
      if (busy()) return pump();
      if (autoCount >= MAX_AUTO) { Q.length = 0; return; }
      autoCount++; base(Q.shift());
    }, Math.max(1500, GAP - (Date.now() - lastClose)));
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) autoCount = 0; });

  const bBack = back;
  back = function () {
    if (document.getElementById('call')) return;
    const ow = document.getElementById('ow'); if (ow) { ow.remove(); popOpen = false; return; }
    if (popOpen) return closePopup();
    return bBack.apply(this, arguments);
  };
  const bb = document.getElementById('backBtn'); if (bb) bb.onclick = () => back();
})();
