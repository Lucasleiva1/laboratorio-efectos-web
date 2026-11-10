# Integrar un efecto en tu web

El exportador utiliza `prepareProject`, igual que el visor. Admite HTML/CSS/JS, TypeScript, React/TSX, shaders y las librerías preparadas localmente. Solo empaqueta los motores importados por el efecto. Incluye licencias/avisos de las dependencias efectivas y un manifiesto.

```html
<div id="mi-efecto" style="height: 600px"></div>
<script type="module">
  import { mountEffect } from "./effect-v0.1.0.js";
  const effect = mountEffect({ target: "#mi-efecto", params: {} });
  // effect.update({ speed: 2 }); // si el efecto expone speed
  // effect.destroy();
</script>
```

Serví los archivos desde un servidor estático; no hace falta Effect Lab, una IA, Node ni Tauri para ejecutar el resultado. Cada paquete incluye `demo-v0.1.0.html` y `README-integracion-v0.1.0.md` con instrucciones de su salida real.

El formato React entrega `EffectComponent-v0.1.0.tsx`, el módulo JS y su declaración `.d.ts`. El consumidor aporta React 18 o superior; las pruebas se ejecutan con la versión instalada. Se comprobaron el typecheck estricto del componente, montaje en una app React independiente y desmontaje. El nombre del componente difiere del módulo para evitar colisiones de mayúsculas en Windows.

Las instancias usan una superficie iframe aislada. No cambian `document.body`, CSS, IDs ni eventos del sitio anfitrión. `destroy` retira la superficie, sus listeners de comunicación y el runtime; los efectos también pueden registrar limpieza propia. Se prueban dos instancias simultáneas y el funcionamiento del botón de la página anfitriona.

## Restricciones

- El scroll ocurre dentro del efecto; esta salida todavía no vincula automáticamente ScrollTrigger al scroll global del sitio.
- No se comparte un renderer GPU entre iframes; cada instancia tiene su runtime. Una página con muchos efectos debe considerar ese costo.
- El host debe permitir la superficie y su política CSP. No se debilita globalmente la CSP del sitio.
- No se transforman backends, Node/SSR ni dependencias no preparadas en aplicaciones estáticas mágicamente.
- Imágenes y shaders importados se incorporan desde las fuentes del proyecto. No se permiten referencias secretas a rutas de Windows o CDNs ocultos.
- Original/Equilibrada/Ligera cambia parámetros expuestos compatibles; no reduce un efecto arbitrario sin consentimiento artístico.

Los tamaños y resultados de las trece pruebas independientes están en el informe versionado. No se verificó una exportación desde una distribución instalada porque el usuario pospuso esa fase.
