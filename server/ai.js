import { AI_CONTEXT } from '../src/lib/aiContext.js'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

export async function handleAI({ method, body }) {
  if (method !== 'POST') return { statusCode: 405, body: 'Method not allowed' }
  const key = process.env.GROQ_API_KEY
  if (!key) return { statusCode: 503, body: 'AI is not configured' }

  let payload
  try {
    payload = typeof body === 'string' ? JSON.parse(body || '{}') : body || {}
  } catch {
    return { statusCode: 400, body: 'Invalid payload' }
  }

  const messages = Array.isArray(payload.messages)
    ? payload.messages
        .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
        .slice(-12)
        .map((item) => ({ role: item.role, content: String(item.content || '').slice(0, 1200) }))
    : []
  if (!messages.length) return { statusCode: 400, body: 'No message' }

  const guard =
    'Use the ChatWave context below for app questions. For every other topic, answer normally and helpfully in friendly Hinglish — never refuse and never say the topic is unsupported. ChatWave definitely HAS wallpapers (chat ⋮ → Chat wallpaper: 11 presets + My Photo upload), groups, calls, filters, pinned messages, multi-select and all the listed settings. Never claim a listed feature is missing.'
  const screen = typeof payload.screen === 'string' ? payload.screen.slice(0, 60) : ''
  const screenNote = screen
    ? `The user is currently viewing the "${screen}" screen of the app. When relevant, tailor examples and help to that screen.`
    : ''
  const context = `${guard}\n\n${screenNote}\n\n${AI_CONTEXT}\n\n${guard}`
  const conversation = messages.map((item, index) =>
    index === messages.length - 1 && item.role === 'user'
      ? { ...item, content: `${item.content}\n\n(Use the ChatWave context when relevant, otherwise answer normally.)` }
      : item
  )

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b',
        messages: [{ role: 'system', content: context }, ...conversation],
        temperature: 0.2,
        max_tokens: 800,
      }),
    })
    const data = await response.json()
    const text = data?.choices?.[0]?.message?.content
    if (!response.ok || !text) {
      return { statusCode: 502, body: data?.error?.message || 'AI request failed' }
    }
    return { statusCode: 200, body: JSON.stringify({ reply: text.trim() }) }
  } catch {
    return { statusCode: 502, body: 'AI request failed' }
  }
}
