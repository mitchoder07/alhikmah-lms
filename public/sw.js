// Al-Hikmah LMS Service Worker
// Network-first for everything. Only caches static assets when offline.
// HTML is NEVER cached — users always get the latest version.

const CACHE_NAME = 'alhikmah-lms-v5'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Delete ALL old caches
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // NEVER intercept HTML navigations — always go to network
  if (request.mode === 'navigate') return

  // NEVER intercept API requests
  if (url.pathname.startsWith('/api/')) return

  // For static assets only: network-first, fall back to cache if offline
  if (url.pathname.startsWith('/_next/') || /\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
  }
})
