<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-5xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-sans text-sm font-semibold text-rail-header">Instrument Status</h1>
          <p class="font-mono text-[10px] text-rail-dim mt-0.5">Detailed connection and health status for each instrument</p>
        </div>
        <!-- Live indicator -->
        <div class="flex items-center gap-2 px-3 py-1.5 bg-rail-card border border-rail-border rounded">
          <span class="w-2 h-2 rounded-full flex-shrink-0" :class="ws.statusDot"></span>
          <span class="font-mono text-[10px]" :class="ws.statusColor">{{ ws.statusLabel }}</span>
          <span v-if="ws.latencyMs !== null && ws.isConnected" class="font-mono text-[10px] text-rail-dim">
            {{ ws.latencyMs }}ms
          </span>
        </div>
      </div>

      <!-- Instruments grid -->
      <div class="grid grid-cols-2 gap-4">
        <div
          v-for="inst in enrichedInstruments"
          :key="inst.id"
          class="bg-rail-surface border rounded overflow-hidden transition-all"
          :class="{
            'border-rail-ok/30':      inst.status === 'ok',
            'border-rail-fail/30':    inst.status === 'fail' || inst.status === 'error',
            'border-rail-warn/30':    inst.status === 'warn',
            'border-rail-border':     inst.status === 'offline',
          }"
        >
          <!-- Instrument header -->
          <div class="flex items-center justify-between px-4 py-3 bg-rail-card border-b border-rail-border">
            <div class="flex items-center gap-3">
              <div
                class="w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors"
                :class="{
                  'bg-rail-ok animate-pulse-slow': inst.status === 'ok',
                  'bg-rail-fail':                  inst.status === 'fail' || inst.status === 'error',
                  'bg-rail-warn animate-pulse':    inst.status === 'warn',
                  'bg-rail-dim':                   inst.status === 'offline',
                }"
              ></div>
              <span class="font-mono text-sm font-bold text-rail-header">{{ inst.id }}</span>
              <span class="font-mono text-[10px] text-rail-dim">{{ inst.type }}</span>
            </div>
            <span
              class="font-mono text-[10px] px-2 py-0.5 rounded border"
              :class="{
                'text-rail-ok   border-rail-ok/30   bg-rail-ok/5':   inst.status === 'ok',
                'text-rail-fail border-rail-fail/30 bg-rail-fail/5': inst.status === 'fail' || inst.status === 'error',
                'text-rail-warn border-rail-warn/30 bg-rail-warn/5': inst.status === 'warn',
                'text-rail-dim  border-rail-border':                  inst.status === 'offline',
              }"
            >{{ inst.status.toUpperCase() }}</span>
          </div>

          <!-- Details -->
          <div class="p-4 space-y-2">
            <div v-for="(val, key) in inst.details" :key="key" class="flex items-center justify-between py-0.5">
              <span class="font-mono text-[10px] text-rail-dim">{{ key }}</span>
              <span class="font-mono text-[10px] text-rail-text">{{ val }}</span>
            </div>
          </div>

          <!-- Self-test results -->
          <div class="px-4 pb-4">
            <div class="font-mono text-[9px] text-rail-dim mb-1.5 uppercase tracking-wider">Self-Test</div>
            <div class="flex gap-1.5 flex-wrap">
              <span
                v-for="test in inst.selfTests"
                :key="test.name"
                class="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono border"
                :class="{
                  'text-rail-ok   border-rail-ok/30   bg-rail-ok/5':   test.pass,
                  'text-rail-fail border-rail-fail/30 bg-rail-fail/5': !test.pass,
                }"
              >
                <span>{{ test.pass ? '✓' : '✗' }}</span>
                <span>{{ test.name }}</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDashboardStore } from '~/stores/dashboard'
import { useWsStore }        from '~/stores/ws'

const store = useDashboardStore()
const ws    = useWsStore()

// Static detail/self-test data per instrument (supplemented by live status from store)
const staticDetails: Record<string, { details: Record<string, string>; selfTests: { name: string; pass: boolean }[] }> = {
  CINNAMON: {
    details: {
      'Host':       'localhost:5432',
      'Version':    '3.14.2',
      'Connection': 'TCP/IP',
      'Ping':       '< 1ms',
      'DB Size':    '1.24 GB',
    },
    selfTests: [
      { name: 'Connection', pass: true },
      { name: 'Auth',       pass: true },
      { name: 'Read/Write', pass: true },
    ],
  },
  HART: {
    details: {
      'Interface':  'RS-485',
      'Address':    '0x00',
      'Baud':       '1200',
      'Preambles':  '5',
      'Version':    'HART 7',
    },
    selfTests: [
      { name: 'Bus',      pass: true },
      { name: 'Response', pass: true },
      { name: 'CRC',      pass: true },
    ],
  },
  PSU: {
    details: {
      'Model':     'Keysight E3633A',
      'Output V':  '24.09V',
      'Output I':  '0.494A',
      'Range':     '22.8–25.2V',
      'VISA':      'TCPIP0::192.168.128.10::inst0::INSTR',
    },
    selfTests: [
      { name: 'Output',      pass: true },
      { name: 'OVP',         pass: true },
      { name: 'OCP',         pass: true },
      { name: 'Calibration', pass: true },
    ],
  },
  YKGS820: {
    details: {
      'Model':      'YOKOGAWA GS820',
      'IP':         '192.168.128.6',
      'FW Version': '1.10',
      'Interface':  'LAN / GPIB',
      'Self-Test':  '0 errors',
    },
    selfTests: [
      { name: 'Init',   pass: true },
      { name: 'Output', pass: true },
      { name: 'Cal',    pass: true },
    ],
  },
  WT3000: {
    details: {
      'Model':      'YOKOGAWA WT3000',
      'IP':         '192.168.128.5',
      'Channels':   '3',
      'Range':      '1000V / 5A',
      'Accuracy':   '±0.02%',
    },
    selfTests: [
      { name: 'Channels', pass: true },
      { name: 'Input',    pass: true },
      { name: 'Memory',   pass: true },
    ],
  },
  '3446A': {
    details: {
      'Model':      'Keysight 34446A',
      'Interface':  'USB / GPIB',
      'Resolution': '6½ digits',
      'Functions':  'DCV, ACV, R, I',
      'Last Cal':   '2024-01-15',
    },
    selfTests: [
      { name: 'ADC',   pass: true },
      { name: 'Ref',   pass: true },
      { name: 'Input', pass: true },
    ],
  },
  REM102: {
    details: {
      'S/N':         store.device.serialNo,
      'Article':     store.device.articleNumber,
      'HW Rev':      store.device.model,
      'RTO File':    store.device.rtoFile,
      'Test Status': store.overallStatus === 'ok' ? '✓ ALL PASS' : '⚠ FAIL',
    },
    selfTests: [
      { name: 'Power',  pass: true },
      { name: 'Serial', pass: true },
      { name: 'GPS',    pass: true },
      { name: 'ETH',    pass: true },
      { name: 'AC Ch',  pass: store.testResults.find(r => r.id === '4.7.8.2')?.result !== 'FAIL' },
      { name: 'DC Ch',  pass: true },
      { name: 'I/O',    pass: true },
    ],
  },
}

// Merge live status from store.instruments with static details
const enrichedInstruments = computed(() =>
  store.instruments.map(inst => ({
    ...inst,
    ...(staticDetails[inst.id] ?? { details: {}, selfTests: [] }),
  })),
)
</script>
