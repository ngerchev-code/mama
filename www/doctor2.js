/* MAMA — My Doctor+: изследване от снимка, цел и срок с прогноза, 7-дневно меню, Аптеката на баба, дневник, PDF. */
'use strict';

/* ─── Зареждане на библиотеки при нужда ─────────────────────────────────── */
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[data-lazy="${src}"]`)) return res();
    const s = document.createElement('script'); s.src = src; s.dataset.lazy = src;
    s.onload = res; s.onerror = () => rej(new Error('Не се зареди ' + src)); document.head.appendChild(s);
  });
}

/* ─── 1. Изследване от снимка (OCR) ─────────────────────────────────────── */
const LAB_RX = [ // ред има значение: по-специфичните първо
  ['a1c', /(hb\s*a1c|hba1c|гликиран\w*\s*хемоглобин|гликохемоглобин|\ba1c\b)/],
  ['ldl', /(ldl[\s-]*(холестерол|chol\w*|c\b)?|лпнп|ниска\s*плътност)/],
  ['hdl', /(hdl[\s-]*(холестерол|chol\w*|c\b)?|лпвп|висока\s*плътност)/],
  ['tc', /(общ\s*холестерол|холестерол\s*общ|total\s*chol\w*|\bt-?chol\b|холестерол(?!\s*[-–]?\s*(ldl|hdl|лп)))/],
  ['tg', /(триглицерид\w*|triglycerid\w*|\btg\b|\btrig\b)/],
  ['glu', /(глюкоза|кръвна\s*захар|glucose|\bglu\b|\bгл\b)/],
  ['ferr', /(феритин|ferritin)/],
  ['vitd', /(витамин\s*d\s*\d?|vit\.?\s*d\d?|25[\s-]*\(?oh\)?|холекалциферол|калцидиол)/],
  ['b12', /(витамин\s*b\s*12|vit\.?\s*b\s*12|кобаламин|цианокобаламин|\bb12\b)/],
  ['tsh', /(\btsh\b|\bтсх\b|тиреостимулиращ\w*)/],
  ['crp', /(\bcrp\b|\bцрп\b|[cс][\s-]*реактивен)/],
  ['egfr', /(e\s*gfr|егфр|гломерулна\s*филтрация)/],
  ['crea', /(креатинин|creatinine|\bcrea\b|\bcrei\b)/],
  ['uric', /(пикочна\s*киселина|uric\s*acid|\bua\b)/],
  ['alt', /(\bалат\b|\balt\b|\bgpt\b|\bалт\b|аланин)/],
  ['ast', /(\bасат\b|\bast\b|\bgot\b|\bаст\b|аспартат)/],
  ['ggt', /(\bггт\b|\bggt\b|\bгамаглутамил\w*|гама\s*гт|\bg-?gt\b)/],
  ['hb', /(хемоглобин|\bhgb\b|\bhb\b)/],
  ['k', /(калий|potassium|\bk\+?\s)/],
  ['na', /(натрий|sodium|\bna\+?\s)/],
];
// \b в JS не работи с кирилица — заменяме го с граница, която разпознава и кирилски букви
const WB = '(?:(?<![a-zа-яё0-9])(?=[a-zа-яё0-9])|(?<=[a-zа-яё0-9])(?![a-zа-яё0-9]))';
LAB_RX.forEach(x => { x[1] = new RegExp(x[1].source.split('\\b').join(WB)); });
const UNIT_GUESS = { // ако стойността е в другата единица
  tc: v => v > 25, ldl: v => v > 20, hdl: v => v > 6, tg: v => v > 30, glu: v => v > 35,
  crea: v => v < 15, uric: v => v < 20, hb: v => v < 25, vitd: () => false, b12: () => false,
};
function parseLabText(text) {
  const lines = text.toLowerCase().replace(/[‚]/g, ',').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const found = {};
  for (const line of lines) {
    for (const [k, rx] of LAB_RX) {
      if (found[k]) continue;
      if (k === 'hb' && /a1c|гликир/.test(line)) continue;
      const m = rx.exec(line); if (!m) continue;
      const rest = line.slice(m.index + m[0].length);
      const nm = /(\d{1,4}(?:[.,]\d{1,3})?)/.exec(rest); if (!nm) continue;
      let v = parseFloat(nm[1].replace(',', '.'));
      const ind = IND.find(i => i.k === k); if (!ind || isNaN(v)) continue;
      let conv = false;
      if (ind.alt) {
        const au = ind.alt[0].toLowerCase().replace('/', '\\/');
        if (new RegExp(au).test(rest) || (UNIT_GUESS[k] && UNIT_GUESS[k](v))) { v = v * ind.alt[1]; conv = true; }
        if (k === 'vitd' && /ng/.test(rest)) { v = v * ind.alt[1]; conv = true; }
      }
      if (v < ind.min || v > ind.max) continue;
      found[k] = { v: +v.toFixed(3), conv, line };
      break;
    }
  }
  // кръвно, ако е записано
  const bp = /(кръвно|rr|ад|артериално)[^\d]*(\d{2,3})\s*\/\s*(\d{2,3})/.exec(text.toLowerCase());
  if (bp) { found.sys = { v: +bp[2], line: bp[0] }; found.dia = { v: +bp[3], line: bp[0] }; }
  const dm = /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/.exec(text);
  const date = dm ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}` : todayISO();
  return { found, date: /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date) <= new Date() ? date : todayISO() };
}
function labPhoto() {
  if (!DS().profile) { toast('Първо попълни кратък профил'); drWizard(0); return; }
  openSheet(`<h3>📷 Качи изследване</h3>
    <div class="muted small">Снимай листа с резултатите на светло, отгоре и без сенки — или избери снимка/скрийншот от галерията. Разчитането става на телефона, снимката не се изпраща никъде.</div>
    <label class="btn primary block" style="margin-top:12px">📸 Снимай / избери снимка<input type="file" accept="image/*" id="labFile" hidden></label>
    <button class="btn tonal block" id="labText" style="margin-top:8px">📋 Постави текст (от имейл/PDF)</button>
    <button class="btn tonal block" id="labHand" style="margin-top:8px">✍️ Въведи ръчно</button>
    <div class="notice info" style="margin-top:12px">ℹ️ <div>Първото разчитане изтегля речник за български (~10 MB) — нужен е интернет. След това е по-бързо.</div></div>`, el => {
    el.querySelector('#labFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) runOcr(f); };
    el.querySelector('#labHand').onclick = () => { closeSheet(); setTimeout(drLabsForm, 250); };
    el.querySelector('#labText').onclick = () => openSheet(`<h3>📋 Постави текста на изследването</h3><textarea class="input" id="labTxt" rows="10" placeholder="Холестерол 6,1 mmol/L&#10;LDL 4,2&#10;Глюкоза 5,9 …"></textarea><button class="btn primary block" id="labParse" style="margin-top:10px">Разчети</button>`,
      s => s.querySelector('#labParse').onclick = () => reviewLabs(parseLabText(s.querySelector('#labTxt').value), s.querySelector('#labTxt').value));
  });
}
async function runOcr(file) {
  openSheet(`<h3>🔎 Разчитам изследването…</h3><div class="muted small" id="ocrSt">Подготовка</div><div class="track" style="height:10px;background:var(--surface-2);border-radius:6px;margin-top:10px;overflow:hidden"><div id="ocrBar" style="height:100%;width:3%;background:var(--primary);transition:width .3s"></div></div>`);
  const st = t => { const e = $('#ocrSt'); if (e) e.textContent = t; };
  const bar = p => { const e = $('#ocrBar'); if (e) e.style.width = Math.max(3, Math.round(p * 100)) + '%'; };
  try {
    await loadScript('vendor/tesseract.min.js');
    const img = await shrinkImage(file, 2200);
    const worker = await Tesseract.createWorker('bul+eng', 1, {
      workerPath: new URL('vendor/tesseract-worker.min.js', location.href).href, workerBlobURL: false,
      logger: m => { if (m.status) st({ 'loading tesseract core': 'Зареждане на разчитането…', 'loading language traineddata': 'Изтегляне на речника…', 'initializing api': 'Подготовка…', 'recognizing text': 'Разчитане на текста…' }[m.status] || m.status); if (m.progress != null) bar(m.progress); },
    });
    const { data } = await worker.recognize(img);
    await worker.terminate();
    const parsed = parseLabText(data.text || '');
    reviewLabs(parsed, data.text || '');
  } catch (e) {
    openSheet(`<h3>Неуспешно разчитане</h3><div class="muted">${esc(e.message || 'Грешка')}. Провери интернет връзката за първото изтегляне или въведи стойностите ръчно.</div><button class="btn primary block" id="hand" style="margin-top:10px">✍️ Въведи ръчно</button>`, s => s.querySelector('#hand').onclick = () => { closeSheet(); setTimeout(drLabsForm, 250); });
  }
}
function shrinkImage(file, max) {
  return new Promise(res => {
    const url = URL.createObjectURL(file); const im = new Image();
    im.onload = () => {
      const k = Math.min(1, max / Math.max(im.width, im.height));
      const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const x = c.getContext('2d'); x.filter = 'grayscale(1) contrast(1.25)'; x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); res(c);
    };
    im.onerror = () => res(file); im.src = url;
  });
}
function reviewLabs(parsed, raw) {
  const ks = Object.keys(parsed.found);
  const p = DS().profile;
  openSheet(`<h3>✅ Провери разчетените стойности</h3>
    <div class="muted small">${ks.length ? `Намерени ${ks.length} показателя. Поправи, ако има грешка, и махни отметката на грешно разчетените.` : 'Не открих познати показатели. Опитай по-ясна снимка или въведи ръчно.'}</div>
    <label class="lbl">Дата на изследването</label><input class="input" type="date" id="rvD" value="${parsed.date}">
    <ul class="list">${ks.map(k => { const ind = IND.find(i => i.k === k); const f = parsed.found[k]; const e = evalInd(ind, f.v, p);
      return `<li class="li" style="cursor:default"><input type="checkbox" data-ok="${k}" checked style="width:22px;height:22px"><div class="grow"><div class="title">${esc(ind.n)}</div><div class="muted small">${e ? `<span class="tag ${ST_COLOR[e.st]}">${esc(e.label)}</span>` : ''}${f.conv ? ' · превърнато от ' + esc(ind.alt[0]) : ''}</div></div>
        <input class="input" style="width:92px;text-align:right" inputmode="decimal" data-v="${k}" value="${String(f.v).replace('.', ',')}"><span class="muted small" style="min-width:52px">${esc(ind.u)}</span></li>`; }).join('')}</ul>
    ${raw ? `<details style="margin-top:10px"><summary class="muted small">Разчетен текст</summary><pre class="small" style="white-space:pre-wrap">${esc(raw.slice(0, 3000))}</pre></details>` : ''}
    <button class="btn primary block" id="rvSave" style="margin-top:12px" ${ks.length ? '' : 'disabled'}>Запиши и анализирай</button>
    <button class="btn tonal block" id="rvHand" style="margin-top:8px">✍️ Добави ръчно още</button>`, el => {
    el.querySelector('#rvHand').onclick = () => { closeSheet(); setTimeout(drLabsForm, 250); };
    el.querySelector('#rvSave').onclick = () => {
      const d = el.querySelector('#rvD').value || todayISO(); let n = 0;
      ks.forEach(k => {
        if (!el.querySelector(`[data-ok="${k}"]`).checked) return;
        const v = parseFloat(el.querySelector(`[data-v="${k}"]`).value.replace(',', '.')); const ind = IND.find(i => i.k === k);
        if (isNaN(v) || v < ind.min || v > ind.max) return;
        const L = DS().labs; (L[k] = L[k] || []).push({ d, v }); L[k].sort((a, b) => a.d.localeCompare(b.d)); n++;
      });
      save(); closeSheet(); drTab = 'goal'; go('doctor');
      setTimeout(() => analysisPopup(n), 400);
    };
  });
}
function analysisPopup(n) {
  const refs = drReferrals(); const out = refs.filter(r => r.v != null);
  const g = suggestGoal();
  popup({ theme: out.some(r => r.urg === 2) ? 'pink' : 'teal', emoji: '🧪', kicker: `Записани ${n} показателя`, title: out.length ? `${out.length} ${out.length === 1 ? 'показател е' : 'показателя са'} извън нормата` : 'Всички записани показатели са в норма 🎉',
    text: out.slice(0, 4).map(r => `• <b>${esc(r.n)}</b>: ${esc(r.label)}`).join('<br>') + (g ? `<br><br>Предлагаме цел: <b>${esc(g.n)}</b>` : ''),
    actions: [{ label: g ? '🎯 Направи ми програма' : 'Виж режима', primary: true, fn: () => { if (g) { DS().goal = { id: g.id, weeks: g.w[1] || g.w[0], start: todayISO() }; save(); } drTab = 'goal'; render(); } }, { label: 'Към лекар', fn: () => { drTab = 'doc'; render(); } }] });
}

