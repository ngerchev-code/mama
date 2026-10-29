/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   „На масата“ — чат, гласови съобщения, снимки, споделен списък и видеоразговори между близки.
   Влиза се само с покана (код). Всичко се криптира в телефона (AES-GCM) преди да тръгне; сървърът (ntfy) вижда само шифър. */
const CH = { base: 'https://ntfy.sh', es: null, open: null, keys: {}, call: null, rec: null, urls: {} };
const CH_EMO = ['🙂', '👩', '👨', '👧', '👦', '👵', '👴', '🧑‍🍳', '🐱', '🌻'];

/* ─── състояние ─── */
function CHS() {
  if (!S.chat) S.chat = { me: null, rooms: [], msgs: {}, since: 0 };
  if (!S.chat.me) S.chat.me = { id: uid() + uid(), n: ((P().name || '').trim().split(' ')[0] || 'Аз'), e: '🙂' };
  return S.chat;
}
const roomById = id => CHS().rooms.find(r => r.id === id);
const topicOf = r => 'mama1' + r.id;

/* ─── криптиране ─── */
function b64u(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function ub64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
async function rkey(r) { if (!CH.keys[r.id]) CH.keys[r.id] = await crypto.subtle.importKey('raw', ub64u(r.key), 'AES-GCM', false, ['encrypt', 'decrypt']); return CH.keys[r.id]; }
async function encB(r, u8) { const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await rkey(r), u8)); const o = new Uint8Array(12 + ct.length); o.set(iv); o.set(ct, 12); return o; }
async function decB(r, u8) { return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: u8.subarray(0, 12) }, await rkey(r), u8.subarray(12))); }
const encT = async (r, s) => b64u(await encB(r, new TextEncoder().encode(s)));
const decT = async (r, s) => new TextDecoder().decode(await decB(r, ub64u(s)));

/* ─── файлове (гласови, снимки) — IndexedDB ─── */
function idb() { return new Promise((ok, no) => { const q = indexedDB.open('mama-chat', 1); q.onupgradeneeded = () => q.result.createObjectStore('b'); q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); }); }
async function blobPut(id, blob) { try { const d = await idb(); await new Promise(ok => { const t = d.transaction('b', 'readwrite'); t.objectStore('b').put(blob, id); t.oncomplete = ok; t.onerror = ok; }); } catch (e) {} }
async function blobGet(id) { if (CH.urls[id]) return CH.urls[id]; try { const d = await idb(); const b = await new Promise(ok => { const q = d.transaction('b').objectStore('b').get(id); q.onsuccess = () => ok(q.result); q.onerror = () => ok(null); }); if (b) return CH.urls[id] = URL.createObjectURL(b); } catch (e) {} return null; }

/* ─── изпращане ─── */
async function chPub(r, body, params) {
  const u = `${CH.base}/${topicOf(r)}${params ? '?' + new URLSearchParams(params) : ''}`;
  const res = await fetch(u, { method: 'POST', body });
  if (!res.ok) throw new Error('send ' + res.status);
}
async function chSend(r, p, bin) {
  const me = CHS().me;
  const m = Object.assign({ id: uid() + uid().slice(0, 3), f: me.id, n: me.n, e: me.e, ts: Date.now() }, p);
  const vis = !['hi', 'call'].includes(m.k);
  if (vis) { m.st = 'out'; addMsg(r, m); if (bin) { await blobPut(m.id, new Blob([bin], { type: m.mime || 'application/octet-stream' })); } }
  try {
    const js = JSON.stringify(m);
    if (bin) await chPub(r, await encB(r, bin), { filename: 'a.bin', message: await encT(r, JSON.stringify(Object.assign({}, m, { st: undefined }))) });
    else if (js.length < 2800) await chPub(r, await encT(r, js));
    else await chPub(r, await encB(r, new TextEncoder().encode(js)), { filename: 'm.bin', message: await encT(r, JSON.stringify({ k: 'big', id: m.id, f: me.id, ts: m.ts })) });
    if (vis) { m.st = 'sent'; save(); chRefresh(); }
  } catch (e) {
    if (vis) { m.st = 'err'; save(); chRefresh(); }
    if (m.k !== 'call') toast('Няма връзка — опитай пак');
    throw e;
  }
  return m;
}
function addMsg(r, m) {
  const C = CHS(); const L = C.msgs[r.id] || (C.msgs[r.id] = []);
  if (L.some(x => x.id === m.id)) return false;
  L.push(m); L.sort((a, b) => a.ts - b.ts); if (L.length > 400) L.splice(0, L.length - 400);
  r.last = m.ts; save(); return true;
}

