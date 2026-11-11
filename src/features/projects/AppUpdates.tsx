import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { useLab } from "../../stores/lab";

export default function AppUpdates() {
  const [update, setUpdate] = useState<Update | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const available = isTauri() && !import.meta.env.DEV;
  async function search() {
    if (busy) return;
    setBusy(true);
    setStatus("Buscando actualizaciones…");
    try {
      await update?.close();
      setUpdate(null);
      const next = await check();
      setUpdate(next);
      setStatus(next ? `Versión ${next.version} disponible.` : "Tenés la última versión instalada.");
    } catch (error) {
      setStatus(String(error).includes("404")
        ? "Todavía no hay una actualización instalable publicada."
        : `No se pudo buscar la actualización: ${String(error)}`);
    } finally { setBusy(false); }
  }
  async function install() {
    if (!update || busy) return;
    if (useLab.getState().dirty) {
      setStatus("Guardá los cambios de tu proyecto antes de instalar la actualización.");
      return;
    }
    setBusy(true);
    let downloaded = 0, total = 0;
    try {
      setStatus("Descargando actualización…");
      await update.downloadAndInstall(event => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setStatus(total ? `Descargando… ${Math.round(downloaded / total * 100)} %` : `Descargando… ${Math.round(downloaded / 1024)} KB`);
        }
        if (event.event === "Finished") setStatus("Descarga completa. Instalando actualización…");
      });
      await relaunch();
    } catch (error) {
      setStatus(`No se pudo instalar: ${String(error)}`);
      setBusy(false);
    }
  }
  return <section className="app-updates" aria-label="Actualizaciones de Effect Lab">
    <h3>Actualizaciones</h3>
    {available ? <>
      <button disabled={busy} onClick={() => void search()}>{busy ? "Procesando…" : "Buscar actualizaciones"}</button>
      {update && <button disabled={busy} onClick={() => void install()}>Instalar {update.version} y reiniciar</button>}
    </> : <p>Disponible en la versión instalada. El entorno de desarrollo no instala actualizaciones.</p>}
    <p role="status" aria-live="polite">{status}</p>
  </section>;
}
