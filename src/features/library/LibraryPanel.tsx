import { lazy, Suspense, useEffect, useState } from "react";
import {
  Box,
  Copy,
  Grid2X2,
  Heart,
  History,
  Layers,
  List,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useLab } from "../../stores/lab";
import {
  useLibrary,
  loadLibrary,
  saveToLibrary,
  updateLibraryItem,
  duplicateItem,
  removeLibraryItem,
  checkpoint,
  savePreset,
  applyPreset,
  removePreset,
  renamePreset,
  type Revision,
} from "../../services/library";
import { askText, confirmAction } from "../../components/Dialogs";
import { insertEffect } from "../../services/insert-effect";
import { buildExport, writeExport } from "../../services/exporter";
const DiffEditor = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.DiffEditor })),
);
export default function LibraryPanel({ close }: { close: () => void }) {
  const { data, error } = useLibrary();
  const lab = useLab();
  const [view, setView] = useState("effects");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [engine, setEngine] = useState("");
  const [sort, setSort] = useState("date");
  const [grid, setGrid] = useState(true);
  const [diff, setDiff] = useState<Revision | null>(null);
  const [file, setFile] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void loadLibrary().catch((e) => lab.log("error", String(e)));
  }, []);
  async function action(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      lab.log("error", String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    const name = await askText("Nombre en biblioteca", lab.project.name);
    if (!name) return;
    const tags =
      (await askText(
        "Etiquetas separadas por coma",
        lab.project.tags.join(", "),
      )) ?? "";
    const category =
      (await askText("Categoría", "Personalizados")) ?? "Personalizados";
    await action(() =>
      saveToLibrary(lab.project, {
        name,
        description: lab.project.description,
        category,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      }),
    );
  }
  const items = data.items
    .filter(
      (i) =>
        (view !== "favorites" || i.favorite) &&
        (!category || i.category === category) &&
        (!engine || i.project.dependencies.includes(engine)) &&
        `${i.name} ${i.description} ${i.tags.join(" ")}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
    )
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.modifiedAt.localeCompare(a.modifiedAt),
    );
  return (
    <div className="modal-backdrop library-backdrop">
      <section className="library-modal">
        <header>
          <div>
            <span className="mini-label">TU COLECCIÓN CREATIVA</span>
            <h2>
              Biblioteca de experimentos<span>{data.items.length}</span>
            </h2>
          </div>
          <div className="grow" />
          <button className="primary" disabled={busy} onClick={save}>
            <Plus size={14} />
            Guardar efecto actual
          </button>
          <button aria-label="Cerrar biblioteca" onClick={close}>
            <X size={19} />
          </button>
        </header>
        <div className="library-tabs">
          {[
            ["effects", "Efectos"],
            ["favorites", "Favoritos"],
            ["presets", "Presets"],
            ["history", "Historial"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              onClick={() => setView(id)}
            >
              {label}
            </button>
          ))}
          <div className="grow" />
          <button
            disabled={busy}
            onClick={async () => {
              const note = await askText(
                "Nota de la versión",
                "Experimento guardado",
              );
              if (note) await action(() => checkpoint(lab.project, note));
            }}
          >
            <History size={13} />
            Crear versión
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              const name = await askText(
                "Nombre del preset",
                "Nueva combinación",
              );
              if (name) await action(() => savePreset(lab.project, name));
            }}
          >
            Guardar preset actual
          </button>
        </div>
        {error && <p className="error-message">{error}</p>}
        {["effects", "favorites"].includes(view) && (
          <>
            <div className="library-filters">
              <Search size={14} />
              <input
                aria-label="Buscar en biblioteca"
                placeholder="Buscar por nombre, etiqueta o descripción…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <select
                aria-label="Categoría"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {[...new Set(data.items.map((i) => i.category))].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                aria-label="Motor"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
              >
                <option value="">Todos los motores</option>
                {[
                  ...new Set(data.items.flatMap((i) => i.project.dependencies)),
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <select
                aria-label="Ordenar biblioteca"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="date">Recientes</option>
                <option value="name">Nombre</option>
              </select>
              <button
                title="Cambiar cuadrícula o lista"
                onClick={() => setGrid(!grid)}
              >
                {grid ? <List size={15} /> : <Grid2X2 size={15} />}
              </button>
            </div>
            <div className={"library-items " + (grid ? "grid" : "list")}>
              {items.slice(0, 100).map((item) => (
                <article className="library-card" key={item.id}>
                  <div className="library-thumbnail">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt="Miniatura del efecto"
                        onError={(e) =>
                          (e.currentTarget.style.display = "none")
                        }
                      />
                    ) : (
                      <Box size={35} strokeWidth={1} />
                    )}
                    <span>{item.project.profile.toUpperCase()}</span>
                    <button
                      title="Alternar favorito"
                      onClick={() =>
                        void action(() =>
                          updateLibraryItem(item.id, {
                            favorite: !item.favorite,
                          }),
                        )
                      }
                    >
                      <Star
                        size={15}
                        fill={item.favorite ? "#b095ff" : "none"}
                      />
                    </button>
                  </div>
                  <div className="library-card-body">
                    <h3>{item.name}</h3>
                    <p>
                      {item.category} ·{" "}
                      {new Date(item.modifiedAt).toLocaleDateString("es-AR")}
                    </p>
                    <div className="tags">
                      {item.tags.map((t) => (
                        <span key={t}>{t}</span>
                      ))}
                    </div>
                    <p className="helper">
                      {item.project.dependencies.join(" · ") ||
                        "HTML / CSS / JS"}
                    </p>
                    <div className="library-card-actions">
                      <button
                        className="primary"
                        onClick={async () => {
                          if (
                            lab.dirty &&
                            !(await confirmAction(
                              "¿Abrir este efecto y dejar los cambios actuales sin guardar?",
                            ))
                          )
                            return;
                          lab.load(structuredClone(item.project));
                          close();
                        }}
                      >
                        Abrir
                      </button>
                      <button
                        title="Insertar como capa independiente"
                        onClick={() => {
                          try {
                            lab.update((p) =>
                              insertEffect(p, {
                                ...item.project,
                                name: item.name,
                              }),
                            );
                            close();
                          } catch (error) {
                            lab.log("error", String(error));
                          }
                        }}
                      >
                        Insertar
                      </button>
                      <button
                        title="Duplicar"
                        onClick={() =>
                          void action(() => duplicateItem(item.id))
                        }
                      >
                        <Copy size={12} />
                      </button>
                      <button
                        title="Renombrar y editar etiquetas"
                        onClick={async () => {
                          const name = await askText(
                            "Nombre del efecto",
                            item.name,
                          );
                          if (!name) return;
                          const tags = await askText(
                            "Etiquetas separadas por coma",
                            item.tags.join(", "),
                          );
                          await action(() =>
                            updateLibraryItem(item.id, {
                              name,
                              tags: (tags ?? "")
                                .split(",")
                                .map((t) => t.trim())
                                .filter(Boolean),
                            }),
                          );
                        }}
                      >
                        Editar
                      </button>
                      <button
                        title="Exportar este efecto"
                        onClick={() =>
                          void action(async () => {
                            await writeExport(
                              await buildExport(item.project, "html"),
                            );
                          })
                        }
                      >
                        Exportar
                      </button>
                      <button
                        title="Eliminar de biblioteca"
                        onClick={async () => {
                          if (
                            await confirmAction(
                              "¿Eliminar este elemento de la biblioteca? Se conservan sus revisiones.",
                            )
                          )
                            await action(() => removeLibraryItem(item.id));
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
              {!items.length && (
                <div className="library-empty">
                  <Box size={35} />
                  <h3>Tu próxima colección empieza acá.</h3>
                  <p>
                    Guardá código propio, creá variantes y recuperá tus mejores
                    experimentos.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
        {view === "presets" && (
          <div className="library-presets">
            {data.presets.map((p) => (
              <article key={p.id}>
                <h3>{p.name}</h3>
                <span>{Object.keys(p.values).length} parámetros</span>
                <button
                  disabled={p.projectId !== lab.project.id}
                  onClick={() => {
                    try {
                      const result = applyPreset(lab.project, p);
                      lab.update((project) => {
                        project.parameters = result.project.parameters;
                      });
                      if (result.omitted.length)
                        lab.log(
                          "warn",
                          "Parámetros omitidos: " + result.omitted.join(", "),
                        );
                      close();
                    } catch (e) {
                      lab.log("error", String(e));
                    }
                  }}
                >
                  Aplicar
                </button>
                <button
                  onClick={async () => {
                    const name = await askText("Nombre del preset", p.name);
                    if (name) await action(() => renamePreset(p.id, name));
                  }}
                >
                  Renombrar
                </button>
                <button
                  onClick={async () => {
                    if (await confirmAction("¿Eliminar preset?"))
                      await action(() => removePreset(p.id));
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </article>
            ))}
          </div>
        )}
        {view === "history" && (
          <div className="library-presets">
            {[...data.revisions].reverse().map((r) => (
              <article key={r.id} data-revision-id={r.id}>
                <div>
                  <h3>
                    {r.name} · {r.note}
                  </h3>
                  <p>
                    {new Date(r.createdAt).toLocaleString("es-AR")} ·{" "}
                    {r.hash.slice(0, 12)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setDiff(r);
                    setFile(r.project.entry);
                  }}
                >
                  Comparar
                </button>
                <button
                  onClick={() => {
                    lab.load({
                      ...structuredClone(r.project),
                      id: crypto.randomUUID(),
                      name: r.name + " · variante",
                    });
                    close();
                  }}
                >
                  Duplicar
                </button>
                <button
                  onClick={async () => {
                    if (
                      await confirmAction(
                        "¿Restaurar esta revisión? Se creará un punto de recuperación del estado actual.",
                      )
                    )
                      await action(async () => {
                        await checkpoint(
                          lab.project,
                          "Antes de restaurar " + r.note,
                        );
                        lab.load(structuredClone(r.project));
                        useLab.setState({ dirty: true });
                        close();
                      });
                  }}
                >
                  Restaurar
                </button>
                <button
                  onClick={() =>
                    void action(async () => {
                      await writeExport(await buildExport(r.project, "html"));
                    })
                  }
                >
                  Exportar
                </button>
              </article>
            ))}
          </div>
        )}
        {diff && (
          <div className="diff-overlay">
            <header>
              <h3>{diff.note} → Estado actual</h3>
              <select
                aria-label="Archivo para comparar"
                value={file}
                onChange={(e) => setFile(e.target.value)}
              >
                {[
                  ...new Set(
                    [...diff.project.files, ...lab.project.files].map(
                      (f) => f.path,
                    ),
                  ),
                ].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
              <button
                aria-label="Cerrar comparación"
                onClick={() => setDiff(null)}
              >
                <X size={16} />
              </button>
            </header>
            <p className="helper">
              Antes:{" "}
              {JSON.stringify(
                diff.project.parameters.map((p) => ({
                  id: p.id,
                  value: p.value,
                })),
              )}
              <br />
              Ahora:{" "}
              {JSON.stringify(
                lab.project.parameters.map((p) => ({
                  id: p.id,
                  value: p.value,
                })),
              )}
            </p>
            <Suspense fallback={<p>Preparando comparación…</p>}>
              <DiffEditor
                height="70%"
                theme="effect-lab"
                original={
                  diff.project.files.find((f) => f.path === file)?.content ?? ""
                }
                modified={
                  lab.project.files.find((f) => f.path === file)?.content ?? ""
                }
                options={{
                  readOnly: true,
                  automaticLayout: true,
                  minimap: { enabled: false },
                }}
              />
            </Suspense>
          </div>
        )}
      </section>
    </div>
  );
}
