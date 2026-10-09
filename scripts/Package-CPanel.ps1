# Respaldo manual: empaqueta dist/ en un ZIP para subirlo por el Administrador de archivos de cPanel.
# Uso: npm run build; luego .\scripts\Package-CPanel.ps1
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
$dist = Join-Path $raiz 'dist'
if (-not (Test-Path (Join-Path $dist 'index.html'))) { throw 'No existe dist/index.html. Corre npm run build primero.' }

$entregas = Join-Path $raiz 'entregas'
New-Item -ItemType Directory -Force $entregas | Out-Null
$fecha = Get-Date -Format 'yyyy-MM-dd'
$zip = Join-Path $entregas "ayudadev-$fecha.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip -CompressionLevel Optimal
Write-Host "Listo: $zip"
Write-Host 'Súbelo al Document Root del subdominio y extráelo ahí. Recuerda que .htaccess está dentro del zip.'
