import { parse } from "@babel/parser";
import type { SourceFile } from "../../packages/core/project";
import type { Parameter } from "../../packages/parameter-schema";
export interface Candidate {
  id: string;
  file: string;
  object: string;
  key: string;
  value: string | number | boolean;
  insertAt: number;
  source: string;
}
export function suggestParameters(file: SourceFile): Candidate[] {
  if (!/\.[jt]sx?$/.test(file.path)) return [];
  const ast = parse(file.content, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  });
  const result: Candidate[] = [];
  for (const statement of ast.program.body) {
    if (statement.type !== "VariableDeclaration") continue;
    for (const declaration of statement.declarations) {
      if (
        declaration.id.type !== "Identifier" ||
        declaration.init?.type !== "ObjectExpression"
      )
        continue;
      const object = declaration.id.name;
      if (!/config|settings|params|options/i.test(object)) continue;
      for (const property of declaration.init.properties) {
        if (
          property.type !== "ObjectProperty" ||
          property.computed ||
          property.key.type !== "Identifier"
        )
          continue;
        const value = property.value;
        if (
          !["NumericLiteral", "BooleanLiteral", "StringLiteral"].includes(
            value.type,
          )
        )
          continue;
        const v = (value as { value: string | number | boolean }).value;
        if (typeof v === "string" && !/^#[0-9a-f]{6}$/i.test(v)) continue;
        result.push({
          id: crypto.randomUUID(),
          file: file.path,
          object,
          key: property.key.name,
          value: v,
          insertAt: statement.end!,
          source: file.content,
        });
      }
    }
  }
  return result;
}
export function proposal(
  candidate: Candidate,
  widget: string,
): { content: string; parameter: Parameter; patch: string } {
  const { key, value, object } = candidate;
  const parameter: Parameter = {
    id: key,
    label: key,
    widget,
    binding: key,
    value,
    defaultValue: value,
    source: "analysis",
    ...(typeof value === "number"
      ? {
          min: 0,
          max: Math.max(10, value * 4),
          step: Number.isInteger(value) ? 1 : 0.1,
        }
      : {}),
  };
  const patch = `\n// Parámetro expuesto explícitamente en Effect Lab.\nwindow.lab.register(${JSON.stringify([parameter], null, 2)}, values => { ${object}.${key} = values[${JSON.stringify(key)}]; });\n`;
  return {
    content:
      candidate.source.slice(0, candidate.insertAt) +
      patch +
      candidate.source.slice(candidate.insertAt),
    parameter,
    patch,
  };
}
