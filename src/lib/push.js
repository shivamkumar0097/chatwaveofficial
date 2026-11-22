import { supabase } from '@/lib/supabase'

const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BHgTBzAQ1HCx4VjnG9mzY7FLkRayyrLr6XJzIyYw8zDm1-0yN5wktqy90ovrQJ073jSqSUhfoY-1-7SwJh_Ycpw'

const urlBase64ToUint8Array = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '')
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob(base64 + padding)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

export const pushSupported = () =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window

export const isPushEnabled = async () => {
  if (!pushSupported()) return false
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return false
  return Boolean(await registration.pushManager.getSubscription())
}

export const enablePush = async (user) => {
  if (!pushSupported() || !supabase || !user) {
    throw new Error('Push notifications are not supported in this browser.')
  }
  if (!import.meta.env.PROD) {
    throw new Error('Push notifications work in the installed app only.')
  }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was denied.')
  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }
  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint,
      subscription: json,
    },
    { onConflict: 'user_id,endpoint' }
  )
  if (error) throw new Error(error.message)
  return true
}

export const disablePush = async (user) => {
  let endpoint = null
  if (pushSupported()) {
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = registration && (await registration.pushManager.getSubscription())
    endpoint = subscription?.endpoint || null
    if (subscription) await subscription.unsubscribe()
  }
  if (supabase && user && endpoint) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)
  }
  return true
}
