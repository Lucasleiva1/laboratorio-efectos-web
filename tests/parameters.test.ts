import { describe, it, expect } from "vitest";
import {
  suggestParameters,
  proposal,
} from "../src/services/parameter-analysis";
describe("Análisis estático", () => {
  it("solo sugiere propiedades literales de configuraciones a nivel superior", () => {
    const f = {
      path: "effect.ts",
      content:
        'const config={count:500,speed:0.4,enabled:true,color:"#8b5cf6",computed:Math.random()};function test(){const config={other:2}}',
    };
    expect(suggestParameters(f).map((c) => c.key)).toEqual([
      "count",
      "speed",
      "enabled",
      "color",
    ]);
  });
  it("agrega un adaptador por posición AST conservando código ajeno", () => {
    const f = {
      path: "effect.js",
      content: "const config={speed:2};\nconsole.log(config.speed);",
    };
    const c = suggestParameters(f)[0];
    const p = proposal(c, "knob");
    expect(p.content.startsWith("const config={speed:2};")).toBe(true);
    expect(p.content.endsWith("console.log(config.speed);")).toBe(true);
    expect(p.patch).toContain('config.speed = values["speed"]');
  });
  it("no ejecuta expresiones durante el análisis", () => {
    expect(
      suggestParameters({
        path: "x.js",
        content: 'const config={value:(()=>{throw Error("NO")})()};',
      }),
    ).toEqual([]);
  });
});
