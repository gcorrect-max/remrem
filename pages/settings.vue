<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-3xl mx-auto space-y-6">

      <!-- Header -->
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">Configuration</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">Application and test execution settings</p>
      </div>

      <!-- General settings -->
      <SettingsSection title="General" icon="⚙️">
        <SettingsToggle
          label="Auto-save results"
          description="Automatically save test results after each session"
          v-model="settings.autoSave"
        />
        <SettingsToggle
          label="Dark mode"
          description="Use dark colour scheme (requires restart)"
          v-model="settings.darkMode"
        />
        <SettingsToggle
          label="Notify on failure"
          description="Show alert dialog when a test step fails"
          v-model="settings.notifyOnFail"
        />
        <SettingsSelect
          label="Language"
          :options="['en', 'de', 'fr', 'pl']"
          v-model="settings.language"
        />
      </SettingsSection>

      <!-- Test execution -->
      <SettingsSection title="Test Execution" icon="▶️">
        <SettingsNumber
          label="Step timeout (s)"
          description="Maximum seconds allowed per test step"
          v-model="settings.testTimeout"
          :min="10"
          :max="300"
        />
        <SettingsSelect
          label="Log level"
          :options="['DEBUG', 'INFO', 'WARNING', 'ERROR']"
          v-model="settings.logLevel"
        />
        <SettingsText
          label="Export path"
          description="Directory for saving test result files"
          v-model="settings.exportPath"
        />
      </SettingsSection>

      <!-- RTO File info -->
      <SettingsSection title="RTO File" icon="📄">
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs text-rail-dim">Current file</span>
            <span class="font-mono text-xs text-rail-accent">{{ store.device.rtoFile }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs text-rail-dim">Revision</span>
            <span class="font-mono text-xs text-rail-text">{{ store.device.rtoRevision }}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="font-mono text-xs text-rail-dim">Total steps</span>
            <span class="font-mono text-xs text-rail-text">{{ store.session.progress.total }}</span>
          </div>
          <button class="w-full mt-2 px-4 py-2 bg-rail-card border border-rail-border hover:border-rail-accent text-rail-text hover:text-rail-accent transition-all rounded font-mono text-xs">
            Load Different RTO File…
          </button>
        </div>
      </SettingsSection>

      <!-- Instrument addresses -->
      <SettingsSection title="Instrument Addresses (GPIB)" icon="🔌">
        <div class="p-4 space-y-2">
          <div
            v-for="inst in gpibAddresses"
            :key="inst.id"
            class="flex items-center justify-between py-1.5 border-b border-rail-border/30 last:border-0"
          >
            <div>
              <span class="font-mono text-xs text-rail-text">{{ inst.id }}</span>
              <span class="font-mono text-[10px] text-rail-dim ml-3">{{ inst.model }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] text-rail-dim">GPIB:</span>
              <input
                type="number"
                :value="inst.address"
                class="w-14 bg-rail-bg border border-rail-border rounded px-2 py-0.5 font-mono text-xs text-rail-accent text-right focus:outline-none focus:border-rail-accent"
              />
            </div>
          </div>
        </div>
      </SettingsSection>

      <!-- Save button -->
      <div class="flex justify-end gap-3 pb-4">
        <button class="px-5 py-2 bg-rail-card border border-rail-border text-rail-dim hover:text-rail-text transition-colors rounded font-mono text-xs">
          Reset defaults
        </button>
        <button class="px-5 py-2 bg-rail-accent/90 hover:bg-rail-accent text-rail-bg font-semibold transition-colors rounded font-mono text-xs">
          Save settings
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import { useDashboardStore } from '~/stores/dashboard'
const store = useDashboardStore()

const settings = reactive({ ...store.settings })

const gpibAddresses = reactive([
  { id: 'PSU',    model: 'Keysight E3633A',   address: 5  },
  { id: 'YKGS820',model: 'YOKOGAWA GS820',    address: 3  },
  { id: 'WT3000', model: 'YOKOGAWA WT3000',   address: 7  },
  { id: '3446A',  model: 'Keysight 34446A',   address: 22 },
])
</script>
