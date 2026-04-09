import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    name?: string; slotIndex?: number; config?: Record<string, unknown>
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = { updated_at: new Date() }

  if (body.name      !== undefined) sets.name       = body.name
  if (body.slotIndex !== undefined) sets.slot_index = body.slotIndex
  if (body.config    !== undefined) sets.config     = sql.json(body.config)

  const [m] = await sql`
    UPDATE module_configs SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING *
  `
  if (!m) throw createError({ statusCode: 404, message: 'Module config not found' })

  return {
    id:        String(m.id),
    name:      m.name,
    type:      m.type,
    slotIndex: m.slot_index,
    config:    m.config,
    updatedAt: m.updated_at,
  }
})
