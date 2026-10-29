/* © 2026 Николай Герчев — MAMA. Всички права запазени.
   MAMA Lounge — лека музика, която се „свири“ на живо в телефона (Web Audio). Без интернет и без авторски права. */
const MOODS = {
  sax: { name: 'Саксофон джаз', e: '🎷', bpm: 74, swing: .62, sax: true, keys: 'rhodes', drums: 'brush', bass: true,
    prog: [['D', 'm9'], ['G', '13'], ['C', 'maj9'], ['A', '7b9'], ['D', 'm9'], ['G', '13'], ['E', 'm7'], ['A', '7b9']] },
  bossa: { name: 'Лаунж боса нова', e: '🌴', bpm: 128, swing: .5, sax: true, keys: 'guitar', drums: 'bossa', bass: true,
    prog: [['F', 'maj9'], ['F', 'maj9'], ['G', 'm9'], ['C', '13'], ['A', 'm7'], ['D', '7b9'], ['G', 'm9'], ['C', '13']] },
  piano: { name: 'Спокойно пиано', e: '🎹', bpm: 66, swing: .5, sax: false, keys: 'piano', drums: null, bass: false,
    prog: [['C', 'maj9'], ['A', 'm9'], ['F', 'maj9'], ['G', '6'], ['E', 'm7'], ['A', 'm9'], ['D', 'm9'], ['G', '13']] }
};
const NOTE = { C: 0, 'C#': 1, D: 2, Eb: 3, E: 4, F: 5, 'F#': 6, G: 7, Ab: 8, A: 9, Bb: 10, B: 11 };
const QUAL = { m9: [0, 3, 7, 10, 14], '13': [0, 4, 10, 14, 21], maj9: [0, 4, 7, 11, 14], '7b9': [0, 4, 10, 13], m7: [0, 3, 7, 10], '6': [0, 4, 7, 9, 14] };
const mf = m => 440 * Math.pow(2, (m - 69) / 12);

const MUS = { ctx: null, master: null, rev: null, playing: false, mood: 'sax', timer: null, step: 0, next: 0, bar: 0, saxNext: 0 };

