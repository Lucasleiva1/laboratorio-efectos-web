fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "open_project",
            "save_project",
            "read_library",
            "write_library",
            "write_export",
            "mcp_status",
            "mcp_set_enabled",
            "mcp_reply",
            "mcp_client_connect",
            "mcp_client_call",
            "mcp_client_disconnect",
        ]),
    ))
    .expect("No se pudo preparar Effect Lab");
}
