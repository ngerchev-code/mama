/* Автоматична проверка преди публикуване: отваря всички екрани на MAMA и спира версията при грешка.
   node tools/smoke.cjs [папка=www] */
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ROOT = path.resolve(process.argv[2] || 'www');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.webmanifest': 'application/manifest+json' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await chromium.launch();
  const fails = [];
  for (const scheme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme });
    page.on('pageerror', e => fails.push(`[${scheme}] ${e.message}`));
    // без външна мрежа: приложението трябва да работи и офлайн с вградените данни
    await page.route(u => !u.href.startsWith(base), r => r.abort());
    await page.addInitScript(() => {
      if (sessionStorage.smoke) return; sessionStorage.smoke = 1;
      localStorage.setItem('mama.v1', JSON.stringify({ prefs: { onboarded: true, name: 'Тест', diet: 'all', cuisines: ['bg'] }, guide: { toured: true, last: {}, shown: 0, seenWeb: 999, bf: new Date().toISOString().slice(0, 10) } }));
    });
    await page.goto(base + 'index.html');
    await page.waitForTimeout(2500);
    const r = await page.evaluate(async () => {
      const out = { screens: 0, bad: [] };
      if (typeof go !== 'function' || typeof RECIPES === 'undefined') { out.bad.push('приложението не зареди'); return out; }
      if (window.popOpen) closePopup(true);
      for (const s of [...document.querySelectorAll('main > section')].map(x => x.id.replace(/^s-/, ''))) {
        try { go(s); const el = document.getElementById('s-' + s); if (!el || !el.innerHTML.trim()) out.bad.push('празен екран: ' + s); else out.screens++; }
        catch (e) { out.bad.push(`екран ${s}: ${e.message}`); }
      }
      try { showRecipe(RECIPES[0].id); if (!document.querySelector('#sheetBody')) out.bad.push('рецептата не се отвори'); closeSheet(); } catch (e) { out.bad.push('рецепта: ' + e.message); }
      try { go('home'); popup({ title: 'Тест', text: 'т', actions: [{ label: 'OK', fn: null }] }); closePopup(true); } catch (e) { out.bad.push('прозорец: ' + e.message); }
      if (RECIPES.length < 100) out.bad.push('твърде малко рецепти: ' + RECIPES.length);
      return out;
    });
    r.bad.forEach(b => fails.push(`[${scheme}] ${b}`));
    console.log(`${scheme}: ${r.screens} екрана отворени`);
    await page.close();
  }
  await browser.close(); server.close();
  const real = fails.filter(f => !/Failed to fetch|NetworkError|net::ERR|Load failed/i.test(f));
  if (real.length) { console.error('ГРЕШКИ:\n' + real.join('\n')); process.exit(1); }
  console.log('✅ Проверката мина');
})().catch(e => { console.error(e); process.exit(1); });
