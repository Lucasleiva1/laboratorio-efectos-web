import { describe, it, expect } from "vitest";
import {
  interpolate,
  topological,
  type GraphNode,
} from "../packages/core/composition";
const node = (id: string): GraphNode => ({
  id,
  type: "number",
  value: 1,
  position: { x: 0, y: 0 },
});
describe("Composición", () => {
  it("ordena dependencias y rechaza ciclos y conexiones huérfanas", () => {
    const nodes = ["a", "b", "c"].map(node);
    expect(
      topological(nodes, [
        { id: "ab", source: "a", target: "b" },
        { id: "bc", source: "b", target: "c" },
      ]),
    ).toEqual(["a", "b", "c"]);
    expect(() =>
      topological(nodes, [
        { id: "ab", source: "a", target: "b" },
        { id: "ba", source: "b", target: "a" },
      ]),
    ).toThrow("ciclo");
    expect(() =>
      topological(nodes, [{ id: "x", source: "ausente", target: "b" }]),
    ).toThrow();
  });
  it("evalúa keyframes de forma determinista", () => {
    const keys = [
      { id: "a", time: 0, value: 0, easing: "linear" as const },
      { id: "b", time: 2, value: 10, easing: "linear" as const },
    ];
    expect(interpolate(keys, 1)).toBe(5);
    expect(interpolate(keys, -1)).toBe(0);
    expect(interpolate(keys, 5)).toBe(10);
    expect(interpolate([{ ...keys[0], easing: "hold" }, keys[1]], 1)).toBe(0);
  });
});
