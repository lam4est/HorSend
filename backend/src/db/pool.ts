import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const backendRoot = path.join(__dirname, '../..')
const workspaceRoot = path.join(backendRoot, '..')

dotenv.config({ path: path.join(workspaceRoot, '.env') })
dotenv.config({ path: path.join(backendRoot, '.env') })

const { Pool } = pg

const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://postgres:123456@127.0.0.1:5433/app_db'

export const pool = new Pool({ connectionString })

export async function checkDatabase (): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
