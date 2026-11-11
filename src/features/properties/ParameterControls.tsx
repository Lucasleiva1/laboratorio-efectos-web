import type { ComponentType } from "react";
import type {
  Parameter,
  ParameterValue,
} from "../../../packages/parameter-schema";
interface Props {
  p: Parameter;
  change: (value: ParameterValue) => void;
}
const number = ({ p, change }: Props) => (
  <input
    aria-label={p.label}
    type="number"
    value={Number(p.value)}
    min={p.min}
    max={p.max}
    step={p.step ?? 0.1}
    onChange={(e) => {
      if (e.target.value !== "") change(e.target.valueAsNumber);
    }}
  />
);
const range = ({ p, change }: Props) => (
  <div className="range-pair">
    <input
      aria-label={p.label}
      type="range"
      value={Number(p.value)}
      min={p.min ?? 0}
      max={p.max ?? 100}
      step={p.step ?? 1}
      onChange={(e) => change(e.target.valueAsNumber)}
    />
    {number({ p, change })}
  </div>
);
export const controlRenderers: Record<string, ComponentType<Props>> = {
  slider: range,
  knob: range,
  number,
  color: ({ p, change }) => (
    <div className="color-pair">
      <input
        aria-label={p.label}
        type="color"
        value={String(p.value)}
        onChange={(e) => change(e.target.value)}
      />
      <span>{String(p.value).toUpperCase()}</span>
    </div>
  ),
  toggle: ({ p, change }) => (
    <input
      aria-label={p.label}
      type="checkbox"
      checked={Boolean(p.value)}
      onChange={(e) => change(e.target.checked)}
    />
  ),
  text: ({ p, change }) => (
    <input
      aria-label={p.label}
      value={String(p.value)}
      onChange={(e) => change(e.target.value)}
    />
  ),
  select: ({ p, change }) => (
    <select
      aria-label={p.label}
      value={String(p.value)}
      onChange={(e) => change(e.target.value)}
    >
      {p.options?.map((v) => (
        <option key={v}>{v}</option>
      ))}
    </select>
  ),
};

export function ParameterList({
  parameters,
  change,
}: {
  parameters: Parameter[];
  change: (id: string, value: ParameterValue) => void;
}) {
  return (
    <>
      {parameters
        .filter((p) => !p.hidden)
        .map((p) => {
          const Control = controlRenderers[p.widget];
          return (
            <div className="control" key={p.id}>
              <label>
                {p.label}{" "}
                {p.bindingStatus === "broken" && (
                  <small className="broken-binding">Vínculo roto</small>
                )}
              </label>
              {Control ? (
                <Control p={p} change={(value) => change(p.id, value)} />
              ) : (
                <small>Widget no registrado: {p.widget}</small>
              )}
              {p.description && <p className="helper">{p.description}</p>}
              <button
                className="text-button"
                title="Restablecer valor"
                onClick={() => change(p.id, p.defaultValue)}
              >
                Restablecer
              </button>
            </div>
          );
        })}
    </>
  );
}

export function ParameterSections(props: {
  parameters: Parameter[];
  change: (id: string, value: ParameterValue) => void;
}) {
  const groups = [
    ...new Set(
      props.parameters
        .filter((p) => !p.hidden)
        .map((p) => p.group || "Opciones"),
    ),
  ];
  if (groups.length <= 1) return <ParameterList {...props} />;
  return (
    <>
      {groups.map((group) => (
        <details className="component-section" open key={group}>
          <summary>{group}</summary>
          <ParameterList
            parameters={props.parameters.filter(
              (p) => (p.group || "Opciones") === group,
            )}
            change={props.change}
          />
        </details>
      ))}
    </>
  );
}
