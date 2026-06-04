import { applyDatabaseSchema } from './applySchema.js'
import { pool } from './pool.js'

applyDatabaseSchema()
  .then(() => {
    console.log('Database schema applied.')
    return pool.end()
  })
  .catch((err) => {
    console.error(err)
    pool.end().finally(() => process.exit(1))
  })
