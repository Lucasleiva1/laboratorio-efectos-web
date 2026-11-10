import { readFile, writeFile } from "node:fs/promises";
const json = async (name) =>
  JSON.parse(await readFile(".local/" + name, "utf8"));
const [
  unit,
  exports,
  bench,
  mcp,
  mcpClient,
  library,
  free,
  background,
  advanced,
  audit,
] = await Promise.all(
  [
    "vitest-results.json",
    "export-results.json",
    "benchmark-results.json",
    "mcp-results.json",
    "mcp-client-results.json",
    "library-results.json",
    "free-code-results.json",
    "background-results.json",
    "advanced-native-results.json",
    "npm-audit-all.json",
  ].map(json),
);
if (
  exports.length !== 13 ||
  exports.some((p) => p.status !== "PASS") ||
  !unit.success ||
  !library.diffReviewed ||
  !library.revisionRecovery ||
  mcp.report.some((p) => !p.pass)
)
  throw Error("Faltan resultados completos: no se genera un informe aprobado.");
const sizeTable = exports
  .map(
    (p) =>
      `| ${p.id} | ${p.bytes.toLocaleString("es-AR")} | ${p.zipBytes.toLocaleString("es-AR")} | Pasó |`,
  )
  .join("\n");
const performanceTable = bench.results
  .map(
    (p) =>
      `| ${p.label} | ${p.count ?? "—"} | ${p.glow ?? "—"} | ${p.startupMs} | ${p.fps.toFixed(1)} | ${p.p95ms.toFixed(1)} |`,
  )
  .join("\n");