/* ─── получаване (SSE) ─── */
function chConnect() {
  const C = CHS(); if (CH.es) { CH.es.close(); CH.es = null; }
  if (!C.rooms.length || document.hidden) return;
  const since = C.since ? Math.max(0, C.since - 2) : '12h';
  const es = new EventSource(`${CH.base}/${C.rooms.map(topicOf).join(',')}/sse?since=${since}`);
  es.onmessage = ev => { try { const d = JSON.parse(ev.data); if (d.event === 'message' || !d.event) chIn(d); } catch (e) {} };
  es.onerror = () => { /* EventSource се свързва отново сам */ };
  CH.es = es;
}
async function chIn(d) {
  const r = CHS().rooms.find(x => topicOf(x) === d.topic); if (!r) return;
  let m;
  try { m = JSON.parse(await decT(r, d.message)); } catch (e) { return; }
  if (d.time) { CHS().since = Math.max(CHS().since || 0, d.time); }
  if (d.attachment && d.attachment.url) {
    try {
      const buf = new Uint8Array(await (await fetch(d.attachment.url)).arrayBuffer());
      const plain = await decB(r, buf);
      if (m.k === 'big') m = JSON.parse(new TextDecoder().decode(plain));
      else if (m.f !== CHS().me.id) await blobPut(m.id, new Blob([plain], { type: m.mime || 'application/octet-stream' }));
    } catch (e) { if (m.k === 'big') return; m.gone = true; }
  }
  chHandle(r, m);
}
function chHandle(r, m) {
  const me = CHS().me, mine = m.f === me.id;
  if (m.f && m.n) { r.mem = r.mem || {}; const was = r.mem[m.f]; r.mem[m.f] = Object.assign(r.mem[m.f] || {}, { n: m.n, e: m.e }); if (!was && !mine && m.k !== 'hi') save(); }
  if (m.k === 'hi') {
    if (mine) return;
    const fresh = !(r.mem && r.mem[m.f] && r.mem[m.f].hi);
    r.mem[m.f].hi = 1;
    if (m.rn && (!r.name || r.name === 'Нова маса')) r.name = m.rn;
    if (fresh && !m.re) { addMsg(r, { id: 'sys' + m.id, k: 'sys', t: `${m.e} ${m.n} седна на масата 👋`, ts: m.ts }); chSend(r, { k: 'hi', re: 1, rn: r.name }).catch(() => {}); }
    save(); chRefresh(); return;
  }
  if (m.k === 'call') return callIn(r, m);
  if (mine) { const L = CHS().msgs[r.id] || []; const x = L.find(y => y.id === m.id); if (x && x.st !== 'sent') { x.st = 'sent'; save(); chRefresh(); } else if (!x) { m.st = 'sent'; addMsg(r, m); chRefresh(); } return; }
  if (!addMsg(r, m)) return;
  const viewing = current === 'chat' && CH.open === r.id && !document.hidden;
  if (!viewing) { r.unread = (r.unread || 0) + 1; save(); chNotify(r, m); }
  chRefresh();
}
function preview(m) { return m.k === 'text' ? m.t : m.k === 'list' ? `📋 Списък (${m.items.length})` : m.k === 'voice' ? '🎤 Гласово съобщение' : m.k === 'photo' ? '📷 Снимка' : m.t || ''; }
function chNotify(r, m) {
  const txt = `${m.e || '💬'} ${m.n}: ${preview(m)}`.slice(0, 120);
  if (document.hidden) { try { const LNp = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; if (LNp) LNp.schedule({ notifications: [{ id: 900 + Math.floor(Math.random() * 99), title: `На масата · ${r.name}`, body: txt, smallIcon: 'ic_stat_mama' }] }); } catch (e) {} }
  else { toast('💬 ' + txt); chBeep(); }
  chBadge();
}
function chBeep() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; o.frequency.setValueAtTime(1320, c.currentTime + .08); g.gain.setValueAtTime(.08, c.currentTime); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + .25); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + .3); setTimeout(() => c.close(), 500); } catch (e) {} }
function chUnread() { return CHS().rooms.reduce((a, r) => a + (r.unread || 0), 0); }
function chBadge() {
  const n = chUnread(), nav = document.querySelector('nav.bottom button[data-go="more"]'); if (!nav) return;
  let b = nav.querySelector('.badge.chatb'); if (!b) { b = document.createElement('i'); b.className = 'badge chatb'; nav.appendChild(b); }
  b.style.display = n ? '' : 'none'; b.textContent = n;
}
function chRefresh() { chBadge(); if (current === 'chat' && !CH.rec) { const el = $('#s-chat'); const box = el.querySelector('.cmsgs'); const atEnd = !box || box.scrollHeight - box.scrollTop - box.clientHeight < 80; const draft = el.querySelector('#cIn') && el.querySelector('#cIn').value; renderChat(el); const ni = el.querySelector('#cIn'); if (ni && draft) ni.value = draft; if (atEnd) chScroll(); } }

