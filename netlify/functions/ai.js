import { handleAI } from '../../server/ai.js'

export const handler = async (event) => {
  try {
    const result = await handleAI({ method: event.httpMethod, body: event.body })
    return { statusCode: result.statusCode, body: result.body }
  } catch {
    return { statusCode: 500, body: 'Server error' }
  }
}
