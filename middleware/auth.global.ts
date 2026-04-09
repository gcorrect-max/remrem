import { useAuthStore, type NavPermissions } from '~/stores/auth'

function getRequiredPermission(path: string): keyof NavPermissions | null {
  if (path === '/') return 'overview'
  if (path.startsWith('/test-results')) return 'results'
  if (path.startsWith('/device-config')) return 'config'
  if (path.startsWith('/device-status')) return 'deviceStatus'
  if (path.startsWith('/station-schema')) return 'stationSchema'
  if (path.startsWith('/settings')) return 'settings'
  if (path.startsWith('/help')) return 'help'
  if (path.startsWith('/authorization')) return 'authorization'
  return null
}

export default defineNuxtRouteMiddleware((to) => {
  // Ignore WebSocket upgrade paths and internal Nuxt paths
  if (to.path.startsWith('/_') || to.path === '/ws') return

  const auth = useAuthStore()

  if (to.path === '/login') {
    if (auth.isLoggedIn) return navigateTo('/')
    return
  }

  if (!auth.isLoggedIn) return navigateTo('/login')

  const requiredPermission = getRequiredPermission(to.path)
  if (requiredPermission && !auth.perms[requiredPermission]) {
    return navigateTo('/')
  }
})
