# Capas, nodos y tiempo

En **Modo visual**, creá una composición desde el efecto activo. Agregá capas de efecto (archivo de entrada), texto, imagen importada o grupos. Las capas conservan el código original. Podés cambiar visibilidad, bloqueo de interacción, orden, posición, escala, rotación, opacidad, mezclas CSS y máscaras círculo/rectángulo. Las copias de biblioteca se insertan como fuentes independientes para evitar colisiones de archivos.

Las superficies HTML/React/Canvas/WebGL se apilan como iframes aislados. Las mezclas se aplican a la superficie con CSS; no convierten arbitrariamente DOM en una textura de PixiJS. No existe un framebuffer compartido entre motores. Los grupos heredan transformaciones DOM; el modelo rechaza ciclos.

En **Nodos**, conectá salidas numéricas de tiempo, cursor o valor a seno/multiplicación y luego a una salida con destino explícito. El grafo se valida como DAG. No representa automáticamente cada línea de código. `pointer` toma la coordenada horizontal normalizada transmitida desde la superficie interactiva. Desconectar requiere reevaluar/reiniciar la composición para recuperar su valor base.

En **Timeline**, elegí destino, valor y tiempo; agregá keyframes. Hay interpolación lineal, hold y suavizada; duración, loop, play/pausa y scrub. El tiempo enviado con scrub determina el estado visible de los parámetros animados. Prioridad: valores base → grafo → pistas. La simulación interna de partículas/física no se rebobina determinísticamente: el seek controla propiedades expuestas, no reconstruye el historial físico.

La preview y el exportador usan `prepareProject` y el mismo evaluador. Ejemplos editables 09–12 prueban portada, cursor/grafo, timeline y código libre. Limitaciones actuales: keyframes numéricos, superficies aisladas, sin edición Bézier, máscaras alfa arbitrarias ni manipulación WYSIWYG de React.
