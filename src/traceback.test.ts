import { describe, expect, it } from "vitest";
import { cleanTraceback } from "./traceback";

describe("cleanTraceback", () => {
  it("keeps the player's frames and drops internal ones", () => {
    const raw = [
      "Traceback (most recent call last):",
      '  File "/lib/python314.zip/_pyodide/_base.py", line 597, in eval_code_async',
      "    await CodeRunner(",
      "    ^^^^^^^^^^^^^^^^",
      '  File "<exec>", line 3, in <module>',
      '  File "<exec>", line 2, in helper',
      "ValueError: bad value",
      "",
    ].join("\n");

    expect(cleanTraceback(raw)).toBe(
      [
        "Traceback (most recent call last):",
        '  File "<exec>", line 3, in <module>',
        '  File "<exec>", line 2, in helper',
        "ValueError: bad value",
      ].join("\n"),
    );
  });

  it("leaves a message without a traceback alone", () => {
    expect(cleanTraceback("SyntaxError: invalid syntax")).toBe("SyntaxError: invalid syntax");
  });
});
