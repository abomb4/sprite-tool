#!/usr/bin/env node

/**
 * Mindustry Sprite DSL - CLI Tool
 *
 * 用法:
 *   sprite-dsl -i input.dsl -o output.png
 *   sprite-dsl -i input.dsl -o output.txt --dsl-to-bitmap
 *
 * 退出码:
 *   0 - 成功
 *   1 - CLI 参数错误
 *   2 - 运行时错误（解析/渲染失败）
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import { parseDSL, render, type RenderResult, type DSLError } from "../core/index.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CLIOptions {
  input: string | null;
  output: string | null;
  mode: "png" | "bitmap" | "png-to-bitmap";
  help: boolean;
}

interface CLIError {
  code: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VERSION = "0.1.0";

const HELP = `
Mindustry Sprite DSL v${VERSION}

用法:
  sprite-dsl -i <input> [选项]

模式:
  --dsl-to-png            DSL → PNG（默认）
  --dsl-to-bitmap         DSL → 位图文本
  --png-to-bitmap         PNG → 位图文本（提取调色板）

选项:
  -i, --input <file>      输入文件
  -o, --output <file>     输出文件（默认: 与输入同名，后缀根据模式）
  -h, --help              显示帮助
  -v, --version           显示版本

示例:
  sprite-dsl -i unit.dsl -o unit.png
  sprite-dsl -i unit.dsl -o unit.txt --dsl-to-bitmap
  sprite-dsl -i sprite.png -o sprite.txt --png-to-bitmap

退出码:
  0  成功
  1  CLI 参数错误
  2  运行时错误
`.trim();

// ---------------------------------------------------------------------------
// Argument parser
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): CLIOptions {
  const args = argv.slice(2);
  const options: CLIOptions = {
    input: null,
    output: null,
    mode: "png",
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;

      case "-v":
      case "--version":
        console.log(VERSION);
        process.exit(0);
        break;

      case "-i":
      case "--input":
        i++;
        if (i >= args.length) {
          throw { code: 1, message: `选项 ${arg} 需要一个参数` };
        }
        options.input = args[i];
        break;

      case "-o":
      case "--output":
        i++;
        if (i >= args.length) {
          throw { code: 1, message: `选项 ${arg} 需要一个参数` };
        }
        options.output = args[i];
        break;

      case "--dsl-to-png":
        options.mode = "png";
        break;

      case "--dsl-to-bitmap":
        options.mode = "bitmap";
        break;

      case "--png-to-bitmap":
        options.mode = "png-to-bitmap";
        break;

      default:
        throw { code: 1, message: `未知的选项: ${arg}` };
    }
  }

  return options;
}

// ---------------------------------------------------------------------------
// Output formatters
// ---------------------------------------------------------------------------

function renderToBitmap(
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
  palette: Map<string, string>
): string {
  const reversePalette = new Map<string, string>();
  for (const [code, hex] of palette) {
    reversePalette.set(hex.toUpperCase(), code);
  }

  const lines: string[] = [];

  for (let y = 0; y < height; y++) {
    let line = "";
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a === 0) {
        line += "0";
      } else {
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        line += reversePalette.get(hex) ?? "?";
      }
    }
    lines.push(line);
  }

  return lines.join("\n");
}

async function renderToPNG(
  width: number,
  height: number,
  pixels: Uint8ClampedArray
): Promise<Buffer> {
  const { PNG } = await import("pngjs");
  const png = new PNG({ width, height });

  for (let i = 0; i < width * height; i++) {
    const srcIdx = i * 4;
    const dstIdx = i * 4;
    png.data[dstIdx] = pixels[srcIdx];
    png.data[dstIdx + 1] = pixels[srcIdx + 1];
    png.data[dstIdx + 2] = pixels[srcIdx + 2];
    png.data[dstIdx + 3] = pixels[srcIdx + 3];
  }

  return PNG.sync.write(png);
}

// Available color characters: 1-9, a-z, A-Z (61 total)
const COLOR_CHARS = "123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";

interface PNGToBitmapResult {
  palette: Map<string, string>;
  width: number;
  height: number;
  rows: string[];
}

function pngToBitmap(
  width: number,
  height: number,
  pixels: Uint8ClampedArray
): PNGToBitmapResult {
  // Extract unique colors
  const colorSet = new Set<string>();
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = pixels[idx];
    const g = pixels[idx + 1];
    const b = pixels[idx + 2];
    const a = pixels[idx + 3];
    if (a > 0) {
      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
      colorSet.add(hex);
    }
  }

  if (colorSet.size > COLOR_CHARS.length) {
    throw new Error(`颜色数量 (${colorSet.size}) 超过支持的最大数量 (${COLOR_CHARS.length})`);
  }

  // Build palette mapping: hex -> char
  const palette = new Map<string, string>();
  const reversePalette = new Map<string, string>();
  let charIdx = 0;
  for (const hex of colorSet) {
    const ch = COLOR_CHARS[charIdx];
    palette.set(ch, hex);
    reversePalette.set(hex, ch);
    charIdx++;
  }

  // Build bitmap rows
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      const a = pixels[idx + 3];

      if (a === 0) {
        row += "0";
      } else {
        const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
        row += reversePalette.get(hex) ?? "?";
      }
    }
    rows.push(row);
  }

  return { palette, width, height, rows };
}

function formatDSLBitmap(result: PNGToBitmapResult): string {
  const lines: string[] = [];

  lines.push("dsl 1");
  lines.push(`size ${result.width} ${result.height}`);
  lines.push("template none");
  lines.push("");

  // Palette
  lines.push("palette {");
  for (const [ch, hex] of result.palette) {
    lines.push(`  ${ch} ${hex}`);
  }
  lines.push("}");
  lines.push("");

  // Bitmap
  lines.push("bitmap 0,0 {");
  for (const row of result.rows) {
    lines.push(`  ${row}`);
  }
  lines.push("}");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  let options: CLIOptions;
  try {
    options = parseArgs(process.argv);
  } catch (e) {
    const err = e as CLIError;
    console.error(`错误: ${err.message}`);
    process.exit(err.code);
  }

  if (options.help) {
    console.log(HELP);
    process.exit(0);
  }

  if (!options.input) {
    console.error("错误: 请指定输入文件 (-i <file>)");
    process.exit(1);
  }

  const inputPath = resolve(options.input);

  // Determine output path
  let outputPath: string;
  if (options.output) {
    outputPath = resolve(options.output);
    if (!extname(outputPath)) {
      if (options.mode === "png") {
        outputPath += ".png";
      } else if (options.mode === "png-to-bitmap") {
        outputPath += ".dsl";
      } else {
        outputPath += ".txt";
      }
    }
  } else {
    let ext: string;
    if (options.mode === "png") {
      ext = ".png";
    } else if (options.mode === "png-to-bitmap") {
      ext = ".dsl";
    } else {
      ext = ".txt";
    }
    outputPath = inputPath.replace(/\.[^.]+$/, ext);
  }

  // PNG to Bitmap mode
  if (options.mode === "png-to-bitmap") {
    let inputBuffer: Buffer;
    try {
      inputBuffer = readFileSync(inputPath);
    } catch {
      console.error(`错误: 无法读取文件 "${inputPath}"`);
      process.exit(2);
    }

    const { PNG } = await import("pngjs");
    let png: any;
    try {
      png = PNG.sync.read(inputBuffer);
    } catch (e) {
      console.error(`错误: 无法解析 PNG 文件 "${inputPath}"`);
      process.exit(2);
    }

    const { width, height, data } = png;
    const result = pngToBitmap(width, height, data);
    const dsl = formatDSLBitmap(result);

    try {
      writeFileSync(outputPath, dsl, "utf-8");
      console.log(`✓ 已生成 DSL: ${outputPath} (${width}x${height}, ${result.palette.size} 色)`);
    } catch (e) {
      console.error(`写入错误: ${e}`);
      process.exit(2);
    }
    return;
  }

  // DSL to PNG/Bitmap mode
  let dslCode: string;
  try {
    dslCode = readFileSync(inputPath, "utf-8");
  } catch {
    console.error(`错误: 无法读取文件 "${inputPath}"`);
    process.exit(2);
  }

  const { program, errors } = parseDSL(dslCode);
  if (!program) {
    console.error("解析错误:");
    for (const err of errors) {
      console.error(`  第 ${err.line} 行, 第 ${err.column} 列: ${err.message}`);
    }
    process.exit(2);
  }

  let result: RenderResult;
  try {
    result = render(program);
  } catch (e) {
    console.error(`渲染错误: ${e}`);
    process.exit(2);
  }

  try {
    if (options.mode === "png") {
      const buffer = await renderToPNG(result.width, result.height, result.pixels);
      writeFileSync(outputPath, buffer);
      console.log(`✓ 已生成 PNG: ${outputPath} (${result.width}x${result.height})`);
    } else {
      const bitmap = renderToBitmap(result.width, result.height, result.pixels, program.palette);
      writeFileSync(outputPath, bitmap, "utf-8");
      console.log(`✓ 已生成位图文本: ${outputPath} (${result.width}x${result.height})`);
    }
  } catch (e) {
    console.error(`写入错误: ${e}`);
    process.exit(2);
  }
}

main();
