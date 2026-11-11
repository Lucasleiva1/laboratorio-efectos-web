# Effect Lab v0.2.0 · Preparación para instalación

Esta versión incorpora el actualizador firmado de Tauri, disponible en Configuración → Actualizaciones en la aplicación instalada. La búsqueda y la instalación se solicitan con botones; la descarga muestra progreso y se verifica con la clave pública incluida. Se requiere guardar el proyecto antes de instalar y reiniciar.

El Release se prepara como **borrador**, sin instalador, firma ni `latest.json` hasta que se autorice la compilación. Los assets iniciales son el código fuente versionado, estas notas y sus hashes. No constituyen una actualización instalable. No hay workflows que compilen al subir código o etiquetas.

## Cuando se autorice compilar

Desde la raíz del repositorio, en PowerShell:

```powershell
# Compilar el instalador firmado y preparar los assets locales:
powershell -ExecutionPolicy Bypass -File scripts/release-windows.ps1 -Build

# Publicar después el borrador con los assets ya generados:
powershell -ExecutionPolicy Bypass -File scripts/release-windows.ps1 -Publish
```

La clave privada y su contraseña se encuentran en `%APPDATA%\Effect Lab\updater\`, fuera del repositorio. No se adjuntan al Release ni al código fuente. Conservarlas para firmar las siguientes versiones.

La compilación debe producir estos assets, todos de la misma versión:

- `Effect-Lab-v0.2.0-windows-x64-setup.exe`
- `Effect-Lab-v0.2.0-windows-x64-setup.exe.sig`
- `latest-v0.2.0.json` y el alias técnico `latest.json`

El primer instalador se instalará manualmente. A partir de esa instalación, futuras versiones firmadas podrán descargarse desde la aplicación. El endpoint configurado es `https://github.com/Lucasleiva1/laboratorio-efectos-web/releases/latest/download/latest.json`; no se publica un manifiesto con URLs o firmas inventadas.

## Efecto aprobado

La portada, su imagen y los proyectos de Prota Code están incluidos como material reutilizable en el repositorio y como assets adicionales del Release, con autorización expresa del propietario. El proyecto aprobado es `projects/prota-code/portada-prota-code-v3.2.0.effectlab`. Instalar Effect Lab no modifica la tienda.

## Validación y límites

Se ejecutan TypeScript y pruebas de JavaScript sin compilar el producto. La integración Rust, el instalador y la instalación real se validarán durante la compilación autorizada. El watcher de desarrollo recompiló automáticamente el ejecutable de depuración al cambiar la configuración nativa; no se generó un instalador de distribución. El panel indica que la instalación de actualizaciones está disponible en la versión instalada.

La biblioteca local tiene un límite de 32 MB. Los proyectos versionados del repositorio se conservan aunque la biblioteca esté llena.

Referencia: [actualizador oficial de Tauri 2](https://v2.tauri.app/plugin/updater/).
