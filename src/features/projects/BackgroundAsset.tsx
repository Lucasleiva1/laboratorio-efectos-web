import { useState } from "react";
import { ImagePlus, Layers, X } from "lucide-react";
import { useLab } from "../../stores/lab";
import { examples } from "./examples";
import {
  createComposition,
  createLayer,
} from "../../../packages/core/composition";
import { confirmAction } from "../../components/Dialogs";
export default function BackgroundAsset() {
  const [open, setOpen] = useState(false);
  const [image, setImage] = useState<{
    name: string;
    path: string;
    content: string;
  } | null>(null);
  const [error, setError] = useState("");
  function artifact() {
    const template = examples.find((p) => p.id === "13-image-background");
    if (!template) throw Error("No se encuentra el recurso de fondo");
    const p = structuredClone(template);
    p.id = crypto.randomUUID();
    if (image) {
      p.name = "Fondo · " + image.name;
      p.files = p.files.filter((f) => f.path !== "assets/background.svg");
      p.files.push({ path: image.path, content: image.content });
      const file = p.files.find((f) => f.path === "main.js")!;
      file.content = file.content.replace(
        "'./assets/background.svg'",
        JSON.stringify("./" + image.path),
      );
    }
    return p;
  }
  async function choose(file: File) {
    try {
      if (file.size > 8 * 1024 * 1024) throw Error("La imagen supera 8 MB");
      if (
        !["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(
          file.type,
        )
      )
        throw Error("Usá PNG, JPG, WebP o SVG");
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(Error("No se pudo leer la imagen"));
        reader.readAsDataURL(file);
      });
      setImage({
        name: file.name,
        path: "assets/" + file.name.replace(/[^\p{L}\p{N}._-]/gu, "-"),
        content,
      });
      setError("");
    } catch (e) {
      setError(String(e));
    }
  }
  async function load() {
    try {
      const lab = useLab.getState();
      if (
        lab.dirty &&
        !(await confirmAction(
          "¿Abrir el fondo como un experimento nuevo? Guardá antes los cambios que quieras conservar.",
        ))
      )
        return;
      lab.load(artifact());
      setOpen(false);
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          window.dispatchEvent(new Event("lab:run-preview")),
        ),
      );
    } catch (e) {
      setError(String(e));
    }
  }
  function insert() {
    try {
      const background = artifact();
      useLab.getState().update((p) => {
        if (!p.composition) {
          p.composition = createComposition();
          p.composition.layers.push({
            ...createLayer("effect", p.name),
            entry: p.entry,
          });
        }
        p.composition.enabled = true;
        p.composition.layers.unshift({
          ...createLayer("effect", background.name),
          entry: background.entry,
          source: background,
          locked: true,
        });
      });
      useLab
        .getState()
        .log(
          "info",
          "Fondo agregado como capa inferior. Si el efecto superior es opaco, ajustá su transparencia en el código.",
        );
      setOpen(false);
      window.dispatchEvent(new CustomEvent("lab:show-composition"));
      if (!document.querySelector('iframe[title="Vista previa del efecto"]'))
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            window.dispatchEvent(new Event("lab:run-preview")),
          ),
        );
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <>
      <button className="background-shortcut" onClick={() => setOpen(true)}>
        <ImagePlus size={14} />
        <span>
          Fondo de imagen<small>Recurso listo para reutilizar</small>
        </span>
        <span>+</span>
      </button>
      {open && (
        <div className="modal-backdrop">
          <section className="modal background-modal">
            <button
              className="modal-close"
              aria-label="Cerrar fondo de imagen"
              onClick={() => setOpen(false)}
            >
              <X size={17} />
            </button>
            <span className="mini-label">
              UN RECURSO. MUCHAS POSIBILIDADES.
            </span>
            <h2>
              Tu imagen.
              <br />
              El punto de partida.
            </h2>
            <p>
              Fondo listo para usar con encuadre, posición, zoom, oscurecimiento
              y desenfoque. Todo queda como código editable.
            </p>
            <label
              className="background-drop"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void choose(f);
              }}
            >
              {image ? (
                <img src={image.content} alt="Vista de la imagen elegida" />
              ) : (
                <ImagePlus size={35} strokeWidth={1} />
              )}
              <span>{image ? image.name : "Elegí o arrastrá una imagen"}</span>
              <small>PNG · JPG · WebP · SVG · Hasta 8 MB</small>
              <input
                aria-label="Elegir imagen de fondo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  if (e.target.files?.[0]) void choose(e.target.files[0]);
                }}
              />
            </label>
            {error && <p className="error-message">{error}</p>}
            <div className="background-actions">
              <button className="primary" onClick={load}>
                <ImagePlus size={13} />
                Abrir como experimento
              </button>
              <button onClick={insert}>
                <Layers size={13} />
                Insertar como capa
              </button>
            </div>
            <p className="helper">
              Sin elegir imagen se abre el recurso de ejemplo. Podés guardarlo
              en la biblioteca o exportarlo a tu web. Una capa superior opaca
              puede cubrir el fondo.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
