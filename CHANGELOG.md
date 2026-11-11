# Cambios

## 0.2.1 · 2026-11-11 · Instalación y actualización firmada

- Primera distribución Windows NSIS con firma del actualizador, manifiesto estático y publicación en GitHub Releases.
- Instalación para el usuario actual, desinstalador de Windows y reemplazo de versión desde Configuración → Actualizaciones.
- Se conservan el identificador del producto y la clave de firma para las siguientes versiones.


## 0.2.0 · 2026-11-11 · Preparada para instalación

- Actualizador firmado con búsqueda manual, progreso e instalación desde Configuración; clave privada local fuera del repositorio.
- Release en borrador y script de compilación/publicación explícitas; sin builds automáticos.
- Proyectos de portada, partículas y pincelada persistente por tramos; reconstrucción independiente del cursor y funcionamiento con reducción de movimiento de Windows.
- Lienzo vacío gris oscuro; versión visible tomada de la configuración del producto.
- Sin instalador ni prueba nativa del actualizador todavía: compilación pospuesta por el usuario.


## 0.1.1 · 2026-11-10 · Punto estable

- Nombre inicial alfanumérico de proyecto, editable arriba y separado del nombre de los efectos; cargar puntos de partida conserva la identidad del proyecto.
- Guardando/Guardado con hora, cancelación y error visibles; bloqueo de guardados simultáneos y conservación de cambios hechos durante la escritura.
- Botón Guardar como, sin rótulo Ctrl S; diálogo con nombre del proyecto y carpeta del archivo actual, conservando espacios en los nombres.
- Inspector con un solo cuadro plegable por elemento, opciones independientes y eliminación con Deshacer; eliminar el último deja el lienzo vacío.
- Elementos nuevos para componer: Partículas, Glow, Texto y Forma. Los trece puntos de partida conservan sus archivos originales.
- Importar imagen como única entrada: archivo local o imagen de prueba, colocación inmediata y errores visibles. PNG/JPEG/WebP/SVG/GIF/AVIF/BMP compatibles con WebView2; hasta 16 MB por imagen.
- Orden frontal arriba y fondo abajo; inserción arriba, asas de arrastre, línea de destino, animación y botones para subir/bajar. Reordenar conserva las superficies en ejecución.
- Parámetros de recursos independientes enviados en vivo sin recompilar toda la composición; corrección de serialización HTML de fuentes embebidas.
- Efectos de red tecnológica y partículas verdes diminutas, glow integrado y ondas al hacer clic; implementación de partículas sin malla ni filtros de desenfoque, con descanso cuando no hay actividad.
- Partículas: 60 FPS en tres muestras de WebView2 en el equipo de desarrollo; coste medio de dibujo de 0,43–0,85 ms. Exportación autónoma comprobada con interacción y desmontaje.
- Comprobación: 28 pruebas unitarias; flujos nativos de cinco elementos, seis controles de imagen, eliminación/undo, importación y arrastre real; exportación autónoma de cinco elementos.

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
