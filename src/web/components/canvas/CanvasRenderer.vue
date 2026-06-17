<template>
  <canvas
    ref="canvasRef"
    :width="canvasWidth"
    :height="canvasHeight"
    class="render-canvas"
    @mousemove="onMouseMove"
    @mouseleave="onMouseLeave"
  ></canvas>
</template>

<script lang="ts">
import { computed, defineComponent, ref, watch, onMounted, nextTick } from 'vue'
import { editorStore } from '../../stores/editorStore'
import { render } from '@core/index.js'

export default defineComponent({
  name: 'CanvasRenderer',
  setup() {
    const store = editorStore
    const state = store.state
    const canvasRef = ref<HTMLCanvasElement | null>(null)

    const canvasWidth = computed(() => {
      if (!state.program) return 512
      return state.program.header.width * state.scale
    })

    const canvasHeight = computed(() => {
      if (!state.program) return 512
      return state.program.header.height * state.scale
    })

    // 当 program 或 scale 变化时重新渲染
    // 用 nextTick 确保 DOM canvas 尺寸已更新，避免画布被 resize 清空后丢失内容
    watch(
      () => [state.program, state.scale] as const,
      () => {
        nextTick(() => renderToCanvas())
      },
      { deep: true }
    )

    onMounted(() => {
      renderToCanvas()
    })

    function renderToCanvas() {
      const canvas = canvasRef.value
      if (!canvas || !state.program) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height, pixels } = render(state.program)

      // 创建 ImageData
      const imageData = new ImageData(pixels, width, height)
      const tempCanvas = document.createElement('canvas')
      tempCanvas.width = width
      tempCanvas.height = height
      const tempCtx = tempCanvas.getContext('2d')!
      tempCtx.putImageData(imageData, 0, 0)

      // 缩放到 canvas
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height)
    }

    function onMouseMove(event: MouseEvent) {
      const canvas = canvasRef.value
      if (!canvas || !state.program) return

      const rect = canvas.getBoundingClientRect()
      const x = Math.floor((event.clientX - rect.left) / state.scale)
      const y = Math.floor((event.clientY - rect.top) / state.scale)

      state.mouseDSLPosition = { x, y }
    }

    function onMouseLeave() {
      state.mouseDSLPosition = null
    }

    return {
      canvasRef,
      canvasWidth,
      canvasHeight,
      onMouseMove,
      onMouseLeave,
    }
  },
})
</script>

<style scoped>
.render-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  border: 1px solid #333;
  cursor: crosshair;
}
</style>