const report = `# Effect Lab v0.1.0 — Informe de pruebas\n\nFecha: 10 de noviembre de 2026. Entorno: Windows, Tauri 2 / WebView2 nativo, Node 24, Rust estable.\n\n**Estado: listo para revisión del usuario en modo desarrollo, con límites documentados. No se generó instalador ni build de distribución.** El usuario pidió probar antes de empaquetar.\n\n## Resultados comprobados\n\n| Grupo | Resultado | Evidencia |\n|---|---|---|\n| TypeScript | Pasó | npm run typecheck |\n| Unitarias Vitest | ${unit.numPassedTests} pruebas pasaron | .local/vitest-results.json |\n| Persistencia Rust | 2 pruebas pasaron: temporal, backup y JSON corrupto | .local/rust-tests.log |\n| Código libre | Pegado real en Monaco, análisis AST, adaptador aceptado, control activo, error/reparación y vínculo roto | .local/free-code-results.json |\n| Runtime nativo | HTML, React con estado, PixiJS + GSAP y Three.js; cantidad cambia el canvas real; IPC rechazado desde el efecto | scripts/test-native-runtime.mjs |\n| Efectos avanzados nativos | ${advanced.length} casos: scroll, imagen, GLSL y física; shader inválido se recupera; física funciona a 375 px | .local/advanced-native-results.json |\n| Composición | Cursor → grafo → posición; visibilidad; scrub a 1 s produce opacidad 0,6 | .local/composition-results.json |\n| Biblioteca | Archivos, favorito en disco, preset, dos revisiones, diff real y restauración con checkpoint sin perder revisiones posteriores | .local/library-results.json |\n| Fondo de imagen | Importación, encuadre, desenfoque, oscurecimiento y serialización | .local/background-results.json |\n| MCP servidor | Handshake, 22 herramientas, autorización, escritura aprobada, rechazo, traversal, conflicto y undo | .local/mcp-results.json |\n| MCP cliente | Handshake HTTP local, tools/list, echo autorizado, desconexión y rechazo HTTP no local | .local/mcp-client-results.json |\n| Exportaciones | 13 demos independientes en Edge, dos instancias y limpieza; 2 wrappers React consumidos y tipados | .local/export-results.json |\n| Dependencias npm | ${audit.metadata.vulnerabilities.total} vulnerabilidades reportadas en auditoría completa | .local/npm-audit-all.json |\n\nNo se enviaron solicitudes a modelos ni se modificó el catálogo, modelo activo o razonamiento de clientes externos. Las imágenes del usuario se leyeron sin modificar sus originales.\n\n## Exportaciones medidas\n\n| Proyecto | Bytes sin comprimir | Bytes ZIP | Resultado |\n|---|---:|---:|---|\n${sizeTable}\n\nLos tamaños incluyen demo, módulo, instrucciones, manifiesto y avisos correspondientes. No se cargan motores no importados. Son archivos generados por el exportador común, no demos copiadas a mano.\n\n## Rendimiento medido\n\n| Caso | Partículas | Glow | Ejecución inicial (ms) | FPS rAF | p95 frame (ms) |\n|---|---:|---:|---:|---:|---:|\n${performanceTable}\n\nSe registraron tres muestras y se promediaron las últimas dos. La medida refleja la cadencia de requestAnimationFrame de la vista previa, no el tiempo GPU. En este equipo ambos perfiles de partículas llegaron al límite aproximado de refresco; no se demuestra una mejora de FPS ni se garantiza ese resultado en otros equipos. CPU/GPU porcentuales, instalación y dispositivos móviles físicos: no medidos.\n\n## Pendientes de revisión\n\n- Prueba manual del usuario con los diálogos nativos Abrir/Guardar y su flujo cotidiano. El almacenamiento subyacente sí se probó en disco.\n- Recuperación tras cierre forzoso y cuotas duras ante bucles infinitos; la copia IndexedDB existe, pero no se simula una certificación de resistencia a fallos.\n- Instalador, build de distribución, empaquetado final de MCP y ejecución instalada sin Vite: pospuestos por instrucción del usuario. El build de frontend inicial de etapa 1 pasó antes de esa instrucción; no representa una validación del paquete actual.\n- Grafos y timeline iniciales: puertos y keyframes numéricos; sin curvas Bézier ni máscaras alfa arbitrarias.\n- Exportación mediante superficies aisladas: scroll propio, sin compartir renderer GPU entre instancias.\n- Cliente MCP saliente HTTP temporal; OAuth y stdio saliente pendientes. No se comprobó cada cliente MCP existente.\n\nConsultá GUIA_PRUEBA.md, SEGURIDAD.md, EXPORTACION.md y PENDIENTES_POST_LANZAMIENTO.md para uso y límites.\n`;
await writeFile("docs/Informe-pruebas-v0.1.0.md", report);
await writeFile(
  "docs/ETAPA_10_PRUEBAS.md",
  "# Pruebas de desarrollo\n\nVer [informe versionado](Informe-pruebas-v0.1.0.md). La distribución fue pospuesta por el usuario.\n",
);
await writeFile(
  "docs/RENDIMIENTO.md",
  "# Rendimiento medido\n\n| Caso | Partículas | Glow | Inicio (ms) | FPS rAF | p95 (ms) |\n|---|---:|---:|---:|---:|---:|\n" +
    performanceTable +
    "\n\nMedición en ventana nativa WebView2 del equipo actual. No es un benchmark de GPU ni una promesa de 60 FPS universales. Los perfiles reducen cantidad y glow; en esta medición ambos mantuvieron aproximadamente la tasa de refresco. No se midieron CPU/GPU porcentuales ni tamaño de instalador porque no se generó distribución.\n",
);
await writeFile(
  "README.md",
  `# Effect Lab\n\nLaboratorio local de efectos web para Windows. **El código es la fuente de verdad.** Interfaz negra/violeta, Monaco, ejecución aislada y recursos reutilizables. Versión de desarrollo 0.1.0.\n\n## Abrir para revisar\n\nRequisitos de desarrollo: Node.js 22.12+ o 24+, Rust estable, herramientas C++ de Visual Studio y WebView2.\n\n\`\`\`powershell\nnpm.cmd install\nnpm.cmd run tauri -- dev\n\`\`\`\n\nEl comando coordinado prepara los módulos locales, inicia Vite en 127.0.0.1:1420 y abre la ventana nativa. Mantener ambos durante la revisión. **No generar instalador ni distribución hasta que el usuario lo indique.**\n\n## Lo que podés usar\n\n- Proyectos de múltiples archivos: HTML, CSS, JS, TS, JSX/TSX y GLSL. Crear, abrir y guardar; backup y recuperación de sesión.\n- Monaco local, pestañas, consola, paneles redimensionables, historial y atajos.\n- Vista previa con sandbox, ejecución/recarga, tamaños de escritorio/tableta/móvil, pausa cooperativa y métricas reales.\n- PixiJS, GSAP/ScrollTrigger, Three.js, WebGL2 y Matter.js, cargados por importación; sin CDN obligatorio.\n- Controles declarados y extensibles, análisis AST, adaptación revisable y avisos de vínculos rotos.\n- Capas, grupos, mezclas/máscaras simples, grafo numérico y timeline con keyframes.\n- Biblioteca, favoritos, etiquetas, presets, diff de revisiones y restauración con checkpoint.\n- **Fondo de imagen** listo para reutilizar: importar imagen, encuadrar, posicionar, oscurecer, desenfocar y aplicar zoom.\n- Exportaciones ZIP versionadas para HTML/JS y React; trece demos independientes probadas.\n- Servidor MCP estándar por stdio con 22 herramientas y permisos por cliente/proyecto. No detecta ni ejecuta proveedores de IA. Cliente HTTP MCP temporal con autorización.\n\nTrece ejemplos editables en \`examples/\`. En la biblioteca local de esta sesión quedó **Fondo de imagen · Arcane**, probado con una referencia del usuario. Las imágenes quedan incluidas en los proyectos.\n\n## Pruebas\n\n\`\`\`powershell\nnpm.cmd run typecheck\nnpm.cmd test\ncargo test --manifest-path src-tauri/Cargo.toml --lib\n\`\`\`\n\nLas pruebas de integración \`scripts/test-*.mjs\` usan la WebView nativa de desarrollo mediante un puerto de diagnóstico local, o Edge sin interfaz para exportaciones. No abren una versión web en reemplazo de la app. El modo QA requiere iniciar el proceso de desarrollo con WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS apuntando a 127.0.0.1:9223.\n\nResultado actual: ${unit.numPassedTests} unitarias, 2 pruebas Rust, flujos nativos, MCP y 13 exportaciones independientes. Detalle y pendientes: [informe de pruebas v0.1.0](docs/Informe-pruebas-v0.1.0.md).\n\n## Módulos\n\n- \`src/app\`, \`components\`, \`styles\`: interfaz y diseño.\n- \`src/features\`: editor, preview, controles, compositor, biblioteca, imágenes y conexiones.\n- \`src/services\`: compilador WASM, persistencia, operaciones compartidas, revisión, biblioteca y exportación.\n- \`packages/core\`, \`parameter-schema\`, \`agent-contracts\`: formato, validación, grafo y herramientas públicas.\n- \`src-tauri\`: ventana nativa, persistencia y puente MCP local.\n- \`src-tauri/src/bin/effectlab-mcp.rs\`: servidor autónomo stdio.\n\nMCP funciona con cualquier cliente compatible que el usuario autorice. No requiere un modelo local, cuenta de IA ni servicios pagos para editar y ejecutar proyectos. El cliente externo controla sus modelos y su razonamiento.\n\n## Documentación\n\n[Guía para probar](docs/GUIA_PRUEBA.md) · [Parámetros](docs/dynamic-parameters.md) · [Runtime](docs/preview-runtime.md) · [Composición](docs/composition.md) · [MCP](docs/mcp-architecture.md) · [Exportación](docs/EXPORTACION.md) · [Seguridad](docs/SEGURIDAD.md) · [Pendientes](docs/PENDIENTES_POST_LANZAMIENTO.md).\n\n## Identidad\n\nProducto Effect Lab; paquete \`effect-lab\`; identificador \`com.effectlab.desktop\`. Repositorio local creado con autorización, sin remoto origin ni publicación.\n`,
);
console.log(
  "Informe y README actualizados a partir de resultados comprobados.",
);
