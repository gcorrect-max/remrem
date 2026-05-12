<template>
  <div class="h-full flex flex-col overflow-hidden">

    <!-- ── Page header ── -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-rail-border bg-rail-card flex-shrink-0">
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">Queue Log Viewer</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">
          <template v-if="entries.length">
            {{ filteredEntries.length }} / {{ entries.length }} entries
            &nbsp;|&nbsp; {{ loadedFiles.length }} file{{ loadedFiles.length !== 1 ? 's' : '' }}
            &nbsp;|&nbsp; {{ queues.length }} queue{{ queues.length !== 1 ? 's' : '' }}
            <template v-if="timeRange"> &nbsp;|&nbsp; {{ timeRange }}</template>
          </template>
          <template v-else>Drop one or more .json queue log files to begin</template>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="entries.length"
          class="px-3 py-1.5 bg-rail-card border border-rail-border text-rail-dim hover:text-rail-text hover:border-rail-accent transition-colors rounded font-mono text-xs"
          @click="clearAll"
        >✕ Clear</button>
        <label
          class="px-3 py-1.5 bg-rail-card border border-rail-border text-rail-dim hover:text-rail-text hover:border-rail-accent transition-colors rounded font-mono text-xs cursor-pointer"
        >
          + Load files
          <input type="file" multiple accept=".json" class="hidden" @change="onFileInput" />
        </label>
      </div>
    </div>

    <!-- ── Drop zone (shown when no files loaded) ── -->
    <div
      v-if="!entries.length"
      class="flex-1 flex flex-col items-center justify-center gap-5 m-6 rounded-lg border-2 border-dashed transition-colors"
      :class="dragging ? 'border-rail-accent bg-rail-accent/5' : 'border-rail-muted'"
      @dragover.prevent="dragging = true"
      @dragleave.prevent="dragging = false"
      @drop.prevent="onDrop"
    >
      <div class="text-5xl opacity-30 select-none">📂</div>
      <div class="text-center">
        <p class="font-sans text-sm text-rail-text">Drag &amp; drop queue log files here</p>
        <p class="font-mono text-[11px] text-rail-dim mt-1">Accepts newline-delimited JSON (.json) — YKGS820, YKG3000, DataProc, etc.</p>
      </div>
      <label class="px-4 py-2 rounded border border-rail-accent text-rail-accent font-mono text-xs hover:bg-rail-accent/10 transition-colors cursor-pointer">
        Browse files
        <input type="file" multiple accept=".json" class="hidden" @change="onFileInput" />
      </label>
    </div>

    <!-- ── Main content (shown when files loaded) ── -->
    <template v-else>

      <!-- Summary strip -->
      <div class="flex items-stretch gap-0 border-b border-rail-border bg-rail-surface flex-shrink-0 overflow-x-auto">
        <div
          v-for="q in queueStats"
          :key="q.name"
          class="flex flex-col px-5 py-2 border-r border-rail-border min-w-[140px]"
        >
          <span class="font-mono text-[10px] font-bold" :style="{ color: q.color }">{{ q.name }}</span>
          <span class="font-mono text-[11px] text-rail-text mt-0.5">{{ q.count }} entries</span>
          <div class="flex gap-2 mt-1">
            <span class="font-mono text-[9px] text-rail-info">R:{{ q.reads }}</span>
            <span class="font-mono text-[9px] text-rail-warn">W:{{ q.writes }}</span>
            <span class="font-mono text-[9px] text-rail-ok">→:{{ q.responses }}</span>
          </div>
        </div>
        <!-- Global totals -->
        <div class="flex flex-col px-5 py-2 ml-auto min-w-[120px]">
          <span class="font-mono text-[10px] text-rail-dim uppercase tracking-wider">Total</span>
          <span class="font-mono text-[11px] text-rail-header mt-0.5">{{ entries.length }}</span>
          <div class="flex gap-2 mt-1">
            <span class="font-mono text-[9px] text-rail-info">R:{{ globalStats.reads }}</span>
            <span class="font-mono text-[9px] text-rail-warn">W:{{ globalStats.writes }}</span>
            <span class="font-mono text-[9px] text-rail-ok">→:{{ globalStats.responses }}</span>
          </div>
        </div>
      </div>

      <!-- Filter bar -->
      <div
        class="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-2 border-b border-rail-border bg-rail-card/50 flex-shrink-0"
      >
        <!-- Queue toggles -->
        <div class="flex items-center gap-1.5">
          <span class="font-mono text-[10px] text-rail-dim uppercase tracking-wider">Queue:</span>
          <button
            class="px-2 py-0.5 rounded border font-mono text-[10px] transition-colors"
            :class="selectedQueues.size === 0
              ? 'bg-rail-accent text-rail-bg border-rail-accent'
              : 'text-rail-dim border-rail-border hover:border-rail-muted'"
            @click="selectedQueues.clear(); selectedQueues = new Set(selectedQueues)"
          >All</button>
          <button
            v-for="q in queues"
            :key="q"
            class="px-2 py-0.5 rounded border font-mono text-[10px] transition-colors"
            :class="selectedQueues.has(q)
              ? 'border-transparent text-rail-bg font-bold'
              : 'text-rail-dim border-rail-border hover:border-rail-muted'"
            :style="selectedQueues.has(q) ? { backgroundColor: queueColor(q), borderColor: queueColor(q) } : {}"
            @click="toggleQueue(q)"
          >{{ q }}</button>
        </div>

        <!-- Action toggles -->
        <div class="flex items-center gap-1.5">
          <span class="font-mono text-[10px] text-rail-dim uppercase tracking-wider">Action:</span>
          <button
            v-for="a in actionTypes"
            :key="a.value"
            class="px-2 py-0.5 rounded border font-mono text-[10px] transition-colors"
            :class="selectedActions.has(a.value)
              ? `${a.activeBg} border-transparent`
              : 'text-rail-dim border-rail-border hover:border-rail-muted'"
            @click="toggleAction(a.value)"
          >{{ a.label }}</button>
        </div>

        <!-- Command search -->
        <div class="flex items-center gap-1.5 ml-auto">
          <span class="font-mono text-[10px] text-rail-dim uppercase tracking-wider">Search:</span>
          <input
            v-model="searchText"
            type="text"
            placeholder="command or payload…"
            class="bg-rail-bg border border-rail-border rounded px-2 py-0.5 font-mono text-[11px] text-rail-text placeholder-rail-dim/50 focus:outline-none focus:border-rail-accent w-48 transition-colors"
          />
        </div>
      </div>

      <!-- Log table -->
      <div
        class="flex-1 overflow-auto"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <table class="w-full border-collapse rail-table text-[11px]">
          <thead class="sticky top-0 z-10">
            <tr class="bg-rail-card border-b border-rail-border">
              <th class="w-6 px-2 py-2"></th>
              <th class="text-left px-3 py-2 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-44">Timestamp</th>
              <th class="text-left px-3 py-2 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-36">Queue</th>
              <th class="text-left px-3 py-2 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-24">Action</th>
              <th class="text-left px-3 py-2 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold">Command / Summary</th>
              <th class="text-right px-3 py-2 font-mono text-[10px] text-rail-dim uppercase tracking-wider font-semibold w-10">File</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="(entry, idx) in filteredEntries" :key="entry._id">
              <!-- Main row -->
              <tr
                class="border-b border-rail-border/40 cursor-pointer hover:bg-rail-card/40 transition-colors"
                :class="rowBg(entry)"
                @click="toggleExpand(entry)"
              >
                <!-- Expand chevron -->
                <td class="px-2 py-1.5 text-center">
                  <span
                    class="inline-block text-rail-dim/50 text-[9px] transition-transform duration-150"
                    :class="entry._expanded ? 'rotate-90' : ''"
                  >▶</span>
                </td>
                <!-- Timestamp -->
                <td class="px-3 py-1.5 font-mono text-rail-dim whitespace-nowrap">
                  {{ formatTs(entry.Timestamp) }}
                </td>
                <!-- Queue -->
                <td class="px-3 py-1.5">
                  <span
                    class="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded"
                    :style="{ color: queueColor(entry.queueName), background: queueColor(entry.queueName) + '18' }"
                  >{{ entry.queueName }}</span>
                </td>
                <!-- Action -->
                <td class="px-3 py-1.5">
                  <span class="font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded" :class="actionStyle(entry.action)">
                    {{ entry.action || '—' }}
                  </span>
                </td>
                <!-- Command + inline summary -->
                <td class="px-3 py-1.5 min-w-0">
                  <span class="font-mono text-rail-text font-semibold">{{ entry.command || '—' }}</span>
                  <span v-if="inlineSummary(entry)" class="font-mono text-rail-dim ml-3 text-[10px]">{{ inlineSummary(entry) }}</span>
                </td>
                <!-- File index badge -->
                <td class="px-3 py-1.5 text-right">
                  <span class="font-mono text-[9px] text-rail-dim/60">{{ loadedFiles[entry._fileIndex]?.shortName }}</span>
                </td>
              </tr>

              <!-- Expanded detail row -->
              <Transition name="expand">
                <tr v-if="entry._expanded" class="bg-rail-bg/60">
                  <td colspan="6" class="px-0 border-b border-rail-border">
                    <div class="px-10 py-3 animate-fade-in">
                      <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider mb-2">Payload</div>
                      <pre class="bg-rail-card border border-rail-border rounded p-3 font-mono text-[10px] text-rail-text overflow-auto max-h-64 leading-relaxed whitespace-pre-wrap break-all">{{ formatPayload(entry) }}</pre>
                    </div>
                  </td>
                </tr>
              </Transition>
            </template>

            <!-- Empty state -->
            <tr v-if="!filteredEntries.length">
              <td colspan="6" class="py-12 text-center font-mono text-xs text-rail-dim">
                No entries match the current filters.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'

