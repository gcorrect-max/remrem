<template>
  <div class="h-full flex flex-col overflow-hidden">

    <!-- ── Page header + document tabs ───────────────────────────────────── -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-rail-border bg-rail-card flex-shrink-0">
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">RTO Viewer</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">Routine Test Overview · export {{ rto.updated }}</p>
      </div>
      <div class="flex items-center gap-1" role="tablist">
        <button
          v-for="t in tabs" :key="t.id" role="tab" :aria-selected="tab === t.id"
          class="px-3 py-1.5 rounded border font-mono text-[11px] transition-colors"
          :class="tab === t.id
            ? 'bg-rail-accent/10 border-rail-accent text-rail-accent'
            : 'border-rail-border text-rail-dim hover:border-rail-muted hover:text-rail-text'"
          @click="setTab(t.id)"
        >{{ t.label }}</button>
      </div>
    </div>

    <div class="flex-1 overflow-auto p-6 space-y-6">

      <!-- ══ MODELS: registry of every model column in all RTOs ═══════════ -->
      <template v-if="tab === 'models'">
        <div class="flex flex-wrap items-center gap-3">
          <label class="flex items-center gap-2 font-mono text-[10px] text-rail-dim">
            search in
            <select v-model="mqField" class="rail-input w-auto">
              <option value="all">model + article no.</option>
              <option value="model">model</option>
              <option value="art">article no.</option>
            </select>
          </label>
          <input v-model="mq" type="text" :placeholder="mqField === 'model' ? 'Model name…' : mqField === 'art' ? 'Article number, e.g. 5.6602.006…' : 'Model or article number…'" class="rail-input max-w-xs" />
          <label class="flex items-center gap-2 font-mono text-[10px] text-rail-dim">
            show
            <select v-model="dupFilter" class="rail-input w-auto">
              <option value="all">all entries</option>
              <option value="any">any duplicate</option>
              <option value="model">duplicate model name</option>
              <option value="art">duplicate article number</option>
              <option value="model-diffart">same model, different article no.</option>
              <option value="art-diffmodel">same article no., different model</option>
              <option value="unique">unique only</option>
            </select>
          </label>
          <div class="ml-auto font-mono text-[10px] text-rail-dim">
            {{ registryRows.length }} of {{ registry.length }} entries ·
            <span class="text-rail-accent">{{ dupStats.models }}</span> model names repeated ·
            <span class="text-rail-accent">{{ dupStats.arts }}</span> article numbers repeated
          </div>
        </div>
        <div class="bg-rail-card border border-rail-border rounded overflow-auto max-h-[calc(100vh-14rem)]">
          <table class="w-full font-mono text-[11px] border-separate border-spacing-0">
            <thead>
              <tr class="text-left text-[10px] uppercase tracking-wider">
                <th v-for="c in regCols" :key="c.key"
                    class="sticky top-0 z-10 bg-rail-card border-b border-rail-border px-3 py-2 font-normal cursor-pointer select-none hover:text-rail-header"
                    :class="regSort.key === c.key ? 'text-rail-accent' : 'text-rail-dim'"
                    :aria-sort="regSort.key === c.key ? (regSort.dir > 0 ? 'ascending' : 'descending') : 'none'"
                    @click="sortBy(c.key)">
                  {{ c.label }} <span>{{ regSort.key === c.key ? (regSort.dir > 0 ? '▲' : '▼') : '' }}</span>
                </th>
                <th class="sticky top-0 z-10 bg-rail-card border-b border-rail-border px-3 py-2 font-normal text-rail-dim">Duplicates</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in registryRows" :key="r.id" class="cursor-pointer hover:bg-rail-muted/40" @click="openModel(r)">
                <td class="border-b border-rail-border/40 px-3 py-1 text-rail-text break-all" :class="r.dupModel.length ? 'text-rail-accent' : ''">{{ r.model }}</td>
                <td class="border-b border-rail-border/40 px-3 py-1 whitespace-nowrap" :class="r.dupArt.length ? 'text-rail-accent' : 'text-rail-text'">{{ r.arts.join(', ') || '—' }}</td>
                <td class="border-b border-rail-border/40 px-3 py-1 whitespace-nowrap text-rail-info">{{ r.doc }} <span class="text-rail-dim">{{ r.rev }} · #{{ r.pos }}</span></td>
                <td class="border-b border-rail-border/40 px-3 py-1 text-[10px] text-rail-dim">
                  <div v-if="r.dupModel.length">model also in: {{ dupRef(r.dupModel) }}</div>
                  <div v-if="r.dupArt.length">article no. also in: {{ dupRef(r.dupArt) }}</div>
                </td>
              </tr>
              <tr v-if="!registryRows.length"><td colspan="4" class="px-3 py-6 text-rail-dim">No entries match.</td></tr>
            </tbody>
          </table>
        </div>
      </template>

      <!-- ══ OVERVIEW: three documents side by side ═══════════════════════ -->
      <template v-else-if="tab === 'all'">
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <button
            v-for="d in docs" :key="d.id"
            class="text-left bg-rail-card border border-rail-border rounded p-4 hover:border-rail-accent transition-colors"
            @click="setTab(d.id)"
          >
            <div class="flex items-baseline justify-between">
              <span class="font-mono text-xs text-rail-header font-bold">{{ d.name }}</span>
              <span class="font-mono text-[10px] text-rail-info">rev {{ d.revision }}</span>
            </div>
            <div class="font-mono text-[10px] text-rail-dim mt-1">
              {{ releasedLabel(d) }}<template v-if="d.releaser"> · {{ d.releaser }}</template>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-4">
              <div v-for="k in [['models', d.models.length], ['steps', d.steps.length], ['revisions', d.history.length]]" :key="k[0]">
                <div class="font-mono text-2xl text-rail-header leading-none">{{ k[1] }}</div>
                <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider mt-1">{{ k[0] }}</div>
              </div>
            </div>
            <!-- mini coverage strip: share of models executing each step -->
            <div class="flex items-end gap-px h-8 mt-4" aria-hidden="true">
              <div v-for="(s, i) in d.steps" :key="i" class="flex-1 bg-rail-info/70 rounded-t-sm"
                   :style="{ height: Math.max(8, coverage(s, d).run / d.models.length * 100) + '%' }"></div>
            </div>
            <div class="font-mono text-[9px] text-rail-dim mt-1">models executing each step (left → right = document order)</div>
          </button>
        </div>

        <!-- Revision timeline, one lane per document -->
        <section class="bg-rail-card border border-rail-border rounded p-4">
          <h2 class="font-sans text-xs font-semibold text-rail-header mb-1">Revision timeline</h2>
          <p class="font-mono text-[10px] text-rail-dim mb-3">One dot per revision · hover for the change note</p>
          <div class="relative">
            <svg :viewBox="`0 0 ${tl.w} ${tl.h}`" class="w-full" role="img" aria-label="Revision timeline of the three RTO documents">
              <g v-for="y in tl.years" :key="y.label">
                <line :x1="y.x" :x2="y.x" y1="8" :y2="tl.h - 22" stroke="#252c3a" stroke-width="1" />
                <text :x="y.x + 4" :y="tl.h - 8" fill="#6b7794" font-size="10" font-family="IBM Plex Mono, monospace">{{ y.label }}</text>
              </g>
              <g v-for="(lane, li) in tl.lanes" :key="lane.id">
                <text x="0" :y="lane.y - 10" fill="#c8d0e0" font-size="10" font-family="IBM Plex Mono, monospace">{{ lane.id }}</text>
                <line :x1="tl.pad" :x2="tl.w - 8" :y1="lane.y" :y2="lane.y" stroke="#2e3748" stroke-width="1" />
                <circle
                  v-for="p in lane.points" :key="p.rev" :cx="p.x" :cy="lane.y" r="5"
                  :fill="laneColors[li]" stroke="#1a1f2b" stroke-width="2" class="cursor-pointer"
                  @mouseenter="tip = { doc: lane.id, ...p.h }" @mouseleave="tip = null"
                  @click="openHistory(lane.id, p.h.rev)"
                />
              </g>
            </svg>
          </div>
          <div class="min-h-[3rem] mt-2 font-mono text-[11px] text-rail-text">
            <template v-if="tip">
              <span class="text-rail-accent">{{ tip.doc }} {{ tip.rev }}</span>
              · {{ tip.date }} · {{ tip.author }}
              <div class="text-rail-dim whitespace-pre-wrap mt-0.5">{{ tip.text }}</div>
            </template>
            <span v-else class="text-rail-dim">Hover a dot.</span>
          </div>
        </section>

        <!-- Steps present across documents -->
        <section class="bg-rail-card border border-rail-border rounded p-4">
          <h2 class="font-sans text-xs font-semibold text-rail-header mb-3">Same tests across documents</h2>
          <div class="overflow-auto">
            <table class="font-mono text-[11px]">
              <thead>
                <tr class="text-rail-dim text-[10px] uppercase tracking-wider text-left">
                  <th class="pr-6 pb-2 font-normal">Test step (by name)</th>
                  <th v-for="d in docs" :key="d.id" class="pr-6 pb-2 font-normal">{{ d.id }} · models executing</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in crossRows" :key="row.key" class="border-t border-rail-border/60">
                  <td class="pr-6 py-1 text-rail-text">{{ row.label }}</td>
                  <td v-for="c in row.cells" :key="c.id" class="pr-6 py-1 w-56">
                    <div v-if="c.total" class="flex items-center gap-2">
                      <div class="h-1.5 w-32 bg-rail-muted rounded-sm overflow-hidden">
                        <div class="h-full bg-rail-info" :style="{ width: c.run / c.total * 100 + '%' }"></div>
                      </div>
                      <span class="text-rail-dim">{{ c.run }}/{{ c.total }}</span>
                    </div>
                    <span v-else class="text-rail-dim/50">— not in document</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>

      <!-- ══ SINGLE DOCUMENT ══════════════════════════════════════════════ -->
      <template v-else-if="doc">

        <!-- KPI row -->
        <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div v-for="k in kpis" :key="k.label" class="bg-rail-card border border-rail-border rounded px-4 py-3">
            <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">{{ k.label }}</div>
            <div class="font-mono text-lg text-rail-header mt-0.5 truncate" :title="k.value">{{ k.value }}</div>
            <div v-if="k.sub" class="font-mono text-[10px] text-rail-dim truncate">{{ k.sub }}</div>
          </div>
        </div>

        <!-- View switch + filters -->
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex gap-1">
            <button v-for="v in views" :key="v.id"
              class="px-3 py-1.5 rounded border font-mono text-[10px] transition-colors"
              :class="view === v.id ? 'bg-rail-accent/10 border-rail-accent text-rail-accent' : 'border-rail-border text-rail-dim hover:text-rail-text'"
              @click="view = v.id">{{ v.label }}</button>
          </div>
          <input v-model="q" type="text" :placeholder="view === 'history' ? 'Search history…' : 'Filter steps or models…'" class="rail-input max-w-xs" />
          <label v-if="view === 'matrix'" class="flex items-center gap-2 font-mono text-[10px] text-rail-dim">
            sort models by
            <select v-model="colSort" class="rail-input w-auto">
              <option value="doc">document order</option>
              <option value="model">model</option>
              <option value="art">article number</option>
            </select>
          </label>
          <label v-if="view === 'matrix'" class="flex items-center gap-2 font-mono text-[10px] text-rail-dim cursor-pointer select-none">
            <input v-model="onlyDiff" type="checkbox" class="accent-amber-500" />
            only steps that differ between models
          </label>
          <!-- legend -->
          <div v-if="view === 'matrix'" class="flex items-center gap-4 ml-auto font-mono text-[10px] text-rail-dim">
            <span><span class="cell-run inline-block w-3 h-3 align-middle mr-1 rounded-sm"></span>executed</span>
            <span><span class="cell-param inline-block w-3 h-3 align-middle mr-1 rounded-sm"></span>executed with parameters</span>
            <span><span class="cell-none inline-block w-3 h-3 align-middle mr-1 rounded-sm"></span>not executed</span>
            <span v-if="dupCols.size">⧉ duplicate model / article no.</span>
          </div>
        </div>

        <!-- ── Matrix ─────────────────────────────────────────────────── -->
        <div v-if="view === 'matrix'" class="flex gap-4 items-start">
          <div class="flex-1 min-w-0 bg-rail-card border border-rail-border rounded overflow-auto max-h-[calc(100vh-22rem)]">
            <table class="border-separate border-spacing-0 font-mono text-[11px]">
              <thead>
                <tr>
                  <th class="sticky top-0 left-0 z-30 bg-rail-card border-b border-rail-border px-3 text-left align-bottom pb-2 min-w-[17rem] text-rail-dim text-[10px] font-normal uppercase tracking-wider">
                    Step ↓ / Model →
                  </th>
                  <th class="sticky top-0 z-20 bg-rail-card border-b border-rail-border px-2 align-bottom pb-2 text-rail-dim text-[10px] font-normal uppercase tracking-wider">Cov.</th>
                  <th v-for="mi in colOrder" :key="mi"
                      class="sticky top-0 z-20 bg-rail-card border-b border-rail-border p-0 align-bottom cursor-pointer"
                      :class="selModel === mi ? 'text-rail-accent' : hoverCol === mi ? 'text-rail-header' : 'text-rail-dim'"
                      @click="pickModel(mi)" @mouseenter="hoverCol = mi" @mouseleave="hoverCol = -1">
                    <div class="w-[22px] h-72 pb-2 flex justify-start items-end">
                      <span class="vtext whitespace-nowrap text-[10px]">{{ dupCols.has(mi) ? '⧉ ' : '' }}{{ modelLabel(doc.models[mi]) }}</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in visibleSteps" :key="s.i" :class="selStep === s.i ? 'bg-rail-accent/10' : ''">
                  <td class="sticky left-0 z-10 px-3 py-0.5 border-b border-rail-border/40 cursor-pointer whitespace-nowrap"
                      :class="[selStep === s.i ? 'bg-[#2a2515] text-rail-accent' : hoverRow === s.i ? 'bg-rail-muted text-rail-header' : 'bg-rail-card text-rail-text']"
                      :style="{ paddingLeft: 12 + s.depth * 12 + 'px' }"
                      @click="pickStep(s.i)" @mouseenter="hoverRow = s.i" @mouseleave="hoverRow = -1">
                    <span class="text-rail-dim mr-2">{{ s.step.id }}</span>{{ s.step.label }}
                  </td>
                  <td class="border-b border-rail-border/40 px-2 text-rail-dim text-[10px] bg-rail-card">
                    {{ s.cov.run }}/{{ doc.models.length }}
                  </td>
                  <td v-for="mi in colOrder" :key="mi"
                      class="border-b border-rail-border/40 p-[1px]"
                      @mouseenter="hover = { s: s.i, m: mi }; hoverRow = s.i; hoverCol = mi"
                      @mouseleave="hover = null; hoverRow = -1; hoverCol = -1"
                      @click="pick(s.i, mi)">
                    <div class="w-5 h-5 rounded-sm flex items-center justify-center text-[10px] cursor-pointer"
                         :class="[cellClass(s.step.values[mi]), (hoverRow === s.i || hoverCol === mi) ? 'ring-1 ring-rail-header/40' : '', selModel === mi ? 'outline outline-1 outline-rail-accent/50' : '']">
                      {{ kind(s.step.values[mi]) === 'run' ? '●' : kind(s.step.values[mi]) === 'param' ? '◆' : '' }}
                    </div>
                  </td>
                </tr>
                <tr v-if="!visibleSteps.length">
                  <td colspan="99" class="px-3 py-6 text-rail-dim">No steps match.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Detail panel -->
          <aside class="w-80 flex-shrink-0 bg-rail-card border border-rail-border rounded p-4 max-h-[calc(100vh-22rem)] overflow-auto">
            <template v-if="hover">
              <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Hover</div>
              <div class="font-mono text-[11px] text-rail-header mt-1">{{ doc.steps[hover.s].id }} {{ doc.steps[hover.s].label }}</div>
              <div class="font-mono text-[10px] text-rail-dim mt-0.5 break-all">{{ modelLabel(doc.models[hover.m]) }}</div>
              <div class="font-mono text-[11px] mt-2 whitespace-pre-wrap break-words" :class="kind(hoverValue) === 'none' ? 'text-rail-dim' : 'text-rail-text'">
                {{ valueText(hoverValue) }}
              </div>
              <hr class="border-rail-border my-3" />
            </template>

            <!-- selected step: distinct values → models -->
            <template v-if="selStep !== null">
              <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Step · click a row label</div>
              <div class="font-sans text-xs text-rail-header font-semibold mt-1">{{ doc.steps[selStep].id }} {{ doc.steps[selStep].label }}</div>
              <div class="space-y-3 mt-3">
                <div v-for="g in stepGroups" :key="g.value">
                  <div class="flex items-start gap-2">
                    <span class="w-3 h-3 rounded-sm mt-0.5 flex-shrink-0" :class="cellClass(g.value)"></span>
                    <div class="font-mono text-[11px] whitespace-pre-wrap break-words min-w-0" :class="kind(g.value) === 'none' ? 'text-rail-dim' : 'text-rail-text'">
                      {{ valueText(g.value) }}
                    </div>
                    <span class="ml-auto font-mono text-[10px] text-rail-dim flex-shrink-0">×{{ g.models.length }}</span>
                  </div>
                  <ul class="mt-1 ml-5 font-mono text-[10px] text-rail-dim space-y-0.5">
                    <li v-for="mi in g.models" :key="mi" class="break-all cursor-pointer hover:text-rail-accent" @click="pickModel(mi)">{{ modelLabel(doc.models[mi]) }}</li>
                  </ul>
                </div>
              </div>
            </template>

            <!-- selected model: its parameters -->
            <template v-else-if="selModel !== null">
              <div class="font-mono text-[9px] text-rail-dim uppercase tracking-wider">Model · click a column</div>
              <div class="font-sans text-xs text-rail-header font-semibold mt-1 break-all">{{ doc.models[selModel].name }}</div>
              <div class="font-mono text-[10px] text-rail-dim mt-0.5">
                {{ doc.models[selModel].art.join(', ') || 'no article number' }}
                <template v-if="doc.models[selModel].accuracyClass"> · class {{ doc.models[selModel].accuracyClass }}</template>
              </div>
              <div class="font-mono text-[10px] text-rail-dim mt-2">
                {{ modelStats.run }} steps executed · {{ modelStats.param }} with parameters · {{ modelStats.none }} skipped
              </div>
              <dl class="mt-3 space-y-2">
                <div v-for="p in modelParams" :key="p.i">
                  <dt class="font-mono text-[10px] text-rail-dim">{{ p.id }} {{ p.label }}</dt>
                  <dd class="font-mono text-[11px] text-rail-text whitespace-pre-wrap break-words">{{ p.value }}</dd>
                </div>
              </dl>
            </template>

            <p v-else-if="!hover" class="font-mono text-[11px] text-rail-dim">
              Hover a cell to read its value. Click a step name to see which models share which parameters, or a model name to list its parameters.
            </p>
          </aside>
        </div>

        <!-- ── Coverage ───────────────────────────────────────────────── -->
        <div v-else-if="view === 'coverage'" class="bg-rail-card border border-rail-border rounded p-4">
          <p class="font-mono text-[10px] text-rail-dim mb-3">
            How many of the {{ doc.models.length }} models run each step. Steps that every model runs are the common core;
            shorter bars mark variant-specific tests.
          </p>
          <div class="space-y-1">
            <div v-for="s in visibleSteps" :key="s.i" class="flex items-center gap-3 font-mono text-[11px]">
              <div class="w-72 flex-shrink-0 truncate text-rail-text" :style="{ paddingLeft: s.depth * 12 + 'px' }" :title="s.step.label">
                <span class="text-rail-dim mr-2">{{ s.step.id }}</span>{{ s.step.label }}
              </div>
              <div class="flex-1 h-3 flex gap-px bg-rail-muted/40 rounded-sm overflow-hidden max-w-xl">
                <div class="h-full cell-run" :style="{ width: (s.cov.run - s.cov.param) / doc.models.length * 100 + '%' }"></div>
                <div class="h-full cell-param" :style="{ width: s.cov.param / doc.models.length * 100 + '%' }"></div>
              </div>
              <div class="w-14 text-right text-rail-dim">{{ s.cov.run }}/{{ doc.models.length }}</div>
            </div>
          </div>
        </div>

        <!-- ── History ────────────────────────────────────────────────── -->
        <div v-else class="grid grid-cols-1 xl:grid-cols-[1fr_18rem] gap-4 items-start">
          <ol class="bg-rail-card border border-rail-border rounded divide-y divide-rail-border/60">
            <li v-for="h in historyRows" :key="h.rev" :id="`rev-${h.rev}`" class="px-4 py-3 flex gap-4"
                :class="flashRev === h.rev ? 'bg-rail-accent/10' : ''">
              <div class="w-14 flex-shrink-0">
                <div class="font-mono text-xs text-rail-accent font-bold">{{ h.rev }}</div>
                <div class="font-mono text-[10px] text-rail-dim">{{ h.date ?? '—' }}</div>
              </div>
              <div class="min-w-0">
                <div class="font-mono text-[10px] text-rail-info">{{ h.author }}</div>
                <div class="font-mono text-[11px] text-rail-text whitespace-pre-wrap break-words mt-0.5">{{ h.text }}</div>
              </div>
            </li>
            <li v-if="!historyRows.length" class="px-4 py-6 font-mono text-[11px] text-rail-dim">No revisions match.</li>
          </ol>
          <aside class="bg-rail-card border border-rail-border rounded p-4">
            <h2 class="font-sans text-xs font-semibold text-rail-header mb-3">Revisions by author</h2>
            <div v-for="a in authorCounts" :key="a.name" class="mb-2">
              <div class="flex justify-between font-mono text-[10px] text-rail-text">
                <span class="truncate pr-2">{{ a.name }}</span><span class="text-rail-dim">{{ a.n }}</span>
              </div>
              <div class="h-1.5 bg-rail-muted/50 rounded-sm mt-1"><div class="h-full bg-rail-info rounded-sm" :style="{ width: a.n / authorCounts[0].n * 100 + '%' }"></div></div>
            </div>
          </aside>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import rtoData from '~/data/rto.json'

