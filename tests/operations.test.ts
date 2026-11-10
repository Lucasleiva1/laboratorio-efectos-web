import { describe, it, expect } from "vitest";
import { validateToolArgs } from "../src/services/operations";
import { parseProject, createProject } from "../packages/core/project";
describe("Frontera de herramientas", () => {
  it("rechaza herramientas inexistentes y argumentos no declarados", () => {
    expect(() => validateToolArgs("execute_shell_command", {})).toThrow();
    expect(() =>
      validateToolArgs("effectlab_status", { command: "calc" }),
    ).toThrow();
  });
  it("exige revisión para escrituras y rechaza tipos incorrectos", () => {
    expect(() =>
      validateToolArgs("write_project_file", {
        projectId: "p",
        path: "x.js",
        content: "x",
      }),
    ).toThrow();
    expect(() =>
      validateToolArgs("write_project_file", {
        projectId: "p",
        expectedRevision: "2",
        path: "x.js",
        content: "x",
      }),
    ).toThrow();
  });
  it("rechaza controles con vínculos al prototipo", () => {
    const p = createProject();
    p.parameters = [
      {
        id: "p",
        label: "No",
        binding: "__proto__",
        widget: "text",
        value: "x",
        defaultValue: "x",
      },
    ];
    expect(() => parseProject(JSON.stringify(p))).toThrow();
  });
});
