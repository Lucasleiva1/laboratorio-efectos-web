export type ParameterValue = number | boolean | string | number[];
export interface Parameter {
  id: string;
  label: string;
  widget: string;
  value: ParameterValue;
  defaultValue: ParameterValue;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  group?: string;
  hidden?: boolean;
  binding: string;
  source?: string;
  description?: string;
  bindingStatus?: "pending" | "linked" | "broken";
}
export function validateParameter(p: Parameter): void {
  if (
    !p ||
    typeof p.id !== "string" ||
    !p.id ||
    p.id.length > 120 ||
    typeof p.label !== "string" ||
    p.label.length > 200 ||
    typeof p.binding !== "string" ||
    !/^[a-zA-Z_][\w.-]{0,99}$/.test(p.binding) ||
    p.binding
      .split(/[.-]/)
      .some((s) => ["__proto__", "prototype", "constructor"].includes(s)) ||
    typeof p.widget !== "string" ||
    p.widget.length > 80
  )
    throw Error("Esquema de parámetro inválido");
  if (
    !["number", "boolean", "string"].includes(typeof p.defaultValue) &&
    !Array.isArray(p.defaultValue)
  )
    throw Error("Tipo de parámetro no compatible");
  for (const key of ["min", "max", "step"] as const)
    if (
      p[key] !== undefined &&
      (typeof p[key] !== "number" || !Number.isFinite(p[key]))
    )
      throw Error("Rango no finito");
  if (
    (p.min !== undefined && p.max !== undefined && p.min > p.max) ||
    (p.step !== undefined && p.step <= 0)
  )
    throw Error("Rango inválido");
  if (
    p.options &&
    (!Array.isArray(p.options) ||
      p.options.length > 200 ||
      p.options.some((o) => typeof o !== "string"))
  )
    throw Error("Opciones inválidas");
  validateValue(p, p.defaultValue);
  validateValue(p, p.value);
}
export function validateValue(p: Parameter, value: unknown): ParameterValue {
  if (typeof value !== typeof p.defaultValue)
    throw new Error("Tipo incompatible para " + p.label);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Número no válido");
    return Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, value));
  }
  if (
    Array.isArray(p.defaultValue) &&
    (!Array.isArray(value) ||
      value.length !== p.defaultValue.length ||
      !value.every((v) => typeof v === "number" && Number.isFinite(v)))
  )
    throw new Error("Vector no válido");
  if (
    p.widget === "color" &&
    (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value))
  )
    throw new Error("Color inválido");
  if (p.options && !p.options.includes(String(value)))
    throw new Error("Opción inválida");
  return value as ParameterValue;
}
