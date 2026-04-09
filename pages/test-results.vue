<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Page header -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-rail-border bg-rail-card flex-shrink-0">
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">Test Results</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">
          S/N: {{ store.device.serialNo }} &nbsp;|&nbsp; Duration: {{ store.session.duration }}
          &nbsp;|&nbsp;
          <span class="text-rail-ok">{{ store.passCount }} PASS</span>
          &nbsp;
          <span class="text-rail-fail">{{ store.failCount }} FAIL</span>
          <template v-if="runningCount">
            &nbsp;<span class="text-rail-accent animate-pulse">{{ runningCount }} RUNNING</span>
          </template>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <!-- Progress bar -->
        <div>
          <div class="font-mono text-[9px] text-rail-dim mb-1 text-right">
            STEP {{ store.session.progress.current }} / {{ store.session.progress.total }}
          </div>
          <div class="w-40 h-2 bg-rail-muted rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-500"
              :class="store.overallStatus === 'fail' ? 'bg-rail-fail' : 'bg-rail-ok'"
              :style="{ width: `${(store.session.progress.current / store.session.progress.total) * 100}%` }"
            ></div>
          </div>
        </div>
        <!-- Export button -->
        <button
          class="px-3 py-1.5 bg-rail-card border border-rail-border text-rail-dim hover:text-rail-text hover:border-rail-accent transition-colors rounded font-mono text-xs"
          @click="exportCsv"
        >
          ↓ Export CSV
        </button>
      </div>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-2 px-6 py-2 border-b border-rail-border bg-rail-card/50 flex-shrink-0">
      <span class="font-mono text-[10px] text-rail-dim uppercase tracking-wider mr-1">Filter:</span>
      <button
        v-for="f in filters"
        :key="f.value"
        class="px-2.5 py-1 rounded border font-mono text-[10px] transition-colors"
        :class="activeFilter === f.value
          ? 'bg-rail-accent text-rail-bg border-rail-accent'
          : 'bg-transparent text-rail-dim border-rail-border hover:border-rail-muted'"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
      </button>
    </div>

    <!-- Table -->
    <div class="flex-1 overflow-auto">
      <table class="w-full rail-table border-collapse">
        <thead class="sticky top-0 z-10">
          <tr class="bg-rail-card border-b border-rail-border">
            <th class="text-left px-5 py-2.5 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-8"></th>
            <th class="text-left px-3 py-2.5 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-72">Step</th>
            <th class="text-left px-3 py-2.5 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold">Details</th>
            <th class="text-right px-5 py-2.5 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-28">Result</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in filteredResults" :key="row.id">
            <!-- Main row -->
            <tr
              class="border-b border-rail-border/50 cursor-pointer hover:bg-rail-card/40 transition-colors"
              :class="{
                'bg-rail-fail/5':   row.result === 'FAIL',
                'bg-rail-accent/3': row.result === 'RUNNING',
              }"
              @click="store.toggleRow(row.id)"
            >
              <td class="px-5 py-2.5 text-center">
                <span
                  class="inline-block transition-transform duration-200 text-rail-dim text-xs"
                  :class="{ 'rotate-90': row.expanded }"
                >▶</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="font-sans text-xs text-rail-text">{{ row.step }}</span>
              </td>
              <td class="px-3 py-2.5">
                <span class="font-mono text-xs text-rail-dim">{{ row.details }}</span>
              </td>
              <td class="px-5 py-2.5 text-right">
                <span
                  class="font-mono text-xs font-bold"
                  :class="{
                    'text-rail-ok':     row.result === 'OK',
                    'text-rail-fail':   row.result === 'FAIL',
                    'text-rail-accent animate-pulse': row.result === 'RUNNING',
                    'text-rail-dim':    row.result === 'SKIP',
                  }"
                >{{ row.result }}</span>
              </td>
            </tr>

            <!-- Expanded detail row -->
            <Transition name="expand">
              <tr v-if="row.expanded" class="bg-rail-card/30">
                <td colspan="4" class="px-0">
                  <div class="px-12 py-4 border-b border-rail-border flex gap-6 animate-fade-in">

                    <!-- Input parameters -->
                    <div class="flex-shrink-0">
                      <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider mb-2">Input Parameters</div>
                      <div class="bg-rail-card border border-rail-border rounded p-3 min-w-[220px]">
                        <div
                          v-for="(val, key) in row.params"
                          :key="key"
                          class="flex items-center justify-between gap-8 py-0.5 border-b border-rail-border/30 last:border-0"
                        >
                          <span class="font-mono text-[10px] text-rail-dim capitalize">{{ key }}</span>
                          <span class="font-mono text-[10px] text-rail-text">{{ val }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Test log -->
                    <div class="flex-1 min-w-0">
                      <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider mb-2">Test Log</div>
                      <div class="bg-rail-bg border border-rail-border rounded p-3 font-mono text-[10px] space-y-0.5 max-h-40 overflow-auto">
                        <div
                          v-for="(line, idx) in row.log"
                          :key="idx"
                          class="leading-relaxed"
                          :class="{
                            'text-rail-fail':   line.includes('FAIL') || line.includes('ERROR'),
                            'text-rail-ok':     line.includes('PASS'),
                            'text-rail-accent': line.includes('>>>') || line.includes('Running'),
                            'text-rail-dim':    !line.includes('FAIL') && !line.includes('PASS') && !line.includes('ERROR') && !line.includes('>>>') && !line.includes('Running'),
                          }"
                        >{{ line }}</div>
                        <!-- Live append cursor for running step -->
                        <span v-if="row.result === 'RUNNING'" class="inline-block w-1.5 h-3 bg-rail-accent animate-pulse"></span>
                      </div>
                    </div>

                    <!-- Status badge -->
                    <div class="flex-shrink-0 flex flex-col items-center justify-center w-20">
                      <div
                        class="w-14 h-14 rounded-full flex items-center justify-center border-2"
                        :class="{
                          'border-rail-ok   bg-rail-ok/10':     row.result === 'OK',
                          'border-rail-fail bg-rail-fail/10':   row.result === 'FAIL',
                          'border-rail-accent bg-rail-accent/10 animate-pulse': row.result === 'RUNNING',
                          'border-rail-dim  bg-rail-dim/10':    row.result === 'SKIP',
                        }"
                      >
                        <span
                          class="font-mono text-xs font-bold"
                          :class="{
                            'text-rail-ok':     row.result === 'OK',
                            'text-rail-fail':   row.result === 'FAIL',
                            'text-rail-accent': row.result === 'RUNNING',
                            'text-rail-dim':    row.result === 'SKIP',
                          }"
                        >{{ row.result }}</span>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
            </Transition>
          </template>

          <!-- Empty state -->
          <tr v-if="!filteredResults.length">
            <td colspan="4" class="py-10 text-center font-mono text-xs text-rail-dim">
              No results match the current filter.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDashboardStore } from '~/stores/dashboard'

const store = useDashboardStore()

type FilterValue = 'all' | 'OK' | 'FAIL' | 'RUNNING' | 'SKIP'
const activeFilter = ref<FilterValue>('all')

const filters: { label: string; value: FilterValue }[] = [
  { label: 'All',     value: 'all' },
  { label: 'PASS',    value: 'OK' },
  { label: 'FAIL',    value: 'FAIL' },
  { label: 'Running', value: 'RUNNING' },
  { label: 'Skip',    value: 'SKIP' },
]

const filteredResults = computed(() =>
  activeFilter.value === 'all'
    ? store.testResults
    : store.testResults.filter(r => r.result === activeFilter.value),
)

const runningCount = computed(() => store.testResults.filter(r => r.result === 'RUNNING').length)

function exportCsv() {
  const header = 'Step,Details,Result\n'
  const rows = store.testResults.map(r =>
    `"${r.step}","${r.details}","${r.result}"`,
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `test-results-${store.device.serialNo}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
</script>
