import { useDb } from '~/server/db/client'

/**
 * GET /api/test-results/:id
 * Returns the full step result including bookmark_values, actions, json_report,
 * params, log lines, and any linked accuracy test header.
 */
export default defineEventHandler(async (event) => {
  const id  = Number(getRouterParam(event, 'id'))
  const sql = useDb()

  const [r] = await sql`SELECT * FROM test_results WHERE id = ${id}`
  if (!r) throw createError({ statusCode: 404, message: 'Result not found' })

  const params = await sql`
    SELECT key, value FROM test_result_params WHERE result_id = ${id} ORDER BY id
  `
  const logs = await sql`
    SELECT line, ts FROM test_result_logs WHERE result_id = ${id} ORDER BY sort_order, id
  `
  const accuracyTests = await sql`
    SELECT id, dut_name, channel, frequency, declared_class, test_result, test_start_time
    FROM accuracy_tests WHERE result_id = ${id} ORDER BY id
  `

  return {
    id             : String(r.id),
    sessionId      : String(r.session_id),
    stepId         : r.step_id,
    stepLabel      : r.step_label,
    stepName       : r.step_name,
    stepDetails    : r.step_details,
    stepStart      : r.step_start,
    stepStop       : r.step_stop,
    result         : r.result,
    finished       : r.finished,
    rtp100Index    : r.rtp100_index,
    bookmarkValues : r.bookmark_values ?? [],
    actions        : r.actions         ?? [],
    jsonReport     : r.json_report     ?? null,
    createdAt      : r.created_at,
    updatedAt      : r.updated_at,
    params         : params.map(p => ({ key: p.key, value: p.value })),
    logs           : logs.map(l => ({ line: l.line, ts: l.ts })),
    accuracyTests  : accuracyTests.map(a => ({
      id           : String(a.id),
      dutName      : a.dut_name,
      channel      : a.channel,
      frequency    : a.frequency,
      declaredClass: a.declared_class,
      testResult   : a.test_result,
      startTime    : a.test_start_time,
    })),
  }
})
