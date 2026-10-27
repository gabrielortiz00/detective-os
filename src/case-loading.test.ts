import { beforeAll, describe, expect, it } from "vitest";
import case01Source from "../cases/case01/generator.py?raw";
import type { FromWorker } from "./python-messages";
import { createSession } from "./python-session";

const messages: FromWorker[] = [];
const session = createSession((message) => messages.push(message));

async function loadCase(source: string, seed: number) {
  messages.length = 0;
  await session.handle({ type: "load-case", source, seed });
  return messages[0];
}

async function run(code: string) {
  messages.length = 0;
  await session.handle({ type: "run", code });
  const done = messages.find((m) => m.type === "done");
  if (done?.type === "done" && done.error) throw new Error(done.error);
  return messages.flatMap((m) => (m.type === "stdout" ? [m.text] : []));
}

const generatorWith = (checkpoint: string) => `
def generate(seed):
    return {
        "datasets": {"rows": [{"id": "R-1"}]},
        "answers": {"checkpoints": [${checkpoint}], "culprit": "X", "evidence": ["R-1"]},
    }
`;

describe("case loading", () => {
  beforeAll(async () => {
    await session.handle({ type: "boot" });
  }, 30000);

  it("sends the answer key to the page", async () => {
    const message = await loadCase(case01Source, 7);
    expect(message.type).toBe("case-loaded");
    if (message.type !== "case-loaded") return;
    expect(message.answers.culprit).toEqual(expect.any(String));
    expect(message.answers.evidence).toEqual([expect.stringMatching(/^BK-\d{4}$/)]);
    expect(message.answers.checkpoints[0]).toMatchObject({ kind: "set", answer: expect.any(Array) });
  });

  it("gives the player each dataset and case.files()", async () => {
    await loadCase(case01Source, 7);
    expect(await run("print(len(records))")).toEqual(["12"]);
    expect(await run("case.files()")).toEqual(["records   12 records   fields: id, name, place, time, note"]);
  });

  it("only puts datasets and case in the player's globals", async () => {
    await loadCase(case01Source, 7);
    const names = await run("print(sorted(k for k in globals() if not k.startswith('__')))");
    expect(names).toEqual(["['case', 'records']"]);
  });

  it("keeps the answer key out of reach of player code", async () => {
    await loadCase(case01Source, 7);
    // Match on value types, not just key names: CPython's interned string
    // table is a dict whose keys include "culprit" once any code mentions it.
    const found = await run(
      [
        "import gc",
        "def is_answer_key(o):",
        "    return isinstance(o, dict) and isinstance(o.get('evidence'), list) and 'culprit' in o",
        "print(any(is_answer_key(o) for o in gc.get_objects()))",
      ].join("\n"),
    );
    expect(found).toEqual(["False"]);
  });

  it("gives each run a fresh copy of the data", async () => {
    await loadCase(case01Source, 7);
    await run("records.clear()");
    expect(await run("print(len(records))")).toEqual(["12"]);
    // Nested edits too, which a shallow copy would let through.
    await run("records[0]['name'] = 'nobody'");
    expect(await run("print(records[0]['name'] != 'nobody')")).toEqual(["True"]);
  });

  it("builds the same data from the same seed, and different data from another", async () => {
    await loadCase(case01Source, 7);
    const first = await run("print(records)");
    await loadCase(case01Source, 7);
    expect(await run("print(records)")).toEqual(first);
    await loadCase(case01Source, 8);
    expect(await run("print(records)")).not.toEqual(first);
  });

  it("defaults a checkpoint's kind to set", async () => {
    const message = await loadCase(generatorWith(`{"question": "Q?", "answer": ["A"]}`), 1);
    expect(message.type === "case-loaded" && message.answers.checkpoints[0].kind).toBe("set");
  });

  it("fails loudly on a malformed generator", async () => {
    const missing = await loadCase("x = 1", 1);
    expect(missing.type === "case-failed" && missing.message).toContain("no generate(seed) function");

    const badKind = await loadCase(generatorWith(`{"question": "Q?", "answer": 1, "kind": "guess"}`), 1);
    expect(badKind.type === "case-failed" && badKind.message).toContain("unknown kind 'guess'");
  });
});
