import { parseDSL, render, type RenderResult, type DSLError } from "../src/core.js";

// ---------------------------------------------------------------------------
// Render to canvas (DOM dependent, not in core)
// ---------------------------------------------------------------------------

function renderToCanvas(
  canvas: HTMLCanvasElement,
  result: RenderResult,
  scale: number = 1
): void {
  const w = result.width;
  const h = result.height;

  canvas.width = w * scale;
  canvas.height = h * scale;
  canvas.style.width = `${w * scale}px`;
  canvas.style.height = `${h * scale}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 先画到临时 canvas（原始尺寸）
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const tmpCtx = tmp.getContext("2d")!;
  const imageData = tmpCtx.createImageData(w, h);
  imageData.data.set(result.pixels);
  tmpCtx.putImageData(imageData, 0, 0);

  // 再缩放绘制到主 canvas
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(tmp, 0, 0, w, h, 0, 0, w * scale, h * scale);
}

// ---------------------------------------------------------------------------
// Elements
// ---------------------------------------------------------------------------

const editor = document.getElementById("editor") as HTMLTextAreaElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const scaleSelect = document.getElementById("scale") as HTMLSelectElement;
const exportBtn = document.getElementById("export") as HTMLButtonElement;
const errorsDiv = document.getElementById("errors") as HTMLDivElement;
const statusSpan = document.getElementById("status") as HTMLSpanElement;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let currentResult: RenderResult | null = null;

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function updatePreview(): void {
  const code = editor.value;
  const { program, errors } = parseDSL(code);

  // Clear errors
  errorsDiv.innerHTML = "";

  if (errors.length > 0) {
    statusSpan.textContent = `${errors.length} error(s)`;
    statusSpan.className = "error";

    for (const err of errors) {
      const div = document.createElement("div");
      div.className = "error-item";
      div.innerHTML = `<span>Line ${err.line}, Col ${err.column}</span>${escapeHtml(err.message)}`;
      errorsDiv.appendChild(div);
    }

    return;
  }

  if (!program) {
    statusSpan.textContent = "Parse failed";
    statusSpan.className = "error";
    return;
  }

  try {
    const result = render(program);
    currentResult = result;
    const scale = parseInt(scaleSelect.value, 10);
    renderToCanvas(canvas, result, scale);
    statusSpan.textContent = `${result.width}x${result.height} | OK`;
    statusSpan.className = "success";
  } catch (e) {
    statusSpan.textContent = `Compile error: ${e}`;
    statusSpan.className = "error";
  }
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ---------------------------------------------------------------------------
// Export PNG
// ---------------------------------------------------------------------------

function exportPNG(): void {
  if (!currentResult) return;

  // Create a temporary canvas at 1x scale
  const tmpCanvas = document.createElement("canvas");
  tmpCanvas.width = currentResult.width;
  tmpCanvas.height = currentResult.height;
  const ctx = tmpCanvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.createImageData(currentResult.width, currentResult.height);
  imageData.data.set(currentResult.pixels);
  ctx.putImageData(imageData, 0, 0);

  // Download
  const link = document.createElement("a");
  link.download = "sprite.png";
  link.href = tmpCanvas.toDataURL("image/png");
  link.click();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

let debounceTimer: ReturnType<typeof setTimeout>;

function scheduleRender(): void {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(updatePreview, 150);
}

editor.addEventListener("input", scheduleRender);
editor.addEventListener("keyup", scheduleRender);
editor.addEventListener("paste", scheduleRender);
scaleSelect.addEventListener("change", updatePreview);
exportBtn.addEventListener("click", exportPNG);

// Handle tab key in editor
editor.addEventListener("keydown", (e) => {
  if (e.key === "Tab") {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + "  " + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 2;
    scheduleRender();
  }
});

// Initial render
updatePreview();
