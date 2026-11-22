// Service worker : met toute l'application en cache pour un usage 100 % hors connexion.
// Pour publier une mise à jour, changez le numéro de version ci-dessous.
const CACHE = 'gestion-loyers-v2';
const ASSETS = ['./', 'index.html', 'firebase-config.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];
const FB = 'https://www.gstatic.com/firebasejs/10.14.1/';
const SDK = ['firebase-app.js', 'firebase-auth.js', 'firebase-firestore.js'].map(f => FB + f);

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(async c => {
      await c.addAll(ASSETS);
      // Bibliothèque de synchronisation : mise en cache si possible (sans bloquer l'installation).
      await Promise.allSettled(SDK.map(u => c.add(u)));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mine = url.origin === location.origin;
  const sdk = url.href.startsWith(FB);
  if (!mine && !sdk) return; // appels Firebase (données, connexion) : jamais interceptés
  e.respondWith(
    caches.match(req, { ignoreSearch: mine }).then(hit =>
      hit || fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => mine ? caches.match('index.html') : Response.error())
    )
  );
});
