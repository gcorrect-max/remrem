import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id  = Number(getRouterParam(event, 'id'))
  const sql = useDb()

  const [r] = await sql`SELECT * FROM test_results WHERE id = ${id}`
  if (!r) throw createError({ statusCode: 404, message: 'Result not found' })

  const params = await sql`
    SELECT * FROM test_result_params WHERE result_id = ${id} ORDER BY id
  `
  const logs = await sql`
    SELECT * FROM test_result_logs WHERE result_id = ${id} ORDER BY ts, id
  `

  return {
    id:         String(r.id),
    sessionId:  String(r.session_id),
    testName:   r.test_name,
    status:     r.status,
    measuredAt: r.measured_at,
    params: params.map(p => ({
      name:      p.name,
      value:     p.value,
      unit:      p.unit,
      lowLimit:  p.low_limit,
      highLimit: p.high_limit,
      status:    p.status,
    })),
    logs: logs.map(l => ({
      level:   l.level,
      message: l.message,
      ts:      l.ts,
    })),
  }
})
