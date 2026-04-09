<template>
  <div class="flex items-center justify-between px-4 py-3 border-b border-rail-border/40 last:border-0 hover:bg-rail-card/30 transition-colors">
    <div>
      <div class="font-sans text-xs text-rail-text">{{ label }}</div>
      <div v-if="description" class="font-mono text-[10px] text-rail-dim mt-0.5">{{ description }}</div>
    </div>
    <button
      @click="$emit('update:modelValue', !modelValue)"
      class="relative w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0"
      :class="modelValue ? 'bg-rail-accent' : 'bg-rail-muted'"
    >
      <span
        class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        :class="modelValue ? 'translate-x-5' : 'translate-x-0'"
      ></span>
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; description?: string; modelValue: boolean }>()
defineEmits(['update:modelValue'])
</script>
