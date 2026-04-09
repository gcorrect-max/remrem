import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    name?: string; type?: string; status?: string; address?: string
    manufacturer?: string; model?: string; serialNo?: string
    firmware?: string; lastSeen?: string
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = { updated_at: new Date() }

  if (body.name         !== undefined) sets.name         = body.name
  if (body.type         !== undefined) sets.type         = body.type
  if (body.status       !== undefined) sets.status       = body.status
  if (body.address      !== undefined) sets.address      = body.address
  if (body.manufacturer !== undefined) sets.manufacturer = body.manufacturer
  if (body.model        !== undefined) sets.model        = body.model
  if (body.serialNo     !== undefined) sets.serial_no    = body.serialNo
  if (body.firmware     !== undefined) sets.firmware     = body.firmware
  if (body.lastSeen     !== undefined) sets.last_seen    = new Date(body.lastSeen)

  const [r] = await sql`
    UPDATE instruments SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING *
  `
  if (!r) throw createError({ statusCode: 404, message: 'Instrument not found' })

  return {
    id:           String(r.id),
    name:         r.name,
    type:         r.type,
    status:       r.status,
    address:      r.address,
    manufacturer: r.manufacturer,
    model:        r.model,
    serialNo:     r.serial_no,
    firmware:     r.firmware,
    lastSeen:     r.last_seen,
  }
})
