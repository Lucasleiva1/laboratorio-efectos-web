# Estela verde de partículas

Código real en `main.js`. El recurso editable completo está en `examples/15-neon-particle-trail/15-neon-particle-trail-v0.1.0.effectlab`; se regenera con `node scripts/create-particle-trail-example.mjs`.

- Mover el cursor deja partículas diminutas; el clic emite una onda expansiva de puntos y desplaza las partículas próximas.
- Glow dentro de las partículas, sin filtros de desenfoque ni malla de conexiones.
- Pool fijo de 240 partículas como máximo y tres ondas de 40 puntos: hasta 360 puntos. Dos pasadas de relleno, resolución 1×; la animación duerme cuando no quedan partículas u ondas.
- Retícula de fondo independiente, estática y tenue. Los controles de tamaño, duración, dispersión, luminosidad y onda pertenecen al elemento de partículas.

Medición de desarrollo en Windows/WebView2, lienzo 1006×527, movimiento del cursor y dos ondas activas: 60 FPS en tres muestras; coste medio de dibujo de 0,85 / 0,49 / 0,43 ms. Son mediciones de este equipo; no equivalen a tiempo GPU ni certifican todos los dispositivos. Evidencia local: `.local/tiny-particles-performance.json`.
