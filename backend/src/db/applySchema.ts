import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(__dirname, 'schema.sql')
const alterPath = path.join(__dirname, 'alter.sql')
const sendQueuePath = path.join(__dirname, '../../../n8n/sql/workflow_send_queue.sql')

/** True when the main app tables already exist (workflows, workflow_user, …). */
export async function hasAppDatabaseSchema (): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'workflows'
     ) AS exists`
  )
  return rows[0]?.exists === true
}

async function applySendQueueSchema (): Promise<void> {
  if (!fs.existsSync(sendQueuePath)) return
  await pool.query(fs.readFileSync(sendQueuePath, 'utf8'))
}

export async function applyDatabaseSchema (): Promise<void> {
  if (await hasAppDatabaseSchema()) {
    await applySendQueueSchema()
    console.log('PostgreSQL: using existing app schema (workflows, workflow_user, …).')
    return
  }
  await pool.query(fs.readFileSync(schemaPath, 'utf8'))
  await pool.query(fs.readFileSync(alterPath, 'utf8'))
  await applySendQueueSchema()
  console.log('PostgreSQL: schema applied (workflows, scheduler_event, …). Run: pnpm db:seed')
}
