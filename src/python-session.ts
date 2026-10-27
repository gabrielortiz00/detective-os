import { loadPyodide, type PyodideAPI } from "pyodide";
import type { PyProxy } from "pyodide/ffi";
import type { AnswerKey, FromWorker, ToWorker } from "./python-messages";
import runtimeSource from "./python/runtime.py?raw";
import { cleanTraceback } from "./traceback";

// Kept separate from the worker file so tests can drive it directly in Node.
export function createSession(send: (message: FromWorker) => void) {
  let pyodide: PyodideAPI | undefined;
  // Private namespaces. Player code only ever sees what player_globals() builds.
  let runtime: PyProxy | undefined;
  let datasets: PyProxy | undefined;

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
    runtime = pyodide.globals.get("dict")();
    pyodide.runPython(runtimeSource, { globals: runtime });
    send({ type: "ready" });
  }

  function loadCase(source: string, seed: number) {
    if (!pyodide || !runtime) throw new Error("load-case before boot");
    let result: PyProxy | undefined;
    try {
      result = runtime.get("load_case")(source, seed) as PyProxy;
      const answersProxy = result.get(1) as PyProxy;
      const answers = answersProxy.toJs({ dict_converter: Object.fromEntries }) as AnswerKey;
      answersProxy.destroy();
      datasets?.destroy();
      datasets = result.get(0) as PyProxy;
      send({ type: "case-loaded", answers });
    } catch (err) {
      send({ type: "case-failed", message: err instanceof Error ? err.message : String(err) });
    } finally {
      result?.destroy();
      // The generator's namespace forms a reference cycle. Collect it now so
      // nothing from the generator lingers where gc.get_objects() could find it.
      pyodide.runPython("import gc; gc.collect()");
    }
  }

  async function run(code: string) {
    if (!pyodide || !runtime) throw new Error("run before boot");
    // A fresh namespace each run, so nothing from the last run leaks into this one.
    const globals: PyProxy = datasets
      ? runtime.get("player_globals")(datasets)
      : pyodide.globals.get("dict")();
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
    async handle(message: ToWorker): Promise<void> {
      switch (message.type) {
        case "boot":
          return boot(message.interruptBuffer);
        case "load-case":
          return loadCase(message.source, message.seed);
        case "run":
          return run(message.code);
      }
    },
  };
}
