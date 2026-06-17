import { reactive, provide } from 'vue'
import { parseDSL, generateDSL, type DSLProgram, type DSLError } from '@core/index.js'

// ============================================================================
// Types
// ============================================================================

export type ToolType = 'select' | 'rect' | 'line' | 'poly' | 'bitmap' | 'eyedropper'

export interface Point {
  x: number
  y: number
}

export interface EditorState {
  // DSL 代码
  dslCode: string
  program: DSLProgram | null
  errors: DSLError[]

  // 工具状态
  currentTool: ToolType
  currentColor: string
  lineRadius: number
  scale: number

  // 选中状态
  selectedCommandIndices: number[]
  highlightedLineNumbers: number[]

  // 鼠标
  mouseDSLPosition: Point | null

  // 撤销/重做
  undoStack: string[]
  redoStack: string[]

  // 工具预览
  toolPreview: any
}

// ============================================================================
// Store 创建
// ============================================================================

export function createEditorState(): EditorState {
  return reactive<EditorState>({
    dslCode: '',
    program: null,
    errors: [],
    currentTool: 'select',
    currentColor: '1',
    lineRadius: 0,
    scale: 4,
    selectedCommandIndices: [],
    highlightedLineNumbers: [],
    mouseDSLPosition: null,
    undoStack: [],
    redoStack: [],
    toolPreview: null,
  }) as EditorState
}

export interface EditorStore {
  state: EditorState
  parseAndRender: (code: string) => void
  syncCodeFromAST: () => void
  addCommand: (cmd: any) => void
  modifyCommand: (index: number, cmd: any) => void
  deleteCommand: (index: number) => void
  pushSnapshot: () => void
  undo: () => void
  redo: () => void
}

let storeInstance: EditorStore | null = null

export function createEditorStore(): EditorStore {
  if (storeInstance) return storeInstance

  const state = createEditorState()

  function parseAndRender(code: string): void {
    state.dslCode = code
    if (!code.trim()) {
      state.program = null
      state.errors = []
      return
    }
    const { program, errors } = parseDSL(code)
    state.program = program ?? null
    state.errors = errors
  }

  function syncCodeFromAST(): void {
    if (!state.program) return
    state.dslCode = generateDSL(state.program)
  }

  function addCommand(cmd: any): void {
    if (!state.program) return
    pushSnapshot()
    state.program.commands.push(cmd)
    syncCodeFromAST()
  }

  function modifyCommand(index: number, cmd: any): void {
    if (!state.program || index < 0 || index >= state.program.commands.length) return
    pushSnapshot()
    state.program.commands[index] = cmd
    syncCodeFromAST()
  }

  function deleteCommand(index: number): void {
    if (!state.program) return
    pushSnapshot()
    state.program.commands.splice(index, 1)
    syncCodeFromAST()
  }

  function pushSnapshot(): void {
    const current = state.dslCode
    if (state.undoStack.length > 0 && state.undoStack[state.undoStack.length - 1] === current) return
    state.undoStack.push(current)
    if (state.undoStack.length > 100) state.undoStack.shift()
    state.redoStack = []
  }

  function undo(): void {
    if (state.undoStack.length === 0) return
    state.redoStack.push(state.dslCode)
    const prev = state.undoStack.pop()!
    parseAndRender(prev)
  }

  function redo(): void {
    if (state.redoStack.length === 0) return
    state.undoStack.push(state.dslCode)
    const next = state.redoStack.pop()!
    parseAndRender(next)
  }

  storeInstance = { state, parseAndRender, syncCodeFromAST, addCommand, modifyCommand, deleteCommand, pushSnapshot, undo, redo }
  return storeInstance
}

export const editorStore = createEditorStore()