interface Model { name: string; art: string[]; accuracyClass: string | null }
interface Step  { id: string; label: string; values: string[] }
interface Hist  { rev: string; author: string; date: string | null; text: string }
interface Doc   { id: string; name: string; revision: string; releaser: string | null; released: string | null; file: string; models: Model[]; steps: Step[]; history: Hist[] }

const rto  = rtoData as { updated: string; documents: Doc[] }
const docs = rto.documents
const laneColors = ['#38bdf8', '#f59e0b', '#22c55e']

// ── value semantics ("1" = run, "0"/""/"-" = skipped, anything else = run with parameters)
type Kind = 'run' | 'param' | 'none'
const kind = (v: string): Kind => (v === '1' ? 'run' : v === '' || v === '0' || v === '-' ? 'none' : 'param')
const cellClass = (v: string) => `cell-${kind(v)}`
const valueText = (v: string) => (kind(v) === 'run' ? 'executed (no parameters)' : kind(v) === 'none' ? 'not executed' : v)
const modelLabel = (m: Model) => (m.art.length ? `${m.name} · ${m.art[0]}` : m.name)

function coverage(s: Step, d: Doc) {
  let run = 0, param = 0
  for (const v of s.values) { const k = kind(v); if (k !== 'none') run++; if (k === 'param') param++ }
  return { run, param }
}
const releasedLabel = (d: Doc) =>
  d.released ? `released ${d.released}` : d.history.length ? `last change ${d.history[d.history.length - 1].date} (release date not set)` : ''

