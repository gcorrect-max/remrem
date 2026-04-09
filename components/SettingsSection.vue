<template>
  <div class="bg-rail-surface border border-rail-border rounded overflow-hidden">
    <div class="flex items-center gap-2 px-4 py-2.5 bg-rail-card border-b border-rail-border">
      <span class="text-sm leading-none">{{ icon }}</span>
      <span class="font-sans text-xs font-semibold text-rail-header">{{ title }}</span>
    </div>
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; icon?: string }>()
</script>