function musInit() {
  if (MUS.ctx) return;
  const C = new (window.AudioContext || window.webkitAudioContext)();
  MUS.ctx = C;
  const comp = C.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
  const master = C.createGain(); master.gain.value = 0;
  master.connect(comp); comp.connect(C.destination);
  // топла реверберация от генериран импулс
  const len = C.sampleRate * 2.6, ir = C.createBuffer(2, len, C.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  const rev = C.createConvolver(); rev.buffer = ir;
  const revG = C.createGain(); revG.gain.value = .32; rev.connect(revG); revG.connect(master);
  const warm = C.createBiquadFilter(); warm.type = 'lowpass'; warm.frequency.value = 6500; warm.connect(master);
  MUS.master = master; MUS.rev = rev; MUS.out = warm;
  const nb = C.createBuffer(1, C.sampleRate, C.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  MUS.noise = nb;
}
function bus(node, wet = .5) { node.connect(MUS.out); const s = MUS.ctx.createGain(); s.gain.value = wet; node.connect(s); s.connect(MUS.rev); }

/* ─── Инструменти ─── */
function keysNote(m, t, dur, vel, kind) {
  const C = MUS.ctx, f = mf(m);
  const g = C.createGain(); g.gain.setValueAtTime(0, t);
  const atk = kind === 'guitar' ? .004 : .01, dec = kind === 'guitar' ? .9 : kind === 'piano' ? 2.4 : 1.8;
  g.gain.linearRampToValueAtTime(vel, t + atk); g.gain.exponentialRampToValueAtTime(vel * .35, t + Math.min(dur, .5)); g.gain.exponentialRampToValueAtTime(.0001, t + dur + dec);
  const o = C.createOscillator(); o.type = kind === 'guitar' ? 'triangle' : 'sine'; o.frequency.value = f;
  if (kind !== 'guitar') { // мек FM „Роудс“/пиано тембър
    const mod = C.createOscillator(), mg = C.createGain(); mod.frequency.value = f * (kind === 'piano' ? 2 : 1);
    mg.gain.setValueAtTime(f * (kind === 'piano' ? .9 : 1.4), t); mg.gain.exponentialRampToValueAtTime(f * .05, t + .6);
    mod.connect(mg); mg.connect(o.frequency); mod.start(t); mod.stop(t + dur + dec + .1);
  }
  const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'guitar' ? 2400 : 3200;
  o.connect(lp); lp.connect(g); bus(g, .45); o.start(t); o.stop(t + dur + dec + .1);
}
function bassNote(m, t, dur) {
  const C = MUS.ctx, o = C.createOscillator(), g = C.createGain(), lp = C.createBiquadFilter();
  o.type = 'triangle'; o.frequency.value = mf(m); lp.type = 'lowpass'; lp.frequency.value = 520;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + .012); g.gain.exponentialRampToValueAtTime(.18, t + .18); g.gain.exponentialRampToValueAtTime(.0001, t + dur + .15);
  o.connect(lp); lp.connect(g); bus(g, .12); o.start(t); o.stop(t + dur + .2);
}
function noiseHit(t, { f = 6000, q = .7, type = 'highpass', vol = .1, dur = .08, atk = .002 } = {}) {
  const C = MUS.ctx, s = C.createBufferSource(), fl = C.createBiquadFilter(), g = C.createGain();
  s.buffer = MUS.noise; fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(fl); fl.connect(g); bus(g, .25); s.start(t, Math.random() * .5); s.stop(t + dur + .05);
}
function kick(t, vol = .35) {
  const C = MUS.ctx, o = C.createOscillator(), g = C.createGain();
  o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .12);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .25);
  o.connect(g); bus(g, .05); o.start(t); o.stop(t + .3);
}
function rim(t) {
  const C = MUS.ctx, o = C.createOscillator(), g = C.createGain(), bp = C.createBiquadFilter();
  o.type = 'square'; o.frequency.value = 1700; bp.type = 'bandpass'; bp.frequency.value = 1800; bp.Q.value = 6;
  g.gain.setValueAtTime(.08, t); g.gain.exponentialRampToValueAtTime(.0001, t + .05);
  o.connect(bp); bp.connect(g); bus(g, .3); o.start(t); o.stop(t + .06);
}
function saxNote(m, t, dur, vel = .16) {
  const C = MUS.ctx, f = mf(m);
  const o1 = C.createOscillator(), o2 = C.createOscillator(); o1.type = 'sawtooth'; o2.type = 'square'; o1.frequency.value = f; o2.frequency.value = f * 1.002;
  // плъзгане в тона и вибрато, което се засилва
  o1.frequency.setValueAtTime(f * .97, t); o1.frequency.exponentialRampToValueAtTime(f, t + .09);
  const lfo = C.createOscillator(), lg = C.createGain(); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * .012, t + Math.max(.2, dur * .7));
  lfo.connect(lg); lg.connect(o1.frequency); lg.connect(o2.frequency);
  const mix = C.createGain(); mix.gain.value = .5; const m2 = C.createGain(); m2.gain.value = .22;
  const lp = C.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2;
  lp.frequency.setValueAtTime(700, t); lp.frequency.linearRampToValueAtTime(1900, t + .08); lp.frequency.linearRampToValueAtTime(1300, t + dur);
  const fm = C.createBiquadFilter(); fm.type = 'peaking'; fm.frequency.value = 1100; fm.gain.value = 5;
  const g = C.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .06); g.gain.setTargetAtTime(vel * .8, t + .1, .2); g.gain.setTargetAtTime(.0001, t + dur, .07);
  o1.connect(mix); o2.connect(m2); mix.connect(lp); m2.connect(lp); lp.connect(fm); fm.connect(g); bus(g, .55);
  noiseHit(t, { f: 1500, type: 'bandpass', q: 1, vol: vel * .25, dur: .12, atk: .02 }); // дъх
  [o1, o2, lfo].forEach(o => { o.start(t); o.stop(t + dur + .4); });
}

