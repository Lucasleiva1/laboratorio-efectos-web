# Límites de confianza

El código de efectos es no confiable y se ejecuta exclusivamente en iframes con `allow-scripts`, sin `allow-same-origin`. No se habilita eval en el editor. El compilador WASM transforma archivos y no ejecuta plugins, configuraciones npm ni scripts de instalación de los proyectos.

La CSP del runtime permite sus scripts con nonce y recursos data/blob, y bloquea conexiones de red, formularios y navegación del padre. Los mensajes validan origen de ventana, sesión, versión de protocolo y proyecto. Solo hay mensajes de parámetros, logs, métricas e inspección; ninguno invoca comandos nativos.

En Windows, Wry puede inyectar inicializadores de Tauri en subframes. `src-tauri/src/main-ipc.js` usa la API oficial `invoke_system` para instalar el transporte autenticado solo en el frame superior. En los demás lo rechaza explícitamente. La prueba de runtime verifica que `read_library` es rechazado desde el efecto. El objeto interno de Tauri puede existir, pero no tiene un transporte utilizable ni entrega su clave.

Los comandos nativos solo están autorizados para la ventana principal mediante capabilities. Los archivos de proyecto se eligen mediante diálogos; biblioteca y descriptor MCP viven en datos privados de la aplicación. No hay permiso de shell ni un filesystem global expuesto al frontend.

MCP local está apagado al iniciar. El puente usa named pipe con rechazo de clientes remotos y token aleatorio revocable. Cada cliente necesita permiso para el proyecto activo. Las escrituras validan revisión, esquema, tamaño y rutas; requieren diff, aceptación y checkpoint. Revocar bloquea propuestas pendientes. No se publica HTTP entrante ni se modifica la configuración de otros agentes.

El cliente MCP saliente permite servidores elegidos por el usuario mediante HTTPS o HTTP loopback; las llamadas requieren confirmación y tienen timeout. OAuth y ejecución stdio saliente no están implementados. Los resultados se muestran como texto, no instrucciones ejecutables.

Las imágenes se incluyen como recursos data URI. SVG se trata como imagen pasiva, no markup insertado en la interfaz privilegiada. El código dentro del efecto sigue dentro del sandbox.

## Límites reales

El aislamiento de origen no impone cuotas duras de CPU/GPU: un bucle infinito puede bloquear un proceso de renderizado. Pausar es cooperativo; detener elimina la superficie. El sistema no analiza semánticamente cualquier código ni garantiza que una sugerencia AST produzca un control útil.

El acceso de programas bajo la misma cuenta de Windows pertenece al límite de confianza local. El nombre declarado en MCP no es una identidad firmada. No se probaron todos los clientes del mercado, dispositivos móviles físicos ni un paquete instalado de producción.

Las auditorías npm se registran en `.local/npm-audit-runtime.json` y `.local/npm-audit-all.json`. Se fijó DOMPurify corregido mediante override y se actualizó Vitest después de comprobar compatibilidad con Node/Vite. No se ejecutaron solicitudes a modelos ni se extrajeron credenciales.
