import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const query  = getQuery(event)
  const limit  = Number(query.limit  ?? 50)
  const offset = Number(query.offset ?? 0)
  const status = query.status as string | undefined

  const sql = useDb()
  const rows = status
    ? await sql`
        SELECT ts.*, d.serial_no AS device_serial_no, d.model AS device_model
        FROM test_sessions ts
        JOIN devices d ON d.id = ts.device_id
        WHERE ts.status = ${status}
        ORDER BY ts.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT ts.*, d.serial_no AS device_serial_no, d.model AS device_model
        FROM test_sessions ts
        JOIN devices d ON d.id = ts.device_id
        ORDER BY ts.started_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM test_sessions`

  return {
    total: count,
    items: rows.map(s => ({
      id:          String(s.id),
      deviceId:    String(s.device_id),
      serialNo:    s.device_serial_no,
      deviceModel: s.device_model,
      operator:    s.operator,
      status:      s.status,
      startedAt:   s.started_at,
      finishedAt:  s.finished_at,
    })),
  }
})
