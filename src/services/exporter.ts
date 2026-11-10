import { zipSync, strToU8 } from "fflate";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { prepareProject as compileProject } from "./composition-runtime";
import { runtimeDocument } from "../features/preview/runtime";
import { parseProject, type LabProject } from "../../packages/core/project";
export type ExportTarget = "html" | "js-module" | "react";
export interface ExportPackage {
  name: string;
  files: Record<string, string>;
  bytes: number;
  zip: Uint8Array;
  dependencies: string[];
  warnings: string[];
}
export async function buildExport(
  input: LabProject,
  target: ExportTarget,
): Promise<ExportPackage> {
  const p = parseProject(JSON.stringify(input));
  const compiled = await compileProject(p);
  const version = "0.1.0";
  const session = "effectlab-export";
  const document = runtimeDocument(compiled, session, p.id, p.parameters);
  const module = `// Effect Lab v${version}. Independiente del editor, Tauri y agentes.\nconst documentSource=${JSON.stringify(document)};\nconst parameters=${JSON.stringify(p.parameters)};\nexport function mountEffect({target,params={}}){\n const root=typeof target==='string'?globalThis.document.querySelector(target):target;if(!root)throw Error('Contenedor no encontrado');\n const frame=globalThis.document.createElement('iframe');frame.title=${JSON.stringify(p.name)};frame.sandbox='allow-scripts';frame.referrerPolicy='no-referrer';frame.style.cssText='display:block;width:100%;height:100%;border:0;min-height:320px';\n let destroyed=false;let ready=false;let current={...params};\n const send=(type,data)=>frame.contentWindow?.postMessage({protocol:1,session:${JSON.stringify(session)},projectId:${JSON.stringify(p.id)},type,data},'*');\n function update(patch){if(destroyed)throw Error('Efecto desmontado');for(const [key,value] of Object.entries(patch)){const p=parameters.find(p=>p.binding===key||p.id===key);if(!p)throw Error('Parámetro no expuesto: '+key);if(typeof value!==typeof p.defaultValue||typeof value==='number'&&(!Number.isFinite(value)||value<(p.min??-Infinity)||value>(p.max??Infinity)))throw Error('Valor incompatible: '+key);current[key]=value;if(ready)send('parameter',{id:p.id,value});}}\n const message=e=>{if(e.source===frame.contentWindow&&e.data?.session===${JSON.stringify(session)}&&e.data?.type==='ready'){ready=true;update(current);}};\n globalThis.addEventListener('message',message);root.append(frame);frame.getBoundingClientRect();frame.srcdoc=documentSource;\n return {update,pause:value=>send('pause',Boolean(value)),destroy(){if(destroyed)return;send('dispose',null);frame.remove();globalThis.removeEventListener('message',message);destroyed=true;}};\n}\n`;
  const jsName = `effect-v${version}.js`;
  const demo = `<!doctype html><html lang="es"><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${p.name.replace(/[<>&"]/g, "")} · Demo</title><style>body{margin:0;background:#100c18;color:#eee;font:16px system-ui}header,footer{padding:28px}a{color:#b095ff}.effect-slot{height:70vh;min-height:400px}</style><header><a href="#contenido">Mi sitio</a> · Efecto independiente</header><div id="effect" class="effect-slot"></div><footer id="contenido"><button onclick="this.textContent='El sitio sigue funcionando'">Probar el sitio</button></footer><script type="module">import {mountEffect} from './${jsName}';const effect=mountEffect({target:'#effect'});window.demoEffect=effect;</script></html>`;
  const warnings = [
    "La integración usa una superficie iframe aislada; el scroll del efecto ocurre dentro de su contenedor.",
    "Pausa cooperativa: el código debe consultar lab.paused.",
  ];
  const files: Record<string, string> = {
    [jsName]: module,
    [`demo-v${version}.html`]: demo,
    [`effect-manifest-v${version}.json`]: JSON.stringify(
      {
        formatVersion: 1,
        version,
        name: p.name,
        target,
        entry: jsName,
        dependencies: compiled.dependencies,
        parameters: p.parameters,
        bytes: compiled.bytes,
        warnings,
      },
      null,
      2,
    ),
    [`README-integracion-v${version}.md`]: `# ${p.name}\n\nVersión ${version}.\n\nServí la carpeta con cualquier servidor estático. Abrí demo-v${version}.html. No se necesita Effect Lab, IA, Node ni Tauri para ejecutar el efecto.\n\n\`\`\`html\n<div id="mi-efecto" style="height:600px"></div>\n<script type="module">\nimport { mountEffect } from './${jsName}';\nconst efecto = mountEffect({ target: '#mi-efecto', params: {} });\n// efecto.update({ ${p.parameters[0] ? JSON.stringify(p.parameters[0].binding) + ": " + JSON.stringify(p.parameters[0].value) : "/* parámetros declarados */"} });\n// efecto.destroy();\n</script>\n\`\`\`\n\nCada montaje posee su propia superficie. El desmontaje retira el iframe y sus timers/DOM/listeners; el efecto puede registrar liberación adicional con lab.onDispose.\n\nRevisá el código de terceros antes de publicarlo. La política CSP del sitio debe permitir el iframe y los scripts con nonce effectlab-preview dentro del mismo. El efecto queda aislado del DOM y scroll global del sitio; no es un fondo global automático.\n`,
  };
  if (target === "react")
    files[`EffectComponent-v${version}.tsx`] =
      `import {useEffect,useRef} from 'react';\nimport {mountEffect} from './${jsName}';\nexport interface EffectParams {${p.parameters.map((p) => JSON.stringify(p.binding) + "?: " + (Array.isArray(p.defaultValue) ? "number[]" : typeof p.defaultValue) + ";").join("")}}\nexport default function Effect({params={}}:{params?:EffectParams}){const ref=useRef<HTMLDivElement>(null);const instance=useRef<ReturnType<typeof mountEffect>|null>(null);useEffect(()=>{instance.current=mountEffect({target:ref.current!,params});return()=>instance.current?.destroy();},[]);useEffect(()=>{instance.current?.update(params);},[params]);return <div ref={ref} style={{width:'100%',height:'100%',minHeight:400}}/>;}\n`;
  const licenseResponse = await fetch(
    new URL("/vendor/licenses.json", location.href),
  );
  if (!licenseResponse.ok)
    throw Error("Faltan los avisos de licencia. Ejecutá prepare:vendors.");
  const licenseData = (await licenseResponse.json()) as Record<
    string,
    { version: string; license: string; text: string }
  >;
  const packageNames = [
    ...new Set(
      compiled.dependencies.map((name) =>
        name.startsWith("react-dom")
          ? "react-dom"
          : name.startsWith("react")
            ? "react"
            : name.startsWith("gsap")
              ? "gsap"
              : name,
      ),
    ),
  ];
  if (packageNames.length)
    files["THIRD-PARTY-NOTICES-v" + version + ".txt"] = packageNames
      .map((name) => {
        const l = licenseData[name];
        if (!l) throw Error("Falta la licencia de " + name);
        return name + " " + l.version + " · " + l.license + "\n" + l.text;
      })
      .join("\n\n---\n\n");
  if (target === "react") {
    const params = p.parameters
      .map(
        (p) =>
          JSON.stringify(p.binding) +
          "?: " +
          (Array.isArray(p.defaultValue) ? "number[]" : typeof p.defaultValue) +
          ";",
      )
      .join("");
    files["effect-v" + version + ".d.ts"] =
      "export interface EffectParams {" +
      params +
      "}\nexport interface EffectInstance {update(params:EffectParams):void;pause(value:boolean):void;destroy():void}\nexport function mountEffect(options:{target:HTMLElement|string;params?:EffectParams}):EffectInstance;\n";
    files["package-v" + version + ".json"] = JSON.stringify(
      {
        name: pkgName(p.name),
        version,
        type: "module",
        peerDependencies: { react: ">=18" },
        description: "Componente React de Effect Lab con runtime autocontenido",
      },
      null,
      2,
    );
  }
  const encoded = Object.fromEntries(
    Object.entries(files).map(([name, text]) => [name, strToU8(text)]),
  );
  const zip = zipSync(encoded, { level: 6 });
  return {
    name:
      p.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9-]/g, "-") +
      "-v" +
      version,
    files,
    bytes: Object.values(encoded).reduce((a, b) => a + b.length, 0),
    zip,
    dependencies: compiled.dependencies,
    warnings,
  };
}
export async function writeExport(pkg: ExportPackage): Promise<boolean> {
  if (isTauri())
    return invoke("write_export", {
      name: pkg.name,
      bytes: Array.from(pkg.zip),
    });
  const blob = new Blob([new Uint8Array(pkg.zip)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = pkg.name + ".zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

function pkgName(name: string) {
  return (
    "effect-" +
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
  );
}
