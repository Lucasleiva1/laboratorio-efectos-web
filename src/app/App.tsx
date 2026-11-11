import { lazy, Suspense, useEffect, useState, useRef } from "react";
import AppUpdates from "../features/projects/AppUpdates";
import product from "../../package.json";
import {
  Activity,
  ArrowDownToLine,
  Box,
  Check,
  LoaderCircle,
  ChevronRight,
  Code2,
  FileCode2,
  Files,
  FlaskConical,
  FolderOpen,
  Maximize2,
  Play,
  Plus,
  Redo2,
  Save,
  Settings2,
  SlidersHorizontal,
  Terminal,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import {
  createProject,
  createProjectName,
  safePath,
} from "../../packages/core/project";
import {
  createComposition,
  createLayer,
} from "../../packages/core/composition";
import { useLab } from "../stores/lab";
import { openProject } from "../services/persistence";
import { saveWithFeedback, type SaveFeedback } from "../services/save-feedback";
import Inspector from "../features/properties/Inspector";
import { askText, confirmAction, DialogHost } from "../components/Dialogs";
import Preview from "../features/preview/Preview";
import ExportDialog from "../features/exporter/ExportDialog";
const CompositionPanel = lazy(
  () => import("../features/composition/CompositionPanel"),
);
const LibraryPanel = lazy(() => import("../features/library/LibraryPanel"));
import { examples } from "../features/projects/examples";
import ImportAssets from "../features/projects/ImportAssets";
import ElementPalette from "../features/projects/ElementPalette";
import Recovery from "../features/projects/Recovery";
import { McpBridgeHost } from "../features/ai/McpPanel";
import ReviewDialog from "../features/ai/ReviewDialog";
const AgentPanel = lazy(() => import("../features/ai/ExternalAssistant"));
const McpPanel = lazy(() => import("../features/ai/McpPanel"));
const CodeEditor = lazy(() => import("../features/code-editor/CodeEditor"));
export default function App() {
  const lab = useLab();
  const [saveFeedback, setSaveFeedback] = useState<SaveFeedback | null>(null);
  const saveInFlight = useRef(false);
  const saving = saveFeedback?.phase === "saving";
  const currentSave =
    saveFeedback?.projectId === lab.project.id ? saveFeedback : null;
  const saveMessage = saving
    ? "Guardando proyecto…"
    : currentSave?.phase === "error"
      ? "No se pudo guardar: " + currentSave.error
      : currentSave?.phase === "cancelled"
        ? "Guardado cancelado"
        : lab.dirty
          ? "Cambios sin guardar"
          : currentSave?.phase === "saved"
            ? "Guardado · " + currentSave.time
            : "Sin cambios pendientes";
  const [resourcesOpen, setResourcesOpen] = useState(true);
  const [layout, setLayout] = useState("split");
  const [settings, setSettings] = useState(false);
  const [textColor, setTextColor] = useState(() => {
    const stored = localStorage.getItem("effectlab-text-color");
    return stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : "#ffffff";
  });
  useEffect(() => {
    document.documentElement.style.setProperty("--text", textColor);
    localStorage.setItem("effectlab-text-color", textColor);
  }, [textColor]);
  const [consoleOpen, setConsoleOpen] = useState(false);
  const [codeOpen, setCodeOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [mcpOpen, setMcpOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState("properties");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [left, setLeft] = useState(
    Number(localStorage.getItem("effectlab-left")) || 220,
  );
  const [right, setRight] = useState(
    Number(localStorage.getItem("effectlab-right")) || 290,
  );
  const file = lab.project.files.find((f) => f.path === lab.active);
  async function save(as = false) {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    const trimmedName = useLab.getState().project.name.trim();
    if (!trimmedName || trimmedName !== useLab.getState().project.name)
      useLab.getState().update((p) => {
        p.name = trimmedName || createProjectName();
      });
    try {
      await saveWithFeedback(as, setSaveFeedback);
    } finally {
      saveInFlight.current = false;
    }
  }
  async function open() {
    if (
      lab.dirty &&
      !(await confirmAction("Hay cambios sin guardar. ¿Abrir otro proyecto?"))
    )
      return;
    try {
      const p = await openProject();
      if (p) {
        lab.load(p);
        lab.log("info", "Proyecto abierto: " + p.name);
      }
    } catch (e) {
      lab.log("error", String(e));
    }
  }
  async function fresh() {
    if (
      lab.dirty &&
      !(await confirmAction("Hay cambios sin guardar. ¿Crear otro proyecto?"))
    )
      return;
    const name = await askText("Nombre del proyecto", createProjectName());
    if (name) {
      const profile = await askText("Tipo de proyecto: html o react", "html");
      if (profile === "html" || profile === "react")
        lab.load(createProject(name, profile));
    }
  }
  async function addFile() {
    const path = await askText("Ruta del nuevo archivo", "efecto.js");
    if (!path) return;
    try {
      safePath(path);
      if (lab.project.files.some((f) => f.path === path))
        throw Error("Ese archivo ya existe");
      lab.update((p) => p.files.push({ path, content: "" }));
      lab.select(path);
    } catch (e) {
      lab.log("error", String(e));
    }
  }
  function resize(side: "left" | "right", event: React.PointerEvent) {
    const start = event.clientX;
    const initial = side === "left" ? left : right;
    event.currentTarget.setPointerCapture(event.pointerId);
    const el = event.currentTarget;
    const move = (e: Event) => {
      const dx = (e as PointerEvent).clientX - start;
      const n = Math.max(
        170,
        Math.min(450, initial + (side === "left" ? dx : -dx)),
      );
      (side === "left" ? setLeft : setRight)(n);
      localStorage.setItem("effectlab-" + side, String(n));
    };
    const up = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save(e.shiftKey);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });
  useEffect(() => {
    const handler = () => setLayout("preview");
    window.addEventListener("lab:show-composition", handler);
    return () => window.removeEventListener("lab:show-composition", handler);
  }, []);
  useEffect(() => {
    lab.log(
      "info",
      "Effect Lab listo. Creá un proyecto o abrí un experimento.",
    );
  }, []);
  return (
    <div className="app-shell">
      <DialogHost />
      <McpBridgeHost />
      <ReviewDialog />
      {mcpOpen && (
        <Suspense fallback={null}>
          <McpPanel close={() => setMcpOpen(false)} />
        </Suspense>
      )}
      {libraryOpen && (
        <Suspense
          fallback={<div className="loading">Cargando biblioteca…</div>}
        >
          <LibraryPanel close={() => setLibraryOpen(false)} />
        </Suspense>
      )}
      {exportOpen && <ExportDialog close={() => setExportOpen(false)} />}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <FlaskConical size={21} />
          </div>
          <div>
            EFFECT<span>LAB</span>
            <small>CREATIVE DEVELOPMENT STUDIO</small>
          </div>
        </div>
        <div className="top-separator" />
        <button onClick={fresh}>
          <Plus size={15} />
          Nuevo
        </button>
        <button onClick={open}>
          <FolderOpen size={15} />
          Abrir
        </button>
        <button onClick={() => save()} disabled={saving} aria-busy={saving}>
          {saving ? (
            <LoaderCircle size={15} className="save-spinner" />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Guardando…" : "Guardar"}
        </button>
        <button
          onClick={() => save(true)}
          disabled={saving}
          aria-label="Guardar como"
        >
          Guardar como…
        </button>
        {currentSave?.phase === "saved" && !lab.dirty && (
          <span className="save-confirmation">
            <Check size={13} />
            Guardado
          </span>
        )}
        <button
          className="workspace-shortcut"
          title="Explorador"
          aria-label="Explorador"
          aria-expanded={resourcesOpen}
          onClick={() => setResourcesOpen((open) => !open)}
        >
          <Files size={18} />
        </button>
        <button
          className="workspace-shortcut"
          title="Biblioteca"
          aria-label="Biblioteca"
          onClick={() => setLibraryOpen(true)}
        >
          <Box size={18} />
        </button>
        <div className="grow" />
        <button className="export-top" onClick={() => setExportOpen(true)}>
          <ArrowDownToLine size={14} />
          Exportar
        </button>
        <button onClick={() => setMcpOpen(true)}>MCP</button>
        <span className="local-badge">
          <span className="status-dot" /> Entorno local
        </span>
        <button
          title="Deshacer"
          aria-label="Deshacer"
          disabled={!lab.past.length}
          onClick={lab.undo}
        >
          <Undo2 size={16} />
        </button>
        <button
          title="Rehacer"
          aria-label="Rehacer"
          disabled={!lab.future.length}
          onClick={lab.redo}
        >
          <Redo2 size={16} />
        </button>
        <button
          title="Configuración"
          aria-label="Configuración"
          onClick={() => setSettings(true)}
        >
          <Settings2 size={17} />
        </button>
      </header>
      <Recovery />
      <div className="workspace-bar">
        <div className="breadcrumb">
          <FlaskConical size={14} />
          <span>Proyecto</span>
          <ChevronRight size={12} />
          <input
            className="project-name-input"
            aria-label="Nombre del proyecto"
            title="Podés cambiar el nombre del proyecto aquí"
            value={lab.project.name}
            maxLength={120}
            onChange={(e) =>
              lab.update((p) => {
                p.name = e.target.value;
              })
            }
            onBlur={() => {
              const name = useLab.getState().project.name.trim();
              if (name !== useLab.getState().project.name || !name)
                lab.update((p) => {
                  p.name = name || createProjectName();
                });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
          />
          {lab.dirty && <i className="dirty-dot" title="Cambios sin guardar" />}
        </div>
        <div className="mode-tabs">
          <button
            className={layout === "split" ? "selected" : ""}
            onClick={() => setLayout("split")}
          >
            <Code2 size={14} />
            Modo libre
          </button>
          <button
            className={layout === "preview" ? "selected" : ""}
            onClick={() => setLayout("preview")}
          >
            <SlidersHorizontal size={14} />
            Modo visual
          </button>
        </div>
        <span className="version">v{product.version}</span>
      </div>
      <main className="workbench">
        {resourcesOpen && (
          <>
            <aside className="explorer resource-drawer" style={{ width: left }}>
              <div className="panel-heading">
                <span>EXPLORADOR</span>
                <button
                  aria-label="Cerrar explorador"
                  onClick={() => setResourcesOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
              <ImportAssets />
              <ElementPalette />
              <details className="explorer-section examples-section" open>
                <summary>Puntos de partida</summary>
                <div className="examples-list">
                  {examples.map((p) => (
                    <button
                      key={p.id}
                      onClick={async () => {
                        if (
                          !lab.dirty ||
                          (await confirmAction(
                            "¿Abrir este ejemplo y descartar los cambios sin guardar?",
                          ))
                        ) {
                          const current = useLab.getState().project;
                          const content = structuredClone(p);
                          content.id = current.id;
                          content.name = current.name;
                          content.createdAt = current.createdAt;
                          content.modifiedAt = new Date().toISOString();
                          if (!content.composition) {
                            content.composition = createComposition();
                            content.composition.layers.push({
                              ...createLayer("effect", p.name),
                              entry: content.entry,
                            });
                          }
                          lab.load(content);
                          useLab.setState({ dirty: true });
                        }
                      }}
                    >
                      <FileCode2 size={12} />
                      {p.name}
                    </button>
                  ))}
                </div>
              </details>
            </aside>
            <div
              role="separator"
              aria-label="Ancho del explorador"
              aria-orientation="vertical"
              className="resize-handle"
              onPointerDown={(e) => resize("left", e)}
            />
          </>
        )}
        <div className="center-stack">
          <div
            className={
              "editor-preview " + (layout === "preview" ? "preview-only" : "")
            }
          >
            <Preview
              expand={() =>
                setLayout(layout === "preview" ? "split" : "preview")
              }
            />
          </div>
          {layout === "preview" && (
            <Suspense
              fallback={<div className="loading">Cargando compositor…</div>}
            >
              <CompositionPanel />
            </Suspense>
          )}
          {codeOpen && (
            <section
              className="editor-pane code-dock"
              id="code-panel"
              role="region"
              aria-label="Código del proyecto"
              onKeyDown={(e) => {
                if (e.key === "Escape") setCodeOpen(false);
              }}
            >
              <div className="panel-heading code-dock-heading">
                <span>
                  <Code2 size={14} />
                  Código
                </span>
                <div className="grow" />
                <button aria-label="Crear archivo" onClick={addFile}>
                  <Plus size={14} />
                  Archivo
                </button>
                <button
                  aria-label="Cerrar código"
                  title="Cerrar código"
                  onClick={() => setCodeOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
              <div className="file-tabs">
                {lab.project.files.map((f) => (
                  <button
                    key={f.path}
                    className={f.path === lab.active ? "active" : ""}
                    onClick={() => lab.select(f.path)}
                  >
                    <FileCode2 size={13} />
                    {f.path}
                  </button>
                ))}
              </div>
              <div className="editor-meta">
                <span>{file?.path}</span>
                <div className="file-operations">
                  <button
                    title="Duplicar archivo"
                    onClick={async () => {
                      if (!file) return;
                      const path = await askText(
                        "Nombre de la copia",
                        file.path.replace(/(\.[^.]+)$/, "-copia$1"),
                      );
                      if (!path) return;
                      try {
                        safePath(path);
                        if (lab.project.files.some((f) => f.path === path))
                          throw Error("El archivo ya existe");
                        lab.update((p) =>
                          p.files.push({ path, content: file.content }),
                        );
                        lab.select(path);
                      } catch (e) {
                        lab.log("error", String(e));
                      }
                    }}
                  >
                    Duplicar
                  </button>
                  <button
                    title="Renombrar archivo"
                    onClick={async () => {
                      if (!file) return;
                      const path = await askText("Nuevo nombre", file.path);
                      if (!path || path === file.path) return;
                      try {
                        safePath(path);
                        if (lab.project.files.some((f) => f.path === path))
                          throw Error("El archivo ya existe");
                        if (
                          !(await confirmAction(
                            "Renombrar requiere actualizar los imports relacionados manualmente. ¿Continuar?",
                          ))
                        )
                          return;
                        lab.update((p) => {
                          p.files.find((f) => f.path === file.path)!.path =
                            path;
                          if (p.entry === file.path) p.entry = path;
                        });
                        lab.select(path);
                      } catch (e) {
                        lab.log("error", String(e));
                      }
                    }}
                  >
                    Renombrar
                  </button>
                  <span>UTF-8</span>
                  <button
                    title="Eliminar archivo"
                    aria-label="Eliminar archivo"
                    disabled={!file || file.path === lab.project.entry}
                    onClick={async () => {
                      if (!file || file.path === lab.project.entry) return;
                      if (await confirmAction("¿Eliminar " + file.path + "?")) {
                        lab.update((p) => {
                          p.files = p.files.filter((f) => f.path !== file.path);
                        });
                        lab.select(lab.project.entry);
                      }
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <div className="monaco-wrap">
                <Suspense
                  fallback={<div className="loading">Preparando editor…</div>}
                >
                  <CodeEditor />
                </Suspense>
              </div>
              <div className="editor-footer">
                <span>
                  <Code2 size={12} />
                  {lab.active.split(".").at(-1)?.toUpperCase()}
                </span>
                <span>Espacios: 2</span>
              </div>
            </section>
          )}
          {consoleOpen && (
            <section
              className="console"
              id="console-panel"
              aria-label="Consola de mensajes"
            >
              <div className="console-tabs">
                <span className="console-title">
                  <Terminal size={14} />
                  Consola<span>{lab.logs.length}</span>
                </span>
                <div className="grow" />
                <button
                  title="Limpiar consola"
                  aria-label="Limpiar consola"
                  onClick={lab.clear}
                >
                  <Trash2 size={13} />
                </button>
                <button
                  title="Copiar mensajes"
                  aria-label="Copiar mensajes"
                  onClick={() =>
                    navigator.clipboard.writeText(
                      lab.logs.map((l) => l.message).join("\n"),
                    )
                  }
                >
                  <ArrowDownToLine size={13} />
                </button>
                <button
                  aria-label="Cerrar consola"
                  title="Cerrar consola"
                  onClick={() => setConsoleOpen(false)}
                >
                  <X size={14} />
                </button>
              </div>
              {consoleOpen && (
                <div className="console-lines">
                  {lab.logs.map((l) => (
                    <div className={"log " + l.level} key={l.id}>
                      <time>{l.time}</time>
                      <span>
                        {l.level === "error"
                          ? "×"
                          : l.level === "warn"
                            ? "!"
                            : "›"}
                      </span>
                      <p>{l.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <div
          role="separator"
          aria-label="Ancho del inspector"
          aria-orientation="vertical"
          className="resize-handle"
          onPointerDown={(e) => resize("right", e)}
        />
        <aside className="properties" style={{ width: right }}>
          <div className="panel-heading">
            <span>
              <SlidersHorizontal size={14} />
              INSPECTOR
            </span>
            <Settings2 size={14} />
          </div>
          <div className="property-tabs">
            <button
              className={inspectorTab === "properties" ? "active" : ""}
              onClick={() => setInspectorTab("properties")}
            >
              Propiedades
            </button>
            <button
              className={inspectorTab === "ai" ? "active" : ""}
              onClick={() => setInspectorTab("ai")}
            >
              Asistente
            </button>
          </div>
          {inspectorTab === "properties" ? (
            <Inspector />
          ) : (
            <Suspense fallback={<p>Cargando asistente…</p>}>
              <AgentPanel connections={() => setMcpOpen(true)} />
            </Suspense>
          )}
        </aside>
      </main>
      {currentSave?.phase === "error" && (
        <div className="save-error" role="alert">
          No se pudo guardar: {currentSave.error}. Podés volver a intentarlo con
          Guardar o Guardar como.
        </div>
      )}
      <footer className="statusbar">
        <button
          className="console-toggle"
          aria-expanded={consoleOpen}
          aria-controls="console-panel"
          onClick={() => setConsoleOpen((open) => !open)}
        >
          <Terminal size={11} />
          Consola
        </button>
        <button
          className="console-toggle"
          aria-expanded={codeOpen}
          aria-controls="code-panel"
          onClick={() => setCodeOpen((open) => !open)}
        >
          <Code2 size={11} />
          Código
        </button>
        <span>
          <span className="status-dot" />
          Laboratorio listo
        </span>
        <span>{lab.project.files.length} archivos</span>
        <div className="grow" />
        <span
          className="save-status"
          role="status"
          aria-live="polite"
          aria-busy={saving}
          title={saveMessage}
        >
          {saveMessage}
        </span>
        <span>Code first. Always.</span>
      </footer>
      {settings && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <section className="modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="modal-close"
              aria-label="Cerrar configuración"
              onClick={() => setSettings(false)}
            >
              <X size={18} />
            </button>
            <div className="brand-mark">
              <FlaskConical />
            </div>
            <h2>Tu laboratorio creativo.</h2>
            <p>Effect Lab v{product.version} · Aplicación local para Windows.</p>
            <AppUpdates />
            <p>
              El código es la fuente de verdad. Sin cuentas ni servicios pagos
              obligatorios.
            </p>
            <label>
              Distribución
              <select
                value={layout}
                onChange={(e) => setLayout(e.target.value)}
              >
                <option value="split">Vista del efecto</option>
                <option value="preview">Vista del efecto + compositor</option>
              </select>
            </label>
            <div className="settings-text-color">
              <label htmlFor="interface-text-color">
                Color del texto de la interfaz
              </label>
              <input
                id="interface-text-color"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
              />
              <button onClick={() => setTextColor("#ffffff")}>
                Restablecer blanco
              </button>
            </div>
            <button
              className="primary"
              onClick={() => {
                void save(true);
                setSettings(false);
              }}
            >
              Guardar proyecto como…
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
