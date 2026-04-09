<template>
  <div class="h-full overflow-auto p-6">
    <div v-if="item" class="max-w-6xl mx-auto space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div class="space-y-2">
          <NuxtLink
            to="/device-config/modules-cfg"
            class="inline-flex items-center gap-2 text-[11px] font-mono text-rail-dim hover:text-rail-accent transition-colors"
          >
            <span>â†</span>
            <span>Back to Modules Cfg</span>
          </NuxtLink>

          <div>
            <h1 class="font-sans text-base font-semibold text-rail-header">{{ item.title }}</h1>
            <p class="font-mono text-xs text-rail-dim mt-0.5">{{ item.summary }}</p>
          </div>
        </div>

        <div class="flex items-center gap-2 flex-wrap justify-end">
          <span class="px-2.5 py-1 rounded border border-rail-border font-mono text-[10px] text-rail-dim uppercase">
            Hardware
          </span>
          <span class="px-2.5 py-1 rounded border border-rail-border font-mono text-[10px] text-rail-dim">
            {{ item.shortLabel }}
          </span>
        </div>
      </div>

      <div v-if="item.sourcePath" class="bg-rail-surface border border-rail-border rounded p-4">
        <div class="font-mono text-[10px] uppercase tracking-wide text-rail-dim mb-2">Source path</div>
        <div class="font-mono text-xs text-rail-accent break-all">{{ item.sourcePath }}</div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-[1.15fr,1fr] gap-6">
        <div class="bg-rail-surface border border-rail-border rounded overflow-hidden">
          <div class="px-4 py-3 bg-rail-card border-b border-rail-border">
            <div class="font-sans text-sm font-semibold text-rail-header">Configuration structure</div>
            <div class="font-mono text-[10px] text-rail-dim mt-0.5">Top-level keys and preview values</div>
          </div>

          <div class="divide-y divide-rail-border/30">
            <div
              v-for="entry in topEntries"
              :key="entry.key"
              class="px-4 py-3 grid grid-cols-[220px,1fr] gap-4 items-start"
            >
              <div class="font-mono text-[11px] text-rail-dim break-all">{{ entry.key }}</div>
              <div class="space-y-2">
                <div class="font-sans text-xs text-rail-text/90">{{ entry.preview }}</div>

                <div v-if="entry.children?.length" class="flex flex-wrap gap-1.5">
                  <span
                    v-for="child in entry.children"
                    :key="child"
                    class="px-2 py-1 rounded bg-rail-card border border-rail-border text-[10px] font-mono text-rail-text/80"
                  >
                    {{ child }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-rail-surface border border-rail-border rounded overflow-hidden">
          <div class="px-4 py-3 bg-rail-card border-b border-rail-border">
            <div class="font-sans text-sm font-semibold text-rail-header">Raw JSON</div>
            <div class="font-mono text-[10px] text-rail-dim mt-0.5">Readonly view generated from the supplied data</div>
          </div>

          <pre class="m-0 p-4 overflow-auto text-[11px] leading-5 font-mono text-rail-text/90 whitespace-pre-wrap break-words">{{ jsonText }}</pre>
        </div>
      </div>
    </div>

    <div v-else class="max-w-3xl mx-auto">
      <div class="bg-rail-surface border border-rail-border rounded p-6 space-y-3">
        <h1 class="font-sans text-base font-semibold text-rail-header">Hardware module not found</h1>
        <p class="font-mono text-xs text-rail-dim">
          No hardware module was found for id: <span class="text-rail-accent">{{ route.params.module }}</span>
        </p>
        <NuxtLink to="/device-config/modules-cfg" class="inline-flex items-center gap-2 text-xs font-mono text-rail-accent hover:underline">
          <span>â†</span>
          <span>Back to Modules Cfg</span>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { moduleCfgItems } from '~/data/modulesCfg'

const route = useRoute()

const item = computed(() => {
  const moduleId = String(route.params.module || '')
  return moduleCfgItems.hardware.find(entry => entry.id === moduleId) || null
})

const topEntries = computed(() => {
  if (!item.value) return []
  return Object.entries(item.value.config).map(([key, value]) => ({
    key,
    preview: previewValue(value),
    children: childKeys(value),
  }))
})

const jsonText = computed(() => JSON.stringify(item.value?.config ?? {}, null, 2))

function previewValue(value: unknown) {
  if (Array.isArray(value)) return `Array(${value.length})`
  if (value && typeof value === 'object') return 'Object'
  return String(value)
}

function childKeys(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return []
  return Object.keys(value as Record<string, unknown>).slice(0, 8)
}
</script>