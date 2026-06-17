/**
 * Mindustry Sprite DSL - Core Parser & Renderer
 *
 * 本模块提供 Mindustry 像素图形 DSL 的核心功能，可复用于浏览器和 Node.js。
 *
 * ## 公开 API
 *
 * ### 解析 & 渲染
 *
 * ```ts
 * // 一步到位：解析 DSL 文本并渲染为像素数据
 * renderDSL(input: string): { result?: RenderResult; errors: DSLError[] }
 *
 * // 分步执行：先解析为 AST
 * parseDSL(input: string): { program?: DSLProgram; errors: DSLError[] }
 *
 * // 分步执行：渲染 AST 为像素数据
 * render(program: DSLProgram): RenderResult
 * ```
 *
 * ### 输入输出
 *
 * | 函数 | 输入 | 输出 |
 * |------|------|------|
 * | `parseDSL` | DSL 源代码字符串 | `DSLProgram` 或错误列表 |
 * | `render` | `DSLProgram` | `RenderResult`（RGBA 像素数组） |
 * | `renderDSL` | DSL 源代码字符串 | `RenderResult` 或错误列表 |
 *
 * ### 使用示例
 *
 * ```ts
 * import { renderDSL } from "./core.js";
 *
 * const code = `
 * dsl 1
 * size 16 16
 * template unit
 * palette {
 *   1 #FF3333
 *   2 #AA0000
 * }
 * rect 0,0 7,15 1
 * `;
 *
 * const { result, errors } = renderDSL(code);
 * if (result) {
 *   // result.pixels: Uint8ClampedArray (RGBA)
 *   // result.width, result.height: 图像尺寸
 * }
 * ```
 */

// ============================================================================
// Types (公开类型定义)
// ============================================================================

/** 二维坐标点 */
export interface Point {
  /** x 坐标（水平方向，向右递增） */
  x: number;
  /** y 坐标（垂直方向，向下递增） */
  y: number;
}

/** 颜色定义（调色板条目） */
export interface ColorDef {
  /** 颜色代码（单字符，如 "1", "a", "A"） */
  code: string;
  /** 十六进制颜色值（如 "#FF3333"） */
  hex: string;
}

/** 色阶系列定义 */
export interface SeriesDef {
  /** 颜色代码列表，按 亮→暗 排列 */
  colors: string[];
}

/** 矩形绘图命令 */
export interface RectCmd {
  type: "rect";
  /** 左上角坐标 */
  p1: Point;
  /** 右下角坐标 */
  p2: Point;
  /** 切角边长（0 表示无切角） */
  chamfer: number;
  /** 颜色代码 */
  color: string;
}

/** 线段绘图命令 */
export interface LineCmd {
  type: "line";
  /** 起点坐标 */
  p1: Point;
  /** 终点坐标 */
  p2: Point;
  /** 线段半径（实际宽度 = 2×radius + 1） */
  radius: number;
  /** 颜色代码 */
  color: string;
}

/** 多边形绘图命令 */
export interface PolyCmd {
  type: "poly";
  /** 多边形顶点列表（至少 3 个） */
  points: Point[];
  /** 填充颜色代码 */
  color: string;
}

/** 位图绘图命令 */
export interface BitmapCmd {
  type: "bitmap";
  /** 位图左上角坐标 */
  origin: Point;
  /** 位图行数据，每行为颜色代码字符串（"0" = 透明） */
  rows: string[];
}

/** 绘图命令联合类型 */
export type DrawCommand = RectCmd | LineCmd | PolyCmd | BitmapCmd;

/** 可复用图形定义块 */
export interface DefineBlock {
  /** 图形名称 */
  name: string;
  /** 包含的绘图命令 */
  commands: DrawCommand[];
}

/** 变换类型 */
export type Transform =
  | "fx"    // 水平翻转
  | "fy"    // 垂直翻转
  | "r90"   // 顺时针旋转 90°
  | "r180"  // 旋转 180°
  | "r270"; // 顺时针旋转 270°

/** use 命令（使用已定义的图形） */
export interface UseCmd {
  type: "use";
  /** 引用的图形名称 */
  name: string;
  /** 变换列表（按顺序应用） */
  transforms: Transform[];
  /** 放置位置（变换后图形的左上角） */
  position: Point;
}

/** 对称模板类型 */
export type TemplateType =
  | "none"   // 无对称
  | "unit"   // 左右对称（水平镜像，颜色不变）
  | "turret" // 左右对称（水平镜像，颜色反转）
  | "block"; // 四向对称（水平+垂直镜像，垂直时颜色反转）

/** DSL 头部信息 */
export interface DSLHeader {
  /** DSL 版本号 */
  version: number;
  /** 图像宽度（像素） */
  width: number;
  /** 图像高度（像素） */
  height: number;
  /** 对称模板类型 */
  template: TemplateType;
}

/** 解析后的 DSL 程序（AST） */
export interface DSLProgram {
  /** 头部信息 */
  header: DSLHeader;
  /** 调色板（颜色代码 → 十六进制值） */
  palette: Map<string, string>;
  /** 色阶系列列表 */
  series: SeriesDef[];
  /** 已定义的图形块 */
  defines: Map<string, DefineBlock>;
  /** 绘图命令列表 */
  commands: (DrawCommand | UseCmd)[];
}

/** 渲染结果 */
export interface RenderResult {
  /** 图像宽度 */
  width: number;
  /** 图像高度 */
  height: number;
  /** RGBA 像素数据（Uint8ClampedArray，每 4 字节为一个像素） */
  pixels: Uint8ClampedArray;
}

