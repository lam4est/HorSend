import type { RequestHandler } from 'express'

/** Protects AI service routes when AI_SERVICE_KEY is set. */
export const requireServiceKey: RequestHandler = (req, res, next) => {
  const expected = process.env.AI_SERVICE_KEY?.trim()
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

export function userIdFromRequest (req: { header: (name: string) => string | undefined }): number {
  const id = Number(req.header('x-user-id') ?? '0')
  return Number.isFinite(id) && id > 0 ? id : 0
}
