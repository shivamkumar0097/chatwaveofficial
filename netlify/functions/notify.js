import { handleNotify } from '../../server/notify.js'

export const handler = async (event) => {
  try {
    const result = await handleNotify({
      method: event.httpMethod,
      headers: event.headers,
      body: event.body,
    })
    return {
      statusCode: result.statusCode,
      body: result.body,
    }
  } catch {
    return { statusCode: 500, body: 'Server error' }
  }
}
