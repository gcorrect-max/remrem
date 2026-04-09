import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql = useDb()
  const [s] = await sql`
    SELECT ts.*, d.serial_no AS device_serial_no, d.model AS device_model
    FROM test_sessions ts
    JOIN devices d ON d.id = ts.device_id
    WHERE ts.status = 'running'
    ORDER BY ts.started_at DESC
    LIMIT 1
  `
  if (!s) return null

  const steps = await sql`
    SELECT * FROM test_steps
    WHERE session_id = ${s.id}
    ORDER BY step_order
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
  }
})
