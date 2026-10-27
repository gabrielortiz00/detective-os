import case01Source from "../cases/case01/generator.py?raw";
import "./style.css";
import { createEditor } from "./editor";
import { createPython, RUN_TIMEOUT_MS } from "./python";
import { createTerminal } from "./terminal";

const editor = createEditor(document.getElementById("editor")!);
const terminal = createTerminal(document.getElementById("terminal")!);
const runButton = document.getElementById("run") as HTMLButtonElement;

// A new seed each page load until saved progress exists (milestone 7).
// It's printed so a run can be reproduced while debugging.
const seed = Math.floor(Math.random() * 100000);

runButton.disabled = true;
terminal.system("Detective OS booting...");

const python = createPython({
  onReady() {
    terminal.system("Ready.");
    runButton.disabled = false;
  },
  onBootFailed(message) {
    terminal.error(`Boot failed: ${message}`);
  },
  onCaseLoaded() {
    terminal.system(`Case 1 loaded (seed ${seed}).`);
  },
  onCaseFailed(message) {
    terminal.error(`Case failed to load:\n${message}`);
  },
  onStdout: (text) => terminal.write(text),
  onStderr: (text) => terminal.error(text),
});

python.loadCase(case01Source, seed);

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  terminal.clear();
  const result = await python.run(editor.state.doc.toString());
  const seconds = RUN_TIMEOUT_MS / 1000;
  if (result === "timeout") {
    terminal.error(`Process stopped: took longer than ${seconds} seconds.`);
  } else if (result === "killed") {
    terminal.error(`Process killed: took longer than ${seconds} seconds.`);
    terminal.system("Detective OS rebooting...");
    // onReady turns Run back on once the new worker has booted.
    return;
  }
  runButton.disabled = false;
});
