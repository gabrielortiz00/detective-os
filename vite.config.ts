import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig, type Plugin } from "vite";

// Cross-origin isolation enables SharedArrayBuffer, which Pyodide needs to
// interrupt runaway player code. Set it in dev too so problems show up early.
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

const pyodideRuntimeFiles = [
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];

// Pyodide finds its runtime files next to its own script. The worker bundle
// lands in assets/, so the runtime files go there too.
function copyPyodideRuntime(): Plugin {
  const pyodideDir = dirname(createRequire(import.meta.url).resolve("pyodide/package.json"));
  return {
    name: "copy-pyodide-runtime",
    apply: "build",
    generateBundle() {
      for (const file of pyodideRuntimeFiles) {
        this.emitFile({
          type: "asset",
          fileName: `assets/${file}`,
          source: readFileSync(join(pyodideDir, file)),
        });
      }
    },
  };
}

export default defineConfig({
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
  // Pre-bundling would move pyodide.mjs away from its runtime files in dev.
  optimizeDeps: { exclude: ["pyodide"] },
  // Pyodide loads parts of itself with dynamic import, which needs a module worker.
  worker: { format: "es", plugins: () => [copyPyodideRuntime()] },
});
