<template>
  <div class="toolbar">
    <!-- 工具按钮 -->
    <div class="tool-group">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :class="['tool-btn', { active: state.currentTool === tool.id }]"
        :title="tool.label"
        @click="state.currentTool = tool.id"
      >
        {{ tool.icon }}
      </button>
    </div>

    <!-- 颜色选择 -->
    <div class="tool-group">
      <label>颜色</label>
      <select v-model="state.currentColor">
        <option v-for="c in availableColors" :key="c.code" :value="c.code">{{ c.code }}</option>
      </select>
    </div>

    <!-- 缩放 -->
    <div class="tool-group">
      <label>缩放</label>
      <input
        type="range"
        min="1"
        max="16"
        step="1"
        v-model.number="state.scale"
      />
      <span class="scale-value">{{ state.scale }}x</span>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from 'vue'
import { editorStore, type ToolType } from '../stores/editorStore'

export default defineComponent({
  name: 'Toolbar',
  setup() {
    const state = editorStore.state

    const tools = [
      { id: 'select' as ToolType, icon: '⬚', label: '选择/移动 (V)' },
      { id: 'rect' as ToolType, icon: '▬', label: '矩形 (R)' },
      { id: 'line' as ToolType, icon: '╱', label: '线条 (L)' },
      { id: 'poly' as ToolType, icon: '⬠', label: '多边形 (P)' },
      { id: 'bitmap' as ToolType, icon: '✎', label: '画笔 (B)' },
      { id: 'eyedropper' as ToolType, icon: '💧', label: '取色 (I)' },
    ]

    const availableColors = computed(() => {
      const colors = state.program?.palette ?? []
      if (colors.length === 0) return [{ code: '1', hex: '#FFFFFF' }]
      return colors
    })

    return { state, tools, availableColors }
  },
})
</script>

<style scoped>
.toolbar {
  background: #16213e;
  padding: 8px 12px;
  border-bottom: 1px solid #0f3460;
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.tool-group {
  display: flex;
  gap: 4px;
  align-items: center;
}

.tool-group label {
  font-size: 11px;
  color: #888;
  margin-right: 4px;
}

.tool-btn {
  width: 32px;
  height: 32px;
  background: #0d1117;
  color: #c9d1d9;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tool-btn:hover {
  background: #1a4a7a;
}

.tool-btn.active {
  background: #e94560;
  border-color: #e94560;
  color: white;
}

select {
  background: #0d1117;
  color: #c9d1d9;
  border: 1px solid #333;
  padding: 4px 8px;
  font-size: 12px;
  border-radius: 4px;
}

input[type="range"] {
  width: 80px;
  accent-color: #e94560;
}

.scale-value {
  font-size: 11px;
  color: #888;
  min-width: 24px;
}
</style>