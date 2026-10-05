// Service worker: keeps the site working offline after the first visit.
// Serves files from the cache straight away and refreshes the cache in the background,
// so a new deploy shows up on the next reload.
const CACHE = 'bld-trainer-v1';
const FILES = [
  './',
  'index.html',
  'css/style.css',
  'js/app.js',
  'js/cube.js',
  'js/cube3d.js',
  'js/memo.js',
  'js/render.js',
  'js/scramble.js',
  'js/stats.js',
  'js/storage.js',
  'js/timer.js',
  'js/visual.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Ignore ?scramble=... so shared links work offline too
      const cached = await cache.match(request, { ignoreSearch: true });
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      return cached ?? fresh;
    }),
  );
});
