$paths = @(
  "assets/css/pages/detalhe-anuncio"
)

foreach ($path in $paths) {
  if (Test-Path $path) {
    Remove-Item $path -Recurse -Force
    Write-Host "Removido: $path"
  }
}

Write-Host "CSS modular antigo removido. Agora extraia/aplique os três arquivos zerados do pacote."
