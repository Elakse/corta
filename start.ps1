# Corta: one-command start (Windows PowerShell). Installs dependencies when needed, then runs app + API.
#   .\start.ps1             start and open the browser
#   .\start.ps1 -NoBrowser  start without opening the browser
param([switch]$NoBrowser)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js (LTS) is required: https://nodejs.org" -ForegroundColor Red
  exit 1
}

$stamp = "node_modules/.package-lock.json"
if (-not (Test-Path $stamp) -or ((Get-Item package-lock.json).LastWriteTime -gt (Get-Item $stamp).LastWriteTime)) {
  Write-Host "Installing dependencies..." -ForegroundColor Cyan
  npm install
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}

if (-not (Test-Path .env)) { Copy-Item .env.example .env; Write-Host "Created .env from .env.example" -ForegroundColor DarkGray }

$url = "http://localhost:5173"
Write-Host ""
Write-Host "  Corta  ->  $url" -ForegroundColor Magenta
Write-Host "  API    ->  http://localhost:8787   (Ctrl+C stops both)" -ForegroundColor DarkGray
Write-Host ""
if (-not $NoBrowser) { Start-Job -ScriptBlock { param($u) Start-Sleep -Seconds 4; Start-Process $u } -ArgumentList $url | Out-Null }
npm run dev
