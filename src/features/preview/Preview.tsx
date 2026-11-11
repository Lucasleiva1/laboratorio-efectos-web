import QualitySelector from "./QualitySelector";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  Eye,
  Maximize2,
  Pause,
  Play,
  RotateCcw,
  Square,
} from "lucide-react";
import { prepareProject as compileProject } from "../../services/composition-runtime";
import { useLab } from "../../stores/lab";
import { runtimeDocument, validMessage } from "./runtime";
import {
  validateParameter,
  validateValue,
  type Parameter,
} from "../../../packages/parameter-schema";
export default function Preview({ expand }: { expand: () => void }) {
  const project = useLab((s) => s.project);
  const log = useLab((s) => s.log);
  const frame = useRef<HTMLIFrameElement>(null);
  const session = useRef("");
  const sequence = useRef(0);
  const [document, setDocument] = useState("");
  const [status, setStatus] = useState("Preparado");
  const [auto, setAuto] = useState(false);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [width, setWidth] = useState("100%");
  const [fps, setFps] = useState<number | null>(null);
  const [inspect, setInspect] = useState(false);
  const [duration, setDuration] = useState(0);
  // Store updates clone the project. Compare content so live controls do not
  // restart the iframe just because files/composition acquired new identities.
  const sourceKey = JSON.stringify([
    project.entry,
    project.profile,
    project.files,
    project.dependencies,
  ]);
  const compositionKey = JSON.stringify(
    project.composition
      ? {
          ...project.composition,
          layers: [...project.composition.layers]
            .sort((a, b) => a.id.localeCompare(b.id))
            .map((layer) => ({
              ...layer,
              source: layer.source
                ? {
                    ...layer.source,
                    parameters: layer.source.parameters.map(
                      ({ value: _value, ...definition }) => definition,
                    ),
                  }
                : undefined,
            })),
        }
      : null,
  );
  const previousInputs = useRef({ id: project.id, sourceKey, compositionKey });
  function send(type: string, data: unknown) {
    frame.current?.contentWindow?.postMessage(
      {
        protocol: 1,
        session: session.current,
        projectId: project.id,
        type,
        data,
      },
      "*",
    );
  }
  async function run() {
    const token = ++sequence.current;
    setRunning(true);
    setStatus("Compilando");
    const p = useLab.getState().project;
    try {
      const c = await compileProject(p);
      if (token !== sequence.current) return;
      session.current = crypto.randomUUID();
      setDocument(runtimeDocument(c, session.current, p.id, p.parameters));
      setDuration(c.duration);
      setStatus("Iniciando");
      setPaused(false);
      setFps(null);
      log(
        "info",
        `Compilado en ${Math.round(c.duration)} ms · ${c.bytes.toLocaleString("es-AR")} bytes`,
      );
    } catch (e) {
      if (token === sequence.current) {
        setStatus("Error");
        log("error", String(e));
      }
    }
  }
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (
        !validMessage(
          e,
          frame.current?.contentWindow ?? null,
          session.current,
          project.id,
        )
      )
        return;
      const { type, data } = e.data;
      if (type === "ready") {
        setStatus("Ejecutando");
        send(
          "layer-order",
          useLab.getState().project.composition?.layers.map((l) => l.id) ?? [],
        );
        for (const layer of useLab.getState().project.composition?.layers ?? [])
          for (const p of layer.source?.parameters ?? [])
            send("layer-parameter", {
              layerId: layer.id,
              id: p.id,
              value: p.value,
            });
      }
      if (type === "log" && typeof data?.message === "string")
        log(
          ["warn", "error"].includes(data.level) ? data.level : "info",
          data.message.slice(0, 10000),
        );
      if (type === "error") {
        setStatus("Error");
        log(
          "error",
          String(data?.message ?? "Error del runtime") +
            (data?.line ? " · línea " + data.line : ""),
        );
      }
      if (type === "metrics" && Number.isFinite(data?.fps)) setFps(data.fps);
      if (type === "parameters" && Array.isArray(data) && data.length <= 100) {
        const valid: Parameter[] = data.filter((p: Parameter) => {
          try {
            validateParameter(p);
            return true;
          } catch {
            return false;
          }
        });
        const old = useLab.getState().project.parameters;
        const merged: Parameter[] = old.map((p) => {
          const live = valid.find((v) => v.binding === p.binding);
          if (!live) return { ...p, bindingStatus: "broken" };
          let value = live.defaultValue;
          try {
            value = validateValue(live, p.value);
          } catch {}
          return {
            ...live,
            ...p,
            defaultValue: live.defaultValue,
            value,
            bindingStatus: "linked",
          };
        });
        for (const live of valid)
          if (!old.some((p) => p.binding === live.binding))
            merged.push({ ...live, bindingStatus: "linked" });
        if (JSON.stringify(old) !== JSON.stringify(merged))
          useLab.setState((s) => ({
            project: { ...s.project, parameters: merged },
            dirty: true,
            revision: s.revision + 1,
          }));
      }
      if (type === "selection")
        log("info", "Elemento: " + JSON.stringify(data));
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [project.id]);
  useEffect(() => {
    const previous = previousInputs.current;
    previousInputs.current = { id: project.id, sourceKey, compositionKey };
    if (!running || previous.id !== project.id) return;
    const sourceChanged = previous.sourceKey !== sourceKey;
    const compositionChanged = previous.compositionKey !== compositionKey;
    if ((auto && sourceChanged) || compositionChanged) {
      const token = sequence.current;
      const timer = setTimeout(
        () => {
          if (token === sequence.current) void run();
        },
        auto && sourceChanged ? 700 : 400,
      );
      return () => clearTimeout(timer);
    }
  }, [project.id, sourceKey, compositionKey, auto, running]);
  useEffect(() => {
    const handler = (event: Event) =>
      send("timeline", (event as CustomEvent).detail);
    window.addEventListener("lab:timeline-control", handler);
    return () => window.removeEventListener("lab:timeline-control", handler);
  });
  useEffect(() => {
    for (const p of project.parameters)
      send("parameter", { id: p.id, binding: p.binding, value: p.value });
  }, [project.parameters]);
  useEffect(() => {
    send("layer-order", project.composition?.layers.map((l) => l.id) ?? []);
    for (const layer of project.composition?.layers ?? [])
      for (const p of layer.source?.parameters ?? [])
        send("layer-parameter", {
          layerId: layer.id,
          id: p.id,
          value: p.value,
        });
  }, [project.composition]);
  useEffect(() => {
    sequence.current++;
    session.current = "";
    setRunning(false);
    setDocument("");
    setStatus("Preparado");
    setPaused(false);
    setFps(null);
  }, [project.id]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        void run();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    const handler = () => void run();
    window.addEventListener("lab:run-preview", handler);
    return () => window.removeEventListener("lab:run-preview", handler);
  });
  return (
    <section className="preview-pane">
      <div className="panel-heading">
        <span>
          <span
            className={"status-dot " + (status === "Ejecutando" ? "" : "muted")}
          />
          VISTA PREVIA <b className="runtime-state">{status}</b>
        </span>
        <button
          title="Ampliar vista previa"
          aria-label="Ampliar vista previa"
          onClick={expand}
        >
          <Maximize2 size={14} />
        </button>
      </div>
      <div className="preview-toolbar">
        <select
          aria-label="Tamaño de vista previa"
          value={width}
          onChange={(e) => setWidth(e.target.value)}
        >
          <option value="100%">Adaptable</option>
          <option value="1280px">Escritorio</option>
          <option value="768px">Tableta</option>
          <option value="375px">Móvil</option>
        </select>
        <label className="auto-label">
          <input
            type="checkbox"
            checked={auto}
            onChange={(e) => setAuto(e.target.checked)}
          />
          Auto
        </label>
        <QualitySelector />
        <div className="grow" />
        <button
          title="Inspeccionar DOM"
          aria-label="Inspeccionar DOM"
          disabled={!document}
          onClick={() => {
            setInspect(!inspect);
            send("inspect", !inspect);
          }}
        >
          <Eye size={13} />
        </button>
        <button
          title="Pausa cooperativa: el efecto debe consultar lab.paused"
          aria-label="Pausar efecto"
          disabled={!document}
          onClick={() => {
            setPaused(!paused);
            send("pause", !paused);
          }}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
        <button
          title="Detener"
          aria-label="Detener"
          disabled={!running && !document}
          onClick={() => {
            send("dispose", null);
            sequence.current++;
            session.current = "";
            setRunning(false);
            setDocument("");
            setStatus("Detenido");
            setPaused(false);
            setFps(null);
          }}
        >
          <Square size={12} />
        </button>
        <button
          onClick={() => void run()}
          disabled={status === "Compilando"}
          className="run-button"
        >
          {document ? <RotateCcw size={12} /> : <Play size={12} />}Ejecutar
        </button>
      </div>
      <div className="preview-stage">
        {document ? (
          <iframe
            ref={frame}
            key={session.current}
            title="Vista previa del efecto"
            sandbox="allow-scripts"
            referrerPolicy="no-referrer"
            srcDoc={document}
            style={{ width, maxWidth: "100%", height: "100%", border: 0 }}
          />
        ) : (
          <div className="preview-placeholder">
            <div className="preview-grid" />
            <div className="preview-symbol">
              <Play size={30} strokeWidth={1.2} />
            </div>
            <span className="mini-label">DEL CÓDIGO A LO EXTRAORDINARIO</span>
            <h2>
              Tu código.
              <br />
              En movimiento.
            </h2>
            <p>
              Ejecutá tu experimento para verlo acá.
              <br />
              HTML, TypeScript, React y motores gráficos.
            </p>
            <button className="primary" onClick={() => void run()}>
              <Play size={12} />
              Ejecutar experimento
            </button>
          </div>
        )}
      </div>
      <div className="preview-footer">
        <span>
          <Activity size={12} />
          FPS {fps === null ? "—" : fps.toFixed(0)}
        </span>
        <span>
          {duration ? Math.round(duration) + " ms · " : ""}Sandbox aislado
        </span>
      </div>
    </section>
  );
}
