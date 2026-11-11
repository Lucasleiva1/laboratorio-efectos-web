import { useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { useLab } from "../../stores/lab";
import { insertEffect } from "../../services/insert-effect";
import { imageEffect, readImage } from "../../services/image-assets";
import { parseProject } from "../../../packages/core/project";
export default function ImportAssets() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function place(effect: ReturnType<typeof imageEffect>) {
    useLab.getState().update((p) => {
      insertEffect(p, effect);
      parseProject(JSON.stringify(p));
    });
    setOpen(false);
    if (
      !document.querySelector('iframe[title="Vista previa del efecto"]') &&
      document.querySelector(".runtime-state")?.textContent !== "Detenido"
    )
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.dispatchEvent(new Event("lab:run-preview")),
        ),
      );
  }
  return (
    <>
      <button
        className="asset-import"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <ImagePlus size={14} />
        Importar imagen
      </button>
      {open && (
        <div className="modal-backdrop">
          <section
            className="modal image-import-modal"
            role="dialog"
            aria-label="Importar imagen"
          >
            <button
              className="modal-close"
              aria-label="Cerrar importar imagen"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
            <h2>Importar imagen</h2>
            <p>
              Elegí una imagen de tu equipo o empezá con la imagen de prueba.
            </p>
            <label className="image-file-choice">
              <ImagePlus size={20} />
              <span>{busy ? "Abriendo imagen…" : "Elegir una imagen"}</span>
              <input
                aria-label="Elegir una imagen"
                type="file"
                accept="image/*,.svg,.avif,.gif,.bmp"
                disabled={busy}
                onChange={async (e) => {
                  const input = e.currentTarget;
                  const file = input.files?.[0];
                  if (!file) return;
                  setBusy(true);
                  setError("");
                  try {
                    place(imageEffect(await readImage(file)));
                  } catch (error) {
                    setError(String(error).replace(/^Error: /, ""));
                  } finally {
                    setBusy(false);
                    input.value = "";
                  }
                }}
              />
            </label>
            <button
              className="image-trial-choice"
              disabled={busy}
              onClick={() => {
                try {
                  place(imageEffect());
                } catch (error) {
                  setError(String(error));
                }
              }}
            >
              Usar la imagen de prueba
            </button>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