// ── Types ──────────────────────────────────────────────────────────────────

interface LoadedFile {
  name: string
  shortName: string
}

interface LogEntry {
  _id: number
  _fileIndex: number
  _expanded: boolean
  Timestamp: string
  queueName: string
  action: string
  command: string
  payload: Record<string, unknown>
}

// ── State ──────────────────────────────────────────────────────────────────

const dragging    = ref(false)
const loadedFiles = ref<LoadedFile[]>([])
const entries     = ref<LogEntry[]>([])
let   nextId      = 0

const selectedQueues  = ref<Set<string>>(new Set())
const selectedActions = ref<Set<string>>(new Set(['Read', 'Write', 'Response', 'STARTED']))
const searchText      = ref('')

// ── Static config ──────────────────────────────────────────────────────────

const QUEUE_COLORS: Record<string, string> = {
  YKGS820:  '#38bdf8',   // sky
  YKG3000:  '#a78bfa',   // violet
  DataProc: '#4ade80',   // green
}
const FALLBACK_COLORS = ['#fb923c', '#f472b6', '#facc15', '#34d399', '#60a5fa', '#c084fc']

const queueColorMap = reactive<Record<string, string>>({})

function queueColor(name: string): string {
  if (QUEUE_COLORS[name]) return QUEUE_COLORS[name]
  if (!queueColorMap[name]) {
    const idx = Object.keys(queueColorMap).length % FALLBACK_COLORS.length
    queueColorMap[name] = FALLBACK_COLORS[idx]
  }
  return queueColorMap[name]
}

