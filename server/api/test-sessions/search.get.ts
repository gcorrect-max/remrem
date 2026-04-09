import { useDb } from '~/server/db/client'

/**
 * GET /api/test-sessions/search
 *
 * Query params (all optional):
 *   model        – device model partial match (ILIKE)
 *   articleNo    – device article_number partial match
 *   articleRev   – device article_revision exact match
 *   articleName  – device article_name partial match
 *   serialNo     – device serial_no partial match
 *   status       – session overall_status exact (ok|fail|running|pending)
 *   stepResult   – sessions that contain at least one step with this result (OK|FAIL|SKIP)
 *   rtoName      – rto_documents.name partial match
 *   dateFrom     – session start_time >= ISO date (YYYY-MM-DD)
 *   dateTo       – session start_time <= ISO date (YYYY-MM-DD, inclusive end of day)
 *   operator     – operator partial match
 *   limit        – default 20, max 100
 *   offset       – default 0
 */
export default defineEventHandler(async (event) => {
  const q = getQuery(event)

  const limit  = Math.min(Number(q.limit  ?? 20), 100)
  const offset = Number(q.offset ?? 0)

  const model       = (q.model       as string | undefined)?.trim() || undefined
  const articleNo   = (q.articleNo   as string | undefined)?.trim() || undefined
  const articleRev  = (q.articleRev  as string | undefined)?.trim() || undefined
  const articleName = (q.articleName as string | undefined)?.trim() || undefined
  const serialNo    = (q.serialNo    as string | undefined)?.trim() || undefined
  const status      = (q.status      as string | undefined)?.trim() || undefined
  const stepResult  = (q.stepResult  as string | undefined)?.trim() || undefined
  const rtoName     = (q.rtoName     as string | undefined)?.trim() || undefined
  const dateFrom    = (q.dateFrom    as string | undefined)?.trim() || undefined
  const dateTo      = (q.dateTo      as string | undefined)?.trim() || undefined
  const operator    = (q.operator    as string | undefined)?.trim() || undefined

  const sql = useDb()

  // ── Dynamic WHERE fragments ────────────────────────────────────────────────
  type Frag = ReturnType<typeof sql>
  const conds: Frag[] = []

  if (model)       conds.push(sql`d.model           ILIKE ${'%' + model       + '%'}`)
  if (articleNo)   conds.push(sql`d.article_number  ILIKE ${'%' + articleNo   + '%'}`)
  if (articleName) conds.push(sql`d.article_name    ILIKE ${'%' + articleName + '%'}`)
  if (articleRev)  conds.push(sql`d.article_revision = ${articleRev}`)
  if (serialNo)    conds.push(sql`d.serial_no       ILIKE ${'%' + serialNo    + '%'}`)
  if (status)      conds.push(sql`ts.overall_status  = ${status}`)
  if (rtoName)     conds.push(sql`rd.name           ILIKE ${'%' + rtoName     + '%'}`)
  if (operator)    conds.push(sql`ts.operator        ILIKE ${'%' + operator   + '%'}`)
  if (dateFrom)    conds.push(sql`ts.start_time >= ${new Date(dateFrom + 'T00:00:00')}`)
  if (dateTo)      conds.push(sql`ts.start_time <= ${new Date(dateTo   + 'T23:59:59')}`)
  if (stepResult)  conds.push(sql`EXISTS (
    SELECT 1 FROM test_results tr2
    WHERE tr2.session_id = ts.id AND tr2.result = ${stepResult}
  )`)

  const where = conds.length
    ? sql`WHERE ${conds.reduce((a, b) => sql`${a} AND ${b}`)}`
    : sql``

  // ── Main query ─────────────────────────────────────────────────────────────
  const rows = await sql`
    SELECT
      ts.id,
      ts.overall_status,
      ts.start_time,
      ts.end_time,
      ts.duration_seconds,
      ts.progress_current,
      ts.progress_total,
      ts.operator,
      ts.rto_revision,
      d.model             AS device_model,
      d.article_number,
      d.article_revision,
      d.article_name,
      d.serial_no,
      d.customer_project,
      d.customer_purchaser,
      rd.name             AS rto_name,
      rd.revision         AS rto_doc_revision,
      COUNT(tr.id)::int                                        AS steps_total,
      COUNT(tr.id) FILTER (WHERE tr.result = 'OK')::int       AS steps_ok,
      COUNT(tr.id) FILTER (WHERE tr.result = 'FAIL')::int     AS steps_fail,
      COUNT(tr.id) FILTER (WHERE tr.result = 'SKIP')::int     AS steps_skip
    FROM test_sessions    ts
    LEFT JOIN devices      d  ON d.id  = ts.device_id
    LEFT JOIN rto_documents rd ON rd.id = ts.rto_document_id
    LEFT JOIN test_results  tr ON tr.session_id = ts.id
    ${where}
    GROUP BY ts.id, d.id, rd.id
    ORDER BY ts.start_time DESC
    LIMIT ${limit} OFFSET ${offset}
  `

  // ── Count query (same joins + where, no aggregation) ───────────────────────
  const [{ count }] = await sql`
    SELECT COUNT(DISTINCT ts.id)::int AS count
    FROM test_sessions    ts
    LEFT JOIN devices      d  ON d.id  = ts.device_id
    LEFT JOIN rto_documents rd ON rd.id = ts.rto_document_id
    ${where}
  `

  return {
    total: count,
    limit,
    offset,
    items: rows.map(s => ({
      id              : String(s.id),
      status          : s.overall_status,
      startTime       : s.start_time,
      endTime         : s.end_time,
      durationSeconds : s.duration_seconds,
      progressCurrent : s.progress_current,
      progressTotal   : s.progress_total,
      operator        : s.operator,
      rtoRevision     : s.rto_revision,
      rtoName         : s.rto_name,
      rtoDocRevision  : s.rto_doc_revision,
      device: {
        model          : s.device_model          ?? '—',
        articleNumber  : s.article_number        ?? '—',
        articleRevision: s.article_revision      ?? '—',
        articleName    : s.article_name          ?? '—',
        serialNo       : s.serial_no             ?? '—',
        customerProject: s.customer_project      ?? null,
        purchaser      : s.customer_purchaser    ?? null,
      },
      counts: {
        total: s.steps_total ?? 0,
        ok   : s.steps_ok    ?? 0,
        fail : s.steps_fail  ?? 0,
        skip : s.steps_skip  ?? 0,
      },
    })),
  }
})
