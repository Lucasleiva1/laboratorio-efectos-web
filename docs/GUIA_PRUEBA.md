# Probá Effect Lab

La aplicación se revisa en su ventana nativa de Windows, en modo desarrollo. No se preparó un instalador ni un build de distribución: el usuario pidió probar primero.

## Un fondo sin empezar desde cero

1. En el explorador, presioná **Fondo de imagen**.
2. Elegí o arrastrá un PNG, JPG, WebP o SVG.
3. **Abrir como experimento** crea el recurso editable y ejecuta su vista previa.
4. Ajustá Encuadre, Posición, Oscurecimiento, Desenfoque y Zoom en el inspector.
5. Abrí Biblioteca y guardalo para reutilizarlo; también podés insertarlo como una capa independiente.

Ya se probó una imagen de las referencias del usuario y se guardó como **Fondo de imagen · Arcane**. Su imagen está incluida en el recurso; no depende de que siga existiendo la carpeta de origen.

## Código y efectos

Elegí un punto de partida, presioná **Ejecutar**, modificá archivos en Monaco y volvé a ejecutar. La ejecución se mantiene hasta pulsar **Detener** o cambiar de proyecto. **Auto** recarga el código editado después de una pausa de escritura únicamente mientras la vista previa está activa. **Detener** cancela también las recargas pendientes: editar o activar Auto no inicia por sí solo una vista previa detenida. `Ctrl+Enter` ejecuta; `Ctrl+S` guarda. Los errores aparecen en la consola sin borrar el código.

Los trece ejemplos son documentos `.effectlab` editables: halo, React interactivo, PixiJS + GSAP, Three.js, parallax, imagen distorsionada, GLSL, Matter.js, cuatro composiciones y fondo de imagen.

**Analizar código** sugiere propiedades de objetos config/settings. Para exponerlas, revisá y aceptá el adaptador. Los controles solo cambian el efecto si su código consulta esas propiedades.

## Guardar y recuperar

**Guardar** y **Abrir** usan diálogos de Windows. Los proyectos incluyen código, assets, parámetros y composición. Cambiar de proyecto no reutiliza silenciosamente el destino de guardado del anterior. El backend escribe mediante un temporal y conserva una copia previa.

La recuperación automática usa IndexedDB del perfil local de la aplicación. Al reabrir aparece **Recuperar sesión** si hay una copia. No reemplaza los proyectos guardados en archivos. Las revisiones explícitas de Biblioteca conservan snapshots con hash y permiten comparar/restaurar.

## MCP con cualquier aplicación compatible

Abrí **MCP**, habilitá el servidor local y copiá la configuración para tu cliente. La aplicación cliente solicita autorización al primer acceso a cada proyecto. Las escrituras llegan con diff para aceptar o rechazar y se pueden deshacer. **Permisos** permite revocar clientes. No se requiere detectar ni instalar un proveedor de IA en Effect Lab.

## Exportar

**Exportar → formato → Preparar y medir → Guardar ZIP**. El paquete contiene una demo independiente, módulo JS con `mountEffect / update / destroy`, manifiesto e instrucciones. El formato React agrega componente y tipos. Los archivos de salida incluyen `v0.1.0` en el nombre.

Los diálogos nativos de Abrir/Guardar y la prueba de uso cotidiana por el usuario son la siguiente revisión manual. Las pruebas de persistencia en disco, biblioteca, ejecución y exportación están documentadas por separado.
