import { mkdirSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Create dist/web directory
const distWeb = join(root, "dist", "web");
mkdirSync(distWeb, { recursive: true });

// Copy HTML
copyFileSync(join(root, "web", "index.html"), join(distWeb, "index.html"));

// Read app.js and fix import paths
const appJs = readFileSync(join(root, "dist", "web", "app.js"), "utf-8");
const fixedAppJs = appJs.replace(
  'from "../src/core.js"',
  'from "./src/core.js"'
);
writeFileSync(join(distWeb, "app.js"), fixedAppJs);

// Copy core.js to dist/web/src/
const coreDist = join(distWeb, "src");
mkdirSync(coreDist, { recursive: true });
copyFileSync(join(root, "dist", "src", "core.js"), join(coreDist, "core.js"));
copyFileSync(join(root, "dist", "src", "core.d.ts"), join(coreDist, "core.d.ts"));

console.log("Web build complete!");