/** DSL 解析/编译错误 */
export interface DSLError {
  /** 错误所在行号（从 1 开始） */
  line: number;
  /** 错误所在列号（从 1 开始） */
  column: number;
  /** 错误描述信息 */
  message: string;
}

// ============================================================================
// Internal: Reserved keywords (内部实现 - 保留关键字)
// ============================================================================

/** 保留关键字，不能用作 define 名称 */
const RESERVED_NAMES = new Set(["fx", "fy", "r90", "r180", "r270"]);

/** 有效的模板类型 */
const TEMPLATE_TYPES = new Set(["none", "unit", "turret", "block"]);

/** 变换关键字 */
const TRANSFORM_KEYWORDS = new Set(["fx", "fy", "r90", "r180", "r270"]);

// ============================================================================
// Internal: Tokenizer (内部实现 - 词法分析器)
// ============================================================================

/**
 * Token 类型
 * - keyword: 关键字或标识符（如 "dsl", "size", "rect", "define"）
 * - number: 数字（如 "16", "32"）
 * - string: 字符串（如 "#FF3333"）
 * - color: 单字符颜色代码（如 "1", "a", "0"）
 * - comma: 逗号
 * - lbrace: 左花括号
 * - rbrace: 右花括号
 * - newline: 换行符
 */
interface Token {
  type: "keyword" | "number" | "string" | "color" | "comma" | "lbrace" | "rbrace" | "newline";
  value: string;
  line: number;
  column: number;
}

/**
 * 词法分析：将 DSL 源代码转换为 token 序列
 *
 * @param input - DSL 源代码
 * @returns Token 数组
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let pos = 0;
  let line = 1;
  let column = 1;

  while (pos < input.length) {
    const ch = input[pos];

    // Newline
    if (ch === "\n") {
      tokens.push({ type: "newline", value: "\n", line, column });
      pos++;
      line++;
      column = 1;
      continue;
    }

    // Carriage return
    if (ch === "\r") {
      pos++;
      if (pos < input.length && input[pos] === "\n") {
        tokens.push({ type: "newline", value: "\n", line, column });
        pos++;
        line++;
        column = 1;
      }
      continue;
    }

    // Skip spaces and tabs
    if (ch === " " || ch === "\t") {
      pos++;
      column++;
      continue;
    }

    // Comments
    if (ch === "/" && pos + 1 < input.length && input[pos + 1] === "/") {
      while (pos < input.length && input[pos] !== "\n") {
        pos++;
        column++;
      }
      continue;
    }

    // Comma
    if (ch === ",") {
      tokens.push({ type: "comma", value: ",", line, column });
      pos++;
      column++;
      continue;
    }

    // Braces
    if (ch === "{") {
      tokens.push({ type: "lbrace", value: "{", line, column });
      pos++;
      column++;
      continue;
    }
    if (ch === "}") {
      tokens.push({ type: "rbrace", value: "}", line, column });
      pos++;
      column++;
      continue;
    }

    // Hex color (#RRGGBB)
    if (ch === "#") {
      let hex = "#";
      pos++;
      column++;
      for (let i = 0; i < 6 && pos < input.length; i++) {
        hex += input[pos];
        pos++;
        column++;
      }
      tokens.push({ type: "string", value: hex, line, column: column - hex.length });
      continue;
    }

    // Single character color codes (1-9) - always tokenized as color
    if (ch >= "1" && ch <= "9") {
      // Peek ahead: if next char is also a digit, this is a number
      if (pos + 1 < input.length && input[pos + 1] >= "0" && input[pos + 1] <= "9") {
        // Multi-digit number
        let num = ch;
        pos++;
        column++;
        while (pos < input.length && input[pos] >= "0" && input[pos] <= "9") {
          num += input[pos];
          pos++;
          column++;
        }
        tokens.push({ type: "number", value: num, line, column: column - num.length });
        continue;
      }
      // Single digit - always a color code
      tokens.push({ type: "color", value: ch, line, column });
      pos++;
      column++;
      continue;
    }

    // 0 is transparent
    if (ch === "0") {
      tokens.push({ type: "color", value: "0", line, column });
      pos++;
      column++;
      continue;
    }

    // Negative numbers
    if (ch === "-" && pos + 1 < input.length && input[pos + 1] >= "0" && input[pos + 1] <= "9") {
      let num = ch;
      pos++;
      column++;
      while (pos < input.length && input[pos] >= "0" && input[pos] <= "9") {
        num += input[pos];
        pos++;
        column++;
      }
      tokens.push({ type: "number", value: num, line, column: column - num.length });
      continue;
    }

    // Letters, underscores, etc. (keywords/identifiers)
    if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
      let word = ch;
      pos++;
      column++;
      while (pos < input.length && (
        (input[pos] >= "a" && input[pos] <= "z") ||
        (input[pos] >= "A" && input[pos] <= "Z") ||
        (input[pos] >= "0" && input[pos] <= "9") ||
        input[pos] === "_" || input[pos] === "-"
      )) {
        word += input[pos];
        pos++;
        column++;
      }
      tokens.push({ type: "keyword", value: word, line, column: column - word.length });
      continue;
    }

    // Unknown character, skip
    pos++;
    column++;
  }

  return tokens;
}

// ============================================================================
// Internal: Parser (内部实现 - 语法分析器)
// ============================================================================

/**
 * 语法分析器：将 token 序列转换为 AST (DSLProgram)
 */
class Parser {
  private tokens: Token[];
  private pos = 0;
  private errors: DSLError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private skipNewlines(): void {
    while (this.pos < this.tokens.length && this.peek()?.type === "newline") {
      this.pos++;
    }
  }