/* ─── покани ─── */
function makeRoom(name) {
  const id = b64u(crypto.getRandomValues(new Uint8Array(9))), key = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const r = { id, key, name: name || 'Нова маса', mem: {}, last: Date.now(), unread: 0 };
  CHS().rooms.unshift(r); addMsg(r, { id: 'sys0' + id, k: 'sys', t: 'Масата е подредена. Покани близките си с кода 🍽️', ts: Date.now() });
  save(); chConnect(); return r;
}
const roomCode = r => 'MAMA1.' + b64u(new Uint8Array([...ub64u(r.id), ...ub64u(r.key)]));
function joinCode(code) {
  const m = /MAMA1\.([A-Za-z0-9_-]{30,40})/.exec(code || ''); if (!m) return null;
  const u = ub64u(m[1]); if (u.length !== 25) return null;
  const id = b64u(u.subarray(0, 9)), key = b64u(u.subarray(9));
  let r = roomById(id);
  if (!r) { r = { id, key, name: 'Нова маса', mem: {}, last: Date.now(), unread: 0 }; CHS().rooms.unshift(r); save(); chConnect(); setTimeout(() => chSend(r, { k: 'hi' }).catch(() => {}), 1200); }
  return r;
}
async function shareInvite(r) {
  const code = roomCode(r);
  const txt = `Ела на масата „${r.name}“ в MAMA 🍽️ — чат, гласови съобщения и видеоразговори.\n\n1) Отвори MAMA → Още → На масата → „Имам код“\n2) Постави кода: ${code}\n\nНямаш MAMA? Свали я: https://ngerchev-code.github.io/mama/`;
  try { const Sh = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share; if (Sh) { await Sh.share({ title: 'Покана за MAMA', text: txt, dialogTitle: 'Покани' }); return; } } catch (e) {}
  try { if (navigator.share) { await navigator.share({ title: 'Покана за MAMA', text: txt }); return; } } catch (e) { return; }
  try { await navigator.clipboard.writeText(txt); toast('Поканата е копирана — постави я във Viber'); } catch (e) { prompt('Копирай поканата:', code); }
}

