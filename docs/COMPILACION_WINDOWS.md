# Desarrollo y distribución Windows

**Decisión vigente del usuario: probar primero; no generar instalador ni build de distribución.**

El comando coordinado de revisión es:

```powershell
npm.cmd install
npm.cmd run tauri -- dev
```

Requiere Node.js 22.12+ o 24+, Rust, herramientas C++ de Visual Studio y WebView2 durante desarrollo. `beforeDevCommand` prepara los módulos locales y abre Vite en `127.0.0.1:1420`; Tauri abre la ventana nativa. Mantener ambos durante la revisión.

Las pruebas de Windows usan el ejecutable de **depuración** generado por `tauri dev` y el servidor MCP de desarrollo. Eso no es un instalador ni una distribución final. La versión instalada aún no fue comprobada; no se afirma que haya superado QA de producción.

Más adelante, solo cuando el usuario lo autorice, la configuración está preparada para NSIS. Antes habrá que repetir identidad del proyecto, versiones, recursos WASM, módulos vendor y empaquetado del ejecutable MCP. Su ubicación deberá copiarse a la instalación y verificarse sin herramientas de desarrollo. No se configuraron autoactualizaciones, releases, firma digital ni servicios externos.

La firma de código y el comportamiento de SmartScreen quedan para la revisión de distribución. No se requiere comprar un certificado para seguir probando localmente.
