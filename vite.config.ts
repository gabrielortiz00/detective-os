import { defineConfig } from "vite";

// Cross-origin isolation enables SharedArrayBuffer, which Pyodide needs to
// interrupt runaway player code. Set it in dev too so problems show up early.
const isolationHeaders = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

export default defineConfig({
  server: { headers: isolationHeaders },
  preview: { headers: isolationHeaders },
});
