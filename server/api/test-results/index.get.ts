import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const query     = getQuery(event)
  const sessionId = query.sessionId ? Number(query.sessionId) : undefined
  const limit     = Number(query.limit  ?? 100)
  const offset    = Number(query.offset ?? 0)

  const sql  = useDb()
  const rows = sessionId
    ? await sql`
        SELECT tr.*,
          array_agg(
            json_build_object('name', trp.name, 'value', trp.value, 'unit', trp.unit,
                              'low', trp.low_limit, 'high', trp.high_limit, 'status', trp.status)
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
        SELECT tr.*,
          array_agg(
            json_build_object('name', trp.name, 'value', trp.value, 'unit', trp.unit,
                              'low', trp.low_limit, 'high', trp.high_limit, 'status', trp.status)
            ORDER BY trp.id
          ) FILTER (WHERE trp.id IS NOT NULL) AS params
        FROM test_results tr
        LEFT JOIN test_result_params trp ON trp.result_id = tr.id
        GROUP BY tr.id
        ORDER BY tr.id DESC
        LIMIT ${limit} OFFSET ${offset}
      `

  return rows.map(r => ({
    id:         String(r.id),
    sessionId:  String(r.session_id),
    testName:   r.test_name,
    status:     r.status,
    measuredAt: r.measured_at,
    params:     r.params ?? [],
  }))
})
