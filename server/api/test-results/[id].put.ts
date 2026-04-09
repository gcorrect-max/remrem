import { useDb } from '~/server/db/client'

/**
 * PUT /api/test-results/:id
 * Partial update: result, finished, rtp100Index, plus optional log line append.
 */
export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    result?      : string
    finished?    : boolean
    rtp100Index? : number
    log?         : { line: string; ts?: string }
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = {}

  if (body.result      !== undefined) sets.result       = body.result
  if (body.finished    !== undefined) sets.finished      = body.finished
  if (body.rtp100Index !== undefined) sets.rtp100_index  = body.rtp100Index

  if (Object.keys(sets).length) {
    sets.updated_at = new Date()
    const [r] = await sql`
      UPDATE test_results SET ${sql(sets)} WHERE id = ${id} RETURNING id
    `
    if (!r) throw createError({ statusCode: 404, message: 'Result not found' })
  }

  if (body.log) {
    await sql`
      INSERT INTO test_result_logs (result_id, line, ts)
      VALUES (${id}, ${body.log.line}, ${body.log.ts ? new Date(body.log.ts) : new Date()})
    `
  }

  return { success: true }
})
