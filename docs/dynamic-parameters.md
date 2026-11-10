# Parámetros reales

Un proyecto puede funcionar sin controles. Para exponerlos, llamá a `window.lab.register(schema, callback)` desde el código que se ejecuta en el visor. `schema` es una lista de parámetros con `id`, `binding`, `label`, `widget`, `value`, `defaultValue`, y opcionalmente `min`, `max`, `step`, `options`, `group`.

```js
const settings = { speed: 1 };
window.lab.register(
  [
    {
      id: "speed",
      binding: "speed",
      label: "Velocidad",
      widget: "knob",
      value: 1,
      defaultValue: 1,
      min: 0,
      max: 5,
      step: 0.1,
    },
  ],
  (values) => {
    settings.speed = values.speed;
  },
);
// El loop debe consultar settings.speed para que el control tenga efecto.
```

`lab.onChange(callback)` suscribe valores (y devuelve una función de baja). `lab.params` permite leerlos. `lab.onDispose(callback)` registra liberación; `lab.paused` expresa pausa cooperativa. Destruir el iframe interrumpe el runtime. En React, usá `onChange` dentro de un `useEffect` y actualizá estado; no alteres el DOM de React desde afuera.

El inspector permite cambiar widget, etiqueta, rango y grupo; crear una segunda vista de un parámetro registrado; ocultar, ordenar, eliminar y restablecer. Los valores y widgets propios se conservan tras registrar nuevamente el efecto. Los enlaces ausentes se marcan como rotos y no se borran silenciosamente.

**Analizar código** usa AST, sin ejecutar expresiones. Solo sugiere literales de objetos de configuración a nivel superior. Muestra un adaptador antes de modificar código; verifica que el archivo no cambió desde el análisis. Que una propiedad sea detectable no demuestra que el efecto consulte su valor durante la animación: esa conexión debe probarse.

Los widgets extensibles se registran en `controlRenderers`. Las perillas actuales ofrecen un slider y entrada numérica precisa; aún no hay edición gráfica de curvas ni widgets personalizados con código privilegiado.
