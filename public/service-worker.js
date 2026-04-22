const CACHE_NAME = 'shop-khata-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.jsx', // or index.js depending on your setup
  '/src/App.jsx',
];

// Install Service Worker
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Fetch Assets from Cache
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => res || fetch(e.request))
  );
});