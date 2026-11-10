import { lazy, Suspense, useState } from "react";
import { Check, X } from "lucide-react";
import { useReview, resolveProposal } from "../../services/review";
const Diff = lazy(() =>
  import("@monaco-editor/react").then((m) => ({ default: m.DiffEditor })),
);
export default function ReviewDialog() {
  const p = useReview((s) => s.queue[0]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  if (!p) return null;
  const changed = [
    ...new Set([...p.before.files, ...p.after.files].map((f) => f.path)),
  ].filter(
    (path) =>
      p.before.files.find((f) => f.path === path)?.content !==
      p.after.files.find((f) => f.path === path)?.content,
  );
  const path = changed.includes(selected) ? selected : changed[0];
  const paramsChanged =
    JSON.stringify(p.before.parameters) !== JSON.stringify(p.after.parameters);
  return (
    <div className="modal-backdrop review-backdrop">
      <section className="review-modal">
        <header>
          <div>
            <span className="mini-label">
              CAMBIO PROPUESTO · REVISIÓN {p.expectedRevision}
            </span>
            <h2>{p.title}</h2>
          </div>
          <div className="grow" />
          <button
            disabled={busy}
            onClick={() => void resolveProposal(p.id, false)}
          >
            <X size={14} />
            Rechazar
          </button>
          <button
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await resolveProposal(p.id, true);
              setBusy(false);
            }}
          >
            <Check size={14} />
            Aceptar cambios
          </button>
        </header>
        <div className="review-files">
          {changed.map((f) => (
            <button
              className={path === f ? "active" : ""}
              key={f}
              onClick={() => setSelected(f)}
            >
              {f}
            </button>
          ))}
          <span>
            {changed.length} archivos ·{" "}
            {paramsChanged ? "Cambian controles" : "Controles conservados"}
          </span>
        </div>
        {path ? (
          <Suspense fallback={<p>Cargando diff…</p>}>
            <Diff
              height="62%"
              original={
                p.before.files.find((f) => f.path === path)?.content ?? ""
              }
              modified={
                p.after.files.find((f) => f.path === path)?.content ?? ""
              }
              theme="effect-lab"
              options={{
                readOnly: true,
                automaticLayout: true,
                minimap: { enabled: false },
              }}
            />
          </Suspense>
        ) : (
          <p className="helper">
            Esta operación modifica metadatos o parámetros.
          </p>
        )}
        {paramsChanged && (
          <pre className="parameter-diff">
            {JSON.stringify(
              { antes: p.before.parameters, despues: p.after.parameters },
              null,
              2,
            )}
          </pre>
        )}
        <p className="helper">
          Al aceptar se guarda una revisión recuperable. Si el proyecto cambió
          desde la propuesta, se rechaza para proteger tus ediciones.
        </p>
      </section>
    </div>
  );
}
