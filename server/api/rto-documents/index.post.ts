import { useDb } from '~/server/db/client'

/**
 * POST /api/rto-documents
 * Called by LabVIEW at application startup with the full RTO JSON loaded from CINNAMON.
 * Upserts the document by (name, revision); returns the id for use in test session creation.
 *
 * Body is the raw RTO JSON structure as produced by LabVIEW, e.g.:
 * {
 *   "REM102": {
 *     "Steps": [["4.6", "Power supply tests", "1", "1", ...], ...],
 *     "Revision": "A14",
 *     "Name": "5.2901.046J01",
 *     "Devices IDs": [],
 *     "Identifier": {
 *       "Model": ["REM102-G-G-AC1-W-8-4GS-O-000", ...],
 *       "ArtNo.": ["5.6602.022/01", ...]
 *     }
 *   },
 *   "Metrics": {
 *     "Name": "5.2901.046J01", "Revision": "A14",
 *     "Releaser": "J. Dobiáš", "Release Date": "18/02/2026",
 *     "FileName": "5.2901.046J01_...xlsx"
 *   },
 *   "BL3.0?": true
 * }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<Record<string, unknown>>(event)
  if (!body) {
    throw createError({ statusCode: 400, message: 'RTO JSON body is required' })
  }

  const sql     = useDb()
  const metrics = (body['Metrics'] ?? {}) as Record<string, string>
  const name     = metrics['Name']         ?? ''
  const revision = metrics['Revision']     ?? ''

  if (!name || !revision) {
    throw createError({ statusCode: 400, message: 'Metrics.Name and Metrics.Revision are required' })
  }

  // Upsert the document header
  const [doc] = await sql`
    INSERT INTO rto_documents (name, revision, releaser, release_date, filename, bl30, raw_json, updated_at)
    VALUES (
      ${name},
      ${revision},
      ${metrics['Releaser']      ?? null},
      ${metrics['Release Date']  ?? null},
      ${metrics['FileName']      ?? null},
      ${(body['BL3.0?'] as boolean) ?? false},
      ${sql.json(body)},
      NOW()
    )
    ON CONFLICT (name, revision)
    DO UPDATE SET
      releaser    = EXCLUDED.releaser,
      release_date= EXCLUDED.release_date,
      filename    = EXCLUDED.filename,
      bl30        = EXCLUDED.bl30,
      raw_json    = EXCLUDED.raw_json,
      updated_at  = NOW()
    RETURNING id
  `

  // Re-seed identifiers and steps (delete + re-insert for simplicity)
  await sql`DELETE FROM rto_identifiers WHERE rto_id = ${doc.id}`
  await sql`DELETE FROM rto_steps       WHERE rto_id = ${doc.id}`

  // Parse identifiers from the first device-key block (e.g. "REM102")
  const deviceKeys = Object.keys(body).filter(k => k !== 'Metrics' && k !== 'BL3.0?' && k !== 'TestOverview data')
  for (const key of deviceKeys) {
    const block = body[key] as Record<string, unknown>
    const ident = (block['Identifier'] ?? {}) as Record<string, string[]>
    const models    = ident['Model']    ?? []
    const artNos    = ident['ArtNo.']   ?? []
    const maxLen    = Math.max(models.length, artNos.length)

    if (maxLen > 0) {
      const identRows = Array.from({ length: maxLen }, (_, i) => ({
        rto_id        : doc.id,
        model         : models[i]  ?? null,
        article_number: artNos[i]  ?? null,
        sort_order    : i,
      }))
      await sql`INSERT INTO rto_identifiers ${sql(identRows)}`
    }

    // Parse steps (2D array rows)
    const steps = (block['Steps'] ?? []) as string[][]
    if (steps.length > 0) {
      const stepRows = steps.map((row, i) => ({
        rto_id      : doc.id,
        step_no     : row[0] ?? null,
        step_name   : row[1] ?? null,
        model_values: sql.json(row.slice(2)),
        sort_order  : i,
      }))
      await sql`INSERT INTO rto_steps ${sql(stepRows)}`
    }
  }

  return { id: String(doc.id), name, revision }
})