  private expect(type: string): Token {
    const tok = this.peek();
    if (!tok || tok.type !== type) {
      this.error(`Expected ${type}, got ${tok?.type ?? "end of input"}`);
      return tok!;
    }
    return this.advance();
  }

  private expectKeyword(value: string): Token {
    const tok = this.peek();
    if (!tok || tok.type !== "keyword" || tok.value !== value) {
      this.error(`Expected '${value}', got ${tok?.value ?? "end of input"}`);
      return tok!;
    }
    return this.advance();
  }

  private error(message: string): void {
    const tok = this.peek();
    this.errors.push({
      line: tok?.line ?? 0,
      column: tok?.column ?? 0,
      message,
    });
  }

  private expectNumber(): number | undefined {
    const tok = this.peek();
    if (!tok || (tok.type !== "number" && tok.type !== "color")) {
      this.error("Expected number");
      return undefined;
    }
    this.advance();
    return parseInt(tok.value, 10);
  }

  private parsePoint(): Point | undefined {
    const xTok = this.peek();
    if (!xTok) {
      this.error("Expected coordinate");
      return undefined;
    }

    let x: number;
    if (xTok.type === "number" || xTok.type === "color") {
      x = parseInt(this.advance().value, 10);
    } else {
      this.error("Expected coordinate");
      return undefined;
    }

    const comma = this.peek();
    if (!comma || comma.type !== "comma") {
      this.error("Expected ',' in coordinate");
      return undefined;
    }
    this.advance();

    const yTok = this.peek();
    if (!yTok || (yTok.type !== "number" && yTok.type !== "color")) {
      this.error("Expected y coordinate");
      return undefined;
    }
    const y = parseInt(this.advance().value, 10);

    return { x, y };
  }

  private parseColor(): string | undefined {
    const tok = this.peek();
    if (!tok || (tok.type !== "color" && tok.type !== "number")) {
      this.error("Expected color code");
      return undefined;
    }
    return this.advance().value;
  }

  private parseRect(): RectCmd | undefined {
    const p1 = this.parsePoint();
    if (!p1) return undefined;

    const p2 = this.parsePoint();
    if (!p2) return undefined;

    const chamfer = this.expectNumber();
    if (chamfer === undefined) return undefined;

    const color = this.parseColor();
    if (!color) return undefined;

    return { type: "rect", p1, p2, chamfer, color };
  }

  private parseLine(): LineCmd | undefined {
    const p1 = this.parsePoint();
    if (!p1) return undefined;

    const p2 = this.parsePoint();
    if (!p2) return undefined;

    const radius = this.expectNumber();
    if (radius === undefined) return undefined;

    const color = this.parseColor();
    if (!color) return undefined;

    return { type: "line", p1, p2, radius, color };
  }

  private parsePoly(): PolyCmd | undefined {
    const points: Point[] = [];

    // Parse at least 3 points
    for (let i = 0; i < 3; i++) {
      const p = this.parsePoint();
      if (!p) return undefined;
      points.push(p);
    }

    // Parse more points until we hit something that's not a number/color followed by comma
    while (this.peek() && (this.peek()!.type === "number" || this.peek()!.type === "color")) {
      // Check if this is the start of a point (number/color followed by comma)
      const nextTok = this.tokens[this.pos + 1];

      if (nextTok && nextTok.type === "comma") {
        // This is a point
        const p = this.parsePoint();
        if (p) points.push(p);
      } else {
        // This is the color code
        break;
      }
    }

    const color = this.parseColor();
    if (!color) return undefined;

    return { type: "poly", points, color };
  }

  private parseBitmap(): BitmapCmd | undefined {
    const origin = this.parsePoint();
    if (!origin) return undefined;

    const lbrace = this.peek();
    if (!lbrace ||lbrace.type !== "lbrace") {
      this.error("Expected '{' for bitmap");
      return undefined;
    }
    this.advance();
    this.skipNewlines();

    const rows: string[] = [];
    while (this.peek() && this.peek()!.type !== "rbrace") {
      // Accumulate all non-newline, non-rbrace tokens into one row string.
      // In bitmap context, both color tokens ("0"-"9") and number tokens ("11", "16")
      // represent pixel codes — each character in the token value is one pixel.
      let row = "";
      while (this.peek() && this.peek()!.type !== "newline" && this.peek()!.type !== "rbrace") {
        row += this.advance()!.value;
      }
      if (row.length > 0) {
        rows.push(row);
      }
      // Skip newlines within bitmap
      while (this.peek() && this.peek()!.type === "newline") {
        this.pos++;
      }
    }

    const rbrace = this.peek();
    if (!rbrace || rbrace.type !== "rbrace") {
      this.error("Expected '}' for bitmap");
      return undefined;
    }
    this.advance();

    return { type: "bitmap", origin, rows };
  }

  private parseDefine(): DefineBlock | undefined {
    const nameTok = this.peek();
    if (!nameTok || nameTok.type !== "keyword") {
      this.error("Expected define name");
      return undefined;
    }
    const name = this.advance().value;

    if (RESERVED_NAMES.has(name)) {
      this.error(`'${name}' is a reserved keyword and cannot be used as define name`);
      return undefined;
    }

    const lbrace = this.peek();
    if (!lbrace || lbrace.type !== "lbrace") {
      this.error("Expected '{' for define block");
      return undefined;
    }
    this.advance();
    this.skipNewlines();

    const commands: DrawCommand[] = [];
    while (this.peek() && this.peek()!.type !== "rbrace") {
      const cmd = this.parseDrawCommand();
      if (cmd) commands.push(cmd);
      this.skipNewlines();
    }

    const rbrace = this.peek();
    if (!rbrace || rbrace.type !== "rbrace") {
      this.error("Expected '}' for define block");
      return undefined;
    }
    this.advance();

    return { name, commands };
  }

