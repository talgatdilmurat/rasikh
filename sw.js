/* Rāsikh service worker — network-first shell, cache-first fonts, offline fallback */
const CACHE = 'rasikh-v2';
const ASSETS = [
  './', './index.html',
  './css/app.css',
  './data/quran.js', './data/fonts.json',
  './js/engine.js', './js/render.js', './js/app.js',
  './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png',
  "./fonts/QCF4_Hafs_01_W.woff2",
  "./fonts/QCF4_Hafs_02_W.woff2",
  "./fonts/QCF4_Hafs_03_W.woff2",
  "./fonts/QCF4_Hafs_34_W.woff2",
  "./fonts/QCF4_QBSML.woff2",
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  const isFont = new URL(e.request.url).pathname.indexOf('/fonts/') !== -1;

  if(isFont){
    // fonts are large and immutable → cache-first (fast, saves bandwidth)
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    })));
    return;
  }

  // app shell + data → network-first so updates land immediately when online,
  // falling back to cache offline (and to index.html only for navigations).
  e.respondWith(
    fetch(e.request).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(()=> caches.match(e.request).then(hit =>
      hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())
    ))
  );
});
