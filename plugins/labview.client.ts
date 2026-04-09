// plugins/labview.client.ts
// Runs only in the browser. Connects the WebSocket to LabVIEW after login
// and wires incoming messages to the dashboard store.
import { useWsStore }       from '~/stores/ws'
import { useAuthStore }     from '~/stores/auth'
import { useDashboardStore } from '~/stores/dashboard'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const ws     = useWsStore()
  const auth   = useAuthStore()
  const dash   = useDashboardStore()

  // ── Resolve WebSocket URL ──────────────────────────────────────────────
  // Returns null when no backend is explicitly configured (dev mode without LabVIEW)
  function resolveWsUrl(): string | null {
    if (config.public.wsUrl) return config.public.wsUrl as string
    if (config.public.labviewBaseUrl) {
      // Derive from explicit base URL
      const base = config.public.labviewBaseUrl as string
      const proto = base.startsWith('https') ? 'wss:' : 'ws:'
      const host  = base.replace(/^https?:\/\//, '').replace(/\/$/, '')
      return `${proto}//${host}${config.public.wsPath}`
    }
    // In production LabVIEW serves the page → same origin is safe
    // In dev without config → skip connection to avoid HMR path conflicts
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return null // No LabVIEW in dev → don't connect
    }
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${proto}//${window.location.host}${config.public.wsPath}`
  }

  // ── Connect / disconnect on auth change ───────────────────────────────
  watch(
    () => auth.isLoggedIn,
    (loggedIn) => {
      if (loggedIn) {
        const url = resolveWsUrl()
        if (url) ws.connect(url, auth.token ?? undefined)
        // else: dev mode without LabVIEW – stay disconnected
      } else {
        ws.disconnect()
      }
    },
    { immediate: true },
  )

  // ── Wire WebSocket messages → dashboard store ─────────────────────────

  ws.on('session.update', (data) => {
    Object.assign(dash.session, data)
  })

  ws.on('device.update', (data) => {
    Object.assign(dash.device, data)
  })

  ws.on('device.subsystems', (data: unknown[]) => {
    dash.subsystems.splice(0, dash.subsystems.length, ...(data as typeof dash.subsystems))
  })

  ws.on('instruments.update', (data: unknown[]) => {
    const list = data as Array<{ id: string; status: string }>
    list.forEach(incoming => {
      const inst = dash.instruments.find(i => i.id === incoming.id)
      if (inst) inst.status = incoming.status
    })
  })

  ws.on('instrument.update', (data: { id: string; status: string }) => {
    const inst = dash.instruments.find(i => i.id === data.id)
    if (inst) inst.status = data.status
  })

  ws.on('test-step.update', (data: { id: string; status: string }) => {
    const step = dash.testSteps.find(s => s.id === data.id)
    if (step) step.status = data.status as typeof step.status
  })

  ws.on('test-steps.reset', (data: unknown[]) => {
    const steps = data as typeof dash.testSteps
    dash.testSteps.splice(0, dash.testSteps.length, ...steps)
  })

  ws.on('test-result.add', (data: unknown) => {
    const result = data as typeof dash.testResults[0]
    const idx = dash.testResults.findIndex(r => r.id === result.id)
    if (idx !== -1) dash.testResults[idx] = result
    else dash.testResults.push(result)
  })

  ws.on('test-results.reset', (data: unknown[]) => {
    const results = data as typeof dash.testResults
    dash.testResults.splice(0, dash.testResults.length, ...results)
  })

  ws.on('test-result.log', (data: { stepId: string; line: string }) => {
    const result = dash.testResults.find(r => r.id === data.stepId)
    if (result) result.log.push(data.line)
  })

  ws.on('session.started', () => {
    // Reset steps to 'pending' when a new session starts
    dash.testSteps.forEach(s => { s.status = 'pending' })
    dash.testResults.splice(0, dash.testResults.length)
  })
})
