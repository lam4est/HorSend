import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import { applyDatabaseSchema, hasAppDatabaseSchema } from './db/applySchema.js'
import { checkDatabase, pool } from './db/pool.js'
import { db } from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT ?? 3000)
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

function userId (req: express.Request): number {
  const id = Number(req.header('x-user-id') ?? '1')
  return Number.isFinite(id) && id > 0 ? id : 1
}

app.get('/api/health', asyncHandler(async (_req, res) => {
  const database = await checkDatabase()
  if (!database) {
    res.status(503).json({ ok: false, database: 'disconnected' })
    return
  }
  res.json({ ok: true, database: 'connected' })
}))

app.get('/api/workflows', asyncHandler(async (req, res) => {
  res.json(await db.listWorkflows(userId(req)))
}))

app.get('/api/workflow-catalog', asyncHandler(async (req, res) => {
  res.json(await db.workflowCatalog(userId(req)))
}))

app.post('/api/workflow-users', asyncHandler(async (req, res) => {
  const workflowId = Number(req.body?.workflow_id)
  if (!workflowId) {
    res.status(400).json({ error: 'workflow_id is required' })
    return
  }
  const result = await db.enrollWorkflow(userId(req), workflowId)
  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Workflow template not found' })
    return
  }
  if (result.error === 'conflict') {
    res.status(409).json({ error: 'Already enrolled' })
    return
  }
  res.status(201).json(result.data)
}))

app.delete('/api/workflow-users/:id', asyncHandler(async (req, res) => {
  const result = await db.deleteWorkflowUser(userId(req), Number(req.params.id))
  if (result.error) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(result)
}))

app.get('/api/workflows/:workflowId/detail', asyncHandler(async (req, res) => {
  const workflowUserId = req.query.workflow_user_id
    ? Number(req.query.workflow_user_id)
    : undefined
  const result = await db.getWorkflowDetail(
    userId(req),
    Number(req.params.workflowId),
    workflowUserId
  )
  if (result.error) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(result)
}))

app.put('/api/workflows/:workflowId', asyncHandler(async (req, res) => {
  const result = await db.updateWorkflow(
    userId(req),
    Number(req.params.workflowId),
    req.body ?? {}
  )
  if (result.error) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(result.data)
}))

app.post('/api/workflow-step-users/:id/confirm', asyncHandler(async (req, res) => {
  const result = await db.confirmStepUser(userId(req), Number(req.params.id))
  if (result.error) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  res.json(result)
}))

app.get('/api/templates', asyncHandler(async (req, res) => {
  const channel = String(req.query.channel ?? 'sms')
  res.json(await db.listTemplates(userId(req), channel))
}))

app.get('/api/contact-lists', asyncHandler(async (req, res) => {
  res.json(await db.listContactLists(userId(req)))
}))

app.get('/api/contacts', asyncHandler(async (req, res) => {
  const listId = req.query.contact_list_id ? Number(req.query.contact_list_id) : null
  res.json(await db.listContacts(userId(req), listId))
}))

app.get('/api/campaign/scheduler-subscriptions', asyncHandler(async (req, res) => {
  res.json(await db.schedulerCalendar(userId(req)))
}))

app.put('/api/campaign/scheduler-subscriptions', asyncHandler(async (req, res) => {
  const result = await db.putSchedulerSubscription(userId(req), req.body ?? {})
  if (result.error === 'bad_request') {
    res.status(400).json({ error: 'scheduler_event_id is required' })
    return
  }
  if (result.error === 'not_found') {
    res.status(404).json({ error: 'Scheduler event not found' })
    return
  }
  res.json(result)
}))

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  const message = err instanceof Error ? err.message : 'Internal Server Error'
  if (!res.headersSent) {
    res.status(500).json({ error: message })
  }
})

const frontendDist = path.join(__dirname, '../../frontend/dist')
if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
  app.use(express.static(frontendDist))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

async function logDatabaseSummary (): Promise<void> {
  if (await hasAppDatabaseSchema()) {
    const row = await pool.query<{
      workflows: string
      enrollments: string
      events: string
      subscriptions: string
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM workflows) AS workflows,
         (SELECT COUNT(*)::text FROM workflow_user WHERE user_id = 1) AS enrollments,
         (SELECT COUNT(*)::text FROM scheduler_event) AS events,
         (SELECT COUNT(*)::text FROM scheduler_event_subscription WHERE user_id = 1) AS subscriptions`
    )
    const s = row.rows[0]
    console.log(
      `PostgreSQL: workflows=${s?.workflows ?? 0}, enrollments(user 1)=${s?.enrollments ?? 0}, scheduler_events=${s?.events ?? 0}, subscriptions(user 1)=${s?.subscriptions ?? 0}`
    )
    return
  }
  const row = await pool.query<{
    templates: string
    events: string
    enrollments: string
  }>(
    `SELECT
       (SELECT COUNT(*)::text FROM workflow_templates) AS templates,
       (SELECT COUNT(*)::text FROM scheduler_events) AS events,
       (SELECT COUNT(*)::text FROM workflow_users WHERE user_id = 1) AS enrollments`
  )
  const { templates, events, enrollments } = row.rows[0] ?? {
    templates: '0',
    events: '0',
    enrollments: '0'
  }
  if (Number(templates) === 0 || Number(events) === 0) {
    console.warn(
      `Demo DB looks empty (templates=${templates}, scheduler_events=${events}). Run: pnpm db:seed`
    )
  } else if (Number(enrollments) === 0) {
    console.warn(
      'No workflows enrolled for user 1. Run: pnpm db:seed'
    )
  }
}

async function start (): Promise<void> {
  const database = await checkDatabase()
  if (!database) {
    console.error(
      'Cannot connect to PostgreSQL. Start Postgres (docker compose up -d or backend-db-1), set DATABASE_URL in .env, then: pnpm db:migrate && pnpm db:seed'
    )
    process.exit(1)
  }
  await applyDatabaseSchema()
  await logDatabaseSummary()
  app.listen(PORT, () => {
    console.log(`API http://127.0.0.1:${PORT}`)
    console.log('Frontend dev: open the URL shown by Vite (often http://127.0.0.1:5173)')
  })
}

start().catch((err) => {
  console.error(err)
  process.exit(1)
})
