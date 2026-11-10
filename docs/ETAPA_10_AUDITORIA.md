# Auditoría de desarrollo · v0.1.0

Fecha: 10 de noviembre de 2026. Producto: Effect Lab. Raíz verificada: `D:\PAGINAS WEB Y APP\laboratorio-efectos-web`. Git local sin origin. Identificador: `com.effectlab.desktop`.

La sesión partió de un repositorio nuevo autorizado. Se implementaron los módulos del laboratorio y luego se verificaron flujos reales en Windows/WebView2. La distribución queda pospuesta por instrucción del usuario; esta auditoría no aprueba un instalador.

## Reparaciones verificadas

| Hallazgo reproducido | Corrección | Comprobación |
| --- | --- | --- |
| El contenido de un iframe podía recibir la infraestructura IPC de WebView2 | Transporte privilegiado instalado solo en la ventana principal | La preview recibe un rechazo al intentar invocar una operación nativa |
| Cambiar de proyecto podía conservar el destino de guardado anterior | Asociar autorización de ruta con el ID de proyecto | Validación del estado y pruebas del backend de persistencia |
| Stores duplicados durante recargas de módulos de desarrollo | Una instancia compartida por servicio en DEV | Cambios MCP y biblioteca se reflejan en la interfaz |
| Un canvas físico iniciado sin dimensiones correctas | Inicialización después del primer frame y ajuste de límites al redimensionar | Matter.js funciona también con preview de 375 px |
| Wrapper React y módulo JS podían colisionar en Windows por sus nombres | Componente `EffectComponent-v0.1.0.tsx` y módulo `effect-v0.1.0.js` | Dos exportaciones React tipadas y consumidas en una aplicación independiente |
| La actualización de Monaco cambió el mapa de exportaciones | Importar workers mediante las rutas públicas con extensión | Editor, pegado real, análisis AST y reparación de sintaxis pasan en la WebView nativa |
| Vite recargaba toda la aplicación al descubrir React Flow por primera vez | Preparar desde el arranque las dependencias del compositor y editor | Regresión del compositor tras reiniciar Vite |
| Una miniatura grande desbordaba su espacio y tapaba las acciones de biblioteca | Imagen posicionada dentro del contenedor con recorte | Apertura real del fondo Arcane mediante el botón de la tarjeta |
| Avisos de vulnerabilidades npm | Actualizaciones y override de DOMPurify; comprobar compatibilidad | Auditoría npm completa: 0 reportadas; no se ejecutó auditoría Cargo |

## Estado real

Editor, preview aislada, controles, imágenes, biblioteca, historial, compositor, MCP y exportador tienen pruebas de comportamiento. Las 13 exportaciones funcionan fuera del laboratorio. El informe de resultados conserva comandos y evidencia: [Informe v0.1.0](Informe-pruebas-v0.1.0.md).

No hay ejecución ni detección de proveedores de IA. El servidor MCP acepta clientes compatibles autorizados. El cliente MCP saliente actual usa HTTP temporal; OAuth y stdio saliente no están implementados.

## Pendientes de revisión

- Prioridad alta antes de distribución: empaquetado del servidor MCP, runtime sin Vite e instalación en Windows. No ejecutados por instrucción del usuario.
- Revisión manual inmediata: diálogos nativos Abrir/Guardar y uso cotidiano con imágenes propias. Persistencia atómica y biblioteca sí se probaron en disco.
- Robustez por ampliar: recuperación tras cierre forzado y cuota dura frente a código con bucles infinitos.
- Límites funcionales: grafo y timeline numéricos, biblioteca JSON de hasta 32 MB, primeras 100 coincidencias visibles y pausa cooperativa.

Los originales de las referencias del usuario no se modificaron. El fondo Arcane está incluido en su biblioteca privada y no en los ejemplos distribuidos del repositorio.
