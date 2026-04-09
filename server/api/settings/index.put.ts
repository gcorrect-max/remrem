import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)

  if (!body || typeof body !== 'object') {
    throw createError({ statusCode: 400, message: 'Body must be a key-value object' })
  }

  const sql     = useDb()
  const entries = Object.entries(body)

  if (entries.length === 0) return { updated: 0 }

  // Upsert all provided key-value pairs
  const rows = entries.map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
    updated_at: new Date(),
  }))

  await sql`
    INSERT INTO app_settings ${sql(rows)}
    ON CONFLICT (key) DO UPDATE
      SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
  `

  return { updated: entries.length }
})
