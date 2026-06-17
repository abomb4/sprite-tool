import { parseDSL, render } from "../../src/core/index.js";
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from "fs";
import { join, basename } from "path";

const CASES_DIR = join(import.meta.dirname, "cases");
const OUT_DIR = join(import.meta.dirname, "out");

// 清空 out 目录，避免残留文件影响
rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderToBitmap(width: number, height: number, pixels: Uint8ClampedArray, palette: Map<string, string>): string {
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

async function renderToPNG(width: number, height: number, pixels: Uint8ClampedArray): Promise<Buffer> {
  const { PNG } = await import("pngjs");
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    png.data[idx] = pixels[idx];
    png.data[idx + 1] = pixels[idx + 1];
    png.data[idx + 2] = pixels[idx + 2];
    png.data[idx + 3] = pixels[idx + 3];
  }
  return PNG.sync.write(png);
}

function diffLines(expected: string, actual: string): string {
  const eLines = expected.split("\n");
  const aLines = actual.split("\n");
  const maxLen = Math.max(eLines.length, aLines.length);
  const diffs: string[] = [];

  for (let i = 0; i < maxLen; i++) {
    const e = eLines[i] ?? "";
    const a = aLines[i] ?? "";
    if (e !== a) {
      diffs.push(`@@ line ${i + 1} @@`);
      if (e) diffs.push(`- ${e}`);
      if (a) diffs.push(`+ ${a}`);
    }
  }
  return diffs.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface TestResult {
  name: string;
  pass: boolean;
  message: string;
}

async function runCase(dslFile: string): Promise<TestResult> {
  const name = basename(dslFile, ".dsl");
  const expectedFile = join(CASES_DIR, `${name}.txt.expected`);

  // Read DSL
  let dslCode: string;
  try {
    dslCode = readFileSync(dslFile, "utf-8");
  } catch {
    return { name, pass: false, message: `Cannot read ${dslFile}` };
  }

  // Parse
  const { program, errors } = parseDSL(dslCode);
  if (!program) {
    return { name, pass: false, message: `Parse errors:\n${errors.map(e => `  L${e.line}:${e.column} ${e.message}`).join("\n")}` };
  }

  // Render
  let result;
  try {
    result = render(program);
  } catch (e) {
    return { name, pass: false, message: `Render error: ${e}` };
  }

  // Generate bitmap txt
  const bitmapTxt = renderToBitmap(result.width, result.height, result.pixels, program.palette);
  const outTxt = join(OUT_DIR, `${name}.txt`);
  writeFileSync(outTxt, bitmapTxt, "utf-8");

  // Generate PNG (for visual inspection, no comparison)
  try {
    const pngBuf = await renderToPNG(result.width, result.height, result.pixels);
    const outPng = join(OUT_DIR, `${name}.png`);
    writeFileSync(outPng, pngBuf);
  } catch (e) {
    console.warn(`  [${name}] PNG generation failed: ${e}`);
  }

  // Compare with expected
  if (!existsSync(expectedFile)) {
    return { name, pass: false, message: `Expected file not found: ${expectedFile}` };
  }
  const expected = readFileSync(expectedFile, "utf-8").trimEnd();
  const actual = bitmapTxt.trimEnd();

  if (expected === actual) {
    return { name, pass: true, message: "OK" };
  }

  // Generate diff
  const diffContent = diffLines(expected, actual);
  const diffFile = join(OUT_DIR, `${name}.diff`);
  writeFileSync(diffFile, diffContent, "utf-8");

  return { name, pass: false, message: `Mismatch — diff written to ${diffFile}\n${diffContent}` };
}

async function main() {
  const dslFiles = readdirSync(CASES_DIR)
    .filter(f => f.endsWith(".dsl"))
    .sort()
    .map(f => join(CASES_DIR, f));

  if (dslFiles.length === 0) {
    console.log("No .dsl files found in cases/");
    process.exit(1);
  }

  console.log(`Running ${dslFiles.length} test case(s)...\n`);

  const results: TestResult[] = [];
  for (const f of dslFiles) {
    const r = await runCase(f);
    results.push(r);
    const icon = r.pass ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
    console.log(`  ${icon} ${r.name}`);
    if (!r.pass) {
      console.log(`    ${r.message.split("\n").join("\n    ")}`);
    }
  }

  const passed = results.filter(r => r.pass).length;
  const failed = results.length - passed;
  console.log(`\n${passed} passed, ${failed} failed out of ${results.length}`);

  process.exit(failed > 0 ? 1 : 0);
}

main();