/* ─── Композитор ─── */
function chordAt(bar) { const M = MOODS[MUS.mood], [r, q] = M.prog[bar % M.prog.length]; return { root: 48 + NOTE[r], iv: QUAL[q] }; }
function scheduleStep(i, t) {
  const M = MOODS[MUS.mood], spb = 60 / M.bpm, beat = Math.floor(i / 2), bar = Math.floor(beat / 4), b4 = beat % 4, off = i % 2;
  const ch = chordAt(bar), nx = chordAt(bar + 1);
  // ударни
  if (M.drums === 'brush') {
    if (!off) noiseHit(t, { f: 7000, vol: .05, dur: .22 }); else if (Math.random() < .7) noiseHit(t, { f: 8000, vol: .035, dur: .12 });
    if (!off && (b4 === 1 || b4 === 3)) noiseHit(t, { f: 2500, type: 'bandpass', q: .5, vol: .06, dur: .3, atk: .04 });
    if (!off && b4 === 0 && Math.random() < .6) kick(t, .22);
  } else if (M.drums === 'bossa') {
    if ([0, 3, 6, 10, 13].includes(i % 16)) rim(t);
    if (!off) noiseHit(t, { f: 9000, vol: .03, dur: .07 });
    if (i % 8 === 0 || i % 8 === 3) kick(t, .25);
  }
  // бас
  if (M.bass && !off) {
    const walk = M.drums === 'bossa' ? [0, null, 7, null][b4] : [0, ch.iv[1] || 4, 7, null][b4];
    const m = walk === null ? (nx.root - 12 + (Math.random() < .5 ? 1 : -1)) : ch.root - 12 + walk;
    if (!(M.drums === 'bossa' && walk === null)) bassNote(m, t, spb * (M.drums === 'bossa' ? 1.5 : .9));
  }
  // акорди
  if (M.keys === 'piano') {
    if (!off || Math.random() < .35) { const pool = ch.iv.map(x => ch.root + 12 + x); keysNote(pool[(i + bar) % pool.length] + (Math.random() < .25 ? 12 : 0), t, spb * .9, .1, 'piano'); }
    if (i % 8 === 0) { keysNote(ch.root, t, spb * 4, .12, 'piano'); keysNote(ch.root + 7, t, spb * 4, .08, 'piano'); }
  } else if (M.keys === 'guitar') {
    if ([0, 3, 6, 10, 12].includes(i % 16)) ch.iv.slice(1).forEach((x, k) => keysNote(ch.root + 12 + x, t + k * .012, spb * .8, .055, 'guitar'));
  } else if ((i % 8 === 0) || (i % 8 === 5 && Math.random() < .5)) {
    ch.iv.slice(1).forEach(x => keysNote(ch.root + 12 + x, t, spb * (i % 8 === 0 ? 2.5 : 1), .07, 'rhodes'));
  }
  // саксофон — фрази с паузи
  if (M.sax && i >= MUS.saxNext) {
    const scale = [0, 2, 3, 5, 7, 9, 10].map(x => ch.root + 12 + x);
    if (Math.random() < .3) { MUS.saxNext = i + 2 + Math.floor(Math.random() * 6); return; } // пауза — „дишане“
    let tgt = MUS.lastSax || (ch.root + 24 + ch.iv[1]);
    tgt += [-2, -1, 1, 2, 3, -3, 0][Math.floor(Math.random() * 7)];
    const all = []; for (let o = 0; o < 2; o++) scale.forEach(s => all.push(s + 12 * o)); ch.iv.forEach(x => all.push(ch.root + 24 + x));
    const m = all.reduce((a, b) => Math.abs(b - tgt) < Math.abs(a - tgt) ? b : a, all[0]);
    const lenSteps = [1, 1, 2, 2, 3, 4, 6][Math.floor(Math.random() * 7)];
    const clamp = Math.max(62, Math.min(80, m));
    saxNote(clamp, t, lenSteps * spb / 2 * .95, .12 + Math.random() * .05);
    MUS.lastSax = clamp; MUS.saxNext = i + lenSteps;
  }
}
function musTick() {
  const C = MUS.ctx, M = MOODS[MUS.mood], spb = 60 / M.bpm;
  while (MUS.next < C.currentTime + .25) {
    const i = MUS.step, off = i % 2;
    const swingDelay = off ? (M.swing - .5) * spb : 0;
    scheduleStep(i, MUS.next + swingDelay);
    MUS.next += spb / 2; MUS.step++;
  }
}
function musPlay(mood) {
  try { musInit(); } catch (e) { toast('Музиката не се поддържа тук'); return; }
  if (mood) MUS.mood = mood;
  const C = MUS.ctx; C.resume();
  if (!MUS.playing) { MUS.step = 0; MUS.next = C.currentTime + .1; MUS.saxNext = 4; MUS.lastSax = 0; MUS.timer = setInterval(musTick, 30); }
  MUS.playing = true;
  const v = (S.settings.musVol ?? 60) / 100;
  MUS.master.gain.cancelScheduledValues(C.currentTime); MUS.master.gain.setTargetAtTime(v * .9, C.currentTime, .6);
  S.settings.music = true; S.settings.musMood = MUS.mood; save(); musUI();
}
function musStop(keepPref) {
  if (!MUS.ctx || !MUS.playing) { musUI(); return; }
  const C = MUS.ctx; MUS.master.gain.setTargetAtTime(0, C.currentTime, .3);
  clearInterval(MUS.timer); MUS.playing = false;
  setTimeout(() => { if (!MUS.playing) C.suspend(); }, 1500);
  if (!keepPref) { S.settings.music = false; save(); }
  musUI();
}
function musVol(v) { S.settings.musVol = v; save(); if (MUS.ctx && MUS.playing) MUS.master.gain.setTargetAtTime(v / 100 * .9, MUS.ctx.currentTime, .1); }

