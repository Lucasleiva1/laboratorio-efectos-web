import { compileProject, type Compiled } from "./compiler";
import { runtimeDocument } from "../features/preview/runtime";
import {
  interpolate,
  topological,
  type Composition,
} from "../../packages/core/composition";
import type { LabProject } from "../../packages/core/project";
import type { Parameter } from "../../packages/parameter-schema";
function compositionPlayer(
  config: {
    composition: Composition;
    parameters: Parameter[];
    children: Record<
      string,
      {
        session: string;
        projectId: string;
        inherit: boolean;
        parameters: { id: string; binding: string }[];
      }
    >;
  },
  interpolate: typeof import("../../packages/core/composition").interpolate,
  order: string[],
) {
  const c = config.composition;
  const lab = (window as any).lab;
  lab.register(config.parameters);
  let time = 0,
    playing = true,
    last = performance.now(),
    pointer = 0;
  const frames = new Map<string, HTMLIFrameElement>();
  document
    .querySelectorAll<HTMLIFrameElement>("[data-effect-layer]")
    .forEach((f) => frames.set(f.dataset.effectLayer!, f));
  function parameter(layerId: string, id: string, value: unknown) {
    const frame = frames.get(layerId),
      child = config.children[layerId];
    if (frame && child)
      frame.contentWindow?.postMessage(
        {
          protocol: 1,
          session: child.session,
          projectId: child.projectId,
          type: "parameter",
          data: { id, value },
        },
        "*",
      );
  }
  function setTarget(target: string, value: number) {
    const parts = target.split(":");
    if (parts[0] === "layer") {
      const el = document.getElementById("layer-" + parts[1]);
      if (!el) return;
      if (parts[2] === "opacity")
        el.style.opacity = String(Math.max(0, Math.min(1, value)));
      else {
        el.dataset[parts[2]] = String(value);
        el.style.transform = `translate(${el.dataset.x || 0}px,${el.dataset.y || 0}px) rotate(${el.dataset.rotation || 0}deg) scale(${el.dataset.scale || 1})`;
      }
    }
    if (parts[0] === "parameter") {
      for (const [layerId, child] of Object.entries(config.children)) {
        const p = child.parameters.find(
          (p) => p.id === parts[1] || p.binding === parts[1],
        );
        if (p && child.inherit) parameter(layerId, p.id, value);
      }
    }
  }
  function evaluate() {
    const values: Record<string, number> = {};
    for (const id of order) {
      const node = c.nodes.find((n) => n.id === id)!;
      const inputs = c.edges
        .filter((e) => e.target === id)
        .map((e) => values[e.source]);
      let value = node.value;
      if (node.type === "time") value = time;
      if (node.type === "pointer") value = pointer;
      if (node.type === "sine")
        value = Math.sin((inputs[0] ?? time) * node.value) * 0.5 + 0.5;
      if (node.type === "multiply") value = (inputs[0] ?? 1) * node.value;
      if (node.type === "output") {
        value = inputs[0] ?? node.value;
        if (node.target) setTarget(node.target, value);
      }
      values[id] = value;
    }
    for (const track of c.tracks) {
      const value = interpolate(track.keys, time);
      if (value !== undefined) setTarget(track.target, value);
    }
  }
  window.addEventListener("pointermove", (e) => {
    pointer = e.clientX / innerWidth;
  });
  window.addEventListener("message", (e) => {
    const childEntry = [...frames].find(
      ([, frame]) => frame.contentWindow === e.source,
    );
    if (!childEntry) return;
    const [id] = childEntry;
    const child = config.children[id];
    if (
      e.data?.session !== child.session ||
      e.data?.projectId !== child.projectId
    )
      return;
    if (e.data.type === "pointer" && Number.isFinite(e.data.data?.x))
      pointer = e.data.data.x;
    if (e.data.type === "ready" && child.inherit) {
      for (const [key, value] of Object.entries(lab.params)) {
        const p = child.parameters.find((p) => p.binding === key);
        if (p) parameter(id, p.id, value);
      }
      evaluate();
    }
    if (e.data.type === "error")
      console.error("Capa " + id + ": " + e.data.data?.message);
  });
  lab.onChange((p: Record<string, unknown>) => {
    for (const [id, child] of Object.entries(config.children)) {
      if (!child.inherit) continue;
      for (const [key, value] of Object.entries(p)) {
        const item = child.parameters.find((p) => p.binding === key);
        if (item) parameter(id, item.id, value);
      }
    }
  });
  window.addEventListener("lab:timeline", ((event: CustomEvent) => {
    const d = event.detail;
    if (typeof d.time === "number")
      time = Math.max(0, Math.min(c.duration, d.time));
    if (typeof d.playing === "boolean") playing = d.playing;
    evaluate();
  }) as EventListener);
  function tick(now: number) {
    if (playing && !lab.paused) {
      time += (now - last) / 1000;
      if (time > c.duration) {
        if (c.loop) time %= c.duration;
        else {
          time = c.duration;
          playing = false;
        }
      }
    }
    last = now;
    evaluate();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
export async function prepareProject(project: LabProject): Promise<Compiled> {
  if (!project.composition?.enabled) return compileProject(project);
  const c = project.composition;
  const order = topological(c.nodes, c.edges);
  const start = performance.now();
  const doc = document.implementation.createHTMLDocument("Composición");
  doc.body.style.cssText =
    "margin:0;background:#09070f;overflow:hidden;position:relative;width:100vw;height:100vh";
  const children: Record<
    string,
    {
      session: string;
      projectId: string;
      inherit: boolean;
      parameters: { id: string; binding: string }[];
    }
  > = {};
  const dependencies = new Set<string>();
  function effectiveVisible(id: string): boolean {
    const layer = c.layers.find((l) => l.id === id);
    return Boolean(
      layer &&
      layer.visible &&
      (!layer.parentId || effectiveVisible(layer.parentId)),
    );
  }
  for (const layer of c.layers) {
    const el = doc.createElement("div");
    el.id = "layer-" + layer.id;
    el.dataset.x = String(layer.x);
    el.dataset.y = String(layer.y);
    el.dataset.scale = String(layer.scale);
    el.dataset.rotation = String(layer.rotation);
    el.style.cssText = `position:absolute;inset:0;transform:translate(${layer.x}px,${layer.y}px) rotate(${layer.rotation}deg) scale(${layer.scale});opacity:${layer.opacity};display:${layer.visible ? "block" : "none"};mix-blend-mode:${layer.blend};pointer-events:${layer.locked || !layer.visible ? "none" : "auto"};${layer.mask === "circle" ? "clip-path:circle(40%);" : layer.mask === "rectangle" ? "clip-path:inset(10%);" : ""}`;
    if (layer.kind === "effect" && effectiveVisible(layer.id)) {
      const source = {
        ...(layer.source ?? project),
        composition: undefined,
        entry: layer.entry ?? layer.source?.entry ?? project.entry,
      };
      source.profile =
        source.entry.endsWith("tsx") || source.entry.endsWith("jsx")
          ? "react"
          : "html";
      const built = await compileProject(source);
      built.dependencies.forEach((d) => dependencies.add(d));
      const session = "layer-" + layer.id;
      const frame = doc.createElement("iframe");
      frame.dataset.effectLayer = layer.id;
      frame.setAttribute("sandbox", "allow-scripts");
      frame.setAttribute("title", layer.name);
      frame.style.cssText = "width:100%;height:100%;border:0;display:block";
      frame.srcdoc = runtimeDocument(
        built,
        session,
        source.id,
        source.parameters,
      );
      el.append(frame);
      children[layer.id] = {
        session,
        projectId: source.id,
        inherit: !layer.source,
        parameters: source.parameters,
      };
    }
    if (layer.kind === "text") {
      el.textContent = layer.text ?? layer.name;
      el.style.cssText +=
        ";display:flex;align-items:center;justify-content:center;font:600 clamp(30px,8vw,100px) system-ui;color:white;pointer-events:none;letter-spacing:-.05em";
      if (!layer.visible) el.style.display = "none";
    }
    if (layer.kind === "image") {
      const file = project.files.find((f) => f.path === layer.asset);
      if (!file) throw Error("Imagen ausente: " + layer.asset);
      const img = doc.createElement("img");
      img.src = file.content;
      img.style.cssText = "width:100%;height:100%;object-fit:contain";
      el.append(img);
    }
    const parent = layer.parentId
      ? doc.getElementById("layer-" + layer.parentId)
      : null;
    (parent ?? doc.body).append(el);
  }
  for (const layer of c.layers) {
    if (layer.parentId) {
      const el = doc.getElementById("layer-" + layer.id),
        parent = doc.getElementById("layer-" + layer.parentId);
      if (el && parent) parent.append(el);
    }
  }
  const js = `(${compositionPlayer.toString()})(${JSON.stringify({ composition: c, parameters: project.parameters, children })},${interpolate.toString()},${JSON.stringify(order)});`;
  const html = doc.documentElement.outerHTML;
  return {
    js,
    html,
    css: "",
    bytes: new TextEncoder().encode(js + html).length,
    dependencies: [...dependencies],
    duration: performance.now() - start,
  };
}
