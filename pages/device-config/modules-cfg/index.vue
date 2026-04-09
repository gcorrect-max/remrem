<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-6xl mx-auto space-y-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="font-sans text-base font-semibold text-rail-header">Config â€” Modules Cfg</h1>
          <p class="font-mono text-xs text-rail-dim mt-0.5">
            Module configuration pages generated from the provided Hardware and Software JSON sets.
          </p>
        </div>
        <div class="font-mono text-[10px] text-rail-dim border border-rail-border rounded px-3 py-1.5">
          {{ totalItems }} module definitions
        </div>
      </div>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-sans text-sm font-semibold text-rail-header">Hardware</h2>
            <p class="font-mono text-[10px] text-rail-dim">First row from the supplied matrix.</p>
          </div>
          <span class="font-mono text-[10px] text-rail-dim">{{ hardwareItems.length }} items</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="item in hardwareItems"
            :key="item.id"
            :to="`/device-config/modules-cfg/${item.group}/${item.id}`"
            class="bg-rail-surface border border-rail-border rounded overflow-hidden hover:border-rail-accent/60 transition-colors group"
          >
            <div class="px-4 py-3 bg-rail-card border-b border-rail-border">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="font-sans text-sm font-semibold text-rail-header group-hover:text-rail-accent transition-colors">
                    {{ item.title }}
                  </div>
                  <div class="font-mono text-[10px] text-rail-dim mt-0.5">{{ item.shortLabel }}</div>
                </div>
                <span class="inline-flex items-center px-2 py-1 rounded border border-rail-border text-[10px] font-mono text-rail-dim">
                  Hardware
                </span>
              </div>
            </div>

            <div class="p-4 space-y-3">
              <p class="font-sans text-xs text-rail-text/90 min-h-[2.5rem]">{{ item.summary }}</p>

              <div class="space-y-1">
                <div class="font-mono text-[10px] uppercase tracking-wide text-rail-dim">Top-level keys</div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="key in previewKeys(item)"
                    :key="key"
                    class="px-2 py-1 rounded bg-rail-card border border-rail-border text-[10px] font-mono text-rail-text/80"
                  >
                    {{ key }}
                  </span>
                </div>
              </div>

              <div class="font-mono text-[10px] text-rail-dim truncate" :title="item.sourcePath || 'Inline configuration data'">
                {{ item.sourcePath || 'Inline configuration data' }}
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="font-sans text-sm font-semibold text-rail-header">Software</h2>
            <p class="font-mono text-[10px] text-rail-dim">Second row from the supplied matrix.</p>
          </div>
          <span class="font-mono text-[10px] text-rail-dim">{{ softwareItems.length }} items</span>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <NuxtLink
            v-for="item in softwareItems"
            :key="item.id"
            :to="`/device-config/modules-cfg/${item.group}/${item.id}`"
            class="bg-rail-surface border border-rail-border rounded overflow-hidden hover:border-rail-accent/60 transition-colors group"
          >
            <div class="px-4 py-3 bg-rail-card border-b border-rail-border">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="font-sans text-sm font-semibold text-rail-header group-hover:text-rail-accent transition-colors">
                    {{ item.title }}
                  </div>
                  <div class="font-mono text-[10px] text-rail-dim mt-0.5">{{ item.shortLabel }}</div>
                </div>
                <span class="inline-flex items-center px-2 py-1 rounded border border-rail-border text-[10px] font-mono text-rail-dim">
                  Software
                </span>
              </div>
            </div>

            <div class="p-4 space-y-3">
              <p class="font-sans text-xs text-rail-text/90 min-h-[2.5rem]">{{ item.summary }}</p>

              <div class="space-y-1">
                <div class="font-mono text-[10px] uppercase tracking-wide text-rail-dim">Top-level keys</div>
                <div class="flex flex-wrap gap-1.5">
                  <span
                    v-for="key in previewKeys(item)"
                    :key="key"
                    class="px-2 py-1 rounded bg-rail-card border border-rail-border text-[10px] font-mono text-rail-text/80"
                  >
                    {{ key }}
                  </span>
                </div>
              </div>

              <div class="font-mono text-[10px] text-rail-dim truncate" :title="item.sourcePath || 'Inline configuration data'">
                {{ item.sourcePath || 'Inline configuration data' }}
              </div>
            </div>
          </NuxtLink>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ModuleCfgItem } from '~/data/modulesCfg'
import { moduleCfgItems } from '~/data/modulesCfg'

const hardwareItems = computed(() => moduleCfgItems.hardware)
const softwareItems = computed(() => moduleCfgItems.software)
const totalItems = computed(() => hardwareItems.value.length + softwareItems.value.length)

function previewKeys(item: ModuleCfgItem) {
  return Object.keys(item.config).slice(0, 4)
}
</script>
