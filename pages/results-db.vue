<template>
  <div class="h-full flex flex-col overflow-hidden">

    <!-- ── Page header ──────────────────────────────────────────────────────── -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-rail-border bg-rail-card flex-shrink-0">
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">Results DB</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">
          <template v-if="loading">Searching…</template>
          <template v-else>
            {{ total }} session{{ total !== 1 ? 's' : '' }} found
            <template v-if="hasActiveFilters">
              &nbsp;·&nbsp;<span class="text-rail-accent">filters active</span>
            </template>
          </template>
        </p>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="px-3 py-1.5 rounded border font-mono text-[10px] transition-colors"
          :class="filtersOpen
            ? 'bg-rail-accent/10 border-rail-accent text-rail-accent'
            : 'bg-transparent border-rail-border text-rail-dim hover:border-rail-muted hover:text-rail-text'"
          @click="filtersOpen = !filtersOpen"
        >
          ⚙ Filters{{ hasActiveFilters ? ' ●' : '' }}
        </button>
        <button
          class="px-3 py-1.5 bg-rail-card border border-rail-border text-rail-dim hover:text-rail-text hover:border-rail-accent transition-colors rounded font-mono text-[10px]"
          :disabled="!total"
          @click="exportCsv"
        >
          ↓ Export CSV
        </button>
      </div>
    </div>

    <!-- ── Filter panel ──────────────────────────────────────────────────────── -->
    <Transition name="expand">
      <div v-if="filtersOpen" class="border-b border-rail-border bg-rail-card/60 px-6 py-4 flex-shrink-0">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">

          <!-- Device fields -->
          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Model</span>
            <input
              v-model="form.model"
              type="text"
              placeholder="e.g. REM102-G-G…"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Article No.</span>
            <input
              v-model="form.articleNo"
              type="text"
              placeholder="e.g. 5.6602.013"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Art. Revision</span>
            <input
              v-model="form.articleRev"
              type="text"
              placeholder="e.g. A00"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Article Name</span>
            <input
              v-model="form.articleName"
              type="text"
              placeholder="Article name…"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Serial No.</span>
            <input
              v-model="form.serialNo"
              type="text"
              placeholder="e.g. 21292853"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Operator</span>
            <input
              v-model="form.operator"
              type="text"
              placeholder="Operator name…"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">RTO Document</span>
            <input
              v-model="form.rtoName"
              type="text"
              placeholder="e.g. 5.2901.046J01"
              class="rail-input"
              @keyup.enter="applyFilters"
            />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Session Status</span>
            <select v-model="form.status" class="rail-input">
              <option value="">All statuses</option>
              <option value="ok">OK / Pass</option>
              <option value="fail">FAIL</option>
              <option value="running">Running</option>
              <option value="pending">Pending</option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Has Step Result</span>
            <select v-model="form.stepResult" class="rail-input">
              <option value="">Any</option>
              <option value="OK">Has OK steps</option>
              <option value="FAIL">Has FAIL steps</option>
              <option value="SKIP">Has SKIP steps</option>
            </select>
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Date From</span>
            <input v-model="form.dateFrom" type="date" class="rail-input" @change="applyFilters" />
          </label>

          <label class="flex flex-col gap-1">
            <span class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Date To</span>
            <input v-model="form.dateTo" type="date" class="rail-input" @change="applyFilters" />
          </label>

          <!-- Action buttons -->
          <div class="flex items-end gap-2">
            <button
              class="flex-1 py-1.5 bg-rail-accent text-rail-bg rounded font-mono text-[10px] font-semibold hover:bg-rail-accent/80 transition-colors"
              @click="applyFilters"
            >
              🔍 Search
            </button>
            <button
              class="flex-1 py-1.5 border border-rail-border text-rail-dim rounded font-mono text-[10px] hover:border-rail-muted hover:text-rail-text transition-colors"
              @click="clearFilters"
            >
              ✕ Clear
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ── Table ─────────────────────────────────────────────────────────────── -->
    <div class="flex-1 overflow-auto">
      <!-- Loading skeleton -->
      <div v-if="loading" class="flex items-center justify-center py-16">
        <span class="font-mono text-[11px] text-rail-dim animate-pulse">Loading…</span>
      </div>

      <table v-else class="w-full border-collapse text-left">
        <thead class="sticky top-0 z-10">
          <tr class="bg-rail-card border-b border-rail-border">
            <th class="px-4 py-2.5 w-6"></th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-36">Date / Time</th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold">Device Model</th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-32">Art.No / Rev</th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-28">Serial No.</th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-32">RTO Doc</th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-24">Operator</th>
            <th class="px-3 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-32 text-center">Steps</th>
            <th class="px-4 py-2.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-20 text-right">Status</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="row in sessions" :key="row.id">

            <!-- Session row -->
            <tr
              class="border-b border-rail-border/50 cursor-pointer hover:bg-rail-card/40 transition-colors"
              :class="{
                'bg-rail-fail/5'  : row.status === 'fail',
                'bg-rail-ok/3'    : row.status === 'ok',
                'bg-rail-accent/3': row.status === 'running',
              }"
              @click="toggleSession(row.id)"
            >
              <!-- Expand chevron -->
              <td class="px-4 py-2.5 text-center">
                <span
                  class="inline-block text-rail-dim text-[10px] transition-transform duration-200"
                  :class="{ 'rotate-90': expanded[row.id] }"
                >▶</span>
              </td>

              <!-- Date -->
              <td class="px-3 py-2.5">
                <div class="font-mono text-[10px] text-rail-text">{{ fmtDate(row.startTime) }}</div>
                <div class="font-mono text-[9px] text-rail-dim">{{ fmtTime(row.startTime) }}
                  <template v-if="row.durationSeconds">
                    · {{ fmtDuration(row.durationSeconds) }}
                  </template>
                </div>
              </td>

              <!-- Device model -->
              <td class="px-3 py-2.5">
                <div class="font-mono text-[10px] text-rail-text leading-tight">{{ row.device.model }}</div>
                <div v-if="row.device.articleName && row.device.articleName !== '—'" class="font-sans text-[9px] text-rail-dim mt-0.5 truncate max-w-[200px]">{{ row.device.articleName }}</div>
              </td>

              <!-- Art.No / Rev -->
              <td class="px-3 py-2.5">
                <div class="font-mono text-[10px] text-rail-text">{{ row.device.articleNumber }}</div>
                <div class="font-mono text-[9px] text-rail-dim">{{ row.device.articleRevision }}</div>
              </td>

              <!-- Serial No. -->
              <td class="px-3 py-2.5">
                <span class="font-mono text-[10px] text-rail-text">{{ row.device.serialNo }}</span>
              </td>

              <!-- RTO -->
              <td class="px-3 py-2.5">
                <div class="font-mono text-[10px] text-rail-text leading-tight">{{ row.rtoName ?? row.rtoRevision ?? '—' }}</div>
                <div v-if="row.rtoDocRevision" class="font-mono text-[9px] text-rail-dim">Rev {{ row.rtoDocRevision }}</div>
              </td>

              <!-- Operator -->
              <td class="px-3 py-2.5">
                <span class="font-mono text-[10px] text-rail-dim">{{ row.operator ?? '—' }}</span>
              </td>

              <!-- Steps bar -->
              <td class="px-3 py-2.5">
                <div class="flex items-center gap-1.5">
                  <div class="flex-1 h-1.5 bg-rail-muted rounded-full overflow-hidden flex">
                    <div
                      class="h-full bg-rail-ok transition-all"
                      :style="{ width: `${pct(row.counts.ok, row.counts.total)}%` }"
                    ></div>
                    <div
                      class="h-full bg-rail-fail transition-all"
                      :style="{ width: `${pct(row.counts.fail, row.counts.total)}%` }"
                    ></div>
                  </div>
                  <span class="font-mono text-[9px] text-rail-dim whitespace-nowrap">
                    <span class="text-rail-ok">{{ row.counts.ok }}</span>/
                    <span class="text-rail-fail">{{ row.counts.fail }}</span>/{{ row.counts.total }}
                  </span>
                </div>
              </td>

              <!-- Overall status -->
              <td class="px-4 py-2.5 text-right">
                <span
                  class="font-mono text-[10px] font-bold"
                  :class="statusClass(row.status)"
                >{{ statusLabel(row.status) }}</span>
              </td>
            </tr>

            <!-- Expanded: inline step results ──────────────────────────────── -->
            <Transition name="expand">
              <tr v-if="expanded[row.id]">
                <td colspan="9" class="bg-rail-bg/60 px-0">
                  <div class="px-10 py-3 border-b border-rail-border">

                    <!-- Loading state -->
                    <div v-if="loadingResults[row.id]" class="font-mono text-[10px] text-rail-dim py-4 text-center animate-pulse">
                      Loading steps…
                    </div>

                    <!-- Empty state -->
                    <div v-else-if="!sessionResults[row.id]?.length" class="font-mono text-[10px] text-rail-dim py-4 text-center">
                      No step results recorded for this session.
                    </div>

                    <!-- Results sub-table -->
                    <template v-else>
                      <!-- Device detail strip -->
                      <div class="flex flex-wrap gap-x-6 gap-y-1 mb-3 pb-3 border-b border-rail-border/50">
                        <span class="font-mono text-[9px] text-rail-dim">
                          S/N: <span class="text-rail-text">{{ row.device.serialNo }}</span>
                        </span>
                        <span v-if="row.device.purchaser" class="font-mono text-[9px] text-rail-dim">
                          Customer: <span class="text-rail-text">{{ row.device.purchaser }}</span>
                        </span>
                        <span v-if="row.device.customerProject" class="font-mono text-[9px] text-rail-dim">
                          Project: <span class="text-rail-text">{{ row.device.customerProject }}</span>
                        </span>
                        <span class="font-mono text-[9px] text-rail-dim">
                          Start: <span class="text-rail-text">{{ fmtDate(row.startTime) }} {{ fmtTime(row.startTime) }}</span>
                        </span>
                        <span v-if="row.endTime" class="font-mono text-[9px] text-rail-dim">
                          End: <span class="text-rail-text">{{ fmtTime(row.endTime) }}</span>
                        </span>
                      </div>

                      <table class="w-full border-collapse">
                        <thead>
                          <tr class="border-b border-rail-border/40">
                            <th class="text-left pb-1.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-16">Step</th>
                            <th class="text-left pb-1.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold">Name / VI</th>
                            <th class="text-left pb-1.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-20">Start</th>
                            <th class="text-left pb-1.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-20">Stop</th>
                            <th class="text-right pb-1.5 font-mono text-[9px] text-rail-dim uppercase tracking-wider font-semibold w-16">Result</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr
                            v-for="step in sessionResults[row.id]"
                            :key="step.id"
                            class="border-b border-rail-border/20 last:border-0"
                          >
                            <td class="py-1 font-mono text-[10px] text-rail-dim">{{ step.stepId }}</td>
                            <td class="py-1 pr-4">
                              <div class="font-sans text-[11px] text-rail-text leading-snug">{{ step.stepLabel || step.stepName || '—' }}</div>
                              <div v-if="step.stepName && step.stepLabel && step.stepName !== step.stepLabel" class="font-mono text-[9px] text-rail-dim truncate">{{ step.stepName }}</div>
                            </td>
                            <td class="py-1 font-mono text-[10px] text-rail-dim">{{ step.stepStart ?? '—' }}</td>
                            <td class="py-1 font-mono text-[10px] text-rail-dim">{{ step.stepStop  ?? '—' }}</td>
                            <td class="py-1 text-right">
                              <span
                                class="font-mono text-[10px] font-bold"
                                :class="stepResultClass(step.result)"
                              >{{ step.result }}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </template>
                  </div>
                </td>
              </tr>
            </Transition>
          </template>

          <!-- Empty state -->
          <tr v-if="!loading && !sessions.length">
            <td colspan="9" class="py-14 text-center font-mono text-xs text-rail-dim">
              No sessions match the current filters.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Pagination ─────────────────────────────────────────────────────────── -->
    <div
      v-if="total > pageSize"
      class="flex items-center justify-between px-6 py-2.5 border-t border-rail-border bg-rail-card flex-shrink-0"
    >
      <span class="font-mono text-[10px] text-rail-dim">
        Showing {{ offset + 1 }}–{{ Math.min(offset + sessions.length, total) }} of {{ total }}
      </span>
      <div class="flex items-center gap-1">
        <button
          class="px-2 py-1 rounded border border-rail-border font-mono text-[10px] text-rail-dim hover:border-rail-accent hover:text-rail-text transition-colors disabled:opacity-30"
          :disabled="offset === 0"
          @click="goOffset(offset - pageSize)"
        >← Prev</button>

        <template v-for="p in pageNumbers" :key="p">
          <span v-if="p === '…'" class="px-1 font-mono text-[10px] text-rail-dim">…</span>
          <button
            v-else
            class="w-7 h-7 rounded border font-mono text-[10px] transition-colors"
            :class="p === currentPage
              ? 'bg-rail-accent border-rail-accent text-rail-bg font-bold'
              : 'border-rail-border text-rail-dim hover:border-rail-accent hover:text-rail-text'"
            @click="goOffset((Number(p) - 1) * pageSize)"
          >{{ p }}</button>
        </template>

        <button
          class="px-2 py-1 rounded border border-rail-border font-mono text-[10px] text-rail-dim hover:border-rail-accent hover:text-rail-text transition-colors disabled:opacity-30"
          :disabled="offset + pageSize >= total"
          @click="goOffset(offset + pageSize)"
        >Next →</button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'

