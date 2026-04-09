import { useDb } from '~/server/db/client'

export default defineEventHandler(async (event) => {
  const id  = Number(getRouterParam(event, 'id'))
  const sql = useDb()

  const [deleted] = await sql`DELETE FROM users WHERE id = ${id} RETURNING id`
  if (!deleted) throw createError({ statusCode: 404, message: 'User not found' })

  return { success: true }
})
