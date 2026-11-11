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
const p = JSON.parse(
  await readFile(
    "examples/14-neon-network/14-neon-network-v0.1.0.effectlab",
    "utf8",
  ),
);
p.id = "15-neon-particle-trail";
p.name = "Partículas verdes · Estela y onda";
p.description =
  "Partículas diminutas, estela del cursor y onda expansiva de puntos al hacer clic. Pool fijo y dos pasadas de dibujo, sin malla ni desenfoque.";
p.parameters = [
  {
    id: "color",
    binding: "color",
    label: "Color",
    value: "#49ff9c",
    defaultValue: "#49ff9c",
    widget: "color",
    source: "code",
  },
  slider("count", "Límite de partículas", 160, 40, 240, 10),
  slider("size", "Tamaño de partícula (px)", 0.7, 0.35, 1.2, 0.05),
  slider("life", "Duración de la estela (s)", 1.5, 0.4, 3, 0.1),
  slider("spread", "Dispersión de la estela", 10, 2, 28, 1),
  slider("drift", "Movimiento suave", 8, 0, 25, 1),
  slider("glow", "Glow suave de las partículas", 0.5, 0, 1, 0.05),
  slider("intensity", "Luminosidad", 0.9, 0.2, 1, 0.05),
  {
    id: "ripples",
    binding: "ripples",
    label: "Ondas al hacer clic",
    value: true,
    defaultValue: true,
    widget: "toggle",
    source: "code",
  },
  slider("waveSpeed", "Velocidad de la onda", 190, 80, 350, 10),
  slider("waveForce", "Movimiento causado por la onda", 12, 0, 25, 1),
];
p.files.find((f) => f.path === "main.js").content = await readFile(
  "effects/neon-particles/main.js",
  "utf8",
);
p.files.find((f) => f.path === "parameters.json").content = JSON.stringify(
  p.parameters,
  null,
  2,
);
p.composition.layers[1].id = "particle-trail-layer";
p.composition.layers[1].name = "Partículas pequeñas · estela y ondas";
p.composition.layers[0].source.parameters.find(
  (p) => p.id === "gridOpacity",
).value = 0.045;
await mkdir("examples/15-neon-particle-trail", { recursive: true });
await writeFile(
  "examples/15-neon-particle-trail/15-neon-particle-trail-v0.1.0.effectlab",
  JSON.stringify(p, null, 2) + "\n",
);
console.log("Creado: partículas diminutas con pool fijo, sin malla.");
