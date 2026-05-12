import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id  = getRouterParam(event, 'id')
  const sql = useDb()

  const [d] = await sql`SELECT * FROM drawings WHERE id = ${id}`
  if (!d) throw createError({ statusCode: 404, message: 'Drawing not found' })

  return {
    id:          String(d.id),
    label:       d.label,
    mimeType:    d.mime_type,
    imageBase64: d.image_base64 ?? '',
    sortOrder:   d.sort_order,
    updatedAt:   d.updated_at,
  }
})
