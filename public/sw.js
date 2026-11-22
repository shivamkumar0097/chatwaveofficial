const CACHE = 'chatwave-v5'
const SHELL = ['/', '/index.html', '/logo.jpg', '/icons/icon-192.png', '/icons/icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => Promise.all(SHELL.map((url) => cache.add(url).catch(() => {}))))
        .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/index.html')))
  )
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : 'New message' }
  }
  if (data.type === 'call') {
    event.waitUntil(
      self.registration.showNotification(data.title || 'Incoming call', {
        body: data.body || 'Incoming ChatWave call',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: data.tag || `cw-call-${data.callId}`,
        renotify: true,
        requireInteraction: true,
        data: { url: data.url || '/', callId: data.callId },
        actions: [
          { action: 'answer', title: 'Answer' },
          { action: 'decline', title: 'Decline' },
        ],
      })
    )
    return
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'ChatWave', {
      body: data.body || 'New message',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: data.tag,
      data: { url: data.url || '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  const action = event.action
  const data = event.notification.data || {}
  event.notification.close()
  let target = data.url || '/'
  if (data.callUi === 'restore') {
    event.waitUntil(
      self.registration
        .getNotifications({ tag: 'cw-ongoing-call' })
        .catch(() => [])
        .then((list) => list.forEach((item) => item.close()))
        .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
        .then(async (clients) => {
          let focused = false
          for (const client of clients) {
            try {
              if (new URL(client.url).origin === self.location.origin) {
                client.postMessage({ type: 'cw:restore-call' })
                client.focus()
                focused = true
              }
            } catch {}
          }
          if (!focused) return self.clients.openWindow(target)
        })
    )
    return
  }
  if (action === 'message' && data.chatUrl) {
    target = data.chatUrl
  } else if (action === 'callback' && target.includes('missed=')) {
    target += `${target.includes('?') ? '&' : '?'}action=callback`
  } else if ((action === 'answer' || action === 'decline') && target.includes('call=')) {
    target += `${target.includes('?') ? '&' : '?'}action=${action}`
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const targetUrl = new URL(target, self.location.origin)
      const client = clients.find((item) => {
        try {
          const url = new URL(item.url)
          return url.origin === targetUrl.origin && url.pathname === targetUrl.pathname
        } catch {
          return false
        }
      })
      if (client) {
        await client.navigate(target)
        return client.focus()
      }
      return self.clients.openWindow(target)
    })
  )
})
