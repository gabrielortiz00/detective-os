import "./style.css";
import { createEditor } from "./editor";
import { createTerminal } from "./terminal";

createEditor(document.getElementById("editor")!);
const terminal = createTerminal(document.getElementById("terminal")!);

terminal.system("Detective OS ready.");

document.getElementById("run")!.addEventListener("click", () => {
  terminal.clear();
  terminal.system("Python not connected yet.");
});
