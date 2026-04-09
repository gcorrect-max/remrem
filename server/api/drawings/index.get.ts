import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql  = useDb()
  // Return list without the base64 blob to keep response small
  const rows = await sql`
    SELECT id, name, description, mime_type, updated_at,
           (image_base64 IS NOT NULL AND image_base64 <> '') AS has_image
    FROM drawings
    ORDER BY id
  `
  return rows.map(r => ({
    id:          String(r.id),
    name:        r.name,
    description: r.description,
    mimeType:    r.mime_type,
    hasImage:    r.has_image,
    updatedAt:   r.updated_at,
  }))
})
