<template>
  <aside class="w-36 flex-shrink-0 flex flex-col bg-rail-surface border-l border-rail-border">
    <!-- Header -->
    <div class="px-2 py-3 border-b border-rail-border text-center">
      <span class="font-mono text-[10px] text-rail-dim uppercase tracking-widest">Instruments</span>
    </div>

    <!-- Routine Test Overview button -->
    <NuxtLink
      to="/test-results"
      class="flex flex-col items-center gap-2 px-2 py-3 border-b border-rail-border hover:bg-rail-card transition-colors group"
    >
      <div class="relative">
        <div class="w-14 h-14 flex items-center justify-center bg-rail-card border border-rail-border rounded">
          <span class="text-2xl">📊</span>
          <span
            class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold"
            :class="store.overallStatus === 'ok' ? 'bg-rail-ok text-rail-bg' : 'bg-rail-fail text-white'"
          >
            {{ store.overallStatus === 'ok' ? '✓' : '!' }}
          </span>
        </div>
      </div>
      <span class="font-mono text-[10px] text-rail-dim text-center leading-tight group-hover:text-rail-text">
        Routine Test<br>Overview
      </span>
    </NuxtLink>

    <!-- Instrument list -->
    <div class="flex-1 overflow-auto py-1">
      <DeviceStatusBadge
        v-for="inst in store.instruments"
        :key="inst.id"
        :instrument="inst"
      />
    </div>

    <!-- RTO file info -->
    <div class="p-2 border-t border-rail-border text-center space-y-0.5">
      <div class="font-mono text-[10px] text-rail-dim">RTO file:</div>
      <div class="font-mono text-[10px] text-rail-accent">{{ store.device.rtoFile }}</div>
      <div class="font-mono text-[10px] text-rail-dim">revision: {{ store.device.rtoRevision }}</div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard'
const store = useDashboardStore()
</script>