const actionTypes = [
  { value: 'Read',     label: 'Read',     activeBg: 'bg-rail-info   text-rail-bg' },
  { value: 'Write',    label: 'Write',    activeBg: 'bg-rail-warn   text-rail-bg' },
  { value: 'Response', label: 'Response', activeBg: 'bg-rail-ok     text-rail-bg' },
  { value: 'STARTED',  label: 'Started',  activeBg: 'bg-rail-muted  text-rail-text' },
]

// ── Parsing ────────────────────────────────────────────────────────────────

function parseFile(text: string, fileIndex: number): LogEntry[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('{'))
    .map(line => {
      let raw: Record<string, unknown>
      try { raw = JSON.parse(line) } catch { return null }

      // Detect startup entry (has "Queue name" key)
      const isStartup = 'Queue name' in raw

      const queueName: string =
        (raw['Q Name'] as string) ??
        (raw['Queue name'] as string) ??
        'Unknown'

      const action: string = isStartup
        ? 'STARTED'
        : (raw['action'] as string) ?? ''

      const command: string =
        (raw['Command'] as string) ??
        (raw['Queue Command'] as string) ??
        ''

      // Build payload: everything except the well-known top-level fields
      const skip = new Set(['Timestamp', 'Q Name', 'Queue name', 'action', 'Command', 'Queue Command'])
      const payload: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(raw)) {
        if (!skip.has(k) && k !== '' && v !== null && v !== undefined) {
          payload[k] = v
        }
      }

      return {
        _id:        nextId++,
        _fileIndex: fileIndex,
        _expanded:  false,
        Timestamp:  (raw['Timestamp'] as string) ?? '',
        queueName,
        action,
        command,
        payload,
      } satisfies LogEntry
    })
    .filter((e): e is LogEntry => e !== null)
}

async function loadFiles(files: FileList | File[]) {
  const arr = Array.from(files)
  for (const file of arr) {
    const text = await file.text()
    const fileIndex = loadedFiles.value.length
    loadedFiles.value.push({
      name:      file.name,
      shortName: file.name.replace(/^[0-9a-f]+-/, '').replace(/\.json$/, '').slice(0, 10),
    })
    const parsed = parseFile(text, fileIndex)
    entries.value.push(...parsed)
  }
  // Sort all entries by timestamp
  entries.value.sort((a, b) => a.Timestamp.localeCompare(b.Timestamp))
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) loadFiles(e.dataTransfer.files)
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) loadFiles(input.files)
  input.value = ''
}

function clearAll() {
  entries.value = []
  loadedFiles.value = []
  selectedQueues.value = new Set()
  searchText.value = ''
  nextId = 0
  Object.keys(queueColorMap).forEach(k => delete queueColorMap[k])
}

// ── Derived data ───────────────────────────────────────────────────────────

const queues = computed(() => [...new Set(entries.value.map(e => e.queueName))].sort())

