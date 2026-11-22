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

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: AI_CONTEXT }, ...messages],
        temperature: 0.6,
        max_tokens: 420,
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
