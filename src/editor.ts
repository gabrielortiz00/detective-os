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
    "&": { height: "100%", color: "var(--amber)", backgroundColor: "var(--bg)" },
    ".cm-scroller": { fontFamily: "var(--font)", lineHeight: "1.5" },
    ".cm-content": { caretColor: "var(--amber)" },
    ".cm-cursor": { borderLeftColor: "var(--amber)" },
    ".cm-gutters": { backgroundColor: "var(--bg)", color: "var(--gutter)", border: "none" },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--active-line)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
      backgroundColor: "var(--selection)",
    },
    ".cm-matchingBracket": { backgroundColor: "var(--border)", outline: "none" },
  },
  { dark: true },
);

// One color family with brightness differences, so code still reads like an old monochrome screen.
const amberHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--code-keyword)", fontWeight: "bold" },
  { tag: [tags.string, tags.special(tags.string)], color: "var(--code-string)" },
  { tag: tags.number, color: "var(--code-number)" },
  { tag: tags.comment, color: "var(--code-comment)", fontStyle: "italic" },
  {
    tag: [tags.function(tags.variableName), tags.definition(tags.variableName)],
    color: "var(--code-function)",
  },
  { tag: tags.bool, color: "var(--code-number)" },
]);

export function createEditor(parent: HTMLElement): EditorView {
  return new EditorView({
    doc: starterCode,
    parent,
    extensions: [basicSetup, python(), amberTheme, syntaxHighlighting(amberHighlight)],
  });
}
