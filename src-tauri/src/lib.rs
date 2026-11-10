use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::{Manager, State};
use tauri_plugin_dialog::DialogExt;
pub mod mcp;

const MAX_BYTES: usize = 32 * 1024 * 1024;
#[derive(Default)]
struct ProjectState(Mutex<Option<(String, PathBuf)>>);
fn checked_json(content: &str) -> Result<serde_json::Value, String> {
    if content.len() > MAX_BYTES {
        return Err("El proyecto excede 32 MB".into());
    }
    serde_json::from_str(content).map_err(|e| format!("JSON inválido: {e}"))
}
fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let tmp = path.with_extension("effectlab-writing");
    let backup = path.with_extension("effectlab-backup");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    if path.exists() {
        fs::copy(path, &backup).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}
#[tauri::command]
async fn open_project(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
) -> Result<Option<String>, String> {
    let selected = app
        .dialog()
        .file()
        .add_filter("Effect Lab", &["effectlab"])
        .blocking_pick_file();
    let Some(file) = selected else {
        return Ok(None);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    if fs::metadata(&path).map_err(|e| e.to_string())?.len() > MAX_BYTES as u64 {
        return Err("Proyecto demasiado grande".into());
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let parsed = checked_json(&content)?;
    let id = parsed["id"]
        .as_str()
        .ok_or("Falta ID del proyecto")?
        .to_string();
    *state.0.lock().map_err(|e| e.to_string())? = Some((id, path));
    Ok(Some(content))
}
#[tauri::command]
async fn save_project(
    app: tauri::AppHandle,
    state: State<'_, ProjectState>,
    content: String,
    save_as: bool,
    name: String,
) -> Result<bool, String> {
    let parsed = checked_json(&content)?;
    let id = parsed["id"]
        .as_str()
        .ok_or("Falta ID del proyecto")?
        .to_string();
    let current = state.0.lock().map_err(|e| e.to_string())?.clone();
    let path = if save_as || current.as_ref().is_none_or(|(saved_id, _)| saved_id != &id) {
        let safe_name: String = name
            .chars()
            .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
            .take(80)
            .collect();
        let selected = app
            .dialog()
            .file()
            .add_filter("Effect Lab", &["effectlab"])
            .set_file_name(format!("{safe_name}-v0.1.0.effectlab"))
            .blocking_save_file();
        let Some(file) = selected else {
            return Ok(false);
        };
        file.into_path().map_err(|e| e.to_string())?
    } else {
        current.unwrap().1
    };
    atomic_write(&path, &content)?;
    *state.0.lock().map_err(|e| e.to_string())? = Some((id, path));
    Ok(true)
}
fn library_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("library.json"))
}
#[tauri::command]
fn read_library(app: tauri::AppHandle) -> Result<String, String> {
    let path = library_path(&app)?;
    if !path.exists() {
        return Ok("[]".into());
    }
    fs::read_to_string(path).map_err(|e| e.to_string())
}
#[tauri::command]
fn write_library(app: tauri::AppHandle, content: String) -> Result<(), String> {
    checked_json(&content)?;
    atomic_write(&library_path(&app)?, &content)
}
#[tauri::command]
async fn write_export(app: tauri::AppHandle, name: String, bytes: Vec<u8>) -> Result<bool, String> {
    if bytes.len() > 64 * 1024 * 1024 {
        return Err("Exportación demasiado grande".into());
    }
    let safe: String = name
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-')
        .take(120)
        .collect();
    let selected = app
        .dialog()
        .file()
        .add_filter("ZIP", &["zip"])
        .set_file_name(format!("{safe}.zip"))
        .blocking_save_file();
    let Some(file) = selected else {
        return Ok(false);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    let tmp = path.with_extension("zip-writing");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, &path).map_err(|e| e.to_string())?;
    Ok(true)
}
pub fn run() {
    tauri::Builder::default()
        .invoke_system(include_str!("main-ipc.js"))
        .plugin(tauri_plugin_dialog::init())
        .manage(ProjectState::default())
        .manage(mcp::McpState::default())
        .manage(mcp::McpClients::default())
        .invoke_handler(tauri::generate_handler![
            open_project,
            save_project,
            read_library,
            write_library,
            write_export,
            mcp::mcp_status,
            mcp::mcp_set_enabled,
            mcp::mcp_reply,
            mcp::mcp_client_connect,
            mcp::mcp_client_call,
            mcp::mcp_client_disconnect
        ])
        .run(tauri::generate_context!())
        .expect("Error al ejecutar Effect Lab");
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn persistence_keeps_previous_revision() {
        let dir = std::env::temp_dir().join(format!("effectlab-test-{}", uuid::Uuid::new_v4()));
        fs::create_dir(&dir).unwrap();
        let path = dir.join("project-v0.1.0.effectlab");
        atomic_write(&path, "{\"revision\":1}").unwrap();
        atomic_write(&path, "{\"revision\":2}").unwrap();
        assert_eq!(fs::read_to_string(&path).unwrap(), "{\"revision\":2}");
        assert_eq!(
            fs::read_to_string(path.with_extension("effectlab-backup")).unwrap(),
            "{\"revision\":1}"
        );
        assert!(!path.with_extension("effectlab-writing").exists());
        fs::remove_file(&path).unwrap();
        fs::remove_file(path.with_extension("effectlab-backup")).unwrap();
        fs::remove_dir(dir).unwrap();
    }
    #[test]
    fn corrupt_documents_are_rejected() {
        assert!(checked_json("{invalid}").is_err());
    }
}
