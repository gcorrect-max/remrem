<template>
  <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <!-- Main device thumbnail -->
    <template v-if="drawingId === 'main'">
      <rect x="5" y="8" width="70" height="44" rx="2" fill="#1a1f2b" stroke="#252c3a" stroke-width="1"/>
      <rect x="8" y="11" width="64" height="10" rx="1" fill="#0d0f14" stroke="#252c3a"/>
      <text x="15" y="19" font-family="monospace" font-size="5" font-weight="bold" fill="#f59e0b">HASLER</text>
      <circle cx="65" cy="16" r="2" fill="#22c55e"/>
      <rect x="8" y="24" width="20" height="14" rx="1" fill="#0a2218"/>
      <rect x="30" y="24" width="42" height="28" rx="1" fill="#0d0f14" stroke="#2e3748"/>
      <circle cx="38" cy="32" r="4" fill="#252c3a" stroke="#2e3748"/>
      <circle cx="50" cy="32" r="4" fill="#252c3a" stroke="#2e3748"/>
      <rect x="60" y="28" width="8" height="6" rx="1" fill="#252c3a"/>
      <rect x="60" y="36" width="8" height="6" rx="1" fill="#252c3a"/>
      <rect x="8" y="41" width="64" height="8" rx="1" fill="#0d0f14" stroke="#252c3a"/>
    </template>

    <!-- Cable01 thumbnail -->
    <template v-else-if="drawingId === 'cable01'">
      <rect x="4" y="15" width="22" height="30" rx="2" fill="#1a1f2b" stroke="#252c3a"/>
      <text x="15" y="28" font-family="monospace" font-size="4" fill="#6b7794" text-anchor="middle">PSU</text>
      <circle cx="15" cy="35" r="4" fill="#252c3a" stroke="#f59e0b" stroke-width="0.8"/>
      <line x1="26" y1="32" x2="54" y2="32" stroke="#f59e0b" stroke-width="1.5"/>
      <line x1="26" y1="38" x2="54" y2="38" stroke="#6b7794" stroke-width="1.5"/>
      <rect x="54" y="15" width="22" height="30" rx="2" fill="#1a1f2b" stroke="#252c3a"/>
      <text x="65" y="28" font-family="monospace" font-size="4" fill="#6b7794" text-anchor="middle">DUT</text>
      <circle cx="65" cy="35" r="4" fill="#252c3a" stroke="#f59e0b" stroke-width="0.8"/>
      <text x="40" y="26" font-family="monospace" font-size="4" fill="#f59e0b" text-anchor="middle">+24V</text>
    </template>

    <!-- Cable02 thumbnail -->
    <template v-else-if="drawingId === 'cable02'">
      <rect x="4" y="20" width="18" height="20" rx="2" fill="#1a1f2b" stroke="#252c3a"/>
      <text x="13" y="32" font-family="monospace" font-size="4" fill="#6b7794" text-anchor="middle">PC</text>
      <line x1="22" y1="27" x2="58" y2="27" stroke="#22c55e" stroke-width="1" stroke-dasharray="3,2"/>
      <line x1="22" y1="33" x2="58" y2="33" stroke="#ef4444" stroke-width="1" stroke-dasharray="3,2"/>
      <rect x="58" y="20" width="18" height="20" rx="2" fill="#1a1f2b" stroke="#252c3a"/>
      <text x="67" y="32" font-family="monospace" font-size="4" fill="#6b7794" text-anchor="middle">SER</text>
      <text x="40" y="22" font-family="monospace" font-size="4" fill="#22c55e" text-anchor="middle">RS232</text>
    </template>

    <!-- Generic cable thumbnails -->
    <template v-else>
      <rect x="10" y="20" width="60" height="25" rx="2" fill="#1a1f2b" stroke="#252c3a" stroke-dasharray="3,2"/>
      <text x="40" y="35" font-family="monospace" font-size="5" fill="#6b7794" text-anchor="middle">{{ drawingId.toUpperCase() }}</text>
    </template>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ drawingId: string }>()
</script>
