<template>
  <div class="flex items-center justify-between px-4 py-3 border-b border-rail-border/40 last:border-0 hover:bg-rail-card/30 transition-colors">
    <span class="font-sans text-xs text-rail-text">{{ label }}</span>
    <select
      :value="modelValue"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
      class="bg-rail-bg border border-rail-border text-rail-accent font-mono text-xs rounded px-2 py-1 focus:outline-none focus:border-rail-accent"
    >
      <option v-for="opt in options" :key="opt" :value="opt">{{ opt }}</option>
    </select>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; options: string[]; modelValue: string }>()
defineEmits(['update:modelValue'])
</script>