  private parseUse(): UseCmd | undefined {
    const nameTok = this.peek();
    if (!nameTok || nameTok.type !== "keyword") {
      this.error("Expected use name");
      return undefined;
    }
    const name = this.advance().value;

    const transforms: Transform[] = [];
    let position: Point = { x: 0, y: 0 };
    let hasPosition = false;

    // Parse transforms and position
    while (this.peek() && this.peek()!.type !== "newline") {
      const tok = this.peek()!;

      if (tok.type === "keyword" && TRANSFORM_KEYWORDS.has(tok.value)) {
        transforms.push(tok.value as Transform);
        this.advance();
      } else if (tok.type === "number" || tok.type === "color") {
        // This is the start of a position
        const pos = this.parsePoint();
        if (pos) {
          position = pos;
          hasPosition = true;
        }
      } else {
        break;
      }
    }

    return { type: "use", name, transforms, position };
  }

  private parseDrawCommand(): DrawCommand | undefined {
    const tok = this.peek();
    if (!tok || tok.type !== "keyword") {
      this.error("Expected drawing command");
      return undefined;
    }

    switch (tok.value) {
      case "rect":
        this.advance();
        return this.parseRect();
      case "line":
        this.advance();
        return this.parseLine();
      case "poly":
        this.advance();
        return this.parsePoly();
      case "bitmap":
        this.advance();
        return this.parseBitmap();
      default:
        this.error(`Unknown command: '${tok.value}'`);
        this.advance();
        return undefined;
    }
  }

  parse(): DSLProgram | undefined {
    // Parse header: dsl version
    const dslTok = this.peek();
    if (!dslTok || dslTok.type !== "keyword" || dslTok.value !== "dsl") {
      this.error("File must start with 'dsl <version>'");
      return undefined;
    }
    this.advance();

    const versionTok = this.peek();
    if (!versionTok || (versionTok.type !== "number" && versionTok.type !== "color")) {
      this.error("Expected DSL version number");
      return undefined;
    }
    const version = parseInt(this.advance().value, 10);

    this.skipNewlines();

    // Parse size
    const sizeTok = this.peek();
    if (!sizeTok || sizeTok.type !== "keyword" || sizeTok.value !== "size") {
      this.error("Expected 'size <width>,<height>'");
      return undefined;
    }
    this.advance();

    const widthTok = this.peek();
    if (!widthTok || (widthTok.type !== "number" && widthTok.type !== "color" && widthTok.type !== "keyword")) {
      this.error("Expected width");
      return undefined;
    }
    const width = parseInt(this.advance().value, 10);

    this.skipNewlines(); // skip any whitespace

    const heightTok = this.peek();
    if (!heightTok || (heightTok.type !== "number" && heightTok.type !== "color" && heightTok.type !== "keyword")) {
      this.error("Expected height");
      return undefined;
    }
    const height = parseInt(this.advance().value, 10);

    this.skipNewlines();

    // Parse optional template
    let template: TemplateType = "none";
    const tmplTok = this.peek();
    if (tmplTok && tmplTok.type === "keyword" && tmplTok.value === "template") {
      this.advance();
      const typeTok = this.peek();
      if (!typeTok || typeTok.type !== "keyword" || !TEMPLATE_TYPES.has(typeTok.value)) {
        this.error("Invalid template type");
        return undefined;
      }
      template = typeTok.value as TemplateType;
      this.advance();
    }

    this.skipNewlines();

    // Parse palette
    const palTok = this.peek();
    if (!palTok || palTok.type !== "keyword" || palTok.value !== "palette") {
      this.error("Expected 'palette { ... }'");
      return undefined;
    }
    this.advance();

    const palLbrace = this.peek();
    if (!palLbrace || palLbrace.type !== "lbrace") {
      this.error("Expected '{' for palette");
      return undefined;
    }
    this.advance();
    this.skipNewlines();

    const palette = new Map<string, string>();
    while (this.peek() && this.peek()!.type !== "rbrace") {
      const colorTok = this.peek()!;
      if (colorTok.type !== "color" && colorTok.type !== "number") {
        this.error("Expected color code in palette");
        break;
      }
      const code = this.advance().value;

      if (code === "0") {
        this.error("Cannot define color code '0' (transparent is built-in)");
        break;
      }

      if (palette.has(code)) {
        this.error(`Color code '${code}' already defined`);
        break;
      }

      const hexTok = this.peek();
      if (!hexTok || hexTok.type !== "string") {
        this.error("Expected hex color value (#RRGGBB)");
        break;
      }
      const hex = this.advance().value;

      if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        this.error(`Invalid hex color: '${hex}'`);
        break;
      }

      palette.set(code, hex);
      this.skipNewlines();
    }

    const palRbrace = this.peek();
    if (!palRbrace || palRbrace.type !== "rbrace") {
      this.error("Expected '}' for palette");
      return undefined;
    }
    this.advance();

    this.skipNewlines();

    // Parse optional series
    const series: SeriesDef[] = [];
    while (this.peek() && this.peek()!.type === "keyword" && this.peek()!.value === "series") {
      this.advance();
      const colors: string[] = [];
      while (this.peek() && (this.peek()!.type === "color" || this.peek()!.type === "number")) {
        const c = this.advance().value;
        if (c === "0") {
          this.error("Cannot use '0' in series (transparent)");
          break;
        }
        colors.push(c);
      }
      if (colors.length >= 2) {
        series.push({ colors });
      } else {
        this.error("Series must have at least 2 colors");
      }
      this.skipNewlines();
    }

