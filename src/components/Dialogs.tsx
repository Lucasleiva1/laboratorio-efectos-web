import { useSyncExternalStore } from "react";
interface Dialog {
  message: string;
  initial?: string;
  resolve: (value: string | null) => void;
}
let dialogs: Dialog[] = [];
const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}
export function askText(message: string, initial = ""): Promise<string | null> {
  return new Promise((resolve) => {
    dialogs = [...dialogs, { message, initial, resolve }];
    notify();
  });
}
export async function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    dialogs = [...dialogs, { message, resolve: (v) => resolve(v !== null) }];
    notify();
  });
}
export function DialogHost() {
  const d = useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => dialogs[0],
  );
  function finish(result: string | null) {
    d?.resolve(result);
    dialogs = dialogs.slice(1);
    notify();
  }
  if (!d) return null;
  return (
    <div className="modal-backdrop dialog-backdrop">
      <form
        className="modal"
        onSubmit={(e) => {
          e.preventDefault();
          finish(
            d.initial !== undefined
              ? String(new FormData(e.currentTarget).get("value") ?? "")
              : "yes",
          );
        }}
      >
        <h2>{d.message}</h2>
        {d.initial !== undefined && (
          <input
            key={d.message}
            name="value"
            aria-label={d.message}
            autoFocus
            defaultValue={d.initial}
          />
        )}
        <div className="dialog-actions">
          <button type="button" onClick={() => finish(null)}>
            Cancelar
          </button>
          <button className="primary" type="submit">
            {d.initial !== undefined ? "Crear" : "Confirmar"}
          </button>
        </div>
      </form>
    </div>
  );
}
