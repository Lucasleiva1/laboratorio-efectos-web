import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useLab } from "../../stores/lab";
import {
  suggestParameters,
  proposal,
  type Candidate,
} from "../../services/parameter-analysis";
import { askText, confirmAction } from "../../components/Dialogs";
import type { Parameter } from "../../../packages/parameter-schema";
export default function ControlManager() {
  const project = useLab((s) => s.project);
  const update = useLab((s) => s.update);
  const log = useLab((s) => s.log);
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [widget, setWidget] = useState("slider");
  const [editing, setEditing] = useState<Parameter | null>(null);
  function scan() {
    try {
      setCandidates(project.files.flatMap(suggestParameters));
      setOpen(true);
    } catch (e) {
      log("error", "Análisis: " + String(e));
    }
  }
  async function add() {
    const binding = await askText(
      "Identificador del parámetro expuesto",
      "intensity",
    );
    if (!binding) return;
    const name = await askText("Nombre del control", binding);
    if (!name) return;
    const exists = project.parameters.find((p) => p.binding === binding);
    if (!exists) {
      log(
        "warn",
        "Primero exponé el parámetro con window.lab.register. Se puede descubrir un objeto config con Analizar código.",
      );
      return;
    }
    update((p) =>
      p.parameters.push({ ...exists, id: crypto.randomUUID(), label: name }),
    );
  }
  function apply() {
    if (!selected) return;
    const current = useLab
      .getState()
      .project.files.find((f) => f.path === selected.file);
    if (current?.content !== selected.source) {
      log(
        "error",
        "El archivo cambió. Volvé a analizar para evitar sobrescrituras.",
      );
      setSelected(null);
      return;
    }
    const p = proposal(selected, widget);
    update((project) => {
      project.files.find((f) => f.path === selected.file)!.content = p.content;
      project.parameters.push(p.parameter);
    });
    setSelected(null);
    setCandidates([]);
    log(
      "info",
      "Adaptador agregado. Ejecutá el efecto y verificá que consulta el objeto actualizado.",
    );
  }
  return (
    <div className="control-manager">
      <div className="control-actions">
        <button onClick={add}>
          <Plus size={12} />
          Control
        </button>
        <button onClick={scan}>
          <Search size={12} />
          Analizar código
        </button>
      </div>
      <button className="text-button" onClick={() => setOpen(!open)}>
        {open ? "Ocultar" : "Organizar controles"}
      </button>
      {open && (
        <>
          <p className="helper">
            Las sugerencias son análisis estático. El vínculo necesita un
            adaptador y una prueba en el efecto.
          </p>
          {candidates.map((c) => (
            <button
              className="suggestion"
              key={c.id}
              onClick={() => {
                setSelected(c);
                setWidget(
                  typeof c.value === "boolean"
                    ? "toggle"
                    : typeof c.value === "string"
                      ? "color"
                      : "slider",
                );
              }}
            >
              {c.object}.{c.key}
              <small>{String(c.value)} · Detectado</small>
            </button>
          ))}
          {project.parameters.map((p, i) => (
            <div className="manage-row" key={p.id}>
              <button onClick={() => setEditing(structuredClone(p))}>
                {p.label}
              </button>
              <button
                title="Subir control"
                onClick={() =>
                  update((project) => {
                    if (i > 0)
                      [project.parameters[i - 1], project.parameters[i]] = [
                        project.parameters[i],
                        project.parameters[i - 1],
                      ];
                  })
                }
              >
                <ChevronUp size={12} />
              </button>
              <button
                title="Ocultar o mostrar control"
                onClick={() =>
                  update((project) => {
                    project.parameters[i].hidden = !p.hidden;
                  })
                }
              >
                <Eye size={12} />
              </button>
              <button
                title="Eliminar control"
                onClick={async () => {
                  if (
                    await confirmAction(
                      "¿Quitar este control sin borrar el código?",
                    )
                  )
                    update((project) => {
                      project.parameters = project.parameters.filter(
                        (v) => v.id !== p.id,
                      );
                    });
                }}
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </>
      )}
      {selected && (
        <div className="modal-backdrop">
          <section className="modal wide">
            <button
              className="modal-close"
              onClick={() => setSelected(null)}
              aria-label="Cerrar propuesta"
            >
              <X size={16} />
            </button>
            <h2>
              Exponer {selected.object}.{selected.key}
            </h2>
            <p>
              Se agrega este adaptador después de la declaración. El efecto debe
              leer el objeto actualizado para responder. Se conserva el resto
              del archivo.
            </p>
            <select
              aria-label="Widget propuesto"
              value={widget}
              onChange={(e) => setWidget(e.target.value)}
            >
              {[
                "slider",
                "knob",
                "number",
                "toggle",
                "color",
                "text",
                "select",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
            <pre className="diff-add">{proposal(selected, widget).patch}</pre>
            <button className="primary" onClick={apply}>
              Aceptar cambio de código
            </button>
          </section>
        </div>
      )}
      {editing && (
        <div className="modal-backdrop">
          <form
            className="modal"
            onSubmit={(e) => {
              e.preventDefault();
              update((project) => {
                const i = project.parameters.findIndex(
                  (p) => p.id === editing.id,
                );
                project.parameters[i] = editing;
              });
              setEditing(null);
            }}
          >
            <button
              type="button"
              className="modal-close"
              onClick={() => setEditing(null)}
              aria-label="Cerrar control"
            >
              <X size={16} />
            </button>
            <h2>Editar control</h2>
            <label>
              Etiqueta
              <input
                value={editing.label}
                onChange={(e) =>
                  setEditing({ ...editing, label: e.target.value })
                }
              />
            </label>
            <label>
              Widget
              <select
                value={editing.widget}
                onChange={(e) =>
                  setEditing({ ...editing, widget: e.target.value })
                }
              >
                {[
                  "slider",
                  "knob",
                  "number",
                  "toggle",
                  "color",
                  "text",
                  "select",
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
            <label>
              Grupo
              <input
                value={editing.group ?? ""}
                onChange={(e) =>
                  setEditing({ ...editing, group: e.target.value })
                }
              />
            </label>
            {typeof editing.defaultValue === "number" &&
              (["min", "max", "step"] as const).map((key) => (
                <label key={key}>
                  {key}
                  <input
                    type="number"
                    step="any"
                    value={editing[key] ?? 0}
                    onChange={(e) =>
                      setEditing({ ...editing, [key]: e.target.valueAsNumber })
                    }
                  />
                </label>
              ))}
            <p className="helper">
              Vínculo: {editing.binding}. Cambiar el widget no crea un parámetro
              nuevo en el código.
            </p>
            <button className="primary">Guardar control</button>
          </form>
        </div>
      )}
    </div>
  );
}
