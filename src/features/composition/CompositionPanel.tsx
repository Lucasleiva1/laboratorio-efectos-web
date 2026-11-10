import SourceLayerControls from "./SourceLayerControls";
import { useState } from "react";
import {
  Background,
  Controls,
  ReactFlow,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Plus,
  Trash2,
  Unlock,
} from "lucide-react";
import { useLab } from "../../stores/lab";
import {
  createComposition,
  createLayer,
  topological,
  type GraphNode,
} from "../../../packages/core/composition";
import { askText, confirmAction } from "../../components/Dialogs";
export default function CompositionPanel() {
  const p = useLab((s) => s.project);
  const update = useLab((s) => s.update);
  const log = useLab((s) => s.log);
  const c = p.composition;
  const [tab, setTab] = useState("layers");
  const [selected, setSelected] = useState("");
  const [nodeType, setNodeType] = useState<GraphNode["type"]>("time");
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [target, setTarget] = useState("");
  const [value, setValue] = useState(1);
  function init() {
    update((p) => {
      p.composition = createComposition();
      p.composition.layers.push({
        ...createLayer("effect", p.name),
        entry: p.entry,
      });
    });
  }
  function timeline(time: number, playing: boolean) {
    setTime(time);
    setPlaying(playing);
    window.dispatchEvent(
      new CustomEvent("lab:timeline-control", { detail: { time, playing } }),
    );
  }
  async function add(kind: "effect" | "text" | "image" | "group") {
    let name = await askText("Nombre de la capa", "Nueva capa");
    if (!name) return;
    let entry = p.entry,
      text = "",
      asset = "";
    if (kind === "effect") {
      entry = (await askText("Archivo de entrada del efecto", p.entry)) ?? "";
      if (!p.files.some((f) => f.path === entry)) {
        log("error", "El archivo de entrada no existe");
        return;
      }
    }
    if (kind === "text")
      text =
        (await askText(
          "Texto de la capa",
          "Create something extraordinary.",
        )) ?? "";
    if (kind === "image") {
      asset =
        (await askText(
          "Ruta de imagen importada",
          p.files.find((f) => f.content.startsWith("data:image"))?.path ??
            "assets/imagen.png",
        )) ?? "";
      if (!p.files.some((f) => f.path === asset)) {
        log("error", "Importá primero la imagen en el explorador");
        return;
      }
    }
    const layer = { ...createLayer(kind, name), entry, text, asset };
    update((p) => {
      p.composition!.layers.push(layer);
    });
    setSelected(layer.id);
  }
  function connect(connection: Connection) {
    if (!c) return;
    try {
      const source = c.nodes.find((n) => n.id === connection.source),
        dest = c.nodes.find((n) => n.id === connection.target);
      if (
        !source ||
        !dest ||
        source.type === "output" ||
        ["time", "pointer", "number"].includes(dest.type)
      )
        throw Error("Puertos incompatibles");
      const edge = {
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
      };
      topological(c.nodes, [...c.edges, edge]);
      update((p) => {
        p.composition!.edges.push(edge);
      });
    } catch (e) {
      log("error", String(e));
    }
  }
  if (!c)
    return (
      <section className="composition-panel empty-composition">
        <Layers size={22} />
        <p>Organizá tu código en capas, conexiones y animaciones.</p>
        <button className="primary" onClick={init}>
          Crear composición desde este efecto
        </button>
      </section>
    );
  const layer = c.layers.find((l) => l.id === selected);
  const choices = [
    ...c.layers.flatMap((l) =>
      ["opacity", "x", "y", "scale", "rotation"].map((key) => ({
        value: "layer:" + l.id + ":" + key,
        label: l.name + " · " + key,
      })),
    ),
    ...p.parameters
      .filter((p) => typeof p.value === "number")
      .map((p) => ({ value: "parameter:" + p.id, label: p.label })),
  ];
  return (
    <section className="composition-panel">
      <header className="composition-tabs">
        {[
          ["layers", "Capas"],
          ["nodes", "Nodos"],
          ["timeline", "Timeline"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <div className="grow" />
        <label>
          <input
            type="checkbox"
            checked={c.enabled}
            onChange={(e) =>
              update((p) => {
                p.composition!.enabled = e.target.checked;
              })
            }
          />
          Composición activa
        </label>
      </header>
      {tab === "layers" && (
        <div className="layers-layout">
          <div className="layer-list">
            <div className="layer-actions">
              {(["effect", "text", "image", "group"] as const).map((kind) => (
                <button key={kind} onClick={() => add(kind)}>
                  <Plus size={11} />
                  {
                    {
                      effect: "Efecto",
                      text: "Texto",
                      image: "Imagen",
                      group: "Grupo",
                    }[kind]
                  }
                </button>
              ))}
            </div>
            {c.layers.map((l, i) => (
              <div
                key={l.id}
                className={"layer-row " + (selected === l.id ? "selected" : "")}
              >
                <button
                  onClick={() =>
                    update((p) => {
                      p.composition!.layers[i].visible = !l.visible;
                    })
                  }
                  title="Visibilidad"
                >
                  {l.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
                <button onClick={() => setSelected(l.id)}>
                  {l.parentId ? "↳ " : ""}
                  {l.name}
                </button>
                <button
                  title="Bloquear"
                  onClick={() =>
                    update((p) => {
                      p.composition!.layers[i].locked = !l.locked;
                    })
                  }
                >
                  {l.locked ? <Lock size={11} /> : <Unlock size={11} />}
                </button>
                <button
                  title="Subir capa"
                  onClick={() =>
                    update((p) => {
                      if (i > 0)
                        [
                          p.composition!.layers[i - 1],
                          p.composition!.layers[i],
                        ] = [
                          p.composition!.layers[i],
                          p.composition!.layers[i - 1],
                        ];
                    })
                  }
                >
                  <ChevronUp size={12} />
                </button>
                <button
                  title="Duplicar capa"
                  onClick={() =>
                    update((p) => {
                      p.composition!.layers.splice(i + 1, 0, {
                        ...structuredClone(l),
                        id: crypto.randomUUID(),
                        name: l.name + " copia",
                      });
                    })
                  }
                >
                  <Copy size={11} />
                </button>
                <button
                  title="Eliminar capa"
                  onClick={async () => {
                    if (
                      await confirmAction(
                        "¿Eliminar la instancia de capa sin borrar su código?",
                      )
                    )
                      update((p) => {
                        p.composition!.layers = p
                          .composition!.layers.filter((x) => x.id !== l.id)
                          .map((x) =>
                            x.parentId === l.id
                              ? { ...x, parentId: undefined }
                              : x,
                          );
                      });
                  }}
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
          <div className="layer-inspector">
            {layer ? (
              <>
                <label>
                  Nombre
                  <input
                    value={layer.name}
                    onChange={(e) =>
                      update((p) => {
                        p.composition!.layers.find(
                          (l) => l.id === selected,
                        )!.name = e.target.value;
                      })
                    }
                  />
                </label>
                <div className="transform-fields">
                  {(["x", "y", "scale", "rotation", "opacity"] as const).map(
                    (key) => (
                      <label key={key}>
                        {key}
                        <input
                          aria-label={"Capa " + key}
                          type="number"
                          step={key === "opacity" || key === "scale" ? 0.05 : 1}
                          value={layer[key]}
                          min={key === "opacity" ? 0 : undefined}
                          max={key === "opacity" ? 1 : undefined}
                          onChange={(e) => {
                            if (Number.isFinite(e.target.valueAsNumber))
                              update((p) => {
                                p.composition!.layers.find(
                                  (l) => l.id === selected,
                                )![key] = e.target.valueAsNumber;
                              });
                          }}
                        />
                      </label>
                    ),
                  )}
                </div>
                <label>
                  Mezcla
                  <select
                    value={layer.blend}
                    onChange={(e) =>
                      update((p) => {
                        p.composition!.layers.find(
                          (l) => l.id === selected,
                        )!.blend = e.target.value;
                      })
                    }
                  >
                    {[
                      "normal",
                      "screen",
                      "multiply",
                      "overlay",
                      "difference",
                      "lighten",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Máscara
                  <select
                    value={layer.mask}
                    onChange={(e) =>
                      update((p) => {
                        p.composition!.layers.find(
                          (l) => l.id === selected,
                        )!.mask = e.target.value as typeof layer.mask;
                      })
                    }
                  >
                    {["none", "circle", "rectangle"].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Grupo
                  <select
                    value={layer.parentId ?? ""}
                    onChange={(e) =>
                      update((p) => {
                        p.composition!.layers.find(
                          (l) => l.id === selected,
                        )!.parentId = e.target.value || undefined;
                      })
                    }
                  >
                    <option value="">Sin grupo</option>
                    {c.layers
                      .filter(
                        (l) =>
                          l.kind === "group" &&
                          l.id !== selected &&
                          !l.parentId,
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </label>
                <SourceLayerControls layerId={layer.id} />
              </>
            ) : (
              <p className="helper">
                Seleccioná una capa. El código original sigue disponible en Modo
                libre.
              </p>
            )}
          </div>
        </div>
      )}
      {tab === "nodes" && (
        <div className="graph-layout">
          <div className="graph-toolbar">
            <select
              aria-label="Tipo de nodo"
              value={nodeType}
              onChange={(e) => setNodeType(e.target.value as GraphNode["type"])}
            >
              {["time", "pointer", "number", "sine", "multiply", "output"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
            <button
              onClick={() =>
                update((p) => {
                  p.composition!.nodes.push({
                    id: crypto.randomUUID(),
                    type: nodeType,
                    value: 1,
                    position: {
                      x: 50 + Math.random() * 300,
                      y: 30 + Math.random() * 100,
                    },
                    target: target || choices[0]?.value,
                  });
                })
              }
            >
              <Plus size={12} />
              Nodo
            </button>
            <select
              aria-label="Destino del nodo"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Elegí destino</option>
              {choices.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div className="graph-canvas">
            <ReactFlow
              colorMode="dark"
              nodes={c.nodes.map((n) => ({
                id: n.id,
                position: n.position,
                data: {
                  label: (
                    <div>
                      <b>{n.type}</b>
                      <input
                        aria-label={"Valor " + n.id}
                        type="number"
                        step="any"
                        value={n.value}
                        onChange={(e) =>
                          update((p) => {
                            p.composition!.nodes.find(
                              (x) => x.id === n.id,
                            )!.value = e.target.valueAsNumber;
                          })
                        }
                      />
                      {n.type === "output" && (
                        <select
                          aria-label={"Destino " + n.id}
                          value={n.target ?? ""}
                          onChange={(e) =>
                            update((p) => {
                              p.composition!.nodes.find(
                                (x) => x.id === n.id,
                              )!.target = e.target.value;
                            })
                          }
                        >
                          {choices.map((v) => (
                            <option key={v.value} value={v.value}>
                              {v.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  ),
                },
              }))}
              edges={c.edges}
              onConnect={connect}
              onNodeDragStop={(_, node) =>
                update((p) => {
                  p.composition!.nodes.find((n) => n.id === node.id)!.position =
                    node.position;
                })
              }
              onNodesDelete={(nodes) =>
                update((p) => {
                  const ids = nodes.map((n) => n.id);
                  p.composition!.nodes = p.composition!.nodes.filter(
                    (n) => !ids.includes(n.id),
                  );
                  p.composition!.edges = p.composition!.edges.filter(
                    (e) => !ids.includes(e.source) && !ids.includes(e.target),
                  );
                })
              }
              onEdgesDelete={(edges) =>
                update((p) => {
                  p.composition!.edges = p.composition!.edges.filter(
                    (e) => !edges.some((x) => x.id === e.id),
                  );
                })
              }
              fitView
            >
              <Background />
              <Controls showInteractive={false} />
            </ReactFlow>
          </div>
        </div>
      )}
      {tab === "timeline" && (
        <div className="timeline">
          <div className="timeline-toolbar">
            <button onClick={() => timeline(time, !playing)}>
              {playing ? "Pausar" : "Reproducir"}
            </button>
            <button onClick={() => timeline(0, false)}>Detener</button>
            <label>
              Duración
              <input
                type="number"
                min=".1"
                value={c.duration}
                step=".1"
                onChange={(e) =>
                  update((p) => {
                    p.composition!.duration = Math.max(
                      0.1,
                      e.target.valueAsNumber,
                    );
                  })
                }
              />
            </label>
            <label>
              <input
                type="checkbox"
                checked={c.loop}
                onChange={(e) =>
                  update((p) => {
                    p.composition!.loop = e.target.checked;
                  })
                }
              />
              Loop
            </label>
            <span>{time.toFixed(2)} s</span>
            <input
              aria-label="Tiempo de composición"
              type="range"
              min="0"
              max={c.duration}
              step=".01"
              value={time}
              onChange={(e) => timeline(e.target.valueAsNumber, false)}
            />
          </div>
          <div className="timeline-toolbar">
            <select
              aria-label="Propiedad animada"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Elegí propiedad</option>
              {choices.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <input
              aria-label="Valor de keyframe"
              type="number"
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.valueAsNumber)}
            />
            <button
              onClick={() => {
                if (!target) return;
                update((p) => {
                  let track = p.composition!.tracks.find(
                    (t) => t.target === target,
                  );
                  if (!track) {
                    track = { id: crypto.randomUUID(), target, keys: [] };
                    p.composition!.tracks.push(track);
                  }
                  const exists = track.keys.find((k) => k.time === time);
                  if (exists) exists.value = value;
                  else
                    track.keys.push({
                      id: crypto.randomUUID(),
                      time,
                      value,
                      easing: "linear",
                    });
                });
              }}
            >
              + Keyframe en {time.toFixed(2)} s
            </button>
          </div>
          {c.tracks.map((t) => (
            <div className="timeline-track" key={t.id}>
              <span>
                {choices.find((v) => v.value === t.target)?.label ?? t.target}
              </span>
              {[...t.keys]
                .sort((a, b) => a.time - b.time)
                .map((k) => (
                  <div className="keyframe" key={k.id}>
                    <button
                      title="Ir a keyframe"
                      onClick={() => {
                        timeline(k.time, false);
                        setTarget(t.target);
                        setValue(k.value);
                      }}
                    >
                      ◆ {k.time}s · {k.value}
                    </button>
                    <select
                      aria-label="Interpolación"
                      value={k.easing}
                      onChange={(e) =>
                        update((p) => {
                          p
                            .composition!.tracks.find((v) => v.id === t.id)!
                            .keys.find((v) => v.id === k.id)!.easing = e.target
                            .value as typeof k.easing;
                        })
                      }
                    >
                      {["linear", "hold", "ease"].map((v) => (
                        <option key={v}>{v}</option>
                      ))}
                    </select>
                    <button
                      title="Quitar keyframe"
                      onClick={() =>
                        update((p) => {
                          p.composition!.tracks.find(
                            (v) => v.id === t.id,
                          )!.keys = p
                            .composition!.tracks.find((v) => v.id === t.id)!
                            .keys.filter((v) => v.id !== k.id);
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
