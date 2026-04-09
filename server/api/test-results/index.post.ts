import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    sessionId: number
    testName:  string
    status:    string
    measuredAt?: string
    params?: Array<{
      name: string; value: string; unit?: string
      lowLimit?: number; highLimit?: number; status?: string
    }>
    logs?: Array<{ level: string; message: string; ts?: string }>
  }>(event)

  if (!body?.sessionId || !body?.testName || !body?.status) {
    throw createError({ statusCode: 400, message: 'sessionId, testName and status are required' })
  }

  const sql = useDb()

  const [r] = await sql`
    INSERT INTO test_results (session_id, test_name, status, measured_at)
    VALUES (
      ${body.sessionId},
      ${body.testName},
      ${body.status},
      ${body.measuredAt ? new Date(body.measuredAt) : sql`NOW()`}
    )
    RETURNING *
  `

  if (body.params?.length) {
    const paramRows = body.params.map(p => ({
      result_id:  r.id,
      name:       p.name,
      value:      p.value,
      unit:       p.unit       ?? null,
      low_limit:  p.lowLimit   ?? null,
      high_limit: p.highLimit  ?? null,
      status:     p.status     ?? null,
    }))
    await sql`INSERT INTO test_result_params ${sql(paramRows)}`
  }

  if (body.logs?.length) {
    const logRows = body.logs.map(l => ({
      result_id: r.id,
      level:     l.level,
      message:   l.message,
      ts:        l.ts ? new Date(l.ts) : new Date(),
    }))
    await sql`INSERT INTO test_result_logs ${sql(logRows)}`
  }

  return { id: String(r.id), status: r.status, measuredAt: r.measured_at }
})
