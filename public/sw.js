const CACHE_NAME = 'shop-khata-v2';

// 🛠️ 1. Install: Force the service worker to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 🛠️ 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 🛠️ 3. Fetch: The "Network First, then Cache" strategy
// This tries the internet first, but if it fails, it pulls the UI from the phone
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) || caches.match('/');
    })
  );
});