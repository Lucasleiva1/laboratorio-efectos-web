import { Copy, Plug } from "lucide-react";
import { useLab } from "../../stores/lab";
import { useMcpActivity, useMcpPermissions } from "./McpPanel";
export default function ExternalAssistant({
  connections,
}: {
  connections: () => void;
}) {
  const project = useLab((s) => s.project);
  const entries = useMcpActivity((s) => s.entries);
  const clients = useMcpPermissions((s) => s.clients);
  const context = () =>
    `Proyecto Effect Lab. El código es la fuente de verdad. Podés editar HTML, CSS, JavaScript, TypeScript, React y GLSL; crear controles reales con window.lab.register y probar/exportar con las herramientas MCP. Consultá effectlab_status para obtener projectId y expectedRevision. Los cambios requieren revisión.\n\n${JSON.stringify(project, null, 2)}`;
  return (
    <div className="agent-panel">
      <span className="mini-label">ABIERTO A TUS HERRAMIENTAS</span>
      <h3>
        Cualquier agente.
        <br />
        Tu permiso.
      </h3>
      <p className="helper">
        Conectá cualquier aplicación compatible con MCP. Effect Lab recibe sus
        operaciones y te deja revisar los cambios.
      </p>
      <button className="primary" onClick={connections}>
        <Plug size={13} />
        Configurar conexión MCP
      </button>
      <div className="agent-status">
        {clients.length
          ? `${clients.length} autorización/es en esta sesión`
          : "Sin aplicaciones autorizadas"}
      </div>
      <p className="helper">
        El cliente que elijas genera el código. El laboratorio aporta archivos,
        parámetros, vista previa, versiones y exportación. No necesita detectar
        ni ejecutar un proveedor de IA.
      </p>
      <button onClick={() => navigator.clipboard.writeText(context())}>
        <Copy size={13} />
        Copiar contexto del efecto
      </button>
      <div className="section-title">ACTIVIDAD DE AGENTES</div>
      <div className="agent-messages">
        {entries.length ? (
          entries
            .slice(-12)
            .reverse()
            .map((e, i) => (
              <pre key={i}>
                {e.time} · {e.client ?? "MCP"}
                <br />
                {e.tool} · {e.ok ? "Completado" : e.error}
              </pre>
            ))
        ) : (
          <p className="helper">
            Las llamadas autorizadas aparecerán acá. Podés seguir editando
            manualmente en todo momento.
          </p>
        )}
      </div>
    </div>
  );
}