// ── tabs / state
const tabs = [{ id: 'all', label: 'Overview' }, { id: 'models', label: 'Models' }, ...docs.map(d => ({ id: d.id, label: `${d.name} · ${d.revision}` }))]
const route = useRoute()
const tab = ref<string>(tabs.some(t => t.id === route.query.doc) ? String(route.query.doc) : 'all')
const doc = computed(() => docs.find(d => d.id === tab.value) ?? null)
const views = [{ id: 'matrix', label: 'Matrix' }, { id: 'coverage', label: 'Coverage' }, { id: 'history', label: 'History' }]
const view = ref('matrix')
const q = ref('')
const onlyDiff = ref(false)
const selStep = ref<number | null>(null)
const selModel = ref<number | null>(null)
const hover = ref<{ s: number; m: number } | null>(null)
const hoverRow = ref(-1)
const hoverCol = ref(-1)
const flashRev = ref('')
const tip = ref<any>(null)
const colSort = ref<'doc' | 'model' | 'art'>('doc')

function setTab(id: string) {
  tab.value = id
  q.value = ''; colSort.value = 'doc'; selStep.value = null; selModel.value = null; hover.value = null
  navigateTo({ query: id === 'all' ? {} : { doc: id } }, { replace: true })
}
watch(() => route.query.doc, v => { const id = v ? String(v) : 'all'; if (id !== tab.value && tabs.some(t => t.id === id)) tab.value = id })
const pickStep = (i: number) => { selStep.value = selStep.value === i ? null : i; selModel.value = null }
const pickModel = (i: number) => { selModel.value = selModel.value === i && selStep.value === null ? null : i; selStep.value = null }
const pick = (s: number, m: number) => { selStep.value = s; selModel.value = null; void m }
async function openHistory(id: string, rev: string) {
  setTab(id); view.value = 'history'; flashRev.value = rev
  await nextTick()
  document.getElementById(`rev-${rev}`)?.scrollIntoView({ block: 'center' })
}

