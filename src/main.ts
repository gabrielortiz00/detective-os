import "./style.css";
import { createEditor } from "./editor";
import { createPython } from "./python";
import { createTerminal } from "./terminal";

const editor = createEditor(document.getElementById("editor")!);
const terminal = createTerminal(document.getElementById("terminal")!);
const runButton = document.getElementById("run") as HTMLButtonElement;

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
  onStdout: (text) => terminal.write(text),
  onStderr: (text) => terminal.error(text),
});

runButton.addEventListener("click", async () => {
  runButton.disabled = true;
  terminal.clear();
  await python.run(editor.state.doc.toString());
  runButton.disabled = false;
});
