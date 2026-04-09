<template>
  <div class="h-full overflow-auto p-6">
    <div class="max-w-5xl mx-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-sans text-sm font-semibold text-rail-header">Device Configuration</h1>
          <p class="font-mono text-[10px] text-rail-dim mt-0.5">Current parameters – read from device during test</p>
        </div>
        <div class="font-mono text-[10px] text-rail-dim border border-rail-border rounded px-3 py-1.5">
          S/N: <span class="text-rail-accent">{{ store.device.serialNo }}</span>
        </div>
      </div>

      <!-- Config grid -->
      <div class="grid grid-cols-2 gap-4">
        <!-- Network: ETH0 -->
        <ConfigCard title="Network – ETH 0" icon="🌐">
          <ConfigRow label="IP Address"  :value="store.deviceConfig.network.eth0.ip" />
          <ConfigRow label="Subnet Mask" :value="store.deviceConfig.network.eth0.mask" />
          <ConfigRow label="Gateway"     :value="store.deviceConfig.network.eth0.gw" />
          <ConfigRow label="MAC Address" :value="store.deviceConfig.network.eth0.mac" mono />
        </ConfigCard>

        <!-- Network: ETH1 -->
        <ConfigCard title="Network – ETH 1" icon="🌐">
          <ConfigRow label="IP Address"  :value="store.deviceConfig.network.eth1.ip" />
          <ConfigRow label="Subnet Mask" :value="store.deviceConfig.network.eth1.mask" />
          <ConfigRow label="Gateway"     :value="store.deviceConfig.network.eth1.gw" />
          <ConfigRow label="MAC Address" :value="store.deviceConfig.network.eth1.mac" mono />
        </ConfigCard>

        <!-- Mobile -->
        <ConfigCard title="Mobile (GSM/LTE)" icon="📡">
          <ConfigRow label="APN"      :value="store.deviceConfig.mobile.apn" />
          <ConfigRow label="IMEI"     :value="store.deviceConfig.mobile.imei" mono />
          <ConfigRow label="TAC"      :value="store.deviceConfig.mobile.tac" mono />
          <ConfigRow label="Network"  :value="store.deviceConfig.mobile.network" />
        </ConfigCard>

        <!-- GPS -->
        <ConfigCard title="GPS Receiver" icon="🛰️">
          <ConfigRow label="Protocol" :value="store.deviceConfig.gps.protocol" />
          <ConfigRow label="Port"     :value="store.deviceConfig.gps.port" mono />
          <ConfigRow label="Baud Rate" :value="store.deviceConfig.gps.baud" />
        </ConfigCard>

        <!-- Serial -->
        <ConfigCard title="Serial Interface" icon="🔌">
          <ConfigRow label="Port"      :value="store.deviceConfig.serial.port" mono />
          <ConfigRow label="Baud Rate" :value="store.deviceConfig.serial.baud" />
          <ConfigRow label="Parity"    :value="store.deviceConfig.serial.parity" />
          <ConfigRow label="Data Bits" :value="store.deviceConfig.serial.dataBits" />
          <ConfigRow label="Stop Bits" :value="store.deviceConfig.serial.stopBits" />
        </ConfigCard>

        <!-- Power -->
        <ConfigCard title="Power Supply" icon="⚡">
          <ConfigRow label="Nominal"     :value="store.deviceConfig.power.nominal" />
          <ConfigRow label="Range"       :value="store.deviceConfig.power.range" />
          <ConfigRow label="Max Current" :value="store.deviceConfig.power.maxCurrent" />
        </ConfigCard>

        <!-- AC Channel -->
        <ConfigCard title="AC Measurement Channel" icon="〰️">
          <ConfigRow label="Setup"    :value="store.deviceConfig.acCh.setup" />
          <ConfigRow label="CH1"      :value="store.deviceConfig.acCh.ch1" />
          <ConfigRow label="CH2"      :value="store.deviceConfig.acCh.ch2" />
          <ConfigRow label="50Hz Test" :value="store.deviceConfig.acCh.freq50Hz ? 'Enabled' : 'Disabled'" :status="store.deviceConfig.acCh.freq50Hz ? 'ok' : 'warn'" />
          <ConfigRow label="16Hz Test" :value="store.deviceConfig.acCh.freq16Hz ? 'Enabled' : 'Disabled'" :status="store.deviceConfig.acCh.freq16Hz ? 'ok' : 'warn'" />
        </ConfigCard>

        <!-- DC Channel -->
        <ConfigCard title="DC Measurement Channel" icon="➡️">
          <ConfigRow label="Setup" :value="store.deviceConfig.dcCh.setup" />
          <ConfigRow label="CH1"   :value="store.deviceConfig.dcCh.ch1" />
          <ConfigRow label="CH2"   :value="store.deviceConfig.dcCh.ch2" />
        </ConfigCard>
      </div>

      <!-- Device subsystems table -->
      <div>
        <h2 class="font-mono text-[10px] text-rail-dim uppercase tracking-wider mb-3">Device Subsystems</h2>
        <div class="bg-rail-surface border border-rail-border rounded overflow-hidden">
          <table class="w-full">
            <thead>
              <tr class="bg-rail-card border-b border-rail-border">
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim uppercase">Serial No.</th>
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim uppercase">Article No.</th>
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim uppercase">Revision</th>
                <th class="text-left px-4 py-2 font-mono text-[10px] text-rail-dim uppercase">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="s in store.subsystems"
                :key="s.serial"
                class="border-b border-rail-border/40 hover:bg-rail-card/40 transition-colors"
              >
                <td class="px-4 py-2 font-mono text-xs text-rail-text">{{ s.serial }}</td>
                <td class="px-4 py-2 font-mono text-xs text-rail-text">{{ s.article }}</td>
                <td class="px-4 py-2 font-mono text-xs text-rail-dim">{{ s.revision }}</td>
                <td class="px-4 py-2 font-sans text-xs text-rail-text">{{ s.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDashboardStore } from '~/stores/dashboard'
const store = useDashboardStore()
</script>