/* ─── 2. Цели със срок и прогноза ───────────────────────────────────────── */
// exp: [мин, макс] очаквана промяна (отрицателно = понижение), unit 'pct' или 'abs'; w: предлагани срокове (седмици)
const GOALS2 = [
  { id: 'chol', n: 'Нормализиране на холестерола', e: '🧈', ind: 'ldl', alt: 'tc', flag: 'ldl', w: [6, 12], exp: { 6: [-8, -15], 12: [-15, -30] }, unit: 'pct', target: 3.0,
    src: 'Jenkins et al., JAMA 2003 (портфолио режим); ESC/EAS 2019', note: 'Храненето може да понижи LDL с 10–30%. Ако рискът е висок, лекарят може да назначи и лекарство — режимът помага и тогава.',
    phases: ['Махни трансмазнините и колбасите; масло → зехтин', 'Овес или ечемик всеки ден (бета-глюкан 3 г)', 'Шепа ядки дневно и бобови 4+ пъти седмично', 'Риба 2× седмично; движение 150 мин/седм.', 'Контролно изследване и равносметка'] },
  { id: 'tg', n: 'Понижаване на триглицеридите', e: '🫧', ind: 'tg', flag: 'tg', w: [8, 12], exp: { 8: [-15, -30], 12: [-20, -45] }, unit: 'pct', target: 1.7,
    src: 'AHA Scientific Statement 2011; ESC/EAS 2019', note: 'Най-бързо реагират на спиране на алкохола, захарта и белия хляб и на сваляне на тегло.',
    phases: ['Без алкохол и подсладени напитки', 'Бял хляб, ориз и сладкиши → пълнозърнести и бобови', 'Мазна риба 2–3× седмично', 'Сваляне на 5% от теглото', 'Контролно изследване'] },
  { id: 'sugar', n: 'Кръвна захар под контрол', e: '🍬', ind: 'glu', alt: 'a1c', flag: 'glucose', w: [8, 12], exp: { 8: [-0.3, -0.8], 12: [-0.4, -1.1] }, unit: 'abs', target: 5.6,
    src: 'ADA Standards of Care 2024; Diabetes Prevention Program', note: 'HbA1c отразява 3 месеца — контролното е най-точно след 12 седмици. При лечение с лекарства корекцията е с лекаря.',
    phases: ['Без сладки напитки и сокове', 'Метод на чинията: ½ зеленчуци, ¼ белтък, ¼ пълнозърнести', '10–15 мин разходка след хранене', 'Сваляне на 5–7% от теглото', 'Контролно (захар на гладно и HbA1c)'] },
  { id: 'bp', n: 'По-ниско кръвно', e: '❤️', ind: 'sys', flag: 'bp', w: [4, 8], exp: { 4: [-5, -10], 8: [-8, -14] }, unit: 'abs', target: 130,
    src: 'DASH-Sodium trial, NEJM 2001; ESC 2024', note: 'DASH режимът и по-малко сол понижават горното кръвно средно с 8–14 mmHg. Мери кръвното вкъщи 2× дневно.',
    phases: ['Сол под 5 г: без колбаси, кубчета, саламурено сирене', 'Плодове и зеленчуци 8–10 порции (калий)', 'Нискомаслени млечни и бобови', 'Без алкохол; 30 мин ходене дневно', 'Сравни домашните измервания с началото'] },
  { id: 'iron', n: 'Повече желязо и хемоглобин', e: '🩸', ind: 'ferr', alt: 'hb', flag: 'anemia', w: [8, 12], exp: { 8: [10, 30], 12: [15, 45] }, unit: 'pct', target: 30,
    src: 'WHO 2020; NHS — желязодефицитна анемия', note: 'Храната помага, но при анемия причината се търси от лекар и обикновено се назначава желязо — с него хемоглобинът расте за 3–4 седмици, а запасите се попълват за ~3 месеца.',
    phases: ['Червено месо/черен дроб 2–3× седм. или бобови всеки ден', 'Витамин C към всяко хранене (лимон, чушки)', 'Чай и кафе — поне 1 час след храна', 'Ако лекарят назначи желязо — приемай го редовно', 'Контролно: хемоглобин и феритин'] },
  { id: 'vitd', n: 'Вдигане на витамин D', e: '☀️', ind: 'vitd', flag: 'vitd', w: [8, 12], exp: { 8: [20, 60], 12: [30, 90] }, unit: 'pct', target: 50,
    src: 'EFSA 2016; Endocrine Society 2024', note: 'От храна се набавя малко — слънце 15–20 мин и добавка по преценка на лекаря дават основния ефект.',
    phases: ['Мазна риба 2× седмично, яйца', 'Слънце на ръце и лице 15–20 мин (без изгаряне)', 'Добавка — само по лекарска препоръка', 'Калций от млечни продукти', 'Контролно след 8–12 седмици'] },
  { id: 'weight', n: 'Сваляне на тегло', e: '⚖️', ind: 'weight', flag: 'weight', w: [8, 12, 26], exp: { 8: [-3, -6], 12: [-4, -9], 26: [-6, -12] }, unit: 'abs', target: null,
    src: 'WHO; NICE 2022', note: 'Реалистично и устойчиво е 0,5–1 кг седмично.',
    phases: ['Без сладки напитки и хранене пред екран', 'Белтък на всяко хранене, ½ чиния зеленчуци', 'Отмервай мазнините и порциите', '8 000+ крачки и 2 силови тренировки седмично', 'Претегляне веднъж седмично в един и същ ден'] },
  { id: 'uric', n: 'По-ниска пикочна киселина', e: '🦶', ind: 'uric', flag: 'uric', w: [8, 12], exp: { 8: [-5, -10], 12: [-8, -15] }, unit: 'pct', target: 360,
    src: 'ACR 2020; EULAR 2016', note: 'Диетата има умерен ефект; при подагра основно е лечението от лекаря.',
    phases: ['Без бира и твърд алкохол', 'Без напитки с фруктоза', 'Червено месо и карантии — рядко', '2+ литра вода дневно и нискомаслени млечни', 'Контролно изследване'] },
  { id: 'liver', n: 'Здрав черен дроб (АЛАТ, ГГТ)', e: '🫀', ind: 'alt', flag: 'liver', w: [12, 26], exp: { 12: [-15, -35], 26: [-25, -50] }, unit: 'pct', target: 40,
    src: 'EASL–EASD–EASO 2024', note: 'Свалянето на 7–10% от теглото нормализира ензимите при много хора с мастен черен дроб.',
    phases: ['Без алкохол', 'Без захар и подсладени напитки', 'Средиземноморско хранене', 'Сваляне на 7–10% от теглото', 'Контролно: АЛАТ, АСАТ, ГГТ'] },
  { id: 'stress', n: 'Спокойни нерви и по-малко стрес', e: '🧘', w: [2, 4, 8], flag: 'stress', src: 'WHO — психично здраве; Harvard Health', note: 'Храната подкрепя, но най-силният ефект е от съня, движението и рутината. При тревожност или депресия, които пречат на живота — към лекар.',
    phases: ['Редовно хранене, без пропуснати закуски', 'Магнезий от храна: ядки, семена, бобови, пълнозърнести', 'Кафе до 2 чаши и до обед', '20–30 мин разходка и 5 мин дишане 4-7-8 вечер', 'Маточина или лайка вечер'] },
  { id: 'energy', n: 'Повече енергия през деня', e: '⚡', w: [2, 4], flag: 'energy', src: 'NHS — постоянна умора', note: 'При продължителна умора се изследват хемоглобин, феритин, B12, витамин D и TSH.',
    phases: ['Закуска с белтък (яйца, кисело мляко, извара)', 'Вода 1,5–2 л; по-малко захар — по-малко „сривове“', 'Движение и дневна светлина сутрин', '7–9 часа сън по едно и също време', 'Провери желязо, B12, D и TSH, ако умората продължава'] },
  { id: 'sleep', n: 'По-добър сън, без сънливост денем', e: '😴', w: [2, 4], flag: 'sleep', src: 'AASM; NHS — безсъние', note: 'Хъркане със спиране на дишането и силна дневна сънливост са повод за лекар (сънна апнея).',
    phases: ['Кафе и енергийни напитки — до 14 ч.', 'Вечеря поне 3 часа преди лягане, леко', 'Без телефон 30 мин преди сън; хладна стая', 'Топло мляко или чай от лайка/маточина', 'Едно и също време за лягане и ставане'] },
  { id: 'immunity', n: 'Имунитет за есента и зимата', e: '🛡️', w: [4, 8], flag: 'immunity', src: 'WHO; EFSA', note: 'Няма храна, която „гарантира“ имунитет — помагат разнообразното хранене, сънят и движението.',
    phases: ['Зеленчуци и плодове всеки ден (витамин C)', 'Ферментирали храни: кисело мляко, кисело зеле', 'Цинк: месо, бобови, семена, ядки', 'Сън 7–9 ч. и движение', 'Ваксини по препоръка на личния лекар'] },
  { id: 'digest', n: 'Добро храносмилане', e: '🌀', w: [2, 4], flag: 'digest', src: 'NHS; Monash University', note: 'Кръв в изпражненията, отслабване без причина или нощни болки — веднага към лекар.',
    phases: ['Фибри постепенно до 25–30 г/ден', 'Вода 1,5–2 л', 'Кисело мляко или кефир всеки ден', 'Бавно хранене, без преяждане вечер', 'Мента или джинджифил при подуване'] },
];
function suggestGoal() {
  const p = DS().profile || {}; const fl = drFlags();
  const order = [['ldl', 'chol'], ['glucose', 'sugar'], ['bp', 'bp'], ['tg', 'tg'], ['anemia', 'iron'], ['liver', 'liver'], ['uric', 'uric'], ['vitd', 'vitd'], ['weight', 'weight']];
  for (const [f, g] of order) if (fl.has(f)) return GOALS2.find(x => x.id === g);
  if ((p.goals || []).includes('lose')) return GOALS2.find(x => x.id === 'weight');
  if ((p.goals || []).includes('energy')) return GOALS2.find(x => x.id === 'energy');
  return null;
}
function forecast(g, weeks) {
  let k = g.ind; let cur = valueOf(k);
  if (cur == null && g.alt) { k = g.alt; cur = valueOf(k); }
  if (cur == null) return null;
  const ind = IND.find(i => i.k === k) || { n: k, u: '', step: 0.1 };
  const ws = Object.keys(g.exp || {}).map(Number).sort((a, b) => a - b);
  const w = ws.reduce((b, x) => Math.abs(x - weeks) < Math.abs(b - weeks) ? x : b, ws[0]);
  let [a, b] = (g.exp || {})[w] || [0, 0];
  if (k === 'a1c' && g.id === 'sugar') { a = a * 0.6; b = b * 0.8; }
  const calc = x => g.unit === 'pct' ? cur * (1 + x / 100) : cur + x;
  const lo = calc(a), hi = calc(b);
  const best = g.unit === 'pct' ? (b < 0 ? Math.min(lo, hi) : Math.max(lo, hi)) : (b < 0 ? Math.min(lo, hi) : Math.max(lo, hi));
  const p = DS().profile || {};
  const eBest = ind.r ? evalInd(ind, best, p) : null;
  return { k, ind, cur, lo: Math.min(lo, hi), hi: Math.max(lo, hi), w, reach: eBest ? eBest.st === 'ok' : null, eNow: ind.r ? evalInd(ind, cur, p) : null };
}
function drGoal(el) {
  const st = DS(); const p = st.profile;
  if (!st.goal) { const g = suggestGoal(); st.goal = { id: (g || GOALS2[GOALS2.length - 4]).id, weeks: (g || GOALS2[10]).w[0], start: todayISO() }; save(); }
  const g = GOALS2.find(x => x.id === st.goal.id) || GOALS2[0];
  const weeks = g.w.includes(st.goal.weeks) ? st.goal.weeks : g.w[0];
  const f = g.ind ? forecast(g, weeks) : null;
  const end = addD(new Date(st.goal.start), weeks * 7);
  const passed = Math.max(0, Math.min(weeks, Math.floor((Date.now() - new Date(st.goal.start)) / (7 * 86400000))));
  const menu = weekPlan(g);
  el.innerHTML = `
    <div class="card"><h2>🎯 Какво искаш да постигнеш?</h2>
      <div class="chips" style="flex-wrap:wrap">${GOALS2.map(x => `<button class="chip ${x.id === g.id ? 'on' : ''}" data-g="${x.id}">${x.e} ${esc(x.n)}</button>`).join('')}</div>
      <div class="muted small" style="margin:10px 0 6px">За колко време?</div>
      <div class="chips">${g.w.map(w => `<button class="chip ${w === weeks ? 'on' : ''}" data-w="${w}">${w < 26 ? w + ' седмици' : '6 месеца'}</button>`).join('')}</div></div>
    <div class="card hero" style="background:${heroGrad({ group: 'main' })}">
      <div class="small" style="opacity:.9">${g.e} ${esc(g.n)} · ${weeks < 26 ? weeks + ' седмици' : '6 месеца'}</div>
      ${f ? `<div class="row between" style="margin-top:6px"><div><div class="small" style="opacity:.85">Сега</div><div class="big" style="font-size:26px">${fmtNum(f.cur, f.ind.step || 0.1)}</div><div class="small">${esc(f.ind.u || '')}</div></div>
        <div style="font-size:28px">→</div><div style="text-align:right"><div class="small" style="opacity:.85">Очаквано след ${f.w} седм.</div><div class="big" style="font-size:26px">${fmtNum(f.lo, f.ind.step || 0.1)}–${fmtNum(f.hi, f.ind.step || 0.1)}</div><div class="small">${esc(f.ind.u || '')}</div></div></div>
        <div class="kpi" style="margin-top:10px">${f.reach === true ? '✅ При спазване на програмата е реалистично да стигнеш нормата.' : f.reach === false ? '⚠️ Само с храна вероятно няма да стигнеш нормата — програмата помага, но е нужна и консултация с лекар.' : 'Прогноза по средните резултати от проучванията.'}</div>`
        : g.ind ? `<div style="margin-top:6px">Няма стойност за <b>${esc((IND.find(i => i.k === g.ind) || {}).n || g.ind)}</b> — качи изследване за прогноза.</div><button class="btn small" style="background:#fff;color:#0b8a5f;margin-top:8px" id="gPhoto">📷 Качи изследване</button>`
        : `<div style="margin-top:6px">Програма за ${weeks} седмици. Отбелязвай в <b>Дневник</b> как се чувстваш — ще виждаш напредъка.</div>`}
      <div class="small" style="opacity:.85;margin-top:8px">Начало ${fmtDate(st.goal.start)} · контролно ~${fmtDate(end)} · седмица ${Math.min(passed + 1, weeks)} от ${weeks}</div>
      <div class="track" style="height:8px;background:rgba(255,255,255,.25);border-radius:6px;margin-top:6px;overflow:hidden"><div style="height:100%;width:${Math.round(passed / weeks * 100)}%;background:#fff"></div></div></div>
    <div class="notice info">💡 <div>${esc(g.note)}<div class="muted small" style="margin-top:4px">Източник: ${esc(g.src)}</div></div></div>
    <div class="card"><h2>🗓️ Програма по етапи</h2><ol class="steps">${phasesFor(g, weeks).map(x => `<li><b>${esc(x[0])}</b> — ${esc(x[1])}</li>`).join('')}</ol>
      <button class="btn tonal small" id="gRemind" style="margin-top:8px">🔔 Напомни ми за контролно изследване (${fmtDate(end)})</button></div>
    <div class="card"><h2>🍽️ Меню за 7 дни</h2>${menu.map((d, i) => `<details class="day" ${i === 0 ? 'open' : ''}><summary><b>${esc(d.day)}</b></summary>
      <div class="small"><div>🌅 <b>Закуска:</b> ${esc(d.b)}</div><div>🍲 <b>Обяд:</b> ${d.l ? `<a href="#" data-recipe="${d.l.id}">${esc(d.l.name)}</a>` : esc(d.lt)}</div><div>🍎 <b>Междинно:</b> ${esc(d.s)}</div><div>🌙 <b>Вечеря:</b> ${d.d ? `<a href="#" data-recipe="${d.d.id}">${esc(d.d.name)}</a>` : esc(d.dt)}</div><div>🍵 <b>Напитка:</b> ${esc(d.t)}</div></div></details>`).join('')}
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn primary grow" id="gList">${I.cart} Продуктите в списъка</button><button class="btn tonal grow" id="gPdf">📄 PDF</button></div></div>
    <div class="card"><h2>🌿 Помагат още</h2>${herbsFor(g).slice(0, 4).map(h => herbRow(h)).join('')}<button class="more" id="gHerbs" style="margin-top:6px">Всички билки и напитки ›</button></div>
    ${drDisclaimer()}`;
  el.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { const ng = GOALS2.find(x => x.id === b.dataset.g); st.goal = { id: ng.id, weeks: ng.w[Math.min(1, ng.w.length - 1)], start: todayISO() }; save(); drGoal(el); });
  el.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { st.goal.weeks = +b.dataset.w; save(); drGoal(el); });
  el.querySelectorAll('[data-recipe]').forEach(b => b.onclick = e => { e.preventDefault(); showRecipe(b.dataset.recipe); });
  const gp = el.querySelector('#gPhoto'); if (gp) gp.onclick = labPhoto;
  el.querySelector('#gPdf').onclick = () => drPdf();
  el.querySelector('#gHerbs').onclick = () => { drTab = 'herbs'; render(); };
  el.querySelector('#gList').onclick = () => {
    const rs = menu.flatMap(d => [d.l, d.d]).filter(Boolean); const uniq = [...new Set(rs)];
    const n = sum(uniq.map(addIngredients)); toast(n ? `Добавени ${n} продукта за седмицата` : 'Продуктите вече са в списъка');
  };
  el.querySelector('#gRemind').onclick = async () => {
    st.goal.remind = iso(end); save();
    const ln = LN();
    if (ln) { try { const ps = await ln.requestPermissions(); if (ps.display === 'granted') { const at = new Date(end); at.setHours(9, 0, 0, 0); await ln.schedule({ notifications: [{ id: 400, channelId: 'mama', title: '🧪 Време за контролно изследване', body: `${g.n}: ${weeks} седмици програма. Направи изследването и го качи в My Doctor.`, schedule: { at, allowWhileIdle: true }, extra: { go: 'doctor' }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' }] }); } } catch (e) { /* */ } }
    toast(`Ще ти напомним на ${fmtDate(end)}`);
  };
}
function phasesFor(g, weeks) {
  const ph = g.phases; const n = ph.length; const per = Math.max(1, Math.round(weeks / n));
  return ph.map((t, i) => { const a = i * per + 1, b = i === n - 1 ? weeks : Math.min(weeks, (i + 1) * per); return [a >= b ? `Седмица ${a}` : `Седмици ${a}–${b}`, t]; });
}

/* Меню за 7 дни според целта */
const BREAKF = {
  base: ['Кисело мляко с овесени ядки и плод', 'Пълнозърнест хляб с яйце и домат', 'Овесена каша с ябълка и канела', 'Извара с мед и орехи', 'Омлет със зеленчуци', 'Пълнозърнест хляб с извара и краставица', 'Мюсли без захар с прясно мляко'],
  chol: ['Овесена каша с ябълка и орехи', 'Пълнозърнест хляб с авокадо и домат', 'Кисело мляко 2% с овес и боровинки', 'Овесени ядки с бадеми', 'Ръжен хляб с хумус и зеленчуци', 'Ечемичена каша с круша', 'Овесена каша с ленено семе'],
  sugar: ['2 яйца със зеленчуци', 'Кисело мляко без захар с орехи', 'Пълнозърнест хляб с извара', 'Омлет с гъби и спанак', 'Овесени ядки с канела (без захар)', 'Яйце, сирене и краставица', 'Кисело мляко с ленено семе'],
  iron: ['Яйца с печени чушки и пълнозърнест хляб', 'Овесени ядки с тиквени семки и портокал', 'Бобена салата с лимон', 'Омлет със спанак и чаша фреш', 'Хляб с хумус и чушки', 'Кисело мляко с плодове (поне 1 ч. след чая)', 'Яйца и ягоди'],
  stress: ['Овесена каша с банан и бадеми', 'Кисело мляко с мед и орехи', 'Пълнозърнест хляб с яйце и авокадо', 'Извара с тиквени семки', 'Мюсли с кисело мляко', 'Омлет и чаша прясно мляко', 'Банан и шепа кашу'],
  sleep: ['Кисело мляко с овес', 'Яйце и пълнозърнест хляб', 'Овесена каша с банан', 'Извара с плодове', 'Омлет със зеленчуци', 'Мюсли', 'Хляб със сирене и домат'],
};
const SNACK = { base: ['Ябълка', 'Шепа ядки', 'Морков и хумус', 'Кисело мляко', 'Круша', 'Портокал', 'Шепа бадеми'], sugar: ['Шепа орехи', 'Краставица и сирене', 'Кисело мляко без захар', 'Морков', 'Ябълка с фъстъчено масло', 'Шепа бадеми', 'Домат и яйце'], iron: ['Тиквени семки', 'Портокал', 'Сушени кайсии', 'Ягоди', 'Киви', 'Шепа бадеми', 'Мандарина'] };
function weekPlan(g) {
  const rnd = seeded(isoWeek() + g.id);
  const fl = g.flag; const pr = P();
  const good = r => {
    if (!prefRecipeOk(r, false)) return -99;
    const notes = r.ing.map(i => (CAT_NOTES[fl] || {})[i[2]]).filter(Boolean);
    if (fl === 'weight' && r.group === 'pastry') return -5;
    return notes.filter(n => n[0] === '+').length - notes.filter(n => n[0] === '−').length * 2 + rnd() * 1.5;
  };
  const pool = gr => RECIPES.filter(r => gr.includes(r.group) && !r.holiday).map(r => [r, good(r)]).filter(x => x[1] > -3).sort((a, b) => b[1] - a[1]).map(x => x[0]);
  const lunch = pool(['soup', 'main']), dinner = pool(['main', 'salad']);
  const bk = BREAKF[g.id] || BREAKF[{ tg: 'chol', liver: 'chol', weight: 'sugar', uric: 'base', vitd: 'base', bp: 'chol', energy: 'stress', immunity: 'base', digest: 'base' }[g.id]] || BREAKF.base;
  const sn = SNACK[{ sugar: 'sugar', weight: 'sugar', iron: 'iron' }[g.id]] || SNACK.base;
  const teas = herbsFor(g).filter(h => h.type === 'tea' || h.type === 'drink').map(h => h.n);
  const days = ['Понеделник', 'Вторник', 'Сряда', 'Четвъртък', 'Петък', 'Събота', 'Неделя'];
  return days.map((day, i) => { const l = lunch[i % Math.max(1, lunch.length)] || null; let j = (i + 3) % Math.max(1, dinner.length); if (dinner.length > 1 && dinner[j] === l) j = (j + 1) % dinner.length; return { day, b: bk[i % bk.length], l, d: dinner[j] || null, lt: 'Супа и салата', dt: 'Зеленчуци и белтък', s: sn[i % sn.length], t: teas.length ? teas[i % teas.length] : 'Вода' }; });
}

/* ─── 3. Аптеката на баба ───────────────────────────────────────────────── */
// ev: 2 — има научни доказателства, 1 — ограничени, 0 — народна традиция
const HERBS = [
  { n: 'Маточина', e: '🍃', type: 'tea', g: ['stress', 'sleep', 'digest'], use: 'Успокоява нервите, помага при безсъние и нервен стомах.', prep: '1 с.л. на 250 мл вряла вода, 10 мин под капак. Вечер.', ev: 1, warn: 'Може да засили сънотворни; внимание при лечение на щитовидната жлеза.' },
  { n: 'Лайка', e: '🌼', type: 'tea', g: ['sleep', 'stress', 'digest', 'immunity'], use: 'Отпуска, успокоява стомаха, гаргара при възпалено гърло.', prep: '1 с.л. на 250 мл, 5–10 мин.', ev: 1, warn: 'Алергия при чувствителност към амброзия/сложноцветни.' },
  { n: 'Липа', e: '🌳', type: 'tea', g: ['immunity', 'sleep'], use: 'Традиционно при настинка — потогонна, успокояваща.', prep: '1 с.л. цвят на 250 мл, 10 мин; с мед и лимон.', ev: 0, warn: '' },
  { n: 'Мента', e: '🌿', type: 'tea', g: ['digest', 'energy'], use: 'При подуване и тежест в стомаха; освежава.', prep: '1 ч.л. на чаша, 5–7 мин.', ev: 2, warn: 'Може да влоши киселините (рефлукс).' },
  { n: 'Шипка', e: '🌹', type: 'tea', g: ['immunity', 'iron', 'energy'], use: 'Богата на витамин C — традиционно за имунитет; помага за усвояване на желязото.', prep: '2 с.л. смачкани плодове, залейте с гореща (не вряща) вода, 6–8 ч. в термос.', ev: 1, warn: '' },
  { n: 'Мащерка (чубрица мащерка)', e: '🌱', type: 'tea', g: ['immunity'], use: 'При кашлица и простуда — отхрачващо.', prep: '1 ч.л. на чаша, 10 мин; с мед.', ev: 1, warn: 'Не в големи количества при бременност.' },
  { n: 'Мурсалски чай', e: '⛰️', type: 'tea', g: ['immunity', 'energy', 'digest'], use: 'Родопски чай — традиционно за дишане, стомах и тонус.', prep: '1 стрък на 500 мл, 10 мин.', ev: 0, warn: '' },
  { n: 'Коприва', e: '🌿', type: 'food', g: ['iron', 'immunity'], use: 'Пролетна чорба или каша — съдържа желязо, калций и витамин C.', prep: 'Млади връхчета, бланширани 1–2 мин; чорба с ориз или в баница.', ev: 0, warn: 'Пикочогонна — внимание при лекарства за кръвно и литий.' },
  { n: 'Глог', e: '🍒', type: 'tea', g: ['bp', 'stress'], use: 'Традиционно за сърцето и леко понижаване на кръвното.', prep: '1 ч.л. плод/цвят на чаша, 15 мин.', ev: 1, warn: 'Само след консултация при прием на лекарства за сърце и кръвно.' },
  { n: 'Хибискус', e: '🌺', type: 'tea', g: ['bp', 'chol'], use: 'Има проучвания за умерено понижаване на кръвното.', prep: '1 ч.л. на чаша, 5–10 мин; пие се топъл или студен.', ev: 1, warn: 'Може да засили лекарствата за кръвно; не при бременност.' },
  { n: 'Зелен чай', e: '🍵', type: 'tea', g: ['chol', 'weight', 'energy'], use: 'Катехините имат слаб ефект върху LDL и обмяната.', prep: 'Вода 75–80 °C, 2–3 мин.', ev: 1, warn: 'Съдържа кофеин; да не се пие с храна при анемия.' },
  { n: 'Канела', e: '🟤', type: 'spice', g: ['sugar'], use: 'Подправка, която прави каши и плодове сладки без захар.', prep: '½ ч.л. в каша, кисело мляко, печена ябълка.', ev: 1, warn: 'Касия канелата в големи количества натоварва черния дроб (кумарин) — предпочитайте цейлонска.' },
  { n: 'Джинджифил', e: '🫚', type: 'drink', g: ['digest', 'immunity'], use: 'Помага при гадене; затопля при простуда.', prep: '3–4 резенчета в гореща вода с лимон и мед, 10 мин.', ev: 2, warn: 'Внимание при антикоагуланти и камъни в жлъчката.' },
  { n: 'Куркума („златно мляко“)', e: '🟡', type: 'drink', g: ['stress', 'sleep', 'immunity'], use: 'Топло мляко с куркума и щипка черен пипер — вечерен ритуал.', prep: '250 мл мляко, ½ ч.л. куркума, щипка пипер, мед.', ev: 1, warn: 'Добавки с куркумин — внимание при антикоагуланти и жлъчка.' },
  { n: 'Мед и лимон', e: '🍯', type: 'drink', g: ['immunity'], use: 'Успокоява кашлицата — особено вечер.', prep: '1 ч.л. мед в топла (не гореща) вода с лимон.', ev: 2, warn: 'Не се дава на бебета под 1 година.' },
  { n: 'Кисело мляко / айрян', e: '🥛', type: 'drink', g: ['digest', 'immunity', 'bp', 'energy'], use: 'Българската закваска — пробиотик, белтък и калций.', prep: 'Чаша дневно; айрян — мляко, вода и щипка сол (по-малко сол при кръвно).', ev: 2, warn: '' },
  { n: 'Сок от цвекло', e: '🟣', type: 'drink', g: ['bp', 'energy'], use: 'Нитратите в цвеклото понижават леко кръвното и подкрепят издръжливостта.', prep: '200 мл прясно изцеден сок, разреден с ябълка.', ev: 2, warn: 'Оцветява урината; внимание при камъни в бъбреците (оксалати).' },
  { n: 'Сок от кисело зеле', e: '🥬', type: 'drink', g: ['digest', 'immunity'], use: 'Традиционно при тежък стомах и „махмурлук“ — ферментирал, с витамин C.', prep: 'Малка чаша преди хранене.', ev: 0, warn: 'Много сол — не при високо кръвно и бъбречни проблеми.' },
  { n: 'Чесън', e: '🧄', type: 'food', g: ['bp', 'chol', 'immunity'], use: 'Слаб ефект върху кръвното и холестерола при редовна употреба.', prep: '1–2 скилидки дневно в храната, нарязани 10 мин преди готвене.', ev: 1, warn: 'Засилва антикоагуланти; спрете 7 дни преди операция.' },
  { n: 'Орехи с мед', e: '🌰', type: 'food', g: ['stress', 'energy', 'chol'], use: 'Бабината „енергийна хапка“ — омега-3, магнезий.', prep: '4–5 ореха и 1 ч.л. мед следобед.', ev: 1, warn: 'Калорични — внимание при сваляне на тегло.' },
  { n: 'Овесена отвара / каша', e: '🥣', type: 'food', g: ['chol', 'sugar', 'digest'], use: 'Бета-глюканът в овеса понижава LDL холестерола.', prep: '40–60 г овес дневно като каша.', ev: 2, warn: 'При целиакия — само сертифициран безглутенов овес.' },
  { n: 'Ябълков оцет', e: '🍎', type: 'drink', g: ['sugar'], use: 'Има малки проучвания за по-плавна захар след хранене.', prep: '1 с.л. в чаша вода преди храна.', ev: 1, warn: 'Само разреден — уврежда емайла и хранопровода; не при рефлукс.' },
  { n: 'Жълт кантарион', e: '🌕', type: 'tea', g: ['stress'], use: 'Традиционно при потиснатост.', prep: '1 ч.л. на чаша, 10 мин.', ev: 2, warn: '⚠️ Сериозни взаимодействия: противозачатъчни, антидепресанти, антикоагуланти, сърдечни и много други лекарства. Само след консултация с лекар!' },
  { n: 'Бъз (цвят)', e: '🤍', type: 'tea', g: ['immunity'], use: 'Традиционно при простуда — потогонен.', prep: '1 с.л. цвят на чаша, 10 мин.', ev: 0, warn: 'Само цвят и узрели сварени плодове — суровите плодове и листа са токсични.' },
  { n: 'Риган', e: '🌿', type: 'tea', g: ['digest', 'immunity'], use: 'При кашлица и тежко храносмилане.', prep: '1 ч.л. на чаша, 10 мин.', ev: 0, warn: 'Не при бременност в големи количества.' },
  { n: 'Тиквени семки', e: '🎃', type: 'food', g: ['iron', 'sleep', 'stress'], use: 'Желязо, цинк, магнезий и триптофан.', prep: 'Шепа (30 г) дневно, сурови или леко печени без сол.', ev: 1, warn: '' },
  { n: 'Пелин', e: '🌾', type: 'tea', g: ['digest'], use: 'Горчив — традиционно за апетит и храносмилане.', prep: 'Щипка на чаша, кратко — много е горчив.', ev: 0, warn: '⚠️ Не при бременност, кърмене и епилепсия; не продължително.' },
  { n: 'Вода с лимон сутрин', e: '🍋', type: 'drink', g: ['energy', 'digest', 'weight'], use: 'Навик за повече вода сутрин.', prep: 'Чаша хладка вода с няколко капки лимон.', ev: 0, warn: 'Изплакнете устата с вода — киселината уврежда емайла.' },
];
const EV = [['Народна традиция', 'warn'], ['Ограничени доказателства', 'promo'], ['Има доказателства', 'best']];
function herbsFor(g) { return HERBS.filter(h => h.g.includes(g.id) || (g.id === 'chol' && h.g.includes('chol')) || (g.id === 'tg' && h.g.includes('chol')) || (g.id === 'liver' && h.g.includes('weight'))).sort((a, b) => b.ev - a.ev); }
function herbRow(h) {
  const preg = (DS().profile && (DS().profile.cond || []).includes('preg'));
  return `<div class="suggest"><div class="e">${h.e}</div><div class="grow"><b>${esc(h.n)}</b> <span class="tag ${EV[h.ev][1]}">${EV[h.ev][0]}</span>
    <div class="small">${esc(h.use)}</div><div class="small muted">☕ ${esc(h.prep)}</div>${h.warn ? `<div class="small" style="color:var(--bad)">⚠️ ${esc(h.warn.replace(/^⚠️\s*/, ''))}</div>` : ''}${preg && /бременност/.test(h.warn) ? '<div class="small" style="color:var(--bad);font-weight:700">Не е подходящо при бременност/кърмене</div>' : ''}</div></div>`;
}
let herbGoal = 'all';
function drHerbs(el) {
  const list = HERBS.filter(h => herbGoal === 'all' || h.g.includes(herbGoal)).sort((a, b) => b.ev - a.ev);
  el.innerHTML = `<div class="card hero" style="background:linear-gradient(135deg,#5a8f29,#a8c66c)"><div class="big" style="font-size:22px">🌿 Аптеката на баба</div><div class="small" style="opacity:.92">Билки, чайове и домашни напитки, с които нашите баби и дядовци са се грижили за себе си — с бележка какво казва науката.</div></div>
    <div class="chips"><button class="chip ${herbGoal === 'all' ? 'on' : ''}" data-hg="all">Всички</button>${[['stress', '🧘 Нерви'], ['sleep', '😴 Сън'], ['energy', '⚡ Енергия'], ['immunity', '🛡️ Имунитет'], ['digest', '🌀 Стомах'], ['bp', '❤️ Кръвно'], ['chol', '🧈 Холестерол'], ['sugar', '🍬 Захар'], ['iron', '🩸 Желязо']].map(([k, n]) => `<button class="chip ${herbGoal === k ? 'on' : ''}" data-hg="${k}">${n}</button>`).join('')}</div>
    <div class="card">${list.map(herbRow).join('')}</div>
    <div class="notice warn">⚠️ <div>Билките също имат действие и взаимодействия с лекарства. Ако приемаш лекарства (особено за кръвно, сърце, разреждане на кръвта, антидепресанти, противозачатъчни), при бременност или кърмене — попитай лекар или фармацевт. Не заменят лечението.</div></div>`;
  el.querySelectorAll('[data-hg]').forEach(b => b.onclick = () => { herbGoal = b.dataset.hg; drHerbs(el); });
}

/* ─── 4. Дневник на самочувствието ──────────────────────────────────────── */
function drDiary(el) {
  const st = DS(); if (!st.diary) st.diary = {};
  const t = todayISO(); const today = st.diary[t] || {};
  const scale = (k, lab, ems) => `<div style="margin:8px 0"><div class="small muted">${lab}</div><div class="row" style="gap:6px">${ems.map((e, i) => `<button class="chip ${today[k] === i + 1 ? 'on' : ''}" data-dk="${k}" data-dv="${i + 1}" style="font-size:20px;padding:6px 10px">${e}</button>`).join('')}</div></div>`;
  const days = []; for (let i = 13; i >= 0; i--) { const d = iso(addD(new Date(), -i)); days.push([d, st.diary[d] || {}]); }
  const col = (k, c) => `<div class="cols" style="height:70px">${days.map(([d, v]) => `<div class="c"><i style="height:${(v[k] || 0) * 18}%;background:${c}"></i>${new Date(d).getDate()}</div>`).join('')}</div>`;
  el.innerHTML = `<div class="card"><h2>📔 Как си днес?</h2>
      ${scale('e', 'Енергия', ['😩', '😕', '😐', '🙂', '💪'])}${scale('s', 'Сън', ['😫', '😴', '😐', '🙂', '😌'])}${scale('m', 'Нерви / стрес', ['🤯', '😣', '😐', '🙂', '😊'])}
      <div class="row" style="gap:8px;margin-top:8px"><input class="input" id="dW" inputmode="decimal" placeholder="Тегло (кг)" value="${today.w || ''}" style="max-width:140px"><input class="input" id="dBp" placeholder="Кръвно (напр. 128/82)" value="${today.bp || ''}"></div>
      <button class="btn primary block" id="dSave" style="margin-top:10px">Запиши</button></div>
    <div class="card"><h2>📈 Последните 2 седмици</h2><div class="small muted">Енергия</div>${col('e', '#ff9a3d')}<div class="small muted">Сън</div>${col('s', '#5b86e5')}<div class="small muted">Спокойствие</div>${col('m', '#2bb673')}</div>`;
  el.querySelectorAll('[data-dk]').forEach(b => b.onclick = () => { today[b.dataset.dk] = +b.dataset.dv; st.diary[t] = today; save(); drDiary(el); });
  el.querySelector('#dSave').onclick = () => {
    const w = parseFloat((el.querySelector('#dW').value || '').replace(',', '.')); const bp = /(\d{2,3})\s*\/\s*(\d{2,3})/.exec(el.querySelector('#dBp').value || '');
    if (w > 25 && w < 300) { today.w = w; const L = st.labs; const last = (L.weight || []).slice(-1)[0]; if (!last || last.d !== t) (L.weight = L.weight || []).push({ d: t, v: w }); else last.v = w; }
    if (bp) { today.bp = bp[1] + '/' + bp[2]; ['sys', 'dia'].forEach((k, i) => { const L = st.labs; const v = +bp[i + 1]; const last = (L[k] || []).slice(-1)[0]; if (!last || last.d !== t) (L[k] = L[k] || []).push({ d: t, v }); else last.v = v; }); }
    st.diary[t] = today; save(); toast('Записано'); drDiary(el);
  };
}

/* ─── 5. PDF ───────────────────────────────────────────────────────────── */
async function drPdf() {
  const st = DS(); if (!st.profile) { toast('Първо попълни профила'); return; }
  toast('Подготвям PDF…');
  try { await loadScript('vendor/jspdf.min.js'); await loadScript('vendor/fontR.js'); await loadScript('vendor/fontB.js'); } catch (e) { toast('Неуспешно зареждане'); return; }
  const { jsPDF } = window.jspdf; const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('dv.ttf', window.MAMA_FONT_R); doc.addFont('dv.ttf', 'dv', 'normal');
  doc.addFileToVFS('dvb.ttf', window.MAMA_FONT_B); doc.addFont('dvb.ttf', 'dv', 'bold');
  const W = 210, M = 15; let y = 0;
  const page = () => { doc.addPage(); y = 18; };
  const need = h => { if (y + h > 282) page(); };
  const txt = (s, size = 10, bold = false, color = [23, 32, 29], indent = 0) => {
    doc.setFont('dv', bold ? 'bold' : 'normal'); doc.setFontSize(size); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(s).replace(/[^\u0000-ӿ‐-€№]/g, '').trim(), W - 2 * M - indent);
    lines.forEach(l => { need(size * 0.45); doc.text(l, M + indent, y); y += size * 0.45; }); y += 1.2;
  };
  const h2 = s => { y += 3; need(12); doc.setFillColor(232, 247, 238); doc.roundedRect(M, y - 5, W - 2 * M, 8, 2, 2, 'F'); txt(s, 12.5, true, [11, 138, 95], 2); y += 1; };
  // заглавие
  doc.setFillColor(11, 138, 95); doc.rect(0, 0, W, 30, 'F'); doc.setFillColor(139, 211, 74); doc.rect(0, 30, W, 2, 'F');
  doc.setFont('dv', 'bold'); doc.setFontSize(20); doc.setTextColor(255, 255, 255); doc.text('MAMA · My Doctor', M, 14);
  doc.setFont('dv', 'normal'); doc.setFontSize(10.5); doc.text(`Персонален анализ и програма · ${new Date().toLocaleDateString('bg-BG')}`, M, 22);
  y = 40;
  const p = st.profile; const fl = drFlags(); const { primary } = drPatterns(fl); const t = drTargets(fl); const bmi = bmiOf(p);
  txt(`${p.sex === 'f' ? 'Жена' : 'Мъж'}, ${p.age} г., ${p.height} см, ${latest('weight') ?? p.weight} кг${bmi ? ', ИТМ ' + bmi.toFixed(1) : ''}${P().name ? ' · ' + P().name : ''}`, 10.5, true);
  if ((p.cond || []).length) txt('Състояния: ' + p.cond.map(id => (DR_COND.find(c => c.id === id) || {}).n).filter(Boolean).join(', '), 9.5);
  h2('Показатели');
  const rows = IND.filter(i => valueOf(i.k) != null);
  if (!rows.length) txt('Няма въведени изследвания.', 9.5);
  rows.forEach(ind => {
    const v = valueOf(ind.k); const e = evalInd(ind, v, p); need(6);
    const col = !e ? [93, 107, 102] : e.st === 'ok' ? [18, 146, 94] : ['high', 'crit'].includes(e.st) ? [210, 59, 47] : [201, 122, 0];
    doc.setFont('dv', 'normal'); doc.setFontSize(9.5); doc.setTextColor(23, 32, 29); doc.text(ind.n, M + 2, y);
    doc.setFont('dv', 'bold'); doc.text(`${fmtNum(v, ind.step || 0.1)} ${ind.u}`, 120, y);
    doc.setTextColor(...col); doc.text(e ? e.label : '', 152, y); y += 5.2;
  });
  const g = st.goal ? GOALS2.find(x => x.id === st.goal.id) : suggestGoal();
  if (g) {
    const weeks = st.goal ? st.goal.weeks : g.w[0]; const f = g.ind ? forecast(g, weeks) : null;
    h2(`Цел: ${g.n} · ${weeks < 26 ? weeks + ' седмици' : '6 месеца'}`);
    if (f) txt(`Сега ${fmtNum(f.cur, f.ind.step || 0.1)} ${f.ind.u} → очаквано ${fmtNum(f.lo, f.ind.step || 0.1)}–${fmtNum(f.hi, f.ind.step || 0.1)} ${f.ind.u} след ${f.w} седмици. ${f.reach === false ? 'Само с храна вероятно няма да се стигне нормата — нужна е консултация с лекар.' : f.reach ? 'Нормата е реалистична при спазване на програмата.' : ''}`, 9.5);
    txt(g.note, 9, false, [93, 107, 102]);
    phasesFor(g, weeks).forEach(x => txt(`• ${x[0]}: ${x[1]}`, 9.5, false, [23, 32, 29], 2));
    h2('Меню за 7 дни');
    weekPlan(g).forEach(d => { txt(d.day, 10, true, [11, 138, 95]); txt(`Закуска: ${d.b} · Обяд: ${d.l ? d.l.name : d.lt} · Междинно: ${d.s} · Вечеря: ${d.d ? d.d.name : d.dt} · Напитка: ${d.t}`, 9, false, [23, 32, 29], 2); });
  }
  h2(`Хранителен режим: ${PATTERNS[primary].n}`);
  if (t) txt(`${t.kcal} kcal/ден (${t.mode}) · белтък ${t.prot} г · фибри ${t.fiber}+ г · сол под 5 г${t.water ? ' · вода ' + t.water + ' л' : ''}`, 9.5, true);
  PATTERNS[primary].rules.forEach(r => txt('• ' + r, 9.5, false, [23, 32, 29], 2));
  if (g) { h2('Билки и напитки'); herbsFor(g).slice(0, 5).forEach(hb => txt(`• ${hb.n} — ${hb.use} ${hb.prep}${hb.warn ? ' Внимание: ' + hb.warn : ''}`, 9, false, [23, 32, 29], 2)); }
  const refs = drReferrals();
  if (refs.length) { h2('Консултация с лекар'); refs.forEach(r => txt(`• ${r.n}: ${r.label} → ${r.ref} (${URG[r.urg]})`, 9.5, false, r.urg === 2 ? [210, 59, 47] : [23, 32, 29], 2)); }
  y += 4; txt('Документът е информационен, създаден от приложението MAMA по въведените данни и публикуваните препоръки на СЗО, ESC, ADA, EASL, KDIGO и др. Не поставя диагноза и не замества лекар. Промени в лечението — само с лекуващия лекар.', 8, false, [93, 107, 102]);
  const n = doc.getNumberOfPages(); for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('dv', 'normal'); doc.setFontSize(8); doc.setTextColor(150); doc.text(`MAMA — My Amazing Market Area · стр. ${i}/${n}`, M, 292); }
  const fname = `MAMA-My-Doctor-${todayISO()}.pdf`;
  const FS = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Filesystem;
  const SH = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share;
  if (NATIVE && FS && SH) {
    try {
      const data = doc.output('datauristring').split(',')[1];
      const r = await FS.writeFile({ path: fname, data, directory: 'CACHE' });
      await SH.share({ title: 'MAMA — My Doctor', text: 'Моят анализ и програма от MAMA', url: r.uri, dialogTitle: 'Запази или изпрати PDF' });
    } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('Неуспешно споделяне на PDF'); }
  } else doc.save(fname);
}