// ── Types ─────────────────────────────────────────────────────────────────────
interface SessionItem {
  id             : string
  status         : string
  startTime      : string | null
  endTime        : string | null
  durationSeconds: number | null
  progressCurrent: number
  progressTotal  : number
  operator       : string | null
  rtoRevision    : string | null
  rtoName        : string | null
  rtoDocRevision : string | null
  device: {
    model          : string
    articleNumber  : string
    articleRevision: string
    articleName    : string
    serialNo       : string
    customerProject: string | null
    purchaser      : string | null
  }
  counts: { total: number; ok: number; fail: number; skip: number }
}

interface StepResult {
  id        : string
  stepId    : string
  stepLabel : string | null
  stepName  : string | null
  stepStart : string | null
  stepStop  : string | null
  result    : string
  finished  : boolean
}

// ── State ─────────────────────────────────────────────────────────────────────
const pageSize = 20

const form = reactive({
  model      : '',
  articleNo  : '',
  articleRev : '',
  articleName: '',
  serialNo   : '',
  operator   : '',
  rtoName    : '',
  status     : '',
  stepResult : '',
  dateFrom   : '',
  dateTo     : '',
})

// Applied filter snapshot (what was last searched)
const applied = reactive({ ...form })

const filtersOpen = ref(true)
const loading     = ref(false)
const sessions    = ref<SessionItem[]>([])
const total       = ref(0)
const offset      = ref(0)

