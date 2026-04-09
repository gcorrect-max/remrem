<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-4xl mx-auto space-y-6">

      <!-- Header -->
      <div class="flex items-start justify-between">
        <div>
          <h1 class="font-sans text-sm font-semibold text-rail-header">Help & Documentation</h1>
          <p class="font-mono text-[10px] text-rail-dim mt-0.5">HASLERRail Test Dashboard — User Guide</p>
        </div>
        <div class="font-mono text-[10px] text-rail-dim text-right">
          <div>RTO: <span class="text-rail-accent">{{ store.device.rtoFile }}</span></div>
          <div>Rev: <span class="text-rail-text">{{ store.device.rtoRevision }}</span></div>
        </div>
      </div>

      <!-- Search box -->
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-rail-dim font-mono text-xs">⌕</span>
        <input
          v-model="search"
          type="text"
          placeholder="Search documentation…"
          class="w-full bg-rail-surface border border-rail-border rounded pl-8 pr-4 py-2.5 font-mono text-xs text-rail-text placeholder:text-rail-dim focus:outline-none focus:border-rail-accent transition-colors"
        />
      </div>

      <!-- Filtered sections -->
      <div class="space-y-4">
        <div
          v-for="section in filteredSections"
          :key="section.id"
          class="bg-rail-surface border border-rail-border rounded overflow-hidden"
        >
          <!-- Section header (clickable) -->
          <button
            class="w-full flex items-center justify-between px-4 py-3 bg-rail-card hover:bg-rail-card/80 transition-colors text-left"
            @click="section.open = !section.open"
          >
            <div class="flex items-center gap-3">
              <span class="text-sm">{{ section.icon }}</span>
              <span class="font-sans text-xs font-semibold text-rail-header">{{ section.title }}</span>
            </div>
            <span class="text-rail-dim text-xs transition-transform duration-200" :class="{ 'rotate-90': section.open }">▶</span>
          </button>

          <!-- Section content -->
          <Transition name="expand">
            <div v-if="section.open" class="px-5 py-4 space-y-4 border-t border-rail-border animate-fade-in">
              <div v-for="item in section.items" :key="item.q" class="space-y-1.5">
                <div class="flex items-start gap-2">
                  <span class="font-mono text-[10px] text-rail-accent mt-0.5 flex-shrink-0">Q</span>
                  <p class="font-sans text-xs font-semibold text-rail-header">{{ item.q }}</p>
                </div>
                <div class="flex items-start gap-2 pl-4">
                  <span class="font-mono text-[10px] text-rail-dim mt-0.5 flex-shrink-0">A</span>
                  <p class="font-sans text-xs text-rail-dim leading-relaxed">{{ item.a }}</p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Quick reference table -->
      <div>
        <h2 class="font-mono text-[10px] text-rail-dim uppercase tracking-wider mb-3">Quick Reference — Status Indicators</h2>
        <div class="bg-rail-surface border border-rail-border rounded overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="bg-rail-card border-b border-rail-border">
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim">Indicator</th>
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim">Meaning</th>
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in refTable" :key="row.indicator" class="border-b border-rail-border/30 last:border-0">
                <td class="px-4 py-2">
                  <span class="font-mono text-xs font-bold" :class="row.color">{{ row.indicator }}</span>
                </td>
                <td class="px-4 py-2 font-sans text-xs text-rail-text">{{ row.meaning }}</td>
                <td class="px-4 py-2 font-sans text-xs text-rail-dim">{{ row.action }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-rail-border pt-4 pb-2 flex items-center justify-between">
        <span class="font-mono text-[10px] text-rail-dim">HASLERRail Test Dashboard v3.14.2</span>
        <span class="font-mono text-[10px] text-rail-dim">© Hasler Rail AG</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useDashboardStore } from '~/stores/dashboard'
const store = useDashboardStore()

const search = ref('')

