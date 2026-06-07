import type { RequestHandler } from 'express'

/** Protects /api/n8n/* when N8N_CAMPAIGN_SERVICE_KEY is set. */
export const requireN8nServiceKey: RequestHandler = (req, res, next) => {
  const expected = process.env.N8N_CAMPAIGN_SERVICE_KEY?.trim()
  if (!expected) {
    next()
    return
  }
  const key = req.header('x-service-key')?.trim()
  if (key !== expected) {
    res.status(401).json({ error: 'Invalid or missing X-Service-Key' })
    return
  }
  next()
}