const expanded       = reactive<Record<string, boolean>>({})
const loadingResults = reactive<Record<string, boolean>>({})
const sessionResults = reactive<Record<string, StepResult[]>>({})

// ── Computed ──────────────────────────────────────────────────────────────────
const hasActiveFilters = computed(() =>
  Object.values(applied).some(v => v !== ''),
)

const currentPage = computed(() => Math.floor(offset.value / pageSize) + 1)
const totalPages  = computed(() => Math.ceil(total.value / pageSize))

const pageNumbers = computed(() => {
  const pages: (number | '…')[] = []
  const tp = totalPages.value
  const cp = currentPage.value
  if (tp <= 7) {
    for (let i = 1; i <= tp; i++) pages.push(i)
  } else {
    pages.push(1)
    if (cp > 3) pages.push('…')
    for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
    if (cp < tp - 2) pages.push('…')
    pages.push(tp)
  }
  return pages
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
async function fetch() {
  loading.value = true
  try {
    const params = new URLSearchParams()
    params.set('limit',  String(pageSize))
    params.set('offset', String(offset.value))
    if (applied.model)       params.set('model',       applied.model)
    if (applied.articleNo)   params.set('articleNo',   applied.articleNo)
    if (applied.articleRev)  params.set('articleRev',  applied.articleRev)
    if (applied.articleName) params.set('articleName', applied.articleName)
    if (applied.serialNo)    params.set('serialNo',    applied.serialNo)
    if (applied.operator)    params.set('operator',    applied.operator)
    if (applied.rtoName)     params.set('rtoName',     applied.rtoName)
    if (applied.status)      params.set('status',      applied.status)
    if (applied.stepResult)  params.set('stepResult',  applied.stepResult)
    if (applied.dateFrom)    params.set('dateFrom',    applied.dateFrom)
    if (applied.dateTo)      params.set('dateTo',      applied.dateTo)

    const data = await $fetch<{ total: number; items: SessionItem[] }>(
      `/api/test-sessions/search?${params}`,
    )
    sessions.value = data.items
    total.value    = data.total
  } finally {
    loading.value = false
  }
}

async function fetchStepResults(sessionId: string) {
  if (sessionResults[sessionId]) return
  loadingResults[sessionId] = true
  try {
    const data = await $fetch<StepResult[]>(
      `/api/test-results?sessionId=${sessionId}&limit=200`,
    )
    sessionResults[sessionId] = data
  } finally {
    loadingResults[sessionId] = false
  }
}

// ── Actions ───────────────────────────────────────────────────────────────────
function applyFilters() {
  Object.assign(applied, form)
  offset.value = 0
  // Reset expanded states
  Object.keys(expanded).forEach(k => delete expanded[k])
  fetch()
}

function clearFilters() {
  Object.keys(form).forEach(k => (form as Record<string, string>)[k] = '')
  applyFilters()
}

function goOffset(o: number) {
  offset.value = Math.max(0, o)
  Object.keys(expanded).forEach(k => delete expanded[k])
  fetch()
}

async function toggleSession(id: string) {
  expanded[id] = !expanded[id]
  if (expanded[id]) await fetchStepResults(id)
}

// ── Formatting ────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtTime(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
function fmtDuration(secs: number | null) {
  if (!secs) return ''
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}
function pct(part: number, total: number) {
  return total ? Math.round((part / total) * 100) : 0
}

function statusLabel(s: string) {
  return s === 'ok' ? 'PASS' : s === 'fail' ? 'FAIL' : s === 'running' ? 'RUN…' : s.toUpperCase()
}
function statusClass(s: string) {
  return {
    'text-rail-ok'                    : s === 'ok',
    'text-rail-fail'                  : s === 'fail',
    'text-rail-accent animate-pulse'  : s === 'running',
    'text-rail-dim'                   : s === 'pending',
  }
}
function stepResultClass(r: string) {
  return {
    'text-rail-ok'                    : r === 'OK',
    'text-rail-fail'                  : r === 'FAIL',
    'text-rail-accent animate-pulse'  : r === 'RUNNING',
    'text-rail-dim'                   : r === 'SKIP' || r === 'pending',
  }
}

// ── Export CSV ────────────────────────────────────────────────────────────────
function exportCsv() {
  const header = [
    'Session ID','Date','Time','Device Model','Article No.','Art. Rev.',
    'Article Name','Serial No.','RTO Doc','RTO Rev','Operator',
    'Status','Steps Total','Steps OK','Steps FAIL','Steps SKIP',
  ].join(',')

  const rows = sessions.value.map(s => [
    s.id,
    fmtDate(s.startTime),
    fmtTime(s.startTime),
    s.device.model,
    s.device.articleNumber,
    s.device.articleRevision,
    `"${s.device.articleName}"`,
    s.device.serialNo,
    s.rtoName ?? '',
    s.rtoDocRevision ?? s.rtoRevision ?? '',
    s.operator ?? '',
    statusLabel(s.status),
    s.counts.total,
    s.counts.ok,
    s.counts.fail,
    s.counts.skip,
  ].join(','))

  const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `results-db-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Initial load ──────────────────────────────────────────────────────────────
fetch()
</script>

<style scoped>
.rail-input {
  @apply w-full bg-rail-bg border border-rail-border rounded px-2.5 py-1.5
         font-mono text-[11px] text-rail-text placeholder-rail-dim/50
         focus:outline-none focus:border-rail-accent transition-colors;
}
</style>
