import { useDb } from '~/server/db/client'

/**
 * GET /api/rto-documents
 * Returns all known RTO documents (without raw_json blob for bandwidth).
 */
export default defineEventHandler(async () => {
  const sql  = useDb()
  const rows = await sql`
    SELECT id, name, revision, releaser, release_date, filename, bl30, created_at, updated_at
    FROM rto_documents
    ORDER BY updated_at DESC
  `
  return rows.map(r => ({
    id         : String(r.id),
    name       : r.name,
    revision   : r.revision,
    releaser   : r.releaser,
    releaseDate: r.release_date,
    filename   : r.filename,
    bl30       : r.bl30,
    createdAt  : r.created_at,
    updatedAt  : r.updated_at,
  }))
})
