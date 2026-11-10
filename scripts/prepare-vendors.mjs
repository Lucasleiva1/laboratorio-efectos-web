import { build } from "esbuild";
import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const names = [
  "react",
  "react-dom/client",
  "react/jsx-runtime",
  "pixi.js",
  "gsap",
  "three",
  "gsap/ScrollTrigger",
  "matter-js",
];
await mkdir("public/vendor", { recursive: true });
await copyFile(
  "node_modules/esbuild-wasm/esbuild.wasm",
  "public/vendor/esbuild.wasm",
);
for (const name of names) {
  const contents =
    name.startsWith("react") || name === "matter-js"
      ? `import d from ${JSON.stringify(name)}; export default d; export const {${Object.keys(
          require(name),
        )
          .filter((k) => k !== "default" && /^[A-Za-z_$][\w$]*$/.test(k))
          .join(",")}}=d;`
      : `${name === "pixi.js" ? "import 'pixi.js/unsafe-eval';" : ""}export * from ${JSON.stringify(name)}; ${name === "gsap" ? `import d from 'gsap'; export default d;` : ""}`;
  const sharedReact = {
    name: "shared-react",
    setup(b) {
      b.onResolve({ filter: /^react$/ }, (args) =>
        args.namespace === "shared-react"
          ? { path: "react", external: true }
          : { path: "react", namespace: "shared-react" },
      );
      b.onLoad({ filter: /.*/, namespace: "shared-react" }, () => ({
        contents: `import d from 'react'; export default d; export const {${Object.keys(
          require("react"),
        )
          .filter((k) => k !== "default" && /^[A-Za-z_$][\w$]*$/.test(k))
          .join(",")}}=d;`,
        loader: "js",
      }));
    },
  };
  await build({
    stdin: { contents, resolveDir: process.cwd() },
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    plugins: name !== "react" && name.startsWith("react") ? [sharedReact] : [],
    outfile: `public/vendor/${name.replaceAll("/", "--")}.js`,
    define: { "process.env.NODE_ENV": '"production"' },
  });
}
console.log(
  "Dependencias de runtime preparadas localmente: " + names.join(", "),
);
const licenses = {};
for (const name of [
  "react",
  "react-dom",
  "pixi.js",
  "gsap",
  "three",
  "matter-js",
]) {
  const pkg = JSON.parse(
    await readFile(`node_modules/${name}/package.json`, "utf8"),
  );
  let text = "";
  for (const filename of [
    "LICENSE",
    "LICENSE.txt",
    "LICENSE.md",
    "license.txt",
  ]) {
    try {
      text = await readFile(`node_modules/${name}/${filename}`, "utf8");
      break;
    } catch {}
  }
  licenses[name] = {
    version: pkg.version,
    license: pkg.license,
    text:
      text ||
      `Consultar licencia incluida por el paquete ${name} ${pkg.version}.`,
  };
}
await writeFile(
  "public/vendor/licenses.json",
  JSON.stringify(licenses, null, 2),
);
