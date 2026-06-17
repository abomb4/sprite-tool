import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Create dist/web directory
const distWeb = join(root, "dist", "web");
mkdirSync(distWeb, { recursive: true });

// Copy HTML
copyFileSync(join(root, "src", "web", "index.html"), join(distWeb, "index.html"));

// Read app.js and fix import paths
const appJs = readFileSync(join(root, "dist", "web", "app.js"), "utf-8");
const fixedAppJs = appJs.replace(
  /from ["']\.\.\/core\/index\.js["']/g,
  'from "./core.js"'
);
writeFileSync(join(distWeb, "app.js"), fixedAppJs);

// Copy core.js to dist/web/
copyFileSync(join(root, "dist", "core", "index.js"), join(distWeb, "core.js"));
copyFileSync(join(root, "dist", "core", "index.d.ts"), join(distWeb, "core.d.ts"));

console.log("Web build complete!");
