/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Навигация: странично меню (както във FIT) с търсене и всички раздели; скенер в средата на долната лента;
   „Снимай продукта“ — разпознава баркод или етикет и намира състава в интернет (Open Food Facts). */
(function () {
  /* ─── странично меню ─── */
  const run = (fn) => () => { closeDrawer(); setTimeout(fn, 180); };
  const to = (s) => run(() => go(s));
  const DRAWER = [
    ['Основни', [['🏠', 'Начало', to('home'), 'home'], ['🏷️', 'Цени', to('prices'), 'prices'], ['🛒', 'Списък за пазар', to('list'), 'list'], ['🍽️', 'Меню и рецепти', to('recipes'), 'recipes'], ['📷', 'Скенер на продукти', run(() => scanChooser()), 'scan']]],
    ['Здраве', [['🍽️', 'Дневник на храненето', to('diary'), 'diary'], ['🩺', 'My Doctor', to('doctor'), 'doctor'], ['🚶', 'Активност и крачки', to('activity'), 'activity'], ['⛔', 'Забранени храни', to('banned'), 'banned'], ['💪', 'FIT — тренировки', run(() => typeof openFit === 'function' && openFit()), '']]],
    ['Кухня', [['❤️', 'Моята книга с рецепти', to('recipes'), ''], ['🗓️', 'Тематична седмица', run(() => typeof themeSheet === 'function' && themeSheet()), ''], ['🍰', 'Сладкарница', to('desserts'), 'desserts'], ['🥗', 'Салатен бар', to('salads'), 'salads'], ['🌍', 'Свят — кухни', to('world'), 'world'], ['📅', 'Календар и празници', to('calendar'), 'calendar']]],
    ['Пазаруване', [['📍', 'Магазини и карта', to('stores'), 'stores'], ['🧺', 'Онлайн и eBag', to('online'), 'online'], ['📊', 'Статистика на разходите', to('stats'), 'stats'], ['📰', 'Новини', to('news'), 'news']]],
    ['Заедно', [['💬', 'На масата — чат', to('chat'), 'chat'], ['📨', 'Покани приятел (Viber)', run(shareApp), '']]],
    ['Приложение', [['⚙️', 'Настройки', to('settings'), 'settings'], ['💾', 'Архив на данните', run(() => typeof backupSave === 'function' ? (go('settings'), setTimeout(() => { const c = document.getElementById('careBk'); c && c.scrollIntoView({ behavior: 'smooth' }); }, 300)) : go('settings')), ''], ['🔄', 'Провери за обновление', run(() => { toast('Проверявам за обновление…'); typeof checkUpdates === 'function' && checkUpdates(true); }), ''], ['🔒', 'Поверителност', run(() => openExt('https://ngerchev-code.github.io/mama/privacy.html')), ''], ['▦', 'Всички раздели', to('more'), 'more']]],
  ];
  let dr = null;
  function openDrawer() {
    if (dr) return;
    const name = (P().name || '').trim().split(' ')[0];
    dr = document.createElement('div'); dr.className = 'drw'; dr.id = 'drw';
    dr.innerHTML = `<div class="drw-scrim"></div><nav class="drw-panel" aria-label="Меню">
      <div class="drw-head"><div class="drw-logo">${document.querySelector('.appbar .logo') ? document.querySelector('.appbar .logo').innerHTML : ''}</div><div><b>MAMA</b><div class="small">${name ? 'Здравей, ' + esc(name) + '!' : 'My Amazing Market Area'}</div></div></div>
      <button class="drw-search" id="drwSrch">${I.search}<span>Търси навсякъде…</span></button>
      ${DRAWER.map(([h, items], gi) => `<div class="drw-h">${h}</div>${items.map(([e, t, , s], i) => `<button class="drw-i ${s && s === current ? 'on' : ''}" data-g="${gi}" data-i="${i}"><span class="drw-e">${e}</span>${esc(t)}</button>`).join('')}`).join('')}
      <div class="drw-foot small">MAMA ${typeof BUILD !== 'undefined' && BUILD ? '1.0.' + BUILD : ''} · © 2026 Николай Герчев</div></nav>`;
    document.body.appendChild(dr); requestAnimationFrame(() => dr && dr.classList.add('in'));
    dr.querySelector('.drw-scrim').onclick = closeDrawer;
    dr.querySelector('#drwSrch').onclick = run(() => typeof openSearch === 'function' && openSearch());
    dr.querySelectorAll('.drw-i').forEach(b => b.onclick = () => DRAWER[+b.dataset.g][1][+b.dataset.i][2]());
  }
  function closeDrawer() { if (!dr) return; const d = dr; dr = null; d.classList.remove('in'); setTimeout(() => d.remove(), 220); }
  async function shareApp() {
    const txt = 'MAMA — цени във всички вериги, списък, меню и здраве на едно място. Безплатно: https://ngerchev-code.github.io/mama/';
    try { const SH = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share; if (SH) return await SH.share({ text: txt, dialogTitle: 'Покани приятел' }); if (navigator.share) return await navigator.share({ text: txt }); } catch (e) { return; }
    try { await navigator.clipboard.writeText(txt); toast('Копирано — постави го във Viber'); } catch (e) {}
  }
  // бутон ☰ в горната лента
  const bar = document.getElementById('appbar');
  if (bar && !document.getElementById('menuBtn')) {
    const b = document.createElement('button'); b.className = 'iconbtn'; b.id = 'menuBtn'; b.setAttribute('aria-label', 'Меню');
    b.innerHTML = '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>';
    b.onclick = openDrawer; bar.insertBefore(b, bar.firstChild);
  }
  // плъзгане от левия край отваря менюто
  let sx = null, sy = 0;
  document.addEventListener('touchstart', e => { const t = e.touches[0]; sx = t.clientX < 22 && !popOpen && !(typeof sheetOpen === 'function' && sheetOpen()) ? t.clientX : null; sy = t.clientY; }, { passive: true });
  document.addEventListener('touchmove', e => { if (sx == null) return; const t = e.touches[0]; if (t.clientX - sx > 60 && Math.abs(t.clientY - sy) < 50) { sx = null; openDrawer(); } }, { passive: true });

  /* ─── долна лента: скенер в средата ─── */
  const nav = document.getElementById('nav');
  if (nav && !document.getElementById('navScan')) {
    const more = nav.querySelector('[data-go="more"]'); if (more) more.remove();   // „Още“ е в менюто ☰
    const sc = document.createElement('button'); sc.id = 'navScan'; sc.className = 'nav-scan'; sc.setAttribute('aria-label', 'Скенер на продукти');
    sc.innerHTML = '<span class="nav-fab"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 5v4h2V5h4V3H5a2 2 0 0 0-2 2zm2 10H3v4a2 2 0 0 0 2 2h4v-2H5zm14 4h-4v2h4a2 2 0 0 0 2-2v-4h-2zm0-16h-4v2h4v4h2V5a2 2 0 0 0-2-2zM7 7h2v10H7zm3 0h1v10h-1zm2 0h2v10h-2zm3 0h1v10h-1zm2 0h1v10h-1z"/></svg></span>Скенер';
    sc.onclick = () => scanChooser();
    // app.js закача go(data-go) на всички бутони от долната лента при зареждане — връщаме скенера след това
    document.addEventListener('DOMContentLoaded', () => setTimeout(() => { sc.onclick = () => scanChooser(); }, 0));
    const list = nav.querySelector('[data-go="list"]'); list ? nav.insertBefore(sc, list) : nav.appendChild(sc);
  }

  /* ─── избор: баркод на живо или снимка на продукта ─── */
  function scanChooser() {
    openSheet(`<h3>📷 Провери продукт</h3><div class="muted small" style="margin-bottom:12px">Състав, Е-добавки, алергени, захар и сол — и дали подхожда на теб</div>
      <div class="scn-grid">
        <button class="scn-opt" id="scLive"><span>▮▯▮▮▯▮</span><b>Сканирай баркод</b><small>Насочи камерата към баркода</small></button>
        <button class="scn-opt alt" id="scPhoto"><span>📸</span><b>Снимай продукта</b><small>Етикет, предна страна или състав</small></button>
      </div>
      <button class="btn tonal block" id="scType" style="margin-top:10px">⌨️ Въведи име или баркод</button>
      <button class="btn tonal block" id="scHist" style="margin-top:8px">🧾 Проверени продукти и Е-добавки</button>`, el => {
      el.querySelector('#scLive').onclick = () => { closeSheet(); setTimeout(() => typeof startScan === 'function' && startScan(), 200); };
      el.querySelector('#scPhoto').onclick = () => { closeSheet(); setTimeout(photoProduct, 200); };
      el.querySelector('#scType').onclick = () => { closeSheet(); go('scan'); setTimeout(() => { const q = document.getElementById('scQ'); q && q.focus(); }, 300); };
      el.querySelector('#scHist').onclick = () => { closeSheet(); go('scan'); };
    });
  }

  /* ─── снимка на продукта ─── */
  const STOP = /^(състав|съставки|ingredients|нето|net|годен|най-добър|произведено|произход|съхранявайте|хранителна|стойност|енергия|kcal|kj|мазнини|въглехидрати|белтъци|сол|захари|партида|lot|www|com|bg|eu|за|и|с|от|на|в|до|при|без)$/i;
  function pickName(words) {
    // най-едрите и сигурни думи от етикета = име/марка на продукта
    const ok = words.filter(w => w.confidence > 55 && /[a-zа-я]{3,}/i.test(w.text) && !STOP.test(w.text.replace(/[^a-zа-я-]/gi, '')));
    const h = w => (w.bbox ? w.bbox.y1 - w.bbox.y0 : 0);
    const mx = Math.max(0, ...ok.map(h)); const big = ok.filter(w => h(w) >= mx * 0.55).sort((a, b) => h(b) - h(a)).slice(0, 4);
    return big.sort((a, b) => (a.bbox.y0 - b.bbox.y0) || (a.bbox.x0 - b.bbox.x0)).map(w => w.text.replace(/[^\p{L}\p{N}%-]/gu, '')).filter(Boolean).join(' ');
  }
  function ingredientsFrom(text) {
    const m = /(състав|съставки|ingredients)\s*[:：]?\s*([\s\S]{20,900})/i.exec(text);
    if (!m) return null;
    return m[2].split(/\n\s*\n|хранителна стойност|nutrition|годен до|най-добър/i)[0].replace(/\s+/g, ' ').trim();
  }
  /* разпознаване на баркод от снимка: вграденият в Android детектор, после ZXing в няколко размера */
  function loadImg(url) { return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; }); }
  async function decodeBarcode(url) {
    let img; try { img = await loadImg(url); } catch (e) { return null; }
    try {
      if ('BarcodeDetector' in window) {
        const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code', 'data_matrix'] });
        const r = await det.detect(img); if (r && r[0] && r[0].rawValue) return r[0].rawValue;
      }
    } catch (e) {}
    if (!window.ZXing) return null;
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    for (const max of [1400, 900, 2000]) {
      try {
        const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        const r = await new ZXing.BrowserMultiFormatReader(hints).decodeFromImageUrl(c.toDataURL('image/jpeg', .92));
        if (r) return r.getText();
      } catch (e) {}
    }
    return null;
  }
  const CAM = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Camera;
  /* снимка: родната камера на телефона (най-надеждно), иначе избор на файл */
  async function takePhoto() {
    const C = CAM();
    if (NATIVE && C) {
      try {
        const r = await C.getPhoto({ quality: 85, width: 1800, resultType: 'dataUrl', source: 'CAMERA', correctOrientation: true, saveToGallery: false });
        if (r && r.dataUrl) { const blob = await (await fetch(r.dataUrl)).blob(); return blob; }
        return null;
      } catch (e) {
        if (/cancel/i.test(String(e && (e.message || e)))) return null;
        if (/denied|permission/i.test(String(e && (e.message || e)))) { camDenied(); return null; }
      }
    }
    return new Promise(res => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.setAttribute('capture', 'environment');
      inp.onchange = () => res((inp.files && inp.files[0]) || null); inp.click();
    });
  }
  function camDenied() {
    openSheet(`<h3>📷 MAMA няма достъп до камерата</h3><div class="muted" style="margin-bottom:10px">За да сканираш, разреши камерата:</div>
      <ol class="steps"><li>Отвори <b>Настройки</b> на телефона → <b>Приложения</b> → <b>MAMA</b></li><li><b>Разрешения</b> → <b>Камера</b> → <b>Разреши</b></li><li>Върни се в MAMA и натисни скенера отново</li></ol>
      <button class="btn tonal block" id="cdType" style="margin-top:10px">⌨️ Въведи баркода ръчно</button>`, el => { el.querySelector('#cdType').onclick = () => { closeSheet(); go('scan'); setTimeout(() => { const q = document.getElementById('scQ'); q && q.focus(); }, 300); }; });
  }
  async function camPermission() {
    const C = CAM(); if (!NATIVE || !C) return true;
    try { let p = await C.checkPermissions(); if (p.camera !== 'granted') p = await C.requestPermissions({ permissions: ['camera'] }); if (p.camera === 'denied') { camDenied(); return false; } } catch (e) {}
    return true;
  }
  /* сканиране на живо: първо разрешение за камерата; ако видеото не тръгне — снимка с родната камера */
  async function photoProduct(barcodeOnly) {
    if (!(await camPermission())) return;
    const f = await takePhoto(); if (!f) return;
    {
      const url = URL.createObjectURL(f);
      openSheet(`<h3>📸 Разпознавам продукта…</h3><img src="${url}" alt="" class="scn-img"><div class="muted small" id="phSt">Търся баркод…</div><div class="scn-bar"><i id="phBar"></i></div>`);
      const st = t => { const e = document.getElementById('phSt'); if (e) e.textContent = t; };
      const bar = p => { const e = document.getElementById('phBar'); if (e) e.style.width = Math.round(p * 100) + '%'; };
      // 1) баркод от снимката
      const code = await decodeBarcode(url);
      if (code) { bar(1); closeSheet(); return (window.handleScan || lookup)(code); }
      if (barcodeOnly) st('Не виждам баркод — чета етикета…');
      // 2) етикет: разчитане на текста
      st('Няма баркод — чета етикета…'); bar(.1);
      let words = [], text = '';
      try {
        if (!window.Tesseract) await loadScript('vendor/tesseract.min.js');
        const worker = await Tesseract.createWorker('bul+eng', 1, { workerPath: new URL('vendor/tesseract-worker.min.js', location.href).href, workerBlobURL: false,
          logger: m => { if (m.status === 'recognizing text' && m.progress != null) bar(.3 + m.progress * .6); else if (m.status && /loading|initializ/.test(m.status)) st('Подготвям разчитането (първия път е по-бавно)…'); } });
        const r = await worker.recognize(f); await worker.terminate();
        text = r.data.text || ''; words = r.data.words || [];
      } catch (e) { st('Не успях да разчета етикета. Опитай по-ясна снимка или баркода.'); return; }
      bar(.92); st('Търся в базата с продукти…');
      const name = pickName(words), ingr = ingredientsFrom(text);
      let list = [];
      if (name) { try { list = await offSearch(name); } catch (e) { list = []; } }
      if (!list.length && name.includes(' ')) { try { list = await offSearch(name.split(' ').slice(0, 2).join(' ')); } catch (e) {} }
      bar(1);
      showPhotoResults(url, name, ingr, list);
    }
  }
  function showPhotoResults(url, name, ingr, list) {
    openSheet(`<h3>📸 Резултат</h3><div class="row" style="gap:12px;align-items:flex-start"><img src="${url}" alt="" class="scn-thumb"><div class="grow"><div class="muted small">Разпознах:</div>
      <div class="field" style="margin-top:4px">${I.search}<input id="phQ" value="${esc(name)}" placeholder="Име или марка"><button class="btn primary small" id="phGo">Търси</button></div></div></div>
      ${ingr ? `<button class="btn primary block" id="phIngr" style="margin-top:12px">🧪 Анализирай състава от снимката</button>` : ''}
      <div id="phList">${resultsHTML(list)}</div>
      ${!list.length && !ingr ? '<div class="notice info" style="margin-top:10px">💡 Снимай баркода или списъка „Състав“ на гърба — така разпознаването е най-точно.</div>' : ''}`, el => {
      const bind = (ls) => el.querySelectorAll('[data-pi]').forEach(b => b.onclick = () => showProduct(ls[+b.dataset.pi]));
      bind(list);
      const go_ = async () => { const q = el.querySelector('#phQ').value.trim(); if (!q) return; if (/^\d{6,14}$/.test(q)) return lookup(q); el.querySelector('#phList').innerHTML = '<div class="muted small" style="margin:10px 0">Търся…</div>'; let ls = []; try { ls = await offSearch(q); } catch (e) {} el.querySelector('#phList').innerHTML = resultsHTML(ls); bind(ls); };
      el.querySelector('#phGo').onclick = go_; el.querySelector('#phQ').onkeydown = e => { if (e.key === 'Enter') go_(); };
      const bi = el.querySelector('#phIngr'); if (bi) bi.onclick = () => showProduct(pseudoProduct(name, ingr));
    });
  }
  const ALG = [['gluten', /пшениц|глутен|ръж|ечемик|овес|спелт|брашно/], ['milk', /мляк|млечн|сирен|масло(?! растит)|сметана|суроватк|лактоз|казеин/], ['eggs', /яйц|яйчен/], ['nuts', /ядк|орех|бадем|лешни|кашу|шам-фъстък|пекан/], ['peanuts', /фъстъ/],
    ['soybeans', /соя|соев/], ['fish', /риба|рибен/], ['crustaceans', /ракообраз|скарид|раци/], ['celery', /целина/], ['mustard', /синап|горчица/], ['sesame-seeds', /сусам/], ['sulphur-dioxide-and-sulphites', /сулфит|серен диоксид|e22[0-8]/i], ['lupin', /лупина/], ['molluscs', /мекотел|миди|калмар/]];
  function pseudoProduct(name, ingr) {
    const t = ingr.toLowerCase().replace(/е(?=\s?\d{3})/g, 'e');
    const adds = [...new Set((t.match(/\be\s?-?\d{3}[a-z]?\b/g) || []).map(x => 'en:' + x.replace(/[\s-]/g, '')))];
    const alg = ALG.filter(([, re]) => re.test(t)).map(([k]) => 'en:' + k);
    return { product_name: name || 'Продукт от снимка', brands: '📸 по снимка на етикета', ingredients_text: ingr, ingredients_text_bg: ingr, additives_tags: adds, allergens_tags: alg, _photo: true };
  }
  function resultsHTML(list) {
    if (!list.length) return '<div class="muted small" style="margin:12px 2px">Не намерих продукта в базата. Поправи името горе или снимай баркода.</div>';
    return `<div class="muted small" style="margin:12px 2px 4px">Избери продукта:</div><ul class="list">${list.slice(0, 10).map((p, i) => `<li class="li" data-pi="${i}">${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:10px;background:#fff">` : '<div class="lead">📦</div>'}<div class="grow"><div class="title ellipsis">${esc(p.product_name_bg || p.product_name || '—')}</div><div class="muted small">${esc(p.brands || '')}${p.nutriscore_grade ? ' · Nutri-Score ' + esc(p.nutriscore_grade.toUpperCase()) : ''}</div></div></li>`).join('')}</ul>`;
  }

  /* екранът „Скенер“ получава и бутон за снимка */
  const bRS = renderScan;
  renderScan = function (el) {
    bRS.apply(this, arguments);
    const go_ = el.querySelector('#scGo'); if (!go_ || el.querySelector('#scPh')) return;
    go_.insertAdjacentHTML('afterend', `<button class="btn block" id="scPh" style="background:rgba(0,0,0,.25);color:#fff;border:1px solid rgba(255,255,255,.6);font-size:16px;padding:12px;margin-top:8px">📸 Снимай продукта</button>`);
    el.querySelector('#scPh').onclick = () => photoProduct();
  };

  /* „Назад“ затваря менюто */
  const bBack = back;
  back = function () { if (dr) return closeDrawer(); return bBack.apply(this, arguments); };
  const bb = document.getElementById('backBtn'); if (bb) bb.onclick = () => back();
  const bSO = sheetOpen; sheetOpen = function () { return !!dr || bSO.apply(this, arguments); };
  const bGo = go; go = function (name) { if (!name) return; return bGo.apply(this, arguments); };
  Object.assign(window, { mamaDecode: decodeBarcode, mamaTakePhoto: takePhoto, mamaCamPerm: camPermission, mamaPseudo: pseudoProduct, mamaPickName: pickName, mamaIngr: ingredientsFrom, mamaCamDenied: camDenied });
  window.openDrawer = openDrawer; window.scanChooser = scanChooser; window.photoProduct = photoProduct;
})();
