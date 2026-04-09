<template>
  <div class="min-h-screen bg-rail-bg grid-bg flex items-center justify-center p-4">

    <!-- Background accent lines -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden">
      <div class="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-rail-accent/10 to-transparent"></div>
      <div class="absolute left-0 top-1/2 w-full h-px bg-gradient-to-r from-transparent via-rail-accent/10 to-transparent"></div>
    </div>

    <div class="w-full max-w-sm relative">

      <!-- Logo -->
      <div class="text-center mb-8">
        <div class="inline-flex items-baseline gap-1 mb-2">
          <span class="font-sans font-bold text-4xl text-rail-accent tracking-tight">HASLER</span>
          <span class="font-sans font-light text-4xl text-white tracking-tight">Rail</span>
        </div>
        <div class="font-mono text-sm text-rail-dim">REM102 Test Dashboard</div>
        <div class="font-mono text-xs text-rail-dim/60 mt-1">{{ hostname }}</div>
      </div>

      <!-- LabVIEW connection status badge -->
      <div class="flex items-center justify-center gap-2 mb-4">
        <span
          class="inline-block w-2 h-2 rounded-full flex-shrink-0"
          :class="serverOnline ? 'bg-rail-ok' : 'bg-rail-fail animate-pulse'"
        ></span>
        <span class="font-mono text-[11px]" :class="serverOnline ? 'text-rail-ok' : 'text-rail-fail'">
          LabVIEW Webservice {{ serverOnline ? 'online' : 'offline' }}
        </span>
        <span v-if="serverOnline" class="font-mono text-[10px] text-rail-dim">— {{ serverHost }}</span>
      </div>

      <!-- Card -->
      <div class="bg-rail-surface border border-rail-border rounded-lg overflow-hidden shadow-2xl">

        <!-- Card header -->
        <div class="px-6 py-4 bg-rail-card border-b border-rail-border">
          <h2 class="font-sans text-sm font-semibold text-rail-header">Sign in</h2>
          <p class="font-mono text-[11px] text-rail-dim mt-0.5">Enter your credentials to continue</p>
        </div>

        <!-- Form -->
        <div class="px-6 py-6 space-y-4">

          <!-- Error -->
          <div
            v-if="error"
            class="flex items-center gap-2 px-3 py-2 bg-rail-fail/10 border border-rail-fail/30 rounded text-rail-fail font-mono text-xs animate-fade-in"
          >
            <span>✗</span> {{ error }}
          </div>

          <!-- Offline warning -->
          <div
            v-if="!serverOnline"
            class="flex items-center gap-2 px-3 py-2 bg-rail-warn/10 border border-rail-warn/30 rounded text-rail-warn font-mono text-xs"
          >
            <span>⚠</span> Cannot reach LabVIEW webservice. Login unavailable.
          </div>

          <!-- Username -->
          <div class="space-y-1.5">
            <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">Username</label>
            <input
              v-model="form.username"
              type="text"
              placeholder="username"
              autocomplete="username"
              :disabled="!serverOnline || loading"
              class="w-full bg-rail-bg border border-rail-border rounded px-3 py-2.5 font-mono text-sm text-rail-text placeholder:text-rail-muted focus:outline-none focus:border-rail-accent transition-colors disabled:opacity-40"
              @keyup.enter="submit"
            />
          </div>

          <!-- Password -->
          <div class="space-y-1.5">
            <label class="font-mono text-xs text-rail-dim uppercase tracking-wider">Password</label>
            <div class="relative">
              <input
                v-model="form.password"
                :type="showPw ? 'text' : 'password'"
                placeholder="••••••••"
                autocomplete="current-password"
                :disabled="!serverOnline || loading"
                class="w-full bg-rail-bg border border-rail-border rounded px-3 py-2.5 pr-10 font-mono text-sm text-rail-text placeholder:text-rail-muted focus:outline-none focus:border-rail-accent transition-colors disabled:opacity-40"
                @keyup.enter="submit"
              />
              <button
                type="button"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-rail-dim hover:text-rail-text text-xs"
                @click="showPw = !showPw"
              >{{ showPw ? '🙈' : '👁' }}</button>
            </div>
          </div>

          <!-- Submit -->
          <button
            class="w-full py-2.5 bg-rail-accent hover:bg-yellow-400 text-rail-bg font-sans font-semibold text-sm rounded transition-colors mt-2 disabled:opacity-40 disabled:cursor-not-allowed"
            :disabled="!form.username || loading || !serverOnline"
            @click="submit"
          >
            <span v-if="loading" class="inline-block animate-spin mr-1">⟳</span>
            Sign in
          </button>
        </div>

        <!-- Server info footer -->
        <div class="px-6 pb-5 border-t border-rail-border/50 pt-4 space-y-1">
          <div class="font-mono text-[10px] text-rail-dim uppercase tracking-wider mb-2">Server info</div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-0.5">
            <span class="font-mono text-[10px] text-rail-dim">Host</span>
            <span class="font-mono text-[10px] text-rail-text">{{ serverHost }}</span>
            <span class="font-mono text-[10px] text-rail-dim">RTO File</span>
            <span class="font-mono text-[10px] text-rail-text">{{ rtoFile }}</span>
            <span class="font-mono text-[10px] text-rail-dim">Revision</span>
            <span class="font-mono text-[10px] text-rail-text">{{ rtoRev }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="text-center mt-6 font-mono text-[10px] text-rail-dim/50">
        REMview v3 · HASLERRail AG
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore }      from '~/stores/auth'
import { useDashboardStore } from '~/stores/dashboard'

definePageMeta({ layout: false })

const auth = useAuthStore()
const dash = useDashboardStore()

// ── Server info ──────────────────────────────────────────────────────────
const { data: hostnameData } = await useFetch('/api/hostname')
const hostname  = computed(() => (hostnameData.value as { hostname?: string })?.hostname ?? 'localhost')
const rtoFile   = dash.device.rtoFile
const rtoRev    = dash.device.rtoRevision

const config = useRuntimeConfig()
const serverHost = computed(() => {
  const base = config.public.labviewBaseUrl as string
  return base || (import.meta.client ? window.location.host : 'localhost')
})

// ── LabVIEW online check ─────────────────────────────────────────────────
const serverOnline = ref(false)
let pingTimer: ReturnType<typeof setInterval> | null = null

async function checkServer() {
  try {
    const res = await fetch(`${config.public.labviewBaseUrl || ''}/api/hostname`, {
      signal: AbortSignal.timeout(3000),
    })
    serverOnline.value = res.ok
  } catch {
    serverOnline.value = false
  }
}

onMounted(async () => {
  await checkServer()
  pingTimer = setInterval(checkServer, 5000)
})

onUnmounted(() => {
  if (pingTimer !== null) clearInterval(pingTimer)
})

// ── Form ────────────────────────────────────────────────────────────────
const form    = reactive({ username: '', password: '' })
const error   = ref('')
const loading = ref(false)
const showPw  = ref(false)

async function submit() {
  if (!form.username || !serverOnline.value) return
  loading.value = true
  error.value   = ''
  const ok = await auth.login(form.username, form.password)
  loading.value = false
  if (ok) {
    await navigateTo('/')
  } else {
    error.value = auth.loginError ?? 'Invalid username or password'
  }
}
</script>