    // 防止 series 与 define/commands 之间有注释空行
    this.skipNewlines();

    // Parse defines
    const defines = new Map<string, DefineBlock>();
    while (this.peek() && this.peek()!.type === "keyword" && this.peek()!.value === "define") {
      this.advance();
      const def = this.parseDefine();
      if (def) {
        if (defines.has(def.name)) {
          this.error(`Define '${def.name}' already exists`);
        } else {
          defines.set(def.name, def);
        }
      }
      this.skipNewlines();
    }

    // 防止 define 与 commands 之间有注释空行
    this.skipNewlines();

    // Parse drawing commands
    const commands: (DrawCommand | UseCmd)[] = [];
    while (this.peek() && this.peek()!.type !== "rbrace") {
      const tok = this.peek()!;
      if (tok.type === "keyword" && tok.value === "use") {
        this.advance();
        const use = this.parseUse();
        if (use) commands.push(use);
      } else if (tok.type === "keyword") {
        const cmd = this.parseDrawCommand();
        if (cmd) commands.push(cmd);
      } else {
        this.error(`Unexpected token: '${tok.value}'`);
        this.advance();
      }
      this.skipNewlines();
    }

    if (this.errors.length > 0) {
      return undefined;
    }

    return {
      header: {
        version,
        width,
        height,
        template,
      },
      palette,
      series,
      defines,
      commands,
    };
  }

  getErrors(): DSLError[] {
    return this.errors;
  }
}

// ============================================================================
// Internal: Compiler (内部实现 - 编译器)
// ============================================================================

/**
 * 计算多个绘图命令的包围盒
 *
 * @param commands - 绘图命令列表
 * @returns 包围盒 { x, y, w, h }
 */
function getBoundingBox(commands: DrawCommand[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const cmd of commands) {
    switch (cmd.type) {
      case "rect": {
        const x1 = Math.min(cmd.p1.x, cmd.p2.x);
        const y1 = Math.min(cmd.p1.y, cmd.p2.y);
        const x2 = Math.max(cmd.p1.x, cmd.p2.x);
        const y2 = Math.max(cmd.p1.y, cmd.p2.y);
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
        break;
      }
      case "line": {
        const x1 = Math.min(cmd.p1.x, cmd.p2.x) - cmd.radius;
        const y1 = Math.min(cmd.p1.y, cmd.p2.y) - cmd.radius;
        const x2 = Math.max(cmd.p1.x, cmd.p2.x) + cmd.radius;
        const y2 = Math.max(cmd.p1.y, cmd.p2.y) + cmd.radius;
        minX = Math.min(minX, x1);
        minY = Math.min(minY, y1);
        maxX = Math.max(maxX, x2);
        maxY = Math.max(maxY, y2);
        break;
      }
      case "poly": {
        for (const p of cmd.points) {
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        break;
      }
      case "bitmap": {
        const rows = cmd.rows.length;
        const cols = rows > 0 ? cmd.rows[0].length : 0;
        minX = Math.min(minX, cmd.origin.x);
        minY = Math.min(minY, cmd.origin.y);
        maxX = Math.max(maxX, cmd.origin.x + cols - 1);
        maxY = Math.max(maxY, cmd.origin.y + rows - 1);
        break;
      }
    }
  }

  if (minX === Infinity) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
  };
}

function transformPoint(p: Point, bb: { w: number; h: number }, transforms: Transform[]): Point {
  let { x, y } = p;

  for (const t of transforms) {
    switch (t) {
      case "fx":
        x = (bb.w - 1) - x;
        break;
      case "fy":
        y = (bb.h - 1) - y;
        break;
      case "r90": {
        const newX = (bb.h - 1) - y;
        y = x;
        x = newX;
        // After rotation, dimensions swap
        const temp = bb.w;
        bb.w = bb.h;
        bb.h = temp;
        break;
      }
      case "r180":
        x = (bb.w - 1) - x;
        y = (bb.h - 1) - y;
        break;
      case "r270": {
        const newY = x;
        x = y;
        y = (bb.w - 1) - newY;
        // After rotation, dimensions swap
        const temp = bb.w;
        bb.w = bb.h;
        bb.h = temp;
        break;
      }
    }
  }

  return { x, y };
}

function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
}

function buildColorMap(palette: Map<string, string>): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>();
  for (const [code, hex] of palette) {
    map.set(code, hexToRgb(hex));
  }
  return map;
}

function buildSeriesMap(series: SeriesDef[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of series) {
    const len = s.colors.length;
    for (let i = 0; i < len; i++) {
      const opposite = s.colors[len - 1 - i];
      map.set(s.colors[i], opposite);
    }
  }
  return map;
}

function getDrawableWidth(header: DSLHeader): number {
  if (header.template === "unit" || header.template === "turret") {
    return Math.floor(header.width / 2);
  }
  return header.width;
}

function getDrawableHeight(header: DSLHeader): number {
  if (header.template === "block") {
    return Math.floor(header.height / 2);
  }
  return header.height;
}

function isInDrawableRegion(
  x: number,
  y: number,
  header: DSLHeader
): boolean {
  switch (header.template) {
    case "none":
      return true;
    case "unit":
    case "turret":
      return x < Math.floor(header.width / 2);
    case "block":
      // Top triangle: (0,0)→(W-1,0)→(halfW,halfH)
      return y < Math.floor(header.height / 2) && x + y < header.width;
    default:
      return true;
  }
}

