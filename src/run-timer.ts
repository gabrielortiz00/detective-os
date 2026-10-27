export interface RunTimerOptions {
  timeoutMs: number;
  graceMs: number;
  canInterrupt: boolean;
  interrupt(): void;
  kill(): void;
}

// Interrupt first so Python stays loaded. Kill only if the interrupt can't
// land, since Python only checks for it between steps, not inside one long
// built-in call.
export function startRunTimer(options: RunTimerOptions): () => void {
  let timer = setTimeout(() => {
    if (!options.canInterrupt) {
      options.kill();
      return;
    }
    options.interrupt();
    timer = setTimeout(options.kill, options.graceMs);
  }, options.timeoutMs);

  return () => clearTimeout(timer);
}
