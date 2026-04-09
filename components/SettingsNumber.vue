<!-- SettingsNumber -->
<template>
  <div class="flex items-center justify-between px-4 py-3 border-b border-rail-border/40 last:border-0 hover:bg-rail-card/30 transition-colors">
    <div>
      <div class="font-sans text-xs text-rail-text">{{ label }}</div>
      <div v-if="description" class="font-mono text-[10px] text-rail-dim mt-0.5">{{ description }}</div>
    </div>
    <input
      type="number"
      :value="modelValue"
      :min="min"
      :max="max"
      @input="$emit('update:modelValue', Number(($event.target as HTMLInputElement).value))"
      class="w-20 bg-rail-bg border border-rail-border text-rail-accent font-mono text-xs rounded px-2 py-1 text-right focus:outline-none focus:border-rail-accent"
    />
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; description?: string; modelValue: number; min?: number; max?: number }>()
defineEmits(['update:modelValue'])
</script>
