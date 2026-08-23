// Bump this string whenever the app changes, and keep APP_VERSION in app.js in step.
const CACHE = 'yen-tracker-v5';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      // cache: 'reload' so the shell is pulled from the network, never from the
      // browser's own HTTP cache, which would bake a stale copy into a new version.
      .then(c => c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Let the page ask us to hand over immediately.
self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Opening the app: try the network first so a published update is picked up
  // straight away, and fall back to the cached copy when there's no signal.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Exchange rates: network first, falling back to whatever we cached last.
  if (req.url.includes('frankfurter')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Everything else: answer from cache so it works with no signal, and refresh
  // the stored copy in the background.
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);

    const net = fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
        return res;
      })
      .catch(() => null);

    if (hit) {
      // Keep the background refresh alive after we've already answered —
      // without this the worker can be shut down before the copy is updated.
      e.waitUntil(net);
      return hit;
    }
    return (await net) || new Response('Offline', { status: 503, statusText: 'Offline' });
  })());
});
