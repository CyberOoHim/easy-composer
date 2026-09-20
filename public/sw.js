// Taigi Composer & Karaoke Studio Service Worker
const CACHE_NAME = 'taigi-composer-cache-v5';
const MAX_CACHE_ENTRIES = 75;

const PRECACHE_RESOURCES = [
  './',
  './manifest.webmanifest',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/icon-maskable-192x192.png',
  './icons/icon-maskable-512x512.png',
  './icons/icon.svg',
  './icons/apple-touch-icon.png'
];

function precacheUrlSet() {
  return new Set(PRECACHE_RESOURCES.map((path) => new URL(path, self.location).href));
}

async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length <= maxItems) return;

    // keys() is insertion order; precache is added first. Skip those URLs so
    // offline navigation can still fall back to caches.match('./').
    const protectedUrls = precacheUrlSet();
    const excess = keys.length - maxItems;
    let deleted = 0;
    for (const request of keys) {
      if (deleted >= excess) break;
      if (protectedUrls.has(request.url)) continue;
      await cache.delete(request);
      deleted += 1;
    }
  } catch (err) {
    console.warn('[SW] Cache trim error:', err);
  }
}

async function putWithCap(cacheName, request, response) {
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
    await trimCache(cacheName, MAX_CACHE_ENTRIES);
  } catch (err) {
    console.warn('[SW] Cache put failed:', err);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_RESOURCES).catch((err) => {
        console.error('[SW] Precache failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME && !name.startsWith('taigi-soundfont-cache')) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle http/https GET requests
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (!url.protocol.startsWith('http')) return;

  // Ignore Next.js HMR, dev server websockets, and API endpoints
  if (
    url.pathname.includes('/_next/webpack-hmr') ||
    url.pathname.includes('/__nextjs') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Network-first for HTML / Navigation requests, cache fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.status === 200) {
            const responseClone = response.clone();
            event.waitUntil(putWithCap(CACHE_NAME, event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return (
              cached ||
              caches.match('./') ||
              new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
            );
          });
        })
    );
    return;
  }

  // Stale-while-revalidate for static assets with cache capping
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        event.waitUntil(
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseClone = networkResponse.clone();
                return putWithCap(CACHE_NAME, event.request, responseClone);
              }
            })
            .catch(() => {})
        );
        return cachedResponse;
      }

      // Not cached: fetch from network with safe offline fallback
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            event.waitUntil(putWithCap(CACHE_NAME, event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match('./').then((fallback) => {
            return (
              fallback ||
              new Response('Network error and asset not cached offline.', {
                status: 503,
                statusText: 'Offline Unavailable',
              })
            );
          });
        });
    })
  );
});