const queueStats = computed(() =>
  queues.value.map(name => {
    const qs = entries.value.filter(e => e.queueName === name)
    return {
      name,
      color:     queueColor(name),
      count:     qs.length,
      reads:     qs.filter(e => e.action === 'Read').length,
      writes:    qs.filter(e => e.action === 'Write').length,
      responses: qs.filter(e => e.action === 'Response').length,
    }
  })
)

const globalStats = computed(() => ({
  reads:     entries.value.filter(e => e.action === 'Read').length,
  writes:    entries.value.filter(e => e.action === 'Write').length,
  responses: entries.value.filter(e => e.action === 'Response').length,
}))

const timeRange = computed(() => {
  const ts = entries.value.map(e => e.Timestamp).filter(Boolean).sort()
  if (!ts.length) return ''
  if (ts.length === 1) return formatTs(ts[0])
  return `${formatTs(ts[0])} → ${formatTs(ts[ts.length - 1])}`
})

const filteredEntries = computed(() => {
  let result = entries.value
  if (selectedQueues.value.size > 0)
    result = result.filter(e => selectedQueues.value.has(e.queueName))
  if (selectedActions.value.size > 0 && selectedActions.value.size < actionTypes.length)
    result = result.filter(e => selectedActions.value.has(e.action))
  if (searchText.value.trim()) {
    const q = searchText.value.toLowerCase()
    result = result.filter(e =>
      e.command.toLowerCase().includes(q) ||
      e.queueName.toLowerCase().includes(q) ||
      JSON.stringify(e.payload).toLowerCase().includes(q),
    )
  }
  return result
})

// ── Interactions ───────────────────────────────────────────────────────────

function toggleQueue(name: string) {
  const s = new Set(selectedQueues.value)
  s.has(name) ? s.delete(name) : s.add(name)
  selectedQueues.value = s
}

function toggleAction(value: string) {
  const s = new Set(selectedActions.value)
  s.has(value) ? s.delete(value) : s.add(value)
  selectedActions.value = s
}

function toggleExpand(entry: LogEntry) {
  entry._expanded = !entry._expanded
}

// ── Formatting helpers ─────────────────────────────────────────────────────

function formatTs(ts: string): string {
  if (!ts) return '—'
  try {
    const d = new Date(ts)
    const hh = String(d.getUTCHours()).padStart(2, '0')
    const mm = String(d.getUTCMinutes()).padStart(2, '0')
    const ss = String(d.getUTCSeconds()).padStart(2, '0')
    const ms = String(d.getUTCMilliseconds()).padStart(3, '0')
    return `${hh}:${mm}:${ss}.${ms}`
  } catch {
    return ts
  }
}

function actionStyle(action: string): string {
  switch (action) {
    case 'Read':     return 'bg-rail-info/15   text-rail-info'
    case 'Write':    return 'bg-rail-warn/15   text-rail-warn'
    case 'Response': return 'bg-rail-ok/15     text-rail-ok'
    case 'STARTED':  return 'bg-rail-muted/60  text-rail-dim'
    default:         return 'bg-rail-card       text-rail-dim'
  }
}

function rowBg(entry: LogEntry): string {
  if (entry.action === 'Response') return 'bg-rail-ok/[0.02]'
  if (entry.action === 'STARTED')  return 'bg-rail-accent/[0.04]'
  return ''
}

function inlineSummary(entry: LogEntry): string {
  const p = entry.payload
  // Status message
  const status = p['Status'] as Record<string, unknown> | undefined
  if (status && typeof status === 'object') {
    const msg = status['Msg'] ?? ''
    const ok  = status['OK']
    if (msg) return `${ok ? '✓' : '✗'} ${msg}`
  }
  // Device settings serial
  const devSett = p['Device Settings'] as Record<string, unknown> | undefined
  if (devSett?.['Serial Number']) return `S/N: ${devSett['Serial Number']} · ${devSett['Device Name'] ?? ''}`
  // Calibration data
  if (p['CalibrationData']) return '(calibration data)'
  // Test INI
  const ini = (p['Test INI data'] ?? p['data']) as Record<string, unknown> | undefined
  if (ini?.['Execute']) return `ini: ${ini['Execute']}`
  // CH data
  const ch = p['CH1'] as Record<string, unknown> | undefined
  if (ch?.['Value (DC)'] !== undefined) return `${ch['type']} ${ch['Value (DC)']} (${ch['percent']}%)`
  // WT3k reading — key may be “'l” or similar numeric leaf
  for (const v of Object.values(p)) {
    if (typeof v === 'number') return `→ ${v}`
  }
  return ''
}

function formatPayload(entry: LogEntry): string {
  const keys = Object.keys(entry.payload)
  if (!keys.length) return '(no payload)'
  return JSON.stringify(entry.payload, null, 2)
}
</script>
