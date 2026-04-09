import { useDb }        from '~/server/db/client'
import { hashPassword }  from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    username: string; password: string; displayName: string; role: string
    active?: boolean; permissions?: Record<string, boolean>
  }>(event)

  if (!body?.username || !body?.password || !body?.displayName) {
    throw createError({ statusCode: 400, message: 'username, password and displayName are required' })
  }

  const p    = body.permissions ?? {}
  const sql  = useDb()
  const hash = hashPassword(body.password)

  const [user] = await sql`
    INSERT INTO users
      (username, password_hash, display_name, role, active,
       perm_overview, perm_results, perm_config, perm_device_status,
       perm_station_schema, perm_settings, perm_help, perm_authorization)
    VALUES
      (${body.username}, ${hash}, ${body.displayName}, ${body.role ?? 'viewer'},
       ${body.active ?? true},
       ${p.overview      ?? true},  ${p.results        ?? false},
       ${p.config        ?? false}, ${p.deviceStatus   ?? false},
       ${p.stationSchema ?? false}, ${p.settings       ?? false},
       ${p.help          ?? true},  ${p.authorization  ?? false})
    RETURNING id, username, display_name, role, active,
              perm_overview, perm_results, perm_config, perm_device_status,
              perm_station_schema, perm_settings, perm_help, perm_authorization
  `

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