// ── registry: every model column of every RTO, with duplicate detection
const cmp = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
const keyOf = (s: string) => s.replace(/\s+/g, '').toUpperCase()
interface Row { id: string; doc: string; rev: string; pos: number; di: number; mi: number; model: string; arts: string[]; dupModel: Row[]; dupArt: Row[] }
const registry: Row[] = docs.flatMap((d, di) => d.models.map((m, mi) => ({
  id: `${d.id}-${mi}`, doc: d.id, rev: d.revision, pos: mi + 1, di, mi, model: m.name, arts: m.art, dupModel: [], dupArt: [],
})))
{
  const byModel = new Map<string, Row[]>(), byArt = new Map<string, Row[]>()
  for (const r of registry) {
    byModel.set(keyOf(r.model), [...(byModel.get(keyOf(r.model)) ?? []), r])
    for (const a of new Set(r.arts.map(keyOf))) byArt.set(a, [...(byArt.get(a) ?? []), r])
  }
  for (const r of registry) {
    r.dupModel = byModel.get(keyOf(r.model))!.filter(x => x !== r)
    r.dupArt = [...new Set(r.arts.map(keyOf))].flatMap(a => byArt.get(a)!.filter(x => x !== r))
      .filter((x, i, arr) => arr.indexOf(x) === i)
  }
}
const dupStats = {
  models: new Set(registry.filter(r => r.dupModel.length).map(r => keyOf(r.model))).size,
  arts: new Set(registry.flatMap(r => (r.dupArt.length ? r.arts.map(keyOf) : []))).size,
}
const dupRef = (rs: Row[]) => rs.map(x => `${x.doc} #${x.pos}`).join(', ')
const mq = ref('')
const mqField = ref<'all' | 'model' | 'art'>('all')
const dupFilter = ref('all')
const regCols = [{ key: 'model', label: 'Model' }, { key: 'art', label: 'Article no.' }, { key: 'doc', label: 'RTO' }]
const regSort = ref<{ key: string; dir: 1 | -1 }>({ key: 'model', dir: 1 })
const sortBy = (key: string) => { regSort.value = { key, dir: regSort.value.key === key ? (-regSort.value.dir as 1 | -1) : 1 } }
const sameArtSet = (a: Row, b: Row) => keyOf(a.arts.join()) === keyOf(b.arts.join())
const registryRows = computed(() => {
  const needle = mq.value.trim().toLowerCase()
  const f = dupFilter.value
  const rows = registry.filter(r => {
    if (needle) {
      const hay = mqField.value === 'model' ? r.model : mqField.value === 'art' ? r.arts.join(' ') : `${r.model} ${r.arts.join(' ')} ${r.doc}`
      if (!hay.toLowerCase().includes(needle)) return false
    }
    switch (f) {
      case 'any': return r.dupModel.length || r.dupArt.length
      case 'model': return r.dupModel.length
      case 'art': return r.dupArt.length
      case 'model-diffart': return r.dupModel.some(x => !sameArtSet(x, r))
      case 'art-diffmodel': return r.dupArt.some(x => keyOf(x.model) !== keyOf(r.model))
      case 'unique': return !r.dupModel.length && !r.dupArt.length
      default: return true
    }
  })
  const { key, dir } = regSort.value
  const primary = (r: Row) => (key === 'art' ? r.arts.join(', ') : key === 'doc' ? r.doc : r.model)
  return rows.sort((a, b) => dir * cmp(primary(a), primary(b)) || cmp(a.model, b.model) || cmp(a.arts.join(), b.arts.join()) || a.di - b.di || a.pos - b.pos)
})
async function openModel(r: Row) {
  setTab(r.doc); view.value = 'matrix'; selModel.value = r.mi
}

