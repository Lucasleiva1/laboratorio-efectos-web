# Herramientas MCP

Los 22 esquemas reales están en `packages/agent-contracts/tools.json`. `tools/list` publica esos mismos contratos.

- Descubrimiento: `effectlab_status`, `list_projects`, `get_project`, `list_project_files`, `read_project_file`, `list_effects`, `list_effect_parameters`, `list_project_versions`.
- Cambios revisables: `create_project`, `write_project_file`, `apply_file_patch`, `create_effect`, `remove_effect`, `create_control`, `update_control`, `remove_control`, `set_effect_parameter`.
- Ejecución y salida: `validate_effect`, `run_preview`, `get_preview_diagnostics`, `export_effect`, `create_checkpoint`.

Primero obtené `projectId` y `revision` mediante `effectlab_status`. Usá esa revisión en las operaciones de escritura como `expectedRevision`. El usuario recibe un diff en la ventana nativa y puede aceptar o rechazar. Consultá el estado de nuevo después de cada cambio. `apply_file_patch` exige que el fragmento coincida exactamente una vez.

`create_control` crea el esquema; el agente también debe registrar el parámetro en el código con `window.lab.register`. Un widget por sí solo no establece un comportamiento. `remove_effect` elimina una instancia de capa conservando el código fuente; `remove_control` tampoco borra código.

`run_preview` solicita el arranque del visor; los errores posteriores se consultan con `get_preview_diagnostics`. `validate_effect` comprueba compilación, no garantiza la corrección artística o la ausencia de excepciones en ejecución.

La exportación usa el proyecto en memoria y el exportador común; la ruta la elige el usuario con un diálogo nativo. Ninguna herramienta acepta un comando shell ni una ruta absoluta arbitraria.
