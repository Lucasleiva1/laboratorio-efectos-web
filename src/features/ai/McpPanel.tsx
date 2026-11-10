import AuthorizedClients from "./AuthorizedClients";
import { useEffect, useState } from "react";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { create } from "zustand";
import { Copy, Plug, RefreshCw, X } from "lucide-react";
import tools from "../../../packages/agent-contracts/tools.json";
import { executeOperation } from "../../services/operations";
import { confirmAction } from "../../components/Dialogs";
import { useLab } from "../../stores/lab";
interface Entry {
  tool: string;
  time: string;
  ok: boolean;
  error?: string;
  client?: string;
}
export const useMcpActivity = create<{ entries: Entry[] }>(() => ({
  entries: [],
}));
export const useMcpPermissions = create<{
  clients: { sessionId: string; name: string; projectId: string }[];
}>(() => ({ clients: [] }));
const authorizing = new Map<string, Promise<boolean>>();
async function authorize(
  client: { sessionId: string; name: string },
  projectId: string,
): Promise<boolean> {
  if (!client?.sessionId || !client?.name)
    throw Error("Cliente MCP sin identidad de sesión");
  const key = client.sessionId + ":" + projectId;
  if (
    useMcpPermissions
      .getState()
      .clients.some(
        (c) => c.sessionId === client.sessionId && c.projectId === projectId,
      )
  )
    return true;
  if (!authorizing.has(key))
    authorizing.set(
      key,
      (async () => {
        const accepted = await confirmAction(
          "¿Autorizar a " +
            client.name.slice(0, 100) +
            " a consultar el proyecto activo y el índice de biblioteca por MCP? Las escrituras se revisarán por separado.",
        );
        if (accepted)
          useMcpPermissions.setState((s) => ({
            clients: [
              ...s.clients,
              {
                sessionId: client.sessionId,
                name: client.name.slice(0, 100),
                projectId,
              },
            ],
          }));
        return accepted;
      })(),
    );
  try {
    return await authorizing.get(key)!;
  } finally {
    authorizing.delete(key);
  }
}
export function McpBridgeHost() {
  useEffect(() => {
    if (!isTauri()) return;
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void listen<{
      id: string;
      tool: string;
      args: Record<string, unknown>;
      client: { sessionId: string; name: string };
    }>("mcp-request", async (event) => {
      const { id, tool, args, client } = event.payload;
      try {
        const projectId = useLab.getState().project.id;
        if (!(await authorize(client, projectId)))
          throw Error("permission_denied: cliente no autorizado");
        const authorized = () =>
          useMcpPermissions
            .getState()
            .clients.some(
              (c) =>
                c.sessionId === client.sessionId && c.projectId === projectId,
            );
        const data = await executeOperation(tool, args ?? {}, authorized);
        await invoke("mcp_reply", { id, result: { ok: true, data } });
        useMcpActivity.setState((s) => ({
          entries: [
            ...s.entries.slice(-99),
            {
              tool,
              time: new Date().toLocaleTimeString("es-AR"),
              ok: true,
              client: client.name,
            },
          ],
        }));
      } catch (e) {
        const error = String(e);
        await invoke("mcp_reply", { id, result: { ok: false, error } }).catch(
          () => {},
        );
        useMcpActivity.setState((s) => ({
          entries: [
            ...s.entries.slice(-99),
            {
              tool,
              time: new Date().toLocaleTimeString("es-AR"),
              ok: false,
              error,
              client: client?.name,
            },
          ],
        }));
      }
    }).then((fn) => {
      if (disposed) fn();
      else unlisten = fn;
    });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
  return null;
}
export default function McpPanel({ close }: { close: () => void }) {
  const [status, setStatus] = useState<{
    enabled: boolean;
    executable: string;
    transport: string;
  } | null>(null);
  const [tab, setTab] = useState("server");
  const [url, setUrl] = useState("http://127.0.0.1:3000/mcp");
  const [connection, setConnection] = useState<{
    id: string;
    tools: any[];
  } | null>(null);
  const [tool, setTool] = useState("");
  const [args, setArgs] = useState("{}");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const entries = useMcpActivity((s) => s.entries);
  useEffect(
    () => () => {
      if (connection?.id)
        void invoke("mcp_client_disconnect", { id: connection.id }).catch(
          () => {},
        );
    },
    [connection?.id],
  );
  async function refresh() {
    try {
      setStatus(await invoke("mcp_status"));
    } catch (e) {
      setError(String(e));
    }
  }
  useEffect(() => {
    if (isTauri()) void refresh();
  }, []);
  async function toggle(enabled: boolean) {
    try {
      useMcpPermissions.setState({ clients: [] });
      await invoke("mcp_set_enabled", { enabled });
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  }
  return (
    <div className="modal-backdrop">
      <section className="modal mcp-modal">
        <button
          className="modal-close"
          aria-label="Cerrar conexiones MCP"
          onClick={close}
        >
          <X size={18} />
        </button>
        <span className="mini-label">MODEL CONTEXT PROTOCOL</span>
        <h2>Conectá tu laboratorio.</h2>
        <div className="library-tabs">
          {[
            ["server", "Servidor local"],
            ["external", "Conexiones externas"],
            ["permissions", "Permisos"],
            ["activity", "Actividad"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <pre className="error-message">{error}</pre>}
        {tab === "server" && (
          <>
            <div className="mcp-state">
              <span
                className={"status-dot " + (status?.enabled ? "" : "muted")}
              />
              {status?.enabled
                ? "Disponible · puente local activo"
                : "Detenido · sin acceso de agentes"}
            </div>
            <p className="helper">
              Transporte stdio hacia un ejecutable Rust autónomo. Comunicación
              con esta ventana mediante named pipe autenticado. Sin puerto
              público.
            </p>
            <label className="mcp-toggle">
              <input
                type="checkbox"
                aria-label="Habilitar servidor MCP"
                checked={status?.enabled ?? false}
                onChange={(e) => toggle(e.target.checked)}
              />
              Habilitar acceso MCP a este laboratorio
            </label>
            <code>{status?.executable ?? "Requiere aplicación nativa"}</code>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  JSON.stringify(
                    {
                      mcpServers: {
                        "effect-lab": { command: status?.executable, args: [] },
                      },
                    },
                    null,
                    2,
                  ),
                )
              }
            >
              <Copy size={13} />
              Copiar configuración
            </button>
            <button onClick={refresh}>
              <RefreshCw size={13} />
              Comprobar estado
            </button>
            <p className="helper">
              Cualquier cliente compatible puede conectarse. El primer acceso
              requiere tu permiso; las 22 herramientas se publican por stdio.
            </p>
            <details>
              <summary>Herramientas disponibles</summary>
              {tools.map((t) => (
                <p className="helper" key={t.name}>
                  <b>{t.name}</b> · {t.description}
                </p>
              ))}
            </details>
          </>
        )}
        {tab === "permissions" && (
          <>
            <AuthorizedClients />
            <h3>Permisos por operación</h3>
            <p>
              Habilitar MCP permite recibir solicitudes. Cada aplicación debe
              obtener tu autorización para leer el proyecto activo y el índice
              de biblioteca. No se entrega acceso al disco completo.
            </p>
            <p>
              Las ediciones muestran un diff, requieren aceptación y validan la
              revisión antes de aplicarse. Ejecutar un efecto, guardar una
              versión y exportar requieren aprobación en la app.
            </p>
            <p className="helper">
              No existe una herramienta de shell ni instalación de paquetes.
              Desactivar MCP revoca el token y corta nuevas solicitudes.
            </p>
          </>
        )}
        {tab === "activity" && (
          <div className="mcp-activity">
            {entries.length ? (
              entries.map((e, i) => (
                <div key={i}>
                  <time>{e.time}</time> · {e.tool} ·{" "}
                  {e.ok ? "✓" : "× " + e.error}
                </div>
              ))
            ) : (
              <p className="helper">
                Todavía no hay llamadas MCP en esta sesión.
              </p>
            )}
          </div>
        )}
        {tab === "external" && (
          <>
            <p className="helper">
              Conectá un servidor Streamable HTTP que elegís expresamente. HTTPS
              o HTTP loopback. Autenticación OAuth remota y transporte stdio
              saliente quedan fuera de esta primera implementación.
            </p>
            <label>
              URL del servidor
              <input
                aria-label="URL MCP externa"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </label>
            <button
              disabled={busy}
              onClick={async () => {
                if (
                  !(await confirmAction(
                    "¿Conectar al servidor MCP " +
                      url +
                      "? Se realizará el handshake y se listarán herramientas.",
                  ))
                )
                  return;
                setBusy(true);
                try {
                  setConnection(await invoke("mcp_client_connect", { url }));
                  setError("");
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Plug size={13} />
              Conectar y descubrir
            </button>
            {connection && (
              <>
                <button
                  onClick={async () => {
                    await invoke("mcp_client_disconnect", {
                      id: connection.id,
                    });
                    setConnection(null);
                  }}
                >
                  Desconectar
                </button>
                <select
                  aria-label="Herramienta MCP externa"
                  value={tool}
                  onChange={(e) => setTool(e.target.value)}
                >
                  <option value="">Elegí herramienta</option>
                  {connection.tools.map((t) => (
                    <option key={t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <pre className="helper">
                  {connection.tools.find((t) => t.name === tool)?.description}
                </pre>
                <textarea
                  aria-label="Argumentos MCP externos"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                />
                <button
                  disabled={busy || !tool}
                  onClick={async () => {
                    if (
                      !(await confirmAction(
                        "¿Enviar estos argumentos y ejecutar " +
                          tool +
                          " en " +
                          url +
                          "?",
                      ))
                    )
                      return;
                    setBusy(true);
                    try {
                      setResult(
                        JSON.stringify(
                          await invoke("mcp_client_call", {
                            id: connection.id,
                            name: tool,
                            arguments: JSON.parse(args),
                          }),
                          null,
                          2,
                        ),
                      );
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Ejecutar herramienta autorizada
                </button>
                <pre className="mcp-result">{result}</pre>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
