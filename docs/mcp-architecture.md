# MCP universal de Effect Lab

El servidor acepta cualquier cliente compatible que el usuario autorice. La aplicación no detecta proveedores, no selecciona modelos y no inicia solicitudes a IA.

## Procesos y confianza

`cliente MCP → effectlab-mcp.exe (stdio) → named pipe local autenticado → Effect Lab → servicio de operaciones → revisión / proyecto / visor / exportador`.

Se usa el SDK oficial `rmcp 3.9` con negociación de versión. El ejecutable stdio reserva stdout para protocolo. Los errores se devuelven como resultados de herramienta, sin fingir éxito. La versión de desarrollo se ejecuta con `cargo run --manifest-path src-tauri/Cargo.toml --bin effectlab-mcp`; se genera un ejecutable autónomo de depuración para las pruebas. No se preparó un instalador ni una distribución de producción.

MCP está deshabilitado al iniciar. Al activarlo se crea una tubería Windows con rechazo de clientes remotos, nombre aleatorio y credencial efímera. El descriptor está en el directorio privado de datos de la app (`com.effectlab.desktop/mcp-connection.json`), fuera de proyectos y Git. Desactivar revoca el token. No se abre un servidor HTTP público.

Cada proceso MCP transmite el nombre declarado en el handshake y una sesión generada por el servidor. El usuario autoriza al cliente para el proyecto activo. El nombre no es una identidad firmada: un programa local que actúe bajo la misma cuenta de Windows pertenece al mismo límite de confianza del usuario. Las autorizaciones se pueden revocar; no otorgan escritura automática.

## Operaciones

La interfaz manual y MCP comparten proyecto, validación, historial, compilador y exportador. Las escrituras validan `projectId`, `expectedRevision`, rutas relativas, tamaño y esquema; muestran diff y crean un checkpoint antes de aplicar. Una revisión obsoleta se rechaza. Si se revoca el permiso mientras hay una propuesta pendiente, no se aplica.

La ejecución de preview, exportación y creación de checkpoints requieren autorización adicional en la aplicación. No existe shell genérico, instalación automática ni lectura arbitraria del sistema.

## Cliente saliente

Effect Lab puede conectar a un servidor Streamable HTTP elegido explícitamente: HTTPS con TLS nativo, o HTTP loopback. Muestra herramientas y ejecuta argumentos JSON después de autorización. Las descripciones/resultados se muestran como datos. Timeout de conexión 20 s y de llamada 30 s. No se implementó OAuth remoto ni lanzamiento stdio de ejecutables externos.
