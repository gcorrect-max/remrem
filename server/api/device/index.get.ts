import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql = useDb()
  const [device] = await sql`SELECT * FROM devices ORDER BY id LIMIT 1`
  if (!device) throw createError({ statusCode: 404, message: 'No device found' })

  return {
    id:               String(device.id),
    model:            device.model,
    articleNumber:    device.article_number,
    productionNumber: device.production_number,
    serialNo:         device.serial_no,
    rtoFile:          device.rto_file,
    rtoRevision:      device.rto_revision,
  }
})
