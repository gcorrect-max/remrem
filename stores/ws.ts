import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type WsStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type MessageHandler = (data: unknown) => void

// ─── WebSocket message types (LabVIEW → Frontend) ──────────────────────────
export interface WsMessage<T = unknown> {
  type: string
  data: T
}

// Incoming message payload types
export interface WsSessionUpdate {
  duration: string
  startTime: string
  operator: string
  progress: { current: number; total: number }
  overallStatus: 'ok' | 'fail'
}

export interface WsInstrumentUpdate {
  id: string
  status: 'ok' | 'warn' | 'error' | 'offline'
}

export interface WsTestStepUpdate {
  id: string
  status: 'ok' | 'fail' | 'running' | 'pending' | 'skipped'
}

export interface WsTestResultAdd {
  id: string
  step: string
  details: string
  result: 'OK' | 'FAIL' | 'SKIP'
  params: Record<string, string>
  log: string[]
}

export interface WsDeviceUpdate {
  model?: string
  articleNumber?: string
  serialNo?: string
  rtoFile?: string
  rtoRevision?: string
}

export interface WsLogLine {
  stepId: string
  line: string
  ts: string
}

// ─── Store ──────────────────────────────────────────────────────────────────
export const useWsStore = defineStore('ws', () => {
  const status    = ref<WsStatus>('disconnected')
  const error     = ref<string | null>(null)
  const latencyMs = ref<number | null>(null)
  const wsUrl     = ref<string>('')

  let socket: WebSocket | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let pingTimer: ReturnType<typeof setInterval> | null = null
  let pingTs = 0
  let reconnectAttempts = 0
  const MAX_RECONNECT_DELAY = 30_000

  const handlers = new Map<string, MessageHandler[]>()

  // ── Public: subscribe to a message type ──
  function on(type: string, handler: MessageHandler): () => void {
    if (!handlers.has(type)) handlers.set(type, [])
    handlers.get(type)!.push(handler)
    return () => off(type, handler)
  }

  function off(type: string, handler: MessageHandler) {
    const list = handlers.get(type)
    if (!list) return
    const idx = list.indexOf(handler)
    if (idx !== -1) list.splice(idx, 1)
  }

  // ── Public: send message to LabVIEW ──
  function send(type: string, data?: unknown) {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type, data }))
    }
  }

  // ── Internal: dispatch incoming message ──
  function dispatch(msg: WsMessage) {
    const list = handlers.get(msg.type) ?? []
    list.forEach(h => h(msg.data))
    // Also dispatch to wildcard listeners
    const wildcard = handlers.get('*') ?? []
    wildcard.forEach(h => h(msg))
  }

  // ── Connect ──
  function connect(url: string, token?: string) {
    wsUrl.value = url
    _clearTimers()

    if (socket && socket.readyState !== WebSocket.CLOSED) {
      socket.close()
    }

    status.value = 'connecting'
    error.value  = null

    // Attach token as query param if present
    const fullUrl = token ? `${url}?token=${encodeURIComponent(token)}` : url

    try {
      socket = new WebSocket(fullUrl)
    } catch (e) {
      status.value = 'error'
      error.value  = `Cannot open WebSocket: ${url}`
      _scheduleReconnect()
      return
    }

    socket.onopen = () => {
      status.value       = 'connected'
      error.value        = null
      reconnectAttempts  = 0
      // Ping every 30 s to keep connection alive and measure latency
      pingTimer = setInterval(() => {
        pingTs = Date.now()
        send('ping')
      }, 30_000)
      dispatch({ type: 'ws.connected', data: null })
    }

    socket.onclose = (ev) => {
      status.value = 'disconnected'
      _clearTimers()
      if (!ev.wasClean) {
        dispatch({ type: 'ws.disconnected', data: { code: ev.code, reason: ev.reason } })
        _scheduleReconnect()
      }
    }

    socket.onerror = () => {
      status.value = 'error'
      error.value  = 'WebSocket error'
    }

    socket.onmessage = (ev: MessageEvent) => {
      try {
        const msg: WsMessage = JSON.parse(ev.data as string)
        if (msg.type === 'pong') {
          latencyMs.value = Date.now() - pingTs
          return
        }
        dispatch(msg)
      } catch {
        // ignore malformed frames
      }
    }
  }

  function disconnect() {
    _clearTimers()
    socket?.close(1000, 'User logout')
    socket = null
    status.value = 'disconnected'
  }

  function _scheduleReconnect() {
    const delay = Math.min(1_000 * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY)
    reconnectAttempts++
    reconnectTimer = setTimeout(() => connect(wsUrl.value), delay)
  }

  function _clearTimers() {
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer);  reconnectTimer = null }
    if (pingTimer     !== null) { clearInterval(pingTimer);       pingTimer     = null }
  }

  // ── Computed ──
  const isConnected = computed(() => status.value === 'connected')
  const statusLabel = computed(() => ({
    connected:    'Connected',
    connecting:   'Connecting…',
    disconnected: 'Disconnected',
    error:        'Error',
  }[status.value]))

  const statusColor = computed(() => ({
    connected:    'text-rail-ok',
    connecting:   'text-rail-accent',
    disconnected: 'text-rail-dim',
    error:        'text-rail-fail',
  }[status.value]))

  const statusDot = computed(() => ({
    connected:    'bg-rail-ok',
    connecting:   'bg-rail-accent animate-pulse',
    disconnected: 'bg-rail-dim',
    error:        'bg-rail-fail',
  }[status.value]))

  return {
    status,
    error,
    latencyMs,
    wsUrl,
    isConnected,
    statusLabel,
    statusColor,
    statusDot,
    connect,
    disconnect,
    on,
    off,
    send,
  }
})
