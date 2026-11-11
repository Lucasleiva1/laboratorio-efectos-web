import { readFile, writeFile, mkdir } from "node:fs/promises";
const slider = (id, label, value, min, max, step = 0.1) => ({
  id,
  binding: id,
  label,
  value,
  defaultValue: value,
  widget: "slider",
  min,
  max,
  step,
  source: "code",
});
const color = (id, label, value) => ({
  id,
  binding: id,
  label,
  value,
  defaultValue: value,
  widget: "color",
  source: "code",
});
const toggle = (id, label, value) => ({
  id,
  binding: id,
  label,
  value,
  defaultValue: value,
  widget: "toggle",
  source: "code",
});
const mesh = [
  color("color", "Color de la red", "#38ff94"),
  slider("spacing", "Separación de la malla", 54, 36, 96, 1),
  slider("radius", "Ancho de la estela", 150, 50, 320, 5),
  slider("persistence", "Duración de la estela (s)", 1.8, 0.3, 5, 0.1),
  slider("intensity", "Intensidad de la estela", 0.9, 0.1, 1.8, 0.05),
  slider("glow", "Glow de líneas y puntos", 8, 0, 25, 1),
  slider("lineWidth", "Grosor de las líneas", 0.7, 0.3, 2, 0.1),
  slider("base", "Red visible en reposo", 0.035, 0, 0.2, 0.005),
  slider("motion", "Movimiento de la malla", 0.8, 0, 3, 0.1),
  slider("pull", "Atracción al cursor", 0.6, 0, 2, 0.1),
  toggle("ripples", "Ondas al hacer clic", true),
  slider("waveSpeed", "Velocidad de expansión", 270, 80, 600, 10),
  slider("waveForce", "Deformación de la onda", 24, 0, 60, 1),
];
const grid = [
  color("background", "Color de fondo", "#050e0c"),
  color("gridColor", "Color de la retícula", "#17734e"),
  slider("gridOpacity", "Visibilidad de la retícula", 0.14, 0, 0.5, 0.01),
  slider("gridSize", "Separación de la retícula", 64, 24, 140, 4),
];
function project(id, name, parameters, code, background) {
  return {
    formatVersion: 1,
    id,
    name,
    createdAt: "2026-11-10T00:00:00Z",
    modifiedAt: "2026-11-10T00:00:00Z",
    profile: "html",
    entry: "index.html",
    parameters,
    dependencies: [],
    tags: ["verde", "tecnológico", "cursor", "red"],
    description:
      "Red tecnológica verde con estela del cursor y ondas expansivas al hacer clic. Glow integrado en la red.",
    files: [
      {
        path: "index.html",
        content:
          '<canvas id="network" aria-label="Red tecnológica interactiva"></canvas><link rel="stylesheet" href="style.css"><script type="module" src="main.js"></script>',
      },
      {
        path: "style.css",
        content:
          "html,body{width:100%;height:100%;margin:0;overflow:hidden;background:" +
          background +
          "}canvas{display:block;width:100%;height:100%;touch-action:none}",
      },
      { path: "main.js", content: code },
      { path: "parameters.json", content: JSON.stringify(parameters, null, 2) },
    ],
  };
}
const p = project(
  "14-neon-network",
  "Red tecnológica · Estela y ondas",
  mesh,
  await readFile("effects/neon-network/mesh.js", "utf8"),
  "transparent",
);
const bg = project(
  "network-grid",
  "Retícula de fondo",
  grid,
  await readFile("effects/neon-network/grid.js", "utf8"),
  "#050e0c",
);
const layer = (id, name) => ({
  id,
  name,
  kind: "effect",
  entry: "index.html",
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
  visible: true,
  locked: false,
  blend: "normal",
  mask: "none",
});
p.composition = {
  version: 1,
  enabled: true,
  layers: [
    { ...layer("network-grid-layer", "Retícula de fondo"), source: bg },
    {
      ...layer("network-mesh-layer", "Red reactiva · cursor y ondas"),
      transparent: true,
    },
  ],
  nodes: [],
  edges: [],
  tracks: [],
  duration: 8,
  loop: true,
};
await mkdir("examples/14-neon-network", { recursive: true });
await writeFile(
  "examples/14-neon-network/14-neon-network-v0.1.0.effectlab",
  JSON.stringify(p, null, 2) + "\n",
);
console.log("Creado: 14-neon-network-v0.1.0.effectlab");