/* ─── екран ─── */
const hhmm = ts => { const d = new Date(ts), t = new Date(); return d.toDateString() === t.toDateString() ? d.toTimeString().slice(0, 5) : `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`; };
function renderChat(el) {
  const C = CHS();
  if (CH.open && roomById(CH.open)) return renderRoom(el, roomById(CH.open));
  CH.open = null;
  el.innerHTML = `
    <div class="card chat-hero"><div class="row" style="gap:12px;align-items:center"><button class="chat-me" id="cMe" aria-label="Промени профила">${C.me.e}</button>
      <div class="grow"><div class="ow-kicker" style="text-align:left;color:#fff;opacity:.9">На масата</div><b style="font-size:18px">${esc(C.me.n)}</b><div class="small" style="opacity:.9">Чат, гласови, снимки и видео с близките</div></div></div>
      <div class="row" style="gap:8px;margin-top:14px"><button class="btn ebag-btn grow" id="cNew">＋ Нова маса</button><button class="btn ebag-ghost grow" id="cJoin">🔑 Имам код</button></div></div>
    ${C.rooms.length ? `<div class="card"><ul class="list">${C.rooms.slice().sort((a, b) => (b.last || 0) - (a.last || 0)).map(r => {
      const L = C.msgs[r.id] || [], lm = L[L.length - 1], mem = Object.values(r.mem || {}).filter(x => x.n);
      return `<li class="li" data-room="${r.id}"><div class="lead chat-av">${mem.slice(0, 2).map(x => x.e).join('') || '🍽️'}</div><div class="grow"><div class="title">${esc(r.name)}</div><div class="muted small">${lm ? esc((lm.n && lm.k !== 'sys' ? lm.n + ': ' : '') + preview(lm)).slice(0, 60) : 'Покани някого'}</div></div><div style="text-align:right"><div class="muted small">${lm ? hhmm(lm.ts) : ''}</div>${r.unread ? `<span class="chat-un">${r.unread}</span>` : ''}</div></li>`;
    }).join('')}</ul></div>` : `<div class="card" style="text-align:center"><div style="font-size:44px">🍽️</div><h2 style="margin:6px 0">Подреди първата маса</h2><div class="muted small">Създай маса „Семейство“, прати кода на жена си или приятел във Viber и си пишете, пращайте списъци, гласови съобщения и се чувайте с видео.</div></div>`}
    <div class="muted small" style="text-align:center;padding:4px 18px 18px">🔒 Само хора с покана. Съобщенията се криптират в телефона ти. Видеоразговорите са директно между двата телефона.</div>`;
  el.querySelector('#cNew').onclick = () => openSheet(`<h3>🍽️ Нова маса</h3><div class="muted small">Име на разговора — например „Семейство“, „Вкъщи“, „Приятели“.</div><input class="input" id="rn" style="margin-top:10px" value="Семейство" maxlength="30"><button class="btn primary" id="rnOk" style="margin-top:12px;width:100%">Създай и покани</button>`, s => {
    s.querySelector('#rnOk').onclick = () => { const r = makeRoom(s.querySelector('#rn').value.trim() || 'Семейство'); closeSheet(); CH.open = r.id; renderChat(el); setTimeout(() => shareInvite(r), 300); };
  });
  el.querySelector('#cJoin').onclick = () => openSheet(`<h3>🔑 Влез с код</h3><div class="muted small">Постави цялото съобщение с поканата или само кода (започва с MAMA1.)</div><textarea class="input" id="jc" rows="3" style="margin-top:10px" placeholder="MAMA1.…"></textarea><button class="btn primary" id="jOk" style="margin-top:12px;width:100%">Седни на масата</button>`, s => {
    s.querySelector('#jOk').onclick = () => { const r = joinCode(s.querySelector('#jc').value); if (!r) { toast('Кодът не е валиден'); return; } closeSheet(); CH.open = r.id; renderChat(el); toast('Добре дошъл на масата! 🍽️'); };
  });
  el.querySelector('#cMe').onclick = () => openSheet(`<h3>Твоят профил в чата</h3><input class="input" id="mn" value="${esc(C.me.n)}" maxlength="20"><div class="chips" style="flex-wrap:wrap;margin-top:10px">${CH_EMO.map(e => `<button class="chip ${e === C.me.e ? 'on' : ''}" data-em="${e}" style="font-size:20px">${e}</button>`).join('')}</div><button class="btn primary" id="mOk" style="margin-top:12px;width:100%">Запази</button>`, s => {
    let em = C.me.e; s.querySelectorAll('[data-em]').forEach(b => b.onclick = () => { em = b.dataset.em; s.querySelectorAll('[data-em]').forEach(x => x.classList.toggle('on', x === b)); });
    s.querySelector('#mOk').onclick = () => { C.me.n = s.querySelector('#mn').value.trim() || C.me.n; C.me.e = em; save(); closeSheet(); renderChat(el); };
  });
  el.querySelectorAll('[data-room]').forEach(b => b.onclick = () => { CH.open = b.dataset.room; renderChat(el); chScroll(); });
}
function chScroll() { setTimeout(() => { const b = document.querySelector('#s-chat .cmsgs'); if (b) b.scrollTop = b.scrollHeight; }, 30); }
function bubble(r, m) {
  if (m.k === 'sys') return `<div class="csys">${esc(m.t)}</div>`;
  const mine = m.f === CHS().me.id;
  const tick = mine ? `<span class="ctick">${m.st === 'err' ? '⚠️' : m.st === 'out' ? '🕓' : '✓'}</span>` : '';
  const who = !mine && Object.keys(r.mem || {}).length > 1 ? `<div class="cwho">${m.e || ''} ${esc(m.n || '')}</div>` : '';
  let body = '';
  if (m.k === 'text') body = `<div class="ctext">${esc(m.t).replace(/\n/g, '<br>')}</div>`;
  else if (m.k === 'list') body = `<div class="clist"><b>📋 Списък за пазар · ${m.items.length}</b><ul>${m.items.slice(0, 30).map(i => `<li>${esc(i.name)}${i.qty > 1 ? ` <span class="muted">×${i.qty}</span>` : ''}</li>`).join('')}</ul>${mine ? '' : `<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn small primary" data-take="${m.id}">＋ В моя списък</button><button class="btn small tonal" data-ebl="${m.id}">🛒 eBag</button></div>`}</div>`;
  else if (m.k === 'voice') body = `<div class="cvoice"><button class="cplay" data-play="${m.id}" aria-label="Пусни">▶</button><span class="cwave">${'<i></i>'.repeat(14)}</span><span class="small">${Math.round(m.dur || 0)}″</span></div>${m.gone ? '<div class="small muted">Файлът е изтекъл (3 ч.)</div>' : ''}`;
  else if (m.k === 'photo') body = m.gone ? '<div class="small muted">📷 Снимката е изтекла (3 ч.)</div>' : `<img class="cimg" data-img="${m.id}" alt="Снимка">`;
  else if (m.k === 'calllog') body = `<div class="ctext">${esc(m.t)}</div>`;
  return `<div class="cmsg ${mine ? 'me' : ''}">${who}<div class="cb">${body}<div class="cmeta">${hhmm(m.ts)} ${tick}</div></div></div>`;
}
function renderRoom(el, r) {
  r.unread = 0; save(); chBadge();
  const L = CHS().msgs[r.id] || [];
  const mem = Object.entries(r.mem || {}).filter(([id]) => id !== CHS().me.id).map(([, x]) => x);
  el.innerHTML = `<div class="chat-room">
    <div class="chead"><button class="iconbtn" id="cBack" aria-label="Назад">←</button><div class="grow"><b>${esc(r.name)}</b><div class="small muted">${mem.length ? mem.map(x => x.e + ' ' + esc(x.n)).join(', ') : 'Още никой — покани с кода'}</div></div>
      <button class="iconbtn" id="cAud" aria-label="Гласов разговор">📞</button><button class="iconbtn" id="cVid" aria-label="Видеоразговор">🎥</button><button class="iconbtn" id="cMore" aria-label="Още">⋯</button></div>
    <div class="cmsgs">${L.map(m => bubble(r, m)).join('') || '<div class="csys">Кажи здрасти 👋</div>'}</div>
    <div class="ccomp" id="cComp"><button class="iconbtn" id="cPlus" aria-label="Прикачи">＋</button><textarea id="cIn" rows="1" placeholder="Съобщение…"></textarea><button class="csend" id="cSend" aria-label="Изпрати">🎤</button></div></div>`;
  const inp = el.querySelector('#cIn'), send = el.querySelector('#cSend');
  const upd = () => { send.textContent = inp.value.trim() ? '➤' : '🎤'; inp.style.height = 'auto'; inp.style.height = Math.min(120, inp.scrollHeight) + 'px'; };
  inp.oninput = upd;
  send.onclick = () => { const t = inp.value.trim(); if (t) { inp.value = ''; upd(); chSend(r, { k: 'text', t: t.slice(0, 2000) }).catch(() => {}); chRefresh(); chScroll(); } else recStart(r); };
  inp.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey && !NATIVE) { e.preventDefault(); send.click(); } };
  el.querySelector('#cBack').onclick = () => { CH.open = null; renderChat(el); };
  el.querySelector('#cAud').onclick = () => callStart(r, false);
  el.querySelector('#cVid').onclick = () => callStart(r, true);
  el.querySelector('#cMore').onclick = () => openSheet(`<h3>${esc(r.name)}</h3><ul class="list">
      <li class="li" id="xInv"><div class="lead">📨</div><div class="grow"><div class="title">Покани още хора</div><div class="muted small">Прати кода във Viber</div></div></li>
      <li class="li" id="xRen"><div class="lead">✏️</div><div class="grow"><div class="title">Преименувай</div></div></li>
      <li class="li" id="xLeave"><div class="lead">🚪</div><div class="grow"><div class="title">Стани от масата</div><div class="muted small">Изтрива разговора от този телефон</div></div></li></ul>`, s => {
    s.querySelector('#xInv').onclick = () => { closeSheet(); shareInvite(r); };
    s.querySelector('#xRen').onclick = () => { const n = prompt('Ново име', r.name); if (n && n.trim()) { r.name = n.trim().slice(0, 30); save(); closeSheet(); renderChat(el); } };
    s.querySelector('#xLeave').onclick = () => { if (!confirm('Да изтрия ли разговора от телефона?')) return; CHS().rooms = CHS().rooms.filter(x => x !== r); delete CHS().msgs[r.id]; save(); closeSheet(); CH.open = null; chConnect(); renderChat(el); };
  });
  el.querySelector('#cPlus').onclick = () => openSheet(`<h3>Прати</h3><div class="grid-actions four" style="grid-template-columns:repeat(3,1fr)">
      <button id="aList"><span class="ic">📋</span>Списъка</button><button id="aCam"><span class="ic">📷</span>Снимка</button><button id="aGal"><span class="ic">🖼️</span>Галерия</button></div>`, s => {
    s.querySelector('#aList').onclick = () => { const items = S.list.filter(i => !i.done).map(i => ({ name: i.name, qty: i.qty || 1, cat: i.cat })); closeSheet(); if (!items.length) return toast('Списъкът ти е празен'); chSend(r, { k: 'list', items }).catch(() => {}); chRefresh(); chScroll(); };
    const pick = cap => { const f = document.createElement('input'); f.type = 'file'; f.accept = 'image/*'; if (cap) f.capture = 'environment'; f.onchange = async () => { closeSheet(); if (f.files[0]) sendPhoto(r, f.files[0]); }; f.click(); };
    s.querySelector('#aCam').onclick = () => pick(true); s.querySelector('#aGal').onclick = () => pick(false);
  });
  el.querySelectorAll('[data-take]').forEach(b => b.onclick = () => { const m = L.find(x => x.id === b.dataset.take); let n = 0; m.items.forEach(it => { const ex = S.list.find(i => !i.done && norm(i.name) === norm(it.name)); if (ex) ex.qty = Math.max(ex.qty || 1, it.qty || 1); else { S.list.push({ id: uid(), name: it.name, cat: it.cat || guessCat(it.name), qty: it.qty || 1, done: false, from: m.n, added: Date.now() }); n++; } }); save(); toast(`Добавени ${n} продукта в списъка ✓`); });
  el.querySelectorAll('[data-ebl]').forEach(b => b.onclick = () => { const m = L.find(x => x.id === b.dataset.ebl); openSheet(`<h3>🛒 В eBag</h3><ul class="list">${m.items.map(i => `<li class="li" data-q="${esc(i.name)}"><div class="lead">🛍️</div><div class="grow"><div class="title">${esc(i.name)}</div><div class="muted small">търси в eBag ↗</div></div></li>`).join('')}</ul>`, s => s.querySelectorAll('[data-q]').forEach(x => x.onclick = () => openExt(EBAG.search(x.dataset.q)))); });
  el.querySelectorAll('[data-play]').forEach(b => b.onclick = async () => { const u = await blobGet(b.dataset.play); if (!u) return toast('Записът не е наличен'); if (CH.audio) { CH.audio.pause(); } const a = new Audio(u); CH.audio = a; b.textContent = '⏸'; a.onended = () => b.textContent = '▶'; a.play().catch(() => toast('Не може да се пусне')); });
  el.querySelectorAll('[data-img]').forEach(async im => { const u = await blobGet(im.dataset.img); if (u) { im.src = u; im.onclick = () => openSheet(`<img src="${u}" style="width:100%;border-radius:16px" alt="Снимка">`); } else im.replaceWith(Object.assign(document.createElement('div'), { className: 'small muted', textContent: '📷 Зарежда се…' })); });
  chScroll();
}

