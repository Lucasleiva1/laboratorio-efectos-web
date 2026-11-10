import { useState } from "react";
import { ArrowUpRight, Download, X } from "lucide-react";
import { useLab } from "../../stores/lab";
import {
  buildExport,
  writeExport,
  type ExportTarget,
  type ExportPackage,
} from "../../services/exporter";
export default function ExportDialog({ close }: { close: () => void }) {
  const project = useLab((s) => s.project);
  const [target, setTarget] = useState<ExportTarget>("html");
  const [busy, setBusy] = useState(false);
  const [pkg, setPkg] = useState<ExportPackage | null>(null);
  const [error, setError] = useState("");
  async function build() {
    setBusy(true);
    setError("");
    try {
      setPkg(await buildExport(project, target));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function save() {
    if (!pkg) return;
    try {
      if (await writeExport(pkg)) {
        useLab
          .getState()
          .log(
            "info",
            `Exportación guardada: ${pkg.name}.zip · ${pkg.zip.length} bytes`,
          );
        close();
      }
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="modal-backdrop">
      <section className="modal export-modal">
        <button
          className="modal-close"
          aria-label="Cerrar exportación"
          onClick={close}
        >
          <X size={18} />
        </button>
        <span className="mini-label">LLEVÁ TU EXPERIMENTO A LA WEB</span>
        <h2>
          Creado acá.
          <br />
          Listo para allá.
        </h2>
        <p>
          Exportá los archivos reales, con sus parámetros y las dependencias que
          usa el efecto.
        </p>
        <label>
          Formato
          <select
            value={target}
            onChange={(e) => {
              setTarget(e.target.value as ExportTarget);
              setPkg(null);
            }}
          >
            <option value="html">HTML / CSS / JavaScript</option>
            <option value="js-module">
              Módulo JavaScript · mount / update / destroy
            </option>
            <option value="react">Componente React con props</option>
          </select>
        </label>
        <p className="helper">
          Superficie aislada por instancia. El sitio destino no necesita
          instalar el laboratorio. React usa un wrapper con hooks y un runtime
          autocontenido.
        </p>
        {error && <pre className="error-message">{error}</pre>}
        {pkg && (
          <>
            <div className="export-report">
              <strong>
                {(pkg.zip.length / 1024).toFixed(1)} KB{" "}
                <small>ZIP medido</small>
              </strong>
              <p>
                {pkg.bytes.toLocaleString("es-AR")} bytes sin comprimir ·{" "}
                {Object.keys(pkg.files).length} archivos
              </p>
              <p>
                {pkg.dependencies.length
                  ? pkg.dependencies.join(" · ")
                  : "Sin motores ni React añadidos"}
              </p>
            </div>
            {pkg.warnings.map((w) => (
              <p className="helper" key={w}>
                {w}
              </p>
            ))}
            <button className="primary" onClick={save}>
              <Download size={14} />
              Guardar ZIP
            </button>
          </>
        )}
        <button
          className={pkg ? "" : "primary"}
          disabled={busy}
          onClick={build}
        >
          <ArrowUpRight size={14} />
          {busy
            ? "Empaquetando…"
            : pkg
              ? "Volver a construir"
              : "Preparar y medir exportación"}
        </button>
      </section>
    </div>
  );
}
