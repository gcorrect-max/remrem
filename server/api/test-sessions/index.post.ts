import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    deviceId: number; operator?: string
  }>(event)

  if (!body?.deviceId) {
    throw createError({ statusCode: 400, message: 'deviceId is required' })
  }

  const sql = useDb()

  // Mark any running sessions as aborted first
  await sql`
    UPDATE test_sessions SET status = 'aborted', finished_at = NOW()
    WHERE status = 'running'
  `

  const [s] = await sql`
    INSERT INTO test_sessions (device_id, operator, status, started_at)
    VALUES (${body.deviceId}, ${body.operator ?? null}, 'running', NOW())
    RETURNING *
  `

  return { id: String(s.id), status: s.status, startedAt: s.started_at }
})