// ── document view
const kpis = computed(() => {
  const d = doc.value!
  const last = d.history[d.history.length - 1]
  const core = d.steps.filter(s => coverage(s, d).run === d.models.length).length
  return [
    { label: 'Revision', value: d.revision, sub: d.file },
    { label: 'Released', value: d.released ?? '—', sub: d.releaser ?? (d.released ? '' : 'not set in file') },
    { label: 'Models', value: String(d.models.length), sub: `${new Set(d.models.map(m => m.name)).size} distinct names` },
    { label: 'Steps', value: String(d.steps.length), sub: `${core} run by every model` },
    { label: 'Revisions', value: String(d.history.length), sub: last ? `last ${last.rev} · ${last.date ?? ''}` : '' },
  ]
})

const visibleSteps = computed(() => {
  const d = doc.value!
  const needle = q.value.trim().toLowerCase()
  const modelHits = needle ? d.models.map(m => modelLabel(m).toLowerCase().includes(needle)) : []
  return d.steps
    .map((step, i) => ({ step, i, cov: coverage(step, d), depth: Math.max(0, step.id.split('.').length - 2) }))
    .filter(r => {
      if (onlyDiff.value && view.value === 'matrix' && new Set(r.step.values).size < 2) return false
      if (!needle) return true
      return `${r.step.id} ${r.step.label}`.toLowerCase().includes(needle)
        || r.step.values.some((v, mi) => modelHits[mi] && kind(v) !== 'none')
    })
})

