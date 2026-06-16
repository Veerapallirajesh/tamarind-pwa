/* ============================================================
   sw.js — Service Worker
   Strategy:
   - HTML:        network-first (so new deploys load immediately)
   - JS/CSS:      stale-while-revalidate (fast load + background update)
   - Supabase:    network-only (never cache live data)
   - Everything else: network-first with cache fallback
   ============================================================ */

const CACHE_VERSION = 'tmr-v10';
const SHELL_ASSETS  = [
  '/',
  '/index.html',
  '/app.css',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
  '/js/config.js',
  '/js/utils.js',
  '/js/db.js',
  '/js/auth.js',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/add-entry.js',
  '/js/parties.js',
  '/js/lists.js',
  '/js/payments.js',
  '/js/reports.js'
];

/* ---- INSTALL: pre-cache shell ---- */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

/* ---- ACTIVATE: delete old caches ---- */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())  // take control of all open tabs
  );
});

/* ---- FETCH ---- */
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never cache Supabase or CDN requests — always fresh
  if (url.hostname.includes('supabase.co') || url.hostname.includes('jsdelivr.net')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } })
      )
    );
    return;
  }

  // HTML: network-first so new deploys are seen immediately
  if (request.headers.get('accept')?.includes('text/html') || url.pathname === '/') {
    e.respondWith(networkFirst(request));
    return;
  }

  // JS / CSS: network-first so code updates are always immediate
  // Falls back to cache only when offline
  if (url.pathname.match(/\.(js|css)$/)) {
    e.respondWith(networkFirst(request));
    return;
  }

  // Everything else: network-first with cache fallback
  e.respondWith(networkFirst(request));
});

/* ---- Strategies ---- */
async function networkFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached || new Response('Offline — please reconnect', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await fetchPromise;
}

/* ---- Notify open tabs when a new SW version is waiting ---- */
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
