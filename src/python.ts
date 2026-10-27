import type { AnswerKey, FromWorker, ToWorker } from "./python-messages";
import { startRunTimer } from "./run-timer";

export const RUN_TIMEOUT_MS = 5000;
const KILL_GRACE_MS = 2000;
const SIGINT = 2;

// "timeout": interrupted, Python still loaded. "killed": worker destroyed and rebooting.
export type RunResult = "ok" | "error" | "timeout" | "killed";

export interface PythonEvents {
  onReady(): void;
  onBootFailed(message: string): void;
  onCaseLoaded(answers: AnswerKey): void;
  onCaseFailed(message: string): void;
  onStdout(text: string): void;
  onStderr(text: string): void;
}

export interface Python {
  loadCase(source: string, seed: number): void;
  run(code: string): Promise<RunResult>;
}

export function createPython(events: PythonEvents): Python {
  // SharedArrayBuffer only exists on cross-origin isolated pages.
  const canInterrupt = crossOriginIsolated;
  let worker: Worker;
  let interruptBuffer: Uint8Array | undefined;
  let finishRun: ((result: RunResult) => void) | undefined;
  let interrupted = false;
  // Remembered so a rebooted worker gets the same case and seed back.
  let currentCase: { source: string; seed: number } | undefined;

  function send(message: ToWorker) {
    worker.postMessage(message);
  }

  function boot() {
    worker = new Worker(new URL("./python.worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (event: MessageEvent<FromWorker>) => handle(event.data);
    interruptBuffer = canInterrupt ? new Uint8Array(new SharedArrayBuffer(1)) : undefined;
    send({ type: "boot", interruptBuffer });
    if (currentCase) send({ type: "load-case", ...currentCase });
  }

  function finish(result: RunResult) {
    const resolve = finishRun;
    finishRun = undefined;
    resolve?.(result);
  }

  function kill() {
    worker.terminate();
    finish("killed");
    boot();
  }

  function handle(message: FromWorker) {
    switch (message.type) {
      case "ready":
        events.onReady();
        break;
      case "boot-failed":
        events.onBootFailed(message.message);
        break;
      case "case-loaded":
        events.onCaseLoaded(message.answers);
        break;
      case "case-failed":
        events.onCaseFailed(message.message);
        break;
      case "stdout":
        events.onStdout(message.text);
        break;
      case "stderr":
        events.onStderr(message.text);
        break;
      case "done":
        // Our own interrupt shows up as a KeyboardInterrupt traceback, which
        // would only confuse the player.
        if (interrupted) finish("timeout");
        else {
          if (message.error) events.onStderr(message.error);
          finish(message.error ? "error" : "ok");
        }
        break;
    }
  }

  boot();

  return {
    loadCase(source, seed) {
      currentCase = { source, seed };
      send({ type: "load-case", source, seed });
    },
    run(code) {
      interrupted = false;
      if (interruptBuffer) interruptBuffer[0] = 0;
      const cancelTimer = startRunTimer({
        timeoutMs: RUN_TIMEOUT_MS,
        graceMs: KILL_GRACE_MS,
        canInterrupt,
        interrupt() {
          interrupted = true;
          interruptBuffer![0] = SIGINT;
        },
        kill,
      });
      return new Promise<RunResult>((resolve) => {
        finishRun = resolve;
        send({ type: "run", code });
      }).finally(cancelTimer);
    },
  };
}
