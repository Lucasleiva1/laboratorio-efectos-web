import * as esbuild from "esbuild-wasm";
import wasmURL from "esbuild-wasm/esbuild.wasm?url";
import type { LabProject } from "../../packages/core/project";
let initialized: Promise<void> | undefined;
const vendors = new Set([
  "react",
  "react-dom/client",
  "react/jsx-runtime",
  "pixi.js",
  "gsap",
  "three",
  "gsap/ScrollTrigger",
  "matter-js",
]);
const cache = new Map<string, Promise<string>>();
export function resolveLocal(path: string, importer = ""): string {
  if (path.startsWith("/") || /^[a-z]+:/i.test(path) || path.includes("\\"))
    throw Error("Importación no permitida: " + path);
  const parts = importer.split("/").slice(0, -1);
  for (const part of path.split("/")) {
    if (part === "." || !part) continue;
    if (part === "..") {
      if (!parts.length) throw Error("La ruta sale del proyecto: " + path);
      parts.pop();
    } else parts.push(part);
  }
  return parts.join("/");
}
export interface Compiled {
  js: string;
  css: string;
  html: string;
  bytes: number;
  dependencies: string[];
  duration: number;
}
export async function compileProject(project: LabProject): Promise<Compiled> {
  const start = performance.now();
  initialized ??= esbuild.initialize({ wasmURL, worker: true });
  await initialized;
  const sources = new Map(project.files.map((f) => [f.path, f.content]));
  const used = new Set<string>();
  let html = '<div id="root"></div>';
  const imports: string[] = [];
  if (project.profile === "html" && project.entry.endsWith(".html")) {
    const doc = new DOMParser().parseFromString(
      sources.get(project.entry) ?? "",
      "text/html",
    );
    for (const el of [...doc.querySelectorAll("script")]) {
      if (el.src) {
        const src = el.getAttribute("src")!;
        imports.push(
          `import ${JSON.stringify("./" + resolveLocal(src, project.entry))};`,
        );
      } else if (el.textContent?.trim()) {
        const id = `__inline_${imports.length}.js`;
        sources.set(id, el.textContent);
        imports.push(`import './${id}';`);
      }
      el.remove();
    }
    for (const el of [...doc.querySelectorAll('link[rel="stylesheet"]')]) {
      const href = el.getAttribute("href")!;
      imports.push(
        `import ${JSON.stringify("./" + resolveLocal(href, project.entry))};`,
      );
      el.remove();
    }
    doc.querySelectorAll("base,meta[http-equiv]").forEach((el) => el.remove());
    for (const el of [...doc.querySelectorAll("[src]:not(script)")]) {
      const src = el.getAttribute("src")!;
      if (src.startsWith("data:") || src.startsWith("blob:")) continue;
      const asset = sources.get(resolveLocal(src, project.entry));
      if (!asset || !asset.startsWith("data:"))
        throw Error("Recurso no importado: " + src);
      el.setAttribute("src", asset);
    }
    html = doc.documentElement.outerHTML;
  } else imports.push(`import ${JSON.stringify("./" + project.entry)};`);
  sources.set("__lab_entry__.js", imports.join("\n"));
  const find = (path: string) =>
    [
      path,
      path + ".ts",
      path + ".tsx",
      path + ".js",
      path + ".jsx",
      path + "/index.ts",
      path + "/index.tsx",
      path + "/index.js",
    ].find((p) => sources.has(p));
  const result = await esbuild.build({
    entryPoints: ["__lab_entry__.js"],
    bundle: true,
    write: false,
    outdir: "out",
    format: "iife",
    target: "es2022",
    minify: true,
    jsx: "automatic",
    logLevel: "silent",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [
      {
        name: "effectlab-project",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) => {
            if (args.kind === "entry-point")
              return { path: args.path, namespace: "project" };
            if (!args.path.startsWith(".") && args.kind !== "url-token") {
              if (vendors.has(args.path)) {
                used.add(args.path);
                return { path: args.path, namespace: "vendor" };
              }
              throw Error("Dependencia no preparada: " + args.path);
            }
            const path = find(
              resolveLocal(
                args.path,
                args.namespace === "vendor" ? "" : args.importer,
              ),
            );
            if (!path)
              throw Error(
                "No se encuentra: " + args.path + " desde " + args.importer,
              );
            return { path, namespace: "project" };
          });
          build.onLoad({ filter: /.*/, namespace: "project" }, (args) => {
            const ext = args.path.split(".").at(-1)!;
            const content = sources.get(args.path)!;
            if (
              content.startsWith("data:") &&
              /^(png|jpg|jpeg|webp|svg|gif|woff2?)$/.test(ext)
            ) {
              const base64 = content.split(",")[1];
              return {
                contents: Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)),
                loader: "dataurl",
              };
            }
            const loaders: Record<string, esbuild.Loader> = {
              js: "js",
              jsx: "jsx",
              ts: "ts",
              tsx: "tsx",
              css: "css",
              json: "json",
              glsl: "text",
              frag: "text",
              vert: "text",
            };
            return { contents: content, loader: loaders[ext] ?? "text" };
          });
          build.onLoad({ filter: /.*/, namespace: "vendor" }, async (args) => {
            if (!cache.has(args.path))
              cache.set(
                args.path,
                fetch(
                  new URL(
                    "/vendor/" + args.path.replaceAll("/", "--") + ".js",
                    location.href,
                  ),
                ).then(async (r) => {
                  if (!r.ok) throw Error("No se preparó " + args.path);
                  return r.text();
                }),
              );
            return { contents: await cache.get(args.path)!, loader: "js" };
          });
        },
      },
    ],
  });
  const js = result.outputFiles.find((f) => f.path.endsWith(".js"))?.text ?? "";
  const css =
    result.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
  return {
    js,
    css,
    html,
    bytes: new TextEncoder().encode(js + css + html).length,
    dependencies: [...used],
    duration: performance.now() - start,
  };
}
