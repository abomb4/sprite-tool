import { reactive } from 'vue'
import { parseDSL, type DSLProgram, type DSLError, type Point } from '@core/index.js'

// ============================================================================
// Types
// ============================================================================

export type ToolType = 'select' | 'rect' | 'line' | 'poly' | 'bitmap' | 'eyedropper'

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

  // 强制刷新信号（递增计数器，CanvasRenderer watch 此值触发重绘）
  refreshKey: number
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
    refreshKey: 0,
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
  refreshCanvas: () => void
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

  /* ── 将单个绘图命令转为一行动态 DSL ─────────────────────── */

  function commandToDSL(cmd: any): string {
    switch (cmd.type) {
      case 'poly': {
        const pts = (cmd.points as Point[]).map(p => `${p.x},${p.y}`).join(' ')
        return `poly ${pts} ${cmd.color}`
      }
      case 'rect':
        return `rect ${cmd.p1.x},${cmd.p1.y} ${cmd.p2.x},${cmd.p2.y} 0 ${cmd.color}`
      case 'line':
        return `line ${cmd.p1.x},${cmd.p1.y} ${cmd.p2.x},${cmd.p2.y} 1 ${cmd.color}`
      default:
        return ''
    }
  }

  /** 将 AST 中的 commands 以 DSL 文本行形式返回（用于局部重写） */
  function commandsToDSL(commands: any[]): string {
    return commands.map(cmd => commandToDSL(cmd)).filter(Boolean).join('\n')
  }

  function syncCodeFromAST(): void {
    if (!state.program) return
    // 用本地命令序列化替换整个 commands 区域
    // 拆分头部（固定部分）和尾部（命令区）
    const headerEnd = findCommandsStart(state.dslCode)
    const cmdsText = commandsToDSL(state.program.commands)
    state.dslCode = headerEnd + '\n' + cmdsText + '\n'
    const { program, errors } = parseDSL(state.dslCode)
    state.program = program ?? null
    state.errors = errors
  }

  /** 在 DSL 源码中找到命令区的起始位置（跳过 header / palette / series / define 块） */
  function findCommandsStart(dsl: string): string {
    // 简单策略：保留所有以关键字 poly/rect/line/bitmap/use 开头的行之前的部分
    const lines = dsl.split('\n')
    const headerLines: string[] = []
    for (const line of lines) {
      const trimmed = line.trim()
      if (/^(poly|rect|line|bitmap|use)\b/.test(trimmed)) break
      headerLines.push(line)
    }
    // 如果没有找到命令起始行，返回原代码
    if (headerLines.length === lines.length) return dsl
    return headerLines.join('\n')
  }

  function addCommand(cmd: any): void {
    if (!state.program) return
    pushSnapshot()

    // 生成单行 DSL 并追加到现有代码末尾
    const line = commandToDSL(cmd)
    if (!line) return

    state.dslCode = state.dslCode.trimEnd() + '\n' + line + '\n'

    // 重新解析，更新 program 和 errors
    const { program, errors } = parseDSL(state.dslCode)
    state.program = program ?? null
    state.errors = errors
  }

  function modifyCommand(index: number, cmd: any): void {
    if (!state.program || index < 0 || index >= state.program.commands.length) return
    pushSnapshot()

    // 直接修改 AST，然后用 syncCodeFromAST 局部重写
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