function applySymmetry(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  header: DSLHeader,
  seriesMap: Map<string, string>,
  colorMap: Map<string, [number, number, number]>,
  palette: Map<string, string>
): void {
  const halfW = Math.floor(width / 2);
  const halfH = Math.floor(height / 2);

  if (header.template === "unit" || header.template === "turret") {
    // Horizontal mirror
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < halfW; x++) {
        const srcIdx = (y * width + x) * 4;
        const dstX = width - 1 - x;
        const dstIdx = (y * width + dstX) * 4;

        if (pixels[srcIdx + 3] === 0) continue; // skip transparent

        if (header.template === "turret") {
          // Find color code and invert
          const srcR = pixels[srcIdx];
          const srcG = pixels[srcIdx + 1];
          const srcB = pixels[srcIdx + 2];

          // Find the color code for this pixel
          for (const [code, hex] of palette) {
            const [r, g, b] = hexToRgb(hex);
            if (r === srcR && g === srcG && b === srcB) {
              const inverted = seriesMap.get(code);
              if (inverted && inverted !== code) {
                const [ir, ig, ib] = colorMap.get(inverted) ?? [srcR, srcG, srcB];
                pixels[dstIdx] = ir;
                pixels[dstIdx + 1] = ig;
                pixels[dstIdx + 2] = ib;
                pixels[dstIdx + 3] = 255;
              } else {
                pixels[dstIdx] = srcR;
                pixels[dstIdx + 1] = srcG;
                pixels[dstIdx + 2] = srcB;
                pixels[dstIdx + 3] = 255;
              }
              break;
            }
          }
        } else {
          // unit: simple copy
          pixels[dstIdx] = pixels[srcIdx];
          pixels[dstIdx + 1] = pixels[srcIdx + 1];
          pixels[dstIdx + 2] = pixels[srcIdx + 2];
          pixels[dstIdx + 3] = pixels[srcIdx + 3];
        }
      }
    }
  }

  if (header.template === "block") {
    // Block template: user draws in top triangle (0,0)→(W-1,0)→(halfW,halfH)
    // Drawable region: y < halfH && x + y < width
    //
    // Step 1: Top → Right via reflection across x + y = W - 1
    //   Formula: (x,y) → (W-1-y, W-1-x)
    //
    // Step 2: Top+Right → Bottom+Left via reflection across y = x + color inversion
    //   Formula: (x,y) → (y,x)

    const srcPixels = new Uint8ClampedArray(pixels);

    // Step 1: Top → Right (simple copy)
    for (let y = 0; y < halfH; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        if (srcPixels[srcIdx + 3] === 0) continue;

        const dstX = width - 1 - y;
        const dstY = width - 1 - x;
        if (dstX < 0 || dstX >= width || dstY < 0 || dstY >= height) continue;

        const dstIdx = (dstY * width + dstX) * 4;
        pixels[dstIdx] = srcPixels[srcIdx];
        pixels[dstIdx + 1] = srcPixels[srcIdx + 1];
        pixels[dstIdx + 2] = srcPixels[srcIdx + 2];
        pixels[dstIdx + 3] = srcPixels[srcIdx + 3];
      }
    }

    // Step 2: Top+Right → Bottom+Left (reflection across y=x + color inversion)
    // Read from pixels (has top+right after step 1). Reflected points land in
    // bottom (y>x, x+y>W) or left (x<y, x+y<W) — never overlap top or right.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * 4;
        if (pixels[srcIdx + 3] === 0) continue;

        // Reflect across y=x: swap coordinates
        const dstX = y;
        const dstY = x;
        if (dstX < 0 || dstX >= width || dstY < 0 || dstY >= height) continue;

        const dstIdx = (dstY * width + dstX) * 4;

        // Find color code and invert
        const srcR = pixels[srcIdx];
        const srcG = pixels[srcIdx + 1];
        const srcB = pixels[srcIdx + 2];

        let found = false;
        for (const [code, hex] of palette) {
          const [r, g, b] = hexToRgb(hex);
          if (r === srcR && g === srcG && b === srcB) {
            const inverted = seriesMap.get(code);
            if (inverted && inverted !== code) {
              const [ir, ig, ib] = colorMap.get(inverted) ?? [srcR, srcG, srcB];
              pixels[dstIdx] = ir;
              pixels[dstIdx + 1] = ig;
              pixels[dstIdx + 2] = ib;
              pixels[dstIdx + 3] = 255;
            } else {
              pixels[dstIdx] = srcR;
              pixels[dstIdx + 1] = srcG;
              pixels[dstIdx + 2] = srcB;
              pixels[dstIdx + 3] = 255;
            }
            found = true;
            break;
          }
        }
        if (!found) {
          pixels[dstIdx] = srcR;
          pixels[dstIdx + 1] = srcG;
          pixels[dstIdx + 2] = srcB;
          pixels[dstIdx + 3] = 255;
        }
      }
    }
  }
}

// ============================================================================
// Public API (公开 API)
// ============================================================================

/**
 * 解析 DSL 源代码为 AST
 *
 * @param input - DSL 源代码字符串
 * @returns 解析结果，包含 program（成功时）和 errors（失败时）
 *
 * @example
 * ```ts
 * const { program, errors } = parseDSL(`
 *   dsl 1
 *   size 16 16
 *   palette { 1 #FF0000 }
 *   rect 0,0 15,15 1
 * `);
 *
 * if (program) {
 *   console.log(program.header.width);  // 16
 *   console.log(program.palette.size);  // 1
 * }
 * ```
 */
export function parseDSL(input: string): { program?: DSLProgram; errors: DSLError[] } {
  const tokens = tokenize(input);
  const parser = new Parser(tokens);
  const program = parser.parse();
  return { program, errors: parser.getErrors() };
}

