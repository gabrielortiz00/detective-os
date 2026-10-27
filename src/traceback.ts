// Pyodide's tracebacks include frames from its own internals. Players only
// need the frames from their own code, which Pyodide names "<exec>".
export function cleanTraceback(message: string): string {
  const kept: string[] = [];
  let skipping = false;

  for (const line of message.split("\n")) {
    if (line.startsWith('  File "')) {
      skipping = !line.startsWith('  File "<exec>"');
    } else if (!line.startsWith("    ")) {
      // Unindented lines (the header and the error itself) end a frame.
      skipping = false;
    }
    if (!skipping) kept.push(line);
  }

  return kept.join("\n").trimEnd();
}
