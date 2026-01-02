const CACHE_NAME = 'reza-wallet-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache opened');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch logic
self.addEventListener('fetch', (event) => {
  // 1. SKIP Supabase and other API calls
  // Service Workers should generally not intercept POST requests or Auth APIs
  if (
    event.request.url.includes('supabase.co') || 
    event.request.method !== 'GET'
  ) {
    return; // Handled by the browser directly
  }

  // 2. Standard Cache-First Strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});

// Update service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
