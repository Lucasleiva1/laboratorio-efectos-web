# Rendimiento medido

| Caso                | Partículas | Glow | Inicio (ms) | FPS rAF | p95 (ms) |
| ------------------- | ---------: | ---: | ----------: | ------: | -------: |
| simple              |          — |    — |        1159 |    60.0 |     16.8 |
| partículas original |       3000 |    8 |        2434 |    60.0 |     16.8 |
| partículas ligera   |        900 |  2.4 |        1929 |    60.0 |     16.8 |

Medición en ventana nativa WebView2 del equipo actual. No es un benchmark de GPU ni una promesa de 60 FPS universales. Los perfiles reducen cantidad y glow; en esta medición ambos mantuvieron aproximadamente la tasa de refresco. No se midieron CPU/GPU porcentuales ni tamaño de instalador porque no se generó distribución.