const sections = reactive([
  {
    id: 'overview', icon: '📋', title: 'Test Overview (Page 1)', open: true,
    items: [
      {
        q: 'What is shown on the Test Overview page?',
        a: 'The Test Overview displays the full list of test steps on the left, with a status indicator (green = OK, red = FAIL) for each. On the right you see the device drawing. Below the drawing are thumbnail links to cable assembly drawings — click any thumbnail to load it as the main view.'
      },
      {
        q: 'How do I switch between cable drawings?',
        a: 'Click any thumbnail in the strip below the main drawing area. The selected drawing will load immediately as the main view. The active thumbnail is highlighted in amber.'
      },
    ]
  },
  {
    id: 'results', icon: '📊', title: 'Results – Live Session (Page 2)', open: false,
    items: [
      {
        q: 'What is shown on the Test Results page?',
        a: 'The Results page shows every executed test step for the currently active (or most recent) session in real time. It updates live via WebSocket as LabVIEW runs the test sequence.'
      },
      {
        q: 'How do I see the details of a test step?',
        a: 'Click on any row in the Test Results table. The row expands downward to reveal the input parameters used for that test and a full chronological test log showing each measurement or action performed.'
      },
      {
        q: 'Why does step 4.7.8.2 show FAIL?',
        a: 'The AC channel 50Hz accuracy test failed because 0 of 15 measurement points were within tolerance. The log indicates no signal was detected on CH1 — check the cable connection between YKGS820 output and the TB1_TS terminal block on the DUT.'
      },
      {
        q: 'How do I export the current session results?',
        a: 'Click the "↓ Export CSV" button in the top-right corner. A CSV file named test-results-<serialNo>-<date>.csv will be downloaded containing all step results for the current session.'
      },
    ]
  },
  {
    id: 'results-db', icon: '🗂️', title: 'Results DB – Historical Search (Page 3)', open: false,
    items: [
      {
        q: 'What is the Results DB page?',
        a: 'Results DB lets you search through all historical test sessions stored in the database. Unlike the Test Results page (which shows only the live session), Results DB gives you a full searchable archive filtered by device data, date range, test type, and outcome.'
      },
      {
        q: 'How do I filter by device?',
        a: 'Open the filter panel with the "⚙ Filters" button. Fill in any combination of: Model (partial match), Article No., Article Revision, Article Name, or Serial No. — all fields support partial text search. Press Search or Enter to apply.'
      },
      {
        q: 'How do I filter by date?',
        a: 'Use the "Date From" and "Date To" date pickers in the filter panel to limit results to sessions that started within a specific period. Both fields are optional — fill only one to set an open-ended range.'
      },
      {
        q: 'What does "Has Step Result" filter do?',
        a: 'It narrows the session list to sessions that contain at least one step with the selected outcome: OK, FAIL, or SKIP. Useful for quickly finding all sessions with at least one failing step.'
      },
      {
        q: 'How do I see the test steps for a session?',
        a: 'Click any session row to expand it. A sub-table appears showing all recorded test steps for that session: step number, VI name, start time, stop time, and result. Steps are loaded on demand from the database.'
      },
      {
        q: 'How do I filter by RTO document?',
        a: 'Enter part of the RTO document name (e.g. "5.2901.046") in the "RTO Document" field. The search matches against the document name stored in the database from the CINNAMON system.'
      },
      {
        q: 'How do I export filtered results?',
        a: 'Click "↓ Export CSV" in the page header. The export includes all sessions on the current page (up to 20 rows) with columns: Session ID, Date, Time, Device Model, Article No., Art. Rev., Article Name, Serial No., RTO Doc, Operator, Status, and step counts (OK/FAIL/SKIP/Total).'
      },
    ]
  },
  {
    id: 'config', icon: '⚙️', title: 'Device Configuration (Page 4)', open: false,
    items: [
      {
        q: 'What does the Device Configuration page show?',
        a: 'It displays all configuration parameters read from the REM102 during the test session: network addresses, mobile settings, GPS configuration, serial port parameters, power supply range, and measurement channel setup. The subsystems table lists all PCBs inside the unit with their serial numbers and article numbers.'
      },
    ]
  },
  {
    id: 'status', icon: '🔌', title: 'Device Status (Page 5)', open: false,
    items: [
      {
        q: 'What do the instrument status cards show?',
        a: 'Each card represents one instrument in the test station (PSU, signal source, multimeter, etc.). The card shows its connection status, key parameters read during the session, and the result of its self-test routine. A green indicator means the instrument is connected and healthy.'
      },
      {
        q: 'Why is REM102 showing WARN instead of OK?',
        a: 'The REM102 DUT shows WARN because test step 4.7.8.2 (AC 50Hz Accuracy Test) failed. The self-test panel within the card shows which sub-test failed.'
      },
    ]
  },
  {
    id: 'station', icon: '🗺️', title: 'Station Schema (Page 6)', open: false,
    items: [
      {
        q: 'What does the Station Schema show?',
        a: 'An interactive schematic of the entire test bench showing all instruments, their interconnections, and the GPIB bus. Use the layer toggles at the top to show or hide specific connection types (terminals, signal cables, GPIB bus).'
      },
    ]
  },
  {
    id: 'settings', icon: '🛠️', title: 'Configuration (Page 7)', open: false,
    items: [
      {
        q: 'How do I change the GPIB address of an instrument?',
        a: 'Navigate to the Configuration page and scroll to the "Instrument Addresses (GPIB)" section. Edit the address number field for the relevant instrument and click Save settings.'
      },
      {
        q: 'How do I load a different RTO file?',
        a: 'In the Configuration page, under "RTO File", click "Load Different RTO File…". Browse to the new .rto file. The dashboard will reload and display the steps defined in the new file.'
      },
    ]
  },
])

const filteredSections = computed(() => {
  if (!search.value.trim()) return sections
  const q = search.value.toLowerCase()
  return sections
    .map(s => ({
      ...s,
      open: true,
      items: s.items.filter(i => i.q.toLowerCase().includes(q) || i.a.toLowerCase().includes(q))
    }))
    .filter(s => s.items.length > 0)
})

const refTable = [
  { indicator: 'OK',   color: 'text-rail-ok',   meaning: 'Test step passed within tolerance',       action: 'None required' },
  { indicator: 'FAIL', color: 'text-rail-fail',  meaning: 'Test step failed, result out of range',   action: 'Check connections, repeat test' },
  { indicator: '● OK', color: 'text-rail-ok',    meaning: 'Instrument connected and self-test passed', action: 'None' },
  { indicator: '⚠ WARN',color: 'text-rail-warn', meaning: 'Instrument connected but DUT has failure', action: 'Investigate failing test step' },
  { indicator: '✗ FAIL',color: 'text-rail-fail', meaning: 'Instrument not responding or test aborted', action: 'Check GPIB address and cable' },
]
</script>
