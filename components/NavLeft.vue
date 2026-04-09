<template>
  <nav class="w-64 flex-shrink-0 flex flex-col bg-rail-surface border-r border-rail-border">

    <!-- Logo area -->
    <div class="px-5 py-4 border-b border-rail-border">
      <div class="text-white font-sans font-bold text-xl tracking-tight">
        <span class="text-rail-accent">HASLER</span><span class="font-light">Rail</span>
      </div>
      <div class="font-mono text-xs text-rail-text mt-0.5">REM102 Test Dashboard</div>
      <div class="font-mono text-[11px] text-rail-dim/70 mt-0.5 truncate" :title="hostname">{{ hostname }}</div>

      <!-- WebSocket status -->
      <div class="flex items-center gap-1.5 mt-2">
        <span class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" :class="ws.statusDot"></span>
        <span class="font-mono text-[10px]" :class="ws.statusColor">{{ ws.statusLabel }}</span>
        <span v-if="ws.latencyMs !== null && ws.isConnected" class="font-mono text-[10px] text-rail-dim">
          {{ ws.latencyMs }}ms
        </span>
      </div>
    </div>

    <!-- Nav items -->
    <div class="flex-1 py-2 overflow-auto">
      <div class="px-4 py-2 mb-1">
        <span class="font-mono text-[10px] text-rail-dim uppercase tracking-widest">Navigation</span>
      </div>

      <template v-for="item in visibleItems" :key="item.to ?? item.id">

        <!-- Plain link -->
        <NuxtLink
          v-if="item.to && !item.children"
          :to="item.to"
          class="nav-item flex items-center gap-3 px-5 py-3 text-rail-text/70 hover:text-white hover:bg-rail-card border-l-2 border-transparent transition-all duration-150 group"
          active-class="nav-link-active"
        >
          <span class="text-lg leading-none flex-shrink-0">{{ item.icon }}</span>
          <div class="min-w-0">
            <div class="text-sm font-sans font-medium truncate">{{ item.label }}</div>
            <div class="text-[11px] font-mono text-rail-dim truncate group-hover:text-rail-dim/80">{{ item.sub }}</div>
          </div>
        </NuxtLink>

        <!-- Expandable group -->
        <div v-else-if="item.children">
          <button
            class="nav-item w-full flex items-center gap-3 px-5 py-3 border-l-2 border-transparent transition-all duration-150 group"
            :class="item.open ? 'text-white bg-rail-card border-l-rail-accent/40' : 'text-rail-text/70 hover:text-white hover:bg-rail-card'"
            @click="item.open = !item.open"
          >
            <span class="text-lg leading-none flex-shrink-0">{{ item.icon }}</span>
            <div class="min-w-0 flex-1 text-left">
              <div class="text-sm font-sans font-medium truncate">{{ item.label }}</div>
              <div class="text-[11px] font-mono text-rail-dim truncate">{{ item.sub }}</div>
            </div>
            <span class="text-rail-dim text-xs flex-shrink-0 transition-transform duration-200" :class="item.open ? 'rotate-90' : ''">▶</span>
          </button>
          <Transition name="expand">
            <div v-if="item.open" class="bg-rail-bg/40">
              <NuxtLink
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                class="flex items-center gap-3 pl-12 pr-5 py-2.5 text-rail-text/60 hover:text-white hover:bg-rail-card border-l-2 border-transparent transition-all duration-150"
                active-class="nav-link-active"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-rail-dim/50 flex-shrink-0"></span>
                <div class="min-w-0">
                  <div class="text-[13px] font-sans truncate">{{ child.label }}</div>
                  <div v-if="child.sub" class="text-[10px] font-mono text-rail-dim truncate">{{ child.sub }}</div>
                </div>
              </NuxtLink>
            </div>
          </Transition>
        </div>
      </template>
    </div>

    <!-- User info + logout -->
    <div class="px-5 py-4 border-t border-rail-border space-y-2">
      <!-- Logged in user -->
      <div class="flex items-center gap-3">
        <div class="w-7 h-7 rounded-full bg-rail-card border border-rail-border flex items-center justify-center text-xs font-bold text-rail-accent flex-shrink-0">
          {{ auth.currentUser?.displayName?.[0] ?? '?' }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="font-sans text-xs font-semibold text-rail-header truncate">{{ auth.currentUser?.displayName }}</div>
          <span class="inline-block px-1.5 py-0.5 rounded border font-mono text-[10px]" :class="auth.roleBg(auth.currentUser?.role ?? 'guest')">
            {{ auth.currentUser?.role }}
          </span>
        </div>
        <button
          @click="logout"
          title="Sign out"
          class="text-rail-dim hover:text-rail-fail transition-colors text-sm flex-shrink-0"
        >⏻</button>
      </div>
      <!-- Overall status -->
      <div class="flex items-center gap-2">
        <span class="inline-block w-2 h-2 rounded-full flex-shrink-0" :class="dash.overallStatus === 'ok' ? 'bg-rail-ok' : 'bg-rail-fail'"></span>
        <span class="font-mono text-[11px] font-semibold" :class="dash.overallStatus === 'ok' ? 'text-rail-ok' : 'text-rail-fail'">
          {{ dash.overallStatus === 'ok' ? 'ALL TESTS PASS' : 'TEST FAILURE' }}
        </span>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useAuthStore }       from '~/stores/auth'
