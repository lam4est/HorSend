import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pool } from './pool.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(__dirname, 'schema.sql')
const alterPath = path.join(__dirname, 'alter.sql')

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

export async function applyDatabaseSchema (): Promise<void> {
  if (await hasAppDatabaseSchema()) {
    console.log('PostgreSQL: using existing app schema (workflows, workflow_user, …).')
    return
  }
  await pool.query(fs.readFileSync(schemaPath, 'utf8'))
  await pool.query(fs.readFileSync(alterPath, 'utf8'))
  console.log('PostgreSQL: demo schema applied (workflow_templates, …). Run: pnpm db:seed')
}
