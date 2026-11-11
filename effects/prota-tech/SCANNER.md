# Propuesta 02 · Escáner interactivo

Proyecto: `projects/prota-code/portada-prota-code-v1.2.0.effectlab`. Se conserva la propuesta anterior.

Lente azul que revela pistas de circuitos al mover el mouse, partículas diminutas con estela breve y doble pulso azul/cobre al hacer clic. El fondo conserva su profundidad y el contenido permanece fijo. Radio, colores e intensidades están en la capa plegable del escáner.

Presupuesto: 100 partículas como máximo, circuito local con separación fija de 28 px y radio máximo 210 px. Cuatro grupos de trazos, canvas a resolución 1×, sin filtros ni blur por objeto. La animación queda en reposo cuando el mouse se detiene y desaparece al salir. Respeta pausa y reducción de movimiento.

Prueba nativa con mouse real en WebView2, lienzo 1006×527: 60,1 / 60,0 / 59,0 FPS; coste medio del dibujo 0,29 / 0,31 / 0,30 ms (no incluye composición GPU). Se verificaron imagen móvil, título fijo, clic, pausa, reposo, reducción de movimiento y botón. Evidencia local: `.local/prota-scanner-performance.json`.
