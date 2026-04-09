import { useDb } from '~/server/db/client'

export default defineEventHandler(async () => {
  const sql   = useDb()
  const users = await sql`
    SELECT id, username, display_name, role, active,
           perm_overview, perm_results, perm_config, perm_device_status,
           perm_station_schema, perm_settings, perm_help, perm_authorization
    FROM users
    ORDER BY id
  `
  return {
    users: users.map(u => ({
      id:          String(u.id),
      username:    u.username,
      displayName: u.display_name,
      role:        u.role,
      active:      u.active,
      permissions: {
        overview:      u.perm_overview,
        results:       u.perm_results,
        config:        u.perm_config,
        deviceStatus:  u.perm_device_status,
        stationSchema: u.perm_station_schema,
        settings:      u.perm_settings,
        help:          u.perm_help,
        authorization: u.perm_authorization,
      },
    })),
  }
})
