/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   Скенер 2: камера на живо с бутони (снимай, фенерче, въведи), баркод + QR + DataMatrix,
   търсене в няколко бази (Open Food Facts, Open Products Facts, Open Beauty Facts, UPCitemdb),
   подобни продукти по марка, и „Добави продукта“ — снимка на състава, който MAMA запомня за следващия път. */
(function () {
  const HTTP = () => window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.CapacitorHttp;
  /* JSON заявка: родно (без CORS и по-надеждно на телефона), иначе fetch; с таймаут */
  async function getJSON(url, ms = 12000) {
    const H = HTTP();
    if (NATIVE && H) {
      const r = await Promise.race([H.request({ url, method: 'GET', responseType: 'json', headers: { 'User-Agent': 'MAMA-app/1.0 (Android)', Accept: 'application/json' }, connectTimeout: ms, readTimeout: ms }), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms + 1000))]);
      if (r.status >= 500) throw new Error('HTTP ' + r.status);
      if (r.status === 404) return { __404: true };
      return typeof r.data === 'string' ? JSON.parse(r.data || 'null') : r.data;
    }
    const c = new AbortController(); const t = setTimeout(() => c.abort(), ms);
    try { const r = await fetch(url, { signal: c.signal, headers: { Accept: 'application/json' } }); if (r.status === 404) return { __404: true }; if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); } finally { clearTimeout(t); }
  }
  const BASES = [['world.openfoodfacts.org', 'Open Food Facts'], ['world.openproductsfacts.org', 'Open Products Facts'], ['world.openbeautyfacts.org', 'Open Beauty Facts'], ['world.openpetfoodfacts.org', 'Open Pet Food Facts']];
  async function fromBase(host, code) {
    const d = await getJSON(`https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${OFF_FIELDS}&lc=bg`);
    return d && d.status === 1 && d.product ? d.product : null;
  }
  // заменяме мрежовите функции на стария скенер с по-надеждните
  offProduct = async code => fromBase('world.openfoodfacts.org', code);
  offSearch = async q => { const d = await getJSON(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=15&fields=${OFF_FIELDS}`, 15000); return (d && d.products) || []; };
  /* българските магазини: баркод → име и цени по вериги (от данните на КЗП, обновявани 3 пъти дневно) */
  const kzpCache = {};
  async function kzpEan(code) {
    const pre = code.slice(0, 4);
    try {
      if (!(pre in kzpCache)) { const base = (S.settings.dataUrl || DEFAULT_DATA_URL).replace(/\/?$/, '/'); const d = await getJSON(`${base}ean/${pre}.json?t=${Math.floor(Date.now() / 36e5)}`, 8000); kzpCache[pre] = d && !d.__404 ? d : {}; }
      const e = kzpCache[pre][code] || (code.length === 12 ? kzpCache[pre]['0' + code] : null);
      return e ? { name: e[0], cat: e[1], prices: e[2] } : null;
    } catch (e) { return null; }
  }
  async function openGtin(code) {
    try {
      const H = HTTP(); const url = `https://opengtindb.org/?ean=${encodeURIComponent(code)}&cmd=query&queryid=400000000`;
      let t = '';
      if (NATIVE && H) { const r = await H.request({ url, method: 'GET', responseType: 'text', connectTimeout: 8000, readTimeout: 8000 }); t = typeof r.data === 'string' ? r.data : ''; }
      else { const r = await fetch(url); t = await r.text(); }
      if (!/error=0/.test(t)) return null;
      const g = k => { const m = new RegExp('^' + k + '=(.*)$', 'm').exec(t); return m ? m[1].trim() : ''; };
      const title = [g('name'), g('detailname')].filter(Boolean).join(' ').trim();
      return title ? { title, brand: g('vendor'), contents: g('contents') } : null;
    } catch (e) { return null; }
  }
  const kzpHTML = kz => kz ? `<div class="card" style="margin:10px 0"><h2 style="margin:0 0 6px">🏪 В магазините в България</h2><div class="muted small" style="margin-bottom:6px">${esc(kz.name)}</div><ul class="list">${kz.prices.slice(0, 6).map(([ch, pr], i) => `<li class="li" style="cursor:default"><div class="grow"><div class="title">${esc(ch)}</div></div><b style="${i === 0 ? 'color:#0e7a5c' : ''}">${eur(pr)}</b></li>`).join('')}</ul><div class="muted small" style="margin-top:4px">Данни: КЗП „Колко струва“, най-ниската цена във веригата</div></div>` : '';
  async function upcItem(code) {
    try { const d = await getJSON(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`, 9000); const it = d && d.items && d.items[0]; return it ? { title: it.title, brand: it.brand, img: (it.images || [])[0] } : null; } catch (e) { return null; }
  }
  // GS1 префикси на често сканирани марки → име за търсене на подобни
  const PREFIX = [[/^50601[6-9]|^506033[5-7]|^5060639|^5060751|^5060896|^5060947/, 'Monster Energy'], [/^90162|^9002490/, 'Red Bull'], [/^5449000/, 'Coca-Cola'], [/^4060800/, 'Pepsi'], [/^8000500/, 'Ferrero'], [/^7622210|^7622300/, 'Milka'], [/^3800/, '']];
  const brandOf = code => { const m = PREFIX.find(([re]) => re.test(code)); return m ? m[1] : ''; };
  const validEAN = c => { if (!/^\d{8}$|^\d{12,14}$/.test(c)) return true; const d = c.split('').map(Number), chk = d.pop(); const s = d.reverse().reduce((a, x, i) => a + x * (i % 2 ? 1 : 3), 0); return (10 - s % 10) % 10 === chk; };

  /* ─── какво е сканирано: баркод, QR с адрес, GS1 Digital Link или текст ─── */
  function handleScan(raw) {
    const t = String(raw || '').trim();
    if (/^\d{6,14}$/.test(t)) return lookup(t);
    const gt = /(?:\/01\/|\(01\)|^01)(\d{14})/.exec(t); if (gt) return lookup(gt[1].replace(/^0+(?=\d{8,13}$)/, ''));
    if (/^https?:\/\//i.test(t)) return openSheet(`<h3>🔗 QR код</h3><div class="muted small" style="word-break:break-all;margin:6px 0 12px">${esc(t)}</div><button class="btn primary block" id="qrOpen">Отвори връзката</button><button class="btn tonal block" id="qrCopy" style="margin-top:8px">Копирай</button>`, el => {
      el.querySelector('#qrOpen').onclick = () => openExt(t); el.querySelector('#qrCopy').onclick = async () => { try { await navigator.clipboard.writeText(t); toast('Копирано'); } catch (e) {} }; });
    openSheet(`<h3>🔳 QR код</h3><div style="white-space:pre-wrap;word-break:break-word;margin:8px 0 12px">${esc(t)}</div><button class="btn tonal block" id="qrCopy">Копирай</button>`, el => { el.querySelector('#qrCopy').onclick = async () => { try { await navigator.clipboard.writeText(t); toast('Копирано'); } catch (e) {} }; });
  }
  window.handleScan = handleScan;

  /* ─── търсене по баркод във всички бази ─── */
  lookup = async function (code) {
    code = String(code || '').replace(/\D/g, '');
    if (code.length < 6) { toast('Невалиден баркод'); return; }
    openSheet(`<h3>🔎 Търся продукта…</h3><div class="muted">Баркод <b>${esc(code)}</b></div><div class="scn-bar" style="margin-top:12px"><i id="lkBar" style="width:15%"></i></div><div class="muted small" id="lkSt" style="margin-top:6px">Open Food Facts…</div>`);
    const st = (t, p) => { const a = document.getElementById('lkSt'), b = document.getElementById('lkBar'); if (a) a.textContent = t; if (b) b.style.width = p + '%'; };
    const mine = (S.myProds || {})[code];
    if (mine) { closeSheet(); return showProduct(Object.assign({}, mine, { code })); }
    let netErr = 0;
    const kzP = kzpEan(code);
    for (let i = 0; i < BASES.length; i++) {
      const [host, nm] = BASES[i]; st(nm + '…', 12 + i * 16);
      try { const p = await fromBase(host, code); if (p) { p.code = p.code || code; if (!sheetOpen()) return; const kz = await kzP; closeSheet(); showProduct(p); if (kz) { const b = document.getElementById('sheetBody'); const anchor = b && b.querySelector('#scAdd'); anchor ? anchor.closest('.row, div').insertAdjacentHTML('beforebegin', kzpHTML(kz)) : b && b.insertAdjacentHTML('beforeend', kzpHTML(kz)); } return; } } catch (e) { netErr++; }
    }
    const kz = await kzP;
    if (netErr === BASES.length) return openSheet(`<h3>📶 Няма връзка с базите</h3><div class="muted">Провери интернета и опитай пак. Баркод <b>${esc(code)}</b>.</div><button class="btn primary block" id="lkRe" style="margin-top:12px">Опитай пак</button>`, el => { el.querySelector('#lkRe').onclick = () => lookup(code); });
    st('Търся името в световните бази…', 80);
    let u = kz ? { title: kz.name, brand: '' } : null;
    if (!u) u = await upcItem(code);
    if (!u) { st('Open GTIN…', 86); const o = await openGtin(code); if (o) u = { title: o.title, brand: o.brand }; }
    const q = (u && (u.brand ? u.brand + ' ' : '') + (u.title || '').split(/[,(]/)[0]) || brandOf(code);
    let similar = [];
    if (q) { st('Търся подобни продукти…', 92); try { similar = (await offSearch(q.split(' ').slice(0, 4).join(' '))).filter(p => p.ingredients_text || p.ingredients_text_bg || p.nutriments); } catch (e) {} }
    notFound(code, u, q, similar, kz);
  };
  function notFound(code, u, q, similar, kz) {
    const bad = !validEAN(code);
    openSheet(`<h3>📦 ${u ? esc(u.title) : 'Продуктът още не е в базите'}</h3>
      <div class="muted small">Баркод <b>${esc(code)}</b>${u && u.brand ? ' · ' + esc(u.brand) : ''}${bad ? ' · ⚠️ изглежда прочетен грешно — сканирай пак' : ''}</div>
      ${u && u.img ? `<img src="${esc(u.img)}" alt="" style="width:100%;max-height:160px;object-fit:contain;background:#fff;border-radius:12px;margin-top:8px">` : ''}
      ${kzpHTML(kz)}
      <div class="notice info" style="margin-top:10px">${kz ? 'Съставът му още липсва в отворените бази.' : 'Точно този вариант липсва в отворените бази.'} Добави го за 1 минута — MAMA ще го помни и следващия път ще го покаже веднага.</div>
      <button class="btn primary block" id="nfAdd" style="margin-top:8px">📸 Добави продукта (снимка на състава)</button>
      ${similar.length ? `<div class="section-title" style="margin-left:0">Подобни продукти${q ? ' — ' + esc(q) : ''}</div><ul class="list">${similar.slice(0, 6).map((p, i) => `<li class="li" data-si="${i}">${p.image_front_small_url ? `<img src="${esc(p.image_front_small_url)}" alt="" style="width:44px;height:44px;object-fit:contain;border-radius:10px;background:#fff">` : '<div class="lead">📦</div>'}<div class="grow"><div class="title ellipsis">${esc(p.product_name_bg || p.product_name || '—')}</div><div class="muted small">${esc(p.brands || '')}${p.quantity ? ' · ' + esc(p.quantity) : ''}</div></div></li>`).join('')}</ul>` : ''}
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn tonal small" id="nfRe">📷 Сканирай пак</button><button class="btn tonal small" id="nfName">⌨️ Търси по име</button><button class="btn tonal small" id="nfWeb">🌐 Търси в интернет</button>${kz ? '<button class="btn tonal small" id="nfList">🛒 В списъка</button>' : ''}<button class="btn tonal small" id="nfOff">Добави в Open Food Facts ↗</button></div>`, el => {
      el.querySelector('#nfWeb').onclick = () => openExt(`https://www.google.com/search?q=${encodeURIComponent(code + (u && u.title ? ' ' + u.title : ''))}`);
      const nl = el.querySelector('#nfList'); if (nl) nl.onclick = () => { S.list.push({ id: uid(), name: kz.name, cat: guessCat(kz.name), qty: 1, done: false, added: Date.now() }); save(); toast('Добавено в списъка'); };
      el.querySelectorAll('[data-si]').forEach(b => b.onclick = () => showProduct(similar[+b.dataset.si]));
      el.querySelector('#nfAdd').onclick = () => addOwn(code, u);
      el.querySelector('#nfRe').onclick = () => { closeSheet(); setTimeout(startScan, 200); };
      el.querySelector('#nfName').onclick = () => { closeSheet(); go('scan'); setTimeout(() => { const i = document.getElementById('scQ'); if (i) { i.value = q || ''; i.focus(); } }, 300); };
      el.querySelector('#nfOff').onclick = () => openExt(`https://world.openfoodfacts.org/cgi/product.pl?type=add&code=${encodeURIComponent(code)}`);
    });
  }

  /* ─── „Добави продукта“: снимка на състава → разчитане → запомняне ─── */
  async function addOwn(code, u) {
    if (window.mamaCamPerm && !(await mamaCamPerm())) return;
    toast('Снимай списъка „Състав“ отблизо');
    const f = await mamaTakePhoto(); if (!f) return;
    const url = URL.createObjectURL(f);
    openSheet(`<h3>🧪 Чета състава…</h3><img src="${url}" alt="" class="scn-img"><div class="scn-bar"><i id="aoBar"></i></div><div class="muted small" id="aoSt" style="margin-top:6px">Подготовка…</div>`);
    const st = t => { const e = document.getElementById('aoSt'); if (e) e.textContent = t; }, bar = p => { const e = document.getElementById('aoBar'); if (e) e.style.width = Math.round(p * 100) + '%'; };
    let text = '', words = [];
    try {
      if (!window.Tesseract) await loadScript('vendor/tesseract.min.js');
      const w = await Tesseract.createWorker('bul+eng', 1, { workerPath: new URL('vendor/tesseract-worker.min.js', location.href).href, workerBlobURL: false,
        logger: m => { if (m.status === 'recognizing text' && m.progress != null) { bar(.2 + m.progress * .8); st('Разчитам текста…'); } else if (m.status && /loading|initializ/.test(m.status)) st('Подготвям разчитането (първия път е по-бавно)…'); } });
      const r = await w.recognize(f); await w.terminate(); text = r.data.text || ''; words = r.data.words || [];
    } catch (e) { st('Не успях да разчета снимката. Опитай по-ясно и отблизо.'); return; }
    const ingr = (window.mamaIngr && mamaIngr(text)) || text.replace(/\s+/g, ' ').trim().slice(0, 900);
    const guess = (u && u.title) || (window.mamaPickName && mamaPickName(words)) || '';
    openSheet(`<h3>✅ Прочетох състава</h3>
      <label class="muted small">Име на продукта</label><input id="aoName" class="input" value="${esc(guess)}" placeholder="напр. Monster Energy Ultra 500 мл" style="width:100%;margin:4px 0 10px">
      <label class="muted small">Състав (поправи, ако е нужно)</label><textarea id="aoIngr" class="input" rows="6" style="width:100%;margin-top:4px">${esc(ingr)}</textarea>
      <button class="btn primary block" id="aoSave" style="margin-top:12px">💾 Запази и анализирай</button>`, el => {
      el.querySelector('#aoSave').onclick = () => {
        const name = el.querySelector('#aoName').value.trim() || 'Продукт ' + code, ing = el.querySelector('#aoIngr').value.trim();
        const p = Object.assign(window.mamaPseudo ? mamaPseudo(name, ing) : { product_name: name, ingredients_text: ing }, { code, brands: (u && u.brand) || '✍️ добавен от теб', image_front_small_url: (u && u.img) || '' });
        S.myProds = S.myProds || {}; S.myProds[code] = Object.assign({ t: Date.now(), mine: true }, p); save();
        toast('Запазено — следващия път ще го покажа веднага'); showProduct(p);
      };
    });
  }

  /* ─── камера на живо с бутони ─── */
  startScan = async function () {
    if (window.mamaCamPerm && !(await mamaCamPerm())) return;
    let stream = null, timer = null, done = false, zr = null, torch = false;
    const ov = document.createElement('div'); ov.className = 'scan-ov';
    ov.innerHTML = `<video playsinline muted autoplay></video><div class="scan-frame"><i></i></div>
      <div class="scan-top"><b>Насочи към баркода или QR кода</b><div class="small" id="s2Hint">Дръж телефона на 10–20 см, на светло</div></div>
      <div class="scan-ctl"><button id="s2Torch" aria-label="Фенерче"><span>🔦</span>Светлина</button><button id="s2Snap" class="big" aria-label="Снимай"><span>📸</span>Снимай</button><button id="s2Type" aria-label="Въведи"><span>⌨️</span>Въведи</button></div>
      <button class="scan-x" id="s2Close" aria-label="Затвори">✕</button>`;
    document.body.appendChild(ov);
    const video = ov.querySelector('video');
    const stop = () => { done = true; clearTimeout(timer); try { zr && zr.reset(); } catch (e) {} try { stream && stream.getTracks().forEach(t => t.stop()); } catch (e) {} ov.remove(); window.__scanOv = null; };
    window.__scanOv = stop;
    const found = raw => { if (done) return; if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) {} stop(); handleScan(raw); };
    ov.querySelector('#s2Close').onclick = stop;
    ov.querySelector('#s2Type').onclick = () => { stop(); go('scan'); setTimeout(() => { const q = document.getElementById('scQ'); q && q.focus(); }, 300); };
    ov.querySelector('#s2Snap').onclick = async () => {
      // снимка на кадъра от видеото; ако не стане — родната камера
      try {
        if (video.videoWidth) {
          const c = document.createElement('canvas'); c.width = video.videoWidth; c.height = video.videoHeight; c.getContext('2d').drawImage(video, 0, 0);
          const code = window.mamaDecode && await mamaDecode(c.toDataURL('image/jpeg', .95)); if (code) return found(code);
        }
      } catch (e) {}
      stop(); typeof photoProduct === 'function' ? photoProduct(true) : null;
    };
    ov.querySelector('#s2Torch').onclick = async () => { try { const tr = stream && stream.getVideoTracks()[0]; torch = !torch; await tr.applyConstraints({ advanced: [{ torch }] }); ov.querySelector('#s2Torch').classList.toggle('on', torch); } catch (e) { toast('Фенерчето не се поддържа тук'); } };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, focusMode: 'continuous' }, audio: false });
      video.srcObject = stream; await video.play().catch(() => {});
    } catch (e) { stop(); toast('Камерата на живо не тръгна — снимай баркода'); return typeof photoProduct === 'function' && photoProduct(true); }
    setTimeout(() => { const h = ov.querySelector('#s2Hint'); if (h && !done) h.innerHTML = 'Не хваща? Натисни <b>📸 Снимай</b> или включи светлината'; }, 7000);
    // 1) вграденият в Android разпознавач (най-бърз и точен)
    let det = null;
    try { if ('BarcodeDetector' in window) { const fm = await BarcodeDetector.getSupportedFormats(); const want = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code', 'data_matrix'].filter(f => fm.includes(f)); if (want.length) det = new BarcodeDetector({ formats: want }); } } catch (e) { det = null; }
    if (det) {
      const tick = async () => { if (done) return; try { if (video.readyState >= 2) { const r = await det.detect(video); const ok = r && r.find(x => x.rawValue && (x.format !== 'ean_13' || validEAN(x.rawValue))); if (ok) return found(ok.rawValue); } } catch (e) {} timer = setTimeout(tick, 180); };
      return tick();
    }
    // 2) ZXing (всички телефони)
    if (!window.ZXing) return;
    const hints = new Map();
    hints.set(ZXing.DecodeHintType.POSSIBLE_FORMATS, [ZXing.BarcodeFormat.EAN_13, ZXing.BarcodeFormat.EAN_8, ZXing.BarcodeFormat.UPC_A, ZXing.BarcodeFormat.UPC_E, ZXing.BarcodeFormat.CODE_128, ZXing.BarcodeFormat.QR_CODE, ZXing.BarcodeFormat.DATA_MATRIX]);
    hints.set(ZXing.DecodeHintType.TRY_HARDER, true);
    zr = new ZXing.BrowserMultiFormatReader(hints, 200);
    try { zr.decodeFromVideoElementContinuously ? zr.decodeFromVideoElementContinuously(video, res => { if (res) found(res.getText()); }) : zr.decodeFromStream(stream, video, res => { if (res) found(res.getText()); }); } catch (e) {}
  };

  /* „Назад“ затваря камерата */
  const bBack = back;
  back = function () { if (window.__scanOv) return window.__scanOv(); return bBack.apply(this, arguments); };
  const bb = document.getElementById('backBtn'); if (bb) bb.onclick = () => back();

  /* моите продукти в списъка „Проверени“ */
  const bRS = renderScan;
  renderScan = function (el) {
    bRS.apply(this, arguments);
    const mine = Object.entries(S.myProds || {}); if (!mine.length || el.querySelector('#myPr')) return;
    const body = el.querySelector('#scBody'); if (!body) return;
    body.insertAdjacentHTML('afterbegin', `<div class="card" id="myPr"><h2>✍️ Продукти, добавени от теб · ${mine.length}</h2><ul class="list">${mine.sort((a, b) => b[1].t - a[1].t).slice(0, 10).map(([c, p]) => `<li class="li" data-mp="${esc(c)}"><div class="lead">📦</div><div class="grow"><div class="title ellipsis">${esc(p.product_name)}</div><div class="muted small">${esc(c)}</div></div></li>`).join('')}</ul></div>`);
    body.querySelectorAll('[data-mp]').forEach(b => b.onclick = () => showProduct(Object.assign({}, S.myProds[b.dataset.mp], { code: b.dataset.mp })));
  };
})();
