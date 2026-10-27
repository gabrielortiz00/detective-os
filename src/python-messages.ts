// Messages between the page and the Python worker.

export type CheckpointKind = "set" | "ordered" | "number" | "text";

export interface Checkpoint {
  question: string;
  kind: CheckpointKind;
  answer: unknown;
}

// Produced by a case generator. Stays on the page side, never in player globals.
export interface AnswerKey {
  checkpoints: Checkpoint[];
  culprit: string;
  evidence: string[];
}

export type ToWorker =
  | { type: "boot"; interruptBuffer?: Uint8Array }
  | { type: "load-case"; source: string; seed: number }
  | { type: "run"; code: string };

export type FromWorker =
  | { type: "ready" }
  | { type: "boot-failed"; message: string }
  | { type: "case-loaded"; answers: AnswerKey }
  | { type: "case-failed"; message: string }
  | { type: "stdout"; text: string }
  | { type: "stderr"; text: string }
  | { type: "done"; error?: string };
