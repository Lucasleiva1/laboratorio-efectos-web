# Agentes externos mediante MCP

La aclaración del usuario sustituye el diseño de adaptadores locales por proveedor de la etapa 8: **Effect Lab recibe cualquier cliente MCP autorizado**. No se detecta, instala, ejecuta ni autentica Codex, Claude u otra IA. No se modifica el selector de modelos ni el razonamiento de ninguna aplicación.

El panel Asistente permite abrir conexiones, copiar el contexto y consultar actividad. El cliente externo genera código libre y llama a las herramientas estándar del servidor; el laboratorio revisa, aplica, ejecuta y exporta. Funciona manualmente sin clientes conectados y sin cuentas de IA.

Cada proceso cliente se identifica mediante el handshake MCP, recibe una sesión local y solicita permiso para el proyecto activo. Su nombre declarado es información del protocolo, no prueba criptográfica de identidad. Las escrituras exigen revisión esperada, diff, aprobación y checkpoint. Los permisos son revocables.

No se ejecutaron solicitudes a modelos ni se consumieron cupos de IA para probar esta integración. La prueba usa un cliente MCP del SDK oficial y código de prueba propio. La instalación de un proveedor no es un criterio de disponibilidad del servidor.
