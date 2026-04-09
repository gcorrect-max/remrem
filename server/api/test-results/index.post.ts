import { useDb } from '~/server/db/client'

/**
 * POST /api/test-results
 * Called by LabVIEW when a test step finishes.
 *
 * Body schema mirrors the LabVIEW step-log cluster:
 * {
 *   sessionId     : number       (required)
 *   stepId        : string       (required)  e.g. "4.7.9.1"
 *   stepLabel     : string
 *   stepName      : string       Step.Name VI filename
 *   stepDetails   : string       Step.Details description
 *   stepStart     : string       e.g. "12:53:22"
 *   stepStop      : string
 *   result        : string       "OK"|"FAIL"|"SKIP"
 *   finished      : boolean      ReportData.Finished?
 *   rtp100Index   : number       ReportData."Active RTP100 index"
 *   bookmarkValues: [{Bookmark, Value}, ...]
 *   actions       : string[]
 *   jsonReport    : object       {cfg, querry, "response body", data}
 *   params        : [{key, value}]            (optional key-value extras)
 *   logs          : [{line, ts?}]             (optional log lines)
 * }
 */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    sessionId      : number
    stepId         : string
    stepLabel?     : string
    stepName?      : string
    stepDetails?   : string
    stepStart?     : string
    stepStop?      : string
    result?        : string
    finished?      : boolean
    rtp100Index?   : number
    bookmarkValues?: Array<{ Bookmark: string; Value: string }>
    actions?       : string[]
    jsonReport?    : Record<string, unknown>
    params?        : Array<{ key: string; value: string }>
    logs?          : Array<{ line: string; ts?: string }>
  }>(event)

  if (!body?.sessionId || !body?.stepId) {
    throw createError({ statusCode: 400, message: 'sessionId and stepId are required' })
  }

  const sql = useDb()

  const row = {
    session_id      : body.sessionId,
    step_id         : body.stepId,
    step_label      : body.stepLabel      ?? null,
    step_name       : body.stepName       ?? null,
    step_details    : body.stepDetails    ?? null,
    step_start      : body.stepStart      ?? null,
    step_stop       : body.stepStop       ?? null,
    result          : body.result         ?? 'pending',
    finished        : body.finished       ?? false,
    rtp100_index    : body.rtp100Index    ?? null,
    bookmark_values : body.bookmarkValues ? sql.json(body.bookmarkValues) : null,
    actions         : body.actions        ? sql.json(body.actions)        : null,
    json_report     : body.jsonReport     ? sql.json(body.jsonReport)     : null,
  }

  const [r] = await sql`
    INSERT INTO test_results ${sql(row)}
    RETURNING id, result, created_at
  `

  if (body.params?.length) {
    const paramRows = body.params.map(p => ({
      result_id : r.id,
      key       : p.key,
      value     : p.value,
    }))
    await sql`INSERT INTO test_result_params ${sql(paramRows)}`
  }

  if (body.logs?.length) {
    const logRows = body.logs.map((l, i) => ({
      result_id  : r.id,
      line       : l.line,
      ts         : l.ts ? new Date(l.ts) : new Date(),
      sort_order : i,
    }))
    await sql`INSERT INTO test_result_logs ${sql(logRows)}`
  }

  return { id: String(r.id), result: r.result, createdAt: r.created_at }
})
