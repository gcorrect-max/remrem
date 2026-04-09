<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-5xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-sans text-base font-semibold text-rail-header">Authorization</h1>
          <p class="font-mono text-xs text-rail-dim mt-0.5">User accounts and navigation permissions</p>
        </div>
        <button
          @click="openAdd"
          class="flex items-center gap-2 px-4 py-2 bg-rail-accent hover:bg-yellow-400 text-rail-bg font-sans font-semibold text-sm rounded transition-colors"
        >
          <span class="text-lg leading-none">＋</span> Add user
        </button>
      </div>

      <!-- Loading / error state -->
      <div v-if="auth.loadingUsers" class="flex items-center gap-3 py-8 justify-center font-mono text-sm text-rail-dim">
        <span class="inline-block animate-spin">⟳</span> Loading users…
      </div>
      <div v-else-if="fetchError" class="px-4 py-3 bg-rail-fail/10 border border-rail-fail/30 rounded font-mono text-xs text-rail-fail">
        ✗ {{ fetchError }}
      </div>

      <!-- Users table -->
      <div v-else class="bg-rail-surface border border-rail-border rounded overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-rail-card border-b border-rail-border">
              <th class="text-left px-5 py-3 font-mono text-[11px] text-rail-dim uppercase tracking-wider">User</th>
              <th class="text-left px-4 py-3 font-mono text-[11px] text-rail-dim uppercase tracking-wider">Role</th>
              <th class="text-left px-4 py-3 font-mono text-[11px] text-rail-dim uppercase tracking-wider">Status</th>
              <th class="text-left px-4 py-3 font-mono text-[11px] text-rail-dim uppercase tracking-wider">Nav permissions</th>
              <th class="px-4 py-3 w-28"></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="user in auth.users"
              :key="user.id"
              class="border-b border-rail-border/40 hover:bg-rail-card/30 transition-colors"
            >
              <!-- User -->
              <td class="px-5 py-3.5">
                <div class="font-sans text-sm font-medium text-rail-header">{{ user.displayName }}</div>
                <div class="font-mono text-[11px] text-rail-dim mt-0.5">{{ user.username }}</div>
              </td>

              <!-- Role badge -->
              <td class="px-4 py-3.5">
                <span class="inline-flex items-center px-2.5 py-1 rounded border font-mono text-xs font-semibold" :class="auth.roleBg(user.role)">
                  {{ user.role }}
                </span>
              </td>

              <!-- Active toggle -->
              <td class="px-4 py-3.5">
                <button
                  :disabled="user.id === auth.currentUser?.id || saving"
                  class="flex items-center gap-2"
                  :class="(user.id === auth.currentUser?.id || saving) ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'"
                  @click="toggleActive(user)"
                >
                  <span class="w-9 h-5 rounded-full relative transition-colors flex-shrink-0" :class="user.active ? 'bg-rail-ok' : 'bg-rail-muted'">
                    <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="user.active ? 'translate-x-4' : 'translate-x-0'"></span>
                  </span>
                  <span class="font-mono text-xs" :class="user.active ? 'text-rail-ok' : 'text-rail-dim'">
                    {{ user.active ? 'Active' : 'Off' }}
                  </span>
                </button>
              </td>

              <!-- Nav permission chips -->
              <td class="px-4 py-3.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="(key, label) in navKeys"
                    :key="key"
                    class="px-1.5 py-0.5 rounded text-[10px] font-mono border"
                    :class="user.permissions[key]
                      ? 'bg-rail-ok/10 border-rail-ok/30 text-rail-ok'
                      : 'bg-transparent border-rail-border/30 text-rail-dim/40'"
                  >{{ label }}</span>
                </div>
              </td>

              <!-- Actions -->
              <td class="px-4 py-3.5">
                <div class="flex items-center justify-end gap-2">
                  <button
                    :disabled="saving"
                    class="px-3 py-1.5 bg-rail-card border border-rail-border hover:border-rail-accent text-rail-dim hover:text-rail-accent transition-colors rounded font-mono text-xs disabled:opacity-40"
                    @click="openEdit(user)"
                  >
                    Edit
                  </button>
                  <button
                    v-if="user.id !== auth.currentUser?.id"
                    :disabled="saving"
                    class="px-3 py-1.5 bg-rail-card border border-rail-border hover:border-rail-fail text-rail-dim hover:text-rail-fail transition-colors rounded font-mono text-xs disabled:opacity-40"
                    @click="removeUser(user.id)"
                  >✕</button>
                </div>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="!auth.users.length">
              <td colspan="5" class="py-8 text-center font-mono text-xs text-rail-dim">No users found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Save error -->
      <div v-if="saveError" class="px-4 py-3 bg-rail-fail/10 border border-rail-fail/30 rounded font-mono text-xs text-rail-fail">
        ✗ {{ saveError }}
      </div>

      <!-- Role legend -->
      <div class="grid grid-cols-4 gap-3">
        <div v-for="role in roles" :key="role.id" class="bg-rail-surface border border-rail-border rounded p-4">
          <span class="inline-block px-2 py-0.5 rounded border font-mono text-xs font-bold mb-2" :class="auth.roleBg(role.id)">{{ role.id }}</span>
          <p class="font-sans text-xs text-rail-dim leading-relaxed">{{ role.desc }}</p>
        </div>
      </div>
    </div>

    <!-- ── Modal ────────────────────────────────────────────────────────── -->
    <Transition name="expand">
      <div
        v-if="modal.open"
        class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
        @click.self="modal.open = false"
      >
        <div class="bg-rail-surface border border-rail-border rounded-lg w-full max-w-lg shadow-2xl">

          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-rail-border bg-rail-card rounded-t-lg">
            <h3 class="font-sans text-sm font-semibold text-rail-header">
              {{ modal.isEdit ? 'Edit user' : 'Add user' }}
            </h3>
            <button @click="modal.open = false" class="text-rail-dim hover:text-rail-text text-xl leading-none">✕</button>
          </div>

          <div class="px-6 py-5 space-y-4 max-h-[65vh] overflow-auto">

            <!-- Modal save error -->
            <div v-if="modalError" class="px-3 py-2 bg-rail-fail/10 border border-rail-fail/30 rounded font-mono text-xs text-rail-fail">
              ✗ {{ modalError }}
            </div>

            <!-- Display name + username -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">Display name</label>
                <input v-model="modal.form.displayName" type="text" class="modal-input" />
              </div>
              <div class="space-y-1.5">
                <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">Username</label>
                <input
                  v-model="modal.form.username"
                  type="text"
                  class="modal-input"
                  :disabled="modal.isEdit"
                  :class="modal.isEdit ? 'opacity-50' : ''"
                />
              </div>
            </div>

            <!-- Password + Role -->
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">
                  Password{{ modal.isEdit ? ' (leave blank to keep)' : '' }}
                </label>
                <input v-model="modal.form.password" type="password" class="modal-input" />
              </div>
              <div class="space-y-1.5">
                <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">Role</label>
                <select v-model="modal.form.role" class="modal-input" @change="applyDefaults">
                  <option value="admin">admin</option>
                  <option value="operator">operator</option>
                  <option value="viewer">viewer</option>
                  <option value="guest">guest</option>
                </select>
              </div>
            </div>

            <!-- Active toggle (edit only) -->
            <div v-if="modal.isEdit" class="flex items-center gap-3">
              <button
                class="flex items-center gap-2 cursor-pointer"
                @click="modal.form.active = !modal.form.active"
              >
                <span class="w-9 h-5 rounded-full relative transition-colors flex-shrink-0" :class="modal.form.active ? 'bg-rail-ok' : 'bg-rail-muted'">
                  <span class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" :class="modal.form.active ? 'translate-x-4' : 'translate-x-0'"></span>
                </span>
                <span class="font-mono text-xs" :class="modal.form.active ? 'text-rail-ok' : 'text-rail-dim'">
                  Account {{ modal.form.active ? 'active' : 'disabled' }}
                </span>
              </button>
            </div>

            <!-- Nav permissions -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">Navigation visibility</label>
                <button @click="applyDefaults" class="font-mono text-[11px] text-rail-accent hover:underline">
                  ↺ Reset to role defaults
                </button>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <label
                  v-for="(key, label) in navKeys"
                  :key="key"
                  class="flex items-center gap-3 px-3 py-2.5 bg-rail-card border border-rail-border rounded cursor-pointer hover:border-rail-accent/40 transition-colors select-none"
                >
                  <span
                    class="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors"
                    :class="modal.form.permissions[key] ? 'bg-rail-accent border-rail-accent' : 'border-rail-muted'"
                    @click.prevent="modal.form.permissions[key] = !modal.form.permissions[key]"
                  >
                    <svg v-if="modal.form.permissions[key]" viewBox="0 0 10 10" class="w-2.5 h-2.5 text-rail-bg">
                      <polyline points="1.5,5 3.5,7.5 8.5,2" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                  </span>
                  <span class="font-sans text-sm text-rail-text">{{ label }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Modal footer -->
          <div class="flex items-center justify-end gap-3 px-6 py-4 border-t border-rail-border">
            <button
              :disabled="modalSaving"
              class="px-4 py-2 bg-rail-card border border-rail-border text-rail-dim hover:text-rail-text transition-colors rounded font-sans text-sm"
              @click="modal.open = false"
            >
              Cancel
            </button>
            <button
              :disabled="modalSaving || !modal.form.displayName || !modal.form.username"
              class="flex items-center gap-2 px-4 py-2 bg-rail-accent hover:bg-yellow-400 text-rail-bg font-sans font-semibold text-sm rounded transition-colors disabled:opacity-50"
              @click="saveModal"
            >
              <span v-if="modalSaving" class="inline-block animate-spin">⟳</span>
              {{ modal.isEdit ? 'Save changes' : 'Create user' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useAuthStore, type UserRole, type NavPermissions } from '~/stores/auth'

const auth = useAuthStore()

const fetchError = ref<string | null>(null)
const saveError  = ref<string | null>(null)
const saving     = ref(false)
const modalSaving = ref(false)
const modalError  = ref<string | null>(null)

// ── Fetch users on mount ─────────────────────────────────────────────────
onMounted(async () => {
  fetchError.value = null
  try {
    await auth.fetchUsers()
  } catch (e: unknown) {
    fetchError.value = (e as Error).message
  }
})

// ── Nav key map ──────────────────────────────────────────────────────────
const navKeys: Record<string, keyof NavPermissions> = {
  'Overview':       'overview',
  'Results':        'results',
  'Config':         'config',
  'Device Status':  'deviceStatus',
  'Station Schema': 'stationSchema',
  'Settings':       'settings',
  'Help':           'help',
  'Authorization':  'authorization',
}

const roles = [
  { id: 'admin'    as UserRole, desc: 'Full access to all pages, settings, and user management.' },
  { id: 'operator' as UserRole, desc: 'Can run tests and view results. No settings or authorization.' },
  { id: 'viewer'   as UserRole, desc: 'Read-only access to results, device status, and station schema.' },
  { id: 'guest'    as UserRole, desc: 'Limited to overview and help pages only.' },
]

function getDefaultPerms(role: UserRole): NavPermissions {
  return auth.defaultPerms(role)
}

// ── Modal ────────────────────────────────────────────────────────────────
const emptyForm = () => ({
  displayName: '',
  username:    '',
  password:    '',
  role:        'viewer' as UserRole,
  active:      true,
  permissions: getDefaultPerms('viewer'),
})

const modal = reactive({ open: false, isEdit: false, editId: '', form: emptyForm() })

function applyDefaults() {
  modal.form.permissions = { ...getDefaultPerms(modal.form.role) }
}

function openAdd() {
  Object.assign(modal, { form: emptyForm(), isEdit: false, editId: '', open: true })
  modalError.value = null
}

function openEdit(user: typeof auth.users[0]) {
  modal.form   = { displayName: user.displayName, username: user.username, password: '', role: user.role, active: user.active, permissions: { ...user.permissions } }
  modal.isEdit = true
  modal.editId = user.id
  modal.open   = true
  modalError.value = null
}

async function saveModal() {
  modalSaving.value = true
  modalError.value  = null
  try {
    if (modal.isEdit) {
      const patch: Parameters<typeof auth.updateUser>[1] = {
        displayName: modal.form.displayName,
        role:        modal.form.role,
        active:      modal.form.active,
        permissions: { ...modal.form.permissions },
      }
      if (modal.form.password) (patch as any).password = modal.form.password
      await auth.updateUser(modal.editId, patch)
    } else {
      await auth.addUser({
        username:    modal.form.username,
        displayName: modal.form.displayName,
        password:    modal.form.password || 'changeme',
        role:        modal.form.role,
        active:      true,
        permissions: { ...modal.form.permissions },
      })
    }
    modal.open = false
  } catch (e: unknown) {
    modalError.value = (e as Error).message
  } finally {
    modalSaving.value = false
  }
}

async function toggleActive(user: typeof auth.users[0]) {
  saving.value     = true
  saveError.value  = null
  try {
    await auth.updateUser(user.id, { active: !user.active })
  } catch (e: unknown) {
    saveError.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function removeUser(id: string) {
  if (!window.confirm('Remove this user?')) return
  saving.value    = true
  saveError.value = null
  try {
    await auth.removeUser(id)
  } catch (e: unknown) {
    saveError.value = (e as Error).message
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-input {
  width: 100%;
  background: var(--rail-bg, #0f172a);
  border: 1px solid var(--rail-border, #334155);
  border-radius: 4px;
  padding: 8px 12px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 13px;
  color: var(--rail-text, #e2e8f0);
  outline: none;
  transition: border-color 0.15s;
}
.modal-input:focus { border-color: var(--rail-accent, #f59e0b); }
</style>