/* ─── Плейър ─── */
function musUI() {
  let b = document.getElementById('musFab');
  if (!b) {
    b = document.createElement('button'); b.id = 'musFab'; b.className = 'mus-fab'; b.setAttribute('aria-label', 'Музика');
    b.onclick = musSheet; document.body.appendChild(b);
  }
  b.classList.toggle('on', MUS.playing);
  b.innerHTML = MUS.playing ? `<span class="eq"><i></i><i></i><i></i></span>` : '🎵';
}
function musSheet() {
  const cur = MUS.mood;
  openSheet(`<h3>🎶 MAMA Lounge</h3><div class="muted small">Лека музика, докато пазаруваш и готвиш. Свири се на живо в телефона — всеки път малко различно.</div>
    <div class="mus-moods">${Object.entries(MOODS).map(([k, m]) => `<button class="mus-mood ${k === cur ? 'on' : ''}" data-mood="${k}"><span>${m.e}</span>${m.name}</button>`).join('')}</div>
    <div class="row" style="gap:12px;align-items:center;margin-top:14px"><button class="btn primary" id="musPP" style="min-width:120px">${MUS.playing ? '⏸ Пауза' : '▶ Пусни'}</button>
      <span>🔈</span><input type="range" id="musV" min="0" max="100" value="${S.settings.musVol ?? 60}" style="flex:1" aria-label="Сила на звука"><span>🔊</span></div>
    <label class="row" style="gap:8px;margin-top:14px;align-items:center"><input type="checkbox" id="musAuto" ${S.settings.musAuto ? 'checked' : ''} style="width:22px;height:22px;accent-color:#0e7a5c"><span class="small">Пускай музиката при отваряне на приложението</span></label>`, el => {
    el.querySelectorAll('[data-mood]').forEach(b => b.onclick = () => { musPlay(b.dataset.mood); musSheet(); });
    el.querySelector('#musPP').onclick = () => { MUS.playing ? musStop() : musPlay(); musSheet(); };
    el.querySelector('#musV').oninput = e => musVol(+e.target.value);
    el.querySelector('#musAuto').onchange = e => { S.settings.musAuto = e.target.checked; save(); };
  });
}
document.addEventListener('DOMContentLoaded', () => {
  if (S.settings.musMood && MOODS[S.settings.musMood]) MUS.mood = S.settings.musMood;
  setTimeout(musUI, 1800);
  // звукът може да тръгне само след докосване — пускаме при първото докосване, ако е включено
  if (S.settings.musAuto) {
    const go1 = () => { document.removeEventListener('pointerdown', go1, true); if (!MUS.playing) musPlay(); };
    document.addEventListener('pointerdown', go1, true);
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && MUS.playing) { musStop(true); MUS.resume = true; }
  else if (!document.hidden && MUS.resume) { MUS.resume = false; if (S.settings.music) musPlay(); }
});
