/* MAMA — офлайн кеш за уеб версията (iPhone / компютър). */
const CACHE = 'mama-v11';
const SHELL = ['./', './index.html', './styles.css', './data.js', './app.js', './doctor.js', './world.js', './guide.js', './update.js', './doctor2.js', './doctor3.js', './extras.js', './shop2.js', './events.js', './holidays.js', './scanner.js', './vendor/zxing.min.js',
  './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // цени, време и др. — винаги от мрежата
  // Мрежата първо (за да идват обновленията), кешът — когато няма интернет
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
