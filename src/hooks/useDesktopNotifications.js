import { useEffect } from 'react'

export function useDesktopNotifications() {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') return undefined

    const show = async (detail) => {
      const title = detail?.senderName || 'ChatWave'
      const body = detail?.body || 'New message'
      const tag = detail?.conversationId || 'chatwave-message'
      const options = {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag,
        renotify: true,
        data: { url: `/?chat=${tag}` },
      }

      if ('serviceWorker' in navigator) {
        try {
          const registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise((resolve) => window.setTimeout(() => resolve(null), 800)),
          ])
          if (registration) {
            await registration.showNotification(title, options)
            return
          }
        } catch {}
      }

      const notification = new Notification(title, options)
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    }

    const handler = async (event) => {
      if (window.localStorage.getItem('cw-desktop-notifications') === '0') return
      if (Notification.permission === 'default') {
        try {
          await Notification.requestPermission()
        } catch {}
      }
      if (Notification.permission !== 'granted') return
      await show(event.detail)
    }

    window.addEventListener('chatwave:incoming', handler)
    return () => window.removeEventListener('chatwave:incoming', handler)
  }, [])
}
