<template>
  <div
    ref="viewportRef"
    class="canvas-viewport"
    @mousedown="onMouseDown"
    @wheel.prevent="onCanvasWheel"
  >
    <div
      class="canvas-grid"
      :style="{
        gridTemplateColumns: RULER_SIZE + 'px ' + canvasWidth + 'px',
        gridTemplateRows: RULER_SIZE + 'px ' + canvasHeight + 'px',
      }"
    >
      <!-- 左上角空白 -->
      <div class="ruler-corner"></div>

      <!-- X 轴尺条（顶部） -->
      <div class="ruler ruler-x">
        <div
          v-for="m in rulerMarksX"
          :key="'x' + m.v"
          class="rm"
          :style="{ left: m.px + 'px' }"
        >
          <div class="rm-tick"></div>
          <div class="rm-label">{{ m.v }}</div>
        </div>
      </div>

      <!-- Y 轴尺条（左侧） -->
      <div class="ruler ruler-y">
        <div
          v-for="m in rulerMarksY"
          :key="'y' + m.v"
          class="rm rm-y"
          :style="{ top: m.px + 'px' }"
        >
          <div class="rm-tick rm-tick-y"></div>
          <div class="rm-label rm-label-y">{{ m.v }}</div>
        </div>
      </div>

      <!-- 画布 -->
      <canvas
        ref="canvasRef"
        :width="canvasWidth"
        :height="canvasHeight"
        class="render-canvas"
        @mousemove="onMouseMove"
        @mouseleave="onMouseLeave"
        @click="onCanvasClick"
      ></canvas>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { editorStore } from '../../stores/editorStore'
import { render } from '@core/index.js'
import type { Point } from '@core/index.js'