/**
 * 解析并渲染 DSL 源代码（一步到位）
 *
 * @param input - DSL 源代码字符串
 * @returns 渲染结果，包含 result（成功时）和 errors（失败时）
 *
 * @example
 * ```ts
 * const { result, errors } = renderDSL(`
 *   dsl 1
 *   size 16 16
 *   template unit
 *   palette { 1 #FF3333 2 #AA0000 }
 *   rect 0,0 7,15 1
 * `);
 *
 * if (result) {
 *   // result.pixels: Uint8ClampedArray (RGBA)
 *   // result.width: 16
 *   // result.height: 16
 *
 *   // 渲染到 canvas
 *   const ctx = canvas.getContext("2d");
 *   const imageData = ctx.createImageData(result.width, result.height);
 *   imageData.data.set(result.pixels);
 *   ctx.putImageData(imageData, 0, 0);
 * }
 * ```
 */
export function renderDSL(input: string): { result?: RenderResult; errors: DSLError[] } {
  const { program, errors } = parseDSL(input);
  if (!program) {
    return { errors };
  }
  const result = render(program);
  return { result, errors: [] };
}

/**
 * 渲染 AST 为像素数据
 *
 * @param program - 解析后的 DSL 程序（由 parseDSL 返回）
 * @returns 渲染结果，包含 RGBA 像素数组
 *
 * @example
 * ```ts
 * const { program } = parseDSL(code);
 * if (program) {
 *   const result = render(program);
 *   // result.pixels: Uint8ClampedArray (RGBA, 每 4 字节一个像素)
 *   // result.width, result.height: 图像尺寸
 * }
 * ```
 */
