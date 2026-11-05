/* NFL Pulse ERP service worker.
 * Rules (so the app can never get stuck on an old version or show old data):
 *  - pages: always fetched from the network first; the saved copy is used only when offline
 *  - /_next/static/* (file names change every build), icons, branding: saved once, reused
 *  - data, API calls, everything else: never intercepted — always live from the server
 */
const VERSION = 'nos-sw-v1';
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

const OFFLINE_HTML = `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · NFL ERP</title><body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f8fafc;color:#0f172a">
<div style="text-align:center;padding:24px"><h1 style="font-size:20px">No internet connection</h1>
<p style="color:#334155">NFL ERP needs the network to show live factory data.<br>Check the connection and try again.</p>
<button onclick="location.reload()" style="padding:10px 18px;border-radius:8px;border:0;background:#0f274e;color:#fff;font-weight:700">Try again</button></div></body>`;

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // immutable build files and images: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/') || url.pathname.startsWith('/branding/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async cache => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  // page navigations: network-first, offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) caches.open(PAGE_CACHE).then(c => c.put(req, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(req)) || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }))
    );
  }
  // everything else (data JSON, API, uploads): not intercepted
});
