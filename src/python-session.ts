import { loadPyodide, type PyodideAPI } from "pyodide";
import type { FromWorker, ToWorker } from "./python-messages";
import { cleanTraceback } from "./traceback";

// Kept separate from the worker file so tests can drive it directly in Node.
export function createSession(send: (message: FromWorker) => void) {
  let pyodide: PyodideAPI | undefined;

  // Python hands over whole lines (plus any unfinished line when flushed),
  // so each chunk splits cleanly into terminal lines.
  function writer(type: "stdout" | "stderr") {
    const decoder = new TextDecoder();
    return (bytes: Uint8Array) => {
      const text = decoder.decode(bytes, { stream: true }).replace(/\n$/, "");
      for (const line of text.split("\n")) send({ type, text: line });
      return bytes.length;
    };
  }

  async function boot(interruptBuffer?: Uint8Array) {
    try {
      pyodide = await loadPyodide();
    } catch (err) {
      send({ type: "boot-failed", message: String(err) });
      return;
    }
    // Not "batched": it drops a final line that has no newline, even on flush.
    pyodide.setStdout({ write: writer("stdout") });
    pyodide.setStderr({ write: writer("stderr") });
    if (interruptBuffer) pyodide.setInterruptBuffer(interruptBuffer);
    send({ type: "ready" });
  }

  async function run(code: string) {
    if (!pyodide) throw new Error("run before boot");
    // A fresh dict each run, so nothing from the last run leaks into this one.
    const globals = pyodide.globals.get("dict")();
    let error: string | undefined;
    try {
      await pyodide.runPythonAsync(code, { globals });
    } catch (err) {
      error = cleanTraceback(err instanceof Error ? err.message : String(err));
    } finally {
      // Output without a trailing newline stays buffered until flushed.
      pyodide.runPython("import sys; sys.stdout.flush(); sys.stderr.flush()");
      globals.destroy();
    }
    send(error === undefined ? { type: "done" } : { type: "done", error });
  }

  return {
    handle(message: ToWorker): Promise<void> {
      return message.type === "boot" ? boot(message.interruptBuffer) : run(message.code);
    },
  };
}
