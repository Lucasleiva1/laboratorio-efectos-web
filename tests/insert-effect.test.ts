import { it, expect } from "vitest";
import { createProject, parseProject } from "../packages/core/project";
import {
  insertEffect,
  removeElement,
  isBlankProject,
  moveElement,
} from "../src/services/insert-effect";
import { compositionElements } from "../src/features/projects/elements";

it("conserva el código y parámetros existentes al sumar recursos independientes", () => {
  const p = createProject("Mi imagen");
  p.files[2].content = "console.log('imagen');";
  const files = structuredClone(p.files);
  const source = compositionElements[0];
  const original = JSON.stringify(source);
  insertEffect(p, source);
  insertEffect(p, source);
  expect(p.files).toEqual(files);
  expect(p.composition!.layers).toHaveLength(3);
  const [, a, b] = p.composition!.layers;
  a.source!.parameters.find((p) => p.id === "color")!.value = "#ff0000";
  expect(b.source!.parameters.find((p) => p.id === "color")!.value).toBe(
    "#ffffff",
  );
  expect(JSON.stringify(source)).toBe(original);
  expect(parseProject(JSON.stringify(p))).toEqual(p);
});

it("empieza desde vacío sin agregar una capa vacía y conserva el nombre del proyecto", () => {
  const p = createProject("Campaña");
  const id = p.id;
  insertEffect(p, compositionElements[0]);
  expect(p.name).toBe("Campaña");
  expect(p.id).toBe(id);
  expect(p.composition!.layers).toHaveLength(1);
  expect(p.composition!.layers[0].source).toBeUndefined();
  expect(p.files[2].content).toContain("getContext('2d')");
  expect(p.parameters.length).toBeGreaterThan(0);
});

it("serializa todos los elementos con sus controles y rechaza transparencia inválida", () => {
  for (const source of compositionElements)
    expect(parseProject(JSON.stringify(source))).toEqual(source);
  const p = createProject();
  insertEffect(p, compositionElements[0]);
  p.composition!.layers[0].transparent = "sí" as unknown as boolean;
  expect(() => parseProject(JSON.stringify(p))).toThrow("Transparencia");
});

it("elimina la última capa y permite empezar otra composición limpia", () => {
  const p = createProject("Mi composición");
  insertEffect(p, compositionElements[0]);
  removeElement(p, p.composition!.layers[0].id);
  expect(isBlankProject(p)).toBe(true);
  expect(p.parameters).toEqual([]);
  insertEffect(p, compositionElements[1]);
  expect(p.composition!.layers).toHaveLength(1);
  expect(p.composition!.layers[0].name).toBe("Glow");
  expect(p.name).toBe("Mi composición");
});

it("al eliminar una capa conserva las otras y limpia referencias de nodos y pistas", () => {
  const p = createProject();
  insertEffect(p, compositionElements[0]);
  insertEffect(p, compositionElements[1]);
  const [a, b] = p.composition!.layers;
  p.composition!.nodes.push({
    id: "out",
    type: "output",
    value: 1,
    target: "layer:" + a.id + ":x",
    position: { x: 0, y: 0 },
  });
  p.composition!.tracks.push({
    id: "track",
    target: "layer:" + a.id + ":opacity",
    keys: [],
  });
  removeElement(p, a.id);
  expect(p.composition!.layers.map((l) => l.id)).toEqual([b.id]);
  expect(p.composition!.nodes).toEqual([]);
  expect(p.composition!.tracks).toEqual([]);
  expect(parseProject(JSON.stringify(p))).toEqual(p);
});

it("muestra delante lo último agregado y permite mover elementos delante o detrás sin alterar opciones", () => {
  const p = createProject();
  for (const element of compositionElements.slice(0, 3))
    insertEffect(p, element);
  const ids = p.composition!.layers.map((l) => l.id);
  expect([...p.composition!.layers].reverse().map((l) => l.name)).toEqual([
    "Texto",
    "Glow",
    "Partículas",
  ]);
  const files = JSON.stringify(p.composition!.layers[1].source);
  moveElement(p, ids[0], ids[2], "before");
  expect([...p.composition!.layers].reverse().map((l) => l.name)).toEqual([
    "Partículas",
    "Texto",
    "Glow",
  ]);
  moveElement(p, ids[0], ids[1], "after");
  expect([...p.composition!.layers].reverse().map((l) => l.name)).toEqual([
    "Texto",
    "Glow",
    "Partículas",
  ]);
  expect(
    JSON.stringify(p.composition!.layers.find((l) => l.id === ids[1])!.source),
  ).toBe(files);
});