const colOrder = computed(() => {
  const d = doc.value!
  const idx = d.models.map((_, i) => i)
  if (colSort.value === 'model') idx.sort((a, b) => cmp(d.models[a].name, d.models[b].name) || cmp(d.models[a].art.join(), d.models[b].art.join()) || a - b)
  if (colSort.value === 'art') idx.sort((a, b) => cmp(d.models[a].art.join(', '), d.models[b].art.join(', ')) || cmp(d.models[a].name, d.models[b].name) || a - b)
  return idx
})
const dupCols = computed(() => new Set(registry.filter(r => r.doc === tab.value && (r.dupModel.length || r.dupArt.length)).map(r => r.mi)))

const hoverValue = computed(() => (hover.value ? doc.value!.steps[hover.value.s].values[hover.value.m] : ''))

const stepGroups = computed(() => {
  const s = doc.value!.steps[selStep.value!]
  const g = new Map<string, number[]>()
  s.values.forEach((v, mi) => g.set(v, [...(g.get(v) ?? []), mi]))
  return [...g].map(([value, models]) => ({ value, models })).sort((a, b) => b.models.length - a.models.length)
})
const modelParams = computed(() =>
  doc.value!.steps.map((s, i) => ({ i, id: s.id, label: s.label, value: s.values[selModel.value!] })).filter(p => kind(p.value) === 'param'))
