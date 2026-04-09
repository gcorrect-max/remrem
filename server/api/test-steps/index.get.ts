import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const query     = getQuery(event)
  const sessionId = Number(query.sessionId)

  if (!sessionId) throw createError({ statusCode: 400, message: 'sessionId is required' })

  const sql  = useDb()
  const rows = await sql`
    SELECT * FROM test_steps
    WHERE session_id = ${sessionId}
    ORDER BY step_order
  `

  return rows.map(st => ({
    id:         String(st.id),
    sessionId:  String(st.session_id),
    name:       st.name,
    status:     st.status,
    stepOrder:  st.step_order,
    startedAt:  st.started_at,
    finishedAt: st.finished_at,
    message:    st.message,
  }))
})
