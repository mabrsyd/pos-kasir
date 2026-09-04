// Service Worker — POS Kasir Ennou
// Strategy:
//   - Navigation (HTML)  : Network-First → Cache fallback → /offline
//   - API calls          : Network-First → Cache fallback (GET only)
//   - Static assets (_next/static) : Cache-First (immutable)
//   - Other              : Stale-While-Revalidate

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `pos-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `pos-dynamic-${CACHE_VERSION}`;

// Shell pages to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ─── INSTALL ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      // addAll fails if any URL fails — use individual puts for resilience
      return Promise.allSettled(
        PRECACHE_URLS.map((url) =>
          fetch(url)
            .then((res) => {
              if (res.ok) cache.put(url, res);
            })
            .catch(() => { /* ignore individual failures */ })
        )
      );
    })
  );
  // Take control immediately without waiting for old SW to be replaced
  self.skipWaiting();
});

// ─── ACTIVATE ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  const ALLOWED_CACHES = [STATIC_CACHE, DYNAMIC_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !ALLOWED_CACHES.includes(key))
          .map((key) => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ──────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin and GET
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin && !url.hostname.includes('fonts.')) return;

  // 1. Next.js static chunks — Stale-While-Revalidate (safer for dev mode hot-reloading)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
    return;
  }

  // 2. API calls — Network-First with cached fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstApi(request));
    return;
  }

  // 3. Navigation (HTML pages) — Network-First with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  // 4. Everything else (images, fonts, etc) — Stale-While-Revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// ─── STRATEGIES ─────────────────────────────────────────────────────────────

/**
 * Cache-First: serve from cache, only hit network if missing.
 * Best for: immutable assets (_next/static)
 */
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset not available offline', { status: 503 });
  }
}

/**
 * Network-First for API: try network, fallback to cache, then 503 JSON.
 * Best for: /api/* endpoints (GET only)
 */
async function networkFirstApi(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Tidak ada koneksi internet. Data mungkin tidak terkini.',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Network-First for navigation: try network, fallback to cache, then /offline page.
 * Best for: HTML page navigation
 */
async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Fallback to offline page
    const offlinePage = await caches.match('/offline');
    if (offlinePage) return offlinePage;

    return new Response(
      `<!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1">
          <title>Offline — POS Ennou</title>
          <style>
            body { font-family: system-ui, sans-serif; display: flex; align-items: center; 
                   justify-content: center; min-height: 100vh; margin: 0; background: #f0f9ff; }
            .card { text-align: center; padding: 2rem; max-width: 320px; }
            h1 { color: #0ea5e9; font-size: 1.5rem; }
            p { color: #64748b; }
            button { background: #0ea5e9; color: white; border: none; padding: 0.75rem 1.5rem;
                     border-radius: 0.5rem; cursor: pointer; font-size: 1rem; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <div style="font-size:4rem">📶</div>
            <h1>Tidak Ada Koneksi</h1>
            <p>Periksa koneksi internet Anda dan coba lagi.</p>
            <button onclick="location.reload()">Coba Lagi</button>
          </div>
        </body>
      </html>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  }
}

/**
 * Stale-While-Revalidate: serve from cache immediately, update in background.
 * Best for: images, fonts, other static assets
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then((response) => {
    if (response.ok && new URL(request.url).origin === self.location.origin) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  return cached || networkFetch;
}

// ─── BACKGROUND SYNC ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-transactions') {
    // Notify all open clients to trigger sync
    // The actual sync logic lives in syncEngine.ts on the client
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SW_SYNC_TRIGGER' });
        });
      })
    );
  }
});

// ─── PUSH NOTIFICATIONS (foundation) ────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'POS Ennou', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'POS Ennou', {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      tag: data.tag || 'pos-notification',
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.notification.data?.url) {
    event.waitUntil(
      self.clients.openWindow(event.notification.data.url)
    );
  }
});

// ─── MESSAGE CHANNEL ─────────────────────────────────────────────────────────

// Listen for messages from client (e.g., skip waiting on update)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
