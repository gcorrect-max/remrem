<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-rail-border bg-rail-card flex-shrink-0">
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">Station Schema</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">Test bench layout – REM102 Routine Test</p>
      </div>
      <div class="flex items-center gap-3">
        <button
          v-for="layer in layers"
          :key="layer.id"
          @click="layer.visible = !layer.visible"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded border font-mono text-[10px] transition-all"
          :class="layer.visible
            ? 'border-rail-accent/50 text-rail-accent bg-rail-accent/5'
            : 'border-rail-border text-rail-dim bg-transparent'"
        >
          <span class="w-2 h-2 rounded-sm inline-block" :style="{ background: layer.color }"></span>
          {{ layer.label }}
        </button>
      </div>
    </div>

    <!-- Schema SVG canvas -->
    <div class="flex-1 overflow-auto flex items-center justify-center bg-rail-bg grid-bg p-6">
      <svg viewBox="0 0 900 560" xmlns="http://www.w3.org/2000/svg" class="w-full max-w-4xl">

        <!-- Title -->
        <text x="450" y="24" font-family="'IBM Plex Mono', monospace" font-size="11" fill="#6b7794" text-anchor="middle" font-weight="600">ROUTINE TEST STATION — REM102 SERIES</text>
        <line x1="50" y1="32" x2="850" y2="32" stroke="#252c3a" stroke-width="1"/>

        <!-- ─── GPIB Bus line (layer: bus) ─── -->
        <g v-if="layers[2].visible">
          <line x1="100" y1="490" x2="800" y2="490" stroke="#f59e0b" stroke-width="2" stroke-dasharray="8,3" opacity="0.6"/>
          <text x="450" y="486" font-family="monospace" font-size="8" fill="#f59e0b" text-anchor="middle" opacity="0.7">GPIB / IEEE-488 BUS</text>
          <!-- drops to each instrument -->
          <line x1="200" y1="490" x2="200" y2="410" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,2" opacity="0.5"/>
          <line x1="360" y1="490" x2="360" y2="410" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,2" opacity="0.5"/>
          <line x1="520" y1="490" x2="520" y2="410" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,2" opacity="0.5"/>
          <line x1="680" y1="490" x2="680" y2="410" stroke="#f59e0b" stroke-width="1" stroke-dasharray="4,2" opacity="0.5"/>
        </g>

        <!-- ─── DUT: REM102 ─── -->
        <g transform="translate(340, 55)">
          <rect width="220" height="130" rx="6" fill="#1a1f2b" stroke="#f59e0b" stroke-width="2"/>
          <rect x="10" y="10" width="200" height="25" rx="2" fill="#0d0f14"/>
          <text x="110" y="27" font-family="monospace" font-size="10" font-weight="bold" fill="#f59e0b" text-anchor="middle">HASLER Rail</text>
          <text x="110" y="47" font-family="monospace" font-size="8" fill="#e2e8f0" text-anchor="middle">REM102-G-G-S-T-W-8-GS-O-000</text>
          <text x="110" y="60" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle">S/N: 21292853</text>

          <!-- Connector icons row -->
          <rect x="15" y="72" width="26" height="18" rx="2" fill="#252c3a" stroke="#2e3748"/>
          <text x="28" y="84" font-family="monospace" font-size="6" fill="#38bdf8" text-anchor="middle">SER</text>

          <circle cx="68" cy="81" r="10" fill="#252c3a" stroke="#2e3748"/>
          <text x="68" y="85" font-family="monospace" font-size="6" fill="#22c55e" text-anchor="middle">GPS</text>

          <circle cx="100" cy="81" r="10" fill="#252c3a" stroke="#2e3748"/>
          <text x="100" y="85" font-family="monospace" font-size="6" fill="#38bdf8" text-anchor="middle">MOB</text>

          <rect x="118" y="72" width="26" height="18" rx="2" fill="#252c3a" stroke="#2e3748"/>
          <text x="131" y="84" font-family="monospace" font-size="6" fill="#22c55e" text-anchor="middle">ETH</text>

          <rect x="152" y="72" width="20" height="18" rx="2" fill="#252c3a" stroke="#2e3748"/>
          <text x="162" y="84" font-family="monospace" font-size="6" fill="#f59e0b" text-anchor="middle">AC</text>

          <rect x="180" y="72" width="20" height="18" rx="2" fill="#252c3a" stroke="#2e3748"/>
          <text x="190" y="84" font-family="monospace" font-size="6" fill="#ef4444" text-anchor="middle">DC</text>

          <!-- Status badge -->
          <rect x="60" y="102" width="100" height="18" rx="3" fill="#ef4444" fill-opacity="0.15" stroke="#ef4444" stroke-width="0.8"/>
          <text x="110" y="115" font-family="monospace" font-size="7" fill="#ef4444" text-anchor="middle">⚠ AC 50Hz FAIL</text>
        </g>

        <!-- DUT label -->
        <text x="450" y="208" font-family="monospace" font-size="8" fill="#6b7794" text-anchor="middle">Device Under Test (DUT)</text>

        <!-- ─── Test PC / CINNAMON ─── -->
        <g transform="translate(50, 55)">
          <rect width="160" height="100" rx="4" fill="#1a1f2b" stroke="#22c55e" stroke-width="1.5"/>
          <rect x="8" y="8" width="144" height="18" rx="2" fill="#0d0f14"/>
          <text x="80" y="21" font-family="monospace" font-size="8" font-weight="bold" fill="#22c55e" text-anchor="middle">TEST PC</text>
          <text x="80" y="40" font-family="monospace" font-size="7" fill="#c8d0e0" text-anchor="middle">CINNAMON</text>
          <text x="80" y="54" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">192.168.1.1</text>
          <text x="80" y="68" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">TestSuite v3.14.2</text>
          <rect x="20" y="78" width="120" height="14" rx="2" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="0.8"/>
          <text x="80" y="89" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">● CONNECTED</text>
        </g>

        <!-- ─── HART Controller ─── -->
        <g transform="translate(50, 195)">
          <rect width="160" height="80" rx="4" fill="#1a1f2b" stroke="#38bdf8" stroke-width="1.5"/>
          <rect x="8" y="8" width="144" height="16" rx="2" fill="#0d0f14"/>
          <text x="80" y="20" font-family="monospace" font-size="8" font-weight="bold" fill="#38bdf8" text-anchor="middle">HART</text>
          <text x="80" y="36" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">Protocol Handler v7</text>
          <text x="80" y="50" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">RS-485 | Addr 0x00</text>
          <rect x="20" y="58" width="120" height="14" rx="2" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="0.8"/>
          <text x="80" y="69" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">● OK</text>
        </g>

        <!-- ─── PSU ─── -->
        <g transform="translate(100, 330)">
          <rect width="140" height="80" rx="4" fill="#1a1f2b" stroke="#f97316" stroke-width="1.5"/>
          <text x="70" y="22" font-family="monospace" font-size="8" font-weight="bold" fill="#f97316" text-anchor="middle">PSU</text>
          <text x="70" y="36" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">Keysight E3633A</text>
          <text x="70" y="48" font-family="monospace" font-size="6" fill="#f59e0b" text-anchor="middle">24.09V / 0.494A</text>
          <rect x="15" y="58" width="110" height="14" rx="2" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="0.8"/>
          <text x="70" y="69" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">● OUTPUT ON</text>
        </g>

        <!-- ─── YKGS820 ─── -->
        <g transform="translate(100, 330)">
          <!-- already have PSU at 330, shift YKGS820 -->
        </g>
        <g transform="translate(290, 330)">
          <rect width="140" height="80" rx="4" fill="#1a1f2b" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="70" y="22" font-family="monospace" font-size="8" font-weight="bold" fill="#38bdf8" text-anchor="middle">YKGS820</text>
          <text x="70" y="36" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">YOKOGAWA GS820</text>
          <text x="70" y="48" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">S/N: 765601 FW:1.10</text>
          <rect x="15" y="58" width="110" height="14" rx="2" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="0.8"/>
          <text x="70" y="69" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">● OK</text>
        </g>

        <!-- ─── WT3000 ─── -->
        <g transform="translate(480, 330)">
          <rect width="140" height="80" rx="4" fill="#1a1f2b" stroke="#a78bfa" stroke-width="1.5"/>
          <text x="70" y="22" font-family="monospace" font-size="8" font-weight="bold" fill="#a78bfa" text-anchor="middle">WT3000</text>
          <text x="70" y="36" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">YOKOGAWA WT3000</text>
          <text x="70" y="48" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">3ch | ±0.02% acc</text>
          <rect x="15" y="58" width="110" height="14" rx="2" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="0.8"/>
          <text x="70" y="69" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">● OK</text>
        </g>

        <!-- ─── 3446A ─── -->
        <g transform="translate(670, 330)">
          <rect width="140" height="80" rx="4" fill="#1a1f2b" stroke="#6b7794" stroke-width="1.5"/>
          <text x="70" y="22" font-family="monospace" font-size="8" font-weight="bold" fill="#c8d0e0" text-anchor="middle">3446A</text>
          <text x="70" y="36" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">Keysight 34446A</text>
          <text x="70" y="48" font-family="monospace" font-size="6" fill="#6b7794" text-anchor="middle">6½ digit DMM</text>
          <rect x="15" y="58" width="110" height="14" rx="2" fill="#22c55e" fill-opacity="0.1" stroke="#22c55e" stroke-width="0.8"/>
          <text x="70" y="69" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">● OK</text>
        </g>

        <!-- ─── Signal connections (layer: signals) ─── -->
        <g v-if="layers[1].visible">
          <!-- PC → DUT Serial -->
          <line x1="210" y1="100" x2="340" y2="110" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="270" y="97" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">RS-232</text>

          <!-- PC → DUT Ethernet -->
          <line x1="210" y1="115" x2="340" y2="125" stroke="#22c55e" stroke-width="1.2"/>
          <text x="270" y="130" font-family="monospace" font-size="7" fill="#22c55e" text-anchor="middle">ETH 100Mbps</text>

          <!-- PSU → DUT power -->
          <line x1="240" y1="370" x2="400" y2="200" stroke="#f97316" stroke-width="1.5"/>
          <text x="295" y="282" font-family="monospace" font-size="7" fill="#f97316" text-anchor="middle" transform="rotate(-35, 295, 282)">+24V PWR</text>

          <!-- YKGS820 → DUT AC -->
          <line x1="430" y1="340" x2="520" y2="205" stroke="#38bdf8" stroke-width="1.2"/>
          <text x="475" y="262" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle" transform="rotate(-55, 475, 262)">AC SIG</text>

          <!-- WT3000 → DUT AC measure -->
          <line x1="550" y1="340" x2="530" y2="205" stroke="#a78bfa" stroke-width="1.2"/>
          <text x="545" y="268" font-family="monospace" font-size="7" fill="#a78bfa" text-anchor="middle" transform="rotate(-80, 545, 268)">AC MEAS</text>

          <!-- 3446A → DUT DC -->
          <line x1="720" y1="340" x2="555" y2="205" stroke="#6b7794" stroke-width="1.2"/>
          <text x="645" y="262" font-family="monospace" font-size="7" fill="#6b7794" text-anchor="middle" transform="rotate(-30, 645, 262)">DC MEAS</text>
        </g>

        <!-- ─── TB (Terminal Block) labels ─── -->
        <g v-if="layers[0].visible">
          <!-- TB1_TS -->
          <rect x="390" y="230" width="60" height="22" rx="2" fill="#252c3a" stroke="#f59e0b" stroke-width="1" stroke-dasharray="3,2"/>
          <text x="420" y="245" font-family="monospace" font-size="7" fill="#f59e0b" text-anchor="middle">TB1_TS</text>

          <!-- TB2 -->
          <rect x="505" y="230" width="44" height="22" rx="2" fill="#252c3a" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3,2"/>
          <text x="527" y="245" font-family="monospace" font-size="7" fill="#38bdf8" text-anchor="middle">TB2</text>
        </g>

        <!-- Legend -->
        <g transform="translate(50, 510)">
          <text x="0" y="0" font-family="monospace" font-size="8" fill="#6b7794">LEGEND:</text>
          <rect x="65" y="-8" width="8" height="8" fill="#22c55e" opacity="0.7"/>
          <text x="77" y="0" font-family="monospace" font-size="7" fill="#6b7794">OK</text>
          <rect x="105" y="-8" width="8" height="8" fill="#ef4444" opacity="0.7"/>
          <text x="117" y="0" font-family="monospace" font-size="7" fill="#6b7794">FAIL</text>
          <line x1="155" y1="-4" x2="175" y2="-4" stroke="#f59e0b" stroke-width="2" stroke-dasharray="4,2"/>
          <text x="179" y="0" font-family="monospace" font-size="7" fill="#6b7794">GPIB Bus</text>
          <line x1="250" y1="-4" x2="270" y2="-4" stroke="#38bdf8" stroke-width="1.5"/>
          <text x="274" y="0" font-family="monospace" font-size="7" fill="#6b7794">Signal</text>
        </g>

      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'

const layers = reactive([
  { id: 'terminals', label: 'Terminals',  color: '#f59e0b', visible: true },
  { id: 'signals',   label: 'Signals',    color: '#38bdf8', visible: true },
  { id: 'bus',       label: 'GPIB Bus',   color: '#f97316', visible: true },
])
</script>
