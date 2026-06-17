<template>
  <div class="status-bar">
    <span v-if="state.mouseDSLPosition">
      坐标: ({{ state.mouseDSLPosition.x }}, {{ state.mouseDSLPosition.y }})
    </span>
    <span v-else>
      鼠标移入画布查看坐标
    </span>

    <span v-if="state.program">
      尺寸: {{ state.program.width }} × {{ state.program.height }}
    </span>

    <span v-if="state.errors.length > 0" class="error">
      错误: {{ state.errors.length }}
    </span>
    <span v-else class="success">
      ✓ 无错误
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { editorStore } from '../stores/editorStore'

export default defineComponent({
  name: 'StatusBar',
  setup() {
    const state = editorStore.state
    return { state }
  },
})
</script>

<style scoped>
.status-bar {
  background: #16213e;
  padding: 6px 12px;
  font-size: 12px;
  color: #888;
  border-top: 1px solid #0f3460;
  display: flex;
  gap: 16px;
}

.error {
  color: #e94560;
}

.success {
  color: #4ecdc4;
}
</style>