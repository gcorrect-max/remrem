import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = getRouterParam(event, 'id')
  const body = await readBody<{
    label?: string; mimeType?: string; imageBase64?: string; sortOrder?: number
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = { updated_at: new Date() }

  if (body.label       !== undefined) sets.label        = body.label
  if (body.mimeType    !== undefined) sets.mime_type    = body.mimeType
  if (body.imageBase64 !== undefined) sets.image_base64 = body.imageBase64
  if (body.sortOrder   !== undefined) sets.sort_order   = body.sortOrder

  const [d] = await sql`
    UPDATE drawings SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING id, label, mime_type, sort_order, updated_at,
              (image_base64 IS NOT NULL AND image_base64 <> '') AS has_image
  `
  if (!d) throw createError({ statusCode: 404, message: 'Drawing not found' })

  return {
    id:        String(d.id),
    label:     d.label,
    mimeType:  d.mime_type,
    sortOrder: d.sort_order,
    hasImage:  d.has_image,
    updatedAt: d.updated_at,
  }
})
