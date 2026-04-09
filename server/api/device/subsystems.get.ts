import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql = useDb()
  const rows = await sql`
    SELECT ds.*, d.model AS device_model
    FROM device_subsystems ds
    JOIN devices d ON d.id = ds.device_id
    ORDER BY ds.id
  `
  return rows.map(r => ({
    id:          String(r.id),
    deviceId:    String(r.device_id),
    name:        r.name,
    status:      r.status,
    description: r.description,
  }))
})
