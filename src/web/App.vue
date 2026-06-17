<template>
  <div class="app-container">
    <header class="app-header">
      <h1>Sprite DSL Editor</h1>
      <span class="subtitle">Mindustry Pixel Graphics Generator</span>
      <div class="header-actions">
        <button class="btn btn-sm" @click="undo" title="撤销 (Ctrl+Z)" :disabled="state.undoStack.length === 0">↩ 撤销</button>
        <button class="btn btn-sm" @click="redo" title="重做 (Ctrl+Shift+Z)" :disabled="state.redoStack.length === 0">↪ 重做</button>
      </div>
    </header>

    <div
      class="main-layout"
      ref="mainLayoutRef"
      @mousemove="onSplitterMouseMove"
      @mouseup="onSplitterMouseUp"
      @mouseleave="onSplitterMouseUp"
    >
      <!-- 左侧：文件面板 -->
      <FilePanel />

      <!-- 中间：代码编辑器 -->
      <div class="editor-panel" :style="{ width: splitterPos + 'px' }">
        <EditorArea />
      </div>

      <!-- 可拖拽分隔条 -->
      <div
        class="splitter"
        :class="{ dragging: isDragging }"
        @mousedown.prevent="onSplitterMouseDown"
      ></div>

      <!-- 右侧：工具栏 + 画布 + 状态栏 -->
      <div class="preview-panel" :style="{ width: 'calc(100% - ' + splitterPos + 'px)' }">
        <Toolbar />
        <div class="preview-area">
          <CanvasRenderer />
        </div>
        <StatusBar />
      </div>
    </div>

    <!-- 错误列表 -->
    <div v-if="state.errors.length > 0" class="error-list">
      <div v-for="(err, i) in state.errors" :key="i" class="error-item">
        <span>第 {{ err.line }} 行</span>{{ err.message }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted } from 'vue'
import { editorStore } from './stores/editorStore'
import { createFileStore } from './stores/fileStore'
import EditorArea from './components/EditorArea.vue'
import Toolbar from './components/Toolbar.vue'
import CanvasRenderer from './components/canvas/CanvasRenderer.vue'
import StatusBar from './components/StatusBar.vue'
import FilePanel from './components/FilePanel.vue'

const MIN_EDITOR_WIDTH = 200
const MIN_PREVIEW_WIDTH = 300

export default defineComponent({
  name: 'App',
  components: {
    EditorArea,
    Toolbar,
    CanvasRenderer,
    StatusBar,
    FilePanel,
  },
  setup() {
    const state = editorStore.state
    const store = editorStore

    // 拖拽分隔条
    const mainLayoutRef = ref<HTMLElement | null>(null)
    const isDragging = ref(false)
    const splitterPos = ref(600) // 左侧面板宽度（px），初始值
    const startMouseX = ref(0)
    const startSplitterPos = ref(0)

    function onSplitterMouseDown(event: MouseEvent) {
      isDragging.value = true
      startMouseX.value = event.clientX
      startSplitterPos.value = splitterPos.value
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    function onSplitterMouseMove(event: MouseEvent) {
      if (!isDragging.value) return
      const delta = event.clientX - startMouseX.value
      const newPos = startSplitterPos.value + delta

      // 约束最小值，确保两边都有空间
      const layout = mainLayoutRef.value
      if (!layout) return
      const layoutWidth = layout.getBoundingClientRect().width
      const clamped = Math.max(MIN_EDITOR_WIDTH, Math.min(newPos, layoutWidth - MIN_PREVIEW_WIDTH))
      splitterPos.value = clamped
    }

    function onSplitterMouseUp() {
      if (!isDragging.value) return
      isDragging.value = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    const undo = () => store.undo()
    const redo = () => store.redo()

    return {
      state, undo, redo,
      mainLayoutRef, isDragging, splitterPos,
      onSplitterMouseDown, onSplitterMouseMove, onSplitterMouseUp,
    }
  },
})
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #1a1a2e;
  color: #e0e0e0;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.app-header {
  background: #16213e;
  padding: 12px 20px;
  border-bottom: 1px solid #0f3460;
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.app-header h1 {
  font-size: 18px;
  font-weight: 600;
  color: #e94560;
  margin: 0;
}

.subtitle {
  font-size: 12px;
  color: #888;
  flex: 1;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.main-layout {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 左侧面板 */
.editor-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: none;
  height: 100%;
}

/* 分隔条 */
.splitter {
  width: 6px;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
  z-index: 10;
  transition: background 0.15s;
}
.splitter:hover,
.splitter.dragging {
  background: #e94560;
}
.splitter::after {
  content: '';
  position: absolute;
  left: -3px;
  right: -3px;
  top: 0;
  bottom: 0;
}

/* 右侧面板 */
.preview-panel {
  flex: 1;
  min-width: 300px;
  display: flex;
  flex-direction: column;
  background: #0d1117;
  border-left: none;
}

.preview-area {
  flex: 1;
  overflow: auto;
  padding: 0;
  background: repeating-conic-gradient(#2d2d2d 0% 25%, #1d1d1d 0% 50%) 50% / 20px 20px;
}

.error-list {
  max-height: 120px;
  overflow-y: auto;
  padding: 8px 12px;
  background: #1a1a2e;
  border-top: 1px solid #0f3460;
  font-size: 12px;
  flex-shrink: 0;
}

.error-item {
  padding: 4px 0;
  color: #e94560;
}

.error-item span {
  color: #888;
  margin-right: 8px;
}

.btn {
  background: #0f3460;
  color: #e0e0e0;
  border: 1px solid #333;
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 4px;
  cursor: pointer;
}

.btn:hover {
  background: #1a4a7a;
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>