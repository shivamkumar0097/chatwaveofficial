import { sendNotification, setVapidDetails } from 'web-push'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@chatwave.app'
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET

if (PUBLIC_KEY && PRIVATE_KEY) {
  setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY)
}

export async function handleNotify({ method, headers = {}, body }) {
  if (method !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  if (!SUPABASE_URL || !SERVICE_KEY) return { statusCode: 500, body: 'Server not configured' }

  const secret = headers['x-webhook-secret'] || headers['X-Webhook-Secret']
  if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' }
  }

  let payload
  try {
    payload = typeof body === 'string' ? JSON.parse(body || '{}') : body || {}
  } catch {
    return { statusCode: 400, body: 'Invalid payload' }
  }

  const record = payload.record || {}

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })

  const deliver = async (subscriptions, notification, options) => {
    await Promise.allSettled(
      subscriptions.map(async (row) => {
        try {
          await sendNotification(row.subscription, notification, options)
        } catch (error) {
          const status = error?.statusCode
          if (status === 404 || status === 410) {
            await supabase.from('push_subscriptions').delete().eq('id', row.id)
          }
        }
      })
    )
  }

  if (record.call_id && record.callee_id) {
    const callId = record.call_id
    const { data: invite } = await supabase
      .from('call_invites')
      .select('call_id, status')
      .eq('call_id', callId)
      .eq('callee_id', record.callee_id)
      .maybeSingle()
    if (!invite || invite.status !== 'pending') {
      return { statusCode: 200, body: 'Ignored' }
    }
    const details = record.payload || {}
    const callerName = details.fromName || 'Someone'
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('id, subscription')
      .eq('user_id', record.callee_id)
    if (!subscriptions?.length) return { statusCode: 200, body: 'No subscriptions' }

    const notification = JSON.stringify({
      type: 'call',
      title: callerName,
      body: details.withVideo ? 'Incoming video call' : 'Incoming voice call',
      tag: `cw-call-${callId}`,
      callId,
      url: `/?call=${encodeURIComponent(callId)}&caller=${encodeURIComponent(record.caller_id)}`,
    })

    await deliver(subscriptions, notification, { TTL: 60, urgency: 'high' })
    return { statusCode: 200, body: 'OK' }
  }

  if (!record.conversation_id || !record.sender_id || !record.id) {
    return { statusCode: 200, body: 'No data' }
  }

  const { data: message } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id')
    .eq('id', record.id)
    .maybeSingle()
  if (
    !message ||
    message.conversation_id !== record.conversation_id ||
    message.sender_id !== record.sender_id
  ) {
    return { statusCode: 200, body: 'Ignored' }
  }

  const { data: members } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', record.conversation_id)
    .neq('user_id', record.sender_id)

  const recipientIds = (members || []).map((member) => member.user_id)
  if (!recipientIds.length) return { statusCode: 200, body: 'No recipients' }

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, subscription')
    .in('user_id', recipientIds)
  if (!subscriptions?.length) return { statusCode: 200, body: 'No subscriptions' }

  const content = record.deleted_for_all
    ? 'Message deleted'
    : record.view_once
      ? 'View once message'
      : record.content ||
        (record.image_url ? 'Photo' : record.file_name ? record.file_name : 'New message')

  const notification = JSON.stringify({
    title: 'ChatWave',
    body: content,
    tag: record.conversation_id,
    url: `/?chat=${record.conversation_id}`,
  })

  await deliver(subscriptions, notification, { urgency: 'high' })

  return { statusCode: 200, body: 'OK' }
}
