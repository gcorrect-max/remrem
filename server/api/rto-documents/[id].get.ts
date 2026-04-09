import { useDb } from '~/server/db/client'

/**
 * GET /api/rto-documents/:id
 * Returns full RTO document with identifiers and steps.
 * Omits raw_json blob by default; add ?raw=1 to include it.
 */
export default defineEventHandler(async (event) => {
  const id      = Number(getRouterParam(event, 'id'))
  const raw     = getQuery(event).raw === '1'
  const sql     = useDb()

  const [doc] = raw
    ? await sql`SELECT * FROM rto_documents WHERE id = ${id}`
    : await sql`SELECT id, name, revision, releaser, release_date, filename, bl30, created_at, updated_at
                FROM rto_documents WHERE id = ${id}`

  if (!doc) throw createError({ statusCode: 404, message: 'RTO document not found' })

  const identifiers = await sql`
    SELECT model, article_number FROM rto_identifiers WHERE rto_id = ${id} ORDER BY sort_order
  `
  const steps = await sql`
    SELECT step_no, step_name, model_values FROM rto_steps WHERE rto_id = ${id} ORDER BY sort_order
  `

  return {
    id         : String(doc.id),
    name       : doc.name,
    revision   : doc.revision,
    releaser   : doc.releaser,
    releaseDate: doc.release_date,
    filename   : doc.filename,
    bl30       : doc.bl30,
    createdAt  : doc.created_at,
    updatedAt  : doc.updated_at,
    ...(raw ? { rawJson: doc.raw_json } : {}),
    identifiers: identifiers.map(i => ({
      model         : i.model,
      articleNumber : i.article_number,
    })),
    steps: steps.map(s => ({
      stepNo     : s.step_no,
      stepName   : s.step_name,
      modelValues: s.model_values,
    })),
  }
})
