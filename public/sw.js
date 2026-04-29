// Minimal service worker — exists so browsers consider the app installable
// and so we can receive Web Push notifications. No HTTP caching: Next.js
// handles that. Add caching strategies here if/when needed.

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

self.addEventListener("push", (event) => {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: "Click Studio", body: event.data.text() }
  }
  const title = data.title || "Click Studio"
  const options = {
    body: data.body ?? "",
    icon: data.icon || "/favicon.svg",
    badge: "/favicon.svg",
    tag: data.tag,
    renotify: Boolean(data.tag),
    data: { link: data.link || "/dashboard" },
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const link = event.notification.data?.link || "/dashboard"
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      // Reuse an existing tab for the same origin if one is open
      for (const client of all) {
        const url = new URL(client.url)
        if (url.origin === self.location.origin) {
          await client.focus()
          if ("navigate" in client) await client.navigate(link)
          return
        }
      }
      await self.clients.openWindow(link)
    })(),
  )
})