const modelStats = computed(() => {
  const vals = doc.value!.steps.map(s => kind(s.values[selModel.value!]))
  return { run: vals.filter(k => k === 'run').length, param: vals.filter(k => k === 'param').length, none: vals.filter(k => k === 'none').length }
})

const historyRows = computed(() => {
  const needle = q.value.trim().toLowerCase()
  return [...doc.value!.history].reverse()
    .filter(h => !needle || `${h.rev} ${h.author} ${h.text}`.toLowerCase().includes(needle))
})
const authorCounts = computed(() => {
  const c = new Map<string, number>()
  for (const h of doc.value!.history)
    for (const a of h.author.split(/[\/,]/).map(x => x.replace(/\s+/g, ' ').replace(/^(\w)\.(\w)/, '$1. $2').trim()).filter(Boolean)) c.set(a, (c.get(a) ?? 0) + 1)
  return [...c].map(([name, n]) => ({ name, n })).sort((a, b) => b.n - a.n)
})

// ── overview: revision timeline
const tl = computed(() => {
  const w = 1000, pad = 40, laneH = 56
  const all = docs.flatMap(d => d.history.filter(h => h.date).map(h => +new Date(h.date!)))
  const lo = Math.min(...all), hi = Math.max(...all)
  const x = (t: number) => pad + ((t - lo) / (hi - lo || 1)) * (w - pad - 16)
  const years: { label: string; x: number }[] = []
  for (let y = new Date(lo).getFullYear() + 1; y <= new Date(hi).getFullYear(); y++) years.push({ label: String(y), x: x(+new Date(`${y}-01-01`)) })
  return {
    w, pad, h: docs.length * laneH + 28, years,
    lanes: docs.map((d, i) => ({
      id: d.id, y: 24 + i * laneH + 12,
      points: d.history.filter(h => h.date).map(h => ({ rev: h.rev, x: x(+new Date(h.date!)), h })),
    })),
  }
})

