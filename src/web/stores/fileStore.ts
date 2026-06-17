import { reactive, watch } from 'vue'

// ============================================================================
// Types
// ============================================================================

export interface FileEntry {
  id: string
  name: string
  dslCode: string
  createdAt: number
  updatedAt: number
}

export interface FileStore {
  state: {
    files: FileEntry[]
    currentFileId: string | null
    showNewFileWarning: boolean
  }
  newFile: () => string
  deleteFile: (id: string) => boolean
  renameFile: (id: string, name: string) => void
  switchFile: (id: string) => void
  getCurrentFile: () => FileEntry | null
  saveCurrentFile: (dslCode: string) => void
  dismissWarning: () => void
}

// ============================================================================
// Keys
// ============================================================================

const STORAGE_FILES = 'sprite-dsl-files'
const STORAGE_ACTIVE = 'sprite-dsl-active-file'

// ============================================================================
// Helpers
// ============================================================================

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function loadFiles(): FileEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_FILES)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return []
}

function saveFiles(files: FileEntry[]) {
  try {
    localStorage.setItem(STORAGE_FILES, JSON.stringify(files))
  } catch { /* ignore */ }
}

function loadActiveId(): string | null {
  try {
    return localStorage.getItem(STORAGE_ACTIVE)
  } catch {
    return null
  }
}

function saveActiveId(id: string | null) {
  try {
    if (id) {
      localStorage.setItem(STORAGE_ACTIVE, id)
    } else {
      localStorage.removeItem(STORAGE_ACTIVE)
    }
  } catch { /* ignore */ }
}

// ============================================================================
// Factory
// ============================================================================

const DEFAULT_CODE = `size 16 16
color 0=00000000
color 1=ffffffff
`

let storeInstance: FileStore | null = null

export function createFileStore(editorStore: { parseAndRender: (code: string) => void; state: { dslCode: string } }): FileStore {
  if (storeInstance) return storeInstance

  const files = loadFiles()
  const activeId = loadActiveId()

  const state = reactive({
    files: files as FileEntry[],
    currentFileId: activeId && files.some(f => f.id === activeId) ? activeId : null,
    showNewFileWarning: files.length === 0, // 首次使用时显示警告
  })

  // ── 如果已有文件，自动加载第一个或活跃文件 ────────────────
  function ensureFileLoaded() {
    if (state.currentFileId) {
      const file = state.files.find(f => f.id === state.currentFileId)
      if (file) {
        editorStore.parseAndRender(file.dslCode)
        return
      }
    }
    if (state.files.length > 0) {
      state.currentFileId = state.files[0].id
      saveActiveId(state.currentFileId)
      editorStore.parseAndRender(state.files[0].dslCode)
    }
  }
  ensureFileLoaded()

  // ── watch 当前文件变化，自动保存到 localStorage ──────────
  watch(
    () => state.files.map(f => f.dslCode),
    () => {
      saveFiles(state.files as FileEntry[])
    },
    { deep: true }
  )

  // ================================================================
  // API
  // ================================================================

  function newFile(): string {
    const id = genId()
    const now = Date.now()
    const file: FileEntry = {
      id,
      name: `新文件 ${state.files.length + 1}`,
      dslCode: DEFAULT_CODE,
      createdAt: now,
      updatedAt: now,
    }
    state.files.push(file)
    state.currentFileId = id
    saveActiveId(id)
    editorStore.parseAndRender(file.dslCode)
    return id
  }

  function deleteFile(id: string): boolean {
    if (state.files.length <= 1) return false // 保留至少一个文件
    const idx = state.files.findIndex(f => f.id === id)
    if (idx === -1) return false
    state.files.splice(idx, 1)

    if (state.currentFileId === id) {
      // 切换到下一个可用文件
      const nextIdx = Math.min(idx, state.files.length - 1)
      state.currentFileId = state.files[nextIdx].id
      saveActiveId(state.currentFileId)
      editorStore.parseAndRender(state.files[nextIdx].dslCode)
    }
    return true
  }

  function renameFile(id: string, name: string) {
    const file = state.files.find(f => f.id === id)
    if (file) {
      file.name = name
      file.updatedAt = Date.now()
    }
  }

  function switchFile(id: string) {
    if (id === state.currentFileId) return
    const file = state.files.find(f => f.id === id)
    if (!file) return

    // 保存当前文件的代码
    const current = state.files.find(f => f.id === state.currentFileId)
    if (current) {
      current.dslCode = editorStore.state.dslCode
      current.updatedAt = Date.now()
    }

    state.currentFileId = id
    saveActiveId(id)
    editorStore.parseAndRender(file.dslCode)
  }

  function getCurrentFile(): FileEntry | null {
    return state.files.find(f => f.id === state.currentFileId) ?? null
  }

  function saveCurrentFile(dslCode: string) {
    const file = state.files.find(f => f.id === state.currentFileId)
    if (file) {
      file.dslCode = dslCode
      file.updatedAt = Date.now()
    }
  }

  function dismissWarning() {
    state.showNewFileWarning = false
  }

  storeInstance = { state, newFile, deleteFile, renameFile, switchFile, getCurrentFile, saveCurrentFile, dismissWarning }
  return storeInstance
}