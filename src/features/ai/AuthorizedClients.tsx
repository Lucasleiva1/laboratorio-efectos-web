import { useMcpPermissions } from "./McpPanel";
export default function AuthorizedClients() {
  const clients = useMcpPermissions((s) => s.clients);
  return (
    <div>
      <h3>Aplicaciones autorizadas</h3>
      {clients.length ? (
        clients.map((c) => (
          <div
            className="authorized-client"
            key={c.sessionId + ":" + c.projectId}
          >
            <span>
              {c.name}
              <small>Proyecto: {c.projectId.slice(0, 20)}</small>
            </span>
            <button
              onClick={() =>
                useMcpPermissions.setState((s) => ({
                  clients: s.clients.filter((v) => v !== c),
                }))
              }
            >
              Revocar
            </button>
          </div>
        ))
      ) : (
        <p className="helper">
          Todavía no autorizaste ninguna aplicación. Cada cliente nuevo solicita
          permiso en su primera operación.
        </p>
      )}
    </div>
  );
}
