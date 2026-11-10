import { validateParameter, type Parameter } from "../parameter-schema";
import type { Composition } from "./composition";
import { topological } from "./composition";
export interface SourceFile {
  path: string;
  content: string;
}
export interface LabProject {
  formatVersion: 1;
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  files: SourceFile[];
  entry: string;
  profile: "html" | "react";
  parameters: Parameter[];
  dependencies: string[];
  tags: string[];
  description: string;
  composition?: Composition;
}
export function safePath(path: string): string {
  if (
    !path ||
    path.length > 240 ||
    /[\\:\x00-\x1f]/.test(path) ||
    path.startsWith("/") ||
    path.split("/").some((p) => !p || p === "." || p === "..")
  )
    throw new Error("Ruta de archivo no permitida: " + path);
  return path;
}
export function parseProject(text: string): LabProject {
  if (text.length > 32 * 1024 * 1024)
    throw new Error("Proyecto demasiado grande");
  const p = JSON.parse(text);
  if (
    p.formatVersion !== 1 ||
    typeof p.id !== "string" ||
    typeof p.name !== "string" ||
    !Array.isArray(p.files) ||
    !Array.isArray(p.parameters) ||
    !["html", "react"].includes(p.profile)
  )
    throw new Error("Formato de proyecto no compatible");
  const names = new Set<string>();
  for (const f of p.files) {
    safePath(f.path);
    if (typeof f.content !== "string" || names.has(f.path))
      throw new Error("Archivo inválido o duplicado");
    names.add(f.path);
  }
  if (!names.has(p.entry)) throw new Error("No existe el archivo de entrada");
  if (
    p.files.length > 1000 ||
    p.parameters.length > 100 ||
    p.name.length > 200 ||
    !/^[A-Za-z0-9_-]{1,120}$/.test(p.id)
  )
    throw Error(
      "El proyecto excede los límites de formato o tiene un ID inválido",
    );
  const ids = new Set<string>();
  for (const parameter of p.parameters) {
    validateParameter(parameter);
    if (ids.has(parameter.id)) throw Error("ID de control duplicado");
    ids.add(parameter.id);
  }
  if (p.composition) {
    const c = p.composition as Composition;
    if (
      c.version !== 1 ||
      !Array.isArray(c.layers) ||
      !Array.isArray(c.nodes) ||
      !Array.isArray(c.edges) ||
      !Array.isArray(c.tracks) ||
      c.layers.length > 30 ||
      c.nodes.length > 200 ||
      c.tracks.length > 200 ||
      !Number.isFinite(c.duration) ||
      c.duration <= 0
    )
      throw Error("Composición inválida");
    topological(c.nodes, c.edges);
    const layers = new Set(c.layers.map((l) => l.id));
    for (const l of c.layers) {
      if (
        !/^[\w-]{1,120}$/.test(l.id) ||
        !["effect", "text", "image", "group"].includes(l.kind) ||
        ![
          "normal",
          "screen",
          "multiply",
          "overlay",
          "difference",
          "lighten",
        ].includes(l.blend) ||
        !["none", "circle", "rectangle"].includes(l.mask)
      )
        throw Error("Capa inválida");
      if (
        ![l.x, l.y, l.scale, l.rotation, l.opacity].every(Number.isFinite) ||
        l.scale <= 0 ||
        l.opacity < 0 ||
        l.opacity > 1
      )
        throw Error("Transformación inválida");
      if (l.parentId && !layers.has(l.parentId)) throw Error("Grupo ausente");
      let ancestor = l.parentId;
      const parents = new Set([l.id]);
      while (ancestor) {
        if (parents.has(ancestor)) throw Error("Ciclo de grupos");
        parents.add(ancestor);
        ancestor = c.layers.find((v) => v.id === ancestor)?.parentId;
      }
      if (l.source)
        parseProject(JSON.stringify({ ...l.source, composition: undefined }));
    }
    for (const n of c.nodes)
      if (
        !["time", "pointer", "number", "sine", "multiply", "output"].includes(
          n.type,
        ) ||
        !Number.isFinite(n.value)
      )
        throw Error("Nodo inválido");
    for (const t of c.tracks)
      for (const k of t.keys)
        if (
          !Number.isFinite(k.time) ||
          !Number.isFinite(k.value) ||
          k.time < 0 ||
          !["linear", "hold", "ease"].includes(k.easing)
        )
          throw Error("Keyframe inválido");
  }
  return p;
}
export function createProject(
  name = "Sin título",
  profile: LabProject["profile"] = "html",
): LabProject {
  const now = new Date().toISOString();
  return {
    formatVersion: 1,
    id: crypto.randomUUID(),
    name,
    createdAt: now,
    modifiedAt: now,
    entry: profile === "html" ? "index.html" : "main.tsx",
    profile,
    parameters: [],
    dependencies: [],
    tags: [],
    description: "",
    files:
      profile === "html"
        ? [
            {
              path: "index.html",
              content:
                '<!doctype html>\n<html lang="es">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n  <script type="module" src="main.js"></script>\n</body>\n</html>\n',
            },
            {
              path: "style.css",
              content:
                "html, body { margin: 0; min-height: 100%; }\n",
            },
            {
              path: "main.js",
              content: "",
            },
          ]
        : [
            {
              path: "main.tsx",
              content:
                'import React from "react";\nimport { createRoot } from "react-dom/client";\n\nfunction App() {\n  return null;\n}\n\ncreateRoot(document.getElementById("root")!).render(<App />);\n',
            },
          ],
  };
}
