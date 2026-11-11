# Portada reconstruida con partículas

Proyecto: `projects/prota-code/portada-prota-code-v2.0.0.effectlab`.

La imagen original se conserva como capa oculta. La capa visible dibuja únicamente puntos WebGL 2, con el color y el encuadre de la imagen; no dibuja una fotografía por debajo. En reposo los puntos cubren el lienzo. El movimiento del mouse dispersa los puntos próximos; después vuelven a su posición incluso si el cursor permanece dentro. El texto y el sombreado son capas independientes.

Una llamada de dibujo, geometría estática y desplazamiento en vertex shader. Tamaño predeterminado 2 px, separación adaptada para limitar la cantidad a aproximadamente 180 000 puntos. Hasta ocho muestras recientes del cursor; el bucle se detiene al terminar el retorno. Sin partículas DOM, mallas de conexiones ni filtros blur. El contexto usa un buffer persistente para conservar la imagen al detener el bucle.

Prueba en WebView2: 138 600 puntos, tres muestras de 60 FPS. Se comprobaron 54 923 píxeles cambiados durante la dispersión y cero diferencias respecto al estado inicial después del retorno con el cursor quieto. Tiempo de envío de comandos 0,06–0,08 ms; esto no mide tiempo GPU. Evidencia: `.local/image-particles-proof.json`.

Referencia de implementación: [puntos y gl_PointSize en WebGL](https://webglfundamentals.org/webgl/lessons/webgl-smallest-programs.html).
