import { handleAI } from '../server/ai.js'

export default async function handler(req, res) {
  try {
    const result = await handleAI({ method: req.method, body: req.body })
    res.status(result.statusCode).send(result.body)
  } catch {
    res.status(500).send('Server error')
  }
}
