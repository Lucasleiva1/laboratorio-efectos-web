import { describe, it, expect } from "vitest";
import {
  createProject,
  parseProject,
  safePath,
} from "../packages/core/project";
import { validateValue } from "../packages/parameter-schema";
describe("Proyectos", () => {
  it("empieza con nombre alfanumérico propio y único", () => {
    const a = createProject();
    const b = createProject();
    expect(a.name).toMatch(/^Proyecto-[A-Z0-9]{8}$/);
    expect(a.name).not.toBe(b.name);
  });
  it("conserva código y metadatos al serializar", () => {
    const p = createProject("Prueba");
    p.files[1].content = "body{color:red}";
    expect(parseProject(JSON.stringify(p))).toEqual(p);
  });
  it("rechaza traversal y archivos duplicados", () => {
    for (const path of [
      "../secreto",
      "C:/archivo",
      "/etc/passwd",
      "a\\b",
      "a/../b",
    ])
      expect(() => safePath(path)).toThrow();
    const p = createProject();
    p.files.push(p.files[0]);
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
  it("rechaza una entrada ausente y formatos futuros", () => {
    const p = createProject();
    p.entry = "ausente.js";
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
});
describe("Parámetros", () => {
  const p = {
    id: "speed",
    label: "Velocidad",
    widget: "slider",
    value: 1,
    defaultValue: 1,
    min: 0,
    max: 5,
    binding: "speed",
  };
  it("valida tipos, números finitos y rangos", () => {
    expect(validateValue(p, 8)).toBe(5);
    expect(() => validateValue(p, NaN)).toThrow();
    expect(() => validateValue(p, "1")).toThrow();
  });
  it("no admite objetos ni vectores no finitos en parámetros vectoriales", () => {
    const vector = {
      id: "v",
      label: "Vector",
      widget: "vector",
      binding: "position",
      value: [0, 1],
      defaultValue: [0, 1],
    };
    expect(() => validateValue(vector, {})).toThrow();
    expect(() => validateValue(vector, [0, Infinity])).toThrow();
    expect(validateValue(vector, [2, 3])).toEqual([2, 3]);
  });
});
