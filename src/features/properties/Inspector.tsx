import type { ComponentType } from "react";
import type {
  Parameter,
  ParameterValue,
} from "../../../packages/parameter-schema";
import { useLab } from "../../stores/lab";
import ControlManager from "./ControlManager";
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
export default function Inspector() {
  const parameters = useLab((s) => s.project.parameters);
  const set = useLab((s) => s.parameter);
  return (
    <div className="inspector">
      <div className="section-title">
        PARÁMETROS DEL EFECTO{" "}
        <span>{parameters.length.toString().padStart(2, "0")}</span>
      </div>
      <ControlManager />
      {parameters.length === 0 ? (
        <div className="empty-inspector">
          <span className="orb">⌘</span>
          <h3>Todo empieza en el código</h3>
          <p>
            Los parámetros expuestos por tu efecto aparecerán acá para que
            puedas ajustarlos.
          </p>
        </div>
      ) : (
        parameters
          .filter((p) => !p.hidden)
          .map((p) => {
            const Control = controlRenderers[p.widget];
            return (
              <div className="control" key={p.id}>
                <label>
                  {p.group && <small>{p.group} / </small>}
                  {p.label}{" "}
                  {p.bindingStatus === "broken" && (
                    <small className="broken-binding">Vínculo roto</small>
                  )}
                </label>
                {Control ? (
                  <Control
                    p={p}
                    change={(v) => {
                      try {
                        set(p.id, v);
                      } catch (e) {
                        useLab.getState().log("error", String(e));
                      }
                    }}
                  />
                ) : (
                  <small>Widget no registrado: {p.widget}</small>
                )}
                <button
                  className="text-button"
                  title="Restablecer valor"
                  onClick={() => set(p.id, p.defaultValue)}
                >
                  Restablecer
                </button>
              </div>
            );
          })
      )}
      <div className="inspector-note">
        <span className="status-dot" /> Código como fuente de verdad
        <p>
          Los controles acompañan tu código. Las posibilidades las decidís vos.
        </p>
      </div>
    </div>
  );
}
