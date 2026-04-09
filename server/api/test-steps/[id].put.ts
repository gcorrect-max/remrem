import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    status?: string; message?: string; startedAt?: string; finishedAt?: string
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = {}

  if (body.status     !== undefined) sets.status      = body.status
  if (body.message    !== undefined) sets.message     = body.message
  if (body.startedAt  !== undefined) sets.started_at  = new Date(body.startedAt)
  if (body.finishedAt !== undefined) sets.finished_at = new Date(body.finishedAt)

  if (Object.keys(sets).length === 0) {
    throw createError({ statusCode: 400, message: 'Nothing to update' })
  }

  const [st] = await sql`
    UPDATE test_steps SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING *
  `
  if (!st) throw createError({ statusCode: 404, message: 'Step not found' })

  return {
    id:         String(st.id),
    sessionId:  String(st.session_id),
    name:       st.name,
    status:     st.status,
    stepOrder:  st.step_order,
    startedAt:  st.started_at,
    finishedAt: st.finished_at,
    message:    st.message,
  }
})
