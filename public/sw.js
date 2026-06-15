// public/sw.js — Horsepower app-shell cache. Bump V on every deploy that changes index.html.
// Secure-context only (https/localhost); on http-LAN it never registers (see the guard in index.html).
const V = 'hp-shell-v1';
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
  if (e.request.mode === 'navigate') {
    // stale-while-revalidate for the shell: instant offline reload, fresh on the next one (so a forgotten
    // V bump is a freshness miss, not a correctness bug)
    e.respondWith(caches.open(V).then(async c => {
      const hit = await c.match('/');
      const net = fetch('/').then(r => { if (r.ok) c.put('/', r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  // cache-first for static assets (fonts are immutable per-version)
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
