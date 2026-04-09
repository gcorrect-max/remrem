import { useDb }       from '~/server/db/client'
import { hashPassword } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const id   = Number(getRouterParam(event, 'id'))
  const body = await readBody<{
    displayName?: string; role?: string; active?: boolean
    password?: string; permissions?: Record<string, boolean>
  }>(event)

  const sql = useDb()
  const p   = body.permissions ?? {}

  const sets: Record<string, unknown> = {
    updated_at: new Date(),
  }
  if (body.displayName !== undefined) sets.display_name    = body.displayName
  if (body.role        !== undefined) sets.role             = body.role
  if (body.active      !== undefined) sets.active           = body.active
  if (body.password)                  sets.password_hash    = hashPassword(body.password)
  if (body.permissions) {
    if (p.overview      !== undefined) sets.perm_overview       = p.overview
    if (p.results       !== undefined) sets.perm_results        = p.results
    if (p.config        !== undefined) sets.perm_config         = p.config
    if (p.deviceStatus  !== undefined) sets.perm_device_status  = p.deviceStatus
    if (p.stationSchema !== undefined) sets.perm_station_schema = p.stationSchema
    if (p.settings      !== undefined) sets.perm_settings       = p.settings
    if (p.help          !== undefined) sets.perm_help           = p.help
    if (p.authorization !== undefined) sets.perm_authorization  = p.authorization
  }

  const [user] = await sql`
    UPDATE users SET ${sql(sets)}
    WHERE id = ${id}
    RETURNING id, username, display_name, role, active,
              perm_overview, perm_results, perm_config, perm_device_status,
              perm_station_schema, perm_settings, perm_help, perm_authorization
  `

  if (!user) throw createError({ statusCode: 404, message: 'User not found' })

  return {
    user: {
      id: String(user.id), username: user.username,
      displayName: user.display_name, role: user.role, active: user.active,
      permissions: {
        overview: user.perm_overview, results: user.perm_results,
        config: user.perm_config, deviceStatus: user.perm_device_status,
        stationSchema: user.perm_station_schema, settings: user.perm_settings,
        help: user.perm_help, authorization: user.perm_authorization,
      },
    },
  }
})