/* ─── снимки и гласови ─── */
async function sendPhoto(r, file) {
  const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file); });
  const k = Math.min(1, 1280 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const blob = await new Promise(ok => c.toBlob(ok, 'image/jpeg', .8));
  chSend(r, { k: 'photo', mime: 'image/jpeg' }, new Uint8Array(await blob.arrayBuffer())).catch(() => {}); chRefresh(); chScroll();
}
async function recStart(r) {
  if (CH.rec) return;
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return toast('Разреши достъп до микрофона'); }
  const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined), parts = [], t0 = Date.now();
  rec.ondataavailable = e => e.data.size && parts.push(e.data);
  CH.rec = { rec, stream, cancel: false };
  const comp = document.getElementById('cComp');
  comp.innerHTML = `<button class="iconbtn" id="rX" aria-label="Отказ">✕</button><div class="grow crec"><span class="cdot"></span> Записва… <b id="rT">0:00</b></div><button class="csend" id="rOk" aria-label="Изпрати">➤</button>`;
  const tm = setInterval(() => { const s = Math.floor((Date.now() - t0) / 1000); const e = document.getElementById('rT'); if (e) e.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (s >= 120) rec.stop(); }, 250);
  rec.onstop = async () => {
    clearInterval(tm); stream.getTracks().forEach(t => t.stop());
    const cancel = CH.rec.cancel; CH.rec = null;
    if (!cancel && parts.length) { const b = new Blob(parts, { type: rec.mimeType || 'audio/webm' }); chSend(r, { k: 'voice', mime: b.type, dur: (Date.now() - t0) / 1000 }, new Uint8Array(await b.arrayBuffer())).catch(() => {}); }
    renderChat($('#s-chat')); chScroll();
  };
  rec.start();
  document.getElementById('rX').onclick = () => { CH.rec.cancel = true; rec.stop(); };
  document.getElementById('rOk').onclick = () => rec.stop();
}

