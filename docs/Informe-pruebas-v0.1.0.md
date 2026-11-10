# Effect Lab v0.1.0 — Informe de pruebas

Fecha: 10 de noviembre de 2026. Entorno: Windows, Tauri 2 / WebView2 nativo, Node 24, Rust estable.

**Estado: listo para revisión del usuario en modo desarrollo, con límites documentados. No se generó instalador ni build de distribución.** El usuario pidió probar antes de empaquetar.

## Resultados comprobados

| Grupo                     | Resultado                                                                                                                      | Evidencia                           |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- |
| TypeScript                | Pasó                                                                                                                           | npm run typecheck                   |
| Unitarias Vitest          | 18 pruebas pasaron                                                                                                             | .local/vitest-results.json          |
| Persistencia Rust         | 2 pruebas pasaron: temporal, backup y JSON corrupto                                                                            | .local/rust-tests.log               |
| Código libre              | Pegado real en Monaco, análisis AST, adaptador aceptado, control activo, error/reparación y vínculo roto                       | .local/free-code-results.json       |
| Runtime nativo            | HTML, React con estado, PixiJS + GSAP y Three.js; cantidad cambia el canvas real; IPC rechazado desde el efecto                | scripts/test-native-runtime.mjs     |
| Efectos avanzados nativos | 4 casos: scroll, imagen, GLSL y física; shader inválido se recupera; física funciona a 375 px                                  | .local/advanced-native-results.json |
| Composición               | Cursor → grafo → posición; visibilidad; scrub a 1 s produce opacidad 0,6                                                       | .local/composition-results.json     |
| Biblioteca                | Archivos, favorito en disco, preset, dos revisiones, diff real y restauración con checkpoint sin perder revisiones posteriores | .local/library-results.json         |
| Fondo de imagen           | Importación, encuadre, desenfoque, oscurecimiento y serialización                                                              | .local/background-results.json      |
| MCP servidor              | Handshake, 22 herramientas, autorización, escritura aprobada, rechazo, traversal, conflicto y undo                             | .local/mcp-results.json             |
| MCP cliente               | Handshake HTTP local, tools/list, echo autorizado, desconexión y rechazo HTTP no local                                         | .local/mcp-client-results.json      |
| Exportaciones             | 13 demos independientes en Edge, dos instancias y limpieza; 2 wrappers React consumidos y tipados                              | .local/export-results.json          |
| Dependencias npm          | 0 vulnerabilidades reportadas en auditoría completa                                                                            | .local/npm-audit-all.json           |

No se enviaron solicitudes a modelos ni se modificó el catálogo, modelo activo o razonamiento de clientes externos. Las imágenes del usuario se leyeron sin modificar sus originales.

## Exportaciones medidas

| Proyecto                | Bytes sin comprimir | Bytes ZIP | Resultado |
| ----------------------- | ------------------: | --------: | --------- |
| 01-cursor-halo-html     |              12.460 |     5.798 | Pasó      |
| 02-react-interactive    |             247.299 |    81.513 | Pasó      |
| 03-particles-pixi-gsap  |             983.253 |   296.930 | Pasó      |
| 04-three-basic          |             612.509 |   162.281 | Pasó      |
| 05-parallax-scroll      |             129.494 |    53.278 | Pasó      |
| 06-image-displacement   |             984.861 |   296.907 | Pasó      |
| 07-glsl-procedural      |              13.166 |     6.174 | Pasó      |
| 08-matter-physics       |             101.872 |    35.870 | Pasó      |
| 09-composition-cover    |           1.097.241 |   306.175 | Pasó      |
| 10-composition-graph    |              27.701 |     8.530 | Pasó      |
| 11-composition-timeline |             292.933 |    86.295 | Pasó      |
| 12-composition-free     |              22.102 |     7.306 | Pasó      |
| 13-image-background     |              15.850 |     6.294 | Pasó      |

Los tamaños incluyen demo, módulo, instrucciones, manifiesto y avisos correspondientes. No se cargan motores no importados. Son archivos generados por el exportador común, no demos copiadas a mano.

## Rendimiento medido

| Caso                | Partículas | Glow | Ejecución inicial (ms) | FPS rAF | p95 frame (ms) |
| ------------------- | ---------: | ---: | ---------------------: | ------: | -------------: |
| simple              |          — |    — |                   1159 |    60.0 |           16.8 |
| partículas original |       3000 |    8 |                   2434 |    60.0 |           16.8 |
| partículas ligera   |        900 |  2.4 |                   1929 |    60.0 |           16.8 |

Se registraron tres muestras y se promediaron las últimas dos. La medida refleja la cadencia de requestAnimationFrame de la vista previa, no el tiempo GPU. En este equipo ambos perfiles de partículas llegaron al límite aproximado de refresco; no se demuestra una mejora de FPS ni se garantiza ese resultado en otros equipos. CPU/GPU porcentuales, instalación y dispositivos móviles físicos: no medidos.

## Pendientes de revisión

- Prueba manual del usuario con los diálogos nativos Abrir/Guardar y su flujo cotidiano. El almacenamiento subyacente sí se probó en disco.
- Recuperación tras cierre forzoso y cuotas duras ante bucles infinitos; la copia IndexedDB existe, pero no se simula una certificación de resistencia a fallos.
- Instalador, build de distribución, empaquetado final de MCP y ejecución instalada sin Vite: pospuestos por instrucción del usuario. El build de frontend inicial de etapa 1 pasó antes de esa instrucción; no representa una validación del paquete actual.
- Grafos y timeline iniciales: puertos y keyframes numéricos; sin curvas Bézier ni máscaras alfa arbitrarias.
- Exportación mediante superficies aisladas: scroll propio, sin compartir renderer GPU entre instancias.
- Cliente MCP saliente HTTP temporal; OAuth y stdio saliente pendientes. No se comprobó cada cliente MCP existente.

Consultá GUIA_PRUEBA.md, SEGURIDAD.md, EXPORTACION.md y PENDIENTES_POST_LANZAMIENTO.md para uso y límites.
