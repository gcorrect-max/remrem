import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useCookie } from '#app'

export type UserRole = 'admin' | 'operator' | 'viewer' | 'guest'

export interface NavPermissions {
  overview: boolean
  results: boolean
  config: boolean
  deviceStatus: boolean
  stationSchema: boolean
  settings: boolean
  help: boolean
  authorization: boolean
}

export interface AppUser {
  id: string
  username: string
  role: UserRole
  displayName: string
  active: boolean
  permissions: NavPermissions
}

// ─── LabVIEW API response shapes ────────────────────────────────────────────
interface LoginResponse {
  success: boolean
  token: string
  user: AppUser
  error?: string
}

interface UsersResponse {
  users: AppUser[]
}

// ─── Cookie payload ──────────────────────────────────────────────────────────
interface AuthCookie {
  token: string | null
  currentUser: AppUser | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────
const defaultPerms = (role: UserRole): NavPermissions => ({
  overview:      true,
  results:       role !== 'guest',
  config:        role === 'admin' || role === 'operator',
  deviceStatus:  role !== 'guest',
  stationSchema: role !== 'guest',
  settings:      role === 'admin',
  help:          true,
  authorization: role === 'admin',
})

function apiBase(): string {
  // In production LabVIEW serves the app → same origin
  // In dev set NUXT_PUBLIC_LABVIEW_BASE_URL
  if (import.meta.client) {
    const cfg = useRuntimeConfig()
    return (cfg.public.labviewBaseUrl as string) || ''
  }
  return ''
}

async function labviewFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ─── Store ───────────────────────────────────────────────────────────────────
export const useAuthStore = defineStore('auth', () => {
  const cookie = useCookie<AuthCookie>('hasler-auth', {
    sameSite: 'lax',
    default: () => ({ token: null, currentUser: null }),
  })

  const token       = ref<string | null>(cookie.value?.token ?? null)
  const currentUser = ref<AppUser | null>(cookie.value?.currentUser ?? null)
  const users       = ref<AppUser[]>([])
  const loadingUsers = ref(false)
  const loginError  = ref<string | null>(null)

  // ── Persist ──
  function persist() {
    cookie.value = { token: token.value, currentUser: currentUser.value }
  }

  // ── Auth header ──
  function authHeaders(): Record<string, string> {
    return token.value ? { Authorization: `Bearer ${token.value}` } : {}
  }

  // ── Login via LabVIEW HTTP ────────────────────────────────────────────
  async function login(username: string, password: string): Promise<boolean> {
    loginError.value = null
    try {
      const res = await labviewFetch<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      })
      if (!res.success) {
        loginError.value = res.error ?? 'Invalid credentials'
        return false
      }
      token.value       = res.token
      currentUser.value = res.user
      persist()
      return true
    } catch (e: unknown) {
      loginError.value = (e as Error).message
      return false
    }
  }

  // ── Logout ──
  async function logout() {
    try {
      if (token.value) {
        await labviewFetch('/api/auth/logout', {
          method: 'POST',
          headers: authHeaders(),
        })
      }
    } catch { /* ignore */ }
    token.value       = null
    currentUser.value = null
    users.value       = []
    persist()
  }

  // ── User management ──────────────────────────────────────────────────
  async function fetchUsers() {
    loadingUsers.value = true
    try {
      const res = await labviewFetch<UsersResponse>('/api/users', {
        headers: authHeaders(),
      })
      users.value = res.users
    } finally {
      loadingUsers.value = false
    }
  }

  async function addUser(u: Omit<AppUser, 'id'> & { password: string }): Promise<void> {
    const res = await labviewFetch<{ user: AppUser }>('/api/users', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(u),
    })
    users.value.push(res.user)
  }

  async function updateUser(id: string, patch: Partial<AppUser> & { password?: string }): Promise<void> {
    const res = await labviewFetch<{ user: AppUser }>(`/api/users/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    })
    const idx = users.value.findIndex(u => u.id === id)
    if (idx !== -1) users.value[idx] = res.user
    // Keep currentUser in sync
    if (currentUser.value?.id === id) {
      currentUser.value = res.user
      persist()
    }
  }

  async function removeUser(id: string): Promise<void> {
    await labviewFetch(`/api/users/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    users.value = users.value.filter(u => u.id !== id)
  }

  async function applyDefaultPerms(id: string, role: UserRole): Promise<void> {
    await updateUser(id, { permissions: defaultPerms(role) })
  }

  // ── Computed ──
  const isLoggedIn = computed(() => !!currentUser.value && !!token.value)
  const isAdmin    = computed(() => currentUser.value?.role === 'admin')
  const perms      = computed<NavPermissions>(
    () => currentUser.value?.permissions ?? defaultPerms('guest'),
  )

  const roleColor = (role: UserRole) => ({
    admin:    'text-rail-accent',
    operator: 'text-rail-info',
    viewer:   'text-rail-ok',
    guest:    'text-rail-dim',
  }[role])

  const roleBg = (role: UserRole) => ({
    admin:    'bg-rail-accent/10 border-rail-accent/30 text-rail-accent',
    operator: 'bg-rail-info/10 border-rail-info/30 text-rail-info',
    viewer:   'bg-rail-ok/10 border-rail-ok/30 text-rail-ok',
    guest:    'bg-rail-muted/30 border-rail-border text-rail-dim',
  }[role])

  return {
    token,
    currentUser,
    users,
    loadingUsers,
    loginError,
    isLoggedIn,
    isAdmin,
    perms,
    roleColor,
    roleBg,
    login,
    logout,
    fetchUsers,
    addUser,
    updateUser,
    removeUser,
    applyDefaultPerms,
    defaultPerms,
  }
})
