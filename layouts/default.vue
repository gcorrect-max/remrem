<template>
  <div class="flex h-screen overflow-hidden bg-rail-bg">
    <NavLeft />

    <main class="flex-1 flex flex-col overflow-hidden min-w-0">
      <!-- Top bar -->
      <header class="flex items-center justify-between px-5 bg-rail-surface border-b border-rail-border flex-shrink-0" style="min-height:52px">
        <!-- Device identity -->
        <div class="flex items-start gap-8 py-2">
          <div class="space-y-0.5">
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-[11px] text-rail-dim whitespace-nowrap">Model</span>
              <span class="font-mono text-[11px] font-bold text-rail-header">{{ store.device.model }}</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-[11px] text-rail-dim whitespace-nowrap">Article number</span>
              <span class="font-mono text-[11px] font-bold text-rail-header">{{ store.device.articleNumber }}</span>
            </div>
          </div>
          <div class="w-px self-stretch bg-rail-border"></div>
          <div class="space-y-0.5">
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-[11px] text-rail-dim whitespace-nowrap">Production number</span>
              <span class="font-mono text-[11px] text-rail-header">{{ store.device.productionNumber || '—' }}</span>
            </div>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-[11px] text-rail-dim whitespace-nowrap">Serial No.</span>
              <span class="font-mono text-[11px] font-bold text-rail-header">{{ store.device.serialNo }}</span>
            </div>
          </div>
        </div>

        <!-- Right: status + RTO -->
        <div class="flex items-center gap-5 flex-shrink-0">
          <div class="flex items-center gap-1.5">
            <span class="inline-block w-2 h-2 rounded-full bg-rail-ok animate-pulse-slow"></span>
            <span class="font-mono text-xs text-rail-dim">ONLINE</span>
          </div>
          <div class="font-mono text-xs text-rail-dim">
            RTO: <span class="text-rail-info">{{ store.device.rtoFile }}</span>
            <span class="text-rail-border mx-1">/</span>
            <span class="text-rail-dim">rev {{ store.device.rtoRevision }}</span>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-auto"><slot /></div>

      <!-- Status bar -->
      <footer class="flex items-center justify-between px-6 py-1.5 bg-rail-surface border-t border-rail-border flex-shrink-0">
        <div class="font-mono text-xs text-rail-dim">
          YKGS820 status: YOKOGAWA, 765601, 91×324124, 1.10, Self test results: 0
        </div>
        <div class="flex items-center gap-4">
          <span class="font-mono text-xs text-rail-dim">
            STEP <span class="text-rail-accent">{{ store.session.progress.current }}</span> / {{ store.session.progress.total }}
          </span>
          <span class="font-mono text-xs text-rail-dim">⏱ {{ store.session.duration }}</span>
        </div>
      </footer>
    </main>

    <NavRight />
  </div>
</template>

<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard'
const store = useDashboardStore()
</script>
