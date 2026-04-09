import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id  = Number(getRouterParam(event, 'id'))
  const sql = useDb()

  const [d] = await sql`SELECT * FROM drawings WHERE id = ${id}`
  if (!d) throw createError({ statusCode: 404, message: 'Drawing not found' })

  return {
    id:          String(d.id),
    name:        d.name,
    description: d.description,
    mimeType:    d.mime_type,
    imageBase64: d.image_base64 ?? '',
    updatedAt:   d.updated_at,
  }
})
