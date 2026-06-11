import cors from 'cors'
import express from 'express'
import { requireServiceKey } from './auth.js'
import {
  handleFeedback,
  handleGenerate,
  handleHealth,
  handleMarkAccepted
} from './routes.js'

const PORT = Number(process.env.AI_SERVICE_PORT ?? 8002)
const app = express()

app.use(cors())
app.use(express.json())

type AsyncRoute = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => Promise<void>

function asyncHandler (fn: AsyncRoute): express.RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next)
  }
}

app.get('/health', asyncHandler(handleHealth))

app.use(requireServiceKey)

app.post('/generate', asyncHandler(handleGenerate))
app.post('/feedback', asyncHandler(handleFeedback))
app.post('/internal/mark-accepted', asyncHandler(handleMarkAccepted))

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[ai-service]', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`[ai-service] listening on http://127.0.0.1:${PORT}`)
})
