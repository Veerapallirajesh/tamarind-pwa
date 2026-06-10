const CACHE_NAME = 'tamarind-pwa-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/add-entry.js',
  '/js/parties.js',
  '/js/lists.js',
  '/js/reports.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first for API calls, cache first for assets
  if (e.request.url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response('{"error":"offline"}', { headers: { 'Content-Type': 'application/json' } })));
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }))
    );
  }
});
