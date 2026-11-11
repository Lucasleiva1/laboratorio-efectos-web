# Próximas ampliaciones

La aplicación actual es una base de desarrollo probada por flujos concretos. No se presenta como una suite profesional terminada en todos sus detalles.

- Prueba manual del usuario: diálogos nativos Abrir/Guardar, encuadre de sus imágenes y flujo cotidiano.
- Compositor: el usuario reportó dificultades de selección/borrado de nodos y navegación del lienzo. Reproducir esos casos, corregirlos y agregar una eliminación visible. La existencia de pruebas de runtime no valida toda la edición visual.
- Claridad de nodos y timeline: tipos comprensibles, conexiones/destinos explícitos y orientación del flujo. La interfaz actual del compositor es inicial y requiere revisión de uso.
- Distribución de producción e instalador, pospuestos expresamente por el usuario; empaquetado final de MCP y validación sin Vite.
- Más widgets, edición de curvas, keyframes de color/vector y mejor diseño de pistas; actualmente las pistas son numéricas.
- Los parámetros de recursos y el orden de capas ya se actualizan en vivo. Agregar/eliminar elementos o cambiar transformaciones estructurales todavía recompone la preview; optimizar esos cambios manteniendo sus recursos.
- Gestión de colecciones de gran tamaño: índice en SQLite, paginación y deduplicación de assets; hoy se usa JSON atómico con límite explícito de 32 MB y primeros 100 resultados visibles.
- Cliente MCP saliente con gestor persistente, OAuth y stdio autorizado; actualmente se implementa Streamable HTTP temporal.
- Scroll exportado acoplado al sitio anfitrión y dependencias compartidas entre superficies, con contrato explícito.
- Cuotas duras para procesos de renderizado defectuosos y pruebas físicas en móviles.
- Versión web pública y colaboración remota: no iniciadas.
- Assets reutilizables de proyectos seleccionados: guardar una composición como base identificable, conservar imagen, código y parámetros, y crear una copia independiente para adaptarla a otra página sin modificar el original. Pedido para una etapa posterior; no implementarlo dentro de la preparación del actualizador.

Los modelos y niveles de razonamiento de los clientes externos siguen bajo control exclusivo del usuario. Effect Lab no los cambia.
