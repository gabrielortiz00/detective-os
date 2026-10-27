import { beforeAll, describe, expect, it } from "vitest";
import type { FromWorker } from "./python-messages";
import { createSession } from "./python-session";

// Runs the real Pyodide in Node, so these cover the same code the worker uses.
const messages: FromWorker[] = [];
const session = createSession((message) => messages.push(message));
const interruptBuffer = new Uint8Array(new SharedArrayBuffer(1));

async function run(code: string) {
  messages.length = 0;
  await session.handle({ type: "run", code });
  return {
    stdout: messages.flatMap((m) => (m.type === "stdout" ? [m.text] : [])),
    done: messages.find((m) => m.type === "done"),
  };
}

describe("python session", () => {
  beforeAll(async () => {
    await session.handle({ type: "boot", interruptBuffer });
    expect(messages).toContainEqual({ type: "ready" });
  }, 30000);

  it("sends each printed line", async () => {
    const { stdout, done } = await run("for i in range(3):\n    print('line', i)");
    expect(stdout).toEqual(["line 0", "line 1", "line 2"]);
    expect(done).toEqual({ type: "done" });
  });

  it("keeps empty lines and non-ASCII text", async () => {
    const { stdout } = await run("print('héllo')\nprint()\nprint('end')");
    expect(stdout).toEqual(["héllo", "", "end"]);
  });

  it("sends a final line that has no newline", async () => {
    const { stdout } = await run("print('a', end='')\nprint('b', end='')");
    expect(stdout).toEqual(["ab"]);
  });

  it("starts each run with fresh globals", async () => {
    await run("secret = 42");
    const { done } = await run("print(secret)");
    expect(done?.type === "done" && done.error).toContain("NameError");
  });

  it("trims Pyodide's internal frames from tracebacks", async () => {
    const { done } = await run("x = 1\ny = x / 0");
    expect(done).toEqual({
      type: "done",
      error: [
        "Traceback (most recent call last):",
        '  File "<exec>", line 2, in <module>',
        "ZeroDivisionError: division by zero",
      ].join("\n"),
    });
  });

  it("raises KeyboardInterrupt when the interrupt buffer is set", async () => {
    interruptBuffer[0] = 2;
    const { done } = await run("while True:\n    pass");
    expect(done?.type === "done" && done.error).toContain("KeyboardInterrupt");
    expect(interruptBuffer[0]).toBe(0);
  });
});