export function render(program: DSLProgram): RenderResult {
  const { header, palette, defines, commands } = program;
  const { width, height } = header;
  const colorMap = buildColorMap(palette);
  const seriesMap = buildSeriesMap(program.series);

  // Create pixel buffer (RGBA)
  const pixels = new Uint8ClampedArray(width * height * 4);

  function setPixel(x: number, y: number, color: string): void {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    if (!isInDrawableRegion(x, y, header)) return;

    const rgb = colorMap.get(color);
    if (!rgb) return;

    const idx = (y * width + x) * 4;
    pixels[idx] = rgb[0];
    pixels[idx + 1] = rgb[1];
    pixels[idx + 2] = rgb[2];
    pixels[idx + 3] = 255;
  }

  function drawRect(cmd: RectCmd): void {
    const x1 = Math.min(cmd.p1.x, cmd.p2.x);
    const y1 = Math.min(cmd.p1.y, cmd.p2.y);
    const x2 = Math.max(cmd.p1.x, cmd.p2.x);
    const y2 = Math.max(cmd.p1.y, cmd.p2.y);
    const c = cmd.chamfer;

    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        // 四角切角：像素到最近角的曼哈顿距离 < chamfer 则跳过
        if (c > 0) {
          const dTL = (x - x1) + (y - y1);
          const dTR = (x2 - x) + (y - y1);
          const dBL = (x - x1) + (y2 - y);
          const dBR = (x2 - x) + (y2 - y);
          if (dTL < c || dTR < c || dBL < c || dBR < c) continue;
        }
        setPixel(x, y, cmd.color);
      }
    }
  }

  function drawLine(cmd: LineCmd): void {
    const dx = Math.abs(cmd.p2.x - cmd.p1.x);
    const dy = Math.abs(cmd.p2.y - cmd.p1.y);
    const sx = cmd.p1.x < cmd.p2.x ? 1 : -1;
    const sy = cmd.p1.y < cmd.p2.y ? 1 : -1;
    let err = dx - dy;

    let x = cmd.p1.x;
    let y = cmd.p1.y;

    while (true) {
      for (let ry = -cmd.radius; ry <= cmd.radius; ry++) {
        for (let rx = -cmd.radius; rx <= cmd.radius; rx++) {
          if (rx * rx + ry * ry <= cmd.radius * cmd.radius) {
            setPixel(x + rx, y + ry, cmd.color);
          }
        }
      }

      if (x === cmd.p2.x && y === cmd.p2.y) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
  }

  function drawPoly(cmd: PolyCmd): void {
    if (cmd.points.length < 3) return;

    let minY = Infinity, maxY = -Infinity;
    for (const p of cmd.points) {
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    for (let y = minY; y <= maxY; y++) {
      const intersections: number[] = [];

      for (let i = 0; i < cmd.points.length; i++) {
        const j = (i + 1) % cmd.points.length;
        const p1 = cmd.points[i];
        const p2 = cmd.points[j];

        if ((p1.y <= y && p2.y > y) || (p2.y <= y && p1.y > y)) {
          const t = (y - p1.y) / (p2.y - p1.y);
          intersections.push(p1.x + t * (p2.x - p1.x));
        }
      }

      intersections.sort((a, b) => a - b);

      for (let i = 0; i < intersections.length - 1; i += 2) {
        const x1 = Math.ceil(intersections[i]);
        const x2 = Math.floor(intersections[i + 1]);
        for (let x = x1; x <= x2; x++) {
          setPixel(x, y, cmd.color);
        }
      }
    }
  }

  function drawBitmap(cmd: BitmapCmd): void {
    for (let row = 0; row < cmd.rows.length; row++) {
      const line = cmd.rows[row];
      for (let col = 0; col < line.length; col++) {
        const color = line[col];
        if (color === "0") continue;
        setPixel(cmd.origin.x + col, cmd.origin.y + row, color);
      }
    }
  }

  function resolveUseCmd(cmd: UseCmd): DrawCommand[] {
    const block = defines.get(cmd.name);
    if (!block) return [];

    const bb = getBoundingBox(block.commands);
    const bbCopy = { ...bb };
    const resolved: DrawCommand[] = [];

    for (const innerCmd of block.commands) {
      let newCmd = { ...innerCmd };

      if ("p1" in newCmd && "p2" in newCmd) {
        const p1 = transformPoint(
          { x: (newCmd as RectCmd).p1.x - bb.x, y: (newCmd as RectCmd).p1.y - bb.y },
          bbCopy,
          cmd.transforms
        );
        const p2 = transformPoint(
          { x: (newCmd as RectCmd).p2.x - bb.x, y: (newCmd as RectCmd).p2.y - bb.y },
          bbCopy,
          cmd.transforms
        );
        (newCmd as RectCmd).p1 = { x: p1.x + cmd.position.x, y: p1.y + cmd.position.y };
        (newCmd as RectCmd).p2 = { x: p2.x + cmd.position.x, y: p2.y + cmd.position.y };
      } else if ("points" in newCmd) {
        (newCmd as PolyCmd).points = (newCmd as PolyCmd).points.map(p =>
          transformPoint(
            { x: p.x - bb.x, y: p.y - bb.y },
            bbCopy,
            cmd.transforms
          )
        ).map(p => ({ x: p.x + cmd.position.x, y: p.y + cmd.position.y }));
      } else if ("origin" in newCmd) {
        const o = transformPoint(
          { x: (newCmd as BitmapCmd).origin.x - bb.x, y: (newCmd as BitmapCmd).origin.y - bb.y },
          bbCopy,
          cmd.transforms
        );
        (newCmd as BitmapCmd).origin = { x: o.x + cmd.position.x, y: o.y + cmd.position.y };
      }

      resolved.push(newCmd as DrawCommand);
    }

    return resolved;
  }

  for (const cmd of commands) {
    if ("type" in cmd) {
      switch (cmd.type) {
        case "rect": drawRect(cmd); break;
        case "line": drawLine(cmd); break;
        case "poly": drawPoly(cmd); break;
        case "bitmap": drawBitmap(cmd); break;
      }
    } else {
      const resolved = resolveUseCmd(cmd);
      for (const r of resolved) {
        switch (r.type) {
          case "rect": drawRect(r); break;
          case "line": drawLine(r); break;
          case "poly": drawPoly(r); break;
          case "bitmap": drawBitmap(r); break;
        }
      }
    }
  }

  applySymmetry(pixels, width, height, header, seriesMap, colorMap, palette);

  return { width, height, pixels };
}

// ============================================================================
// generateDSL — 从 DSLProgram AST 生成 DSL 源代码字符串
// ============================================================================

/** 从 DSLProgram 生成 DSL 源代码 */
export function generateDSL(program: DSLProgram): string {
  const lines: string[] = [];

  lines.push(`dsl ${program.header.version}`);
  if (program.header.symmetry) {
    lines.push(`symmetry ${program.header.symmetry}`);
  }
  lines.push(`size ${program.width} ${program.height}`);
  lines.push(`template ${program.header.template}`);

  // palette
  if (program.palette.size > 0) {
    lines.push('palette {');
    for (const [code, hex] of program.palette) {
      lines.push(`  ${code} ${hex}`);
    }
    lines.push('}');
  }

  // series
  if (program.series.length > 0) {
    for (const s of program.series) {
      lines.push(`series {`);
      lines.push(`  ${s.colors.join(' ')}`);
      lines.push('}');
    }
  }

  // defines
  if (program.defines) {
    for (const [name, block] of program.defines) {
      lines.push(`define ${name} {`);
      for (const cmd of block.commands) {
        lines.push(`  ${cmdToString(cmd)}`);
      }
      lines.push('}');
    }
  }

  // commands
  for (const cmd of program.commands) {
    if ('type' in cmd) {
      lines.push(cmdToString(cmd));
    } else {
      // UseCmd
      const use = cmd as UseCmd;
      let s = `use ${use.name} ${use.position.x},${use.position.y}`;
      if (use.transforms.flipX) s += ' flipX';
      if (use.transforms.flipY) s += ' flipY';
      if (use.transforms.rotate !== 0) s += ` rotate ${use.transforms.rotate}`;
      lines.push(s);
    }
  }

  return lines.join('\n');
}

function cmdToString(cmd: DrawCommand): string {
  switch (cmd.type) {
    case 'rect':
      if (cmd.chamfer > 0) {
        return `rect ${cmd.p1.x},${cmd.p1.y} ${cmd.p2.x},${cmd.p2.y} ${cmd.chamfer} ${cmd.color}`;
      }
      return `rect ${cmd.p1.x},${cmd.p1.y} ${cmd.p2.x},${cmd.p2.y} 0 ${cmd.color}`;
    case 'line':
      if (cmd.radius > 0) {
        return `line ${cmd.p1.x},${cmd.p1.y} ${cmd.p2.x},${cmd.p2.y} ${cmd.color} ${cmd.radius}`;
      }
      return `line ${cmd.p1.x},${cmd.p1.y} ${cmd.p2.x},${cmd.p2.y} ${cmd.color}`;
    case 'poly': {
      const pts = cmd.points.map(p => `${p.x},${p.y}`).join(' ');
      return `poly ${pts} ${cmd.color}`;
    }
    case 'bitmap': {
      const rows = cmd.rows.map(row => row.join(''));
      return `bitmap ${cmd.origin.x},${cmd.origin.y} ${rows.join(' ')}`;
    }
    default:
      return '';
  }
}