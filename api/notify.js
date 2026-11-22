import { handleNotify } from '../server/notify.js'

export default async function handler(req, res) {
  try {
    const result = await handleNotify({
      method: req.method,
      headers: req.headers,
      body: req.body,
    })
    res.status(result.statusCode).send(result.body)
  } catch {
    res.status(500).send('Server error')
  }
}
