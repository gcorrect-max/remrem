import { useDb } from '~/server/db/client'

/**
 * GET /api/test-results[?sessionId=&limit=&offset=]
 */
export default defineEventHandler(async (event) => {
  const query     = getQuery(event)
  const sessionId = query.sessionId ? Number(query.sessionId) : undefined
  const limit     = Number(query.limit  ?? 100)
  const offset    = Number(query.offset ?? 0)

  const sql  = useDb()
  const rows = sessionId
    ? await sql`
        SELECT tr.id, tr.session_id, tr.step_id, tr.step_label,
               tr.step_name, tr.step_start, tr.step_stop,
               tr.result, tr.finished, tr.created_at,
          array_agg(
            json_build_object('key', trp.key, 'value', trp.value)
            ORDER BY trp.id
          ) FILTER (WHERE trp.id IS NOT NULL) AS params
        FROM test_results tr
        LEFT JOIN test_result_params trp ON trp.result_id = tr.id
        WHERE tr.session_id = ${sessionId}
        GROUP BY tr.id
        ORDER BY tr.id
        LIMIT ${limit} OFFSET ${offset}
      `
    : await sql`
        SELECT tr.id, tr.session_id, tr.step_id, tr.step_label,
               tr.step_name, tr.step_start, tr.step_stop,
               tr.result, tr.finished, tr.created_at,
          array_agg(
            json_build_object('key', trp.key, 'value', trp.value)
            ORDER BY trp.id
          ) FILTER (WHERE trp.id IS NOT NULL) AS params
        FROM test_results tr
        LEFT JOIN test_result_params trp ON trp.result_id = tr.id
        GROUP BY tr.id
        ORDER BY tr.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `

  return rows.map(r => ({
    id         : String(r.id),
    sessionId  : String(r.session_id),
    stepId     : r.step_id,
    stepLabel  : r.step_label,
    stepName   : r.step_name,
    stepStart  : r.step_start,
    stepStop   : r.step_stop,
    result     : r.result,
    finished   : r.finished,
    createdAt  : r.created_at,
    params     : r.params ?? [],
  }))
})
