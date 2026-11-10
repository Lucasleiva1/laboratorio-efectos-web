import { useEffect, useRef, useState } from "react";
import { useLab } from "../../stores/lab";
export default function QualitySelector() {
  const project = useLab((s) => s.project);
  const [profile, setProfile] = useState("original");
  const original = useRef<Record<string, number> | null>(null);
  const expected = useRef("");
  const values = JSON.stringify(project.parameters.map((p) => [p.id, p.value]));
  const supported =
    project.dependencies.includes("pixi.js") &&
    project.parameters.some((p) => p.binding === "count") &&
    project.parameters.some((p) => p.binding === "glow");
  useEffect(() => {
    original.current = null;
    expected.current = "";
    setProfile("original");
  }, [project.id]);
  useEffect(() => {
    if (expected.current && expected.current !== values) setProfile("custom");
  }, [values]);
  function apply(next: string) {
    if (!supported) return;
    if (!original.current)
      original.current = Object.fromEntries(
        project.parameters
          .filter(
            (p) =>
              ["count", "glow"].includes(p.binding) &&
              typeof p.value === "number",
          )
          .map((p) => [p.binding, Number(p.value)]),
      );
    const factor = next === "balanced" ? 0.6 : next === "light" ? 0.3 : 1;
    useLab.getState().update((p) => {
      for (const parameter of p.parameters) {
        const base = original.current?.[parameter.binding];
        if (base === undefined) continue;
        let value = base * factor;
        if (parameter.binding === "count") value = Math.round(value);
        parameter.value = Math.max(
          parameter.min ?? 0,
          Math.min(parameter.max ?? Infinity, value),
        );
      }
      expected.current = JSON.stringify(
        p.parameters.map((p) => [p.id, p.value]),
      );
    });
    setProfile(next);
  }
  return (
    <select
      className="quality-select"
      aria-label="Perfil de calidad"
      title={
        supported
          ? "Reduce cantidad y glow respecto al estado capturado. Original recupera ese estado. Se puede deshacer."
          : "Este efecto no declara cantidad y glow compatibles con perfiles de calidad."
      }
      disabled={!supported}
      value={profile}
      onChange={(e) => apply(e.target.value)}
    >
      <option value="original">Original</option>
      <option value="balanced">Equilibrada</option>
      <option value="light">Ligera</option>
      <option value="custom" disabled>
        Personalizada
      </option>
    </select>
  );
}
