import type { LabProject } from "./project";
export interface Layer {
  id: string;
  name: string;
  kind: "effect" | "text" | "image" | "group";
  entry?: string;
  text?: string;
  asset?: string;
  source?: LabProject;
  transparent?: boolean;
  parentId?: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blend: string;
  mask: "none" | "circle" | "rectangle";
}
export interface GraphNode {
  id: string;
  type: "time" | "pointer" | "number" | "sine" | "multiply" | "output";
  value: number;
  target?: string;
  position: { x: number; y: number };
}
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}
export interface Keyframe {
  id: string;
  time: number;
  value: number;
  easing: "linear" | "hold" | "ease";
}
export interface Track {
  id: string;
  target: string;
  keys: Keyframe[];
}
export interface Composition {
  version: 1;
  enabled: boolean;
  layers: Layer[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  tracks: Track[];
  duration: number;
  loop: boolean;
}
export function createComposition(): Composition {
  return {
    version: 1,
    enabled: true,
    layers: [],
    nodes: [],
    edges: [],
    tracks: [],
    duration: 8,
    loop: true,
  };
}
export function createLayer(kind: Layer["kind"], name: string): Layer {
  return {
    id: crypto.randomUUID(),
    kind,
    name,
    x: 0,
    y: 0,
    scale: 1,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blend: "normal",
    mask: "none",
  };
}
export function topological(nodes: GraphNode[], edges: GraphEdge[]): string[] {
  const ids = new Set(nodes.map((n) => n.id));
  const result: string[] = [];
  const visiting = new Set<string>();
  const done = new Set<string>();
  if (
    ids.size !== nodes.length ||
    edges.some((e) => !ids.has(e.source) || !ids.has(e.target))
  )
    throw Error("Conexión huérfana o ID duplicado");
  function visit(id: string) {
    if (visiting.has(id)) throw Error("El grafo contiene un ciclo");
    if (done.has(id)) return;
    if (!ids.has(id)) throw Error("Conexión huérfana");
    visiting.add(id);
    for (const e of edges.filter((e) => e.target === id)) visit(e.source);
    visiting.delete(id);
    done.add(id);
    result.push(id);
  }
  nodes.forEach((n) => visit(n.id));
  return result;
}
export function interpolate(
  keys: Keyframe[],
  time: number,
): number | undefined {
  const sorted = [...keys].sort((a, b) => a.time - b.time);
  if (!sorted.length) return undefined;
  if (time <= sorted[0].time) return sorted[0].value;
  for (let i = 1; i < sorted.length; i++) {
    const a = sorted[i - 1],
      b = sorted[i];
    if (time <= b.time) {
      let t = (time - a.time) / (b.time - a.time || 1);
      if (a.easing === "hold") t = 0;
      if (a.easing === "ease") t = t * t * (3 - 2 * t);
      return a.value + (b.value - a.value) * t;
    }
  }
  return sorted.at(-1)!.value;
}
