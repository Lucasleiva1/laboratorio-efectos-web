param([switch]$Build, [switch]$Publish)
$ErrorActionPreference = 'Stop'
$releaseRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $releaseRoot
$safeGit = @('-c', "safe.directory=$($releaseRoot.Replace('\','/'))")
$product = Get-Content 'package.json' -Raw | ConvertFrom-Json
$config = Get-Content 'src-tauri/tauri.conf.json' -Raw | ConvertFrom-Json
$gitRoot = (& git @safeGit rev-parse --show-toplevel).Trim()
$origin = (& git @safeGit remote get-url origin).Trim()
if ($product.name -ne 'effect-lab' -or $config.productName -ne 'Effect Lab' -or $config.identifier -ne 'com.effectlab.desktop' -or $gitRoot.Replace('/','\') -ne $releaseRoot -or $origin -ne 'https://github.com/Lucasleiva1/laboratorio-efectos-web.git') { throw 'La identidad del proyecto no coincide con Effect Lab.' }
$version = $product.version
if ($config.version -ne $version) { throw 'Versiones de producto diferentes.' }
$tag = "v$version"
$repository = 'Lucasleiva1/laboratorio-efectos-web'
$keyDirectory = Join-Path $env:APPDATA 'Effect Lab\updater'
$keyFile = Join-Path $keyDirectory 'tauri-updater.key'
if ((Get-Content -LiteralPath ($keyFile+'.pub') -Raw).Trim() -ne $config.plugins.updater.pubkey) { throw 'La clave pública no coincide con la configuración.' }
if ($Build) {
    & npm.cmd run typecheck
    if ($LASTEXITCODE) { throw 'TypeScript no pasó.' }
    & npm.cmd test
    if ($LASTEXITCODE) { throw 'Las pruebas no pasaron.' }
    $oldKey = $env:TAURI_SIGNING_PRIVATE_KEY
    $oldPassword = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
    try {
        $env:TAURI_SIGNING_PRIVATE_KEY = (Get-Content -LiteralPath $keyFile -Raw).Trim()
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = (Get-Content -LiteralPath (Join-Path $keyDirectory 'tauri-updater-password.txt') -Raw).Trim([char]0xFEFF).Trim()
        & npm.cmd run tauri -- build --ci --bundles nsis
        if ($LASTEXITCODE) { throw 'Falló la compilación firmada.' }
    } finally {
        $env:TAURI_SIGNING_PRIVATE_KEY = $oldKey
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $oldPassword
    }
}
$sourceExe = Join-Path $releaseRoot "src-tauri\target\release\bundle\nsis\Effect Lab_${version}_x64-setup.exe"
if (!(Test-Path -LiteralPath $sourceExe) -or !(Test-Path -LiteralPath ($sourceExe+'.sig'))) { throw 'No hay instalador firmado de esta versión. Compilá expresamente con -Build.' }
$internalVersion = (Get-Item -LiteralPath $sourceExe).VersionInfo.ProductVersion
if (([version]$internalVersion).ToString(3) -ne $version) { throw "Versión interna incorrecta: $internalVersion" }
$assets = Join-Path $releaseRoot ".local\releases\$version"
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$exeName = "Effect-Lab-v$version-windows-x64-setup.exe"
$exe = Join-Path $assets $exeName
$sig = "$exe.sig"
if (Test-Path -LiteralPath $exe) {
    if ((Get-FileHash -LiteralPath $exe).Hash -ne (Get-FileHash -LiteralPath $sourceExe).Hash) { throw 'Ya existe un instalador diferente con esta versión. Aumentá la versión antes de reemplazarlo.' }
} else { Copy-Item -LiteralPath $sourceExe -Destination $exe }
Copy-Item -LiteralPath ($sourceExe+'.sig') -Destination $sig -Force
$signature = (Get-Content -LiteralPath $sig -Raw).Trim()
if (!$signature) { throw 'Firma vacía.' }
& node scripts/verify-updater.mjs $exe $sig
if ($LASTEXITCODE) { throw 'La verificación criptográfica del instalador falló.' }
$url = "https://github.com/$repository/releases/download/$tag/$exeName"
$entry = [ordered]@{signature=$signature;url=$url}
$manifest = [ordered]@{version=$version;notes="Effect Lab $version";pub_date=(Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ');platforms=[ordered]@{'windows-x86_64-nsis'=$entry;'windows-x86_64'=$entry}}
$json = $manifest | ConvertTo-Json -Depth 8
$latest = Join-Path $assets 'latest.json'
$versioned = Join-Path $assets "latest-v$version.json"
[IO.File]::WriteAllText($latest,$json,[Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText($versioned,$json,[Text.UTF8Encoding]::new($false))
if ($Publish) {
    if ((& git @safeGit status --porcelain)) { throw 'Hay cambios sin confirmar. Publicá el código revisado antes de distribuir el instalador.' }
    $head = (& git @safeGit rev-parse HEAD).Trim()
    $tagCommit = (& git @safeGit rev-list -n 1 $tag).Trim()
    if ($head -ne $tagCommit) { throw 'La etiqueta y el código compilado no coinciden.' }
    & gh release upload $tag --repo $repository $exe $sig $latest $versioned
    if ($LASTEXITCODE) { throw 'No se pudieron adjuntar los assets. No se publicó el borrador.' }
    & gh release edit $tag --repo $repository --draft=false --latest
    if ($LASTEXITCODE) { throw 'No se pudo publicar el Release.' }
    $response = Invoke-WebRequest "https://github.com/$repository/releases/latest/download/latest.json" -UseBasicParsing
    $published = $response.Content | ConvertFrom-Json
    if ($published.version -ne $version -or !$published.platforms.'windows-x86_64-nsis'.signature) { throw 'El endpoint publicado no coincide.' }
}
Write-Output "Assets firmados preparados en $assets"
