# Effect Lab

Laboratorio local de efectos web para Windows. **El código es la fuente de verdad.** Interfaz negra/violeta, Monaco, ejecución aislada y recursos reutilizables. Versión de desarrollo 0.1.0.

## Abrir para revisar

Requisitos de desarrollo: Node.js 22.12+ o 24+, Rust estable, herramientas C++ de Visual Studio y WebView2.

```powershell
npm.cmd install
npm.cmd run tauri -- dev
```

El comando coordinado prepara los módulos locales, inicia Vite en 127.0.0.1:1420 y abre la ventana nativa. Mantener ambos durante la revisión. **No generar instalador ni distribución hasta que el usuario lo indique.**

## Lo que podés usar

- Proyectos de múltiples archivos: HTML, CSS, JS, TS, JSX/TSX y GLSL. Crear, abrir y guardar; backup y recuperación de sesión.
- Monaco local, pestañas, consola, paneles redimensionables, historial y atajos.
- Vista previa con sandbox, ejecución/recarga, tamaños de escritorio/tableta/móvil, pausa cooperativa y métricas reales.
- PixiJS, GSAP/ScrollTrigger, Three.js, WebGL2 y Matter.js, cargados por importación; sin CDN obligatorio.
- Controles declarados y extensibles, análisis AST, adaptación revisable y avisos de vínculos rotos.
- Capas, grupos, mezclas/máscaras simples, grafo numérico y timeline con keyframes.
- Biblioteca, favoritos, etiquetas, presets, diff de revisiones y restauración con checkpoint.
- **Fondo de imagen** listo para reutilizar: importar imagen, encuadrar, posicionar, oscurecer, desenfocar y aplicar zoom.
- Exportaciones ZIP versionadas para HTML/JS y React; trece demos independientes probadas.
- Servidor MCP estándar por stdio con 22 herramientas y permisos por cliente/proyecto. No detecta ni ejecuta proveedores de IA. Cliente HTTP MCP temporal con autorización.

Trece ejemplos editables en `examples/`. En la biblioteca local de esta sesión quedó **Fondo de imagen · Arcane**, probado con una referencia del usuario. Las imágenes quedan incluidas en los proyectos.

## Pruebas

```powershell
npm.cmd run typecheck
npm.cmd test
cargo test --manifest-path src-tauri/Cargo.toml --lib
```

Las pruebas de integración `scripts/test-*.mjs` usan la WebView nativa de desarrollo mediante un puerto de diagnóstico local, o Edge sin interfaz para exportaciones. No abren una versión web en reemplazo de la app. El modo QA requiere iniciar el proceso de desarrollo con WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS apuntando a 127.0.0.1:9223.

Resultado actual: 18 unitarias, 2 pruebas Rust, flujos nativos, MCP y 13 exportaciones independientes. Detalle y pendientes: [informe de pruebas v0.1.0](docs/Informe-pruebas-v0.1.0.md).

## Módulos

- `src/app`, `components`, `styles`: interfaz y diseño.
- `src/features`: editor, preview, controles, compositor, biblioteca, imágenes y conexiones.
- `src/services`: compilador WASM, persistencia, operaciones compartidas, revisión, biblioteca y exportación.
- `packages/core`, `parameter-schema`, `agent-contracts`: formato, validación, grafo y herramientas públicas.
- `src-tauri`: ventana nativa, persistencia y puente MCP local.
- `src-tauri/src/bin/effectlab-mcp.rs`: servidor autónomo stdio.

MCP funciona con cualquier cliente compatible que el usuario autorice. No requiere un modelo local, cuenta de IA ni servicios pagos para editar y ejecutar proyectos. El cliente externo controla sus modelos y su razonamiento.

## Documentación

[Guía para probar](docs/GUIA_PRUEBA.md) · [Parámetros](docs/dynamic-parameters.md) · [Runtime](docs/preview-runtime.md) · [Composición](docs/composition.md) · [MCP](docs/mcp-architecture.md) · [Exportación](docs/EXPORTACION.md) · [Seguridad](docs/SEGURIDAD.md) · [Pendientes](docs/PENDIENTES_POST_LANZAMIENTO.md).

## Identidad

Producto Effect Lab; paquete `effect-lab`; identificador `com.effectlab.desktop`. Repositorio: [Lucasleiva1/laboratorio-efectos-web](https://github.com/Lucasleiva1/laboratorio-efectos-web). Primera versión de desarrollo: `v0.1.0`, con pendientes documentados y sin instalador.
