<template>
  <div class="file-panel">
    <div class="panel-header">
      <span class="panel-title">文件</span>
      <button class="btn-icon" @click="onNewFile" title="新建文件">＋</button>
    </div>

    <div class="file-list">
      <div
        v-for="file in store.state.files"
        :key="file.id"
        class="file-item"
        :class="{ active: file.id === store.state.currentFileId }"
        @click="switchFile(file.id)"
      >
        <input
          v-if="editingId === file.id"
          class="file-name-input"
          v-model="editName"
          @blur="commitRename(file.id)"
          @keydown.enter="commitRename(file.id)"
          @keydown.escape="editingId = null"
          ref="nameInputRef"
          @click.stop
        />
        <span v-else class="file-name" @dblclick="startRename(file)">{{ file.name }}</span>

        <button
          class="btn-del"
          @click.stop="onDelete(file.id)"
          title="删除文件"
          :disabled="store.state.files.length <= 1"
        >✕</button>
      </div>
    </div>

    <!-- 首次新建提醒 -->
    <Teleport to="body">
      <div v-if="showWarning" class="warning-overlay" @click.self="dismiss">
        <div class="warning-dialog">
          <div class="warning-icon">⚠️</div>
          <h3>存储提示</h3>
          <p>
            所有文件存储在浏览器的 <strong>localStorage</strong> 中，<br />
            随时可能因清除缓存、更换设备等原因丢失。<br /><br />
            请务必 <strong>及时导出</strong> 重要的 DSL 代码到本地文件！
          </p>
          <div class="warning-actions">
            <button class="btn btn-cancel" @click="dismiss">我知道了</button>
            <button class="btn btn-primary" @click="confirmNew">创建文件</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, nextTick } from 'vue'
import { createFileStore, type FileEntry } from '../stores/fileStore'
import { editorStore } from '../stores/editorStore'

export default defineComponent({
  name: 'FilePanel',
  setup() {
    const store = createFileStore(editorStore)

    // ── 新建文件 ──────────────────────────────────────────
    const showWarning = computed(() => store.state.showNewFileWarning)

    function onNewFile() {
      if (store.state.showNewFileWarning) {
        // 第一次新建时显示警告，由 confirmNew 实际创建
        return
      }
      doNewFile()
    }

    function confirmNew() {
      store.dismissWarning()
      doNewFile()
    }

    function dismiss() {
      store.dismissWarning()
    }

    function doNewFile() {
      const id = store.newFile()
      // 自动进入重命名模式
      const file = store.state.files.find(f => f.id === id)
      if (file) startRename(file)
    }

    // ── 切换文件 ──────────────────────────────────────────
    function switchFile(id: string) {
      // 先保存当前 DSL 到当前文件
      const current = store.getCurrentFile()
      if (current) {
        store.saveCurrentFile(editorStore.state.dslCode)
      }
      store.switchFile(id)
    }

    // ── 删除文件 ──────────────────────────────────────────
    function onDelete(id: string) {
      // 先保存当前文件
      const current = store.getCurrentFile()
      if (current) {
        store.saveCurrentFile(editorStore.state.dslCode)
      }
      store.deleteFile(id)
    }

    // ── 重命名 ────────────────────────────────────────────
    const editingId = ref<string | null>(null)
    const editName = ref('')
    const nameInputRef = ref<HTMLInputElement | null>(null)

    function startRename(file: FileEntry) {
      editingId.value = file.id
      editName.value = file.name
      nextTick(() => {
        nameInputRef.value?.focus()
        nameInputRef.value?.select()
      })
    }

    function commitRename(id: string) {
      if (editName.value.trim()) {
        store.renameFile(id, editName.value.trim())
      }
      editingId.value = null
    }

    return {
      store,
      showWarning,
      editingId,
      editName,
      nameInputRef,
      onNewFile,
      confirmNew,
      dismiss,
      switchFile,
      onDelete,
      startRename,
      commitRename,
    }
  },
})
</script>

<style scoped>
.file-panel {
  width: 200px;
  min-width: 200px;
  background: #111827;
  border-right: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid #1e293b;
  background: #0f1729;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.btn-icon {
  width: 24px;
  height: 24px;
  background: transparent;
  color: #94a3b8;
  border: 1px solid #334155;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.btn-icon:hover {
  background: #1e3a5f;
  color: #e0e0e0;
  border-color: #e94560;
}

/* ── 文件列表 ──────────────────────────────────────────── */
.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  cursor: pointer;
  gap: 4px;
  transition: background 0.12s;
}
.file-item:hover {
  background: #1e293b;
}
.file-item.active {
  background: #1a3a5c;
  border-left: 3px solid #e94560;
  padding-left: 9px;
}

.file-name {
  flex: 1;
  font-size: 13px;
  color: #c9d1d9;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  user-select: none;
}

.file-name-input {
  flex: 1;
  font-size: 13px;
  background: #0d1117;
  color: #e0e0e0;
  border: 1px solid #e94560;
  border-radius: 3px;
  padding: 2px 4px;
  outline: none;
}

.btn-del {
  background: transparent;
  color: #555;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.12s;
}
.file-item:hover .btn-del {
  opacity: 1;
}
.btn-del:hover {
  color: #e94560;
  background: rgba(233, 69, 96, 0.15);
}
.btn-del:disabled {
  opacity: 0 !important;
  cursor: not-allowed;
}

/* ── 弹窗 ──────────────────────────────────────────────── */
.warning-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.warning-dialog {
  background: #1a1a2e;
  border: 1px solid #e94560;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 420px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.warning-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.warning-dialog h3 {
  font-size: 18px;
  color: #e94560;
  margin: 0 0 12px 0;
}

.warning-dialog p {
  font-size: 14px;
  color: #b0b0b0;
  line-height: 1.6;
  margin: 0 0 20px 0;
}

.warning-dialog strong {
  color: #e0e0e0;
}

.warning-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-cancel {
  background: #2d2d2d;
  color: #b0b0b0;
  border-color: #444;
}
.btn-cancel:hover {
  background: #3d3d3d;
}

.btn-primary {
  background: #e94560;
  color: #fff;
  border-color: #e94560;
}
.btn-primary:hover {
  background: #d63851;
}
</style>