import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql  = useDb()
  const rows = await sql`SELECT key, value FROM app_settings ORDER BY key`

  // Return as flat key-value object
  return Object.fromEntries(rows.map(r => [r.key, r.value]))
})
