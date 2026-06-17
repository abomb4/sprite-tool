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
export type Transform = "fx" | "fy" | "r90" | "r180" | "r270";
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
export type TemplateType = "none" | "unit" | "turret" | "block";
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
export declare function parseDSL(input: string): {
    program?: DSLProgram;
    errors: DSLError[];
};
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
export declare function renderDSL(input: string): {
    result?: RenderResult;
    errors: DSLError[];
};
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
export declare function render(program: DSLProgram): RenderResult;
//# sourceMappingURL=index.d.ts.map