# Probá Effect Lab

La aplicación se revisa en su ventana nativa de Windows, en modo desarrollo. No se preparó un instalador ni un build de distribución: el usuario pidió probar primero.

## Una imagen y elementos para componer

1. En el Explorador, presioná **Importar imagen**. Elegí un archivo local o **Usar la imagen de prueba**. Se coloca directamente en el lienzo; no hay que elegir un modo de inserción.
2. En el inspector, desplegá su único cuadro para ajustar Encuadre, Posición, Oscurecimiento, Desenfoque y Zoom. La posición ajusta el recorte o el espacio libre del encuadre.
3. Debajo del botón de imagen, agregá **Partículas**, **Glow**, **Texto** o **Forma**. Se suman a lo existente y cada uno tiene sus propias opciones plegables.
4. Arriba en la lista significa delante; abajo significa al fondo. Arrastrá desde el nombre o el asa: una línea muestra el destino y el nombre acompaña al puntero. Durante el arrastre las opciones se compactan temporalmente y se restauran al soltar. También podés usar las flechas. Los elementos nuevos aparecen arriba.
5. La papelera de cada cuadro elimina ese elemento. Si eliminás todos, queda el lienzo vacío. **Deshacer** permite recuperarlos.
6. Usá **Guardar** para conservar el proyecto o Biblioteca para guardarlo como recurso reutilizable.

PNG/JPEG/WebP/SVG/GIF/AVIF/BMP se abren según el soporte del WebView2 instalado, hasta 16 MB por imagen. Si el archivo no se puede decodificar, el error aparece en el diálogo. Una imagen opaca situada arriba puede tapar los elementos de abajo.

**Consola** y **Código** se abren desde abajo y se apilan debajo del efecto. Ambos permanecen ocultos al iniciar.

Ya se probó una imagen de las referencias del usuario y se guardó como **Fondo de imagen · Arcane**. Su imagen está incluida en el recurso; no depende de que siga existiendo la carpeta de origen.

## Código y efectos

Elegí un punto de partida, presioná **Ejecutar**, modificá archivos en Monaco y volvé a ejecutar. La ejecución se mantiene hasta pulsar **Detener** o cambiar de proyecto. **Auto** recarga el código editado después de una pausa de escritura únicamente mientras la vista previa está activa. **Detener** cancela también las recargas pendientes: editar o activar Auto no inicia por sí solo una vista previa detenida. `Ctrl+Enter` ejecuta; `Ctrl+S` guarda. Los errores aparecen en la consola sin borrar el código.

Los trece ejemplos son documentos `.effectlab` editables: halo, React interactivo, PixiJS + GSAP, Three.js, parallax, imagen distorsionada, GLSL, Matter.js, cuatro composiciones y fondo de imagen.

**Analizar código** sugiere propiedades de objetos config/settings. Para exponerlas, revisá y aceptá el adaptador. Los controles solo cambian el efecto si su código consulta esas propiedades.

## Guardar y recuperar

Al abrir la aplicación ya hay un proyecto nuevo, con un nombre como `Proyecto-A7F3C9D2`. El nombre está arriba y se edita directamente; cambiarlo no guarda un archivo automáticamente. Los puntos de partida conservan ese nombre de proyecto y muestran el nombre del efecto en el inspector.

**Guardar** muestra **Guardando…** y confirma **Guardado** con la hora en la barra inferior. **Guardar como…** propone el nombre del proyecto en la carpeta del archivo actual; podés elegir otro archivo o reemplazar uno existente. Después, Guardar actualiza el archivo elegido. Cancelar y los errores se informan sin dar el proyecto por guardado. Los cambios hechos mientras termina una escritura quedan pendientes para el siguiente guardado.

**Guardar** y **Abrir** usan diálogos de Windows. Los proyectos incluyen código, assets, parámetros y composición. Cambiar de proyecto no reutiliza silenciosamente el destino de guardado del anterior. El backend escribe mediante un temporal y conserva una copia previa.

La recuperación automática usa IndexedDB del perfil local de la aplicación. Al reabrir aparece **Recuperar sesión** si hay una copia. No reemplaza los proyectos guardados en archivos. Las revisiones explícitas de Biblioteca conservan snapshots con hash y permiten comparar/restaurar.

## MCP con cualquier aplicación compatible

Abrí **MCP**, habilitá el servidor local y copiá la configuración para tu cliente. La aplicación cliente solicita autorización al primer acceso a cada proyecto. Las escrituras llegan con diff para aceptar o rechazar y se pueden deshacer. **Permisos** permite revocar clientes. No se requiere detectar ni instalar un proveedor de IA en Effect Lab.

## Exportar

**Exportar → formato → Preparar y medir → Guardar ZIP**. El paquete contiene una demo independiente, módulo JS con `mountEffect / update / destroy`, manifiesto e instrucciones. El formato React agrega componente y tipos. Los archivos de salida incluyen `v0.1.0` en el nombre.

Los diálogos nativos de Abrir/Guardar y la prueba de uso cotidiana por el usuario son la siguiente revisión manual. Las pruebas de persistencia en disco, biblioteca, ejecución y exportación están documentadas por separado.
