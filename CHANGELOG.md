# Cambios

## 0.1.0 · 2026-11-10 · Desarrollo

- Primera versión de código fuente en GitHub, marcada como base de desarrollo con pendientes del compositor; sin instalador.
- Consola y Código ocultos al iniciar, desplegables e independientes en la parte inferior; ambos se apilan debajo del efecto.
- Explorador conservado para imágenes y puntos de partida; archivos de código únicamente en el panel Código.
- Accesos Explorador/Biblioteca en la barra superior, texto blanco configurable y persistente, Asistente conservado sin estrellas y bloque decorativo eliminado.
- Nuevo proyecto sin contenido de demostración, con archivos básicos preparados.
- Ejecución persistente: Detener cancela recargas pendientes y Auto solo actualiza una preview activa; controles en vivo no recompilan archivos sin cambios. Regresión comprobada en WebView2.

- Primera implementación local de Effect Lab para Windows con Tauri 2, React, Monaco y diseño negro/violeta.
- Proyectos editables de múltiples archivos, runtime aislado, consola, controles dinámicos y adaptación AST revisable.
- PixiJS, GSAP, Three.js, GLSL y Matter.js; capas, grafo numérico y timeline.
- Biblioteca, favoritos, presets, revisiones con diff, restauración y guardado atómico.
- Recurso de fondo de imagen con importación, encuadre, posición, zoom, desenfoque y oscurecimiento.
- MCP estándar con 22 herramientas, permisos y revisión de cambios; cliente HTTP temporal.
- Exportador autónomo HTML/JS y React con nombres versionados y 13 ejemplos comprobados.
- Reparaciones de aislamiento IPC, rutas de workers Monaco, dimensiones de física, estado compartido en desarrollo y nombres de exportación React en Windows.
- Dependencias del compositor preparadas desde el inicio en desarrollo y miniaturas de biblioteca contenidas sin tapar sus acciones.
- Pruebas y documentación de resultados, rendimiento, seguridad y límites actuales.

Sin instalador ni distribución de producción: el usuario solicitó probar primero.
