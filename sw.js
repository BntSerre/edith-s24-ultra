// E.D.I.T.H. Tactical AI Service Worker (S24 Ultra Edition v2.0.6)
const CACHE_NAME = 'edith-s24ultra-v2.0.6';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/hud-s24.css',
  './js/audio.js',
  './js/speech.js',
  './js/ai-service.js',
  './js/vision-scanner.js',
  './js/tools-s24.js',
  './js/app-s24.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './favicon.ico'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[EDITH S24 SW v2.0.0] Installation...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[EDITH S24 SW] Purge ancien cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Network-First strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (url.origin.includes('googleapis.com') || 
      url.origin.includes('groq.com') || 
      url.origin.includes('openai.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const toCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, toCache));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
