<template>
  <!-- Main REM102 device SVG illustration -->
  <svg v-if="drawingId === 'main'" viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg" class="w-full h-full drop-shadow-2xl">
    <!-- Device body -->
    <rect x="40" y="40" width="440" height="240" rx="8" fill="#1a1f2b" stroke="#252c3a" stroke-width="2"/>
    <rect x="50" y="50" width="420" height="220" rx="6" fill="#13171f" stroke="#2e3748" stroke-width="1"/>

    <!-- Top panel -->
    <rect x="60" y="60" width="400" height="40" rx="3" fill="#0d0f14" stroke="#252c3a" stroke-width="1"/>
    <!-- Hasler Rail logo text -->
    <text x="80" y="86" font-family="monospace" font-size="16" font-weight="bold" fill="#f59e0b">HASLER</text>
    <text x="152" y="86" font-family="monospace" font-size="16" fill="#e2e8f0">Rail</text>
    <text x="260" y="78" font-family="monospace" font-size="8" fill="#6b7794">MODEL REM102</text>

    <!-- Status LEDs -->
    <circle cx="420" cy="72" r="5" fill="#22c55e" opacity="0.9"/>
    <circle cx="435" cy="72" r="5" fill="#22c55e" opacity="0.6"/>
    <circle cx="420" cy="85" r="5" fill="#38bdf8" opacity="0.7"/>
    <circle cx="435" cy="85" r="5" fill="#6b7794" opacity="0.5"/>

    <!-- OLED Display area -->
    <rect x="60" y="112" width="100" height="60" rx="3" fill="#0d0f14" stroke="#252c3a" stroke-width="1"/>
    <rect x="65" y="117" width="90" height="50" rx="2" fill="#0a2218"/>
    <text x="90" y="134" font-family="monospace" font-size="6" fill="#22c55e">REM102</text>
    <text x="72" y="145" font-family="monospace" font-size="5" fill="#38bdf8">IP:192.168.1.100</text>
    <text x="72" y="155" font-family="monospace" font-size="5" fill="#6b7794">GPS: FIX 3D</text>
    <text x="72" y="162" font-family="monospace" font-size="5" fill="#6b7794">GSM: LTE OK</text>

    <!-- Connectors panel -->
    <rect x="170" y="112" width="270" height="140" rx="3" fill="#0d0f14" stroke="#252c3a" stroke-width="1"/>

    <!-- Connector labels row 1 -->
    <text x="185" y="130" font-family="monospace" font-size="7" fill="#6b7794">SERIAL</text>
    <text x="245" y="130" font-family="monospace" font-size="7" fill="#6b7794">MOBILE</text>
    <text x="315" y="130" font-family="monospace" font-size="7" fill="#6b7794">GPS</text>

    <!-- D-sub connector -->
    <rect x="183" y="133" width="50" height="28" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <rect x="188" y="137" width="40" height="16" rx="1" fill="#0d0f14"/>
    <circle cx="198" cy="145" r="1.5" fill="#6b7794"/>
    <circle cx="206" cy="145" r="1.5" fill="#6b7794"/>
    <circle cx="214" cy="145" r="1.5" fill="#6b7794"/>
    <circle cx="222" cy="145" r="1.5" fill="#6b7794"/>

    <!-- SMA connectors -->
    <circle cx="265" cy="147" r="12" fill="#252c3a" stroke="#2e3748"/>
    <circle cx="265" cy="147" r="7" fill="#0d0f14"/>
    <circle cx="265" cy="147" r="3" fill="#6b7794"/>

    <circle cx="325" cy="147" r="12" fill="#252c3a" stroke="#2e3748"/>
    <circle cx="325" cy="147" r="7" fill="#0d0f14"/>
    <circle cx="325" cy="147" r="3" fill="#6b7794"/>

    <!-- Power connector -->
    <text x="390" y="130" font-family="monospace" font-size="7" fill="#6b7794">PWR</text>
    <circle cx="400" cy="147" r="14" fill="#252c3a" stroke="#2e3748"/>
    <circle cx="400" cy="147" r="9" fill="#0d0f14"/>
    <circle cx="400" cy="147" r="4" fill="#f59e0b" opacity="0.6"/>

    <!-- Row 2 connectors -->
    <text x="185" y="185" font-family="monospace" font-size="7" fill="#6b7794">ETH0</text>
    <text x="240" y="185" font-family="monospace" font-size="7" fill="#6b7794">ETH1</text>
    <text x="310" y="185" font-family="monospace" font-size="7" fill="#6b7794">I/O AC</text>
    <text x="370" y="185" font-family="monospace" font-size="7" fill="#6b7794">DC</text>

    <!-- RJ45 connectors -->
    <rect x="183" y="188" width="40" height="32" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <rect x="188" y="192" width="30" height="20" rx="1" fill="#0d0f14"/>
    <rect x="192" y="196" width="22" height="3" fill="#38bdf8" opacity="0.5"/>

    <rect x="238" y="188" width="40" height="32" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <rect x="243" y="192" width="30" height="20" rx="1" fill="#0d0f14"/>
    <rect x="247" y="196" width="22" height="3" fill="#22c55e" opacity="0.5"/>

    <!-- Terminal blocks -->
    <rect x="300" y="188" width="55" height="32" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <rect x="305" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>
    <rect x="317" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>
    <rect x="329" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>
    <rect x="341" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>

    <rect x="362" y="188" width="55" height="32" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <rect x="367" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>
    <rect x="379" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>
    <rect x="391" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>
    <rect x="403" y="193" width="8" height="8" rx="1" fill="#0d0f14"/>

    <!-- DIN rail mount -->
    <rect x="60" y="240" width="400" height="30" rx="2" fill="#0d0f14" stroke="#252c3a"/>
    <rect x="100" y="245" width="60" height="20" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <rect x="340" y="245" width="60" height="20" rx="2" fill="#252c3a" stroke="#2e3748"/>

    <!-- Serial number label -->
    <text x="230" y="258" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle">S/N: 21292853</text>
    <text x="230" y="268" font-family="monospace" font-size="6" fill="#2e3748" text-anchor="middle">5.6602.013/01</text>

    <!-- CE mark -->
    <text x="450" y="268" font-family="sans-serif" font-size="11" fill="#6b7794" font-weight="bold">CE</text>
  </svg>

  <!-- Cable01 - Power drawing -->
  <svg v-else-if="drawingId === 'cable01'" viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <text x="260" y="40" font-family="monospace" font-size="11" fill="#f59e0b" text-anchor="middle" font-weight="bold">CABLE01 – POWER CABLE ASSEMBLY</text>
    <text x="260" y="56" font-family="monospace" font-size="8" fill="#6b7794" text-anchor="middle">24VDC Power Input / Article: 80001234</text>

    <!-- PSU side -->
    <rect x="40" y="80" width="120" height="160" rx="4" fill="#1a1f2b" stroke="#252c3a" stroke-width="1.5"/>
    <text x="100" y="100" font-family="monospace" font-size="8" fill="#6b7794" text-anchor="middle">PSU</text>
    <circle cx="100" cy="130" r="20" fill="#252c3a" stroke="#2e3748"/>
    <text x="100" y="134" font-family="monospace" font-size="7" fill="#f59e0b" text-anchor="middle">+24V</text>
    <circle cx="100" cy="175" r="14" fill="#252c3a" stroke="#2e3748"/>
    <text x="100" y="179" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle">GND</text>

    <!-- Cable lines -->
    <line x1="160" y1="130" x2="360" y2="130" stroke="#f59e0b" stroke-width="2.5"/>
    <line x1="160" y1="175" x2="360" y2="175" stroke="#6b7794" stroke-width="2.5"/>
    <text x="260" y="122" font-family="monospace" font-size="7" fill="#f59e0b" text-anchor="middle">+24V (RED)</text>
    <text x="260" y="167" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle">GND (BLACK)</text>

    <!-- REM102 side -->
    <rect x="360" y="80" width="120" height="160" rx="4" fill="#1a1f2b" stroke="#252c3a" stroke-width="1.5"/>
    <text x="420" y="100" font-family="monospace" font-size="8" fill="#6b7794" text-anchor="middle">REM102</text>
    <circle cx="420" cy="130" r="20" fill="#252c3a" stroke="#2e3748"/>
    <text x="420" y="134" font-family="monospace" font-size="7" fill="#f59e0b" text-anchor="middle">PWR</text>

    <!-- Measurements -->
    <rect x="180" y="220" width="160" height="40" rx="3" fill="#0d0f14" stroke="#252c3a"/>
    <text x="260" y="236" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">MIN: 22.8V / MAX: 25.2V</text>
    <text x="260" y="250" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">I_MAX: 750mA</text>
  </svg>

  <!-- Cable02 – Serial -->
  <svg v-else-if="drawingId === 'cable02'" viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <text x="260" y="40" font-family="monospace" font-size="11" fill="#f59e0b" text-anchor="middle" font-weight="bold">CABLE02 – SERIAL INTERFACE CABLE</text>
    <text x="260" y="56" font-family="monospace" font-size="8" fill="#6b7794" text-anchor="middle">RS-232 / DB9 to REM102 SERIAL</text>

    <rect x="40" y="100" width="80" height="120" rx="4" fill="#1a1f2b" stroke="#252c3a"/>
    <text x="80" y="118" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle">TEST PC</text>

    <!-- DB9 connector left -->
    <rect x="45" y="125" width="70" height="50" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <text x="80" y="155" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">DB9-M</text>

    <!-- Cable lines TX/RX/GND -->
    <line x1="115" y1="140" x2="365" y2="140" stroke="#22c55e" stroke-width="1.5" stroke-dasharray="4,2"/>
    <line x1="115" y1="155" x2="365" y2="155" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="4,2"/>
    <line x1="115" y1="170" x2="365" y2="170" stroke="#6b7794" stroke-width="1.5"/>
    <text x="240" y="133" font-family="monospace" font-size="6" fill="#22c55e" text-anchor="middle">TX → RX</text>
    <text x="240" y="148" font-family="monospace" font-size="6" fill="#ef4444" text-anchor="middle">RX ← TX</text>
    <text x="240" y="163" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">GND</text>

    <rect x="365" y="100" width="115" height="120" rx="4" fill="#1a1f2b" stroke="#252c3a"/>
    <text x="422" y="118" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle">REM102</text>
    <rect x="370" y="125" width="105" height="50" rx="2" fill="#252c3a" stroke="#2e3748"/>
    <text x="422" y="155" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">SERIAL</text>

    <rect x="140" y="240" width="240" height="35" rx="3" fill="#0d0f14" stroke="#252c3a"/>
    <text x="260" y="254" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">115200 BAUD | 8N1 | NO FLOW CTRL</text>
    <text x="260" y="268" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">RESULT: OK</text>
  </svg>

  <!-- Cable03..05 generic -->
  <svg v-else viewBox="0 0 520 320" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
    <text x="260" y="40" font-family="monospace" font-size="11" fill="#f59e0b" text-anchor="middle" font-weight="bold">{{ cableLabel }}</text>
    <text x="260" y="160" font-family="monospace" font-size="10" fill="#6b7794" text-anchor="middle">[ Drawing placeholder ]</text>
    <rect x="160" y="120" width="200" height="80" rx="4" fill="#1a1f2b" stroke="#252c3a" stroke-dasharray="6,3"/>
    <text x="260" y="180" font-family="monospace" font-size="8" fill="#2e3748" text-anchor="middle">Load drawing file to view</text>
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStore } from '~/stores/dashboard'

const props = defineProps<{ drawingId: string }>()
const store = useDashboardStore()

const cableLabel = computed(() => {
  const d = store.drawings.find(d => d.id === props.drawingId)
  return d?.label?.toUpperCase() ?? props.drawingId.toUpperCase()
})
</script>
