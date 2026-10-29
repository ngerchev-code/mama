/* MAMA — лекарства, вода, семейни профили, касова бележка от снимка. */
'use strict';

/* ─── Семейни профили ──────────────────────────────────────────────────── */
const PERSONAL = ['doctor', 'meds', 'water'];
function FAM() {
  if (!S.family) {
    S.family = [{ id: 'me', name: (P().name || 'Аз').trim() || 'Аз', e: '🙂' }];
    S.curP = 'me';
  }
  return S.family;
}
function curPerson() { FAM(); return S.family.find(x => x.id === S.curP) || S.family[0]; }
function switchPerson(id) {
  FAM(); const cur = curPerson(); if (cur.id === id) return;
  cur.data = {}; PERSONAL.forEach(k => { cur.data[k] = S[k]; });
  const nx = S.family.find(x => x.id === id); if (!nx) return;
  PERSONAL.forEach(k => { S[k] = (nx.data && nx.data[k]) || undefined; });
  if (!S.doctor) S.doctor = { profile: null, labs: {} };
  nx.data = null; S.curP = id; save();
  drTab = 'plan'; render(); toast(`Профил: ${nx.e} ${nx.name}`);
  scheduleMeds();
}
function familySheet() {
  FAM();
  const E = ['🙂', '👩', '👨', '👧', '👦', '👵', '👴', '🧒', '👶'];
  openSheet(`<h3>👨‍👩‍👧 Семейство</h3><div class="muted small">Всеки член има собствен профил в My Doctor, изследвания, лекарства и вода. Списъкът за пазар и покупките са общи.</div>
    <ul class="list" style="margin-top:8px">${S.family.map(p => `<li class="li" data-pid="${p.id}"><div class="lead">${p.e}</div><div class="grow"><div class="title">${esc(p.name)}</div><div class="muted small">${p.id === S.curP ? 'активен' : 'натисни, за да превключиш'}</div></div>${p.id !== 'me' ? `<button class="iconbtn" data-del="${p.id}" style="width:32px;height:32px">${I.del}</button>` : ''}</li>`).join('')}</ul>
    <div class="row" style="gap:8px;margin-top:10px"><select class="input" id="fE" style="max-width:76px">${E.map(e => `<option>${e}</option>`).join('')}</select><input class="input" id="fN" placeholder="Име (напр. Мама, Иво)"><button class="btn primary small" id="fAdd">Добави</button></div>`, el => {
    el.querySelectorAll('[data-pid]').forEach(b => b.onclick = e => { if (e.target.closest('[data-del]')) return; closeSheet(); switchPerson(b.dataset.pid); });
    el.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if (!confirm('Изтриване на профила и данните му?')) return; if (S.curP === b.dataset.del) switchPerson('me'); S.family = S.family.filter(x => x.id !== b.dataset.del); save(); familySheet(); });
    el.querySelector('#fAdd').onclick = () => { const n = el.querySelector('#fN').value.trim(); if (!n) return; const id = uid(); S.family.push({ id, name: n.slice(0, 20), e: el.querySelector('#fE').value, data: { doctor: { profile: null, labs: {} } } }); save(); closeSheet(); switchPerson(id); setTimeout(() => drWizard(0), 300); };
  });
}

