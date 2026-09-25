#Requires -Version 5.0
<#
.SYNOPSIS
  Elimina los archivos "puente" (compatibilidad) que quedaron de la migración a la
  arquitectura por capas de Informe PT, ahora que nada en el código los usa.

.DESCRIPTION
  Ver docs/ARCHITECTURE.md (S8) y CHANGELOG.md para el contexto completo: estos archivos
  re-exportaban desde su nueva ubicacion en src/models, src/controllers, src/services y
  src/views, y no hacia falta mantenerlos. Este script los borra si todavia existen en tu
  copia local. Es seguro correrlo mas de una vez: si un archivo ya no existe, simplemente lo
  reporta como "ya no existe" y sigue con el siguiente, sin fallar.

.NOTES
  Correr desde la raiz del proyecto (donde esta package.json), por ejemplo:
    ./cleanup-legacy-shims.ps1
  o con clic derecho -> "Ejecutar con PowerShell".
#>

$ErrorActionPreference = 'Stop'

$repoRoot = $PSScriptRoot
if (-not (Test-Path (Join-Path $repoRoot 'package.json'))) {
    Write-Warning "No se encontro package.json junto a este script ($repoRoot). Verifica que este en la raiz del proyecto Informe PT antes de continuar."
}

$legacyPaths = @(
    'src\store.js',
    'src\config.js',
    'src\firebase.js',
    'src\gdrive.js',
    'src\htmlGenerator.js',
    'src\pdfGenerator.js',
    'src\multiExcelParser.js',
    'src\logos.js',
    'src\style.css',
    'src\driveAuth.js',
    'src\excelParser.js',
    'src\components',
    'src\utils\notify.js'
)

Write-Host "Limpiando archivos puente de la migracion en: $repoRoot" -ForegroundColor Cyan
Write-Host ""

$deleted = 0
$skipped = 0

foreach ($rel in $legacyPaths) {
    $full = Join-Path $repoRoot $rel
    if (Test-Path $full) {
        try {
            Remove-Item -LiteralPath $full -Recurse -Force
            Write-Host "  Borrado : $rel" -ForegroundColor Green
            $deleted++
        } catch {
            Write-Host "  ERROR al borrar $rel : $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "  (ya no existe) $rel" -ForegroundColor DarkGray
        $skipped++
    }
}

Write-Host ""
Write-Host "Listo: $deleted archivo(s)/carpeta(s) borrados, $skipped ya no existian." -ForegroundColor Cyan
Write-Host "Corre 'npm run build' y 'npm run lint' para confirmar que todo sigue funcionando." -ForegroundColor Cyan
