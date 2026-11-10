# Ejecución aislada

Se usa esbuild/WASM empaquetado localmente: no se ejecutan plugins, configuración ni scripts npm de los proyectos. El mismo compilador prepara vista previa y exportaciones. HTML, CSS, JS, TS, JSX, TSX y módulos relativos se resuelven desde el documento de proyecto. Dependencias explícitas preparadas durante el build, sin CDN. La aplicación instalada no necesita Node para compilar estos proyectos.

El código solo se inserta en un iframe `sandbox="allow-scripts"` sin `allow-same-origin`, formularios, ventanas emergentes ni navegación del padre. CSP del runtime bloquea conexiones externas e IPC. El canal valida ventana emisora, protocolo, proyecto y sesión. No existe un mensaje de runtime que ejecute comandos nativos.

**Windows/WebView2:** la implementación instalada de Wry inyecta scripts de Tauri también en subframes, aun marcados main-frame-only. Por eso Effect Lab usa la API oficial `Builder::invoke_system`: instala el transporte autenticado exclusivamente en `window.top === window`. En subframes la función de transporte arroja un error antes de acceder a IPC. El objeto interno creado por Tauri puede existir; no entrega una clave ni transporte operativo. La prueba nativa invoca deliberadamente `read_library` desde el efecto y comprueba el rechazo.

No se habilita `unsafe-eval`. WASM usa `wasm-unsafe-eval`. PixiJS incorpora su adaptador de CSP `pixi.js/unsafe-eval` (el nombre del módulo no significa habilitar eval). Monaco y las dependencias usan archivos locales.

Límites: aislamiento por origen protege datos y privilegios, pero un bucle infinito puede consumir recursos del proceso de renderizado. No es un límite duro de CPU/GPU. Pausa cooperativa mediante `lab.paused`; detener destruye el iframe. Las referencias de red no se permiten por defecto. No se ejecuta código Node/SSR, imports de disco ni paquetes no preparados.