export default defineComponent({
  name: 'CanvasRenderer',
  setup() {
    const store = editorStore
    const state = store.state
    const canvasRef = ref<HTMLCanvasElement | null>(null)
    const viewportRef = ref<HTMLElement | null>(null)

    // ── 坐标尺常量 ──────────────────────────────────────────
    const RULER_SIZE = 18

    // ── 多边形绘制状态（组件本地，不存 store） ──────────────
    const polyPoints = ref<Point[]>([])
    // 鼠标在画布上的 DSL 坐标（用于 live 预览）
    const mouseDSL = ref<Point | null>(null)
    // Shift 键是否按下
    const shiftHeld = ref(false)

    // ── 中键拖拽平移 ───────────────────────────────────────
    let isPanning = false
    let panStartX = 0
    let panStartY = 0
    let scrollStartX = 0
    let scrollStartY = 0

    // 单击/双击判定定时器
    let clickTimer: ReturnType<typeof setTimeout> | null = null
    let pendingPos: Point | null = null

    const canvasWidth = computed(() => {
      if (!state.program) return 512
      return state.program.header.width * state.scale
    })

    const canvasHeight = computed(() => {
      if (!state.program) return 512
      return state.program.header.height * state.scale
    })

    /* ── 坐标尺刻度 ──────────────────────────────────────────── */

    function getRulerInterval(): number {
      const s = state.scale
      if (s >= 8) return 8
      if (s >= 4) return 4
      if (s >= 2) return 2
      return 1
    }

    const rulerMarksX = computed(() => {
      if (!state.program) return []
      const w = state.program.header.width
      const interval = getRulerInterval()
      const s = state.scale
      const marks: { v: number; px: number }[] = []
      for (let x = 0; x < w; x += interval) {
        marks.push({ v: x, px: (x + 0.5) * s })
      }
      if ((w - 1) % interval !== 0) {
        marks.push({ v: w - 1, px: (w - 0.5) * s })
      }
      return marks
    })

    const rulerMarksY = computed(() => {
      if (!state.program) return []
      const h = state.program.header.height
      const interval = getRulerInterval()
      const s = state.scale
      const marks: { v: number; px: number }[] = []
      for (let y = 0; y < h; y += interval) {
        marks.push({ v: y, px: (y + 0.5) * s })
      }
      if ((h - 1) % interval !== 0) {
        marks.push({ v: h - 1, px: (h - 0.5) * s })
      }
      return marks
    })

    /* ── Shift 键监听 ─────────────────────────────────────── */

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Shift') {
        shiftHeld.value = true
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === 'Shift') {
        shiftHeld.value = false
      }
    }

    onMounted(() => {
      window.addEventListener('keydown', onKeyDown)
      window.addEventListener('keyup', onKeyUp)
      window.addEventListener('mousemove', onWindowMouseMove)
      window.addEventListener('mouseup', onWindowMouseUp)
      renderToCanvas()
    })

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onWindowMouseMove)
      window.removeEventListener('mouseup', onWindowMouseUp)
    })

    // 当 program 或 scale 变化时重新渲染
    watch(
      () => [state.program, state.scale] as const,
      () => {
        nextTick(() => renderToCanvas())
      },
      { deep: true }
    )

    // 切换工具时清空多边形预览
    watch(
      () => state.currentTool,
      (tool) => {
        if (tool !== 'poly' && polyPoints.value.length > 0) {
          polyPoints.value = []
          renderToCanvas()
        }
      }
    )

    /* ═══════════════════════════════════════════════════════════
       渲染主函数
       ═══════════════════════════════════════════════════════════ */

    function renderToCanvas() {
      const canvas = canvasRef.value
      if (!canvas || !state.program) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height, pixels } = render(state.program)

      // ── 渲染 DSL 图像 ────────────────────────────────────
      const imageData = new ImageData(pixels, width, height)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)

      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)

      // ── 多边形预览 ────────────────────────────────────────
      if (state.currentTool === 'poly' && polyPoints.value.length > 0) {
        drawPolyPreview(ctx)
      }
    }

    /* ═══════════════════════════════════════════════════════════
       Bresenham 像素线条绘制
       ═══════════════════════════════════════════════════════════ */

    /** 在两点之间画一排像素方块 */
    function drawPixelLine(
      ctx: CanvasRenderingContext2D,
      x0: number, y0: number,
      x1: number, y1: number,
      color: string,
    ) {
      const s = state.scale
      ctx.fillStyle = color

      const dx = Math.abs(x1 - x0)
      const dy = -Math.abs(y1 - y0)
      const sx = x0 < x1 ? 1 : -1
      const sy = y0 < y1 ? 1 : -1
      let err = dx + dy
      let cx = x0
      let cy = y0

      while (true) {
        ctx.fillRect(cx * s, cy * s, s, s)
        if (cx === x1 && cy === y1) break
        const e2 = 2 * err
        if (e2 >= dy) { err += dy; cx += sx }
        if (e2 <= dx) { err += dx; cy += sy }
      }
    }

    /* ═══════════════════════════════════════════════════════════
       多边形预览绘制（像素风格的线条 + 顶点）
       ═══════════════════════════════════════════════════════════ */

    function drawPolyPreview(ctx: CanvasRenderingContext2D) {
      const pts = polyPoints.value
      const s = state.scale
      const pixelColor = '#ffdd00'

      // ── 已确认顶点之间的像素线段 ─────────────────────────
      for (let i = 1; i < pts.length; i++) {
        drawPixelLine(ctx, pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y, pixelColor)
      }

      // ── 鼠标位置到最后一个顶点的 live 预览线 ─────────────
      if (mouseDSL.value) {
        const last = pts[pts.length - 1]
        let target = mouseDSL.value

        // Shift 按下时强制 45° 吸附
        if (shiftHeld.value) {
          target = snapTo45Deg(last, target)
        }

        // Live 线 — 半透明预览
        drawPixelLine(ctx, last.x, last.y, target.x, target.y, 'rgba(255, 221, 0, 0.45)')

        // 在鼠标位置画个半透明小方块
        ctx.fillStyle = 'rgba(255, 221, 0, 0.35)'
        ctx.fillRect(target.x * s, target.y * s, s, s)

        // 显示吸附后的坐标
        ctx.save()
        ctx.font = `${Math.max(10, s * 1.2)}px sans-serif`
        ctx.textBaseline = 'bottom'
        const label = `${target.x},${target.y}`
        const lx = (target.x + 0.5) * s
        const ly = (target.y + 0.5) * s
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        const tw = ctx.measureText(label).width
        ctx.fillRect(lx + 6, ly - s / 2 - 16, tw + 6, 16)
        ctx.fillStyle = '#ffdd00'
        ctx.fillText(label, lx + 9, ly - s / 2 - 2)
        ctx.restore()
      }

      // ── 顶点标记 ─────────────────────────────────────────
      const halfSize = Math.max(2, Math.round(s * 0.4))
      for (const pt of pts) {
        const cx = Math.round((pt.x + 0.5) * s)
        const cy = Math.round((pt.y + 0.5) * s)
        ctx.fillStyle = '#ffdd00'
        ctx.fillRect(cx - halfSize, cy - halfSize, halfSize * 2, halfSize * 2)
        ctx.fillStyle = '#000'
        ctx.fillRect(
          cx - Math.max(1, halfSize * 0.5),
          cy - Math.max(1, halfSize * 0.5),
          Math.max(1, halfSize),
          Math.max(1, halfSize),
        )
      }

      // ── 顶点坐标标签 ─────────────────────────────────────
      ctx.save()
      ctx.font = `${Math.max(10, s * 1.2)}px sans-serif`
      ctx.textBaseline = 'bottom'
      for (const pt of pts) {
        const cx = (pt.x + 0.5) * s
        const cy = (pt.y + 0.5) * s
        ctx.fillStyle = 'rgba(0,0,0,0.7)'
        const label = `${pt.x},${pt.y}`
        const tw = ctx.measureText(label).width
        ctx.fillRect(cx + halfSize + 2, cy - halfSize - 16, tw + 6, 16)
        ctx.fillStyle = '#ffdd00'
        ctx.fillText(label, cx + halfSize + 5, cy - halfSize - 2)
      }
      ctx.restore()
    }

    /* ═══════════════════════════════════════════════════════════
       45° 吸附
       ═══════════════════════════════════════════════════════════ */

    function snapTo45Deg(last: Point, current: Point): Point {
      const dx = current.x - last.x
      const dy = current.y - last.y
      if (dx === 0 && dy === 0) return current

      const angle = Math.atan2(dy, dx)
      const dist = Math.round(Math.sqrt(dx * dx + dy * dy))

      // 四舍五入到最近的 45° (π/4)
      const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4)

      return {
        x: last.x + Math.round(Math.cos(snappedAngle) * dist),
        y: last.y + Math.round(Math.sin(snappedAngle) * dist),
      }
    }

    /* ═══════════════════════════════════════════════════════════
       多边形 - 双击检测与闭合
       ═══════════════════════════════════════════════════════════ */

    function handlePolyClose() {
      if (polyPoints.value.length < 3) {
        polyPoints.value = []
        renderToCanvas()
        return
      }

      const points = polyPoints.value.map(p => ({ x: p.x, y: p.y }))
      const color = state.currentColor

      polyPoints.value = []
      renderToCanvas()

      store.addCommand({ type: 'poly', points, color })
    }

    /* ═══════════════════════════════════════════════════════════
       鼠标事件
       ═══════════════════════════════════════════════════════════ */

    function getDSLPos(event: MouseEvent): Point {
      const canvas = canvasRef.value!
      const rect = canvas.getBoundingClientRect()
      return {
        x: Math.floor((event.clientX - rect.left) / state.scale),
        y: Math.floor((event.clientY - rect.top) / state.scale),
      }
    }

    function onCanvasClick(event: MouseEvent) {
      if (state.currentTool !== 'poly') return
      let pos = getDSLPos(event)

      // Shift 按下时强制 45° 吸附到上一个顶点
      if (shiftHeld.value && polyPoints.value.length > 0) {
        const last = polyPoints.value[polyPoints.value.length - 1]
        pos = snapTo45Deg(last, pos)
      }

      // 已有待定单击 → 第二次快速点击 → 判定为双击，闭合多边形
      if (pendingPos) {
        clearTimeout(clickTimer!)
        clickTimer = null
        pendingPos = null
        handlePolyClose()
        return
      }

      // 去重（与上一个已确认的顶点）
      if (polyPoints.value.length > 0) {
        const last = polyPoints.value[polyPoints.value.length - 1]
        if (last.x === pos.x && last.y === pos.y) return
      }

      // 延迟 300ms 确认是单击还是双击
      pendingPos = pos
      clickTimer = setTimeout(() => {
        // 确认是单击 → 添加顶点
        pendingPos = null
        clickTimer = null
        // 再次去重（防止定时器期间有变化）
        if (polyPoints.value.length > 0) {
          const last = polyPoints.value[polyPoints.value.length - 1]
          if (last.x === pos.x && last.y === pos.y) return
        }
        polyPoints.value.push(pos)
        renderToCanvas()
      }, 300)
    }

    /* ═══════════════════════════════════════════════════════════
       中键拖拽平移
       ═══════════════════════════════════════════════════════════ */

    /** 找到可滚动的父容器 */
    function getScrollParent(): HTMLElement | null {
      return viewportRef.value?.closest('.preview-area') as HTMLElement ?? null
    }

    function onMouseDown(event: MouseEvent) {
      // 只响应中键（滚轮键）
      if (event.button !== 1) return
      event.preventDefault()

      const scrollEl = getScrollParent()
      if (!scrollEl) return

      isPanning = true
      panStartX = event.clientX
      panStartY = event.clientY
      scrollStartX = scrollEl.scrollLeft
      scrollStartY = scrollEl.scrollTop
      scrollEl.style.cursor = 'grabbing'
    }

    function onWindowMouseMove(event: MouseEvent) {
      if (!isPanning) return
      const scrollEl = getScrollParent()
      if (!scrollEl) return

      const dx = event.clientX - panStartX
      const dy = event.clientY - panStartY
      scrollEl.scrollLeft = scrollStartX - dx
      scrollEl.scrollTop = scrollStartY - dy
    }

    function onWindowMouseUp(event: MouseEvent) {
      if (event.button !== 1 || !isPanning) return
      isPanning = false
      const scrollEl = getScrollParent()
      if (scrollEl) scrollEl.style.cursor = ''
    }

    /* ═══════════════════════════════════════════════════════════
       Ctrl + 滚轮 缩放
       ═══════════════════════════════════════════════════════════ */

    function onCanvasWheel(event: WheelEvent) {
      if (!event.ctrlKey) return
      event.preventDefault()

      const delta = event.deltaY > 0 ? -1 : 1
      state.scale = Math.max(1, Math.min(16, state.scale + delta))
    }

    /* ── 光标位置追踪 ──────────────────────────────────────── */

    function onMouseMove(event: MouseEvent) {
      const canvas = canvasRef.value
      if (!canvas || !state.program) return

      const rect = canvas.getBoundingClientRect()
      const x = Math.floor((event.clientX - rect.left) / state.scale)
      const y = Math.floor((event.clientY - rect.top) / state.scale)

      state.mouseDSLPosition = { x, y }
      mouseDSL.value = { x, y }

      if (state.currentTool === 'poly') {
        // 有顶点时持续渲染 live 预览线
        if (polyPoints.value.length > 0) {
          renderToCanvas()
        }
        if (canvas.style.cursor !== 'crosshair') {
          canvas.style.cursor = 'crosshair'
        }
      }
    }

    function onMouseLeave() {
      state.mouseDSLPosition = null
      if (mouseDSL.value) {
        mouseDSL.value = null
        if (state.currentTool === 'poly' && polyPoints.value.length > 0) {
          renderToCanvas()
        }
      }
    }

    return {
      canvasRef,
      viewportRef,
      canvasWidth,
      canvasHeight,
      RULER_SIZE,
      rulerMarksX,
      rulerMarksY,
      onMouseMove,
      onMouseLeave,
      onCanvasClick,
      onMouseDown,
      onCanvasWheel,
    }
  },
})
</script>

