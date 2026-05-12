<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-3 border-b border-rail-border bg-rail-card flex-shrink-0">
      <div>
        <h1 class="font-sans text-sm font-semibold text-rail-header">Station Schema</h1>
        <p class="font-mono text-[10px] text-rail-dim mt-0.5">
          {{ activeDrawing ? activeDrawing.label : 'Select a drawing from the list' }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="zoomIn"
          class="px-2 py-1 rounded border border-rail-border text-rail-dim font-mono text-[10px] hover:text-rail-header hover:border-rail-accent/50 transition-all"
          title="Zoom in"
        >+</button>
        <span class="font-mono text-[10px] text-rail-dim w-10 text-center">{{ Math.round(zoom * 100) }}%</span>
        <button
          @click="zoomOut"
          class="px-2 py-1 rounded border border-rail-border text-rail-dim font-mono text-[10px] hover:text-rail-header hover:border-rail-accent/50 transition-all"
          title="Zoom out"
        >−</button>
        <button
          @click="resetZoom"
          class="px-2 py-1 rounded border border-rail-border text-rail-dim font-mono text-[10px] hover:text-rail-header hover:border-rail-accent/50 transition-all"
          title="Reset zoom"
        >⊙</button>
      </div>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar: drawing list -->
      <aside class="w-52 flex-shrink-0 border-r border-rail-border bg-rail-card overflow-y-auto">
        <div v-if="loadingList" class="p-4 font-mono text-[10px] text-rail-dim">Loading…</div>
        <div v-else-if="listError" class="p-4 font-mono text-[10px] text-red-400">{{ listError }}</div>
        <ul v-else class="py-1">
          <li
            v-for="d in drawings"
            :key="d.id"
            @click="selectDrawing(d.id)"
            class="flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors"
            :class="activeId === d.id
              ? 'bg-rail-accent/10 text-rail-accent border-l-2 border-rail-accent'
              : 'text-rail-dim hover:bg-rail-border/30 hover:text-rail-header border-l-2 border-transparent'"
          >
            <span
              class="w-1.5 h-1.5 rounded-full flex-shrink-0"
              :class="d.hasImage ? 'bg-green-500' : 'bg-rail-border'"
            ></span>
            <span class="font-mono text-[10px] leading-tight">{{ d.label || d.id }}</span>
          </li>
        </ul>
      </aside>

      <!-- Canvas -->
      <div
        ref="canvasRef"
        class="flex-1 overflow-hidden relative bg-rail-bg grid-bg flex items-center justify-center"
        @wheel.prevent="onWheel"
        @mousedown="startPan"
        @mousemove="doPan"
        @mouseup="endPan"
        @mouseleave="endPan"
        style="cursor: grab;"
      >
        <!-- Empty state -->
        <div
          v-if="!activeDrawing && !loadingDrawing"
          class="text-center"
        >
          <p class="font-mono text-[11px] text-rail-dim">No drawing selected</p>
          <p class="font-mono text-[10px] text-rail-border mt-1">Choose from the list on the left</p>
        </div>

        <!-- Loading -->
        <div v-else-if="loadingDrawing" class="font-mono text-[10px] text-rail-dim">Loading drawing…</div>

        <!-- Drawing error -->
        <div v-else-if="drawingError" class="font-mono text-[10px] text-red-400">{{ drawingError }}</div>

        <!-- No image yet -->
        <div
          v-else-if="activeDrawing && !activeDrawing.imageBase64"
          class="text-center"
        >
          <p class="font-mono text-[11px] text-rail-dim">No image uploaded for this drawing</p>
          <p class="font-mono text-[10px] text-rail-border mt-1">{{ activeDrawing.label }}</p>
        </div>

        <!-- SVG drawing (inline) -->
        <div
          v-else-if="isSvg"
          class="origin-center transition-transform duration-100"
          :style="transformStyle"
          v-html="svgContent"
        ></div>

        <!-- PNG drawing wrapped in SVG -->
        <svg
          v-else
          :viewBox="`0 0 ${imgWidth} ${imgHeight}`"
          xmlns="http://www.w3.org/2000/svg"
          class="origin-center transition-transform duration-100 max-w-full max-h-full"
          :style="transformStyle"
        >
          <image
            :href="imgSrc"
            x="0"
            y="0"
            :width="imgWidth"
            :height="imgHeight"
            preserveAspectRatio="xMidYMid meet"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/auth'

interface DrawingMeta {
  id: string
  label: string
  mimeType: string
  hasImage: boolean
  sortOrder: number
  updatedAt: string
}

interface DrawingFull extends DrawingMeta {
  imageBase64: string
}

const auth = useAuthStore()

const drawings     = ref<DrawingMeta[]>([])
const loadingList  = ref(false)
const listError    = ref<string | null>(null)

const activeId      = ref<string | null>(null)
const activeDrawing = ref<DrawingFull | null>(null)
const loadingDrawing = ref(false)
const drawingError  = ref<string | null>(null)

const zoom  = ref(1)
const panX  = ref(0)
const panY  = ref(0)
const isPanning = ref(false)
const lastMouse = ref({ x: 0, y: 0 })

const canvasRef = ref<HTMLDivElement | null>(null)

const imgWidth  = ref(1200)
const imgHeight = ref(900)

const transformStyle = computed(() =>
  `transform: translate(${panX.value}px, ${panY.value}px) scale(${zoom.value});`
)

const isSvg = computed(() =>
  activeDrawing.value?.mimeType === 'image/svg+xml'
)

const svgContent = computed(() => {
  if (!activeDrawing.value?.imageBase64) return ''
  try {
    return atob(activeDrawing.value.imageBase64)
  } catch {
    return ''
  }
})

const imgSrc = computed(() => {
  if (!activeDrawing.value?.imageBase64) return ''
  return `data:${activeDrawing.value.mimeType};base64,${activeDrawing.value.imageBase64}`
})

async function fetchList() {
  loadingList.value = true
  listError.value   = null
  try {
    const data = await $fetch<DrawingMeta[]>('/api/drawings', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    drawings.value = data
  } catch (e: any) {
    listError.value = e?.message ?? 'Failed to load drawings'
  } finally {
    loadingList.value = false
  }
}

async function selectDrawing(id: string) {
  if (activeId.value === id) return
  activeId.value      = id
  activeDrawing.value = null
  drawingError.value  = null
  loadingDrawing.value = true
  panX.value = 0
  panY.value = 0
  zoom.value = 1

  try {
    const data = await $fetch<DrawingFull>(`/api/drawings/${id}`, {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
    activeDrawing.value = data

    if (data.imageBase64 && !isSvg.value) {
      await measurePngSize(data.imageBase64, data.mimeType)
    }
  } catch (e: any) {
    drawingError.value = e?.message ?? 'Failed to load drawing'
  } finally {
    loadingDrawing.value = false
  }
}

function measurePngSize(base64: string, mimeType: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      imgWidth.value  = img.naturalWidth  || 1200
      imgHeight.value = img.naturalHeight || 900
      resolve()
    }
    img.onerror = () => resolve()
    img.src = `data:${mimeType};base64,${base64}`
  })
}

function zoomIn()    { zoom.value = Math.min(zoom.value * 1.2, 10) }
function zoomOut()   { zoom.value = Math.max(zoom.value / 1.2, 0.1) }
function resetZoom() { zoom.value = 1; panX.value = 0; panY.value = 0 }

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? 0.9 : 1.1
  zoom.value = Math.min(Math.max(zoom.value * delta, 0.1), 10)
}

function startPan(e: MouseEvent) {
  isPanning.value = true
  lastMouse.value = { x: e.clientX, y: e.clientY }
  if (canvasRef.value) canvasRef.value.style.cursor = 'grabbing'
}

function doPan(e: MouseEvent) {
  if (!isPanning.value) return
  panX.value += e.clientX - lastMouse.value.x
  panY.value += e.clientY - lastMouse.value.y
  lastMouse.value = { x: e.clientX, y: e.clientY }
}

function endPan() {
  isPanning.value = false
  if (canvasRef.value) canvasRef.value.style.cursor = 'grab'
}

onMounted(fetchList)
</script>
