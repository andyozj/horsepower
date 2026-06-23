// public/sw.js — Horsepower app-shell cache. Navigation is NETWORK-FIRST (cache only offline), so a deploy
// is never served stale — the old stale-while-revalidate served the previous index.html on the first reload
// after every deploy, which kept hiding fresh UI fixes from returning users.
// Secure-context only (https/localhost); on http-LAN it never registers (see the guard in index.html).
const V = 'hp-shell-v4';
const SHELL = ['/', '/fonts/fraunces-latin-var.woff2', '/fonts/inter-latin-var.woff2',
               '/fonts/caveat-latin-var.woff2', '/manifest.json'];

self.addEventListener('install', e => {
  // addAll is all-or-nothing; tolerate a missing font file so install never wedges the SW
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // network-only for /api (coach, info, health) and cross-origin; WebSocket upgrades never hit 'fetch'.
  // Rule #8: never let the cache impersonate the server — a stale coach reply is worse than a failure.
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.startsWith('/api/')) return;
  // Only the SPA's own routes (extensionless: '/', '/whatever') get the shell rewrite. A navigation to a
  // REAL file (e.g. /horsepower-5slides.html) must be served as itself, not shadowed by the app shell —
  // the old code rewrote EVERY navigation to '/', which hid any static page hosted on this origin.
  if (e.request.mode === 'navigate' && !/\.[a-z0-9]+$/i.test(u.pathname)) {
    // NETWORK-FIRST: always try the live shell; fall back to cache only when offline. Online users always
    // get the deployed index.html (no more stale UI after a deploy); offline still gets an instant reload.
    e.respondWith(
      fetch('/').then(r => { if (r.ok) caches.open(V).then(c => c.put('/', r.clone())); return r; })
        .catch(() => caches.open(V).then(c => c.match('/')))
    );
    return;
  }
  // cache-first for static assets (fonts are immutable per-version)
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
