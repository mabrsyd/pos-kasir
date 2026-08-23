const CACHE_NAME = 'pos-ennou-v1';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/dashboard',
  '/pos',
  '/manifest.json',
];

// Install: pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET
  if (request.method !== 'GET') return;

  // API calls: network-first with offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API GETs
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            return new Response(
              JSON.stringify({ error: 'Offline', message: 'Tidak ada koneksi internet' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // Static assets and pages
  event.respondWith(
    (async () => {
      // For navigation requests (HTML pages), ALWAYS use Network-First
      if (request.mode === 'navigate') {
        try {
          const networkResponse = await fetch(request);
          if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // Fallback to cache if offline
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/');
        }
      }

      // For Next.js static chunks and other assets, use Stale-While-Revalidate or Cache-First
      const cached = await caches.match(request);
      if (cached) {
        // Update cache in background for next time
        fetch(request).then(response => {
          if (response.ok && url.origin === self.location.origin) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, response));
          }
        }).catch(() => {});
        return cached;
      }
      
      // If not in cache, fetch from network
      try {
        const response = await fetch(request);
        if (response.ok && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      } catch (err) {
        return new Response('Offline', { status: 503 });
      }
    })()
  );
});

// Listen for sync events (for offline transaction queue)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    event.respondWith(
      // The actual sync logic is in syncEngine.ts on the client side
      // This just triggers a notification
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_TRIGGER' });
        });
      })
    );
  }
});
