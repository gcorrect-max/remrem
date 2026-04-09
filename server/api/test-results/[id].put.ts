import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    status?: string
    log?: { level: string; message: string; ts?: string }
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = {}

  if (body.status !== undefined) sets.status = body.status

  if (Object.keys(sets).length) {
    const [r] = await sql`
      UPDATE test_results SET ${sql(sets)} WHERE id = ${id} RETURNING id
    `
    if (!r) throw createError({ statusCode: 404, message: 'Result not found' })
  }

  if (body.log) {
    await sql`
      INSERT INTO test_result_logs (result_id, level, message, ts)
      VALUES (${id}, ${body.log.level}, ${body.log.message},
              ${body.log.ts ? new Date(body.log.ts) : new Date()})
    `
  }

  return { success: true }
})
