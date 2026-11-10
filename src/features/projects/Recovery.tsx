import { useEffect, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { parseProject, type LabProject } from "../../../packages/core/project";
import { useLab } from "../../stores/lab";
import { confirmAction } from "../../components/Dialogs";
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("effectlab-recovery", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export default function Recovery() {
  const [candidate, setCandidate] = useState<LabProject | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    void database()
      .then(
        (db) =>
          new Promise<unknown>((resolve, reject) => {
            const transaction = db.transaction("state", "readonly");
            const request = transaction.objectStore("state").get("current");
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
            transaction.oncomplete = () => db.close();
          }),
      )
      .then((value) => {
        if (disposed) return;
        if (value) {
          try {
            setCandidate(parseProject(JSON.stringify(value)));
          } catch (e) {
            useLab
              .getState()
              .log("error", "Recuperación no compatible: " + String(e));
          }
        }
        setReady(true);
      })
      .catch((e) => {
        setReady(true);
        useLab
          .getState()
          .log("warn", "Recuperación automática no disponible: " + String(e));
      });
    return () => {
      disposed = true;
    };
  }, []);
  useEffect(() => {
    if (!ready || candidate) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useLab.subscribe((state, previous) => {
      if (state.project === previous.project || !state.dirty) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        void database()
          .then(
            (db) =>
              new Promise<void>((resolve, reject) => {
                const tx = db.transaction("state", "readwrite");
                tx.objectStore("state").put(
                  structuredClone(state.project),
                  "current",
                );
                tx.oncomplete = () => {
                  db.close();
                  resolve();
                };
                tx.onerror = () => {
                  db.close();
                  reject(tx.error);
                };
              }),
          )
          .catch((e) =>
            useLab
              .getState()
              .log(
                "warn",
                "No se pudo actualizar la recuperación: " + String(e),
              ),
          );
      }, 1200);
    });
    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [ready, candidate]);
  if (!candidate) return null;
  return (
    <div className="recovery-banner">
      <RotateCcw size={12} />
      <span>
        Hay una sesión recuperable: <b>{candidate.name}</b>
      </span>
      <button
        onClick={async () => {
          if (
            useLab.getState().dirty &&
            !(await confirmAction(
              "¿Recuperar esta sesión y dejar los cambios actuales?",
            ))
          )
            return;
          useLab.getState().load(candidate);
          useLab.setState({ dirty: true });
          setCandidate(null);
        }}
      >
        Recuperar sesión
      </button>
      <button
        aria-label="Descartar aviso de recuperación"
        onClick={() => setCandidate(null)}
      >
        <X size={12} />
      </button>
    </div>
  );
}
