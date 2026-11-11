# Effect Lab v0.2.1 · Instalación y actualizaciones

Primera distribución instalable de Effect Lab para Windows x64. NSIS instala para el usuario actual e incluye el desinstalador que registra Windows en Aplicaciones instaladas. El identificador `com.effectlab.desktop` y la clave de firma del actualizador se conservan entre versiones.

## Instalar y actualizar

1. Instalar `Effect-Lab-v0.2.1-windows-x64-setup.exe` una vez.
2. Abrir Configuración → Actualizaciones → Buscar actualizaciones.
3. Cuando se publique una versión posterior, guardar el proyecto y elegir Instalar y reiniciar. La aplicación verifica la firma, descarga el instalador y reemplaza la versión existente; no es necesario desinstalarla manualmente.

Desinstalar Effect Lab se hace desde Aplicaciones instaladas de Windows. Instalar o actualizar la herramienta no modifica el código de las páginas web del usuario.

## Assets

- `Effect-Lab-v0.2.1-windows-x64-setup.exe`
- `Effect-Lab-v0.2.1-windows-x64-setup.exe.sig`
- `latest-v0.2.1.json` y el alias técnico `latest.json`

El endpoint utilizado por la aplicación es `https://github.com/Lucasleiva1/laboratorio-efectos-web/releases/latest/download/latest.json`.

La firma del actualizador se genera localmente. La clave privada y su contraseña permanecen en `%APPDATA%\Effect Lab\updater\` y no se publican. Los assets conservan un nombre con versión; una versión futura no debe sobrescribirlos.

## Proyectos

El Release de preparación v0.2.0 conserva la portada y su imagen como assets separados. El proyecto aprobado está en `projects/prota-code/portada-prota-code-v3.2.0.effectlab`. Se abre mediante Abrir en Effect Lab.

La selección de proyectos como assets reutilizables dentro de la interfaz sigue pendiente para una etapa posterior.

## Publicar versiones posteriores

Aumentar coherentemente la versión en los metadatos de Node y Tauri/Cargo, confirmar los cambios, crear y subir una etiqueta `vX.Y.Z` que coincida con el commit y preparar un Release borrador para esa etiqueta. Luego ejecutar el script `scripts/release-windows.ps1 -Build` y, tras revisar el resultado, `scripts/release-windows.ps1 -Publish`.

El script genera el instalador con la clave local y verifica identidad, versión y coincidencia de la etiqueta antes de publicar. No hay compilación automática por cada push.
