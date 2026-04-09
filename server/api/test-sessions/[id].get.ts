import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id  = Number(getRouterParam(event, 'id'))
  const sql = useDb()

  const [s] = await sql`
    SELECT ts.*, d.serial_no AS device_serial_no, d.model AS device_model
    FROM test_sessions ts
    JOIN devices d ON d.id = ts.device_id
    WHERE ts.id = ${id}
  `
  if (!s) throw createError({ statusCode: 404, message: 'Session not found' })

  const steps = await sql`
    SELECT * FROM test_steps WHERE session_id = ${id} ORDER BY step_order
  `
  const results = await sql`
    SELECT tr.*, array_agg(
      json_build_object('name', trp.name, 'value', trp.value, 'unit', trp.unit,
                        'low', trp.low_limit, 'high', trp.high_limit, 'status', trp.status)
      ORDER BY trp.id
    ) FILTER (WHERE trp.id IS NOT NULL) AS params
    FROM test_results tr
    LEFT JOIN test_result_params trp ON trp.result_id = tr.id
    WHERE tr.session_id = ${id}
    GROUP BY tr.id
    ORDER BY tr.id
  `

  return {
    id:          String(s.id),
    deviceId:    String(s.device_id),
    serialNo:    s.device_serial_no,
    deviceModel: s.device_model,
    operator:    s.operator,
    status:      s.status,
    startedAt:   s.started_at,
    finishedAt:  s.finished_at,
    steps: steps.map(st => ({
      id:        String(st.id),
      name:      st.name,
      status:    st.status,
      stepOrder: st.step_order,
      startedAt: st.started_at,
      finishedAt: st.finished_at,
      message:   st.message,
    })),
    results: results.map(r => ({
      id:          String(r.id),
      testName:    r.test_name,
      status:      r.status,
      measuredAt:  r.measured_at,
      params:      r.params ?? [],
    })),
  }
})
