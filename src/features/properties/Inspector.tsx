import {
  Box,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Trash2,
} from "lucide-react";
import {
  useLayoutEffect,
  useRef,
  type ReactNode,
  type HTMLAttributes,
} from "react";
import type { ParameterValue } from "../../../packages/parameter-schema";
import type { Layer } from "../../../packages/core/composition";
import { useLab } from "../../stores/lab";
import ControlManager from "./ControlManager";
import { ParameterList, ParameterSections } from "./ParameterControls";
import SourceLayerControls from "../composition/SourceLayerControls";
import {
  isBlankProject,
  removeElement,
  moveElement,
} from "../../services/insert-effect";
import { useLayerPointerDrag } from "./useLayerPointerDrag";
export { controlRenderers } from "./ParameterControls";
function Card({
  id,
  name,
  count,
  children,
  onRemove,
  dragHandle,
  moves,
  dragging,
  dropEdge,
  headerProps,
}: {
  id: string;
  name: string;
  count: number;
  children: ReactNode;
  onRemove?: () => void;
  dragHandle?: ReactNode;
  moves?: ReactNode;
  dragging?: boolean;
  dropEdge?: "before" | "after";
  headerProps?: HTMLAttributes<HTMLElement>;
}) {
  return (
    <details
      className={
        "inspector-component" +
        (dragging ? " dragging" : "") +
        (dropEdge ? " drop-" + dropEdge : "")
      }
      data-component-id={id}
      open
    >
      <summary {...headerProps}>
        {dragHandle}
        <ChevronDown size={14} className="component-chevron" />
        <Box size={15} />
        <span>{name}</span>
        <small>{count} opciones</small>
        {moves}
        {onRemove && (
          <button
            className="component-remove"
            title={"Eliminar " + name}
            aria-label={"Eliminar " + name}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }}
          >
            <Trash2 size={14} />
          </button>
        )}
      </summary>
      <div className="component-body">{children}</div>
    </details>
  );
}
export default function Inspector() {
  const project = useLab((s) => s.project);
  const set = useLab((s) => s.parameter);
  const positions = useRef(new Map<string, DOMRect>());
  function rememberPositions() {
    positions.current = new Map(
      [...document.querySelectorAll<HTMLElement>(".inspector-component")].map(
        (el) => [el.dataset.componentId!, el.getBoundingClientRect()],
      ),
    );
  }
  function rootChange(id: string, value: ParameterValue) {
    try {
      set(id, value);
    } catch (e) {
      useLab.getState().log("error", String(e));
    }
  }
  function layerChange(id: string, values: Partial<Layer>) {
    useLab.getState().update((p) =>
      Object.assign(
        p.composition!.layers.find((l) => l.id === id)!,
        values,
      ),
    );
  }
  const layers = project.composition?.enabled
    ? [...project.composition.layers].reverse()
    : undefined;
  const order = layers?.map((l) => l.id).join(",") ?? "";
  useLayoutEffect(() => {
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches)
      for (const el of document.querySelectorAll<HTMLElement>(
        ".inspector-component",
      )) {
        const previous = positions.current.get(el.dataset.componentId!);
        if (previous) {
          const dy = previous.top - el.getBoundingClientRect().top;
          if (Math.abs(dy) > 1)
            el.animate(
              [
                { transform: "translateY(" + dy + "px)" },
                { transform: "translateY(0)" },
              ],
              { duration: 220, easing: "ease-out" },
            );
        }
      }
    positions.current.clear();
  }, [order]);
  function move(id: string, target: string, edge: "before" | "after") {
    rememberPositions();
    useLab.getState().update((p) => moveElement(p, id, target, edge));
  }
  const { dragged, drop, ghost, headerProps } = useLayerPointerDrag(move);
  const groups = [
    ...new Set(
      project.parameters
        .filter((p) => !p.hidden)
        .map((p) => p.group || project.name),
    ),
  ];
  const empty = isBlankProject(project);
  const remove = (id?: string) =>
    useLab.getState().update((p) => removeElement(p, id));
  return (
    <div className="inspector component-inspector" key={project.id}>
      <div className="section-title">
        ELEMENTOS DEL PROYECTO{" "}
        <span>
          {empty ? 0 : (layers?.length ?? Math.max(1, groups.length))}
        </span>
      </div>
      {layers && layers.length > 1 && (
        <p className="layer-order-help">
          Arriba: delante · Abajo: fondo. Arrastrá el nombre para ordenar.
        </p>
      )}
      {layers
        ? layers.map((layer, index) => {
            const parameters =
              layer.source?.parameters ??
              (layer.kind === "effect" ? project.parameters : []);
            return (
              <Card
                key={layer.id}
                id={layer.id}
                name={layer.name}
                count={parameters.filter((p) => !p.hidden).length}
                onRemove={() => remove(layer.id)}
                dragging={dragged === layer.id}
                dropEdge={drop?.id === layer.id ? drop.edge : undefined}
                dragHandle={
                  <button
                    className="layer-drag-handle"
                    title={"Arrastrar " + layer.name}
                    aria-label={"Arrastrar " + layer.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    <GripVertical size={14} />
                  </button>
                }
                moves={
                  <>
                    <button
                      className="layer-order-button"
                      aria-label={"Subir " + layer.name}
                      title="Subir: más adelante"
                      disabled={index === 0}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        move(layer.id, layers[index - 1].id, "before");
                      }}
                    >
                      <ChevronUp size={12} />
                    </button>
                    <button
                      className="layer-order-button"
                      aria-label={"Bajar " + layer.name}
                      title="Bajar: más al fondo"
                      disabled={index === layers.length - 1}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        move(layer.id, layers[index + 1].id, "after");
                      }}
                    >
                      <ChevronDown size={12} />
                    </button>
                  </>
                }
                headerProps={headerProps(layer.id, layer.name)}
              >
                <label className="component-visible">
                  <input
                    aria-label="Mostrar elemento"
                    type="checkbox"
                    checked={layer.visible}
                    onChange={(e) =>
                      layerChange(layer.id, { visible: e.target.checked })
                    }
                  />
                  Mostrar elemento
                </label>
                {layer.source ? (
                  <SourceLayerControls layerId={layer.id} />
                ) : (
                  <ParameterSections
                    parameters={parameters}
                    change={rootChange}
                  />
                )}
                {layer.kind === "text" && (
                  <div className="control">
                    <label>Contenido</label>
                    <input
                      aria-label="Contenido"
                      value={layer.text ?? ""}
                      onChange={(e) =>
                        layerChange(layer.id, { text: e.target.value })
                      }
                    />
                  </div>
                )}
                <details className="component-section">
                  <summary>Posición y apariencia</summary>
                  {(
                    [
                      ["x", "Posición X", -2000, 2000, 1],
                      ["y", "Posición Y", -2000, 2000, 1],
                      ["scale", "Escala", 0.05, 5, 0.05],
                      ["rotation", "Rotación", -360, 360, 1],
                      ["opacity", "Opacidad", 0, 1, 0.01],
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <div className="control" key={key}>
                      <label>{label}</label>
                      <input
                        aria-label={label}
                        type="number"
                        min={min}
                        max={max}
                        step={step}
                        value={layer[key]}
                        onChange={(e) => {
                          if (Number.isFinite(e.target.valueAsNumber))
                            layerChange(layer.id, {
                              [key]: Math.min(
                                max,
                                Math.max(min, e.target.valueAsNumber),
                              ),
                            });
                        }}
                      />
                    </div>
                  ))}
                  {layer.kind === "effect" && (
                    <label className="component-visible">
                      <input
                        aria-label="Fondo transparente"
                        type="checkbox"
                        checked={Boolean(layer.transparent)}
                        onChange={(e) =>
                          layerChange(layer.id, {
                            transparent: e.target.checked,
                          })
                        }
                      />
                      Fondo transparente
                    </label>
                  )}
                </details>
              </Card>
            );
          })
        : groups.length
          ? groups.map((group) => (
              <Card
                key={group}
                id={group}
                name={groups.length === 1 ? project.name : group}
                onRemove={groups.length === 1 ? () => remove() : undefined}
                count={
                  project.parameters.filter(
                    (p) => (p.group || project.name) === group && !p.hidden,
                  ).length
                }
              >
                <ParameterList
                  parameters={project.parameters.filter(
                    (p) => (p.group || project.name) === group,
                  )}
                  change={rootChange}
                />
              </Card>
            ))
          : !empty && (
              <Card
                id="project"
                name={project.name}
                count={0}
                onRemove={() => remove()}
              >
                <p className="helper">
                  Este elemento todavía no expone opciones. Podés declararlas o
                  analizar su código.
                </p>
              </Card>
            )}
      {empty && (
        <p className="helper empty-canvas-message">
          El lienzo está vacío. Agregá una imagen, partículas, glow, texto o una
          forma desde el Explorador.
        </p>
      )}
      {layers &&
        project.parameters.length > 0 &&
        !layers.some((l) => l.kind === "effect" && !l.source) && (
          <Card
            id="global"
            name="Controles de composición"
            count={project.parameters.length}
          >
            <ParameterSections
              parameters={project.parameters}
              change={rootChange}
            />
          </Card>
        )}
      {ghost && (
        <div
          className="layer-pointer-ghost"
          style={{ left: ghost.x, top: ghost.y }}
        >
          {ghost.name}
        </div>
      )}
      <details className="component-section advanced-controls">
        <summary>Editar controles y código</summary>
        <ControlManager />
      </details>
    </div>
  );
}
