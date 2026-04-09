<template>
  <div
    class="flex flex-col items-center gap-1.5 px-2 py-3 border-b border-rail-border hover:bg-rail-card transition-colors cursor-pointer group"
    @click="$router.push('/device-status')"
  >
    <div class="relative">
      <div
        class="w-14 h-14 flex items-center justify-center bg-rail-card border rounded transition-colors"
        :class="borderClass"
      >
        <component :is="iconComponent" class="w-8 h-8" />
      </div>
      <span
        class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-rail-surface flex items-center justify-center"
        :class="statusBadgeClass"
      >
        <svg v-if="instrument.status === 'ok'" viewBox="0 0 10 10" class="w-3 h-3">
          <polyline points="2,5 4,7.5 8,2.5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else-if="instrument.status === 'fail'" viewBox="0 0 10 10" class="w-3 h-3">
          <line x1="2" y1="2" x2="8" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="8" y1="2" x2="2" y2="8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <svg v-else viewBox="0 0 10 10" class="w-3 h-3">
          <circle cx="5" cy="5" r="2" fill="currentColor"/>
        </svg>
      </span>
    </div>
    <span class="font-mono text-[11px] font-medium text-rail-text/80 group-hover:text-white text-center leading-tight">
      {{ instrument.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const DatabaseIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <ellipse cx="12" cy="5" rx="9" ry="3"/>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
  </svg>`
}
const MeterIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="4" width="20" height="16" rx="2"/>
    <path d="M8 10h8M8 14h5"/>
    <circle cx="16" cy="14" r="1" fill="currentColor"/>
  </svg>`
}
const PrinterIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="6" y="2" width="12" height="8"/>
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
    <rect x="6" y="14" width="12" height="8"/>
  </svg>`
}
const BoxIcon = {
  template: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
    <polyline points="3.27,6.96 12,12.01 20.73,6.96"/>
    <line x1="12" y1="22.08" x2="12" y2="12"/>
  </svg>`
}

const props = defineProps<{
  instrument: { id: string; label: string; status: string; type: string }
}>()

const iconComponent = computed(() => {
  if (props.instrument.type === 'database')   return DatabaseIcon
  if (props.instrument.type === 'instrument') return PrinterIcon
  if (props.instrument.type === 'dut')        return BoxIcon
  return MeterIcon
})

const borderClass = computed(() => ({
  'border-rail-ok/50':   props.instrument.status === 'ok',
  'border-rail-fail/50': props.instrument.status === 'fail',
  'border-rail-warn/50': props.instrument.status === 'warn',
  'border-rail-border':  props.instrument.status === 'idle',
}))

const statusBadgeClass = computed(() => ({
  'bg-rail-ok text-rail-bg':     props.instrument.status === 'ok',
  'bg-rail-fail text-white':     props.instrument.status === 'fail',
  'bg-rail-warn text-rail-bg':   props.instrument.status === 'warn',
  'bg-rail-muted text-rail-dim': props.instrument.status === 'idle',
}))
</script>
