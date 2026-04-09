import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    name?: string; description?: string; mimeType?: string; imageBase64?: string
  }>(event)

  const sql  = useDb()
  const sets: Record<string, unknown> = { updated_at: new Date() }

  if (body.name        !== undefined) sets.name         = body.name
  if (body.description !== undefined) sets.description  = body.description
  if (body.mimeType    !== undefined) sets.mime_type    = body.mimeType
  if (body.imageBase64 !== undefined) sets.image_base64 = body.imageBase64

  const [d] = await sql`
    UPDATE drawings SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING id, name, description, mime_type, updated_at,
              (image_base64 IS NOT NULL AND image_base64 <> '') AS has_image
  `
  if (!d) throw createError({ statusCode: 404, message: 'Drawing not found' })

  return {
    id:          String(d.id),
    name:        d.name,
    description: d.description,
    mimeType:    d.mime_type,
    hasImage:    d.has_image,
    updatedAt:   d.updated_at,
  }
})
