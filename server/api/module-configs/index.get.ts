import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const type  = query.type as string | undefined  // 'hardware' | 'software'

  const sql  = useDb()
  const rows = type
    ? await sql`SELECT * FROM module_configs WHERE type = ${type} ORDER BY id`
    : await sql`SELECT * FROM module_configs ORDER BY id`

  return rows.map(r => ({
    id:        String(r.id),
    name:      r.name,
    type:      r.type,
    slotIndex: r.slot_index,
    config:    r.config,
    updatedAt: r.updated_at,
  }))
})