<style scoped>
.canvas-viewport {
  display: inline-block;
  padding: 16px;
}

.canvas-grid {
  display: inline-grid;
  background: transparent;
  box-shadow: 0 0 0 1px #0f3460;
  flex-shrink: 0;
}

/* ── 左上角 ────────────────────────────────────────────── */
.ruler-corner {
  background: #16213e;
  border-right: 1px solid #0f3460;
  border-bottom: 1px solid #0f3460;
}

/* ── 尺条容器 ──────────────────────────────────────────── */
.ruler {
  position: relative;
  background: rgba(22, 33, 62, 0.92);
  overflow: visible;
}
.ruler-x {
  border-bottom: 1px solid #0f3460;
}
.ruler-y {
  border-right: 1px solid #0f3460;
}

/* ── 刻度标记 ──────────────────────────────────────────── */
.rm {
  position: absolute;
  top: 0;
}
.rm-y {
  left: 0;
  top: 0;
}

.rm-tick {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 5px;
  background: rgba(255, 255, 255, 0.45);
}
.rm-tick-y {
  width: 5px;
  height: 1px;
  top: 0;
  left: 0;
}

.rm-label {
  position: absolute;
  top: 6px;
  left: 0;
  transform: translateX(-50%);
  font: 9px sans-serif;
  color: rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  user-select: none;
  pointer-events: none;
}
.rm-label-y {
  top: 50%;
  left: auto;
  right: 4px;
  transform: translateY(-50%);
}

/* ── 画布 ──────────────────────────────────────────────── */
.render-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border: none;
  cursor: crosshair;
}
</style>