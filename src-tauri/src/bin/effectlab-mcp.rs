use rmcp::{model::*, service::RequestContext, ErrorData, RoleServer, ServerHandler, ServiceExt};
use serde_json::{json, Value};
#[derive(Clone)]
struct EffectLab {
    session_id: String,
}
impl ServerHandler for EffectLab {
    fn get_info(&self) -> ServerConfig {
        serde_json::from_value(json!({"protocolVersion":"2026-07-28","capabilities":{"tools":{}},"serverInfo":{"name":"Effect Lab","version":"0.1.0"},"instructions":"Activá MCP en la app. Las escrituras requieren expectedRevision y aprobación visible. No hay shell genérico."})).unwrap_or_default()
    }
    async fn list_tools(
        &self,
        _: Option<PaginatedRequestParams>,
        _: RequestContext<RoleServer>,
    ) -> Result<ListToolsResult, ErrorData> {
        let specs: Vec<Value> =
            serde_json::from_str(include_str!("../../../packages/agent-contracts/tools.json"))
                .map_err(|e| ErrorData::internal_error(e.to_string(), None))?;
        let tools = specs
            .into_iter()
            .map(|v| serde_json::from_value::<Tool>(v))
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| ErrorData::internal_error(e.to_string(), None))?;
        let mut result = ListToolsResult::default();
        result.tools = tools;
        Ok(result)
    }
    async fn call_tool(
        &self,
        request: CallToolRequestParams,
        context: RequestContext<RoleServer>,
    ) -> Result<CallToolResponse, ErrorData> {
        let info = context.peer.peer_info();
        let name = info
            .as_ref()
            .map(|i| i.client_info.name.clone())
            .unwrap_or("Cliente MCP".into());
        let response = effect_lab_lib::mcp::dispatch_to_app(
            &request.name,
            json!(request.arguments.unwrap_or_default()),
            json!({"name":name,"sessionId":self.session_id}),
        )
        .await;
        let result = match response {
            Ok(value) => {
                if value["ok"] == false {
                    CallToolResult::error(vec![ContentBlock::text(value.to_string())])
                } else {
                    CallToolResult::success(vec![ContentBlock::text(value.to_string())])
                }
            }
            Err(error) => CallToolResult::error(vec![ContentBlock::text(
                json!({"ok":false,"error":error}).to_string(),
            )]),
        };
        Ok(result.into())
    }
}
#[tokio::main]
async fn main() {
    match (EffectLab {
        session_id: uuid::Uuid::new_v4().to_string(),
    })
    .serve(rmcp::transport::stdio())
    .await
    {
        Ok(service) => {
            let _ = service.waiting().await;
        }
        Err(e) => eprintln!("MCP: {e}"),
    }
}