/* ─── видео/гласови разговори (WebRTC, директно между телефоните) ─── */
const ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun.cloudflare.com:3478' }];
function iceDone(pc) { return new Promise(ok => { if (pc.iceGatheringState === 'complete') return ok(); const t = setTimeout(ok, 2500); pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } }; }); }
function callUI(c, status) {
  let w = document.getElementById('call');
  if (!w) { w = document.createElement('div'); w.id = 'call'; w.className = 'call'; document.body.appendChild(w); }
  const who = c.peer || {};
  w.innerHTML = `<video id="vR" autoplay playsinline></video><video id="vL" autoplay playsinline muted ${c.video ? '' : 'hidden'}></video>
    <div class="call-top"><div class="call-av">${who.e || '🍽️'}</div><b>${esc(who.n || c.roomName || '')}</b><div class="small" id="cSt">${status}</div></div>
    <div class="call-bar">${c.state === 'ring' ? `<button class="cb-btn red" id="cDec" aria-label="Откажи">✕</button><button class="cb-btn green" id="cAcc" aria-label="Приеми">${c.video ? '🎥' : '📞'}</button>`
      : `<button class="cb-btn" id="cMute" aria-label="Микрофон">🎙️</button>${c.video ? '<button class="cb-btn" id="cCam" aria-label="Камера">📷</button><button class="cb-btn" id="cFlip" aria-label="Обърни">🔄</button>' : ''}<button class="cb-btn red" id="cEnd" aria-label="Затвори">✕</button>`}</div>`;
  if (c.local) w.querySelector('#vL').srcObject = c.local;
  if (c.remote) w.querySelector('#vR').srcObject = c.remote;
  const q = s => w.querySelector(s);
  if (q('#cAcc')) q('#cAcc').onclick = callAccept;
  if (q('#cDec')) q('#cDec').onclick = () => callEnd(true, 'Отказано');
  if (q('#cEnd')) q('#cEnd').onclick = () => callEnd(true);
  if (q('#cMute')) q('#cMute').onclick = e => { const t = c.local && c.local.getAudioTracks()[0]; if (t) { t.enabled = !t.enabled; e.currentTarget.classList.toggle('off', !t.enabled); } };
  if (q('#cCam')) q('#cCam').onclick = e => { const t = c.local && c.local.getVideoTracks()[0]; if (t) { t.enabled = !t.enabled; e.currentTarget.classList.toggle('off', !t.enabled); } };
  if (q('#cFlip')) q('#cFlip').onclick = async () => { try { c.facing = c.facing === 'user' ? 'environment' : 'user'; const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: c.facing } }); const nt = s.getVideoTracks()[0]; const snd = c.pc.getSenders().find(x => x.track && x.track.kind === 'video'); if (snd) await snd.replaceTrack(nt); c.local.getVideoTracks().forEach(t => { t.stop(); c.local.removeTrack(t); }); c.local.addTrack(nt); w.querySelector('#vL').srcObject = c.local; } catch (e) { toast('Не може да се смени камерата'); } };
}
function callStatus(t) { const e = document.getElementById('cSt'); if (e) e.textContent = t; }
function newPC(c) {
  const pc = new RTCPeerConnection({ iceServers: ICE });
  c.remote = new MediaStream();
  pc.ontrack = e => { e.streams[0] ? e.streams[0].getTracks().forEach(t => c.remote.addTrack(t)) : c.remote.addTrack(e.track); const v = document.getElementById('vR'); if (v) v.srcObject = c.remote; };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') { c.t0 = c.t0 || Date.now(); c.state = 'live'; clearInterval(c.tick); c.tick = setInterval(() => { const s = Math.floor((Date.now() - c.t0) / 1000); callStatus(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`); }, 1000); }
    if (pc.connectionState === 'failed') { toast('Мрежата не позволи директна връзка — опитайте през Wi‑Fi'); callEnd(true); }
  };
  return pc;
}
async function callStart(r, video) {
  if (CH.call) return;
  let local; try { local = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: 'user' } : false }); } catch (e) { return toast('Разреши достъп до ' + (video ? 'камерата и микрофона' : 'микрофона')); }
  const mem = Object.entries(r.mem || {}).filter(([id]) => id !== CHS().me.id).map(([, x]) => x);
  const c = CH.call = { room: r, cid: uid(), video, local, role: 'caller', state: 'calling', facing: 'user', peer: mem.length === 1 ? mem[0] : { n: r.name, e: '🍽️' } };
  callUI(c, 'Звъни…');
  c.pc = newPC(c); local.getTracks().forEach(t => c.pc.addTrack(t, local));
  await c.pc.setLocalDescription(await c.pc.createOffer()); await iceDone(c.pc);
  if (CH.call !== c) return;
  chSend(r, { k: 'call', s: 'offer', cid: c.cid, v: video, sdp: c.pc.localDescription.sdp }).catch(() => { toast('Няма връзка'); callEnd(false); });
  c.ringTO = setTimeout(() => { if (CH.call === c && c.state === 'calling') { toast('Никой не вдигна'); callEnd(true, 'Без отговор'); } }, 45000);
}
function callIn(r, m) {
  const me = CHS().me, c = CH.call;
  if (m.f === me.id) return;
  if (m.s === 'offer') {
    if (Date.now() - m.ts > 45000) { addMsg(r, { id: 'cl' + m.cid, k: 'calllog', t: `📞 Пропуснато обаждане от ${m.n}`, f: m.f, n: m.n, e: m.e, ts: m.ts }); chRefresh(); return; }
    if (c) { chSend(r, { k: 'call', s: 'busy', cid: m.cid }).catch(() => {}); return; }
    CH.call = { room: r, cid: m.cid, video: m.v, offer: m.sdp, role: 'callee', state: 'ring', facing: 'user', peer: { n: m.n, e: m.e }, from: m.f };
    callUI(CH.call, m.v ? 'Видеообаждане…' : 'Гласово обаждане…'); ring(true);
    CH.call.ringTO = setTimeout(() => { if (CH.call && CH.call.state === 'ring') { addMsg(r, { id: 'cl' + m.cid, k: 'calllog', t: `📞 Пропуснато обаждане от ${m.n}`, f: m.f, n: m.n, e: m.e, ts: m.ts }); callEnd(false); } }, 45000);
    return;
  }
  if (!c || c.cid !== m.cid) return;
  if (m.s === 'answer' && c.role === 'caller' && !c.answered) { c.answered = true; clearTimeout(c.ringTO); c.peer = { n: m.n, e: m.e }; callStatus('Свързване…'); c.pc.setRemoteDescription({ type: 'answer', sdp: m.sdp }).catch(() => callEnd(true)); }
  else if (m.s === 'answer' && c.role === 'callee' && c.state === 'ring') { callEnd(false); } // вдигна друг от масата
  else if (m.s === 'busy' && c.role === 'caller') { toast('Заето'); callEnd(false); }
  else if (m.s === 'end') callEnd(false, c.state === 'ring' ? 'Пропуснато' : null);
}
async function callAccept() {
  const c = CH.call; if (!c || c.state !== 'ring') return; ring(false); clearTimeout(c.ringTO);
  try { c.local = await navigator.mediaDevices.getUserMedia({ audio: true, video: c.video ? { facingMode: 'user' } : false }); } catch (e) { toast('Разреши достъп до камерата/микрофона'); return callEnd(true); }
  c.state = 'connecting'; callUI(c, 'Свързване…');
  c.pc = newPC(c); c.local.getTracks().forEach(t => c.pc.addTrack(t, c.local));
  await c.pc.setRemoteDescription({ type: 'offer', sdp: c.offer });
  await c.pc.setLocalDescription(await c.pc.createAnswer()); await iceDone(c.pc);
  chSend(c.room, { k: 'call', s: 'answer', cid: c.cid, sdp: c.pc.localDescription.sdp }).catch(() => callEnd(false));
}
function callEnd(notify, why) {
  const c = CH.call; if (!c) return; CH.call = null; ring(false);
  clearTimeout(c.ringTO); clearInterval(c.tick);
  if (notify) chSend(c.room, { k: 'call', s: 'end', cid: c.cid }).catch(() => {});
  try { c.pc && c.pc.close(); } catch (e) {}
  [c.local].forEach(s => s && s.getTracks().forEach(t => t.stop()));
  const dur = c.t0 ? Math.round((Date.now() - c.t0) / 1000) : 0;
  const t = dur ? `${c.video ? '🎥 Видеоразговор' : '📞 Разговор'} · ${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : (why ? `📞 ${why}` : null);
  if (t) { addMsg(c.room, { id: 'cl' + c.cid + (c.role === 'caller' ? 'a' : 'b'), k: 'calllog', t, f: CHS().me.id, ts: Date.now() }); }
  const w = document.getElementById('call'); if (w) { w.classList.add('out'); setTimeout(() => w.remove(), 300); }
  chRefresh();
}
function ring(on) {
  if (!on) { if (CH.ringC) { clearInterval(CH.ringI); CH.ringC.close(); CH.ringC = null; } return; }
  try { const c = CH.ringC = new (window.AudioContext || window.webkitAudioContext)(); const beep = () => { [0, .25].forEach(d => { const o = c.createOscillator(), g = c.createGain(); o.frequency.value = d ? 660 : 880; g.gain.setValueAtTime(.12, c.currentTime + d); g.gain.exponentialRampToValueAtTime(.0001, c.currentTime + d + .22); o.connect(g); g.connect(c.destination); o.start(c.currentTime + d); o.stop(c.currentTime + d + .25); }); }; beep(); CH.ringI = setInterval(beep, 1600); } catch (e) {}
  try { navigator.vibrate && navigator.vibrate([400, 200, 400]); } catch (e) {}
}

/* ─── включване ─── */
(function () {
  TITLES.chat = ['На масата', 'Чат, гласови и видео с близките'];
  const baseRender = render;
  render = function () {
    document.body.classList.toggle('in-chat', current === 'chat');
    if (current === 'chat') { renderChat($('#s-chat')); chBadge(); return; }
    if (current !== 'chat') CH.open = null;
    baseRender(); chBadge();
  };
  const bMore = renderMore;
  renderMore = function (el) {
    bMore(el);
    const n = chUnread();
    el.insertAdjacentHTML('afterbegin', `<div class="more-duo"><button class="duo chat" data-go3="chat"><span class="duo-e">🍽️💬</span><b>На масата</b><span>Чат, гласови, видео${n ? ` · <i class="chat-un">${n}</i>` : ''}</span></button></div>`);
    el.querySelector('[data-go3="chat"]').onclick = () => go('chat');
  };
  const bHome = renderHome;
  renderHome = function (el) {
    bHome(el);
    const n = chUnread(); if (!n) return;
    el.insertAdjacentHTML('afterbegin', `<div class="card chat-hero row between" id="hChat" style="align-items:center"><div><b>💬 ${n} ${n === 1 ? 'ново съобщение' : 'нови съобщения'}</b><div class="small" style="opacity:.9">На масата те чакат</div></div><button class="btn ebag-btn small">Отвори</button></div>`);
    el.querySelector('#hChat').onclick = () => go('chat');
  };
})();
document.addEventListener('DOMContentLoaded', () => { CHS(); setTimeout(() => { chConnect(); chBadge(); }, 1500); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { if (CH.es && !CH.call) { CH.es.close(); CH.es = null; } } else chConnect(); });
