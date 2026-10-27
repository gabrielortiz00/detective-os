type LineKind = "output" | "error" | "system";

export interface Terminal {
  write(text: string): void;
  error(text: string): void;
  system(text: string): void;
  clear(): void;
}

export function createTerminal(element: HTMLElement): Terminal {
  function append(text: string, kind: LineKind) {
    const line = document.createElement("div");
    line.className = kind;
    // textContent, not innerHTML: player output must never be parsed as HTML.
    line.textContent = text;
    element.append(line);
    element.scrollTop = element.scrollHeight;
  }

  return {
    write: (text) => append(text, "output"),
    error: (text) => append(text, "error"),
    system: (text) => append(text, "system"),
    clear: () => element.replaceChildren(),
  };
}