/* ─── Лекарства ────────────────────────────────────────────────────────── */
function MEDS() { if (!S.meds) S.meds = { list: [], log: {} }; return S.meds; }
const MED_TIPS = [
  [/тироксин|еутирокс|euthyrox|letrox|летрокс|l-?thyrox/i, 'Сутрин на гладно с вода, 30–60 мин преди закуска и кафе; калций, желязо и соя — 4 часа по-късно.'],
  [/желязо|ferr|сорбифер|тардиферон|iron/i, 'Най-добре на гладно или според лекаря, с витамин C; не с чай, кафе, мляко и калций.'],
  [/калций|calcium/i, 'Отделно от желязо и хормон на щитовидната жлеза поне 4 часа.'],
  [/статин|аторвастатин|розувастатин|симвастатин|atorva|rosuva|simva/i, 'Без грейпфрут при симвастатин/аторвастатин. Мускулни болки — към лекар.'],
  [/варфарин|синтром|warfarin|acenocoumarol/i, 'Внимание с билки (жълт кантарион, чесън, джинджифил) и рязка промяна на зелените листни зеленчуци.'],
  [/метформин|metformin/i, 'С храна или след хранене — по-малко стомашни оплаквания.'],
  [/антибиотик|амоксицилин|азитромицин|ципрофлоксацин|доксициклин|amoxi|azithro|cipro|doxy/i, 'Пий до края на курса, в точните часове. Ципро/доксициклин — не с мляко и калций.'],
  [/ибупрофен|нурофен|диклофенак|ibuprofen|diclofenac/i, 'След хранене; не продължително без лекар.'],
];
function medTip(name) { const t = MED_TIPS.find(x => x[0].test(name)); return t ? t[1] : ''; }
function medsToday() {
  const m = MEDS(); const d = todayISO(); const wd = new Date().getDay();
  const doses = [];
  m.list.filter(x => (!x.end || x.end >= d) && (!x.start || x.start <= d) && (!x.days || !x.days.length || x.days.includes(wd)))
    .forEach(x => x.times.forEach(t => doses.push({ med: x, t, key: `${x.id}@${t}`, taken: !!(m.log[d] || {})[`${x.id}@${t}`] })));
  return doses.sort((a, b) => a.t.localeCompare(b.t));
}
async function scheduleMeds() {
  const ln = LN(); if (!ln) return;
  try {
    const st = await ln.checkPermissions(); if (st.display !== 'granted') return;
    const pend = await ln.getPending(); const old = (pend.notifications || []).filter(n => n.id >= 600 && n.id < 700).map(n => ({ id: n.id }));
    if (old.length) await ln.cancel({ notifications: old });
    const list = []; let id = 600; const who = curPerson();
    MEDS().list.forEach(x => x.times.forEach(t => {
      if (id >= 690) return; const [h, mi] = t.split(':').map(Number);
      list.push({ id: id++, channelId: 'mama', title: `💊 ${x.name}${x.dose ? ' · ' + x.dose : ''}`, body: `${who.id !== 'me' ? who.e + ' ' + who.name + ': ' : ''}време е за лекарството${x.food ? ' (' + x.food + ')' : ''}.`, schedule: { on: { hour: h, minute: mi }, allowWhileIdle: true }, extra: { meds: 1 }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' });
    }));
    if (list.length) await ln.schedule({ notifications: list });
  } catch (e) { /* */ }
}
function medEdit(med) {
  const x = med || { id: uid(), name: '', dose: '', times: ['08:00'], food: '', days: [], start: todayISO(), end: '' };
  const WDN = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  openSheet(`<h3>💊 ${med ? 'Редакция' : 'Ново лекарство'}</h3>
    <label class="lbl">Име</label><input class="input" id="mN" value="${esc(x.name)}" placeholder="напр. Еутирокс, Витамин D, Желязо">
    <label class="lbl">Доза</label><input class="input" id="mD" value="${esc(x.dose)}" placeholder="напр. 50 мкг, 1 таблетка">
    <label class="lbl">Часове</label><div id="mT">${x.times.map(t => `<input class="input mt" type="time" value="${t}" style="margin-bottom:6px">`).join('')}</div><button class="btn tonal small" id="mTadd">+ час</button>
    <label class="lbl">Как</label><select class="input" id="mF">${['', 'на гладно', 'преди хранене', 'с храна', 'след хранене', 'преди сън'].map(o => `<option ${x.food === o ? 'selected' : ''} value="${o}">${o || '—'}</option>`).join('')}</select>
    <label class="lbl">Дни (празно = всеки ден)</label><div class="chips">${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${x.days.includes(d) ? 'on' : ''}" data-wd="${d}">${WDN[d]}</button>`).join('')}</div>
    <div class="row" style="gap:8px"><div class="grow"><label class="lbl">От</label><input class="input" type="date" id="mS" value="${x.start || ''}"></div><div class="grow"><label class="lbl">До (празно = постоянно)</label><input class="input" type="date" id="mE" value="${x.end || ''}"></div></div>
    <div class="notice info" id="mTip" style="margin-top:10px;${medTip(x.name) ? '' : 'display:none'}">💡 <div>${esc(medTip(x.name))}</div></div>
    <button class="btn primary block" id="mSave" style="margin-top:12px">Запиши</button>${med ? '<button class="btn tonal block" id="mDel" style="margin-top:8px;color:var(--bad)">Изтрий</button>' : ''}
    <div class="muted small" style="margin-top:8px">Приемът и дозите — само по назначение на лекаря.</div>`, el => {
    el.querySelector('#mN').oninput = e => { const t = medTip(e.target.value); const b = el.querySelector('#mTip'); b.style.display = t ? '' : 'none'; b.querySelector('div').textContent = t; };
    el.querySelector('#mTadd').onclick = () => el.querySelector('#mT').insertAdjacentHTML('beforeend', '<input class="input mt" type="time" value="20:00" style="margin-bottom:6px">');
    el.querySelectorAll('[data-wd]').forEach(b => b.onclick = () => b.classList.toggle('on'));
    el.querySelector('#mSave').onclick = () => {
      const name = el.querySelector('#mN').value.trim(); if (!name) return toast('Въведи име');
      Object.assign(x, { name, dose: el.querySelector('#mD').value.trim(), times: [...el.querySelectorAll('.mt')].map(i => i.value).filter(Boolean).sort(), food: el.querySelector('#mF').value,
        days: [...el.querySelectorAll('[data-wd].on')].map(b => +b.dataset.wd), start: el.querySelector('#mS').value, end: el.querySelector('#mE').value });
      if (!x.times.length) x.times = ['08:00'];
      const m = MEDS(); if (!med) m.list.push(x); save(); closeSheet(); render(); scheduleMeds();
      if (LN()) LN().requestPermissions().catch(() => {});
      toast('Записано — ще ти напомняме');
    };
    const del = el.querySelector('#mDel'); if (del) del.onclick = () => { MEDS().list = MEDS().list.filter(z => z.id !== x.id); save(); closeSheet(); render(); scheduleMeds(); };
  });
}
function medsCard() {
  const doses = medsToday(); if (!doses.length) return '';
  const done = doses.filter(d => d.taken).length; const who = curPerson();
  return `<div class="card" id="medsCard"><h2>💊 Лекарства днес ${S.family && S.family.length > 1 ? `<span class="muted small" style="font-weight:400">· ${who.e} ${esc(who.name)}</span>` : ''}<span class="more">${done}/${doses.length}</span></h2>
    ${doses.map(d => `<div class="row" style="padding:6px 0;gap:10px"><button class="check ${d.taken ? 'on' : ''}" data-take="${d.key}">${d.taken ? I.check : ''}</button><div class="grow ${d.taken ? 'muted' : ''}"><b>${d.t}</b> · ${esc(d.med.name)}${d.med.dose ? ' · ' + esc(d.med.dose) : ''}${d.med.food ? `<div class="small muted">${esc(d.med.food)}</div>` : ''}</div></div>`).join('')}</div>`;
}
function bindMeds(root) {
  root.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { const m = MEDS(); const d = todayISO(); m.log[d] = m.log[d] || {}; m.log[d][b.dataset.take] = !m.log[d][b.dataset.take]; const cut = iso(addD(new Date(), -60)); for (const k in m.log) if (k < cut) delete m.log[k]; save(); render(); });
}
function drMeds(el) {
  const m = MEDS(); const doses = medsToday();
  const days = []; for (let i = 6; i >= 0; i--) { const d = iso(addD(new Date(), -i)); const l = m.log[d] || {}; days.push([d, Object.values(l).filter(Boolean).length]); }
  el.innerHTML = `${medsCard() || '<div class="card empty"><div class="ico">💊</div>Добави лекарствата и добавките си — MAMA ще ти напомня в точния час.</div>'}
    <div class="card"><h2>📋 Моите лекарства</h2>${m.list.length ? `<ul class="list">${m.list.map(x => `<li class="li" data-med="${x.id}"><div class="lead">💊</div><div class="grow"><div class="title">${esc(x.name)} ${x.dose ? '· ' + esc(x.dose) : ''}</div><div class="muted small">${x.times.join(', ')}${x.food ? ' · ' + esc(x.food) : ''}${x.end ? ' · до ' + fmtDate(x.end) : ''}</div></div><span class="muted">›</span></li>`).join('')}</ul>` : '<div class="muted">Няма добавени.</div>'}
      <button class="btn primary block" id="mAdd" style="margin-top:10px">+ Добави лекарство</button></div>
    ${m.list.length ? `<div class="card"><h2>📈 Прием през седмицата</h2><div class="cols" style="height:70px">${days.map(([d, n]) => `<div class="c"><span>${n || ''}</span><i style="height:${Math.min(80, n * 20)}%"></i>${new Date(d).getDate()}</div>`).join('')}</div></div>` : ''}
    <div class="notice warn">⚠️ <div>Напомнянията не заменят лекарските указания. Не спирай и не променяй лечение без лекар.</div></div>`;
  bindMeds(el);
  el.querySelector('#mAdd').onclick = () => medEdit(null);
  el.querySelectorAll('[data-med]').forEach(b => b.onclick = () => medEdit(m.list.find(x => x.id === b.dataset.med)));
}

/* ─── Вода ─────────────────────────────────────────────────────────────── */
function WATER() { if (!S.water) S.water = { goal: 0, days: {}, remind: false }; return S.water; }
function waterGoal() {
  const w = WATER(); if (w.goal) return w.goal;
  const p = (S.doctor && S.doctor.profile) || {}; const kg = latest('weight') || p.weight || 70;
  return Math.round(Math.min(3500, Math.max(1500, kg * 30)) / 250) * 250;
}
function waterToday() { return WATER().days[todayISO()] || 0; }
function waterCard() {
  const ml = waterToday(); const g = waterGoal(); const cups = Math.ceil(g / 250); const done = Math.floor(ml / 250);
  const ckd = S.doctor && S.doctor.profile && (S.doctor.profile.cond || []).includes('ckd');
  return `<div class="card" id="waterCard"><div class="row between"><div><div class="small muted">💧 Вода днес</div><div class="big" style="font-size:24px">${(ml / 1000).toLocaleString('bg-BG', { maximumFractionDigits: 2 })} / ${(g / 1000).toLocaleString('bg-BG')} л</div></div>
    <div class="row" style="gap:6px"><button class="btn tonal small" data-wat="-250">−</button><button class="btn primary small" data-wat="250">+ чаша</button></div></div>
    <div class="cups">${Array.from({ length: cups }, (_, i) => `<span class="${i < done ? 'on' : ''}">💧</span>`).join('')}</div>
    ${ckd ? '<div class="small" style="color:var(--bad)">При бъбречно заболяване количеството течности — по указание на лекаря.</div>' : ''}</div>`;
}
function bindWater(root) {
  root.querySelectorAll('[data-wat]').forEach(b => b.onclick = e => { e.stopPropagation(); const w = WATER(); const d = todayISO(); w.days[d] = Math.max(0, (w.days[d] || 0) + +b.dataset.wat); const cut = iso(addD(new Date(), -60)); for (const k in w.days) if (k < cut) delete w.days[k]; save(); render(); if (+b.dataset.wat > 0 && w.days[d] >= waterGoal() && w.days[d] - 250 < waterGoal()) toast('🎉 Дневната цел за вода е изпълнена!'); });
}
async function scheduleWater() {
  const ln = LN(); if (!ln) return;
  try {
    await ln.cancel({ notifications: [700, 701, 702, 703, 704, 705].map(id => ({ id })) }).catch(() => {});
    if (!WATER().remind) return;
    const st = await ln.requestPermissions(); if (st.display !== 'granted') return;
    await ln.schedule({ notifications: [9, 11, 13, 15, 17, 19].map((h, i) => ({ id: 700 + i, channelId: 'mama', title: '💧 Чаша вода', body: 'Време е за чаша вода. Отбележи я в MAMA с едно натискане.', schedule: { on: { hour: h, minute: 0 }, allowWhileIdle: true }, extra: { go: 'home' }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' })) });
  } catch (e) { /* */ }
}

/* ─── Касова бележка от снимка ─────────────────────────────────────────── */
const RCPT_CHAINS = [[/kaufland|кауфланд/i, 'kaufland'], [/lidl|лидл/i, 'lidl'], [/billa|била|билла/i, 'billa'], [/fantastico|фантастико/i, 'fantastico'], [/t[\s-]?market|т[\s-]?маркет/i, 'tmarket'], [/\bcba\b|цба/i, 'cba'], [/metro|метро/i, 'metro'], [/pro\s?market|про\s?маркет/i, 'promarket'], [/ebag|ебаг/i, 'ebag']];
function parseReceipt(text) {
  const t = text.replace(/\r/g, '');
  const lines = t.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  let chain = 'other'; for (const [rx, id] of RCPT_CHAINS) if (rx.test(t)) { chain = id; break; }
  const num = s => { const m = s.match(/(\d{1,5})[.,](\d{2})(?!\d)/g); return m ? m.map(x => parseFloat(x.replace(',', '.'))) : []; };
  let total = null;
  for (const l of lines) {
    if (/(обща\s*сума|сума\s*за\s*плащане|общо|всичко|total|сума|за\s*плащане)/i.test(l) && !/ддс|dds|vat|ресто|кредит|в\s*брой\s*получ/i.test(l)) {
      const n = num(l); if (n.length) { total = n[n.length - 1]; if (/обща|всичко|плащане|total/i.test(l)) break; }
    }
  }
  if (total == null) { const all = lines.flatMap(num).filter(x => x < 2000); if (all.length) total = Math.max(...all); }
  const dm = /(\d{1,2})[./-](\d{1,2})[./-](20\d{2})/.exec(t);
  const date = dm ? `${dm[3]}-${dm[2].padStart(2, '0')}-${dm[1].padStart(2, '0')}` : todayISO();
  const items = [];
  for (const l of lines) {
    if (/(сума|общо|всичко|ддс|total|в брой|карта|ресто|бон|касиер|фискал|еик|ид\s*№|тел\.|адрес|благодар|клиент|дата|час)/i.test(l)) continue;
    const m = /^([A-Za-zА-Яа-я][A-Za-zА-Яа-я0-9 .%,'"\-/]{2,40}?)\s+[\d.,x* ]*?(\d{1,4}[.,]\d{2})\s*[A-ZА-Я€]?$/.exec(l);
    if (m) { const n = m[1].replace(/\s+\d+([.,]\d+)?\s*(x|\*)?\s*$/i, '').trim(); if (n.length > 2) items.push({ n: n.charAt(0) + n.slice(1).toLowerCase(), c: guessCat(n), q: 1, p: parseFloat(m[2].replace(',', '.')) }); }
  }
  return { chain, total, date: /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(date) <= new Date() ? date : todayISO(), items: items.slice(0, 60) };
}
async function receiptPhoto(file) {
  openSheet(`<h3>🧾 Разчитам бележката…</h3><div class="muted small" id="rSt">Подготовка</div><div style="height:10px;background:var(--surface-2);border-radius:6px;margin-top:10px;overflow:hidden"><div id="rBar" style="height:100%;width:3%;background:var(--primary);transition:width .3s"></div></div>`);
  try {
    await loadScript('vendor/tesseract.min.js');
    const img = await shrinkImage(file, 2000);
    const worker = await Tesseract.createWorker('bul+eng', 1, { workerPath: new URL('vendor/tesseract-worker.min.js', location.href).href, workerBlobURL: false,
      logger: m => { const s = $('#rSt'); if (s && m.status) s.textContent = m.status === 'recognizing text' ? 'Разчитане…' : 'Зареждане…'; const b = $('#rBar'); if (b && m.progress != null) b.style.width = Math.max(3, m.progress * 100) + '%'; } });
    const { data } = await worker.recognize(img); await worker.terminate();
    const r = parseReceipt(data.text || '');
    window._rcpt = r; closeSheet();
    setTimeout(() => { tripDialog(); setTimeout(() => fillTrip(r), 120); }, 250);
  } catch (e) { openSheet(`<h3>Неуспешно разчитане</h3><div class="muted">Провери интернет връзката (първото разчитане изтегля речник) или въведи сумата ръчно.</div>`); }
}
function fillTrip(r) {
  const tc = $('#tc'); if (!tc) return;
  if (r.chain && [...tc.options].some(o => o.value === r.chain)) { tc.value = r.chain; tc.dispatchEvent(new Event('change')); }
  if (r.total) $('#ta').value = r.total.toFixed(2);
  if (r.date) $('#td').value = r.date;
  const tp = $('#tp'); if (tp) tp.insertAdjacentHTML('afterend', `<div class="notice good" style="margin-top:8px">🧾 <div>От бележката: ${esc(chainName(r.chain) || 'магазин')}, ${r.total ? eur(r.total) : 'сума не е открита'}, ${r.items.length} артикула. Провери и натисни „Запиши“.</div></div>`);
}

/* ─── Включване ────────────────────────────────────────────────────────── */
(function wireX() {
  // бутон „Касова бележка“ в записа на пазаруване + артикулите от бележката към покупката
  const baseTrip = tripDialog;
  tripDialog = function () {
    baseTrip();
    const body = $('#sheetBody'); const h = body && body.querySelector('h3');
    if (h && !body.querySelector('#rcptBtn')) {
      h.insertAdjacentHTML('afterend', `<label class="btn tonal block" id="rcptBtn" style="margin:8px 0">📷 Снимай касовата бележка — попълва се само<input type="file" accept="image/*" hidden id="rcptFile"></label>`);
      body.querySelector('#rcptFile').onchange = e => { const f = e.target.files && e.target.files[0]; if (f) receiptPhoto(f); };
      const sv = body.querySelector('#tsave');
      if (sv) sv.addEventListener('click', () => {
        const r = window._rcpt; if (!r) return; const t = S.trips[S.trips.length - 1];
        if (t && (!t.items || !t.items.length) && r.items.length) { t.items = r.items.map(i => ({ n: i.n, c: i.c, q: 1 })); t.receipt = true; save(); }
        window._rcpt = null;
      });
    }
  };
  const base = render;
  render = function () {
    base();
    if (current === 'home') {
      const h = $('#s-home'); if (!h) return;
      const anchor = h.querySelector('#stepCard');
      if (anchor && !h.querySelector('#waterCard')) {
        anchor.insertAdjacentHTML('afterend', waterCard() + medsCard());
        bindWater(h); bindMeds(h);
      }
    }
    if (current === 'list') {
      const el = $('#s-list');
      if (el && !el.querySelector('#rcptList')) {
        const f = el.querySelector('.field');
        if (f) { f.insertAdjacentHTML('afterend', `<label class="btn tonal block" id="rcptList" style="margin-bottom:12px">🧾 Сканирай касова бележка<input type="file" accept="image/*" hidden id="rcptFile2"></label>`); el.querySelector('#rcptFile2').onchange = e => { const fl = e.target.files && e.target.files[0]; if (fl) receiptPhoto(fl); }; }
      }
    }
    if (current === 'more') {
      const ul = $('#s-more .list');
      if (ul && !ul.querySelector('[data-x="meds"]')) {
        ul.insertAdjacentHTML('afterbegin', `<li class="li" data-x="meds"><div class="lead">💊</div><div class="grow"><div class="title">Лекарства и напомняния</div><div class="muted small">Часове, прием, съвети за взаимодействия</div></div><span class="muted">›</span></li>
          <li class="li" data-x="fam"><div class="lead">👨‍👩‍👧</div><div class="grow"><div class="title">Семейство</div><div class="muted small">Отделни профили за всеки член</div></div><span class="muted">›</span></li>
          <li class="li" data-x="water"><div class="lead">💧</div><div class="grow"><div class="title">Вода — напомняния</div><div class="muted small">${WATER().remind ? 'Включени · 9–19 ч. на всеки 2 часа' : 'Изключени'} · цел ${(waterGoal() / 1000).toLocaleString('bg-BG')} л</div></div><span class="muted">›</span></li>`);
        ul.querySelector('[data-x="meds"]').onclick = () => { drTab = 'meds'; go('doctor'); };
        ul.querySelector('[data-x="fam"]').onclick = familySheet;
        ul.querySelector('[data-x="water"]').onclick = () => openSheet(`<h3>💧 Вода</h3><label class="lbl">Дневна цел (мл)</label><input class="input" id="wG" inputmode="numeric" value="${waterGoal()}"><div class="muted small" style="margin-top:4px">По подразбиране ~30 мл на кг тегло.</div>
          <button class="btn ${WATER().remind ? 'tonal' : 'primary'} block" id="wR" style="margin-top:10px">${WATER().remind ? '🔕 Изключи напомнянията' : '🔔 Напомняй ми на всеки 2 часа (9–19 ч.)'}</button><button class="btn primary block" id="wS" style="margin-top:8px">Запази</button>`, s => {
          s.querySelector('#wR').onclick = () => { WATER().remind = !WATER().remind; save(); scheduleWater(); closeSheet(); render(); toast(WATER().remind ? 'Напомнянията са включени' : 'Изключени'); };
          s.querySelector('#wS').onclick = () => { const g = +s.querySelector('#wG').value; if (g >= 500 && g <= 6000) WATER().goal = g; save(); closeSheet(); render(); };
        });
      }
    }
  };
  // My Doctor: превключвател на профила + раздел „Лекарства“
  const baseDoc = renderDoctor;
  renderDoctor = function (el) {
    const meds = drTab === 'meds';
    if (meds) drTab = 'plan';
    baseDoc(el);
    if (meds) drTab = 'meds';
    const who = curPerson();
    el.insertAdjacentHTML('afterbegin', `<div class="row between" style="margin-bottom:8px"><button class="chip" id="famSw">${who.e} ${esc(who.name)} ▾</button>${S.family && S.family.length > 1 ? '<span class="muted small">семеен профил</span>' : '<span class="muted small">+ добави член на семейството</span>'}</div>`);
    el.querySelector('#famSw').onclick = familySheet;
    const ch = el.querySelector('.chips');
    if (ch && !ch.querySelector('[data-drt="meds"]')) {
      ch.insertAdjacentHTML('beforeend', `<button class="chip ${meds ? 'on' : ''}" data-drt="meds">💊 Лекарства</button>`);
      ch.querySelector('[data-drt="meds"]').onclick = () => { drTab = 'meds'; renderDoctor(el); };
      if (meds) ch.querySelectorAll('[data-drt]').forEach(b => b.classList.toggle('on', b.dataset.drt === 'meds'));
    }
    if (meds) { const body = el.querySelector('#drBody'); if (body) drMeds(body); }
  };
  const ln = LN();
  if (ln) ln.addListener('localNotificationActionPerformed', a => { const e = (a && a.notification && a.notification.extra) || {}; if (e.meds) setTimeout(() => go('home'), 600); });
})();

document.addEventListener('DOMContentLoaded', () => { FAM(); setTimeout(() => { scheduleMeds(); }, 4000); });
