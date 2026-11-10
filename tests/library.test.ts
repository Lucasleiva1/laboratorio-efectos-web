import { describe, it, expect } from "vitest";
import { createProject } from "../packages/core/project";
import { applyPreset } from "../src/services/library";
describe("Presets", () => {
  it("aplica valores compatibles y conserva el código", () => {
    const p = createProject();
    p.parameters = [
      {
        id: "speed",
        binding: "speed",
        label: "Velocidad",
        widget: "slider",
        value: 1,
        defaultValue: 1,
        min: 0,
        max: 5,
      },
    ];
    const result = applyPreset(p, {
      id: "preset",
      name: "violeta",
      projectId: p.id,
      createdAt: "",
      values: { speed: 4, missing: 2 },
    });
    expect(result.project.parameters[0].value).toBe(4);
    expect(result.project.files).toEqual(p.files);
    expect(result.omitted).toEqual(["missing"]);
    expect(p.parameters[0].value).toBe(1);
  });
  it("no aplica a un proyecto distinto", () => {
    expect(() =>
      applyPreset(createProject(), {
        id: "p",
        projectId: "otro",
        name: "otro",
        createdAt: "",
        values: {},
      }),
    ).toThrow();
  });
});
