<template>
  <div class="h-full flex overflow-hidden">
    <!-- ── Left: Test Steps List ── -->
    <aside class="w-72 flex-shrink-0 flex flex-col border-r border-rail-border overflow-hidden">
      <div class="px-4 py-3 border-b border-rail-border bg-rail-card">
        <h2 class="font-sans text-xs font-semibold text-rail-header uppercase tracking-wider">Test Routine Summary</h2>
        <div class="flex items-center gap-3 mt-1.5">
          <span class="font-mono text-[10px] text-rail-ok">✓ {{ passCount }} PASS</span>
          <span class="font-mono text-[10px] text-rail-fail">✗ {{ failCount }} FAIL</span>
          <span v-if="runningCount" class="font-mono text-[10px] text-rail-accent">⟳ {{ runningCount }} RUN</span>
          <span v-if="pendingCount" class="font-mono text-[10px] text-rail-dim">◌ {{ pendingCount }} PEND</span>
        </div>
      </div>

      <!-- Progress bar -->
      <div class="px-4 py-2 border-b border-rail-border bg-rail-card/50">
        <div class="flex items-center justify-between mb-1">
          <span class="font-mono text-[9px] text-rail-dim">Progress</span>
          <span class="font-mono text-[9px] text-rail-dim">
            {{ store.session.progress.current }} / {{ store.session.progress.total }}
          </span>
        </div>
        <div class="w-full h-1.5 bg-rail-muted rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-700"
            :class="store.overallStatus === 'fail' ? 'bg-rail-fail' : 'bg-rail-ok'"
            :style="{ width: `${(store.session.progress.current / store.session.progress.total) * 100}%` }"
          ></div>
        </div>
      </div>

      <div class="flex-1 overflow-auto">
        <div
          v-for="step in store.testSteps"
          :key="step.id"
          class="flex items-start gap-3 px-4 py-2 border-b border-rail-border/50 hover:bg-rail-card/50 transition-colors cursor-default"
          :class="{ 'accent-line': step.status === 'fail' }"
        >
          <!-- Status indicator -->
          <span class="mt-0.5 flex-shrink-0">
            <!-- OK -->
            <svg v-if="step.status === 'ok'" viewBox="0 0 12 12" class="w-3.5 h-3.5 text-rail-ok" fill="currentColor">
              <circle cx="6" cy="6" r="6"/>
              <polyline points="3,6 5,8.5 9,3.5" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <!-- FAIL -->
            <svg v-else-if="step.status === 'fail'" viewBox="0 0 12 12" class="w-3.5 h-3.5 text-rail-fail" fill="currentColor">
              <circle cx="6" cy="6" r="6"/>
              <line x1="3.5" y1="3.5" x2="8.5" y2="8.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="8.5" y1="3.5" x2="3.5" y2="8.5" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            <!-- RUNNING -->
            <svg v-else-if="step.status === 'running'" viewBox="0 0 12 12" class="w-3.5 h-3.5 text-rail-accent animate-spin" fill="currentColor">
              <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="20 10"/>
            </svg>
            <!-- SKIPPED -->
            <svg v-else-if="step.status === 'skipped'" viewBox="0 0 12 12" class="w-3.5 h-3.5 text-rail-dim" fill="currentColor">
              <circle cx="6" cy="6" r="6" opacity="0.3"/>
              <line x1="4" y1="4" x2="8" y2="8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            </svg>
            <!-- PENDING -->
            <svg v-else viewBox="0 0 12 12" class="w-3.5 h-3.5 text-rail-dim" fill="currentColor">
              <circle cx="6" cy="6" r="6" opacity="0.2"/>
              <circle cx="6" cy="6" r="2"/>
            </svg>
          </span>

          <div class="min-w-0 flex-1">
            <div class="font-mono text-[10px] text-rail-dim">{{ step.id }}</div>
            <div class="font-sans text-xs text-rail-text leading-snug mt-0.5">{{ step.label }}</div>
          </div>
        </div>
      </div>

      <!-- Session footer -->
      <div class="px-4 py-2.5 border-t border-rail-border bg-rail-card/50 space-y-0.5">
        <div class="flex justify-between font-mono text-[10px]">
          <span class="text-rail-dim">Duration</span>
          <span class="text-rail-text">{{ store.session.duration }}</span>
        </div>
        <div class="flex justify-between font-mono text-[10px]">
          <span class="text-rail-dim">Operator</span>
          <span class="text-rail-text truncate max-w-[120px]">{{ store.session.operator }}</span>
        </div>
      </div>
    </aside>

    <!-- ── Right: Device Drawing + Thumbnails ── -->
    <div class="flex-1 flex flex-col overflow-hidden bg-rail-bg grid-bg">
      <!-- Active drawing area -->
      <div class="flex-1 flex items-center justify-center p-8 overflow-hidden relative">
        <!-- Drawing title -->
        <div class="absolute top-4 left-6">
          <span class="font-mono text-xs text-rail-dim">{{ activeDrawingInfo?.label }}</span>
        </div>

        <!-- Device subsystems table overlay -->
        <div class="absolute top-4 right-6">
          <div class="bg-rail-surface/90 border border-rail-border rounded text-[10px] font-mono backdrop-blur-sm">
            <div class="px-3 py-1.5 border-b border-rail-border grid grid-cols-4 gap-3 text-rail-dim font-semibold">
              <span>Serial No.</span><span>Article No.</span><span>Rev</span><span>Description</span>
            </div>
            <div
              v-for="s in store.subsystems"
              :key="s.serial"
              class="px-3 py-1 grid grid-cols-4 gap-3 text-rail-text hover:bg-rail-card/50 border-b border-rail-border/30 last:border-0"
            >
              <span>{{ s.serial }}</span>
              <span>{{ s.article }}</span>
              <span class="text-rail-dim">{{ s.revision }}</span>
              <span>{{ s.description }}</span>
            </div>
          </div>
        </div>

        <!-- Main SVG Device Drawing -->
        <div class="w-full max-w-lg relative">
          <DeviceDrawingSvg :drawingId="store.activeDrawing" />
        </div>
      </div>

      <!-- Thumbnail strip -->
      <div class="flex-shrink-0 border-t border-rail-border bg-rail-surface px-6 py-3">
        <div class="flex items-center gap-1 mb-2">
          <span class="font-mono text-[9px] text-rail-dim uppercase tracking-widest">Drawing files</span>
        </div>
        <div class="flex gap-3 overflow-x-auto pb-1">
          <button
            v-for="drawing in store.drawings"
            :key="drawing.id"
            class="flex-shrink-0 flex flex-col items-center gap-1.5 group"
            @click="store.setActiveDrawing(drawing.id)"
          >
            <div
              class="w-20 h-16 border rounded bg-rail-card flex items-center justify-center overflow-hidden transition-all duration-150"
              :class="drawing.id === store.activeDrawing
                ? 'border-rail-accent shadow-[0_0_0_1px_rgba(245,158,11,0.4)]'
                : 'border-rail-border hover:border-rail-muted'"
            >
              <DrawingThumbnailSvg :drawingId="drawing.id" class="w-full h-full" />
            </div>
            <span
              class="font-mono text-[9px] text-center leading-tight transition-colors"
              :class="drawing.id === store.activeDrawing ? 'text-rail-accent' : 'text-rail-dim group-hover:text-rail-text'"
            >
              {{ drawing.label.split(' – ')[0] }}
            </span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStore } from '~/stores/dashboard'

const store = useDashboardStore()

const passCount    = computed(() => store.testSteps.filter(s => s.status === 'ok').length)
const failCount    = computed(() => store.testSteps.filter(s => s.status === 'fail').length)
const runningCount = computed(() => store.testSteps.filter(s => s.status === 'running').length)
const pendingCount = computed(() => store.testSteps.filter(s => s.status === 'pending').length)

const activeDrawingInfo = computed(() => store.drawings.find(d => d.id === store.activeDrawing))
</script>
