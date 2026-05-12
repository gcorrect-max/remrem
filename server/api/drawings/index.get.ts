import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql  = useDb()
  const rows = await sql`
    SELECT id, label, mime_type, sort_order, updated_at,
           (image_base64 IS NOT NULL AND image_base64 <> '') AS has_image
    FROM drawings
    ORDER BY sort_order, id
  `
  return rows.map(r => ({
    id:         String(r.id),
    label:      r.label,
    mimeType:   r.mime_type,
    sortOrder:  r.sort_order,
    hasImage:   r.has_image,
    updatedAt:  r.updated_at,
  }))
})
