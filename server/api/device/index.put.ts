import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    model?: string; articleNumber?: string; productionNumber?: string
    serialNo?: string; rtoFile?: string; rtoRevision?: string
  }>(event)

  const sql = useDb()
  const sets: Record<string, unknown> = { updated_at: new Date() }

  if (body.model            !== undefined) sets.model             = body.model
  if (body.articleNumber    !== undefined) sets.article_number    = body.articleNumber
  if (body.productionNumber !== undefined) sets.production_number = body.productionNumber
  if (body.serialNo         !== undefined) sets.serial_no         = body.serialNo
  if (body.rtoFile          !== undefined) sets.rto_file          = body.rtoFile
  if (body.rtoRevision      !== undefined) sets.rto_revision      = body.rtoRevision

  const [d] = await sql`
    UPDATE devices SET ${sql(sets)}
    WHERE id = (SELECT id FROM devices ORDER BY id LIMIT 1)
    RETURNING *
  `
  return { model: d.model, articleNumber: d.article_number,
           serialNo: d.serial_no, rtoFile: d.rto_file, rtoRevision: d.rto_revision }
})
