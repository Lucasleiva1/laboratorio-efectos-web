import Editor, { loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import JsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import CssWorker from "monaco-editor/language/css/css.worker.js?worker";
import HtmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import TsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";
import { useLab } from "../../stores/lab";
globalThis.MonacoEnvironment = {
  getWorker(_, label) {
    return label === "json"
      ? new JsonWorker()
      : ["css", "scss", "less"].includes(label)
        ? new CssWorker()
        : ["html", "handlebars", "razor"].includes(label)
          ? new HtmlWorker()
          : ["typescript", "javascript"].includes(label)
            ? new TsWorker()
            : new EditorWorker();
  },
};
loader.config({ monaco });
monaco.editor.defineTheme("effect-lab", {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "D4D4D4" },
    { token: "string", foreground: "C4B5FD" },
  ],
  colors: {
    "editor.background": "#0D0A14",
    "editor.foreground": "#FFFFFF",
    "editorLineNumber.foreground": "#D4D4D4",
    "editorLineNumber.activeForeground": "#B095FF",
    "editor.selectionBackground": "#38264F",
    "editor.lineHighlightBackground": "#151021",
    "editorCursor.foreground": "#B095FF",
  },
});
const languages: Record<string, string> = {
  html: "html",
  css: "css",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  json: "json",
  glsl: "cpp",
  frag: "cpp",
  vert: "cpp",
  md: "markdown",
};
export default function CodeEditor() {
  const active = useLab((s) => s.active);
  const file = useLab((s) => s.project.files.find((f) => f.path === s.active));
  const edit = useLab((s) => s.edit);
  return (
    <Editor
      height="100%"
      theme="effect-lab"
      path={active}
      language={languages[active.split(".").at(-1)!] ?? "plaintext"}
      value={file?.content ?? ""}
      onChange={(v) => edit(active, v ?? "")}
      options={{
        minimap: { enabled: false },
        fontSize: 13,
        fontFamily: "Cascadia Code, Consolas, monospace",
        padding: { top: 20 },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        fixedOverflowWidgets: true,
      }}
      onValidate={(markers) => {
        const errors = markers.filter((m) => m.severity === 8);
        if (errors.length)
          useLab
            .getState()
            .log(
              "warn",
              `${active}: ${errors[0].message} (línea ${errors[0].startLineNumber})`,
            );
      }}
    />
  );
}
