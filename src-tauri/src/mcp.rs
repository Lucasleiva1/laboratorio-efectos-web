use rmcp::{
    model::CallToolRequestParams, service::RunningService,
    transport::StreamableHttpClientTransport, RoleClient, ServiceExt,
};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
};
use tauri::{Emitter, Manager, State};
use tokio::{
    io::{AsyncBufReadExt, AsyncRead, AsyncWriteExt, BufReader},
    sync::{oneshot, Notify},
};
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct Descriptor {
    pub pipe: String,
    pub token: String,
    pub version: String,
}
struct Active {
    descriptor: Descriptor,
    active: AtomicBool,
    stop: Notify,
}
#[derive(Default)]
pub struct McpState {
    active: Mutex<Option<Arc<Active>>>,
    pending: Mutex<HashMap<String, oneshot::Sender<Value>>>,
}
#[derive(Default)]
pub struct McpClients(tokio::sync::Mutex<HashMap<String, RunningService<RoleClient, ()>>>);
pub fn descriptor_path() -> Result<PathBuf, String> {
    Ok(dirs::data_dir()
        .ok_or("No se encuentra AppData")?
        .join("com.effectlab.desktop")
        .join("mcp-connection.json"))
}
pub async fn read_line_limited<R: AsyncRead + Unpin>(
    reader: &mut BufReader<R>,
    limit: usize,
) -> Result<String, String> {
    let mut bytes = Vec::new();
    loop {
        let available = reader.fill_buf().await.map_err(|e| e.to_string())?;
        if available.is_empty() {
            return Err("Canal cerrado".into());
        }
        let n = available
            .iter()
            .position(|b| *b == b'\n')
            .map(|i| i + 1)
            .unwrap_or(available.len());
        if bytes.len() + n > limit {
            return Err("Solicitud demasiado grande".into());
        }
        let done = available[n - 1] == b'\n';
        bytes.extend_from_slice(&available[..n]);
        reader.consume(n);
        if done {
            break;
        }
    }
    String::from_utf8(bytes).map_err(|e| e.to_string())
}
#[cfg(windows)]
async fn handle_pipe(
    app: tauri::AppHandle,
    active: Arc<Active>,
    mut pipe: tokio::net::windows::named_pipe::NamedPipeServer,
) {
    let result=async{let mut reader=BufReader::new(&mut pipe);let line=tokio::time::timeout(std::time::Duration::from_secs(10),read_line_limited(&mut reader,2*1024*1024)).await.map_err(|_|"Timeout".to_string())??;let request:Value=serde_json::from_str(&line).map_err(|e|e.to_string())?;if request["token"]!=active.descriptor.token||!active.active.load(Ordering::Relaxed){return Err("Permiso denegado".into());}let tool=request["tool"].as_str().ok_or("Herramienta ausente")?;
 let allowed:Vec<Value>=serde_json::from_str(include_str!("../../packages/agent-contracts/tools.json")).map_err(|e|e.to_string())?;if !allowed.iter().any(|t|t["name"]==tool){return Err("unsupported_capability".into());}
 let id=uuid::Uuid::new_v4().to_string();let(tx,rx)=oneshot::channel();let state=app.state::<McpState>();{let mut pending=state.pending.lock().map_err(|e|e.to_string())?;if pending.len()>=8{return Err("Demasiadas solicitudes pendientes".into());}pending.insert(id.clone(),tx);}
 app.emit("mcp-request",json!({"id":id,"tool":tool,"args":request["args"],"client":request["client"]})).map_err(|e|e.to_string())?;
 let result=tokio::select!{value=tokio::time::timeout(std::time::Duration::from_secs(120),rx)=>value.map_err(|_|"La aprobación expiró".to_string())?.map_err(|_|"Solicitud cancelada".to_string()),_=active.stop.notified()=>Err("MCP desactivado".into())};state.pending.lock().map_err(|e|e.to_string())?.remove(&id);result}.await;
    let response = match result {
        Ok(data) => data,
        Err(error) => json!({"ok":false,"error":error}),
    };
    let line = response.to_string() + "\n";
    let _ = pipe.write_all(line.as_bytes()).await;
}
#[tauri::command]
pub fn mcp_status(state: State<McpState>) -> Result<Value, String> {
    let active = state.active.lock().map_err(|e| e.to_string())?;
    let executable = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .with_file_name("effectlab-mcp.exe");
    Ok(
        json!({"enabled":active.is_some(),"transport":"stdio + named pipe local","executable":executable,"version":"0.1.0"}),
    )
}
#[tauri::command]
pub async fn mcp_set_enabled(
    app: tauri::AppHandle,
    state: State<'_, McpState>,
    enabled: bool,
) -> Result<Value, String> {
    if let Some(old) = state.active.lock().map_err(|e| e.to_string())?.take() {
        old.active.store(false, Ordering::Relaxed);
        old.stop.notify_waiters();
    }
    let path = descriptor_path()?;
    let _ = std::fs::remove_file(&path);
    if !enabled {
        return Ok(json!({"enabled":false}));
    }
    #[cfg(not(windows))]
    return Err("El puente named pipe requiere Windows".into());
    #[cfg(windows)]
    {
        let id = uuid::Uuid::new_v4().to_string();
        let descriptor = Descriptor {
            pipe: format!(r"\\.\pipe\effectlab-{}", id),
            token: uuid::Uuid::new_v4().to_string(),
            version: "0.1.0".into(),
        };
        let active = Arc::new(Active {
            descriptor: descriptor.clone(),
            active: AtomicBool::new(true),
            stop: Notify::new(),
        });
        let first = tokio::net::windows::named_pipe::ServerOptions::new()
            .first_pipe_instance(true)
            .reject_remote_clients(true)
            .create(&descriptor.pipe)
            .map_err(|e| e.to_string())?;
        std::fs::create_dir_all(path.parent().unwrap()).map_err(|e| e.to_string())?;
        std::fs::write(
            &path,
            serde_json::to_string(&descriptor).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        *state.active.lock().map_err(|e| e.to_string())? = Some(active.clone());
        tokio::spawn(async move {
            let mut next = Some(first);
            while active.active.load(Ordering::Relaxed) {
                let server = if let Some(first) = next.take() {
                    first
                } else {
                    match tokio::net::windows::named_pipe::ServerOptions::new()
                        .reject_remote_clients(true)
                        .create(&active.descriptor.pipe)
                    {
                        Ok(p) => p,
                        Err(_) => break,
                    }
                };
                tokio::select! {connected=server.connect()=>{if connected.is_err(){break;}tokio::spawn(handle_pipe(app.clone(),active.clone(),server));},_=active.stop.notified()=>break,}
            }
        });
        Ok(json!({"enabled":true,"transport":"stdio"}))
    }
}
#[tauri::command]
pub fn mcp_reply(state: State<McpState>, id: String, result: Value) -> Result<(), String> {
    if let Some(tx) = state.pending.lock().map_err(|e| e.to_string())?.remove(&id) {
        tx.send(result).map_err(|_| "Solicitud vencida")?;
    }
    Ok(())
}
pub async fn dispatch_to_app(tool: &str, args: Value, client: Value) -> Result<Value, String> {
    #[cfg(windows)]
    {
        let path = descriptor_path()?;
        let text = std::fs::read_to_string(path)
            .map_err(|_| "Effect Lab no está abierto o MCP está desactivado")?;
        let descriptor: Descriptor = serde_json::from_str(&text).map_err(|e| e.to_string())?;
        let mut pipe = tokio::net::windows::named_pipe::ClientOptions::new()
            .open(&descriptor.pipe)
            .map_err(|_| "La instancia de Effect Lab ya no está disponible")?;
        let line = json!({"token":descriptor.token,"tool":tool,"args":args,"client":client})
            .to_string()
            + "\n";
        pipe.write_all(line.as_bytes())
            .await
            .map_err(|e| e.to_string())?;
        let response = tokio::time::timeout(
            std::time::Duration::from_secs(125),
            read_line_limited(&mut BufReader::new(pipe), 4 * 1024 * 1024),
        )
        .await
        .map_err(|_| "Effect Lab no respondió")??;
        serde_json::from_str(&response).map_err(|e| e.to_string())
    }
    #[cfg(not(windows))]
    {
        let _ = (tool, args, client);
        Err("El puente requiere Windows".into())
    }
}
#[tauri::command]
pub async fn mcp_client_connect(
    state: State<'_, McpClients>,
    url: String,
) -> Result<Value, String> {
    let parsed = url::Url::parse(&url).map_err(|e| e.to_string())?;
    if parsed.scheme() != "https"
        && !(parsed.scheme() == "http"
            && matches!(parsed.host_str(), Some("127.0.0.1" | "localhost" | "[::1]")))
    {
        return Err("Solo HTTPS o HTTP loopback explícito".into());
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err("No incluir credenciales en la URL".into());
    }
    let client = tokio::time::timeout(
        std::time::Duration::from_secs(20),
        ().serve(StreamableHttpClientTransport::from_uri(url)),
    )
    .await
    .map_err(|_| "Timeout de conexión MCP")?
    .map_err(|e| e.to_string())?;
    let tools = client.list_all_tools().await.map_err(|e| e.to_string())?;
    let id = uuid::Uuid::new_v4().to_string();
    state.0.lock().await.insert(id.clone(), client);
    Ok(json!({"id":id,"tools":tools}))
}
#[tauri::command]
pub async fn mcp_client_call(
    state: State<'_, McpClients>,
    id: String,
    name: String,
    arguments: Value,
) -> Result<Value, String> {
    if arguments.to_string().len() > 1024 * 1024 {
        return Err("Argumentos demasiado grandes".into());
    }
    let guard = state.0.lock().await;
    let client = guard.get(&id).ok_or("Conexión ausente")?;
    let args = arguments
        .as_object()
        .ok_or("Se requiere un objeto JSON")?
        .clone();
    let result = tokio::time::timeout(
        std::time::Duration::from_secs(30),
        client.call_tool(CallToolRequestParams::new(name).with_arguments(args)),
    )
    .await
    .map_err(|_| "Timeout de herramienta")?
    .map_err(|e| e.to_string())?;
    serde_json::to_value(result).map_err(|e| e.to_string())
}
#[tauri::command]
pub async fn mcp_client_disconnect(state: State<'_, McpClients>, id: String) -> Result<(), String> {
    if let Some(client) = state.0.lock().await.remove(&id) {
        client.cancel().await.map_err(|e| e.to_string())?;
    }
    Ok(())
}
