// Messages between the page and the Python worker.

export type ToWorker =
  | { type: "boot"; interruptBuffer?: Uint8Array }
  | { type: "run"; code: string };

export type FromWorker =
  | { type: "ready" }
  | { type: "boot-failed"; message: string }
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "done"; error?: string };