// ── overview: steps compared by name across documents
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\b(tests?)\b/g, '').replace(/\s+/g, ' ').trim()
const crossRows = computed(() => {
  const rows = new Map<string, { key: string; label: string; cells: { id: string; run: number; total: number }[] }>()
  docs.forEach((d, di) => {
    for (const s of d.steps) {
      const key = norm(s.label)
      if (!key || /^\d+$/.test(key)) continue
      const r = rows.get(key) ?? { key, label: s.label, cells: docs.map(x => ({ id: x.id, run: 0, total: 0 })) }
      if (!r.cells[di].total) r.cells[di] = { id: d.id, run: coverage(s, d).run, total: d.models.length }
      rows.set(key, r)
    }
  })
  return [...rows.values()].filter(r => r.cells.filter(c => c.total).length > 1)
})
</script>

<style scoped>
.rail-input {
  @apply w-full bg-rail-bg border border-rail-border rounded px-2.5 py-1.5
         font-mono text-[11px] text-rail-text placeholder-rail-dim/50
         focus:outline-none focus:border-rail-accent transition-colors;
}
.vtext { writing-mode: vertical-rl; transform: rotate(180deg); }
.cell-run   { background: rgba(56, 189, 248, 0.28); color: #38bdf8; }
.cell-param { background: rgba(245, 158, 11, 0.32); color: #f59e0b; }
.cell-none  { background: rgba(46, 55, 72, 0.35);  color: transparent; }
</style>
