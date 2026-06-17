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

    <!-- 颜色选择（调色板色块） -->
    <div class="tool-group">
      <label>颜色</label>
      <div class="color-buttons">
        <button
          v-for="c in availableColors"
          :key="c.code"
          class="color-btn"
          :class="{ active: state.currentColor === c.code }"
          :style="colorBtnStyle(c.hex)"
          :title="`${c.code} = ${c.hex}`"
          @click="state.currentColor = c.code"
        >
          {{ c.code }}
        </button>
      </div>
    </div>

    <!-- 缩放 -->
    <div class="tool-group">
      <label>缩放</label>
      <button class="zoom-btn" @click="state.scale = Math.max(1, state.scale - 1)" title="缩小">−</button>
      <input
        type="range"
        min="1"
        max="16"
        step="1"
        v-model.number="state.scale"
      />
      <button class="zoom-btn" @click="state.scale = Math.min(16, state.scale + 1)" title="放大">+</button>
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

    // 从 DSL 调色板 Map 中读取颜色，跳过透明色 (0)
    const availableColors = computed(() => {
      const palette = state.program?.palette
      if (!palette || palette.size === 0) {
        return [{ code: '1', hex: '#ffffff' }]
      }
      return Array.from(palette.entries())
        .filter(([code]) => code !== '0')
        .map(([code, hex]) => ({ code, hex }))
    })

    // 生成色块按钮样式：深色背景用白字，浅色背景用黑字
    function colorBtnStyle(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b
      const textColor = luminance > 140 ? '#000' : '#fff'
      return { background: hex, color: textColor }
    }

    return { state, tools, availableColors, colorBtnStyle }
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

.color-buttons {
  display: flex;
  gap: 3px;
}

.color-btn {
  width: 26px;
  height: 26px;
  min-width: 0;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  text-shadow: 0 0 3px rgba(0,0,0,0.6);
  transition: all .12s;
}

.color-btn:hover {
  transform: scale(1.18);
  z-index: 1;
}

.color-btn.active {
  border-color: #fff;
  box-shadow: 0 0 0 1px #fff, 0 0 6px rgba(255,255,255,0.4);
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

.zoom-btn {
  width: 24px;
  height: 24px;
  background: #0d1117;
  color: #c9d1d9;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.zoom-btn:hover {
  background: #1a4a7a;
}
</style>