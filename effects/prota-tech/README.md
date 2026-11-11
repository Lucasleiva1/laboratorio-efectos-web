# Prota Code · Propuesta 01

Portada con profundidad de imagen, halo azul y microdestellos cobre. El título y los botones permanecen estables. El clic genera un pulso elíptico breve. Proyecto editable: `projects/prota-code/portada-prota-code-v1.1.0.effectlab`; la base v1.0.0 se conserva.

- Imagen: desplazamiento suave mediante transform, con margen de zoom para no descubrir los bordes. Control de profundidad, reducido automáticamente en lienzos pequeños.
- Luz: dos gradientes pequeños que se desplazan mediante transform y opacity; 56 puntos de campo y un pool de 60 microdestellos, un único pulso. Canvas 1×, sin blur, sin conexiones entre todos los puntos.
- El trabajo del efecto se detiene al asentarse la interacción; respeta pausa cooperativa y reducción de movimiento. El runtime del laboratorio conserva sus propios bucles de métricas y composición.
- La entrada del mouse se comparte entre las capas usando el puente existente, con comprobación de ventana emisora, sesión y proyecto; no se interceptan los botones.

Prueba en WebView2, lienzo 1006×527: tres muestras de 60 FPS; tiempo medio de la función de dibujo 0,13 / 0,16 / 0,12 ms. No incluye el coste GPU de composición. Se verificaron mouse real, título inmóvil, clic, pausa, reposo, reducción de movimiento y botón. Evidencia local: `.local/prota-tech-performance.json`.

Referencias técnicas: [transform y opacity para animación](https://web.dev/articles/animations-guide), [prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion).
