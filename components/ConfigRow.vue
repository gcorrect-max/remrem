<template>
  <div class="flex items-center justify-between px-3 py-1.5 border-b border-rail-border/30 last:border-0 hover:bg-rail-card/30 transition-colors">
    <span class="font-mono text-[10px] text-rail-dim">{{ label }}</span>
    <div class="flex items-center gap-1.5">
      <span
        v-if="status"
        class="inline-block w-1.5 h-1.5 rounded-full"
        :class="{
          'bg-rail-ok':   status === 'ok',
          'bg-rail-fail': status === 'fail',
          'bg-rail-warn': status === 'warn',
        }"
      ></span>
      <span
        class="text-[10px]"
        :class="[
          mono ? 'font-mono text-rail-accent' : 'font-sans text-rail-text',
          status === 'ok'   ? 'text-rail-ok'   : '',
          status === 'fail' ? 'text-rail-fail'  : '',
          status === 'warn' ? 'text-rail-warn'  : '',
        ]"
      >{{ value }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string
  value: string
  mono?: boolean
  status?: 'ok' | 'fail' | 'warn' | ''
}>()
</script>
