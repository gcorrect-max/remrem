import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql = useDb()
  const rows = await sql`SELECT * FROM instruments ORDER BY id`
  return rows.map(r => ({
    id:           String(r.id),
    name:         r.name,
    type:         r.type,
    status:       r.status,
    address:      r.address,
    manufacturer: r.manufacturer,
    model:        r.model,
    serialNo:     r.serial_no,
    firmware:     r.firmware,
    lastSeen:     r.last_seen,
  }))
})
