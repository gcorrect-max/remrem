/**
 * Database migration + seed script.
 * Run with:  npx tsx server/db/seed.ts
 *
 * Requires environment variables (copy .env.example → .env):
 *   POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import postgres from 'postgres'
import 'dotenv/config'

const __dir = dirname(fileURLToPath(import.meta.url))

const sql = postgres({
  host:     process.env.POSTGRES_HOST     ?? 'localhost',
  port:     Number(process.env.POSTGRES_PORT ?? 5432),
  database: process.env.POSTGRES_DB       ?? 'remview',
  username: process.env.POSTGRES_USER     ?? 'remview',
  password: process.env.POSTGRES_PASSWORD ?? 'remview_secret',
  max:      1,
  onnotice: () => {},  // suppress NOTICE messages
})

async function run() {
  console.log('Connecting to PostgreSQL…')

  const schemaPath = resolve(__dir, 'schema.sql')
  const seedPath   = resolve(__dir, 'seed.sql')

  console.log('Applying schema…')
  const schema = readFileSync(schemaPath, 'utf8')
  await sql.unsafe(schema)
  console.log('Schema applied.')

  console.log('Seeding data…')
  const seed = readFileSync(seedPath, 'utf8')
  await sql.unsafe(seed)
  console.log('Seed data inserted.')

  console.log('Done.')
  await sql.end()
}

run().catch(err => {
  console.error('Seed failed:', err.message)
  process.exit(1)
})