import { useDashboardStore }  from '~/stores/dashboard'
import { useWsStore }         from '~/stores/ws'

const auth = useAuthStore()
const dash = useDashboardStore()
const ws   = useWsStore()

const { data: hostnameData } = await useFetch('/api/hostname')
const hostname = computed(() => (hostnameData.value as { hostname?: string })?.hostname ?? 'localhost')

async function logout() {
  await auth.logout()
  await navigateTo('/login')
}

const allItems = reactive([
  { to: '/',             icon: '📋', label: 'Overview',       sub: 'Summary & drawings',   perm: 'overview' },
  {
    id: 'results', icon: '📊', label: 'Results', sub: 'Test & history', perm: 'results', open: false,
    children: [
      { to: '/test-results', label: 'Test DUT', sub: 'Live session log' },
      { to: '/results-db',   label: 'DB',       sub: 'Historical search' },
    ],
  },
  {
    id: 'config', icon: '⚙️', label: 'Config', sub: 'Device configuration', perm: 'config', open: false,
    children: [
      { to: '/device-config',              label: 'General' },
      { to: '/device-config/hardware',     label: 'Hardware' },
      { to: '/device-config/data',         label: 'Data processing' },
      { to: '/device-config/files',        label: 'Files' },
      { to: '/device-config/ui',           label: 'UI' },
      { to: '/device-config/modules-cfg',  label: 'Modules Cfg' },
    ],
  },
  { to: '/device-status',  icon: '🔌', label: 'Device Status',   sub: 'Instrument details',  perm: 'deviceStatus' },
  { to: '/station-schema', icon: '🗺️',  label: 'Station Schema', sub: 'Test bench layout',   perm: 'stationSchema' },
  { to: '/settings',       icon: '🛠️',  label: 'Settings',       sub: 'App & test settings', perm: 'settings' },
  { to: '/help',           icon: '❓', label: 'Help',            sub: 'Documentation',        perm: 'help' },
  { to: '/authorization',  icon: '🔐', label: 'Authorization',   sub: 'Users & permissions', perm: 'authorization' },
])

const visibleItems = computed(() => {
  const perms = auth.perms
  return allItems.filter(item => {
    const key = item.perm as keyof typeof perms
    return key ? perms[key] : true
  })
})
</script>

<style scoped>
.nav-item:hover { border-left-color: rgba(245, 158, 11, 0.3); }
</style>
