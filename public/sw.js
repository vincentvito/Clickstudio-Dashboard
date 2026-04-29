// Minimal service worker — exists so browsers consider the app installable.
// We don't cache routes (Next.js handles HTTP caching), and we don't ship
// push notifications yet. Add caching strategies here if/when needed.

self.addEventListener("install", () => {
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

// A no-op fetch handler is required by some browsers (notably Chromium) to
// flag the SW as "controls navigation" and thus mark the app installable.
self.addEventListener("fetch", () => {
  // pass-through
})
