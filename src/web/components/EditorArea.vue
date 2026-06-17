<template>
  <div class="editor-panel">
    <div class="panel-header">
      <span>DSL Code</span>
    </div>
    <textarea
      ref="editorRef"
      class="code-editor"
      :value="state.dslCode"
      @input="onInput"
      spellcheck="false"
      wrap="off"
    ></textarea>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, watch, onMounted } from 'vue'
import { editorStore } from '../stores/editorStore'
import { parseDSL, render } from '@core/index.js'

export default defineComponent({
  name: 'EditorArea',
  setup() {
    const store = editorStore
    const state = store.state
    const editorRef = ref<HTMLTextAreaElement | null>(null)

    // 初始加载默认 DSL 代码
    onMounted(() => {
      const defaultCode = `dsl 1
size 128 128
template block
palette {
  1 #989AA4
  2 #6B7280
  3 #4B5563
  4 #f39121
  5 #d4c218
}
series 1 2 3

// 底座
rect 0,0 127,127 10 1

// 凹陷 1
rect 16,16 111,111 12 3

// 突起 1
rect 40,40 88,88 8 1

// 中心
rect 52,52 75,75 6 2

// 底座 line
line 6,6 127,127 1 2
`
      store.parseAndRender(defaultCode)
    })

    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    function onInput(event: Event) {
      const target = event.target as HTMLTextAreaElement
      const code = target.value

      // 防抖：150ms 后解析
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        store.parseAndRender(code)
      }, 150)
    }

    return { state, editorRef, onInput }
  },
})
</script>

<style scoped>
.editor-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid #0f3460;
  height: 100%;
}

.panel-header {
  background: #16213e;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #0f3460;
}

.code-editor {
  flex: 1;
  width: 100%;
  background: #0d1117;
  color: #c9d1d9;
  border: none;
  padding: 16px;
  font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  tab-size: 2;
  outline: none;
}
</style>