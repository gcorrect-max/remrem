import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{ status: string }>(event)

  const allowed = ['running', 'passed', 'failed', 'aborted']
  if (!body?.status || !allowed.includes(body.status)) {
    throw createError({ statusCode: 400, message: `status must be one of: ${allowed.join(', ')}` })
  }

  const sql  = useDb()
  const sets: Record<string, unknown> = { status: body.status }
  if (body.status !== 'running') sets.finished_at = new Date()

  const [s] = await sql`
    UPDATE test_sessions SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING id, status, started_at, finished_at
  `
  if (!s) throw createError({ statusCode: 404, message: 'Session not found' })

  return { id: String(s.id), status: s.status, startedAt: s.started_at, finishedAt: s.finished_at }
})
