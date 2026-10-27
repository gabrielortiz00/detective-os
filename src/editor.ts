import { basicSetup, EditorView } from "codemirror";
import { python } from "@codemirror/lang-python";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";

const starterCode = `# Welcome to Detective OS.
for name in ["Ada", "Grace", "Linus"]:
    print("Suspect:", name)
`;

const amberTheme = EditorView.theme(
  {
    "&": { height: "100%", color: "#ffb000", backgroundColor: "#0d0b08" },
    ".cm-scroller": { fontFamily: "var(--font)", lineHeight: "1.5" },
    ".cm-content": { caretColor: "#ffb000" },
    ".cm-cursor": { borderLeftColor: "#ffb000" },
    ".cm-gutters": { backgroundColor: "#0d0b08", color: "#6b4a00", border: "none" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "#1a140a" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "#4a3500",
    },
    ".cm-matchingBracket": { backgroundColor: "#3a2c12", outline: "none" },
  },
  { dark: true },
);

// One color family with brightness differences, so code still reads like an old monochrome screen.
const amberHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#ffd27a", fontWeight: "bold" },
  { tag: [tags.string, tags.special(tags.string)], color: "#e0c080" },
  { tag: tags.number, color: "#ffc94d" },
  { tag: tags.comment, color: "#7a5a1a", fontStyle: "italic" },
  { tag: [tags.function(tags.variableName), tags.definition(tags.variableName)], color: "#ffe0a0" },
  { tag: tags.bool, color: "#ffc94d" },
]);

export function createEditor(parent: HTMLElement): EditorView {
  return new EditorView({
    doc: starterCode,
    parent,
    extensions: [basicSetup, python(), amberTheme, syntaxHighlighting(amberHighlight)],
  });
}
