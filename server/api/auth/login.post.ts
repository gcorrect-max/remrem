import { useDb }        from '~/server/db/client'
import { signToken, checkPassword } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username: string; password: string }>(event)

  if (!body?.username) {
    throw createError({ statusCode: 400, message: 'username is required' })
  }

  const sql = useDb()
  const [user] = await sql`
    SELECT id, username, password_hash, display_name, role, active,
           perm_overview, perm_results, perm_config, perm_device_status,
           perm_station_schema, perm_settings, perm_help, perm_authorization
    FROM users
    WHERE username = ${body.username} AND active = true
    LIMIT 1
  `

  if (!user || !checkPassword(body.password ?? '', user.password_hash)) {
    throw createError({ statusCode: 401, message: 'Invalid username or password' })
  }

  const token = signToken({ sub: user.id, username: user.username, role: user.role })

  return {
    success: true,
    token,
    user: {
      id:          String(user.id),
      username:    user.username,
      role:        user.role,
      displayName: user.display_name,
      active:      user.active,
      permissions: {
        overview:      user.perm_overview,
        results:       user.perm_results,
        config:        user.perm_config,
        deviceStatus:  user.perm_device_status,
        stationSchema: user.perm_station_schema,
        settings:      user.perm_settings,
        help:          user.perm_help,
        authorization: user.perm_authorization,
      },
    },
  }
})
