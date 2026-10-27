import type { FromWorker, ToWorker } from "./python-messages";

export type RunResult = "ok" | "error";

export interface PythonEvents {
  onReady(): void;
  onBootFailed(message: string): void;
  onStdout(text: string): void;
  onStderr(text: string): void;
}

export interface Python {
  run(code: string): Promise<RunResult>;
}

export function createPython(events: PythonEvents): Python {
  let worker: Worker;
  let finishRun: ((result: RunResult) => void) | undefined;

  function send(message: ToWorker) {
    worker.postMessage(message);
  }

  function boot() {
    worker = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FromWorker>) => handle(event.data);
    send({ type: "boot" });
  }

  function finish(result: RunResult) {
    const resolve = finishRun;
    finishRun = undefined;
    resolve?.(result);
  }

  function handle(message: FromWorker) {
    switch (message.type) {
      case "ready":
        events.onReady();
        break;
      case "boot-failed":
        events.onBootFailed(message.message);
        break;
      case "stdout":
        events.onStdout(message.text);
        break;
      case "stderr":
        events.onStderr(message.text);
        break;
      case "done":
        if (message.error) events.onStderr(message.error);
        finish(message.error ? "error" : "ok");
        break;
    }
  }

  boot();

  return {
    run(code) {
      return new Promise((resolve) => {
        finishRun = resolve;
        send({ type: "run", code });
      });
    },
  };
}
