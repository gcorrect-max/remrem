import { defineStore } from 'pinia'

export type TestStepStatus = 'ok' | 'fail' | 'running' | 'pending' | 'skipped'
export type TestResultValue = 'OK' | 'FAIL' | 'SKIP' | 'RUNNING'

export const useDashboardStore = defineStore('dashboard', {
  state: () => ({
    // ── Device info ──
    device: {
      model: 'REM102-G-G-S-T-W-8-GS-O-000',
      articleNumber: '5.6602.013/01',
      productionNumber: '',
      serialNo: '21292853',
      rtoFile: '5.2901.047J01',
      rtoRevision: 'A51',
    },

    // ── Device subsystems ──
    subsystems: [
      { serial: '19252995', article: '5.6602.316/08', revision: 'A01', description: 'BOARD REM102PCU-108' },
      { serial: '20212865', article: '5.6602.313/01', revision: 'A02', description: 'BOARD REM102CN-401' },
      { serial: '20341058', article: '5.6602.311/20', revision: 'A00', description: 'BOARD REM102DSPW-320' },
      { serial: '21081218', article: '80002900',       revision: 'D01', description: 'BOARD MPC107-001' },
      { serial: '21202692', article: '80002760',       revision: 'D08', description: 'BOARD REM102OLED-000' },
    ],

    // ── Instruments / right nav ──
    instruments: [
      { id: 'CINNAMON', label: 'CINNAMON', status: 'ok',   icon: '🗄️',  type: 'database' },
      { id: 'HART',     label: 'HART',     status: 'ok',   icon: '🗄️',  type: 'database' },
      { id: 'PSU',      label: 'PSU',      status: 'ok',   icon: '🖨️',  type: 'instrument' },
      { id: 'YKGS820',  label: 'YKGS820',  status: 'ok',   icon: '📟',  type: 'meter' },
      { id: 'WT3000',   label: 'WT3000',   status: 'ok',   icon: '📟',  type: 'meter' },
      { id: '3446A',    label: '3446A',    status: 'ok',   icon: '📟',  type: 'meter' },
      { id: 'REM102',   label: 'REM102',   status: 'warn', icon: '📦',  type: 'dut' },
    ],

    // ── Cable drawings thumbnails ──
    drawings: [
      { id: 'main',    label: 'REM102 – Main View',       src: null, active: true  },
      { id: 'cable01', label: 'Cable01 – Power',          src: null, active: false },
      { id: 'cable02', label: 'Cable02 – Serial',         src: null, active: false },
      { id: 'cable03', label: 'Cable03 – AC Input',       src: null, active: false },
      { id: 'cable04', label: 'Cable04 – DC Input',       src: null, active: false },
      { id: 'cable05', label: 'Cable05 – Ethernet',       src: null, active: false },
    ],

    activeDrawing: 'main',

    // ── Test steps (page 1) ──
    testSteps: [
      { id: '4.6',     label: 'Power Supply Test',                           status: 'ok'   },
      { id: '4.6.1',   label: 'Current measurement 490mA@24V, 94mA@110V',   status: 'ok'   },
      { id: '4.6.2',   label: 'Over- / Undervoltage',                        status: 'ok'   },
      { id: '4.7.1',   label: 'Serial Interface Test',                       status: 'ok'   },
      { id: '4.7.2',   label: 'GPS',                                          status: 'ok'   },
      { id: '4.7.4',   label: 'RTC / Backup Battery Test',                  status: 'ok'   },
      { id: '4.7.5',   label: 'Mobile IMEI: 355001092101533',                status: 'ok'   },
      { id: '4.7.6',   label: 'Ethernet',                                    status: 'ok'   },
      { id: '4.7.6.1', label: 'Eth 0',                                       status: 'ok'   },
      { id: '4.7.6.2', label: 'Eth 1',                                       status: 'ok'   },
      { id: '4.7.8',   label: 'AC Channel 50Hz Ch B / TB1_TS / 3.33Ohm',   status: 'fail' },
      { id: '4.7.8.1', label: 'AC Channel 50Hz Calibration',                status: 'ok'   },
      { id: '4.7.8.2', label: 'AC Channel 50Hz Accuracy Test',              status: 'fail' },
      { id: '4.7.9',   label: 'AC Channel 16Hz Ch B / TB1_TS / 3.33Ohm',   status: 'ok'   },
      { id: '4.7.9.1', label: 'AC Channel 16Hz Calibration',                status: 'ok'   },
      { id: '4.7.9.2', label: 'AC Channel 16Hz Accuracy Test',              status: 'ok'   },
      { id: '4.7.10',  label: 'DC Channel Ch A / TB2',                      status: 'ok'   },
      { id: '4.7.10.1',label: 'DC Channel Calibration',                     status: 'ok'   },
      { id: '4.7.10.2',label: 'DC Channel Accuracy Test',                   status: 'ok'   },
      { id: '4.7.11',  label: 'Input/Output 24Vdc Test',                    status: 'ok'   },
      { id: '4.7.12',  label: 'Input Test',                                  status: 'ok'   },
      { id: '4.7.13',  label: 'Input Output Test',                          status: 'ok'   },
      { id: '4.7.14',  label: 'Display and LED Test',                       status: 'ok'   },
    ],

    // ── Test results table (page 2) ──
    testResults: [
      {
        id: '4.7.1',
        step: '4.7.1 Serial Interface Test',
        details: 'Serial Interface TestSerial Interface Test',
        result: 'OK',
        expanded: false,
        params: { baud: '115200', parity: 'None', stop: '1', data: '8' },
        log: ['[00:01:12] Sending test frame...', '[00:01:13] Response received: ACK', '[00:01:13] PASS']
      },
      {
        id: '4.7.2',
        step: '4.7.2 GPS Test',
        details: '4.7.2 GPS Test',
        result: 'OK',
        expanded: false,
        params: { protocol: 'NMEA 0183', fix: '3D', satellites: '8', hdop: '1.2' },
        log: ['[00:03:05] Waiting for GPS fix...', '[00:03:47] Fix acquired', '[00:03:48] PASS']
      },
      {
        id: '4.7.4',
        step: '4.7.4 RTC Backup Battery Test',
        details: 'RTC Backup Battery TestRTC Backup Battery Test',
        result: 'OK',
        expanded: false,
        params: { voltage: '3.04V', threshold: '2.8V', drift: '±2ppm' },
        log: ['[00:05:00] Reading RTC voltage...', '[00:05:01] Voltage: 3.04V – OK', '[00:05:01] PASS']
      },
      {
        id: '4.7.5',
        step: '4.7.5 Mobile Test',
        details: 'IMEI: 355001092101533, TAC: 35500109',
        result: 'OK',
        expanded: false,
        params: { imei: '355001092101533', tac: '35500109', operator: 'SIM-TEST', rssi: '-72 dBm' },
        log: ['[00:08:10] IMEI check...', '[00:08:11] Network registration OK', '[00:08:12] PASS']
      },
      {
        id: '4.7.6.1',
        step: '4.7.6.1 Eth 0',
        details: 'ETH 0 port Test',
        result: 'OK',
        expanded: false,
        params: { mac: 'AC:DE:48:00:00:01', speed: '100Mbps', duplex: 'Full', link: 'UP' },
        log: ['[00:09:00] Link detection...', '[00:09:01] 100BaseTX Full-Duplex', '[00:09:01] PASS']
      },
      {
        id: '4.7.6.2',
        step: '4.7.6.2 Eth 1',
        details: 'ETH 1 port Test',
        result: 'OK',
        expanded: false,
        params: { mac: 'AC:DE:48:00:00:02', speed: '100Mbps', duplex: 'Full', link: 'UP' },
        log: ['[00:09:10] Link detection...', '[00:09:11] 100BaseTX Full-Duplex', '[00:09:11] PASS']
      },
      {
        id: '4.7.8.1',
        step: '4.7.8.1 AC channel 50Hz Calibration',
        details: 'Channel B, setup: TB1_TS / 3.33Ohm : CH1_100V – CH2_1A',
        result: 'OK',
        expanded: false,
        params: { channel: 'B', setup: 'TB1_TS/3.33Ohm', ch1: '100V', ch2: '1A', frequency: '50Hz' },
        log: ['[00:12:00] Applying calibration signal...', '[00:12:05] Calibration coefficients written', '[00:12:06] PASS']
      },
      {
        id: '4.7.8.2',
        step: '4.7.8.2 AC channel 50Hz Accuracy Test',
        details: 'Accuracy test: 0 of 15 results correct, status: FAIL.',
        result: 'FAIL',
        expanded: false,
        params: { channel: 'B', setup: 'TB1_TS/3.33Ohm', ch1: '100V', ch2: '1A', frequency: '50Hz', points: '15/15 failed' },
        log: [
          '[00:14:00] Starting accuracy sweep (15 points)...',
          '[00:14:01] Point 1/15: Expected 1.000V, Got 0.000V – FAIL',
          '[00:14:02] Point 2/15: Expected 2.000V, Got 0.000V – FAIL',
          '[00:14:15] All 15 points FAILED',
          '[00:14:15] ERROR: No signal detected on CH1. Check cable connection.',
          '[00:14:15] FAIL'
        ]
      },
      {
        id: '4.7.9.1',
        step: '4.7.9.1 AC channel 16Hz Calibration',
        details: 'Channel B, setup: TB1_TS / 3.33Ohm : CH1_100V – CH2_1A',
        result: 'OK',
        expanded: false,
        params: { channel: 'B', setup: 'TB1_TS/3.33Ohm', ch1: '100V', ch2: '1A', frequency: '16Hz' },
        log: ['[00:18:00] Applying 16Hz calibration...', '[00:18:08] Calibration complete', '[00:18:08] PASS']
      },
      {
        id: '4.7.9.2',
        step: '4.7.9.2 AC channel 16Hz Accuracy Test',
        details: 'Channel B, setup: TB1_TS / 3.33Ohm : CH1_100V – CH2_1A',
        result: 'OK',
        expanded: false,
        params: { channel: 'B', setup: 'TB1_TS/3.33Ohm', ch1: '100V', ch2: '1A', frequency: '16Hz', points: '15/15 passed' },
        log: ['[00:20:00] Accuracy sweep (15 points)...', '[00:20:15] All 15 points within tolerance', '[00:20:15] PASS']
      },
      {
        id: '4.7.10.1',
        step: '4.7.10.1 DC channel Calibration',
        details: 'Channel A, setup: TB2 : CH1_20mA – CH2_±20mA',
        result: 'OK',
        expanded: false,
        params: { channel: 'A', setup: 'TB2', ch1: '20mA', ch2: '±20mA' },
        log: ['[00:22:00] DC calibration in progress...', '[00:22:04] Complete', '[00:22:04] PASS']
      },
      {
        id: '4.7.10.2',
        step: '4.7.10.2 DC channel Accuracy Test',
        details: 'Channel A, setup: TB2 : CH1_20mA – CH2_±20mA',
        result: 'OK',
        expanded: false,
        params: { channel: 'A', setup: 'TB2', ch1: '20mA', ch2: '±20mA', points: '10/10 passed' },
        log: ['[00:24:00] DC accuracy sweep...', '[00:24:10] All points in range', '[00:24:10] PASS']
      },
      {
        id: '4.7.11',
        step: '4.7.11 InputOutput 24VDC Test',
        details: 'Min: 22.8V; Max: 25.2V',
        result: 'OK',
        expanded: false,
        params: { nominalV: '24V', minV: '22.8V', maxV: '25.2V', measured: '24.1V' },
        log: ['[00:30:00] 24V rail test...', '[00:30:02] Measured: 24.1V – within range', '[00:30:02] PASS']
      },
      {
        id: '4.7.12',
        step: '4.7.12 Input Test',
        details: 'Input Test',
        result: 'OK',
        expanded: false,
        params: { inputs: '8', tested: '8', passed: '8' },
        log: ['[00:35:00] Testing 8 digital inputs...', '[00:35:05] All inputs respond correctly', '[00:35:05] PASS']
      },
      {
        id: '4.7.13',
        step: '4.7.13 Input Output Test',
        details: 'Input Output Test',
        result: 'OK',
        expanded: false,
        params: { ios: '4', tested: '4', passed: '4' },
        log: ['[00:38:00] I/O loopback test...', '[00:38:03] All I/O pairs OK', '[00:38:03] PASS']
      },
      {
        id: '4.7.14',
        step: '4.7.14 Display and Led Test',
        details: 'Display',
        result: 'OK',
        expanded: false,
        params: { type: 'OLED', resolution: '128×64', leds: '4' },
        log: ['[00:42:00] Display pattern test...', '[00:42:08] LED test...', '[00:42:09] All passed', '[00:42:09] PASS']
      },
    ],

    // ── Device configuration (page 3) ──
    deviceConfig: {
      network: {
        eth0: { ip: '192.168.1.100', mask: '255.255.255.0', gw: '192.168.1.1', mac: 'AC:DE:48:00:00:01' },
        eth1: { ip: '10.0.0.50',    mask: '255.255.255.0', gw: '10.0.0.1',   mac: 'AC:DE:48:00:00:02' },
      },
      mobile: { apn: 'internet', imei: '355001092101533', tac: '35500109', network: 'LTE' },
      gps:    { protocol: 'NMEA 0183', port: '/dev/ttyS1', baud: '9600' },
      serial: { port: '/dev/ttyS0', baud: '115200', parity: 'None', dataBits: '8', stopBits: '1' },
      power:  { nominal: '24V', range: '22.8V – 25.2V', maxCurrent: '750mA' },
      acCh: { setup: 'TB1_TS / 3.33Ohm', ch1: 'CH1_100V', ch2: 'CH2_1A', freq50Hz: true, freq16Hz: true },
      dcCh: { setup: 'TB2', ch1: 'CH1_20mA', ch2: 'CH2_±20mA' },
    },

    // ── Settings (page 6) ──
    settings: {
      autoSave: true,
      darkMode: true,
      language: 'en',
      testTimeout: 60,
      logLevel: 'INFO',
      exportPath: 'C:\\TestResults\\',
      notifyOnFail: true,
    },

    // ── Test session info ──
    session: {
      duration: '00:47:05',
      progress: { current: 10, total: 18 },
      startTime: '2024-03-15T08:30:00',
      operator: 'Administrator',
    },
  }),

  getters: {
    overallStatus: (state) => {
      const hasFail = state.testResults.some(r => r.result === 'FAIL')
      return hasFail ? 'fail' : 'ok'
    },
    passCount: (state) => state.testResults.filter(r => r.result === 'OK').length,
    failCount: (state) => state.testResults.filter(r => r.result === 'FAIL').length,
  },

  actions: {
    toggleRow(id: string) {
      const row = this.testResults.find(r => r.id === id)
      if (row) row.expanded = !row.expanded
    },
    setActiveDrawing(id: string) {
      this.activeDrawing = id
      this.drawings.forEach(d => { d.active = d.id === id })
    },
  }
})
