$ErrorActionPreference = "Stop"
Write-Host "NFL Pulse ERP v0.4.2 office-ready setup" -ForegroundColor Cyan

$projectRoot = (Get-Location).Path
if (!(Test-Path (Join-Path $projectRoot "package.json"))) {
  throw "Run this script from the NFL Pulse ERP project root (the folder containing package.json)."
}

if (!(Test-Path ".env")) { Copy-Item ".env.example" ".env" }
Copy-Item ".env" "apps/api/.env" -Force
$envLine = Get-Content ".env" | Where-Object { $_ -match '^NEXT_PUBLIC_API_URL=' }
if ($envLine) { Set-Content "apps/web/.env.local" $envLine }

function Resolve-DockerExe {
  $cmd = Get-Command docker -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $candidates = @(
    "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker.exe",
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker.exe"
  )
  foreach ($candidate in $candidates) { if (Test-Path $candidate) { return $candidate } }
  throw "docker.exe was not found. Start/reinstall Docker Desktop, then rerun setup."
}

$dockerExe = Resolve-DockerExe
$dockerBin = Split-Path $dockerExe -Parent
if ($env:Path -notlike "*$dockerBin*") { $env:Path += ";$dockerBin" }
$pluginCandidates = @(
  (Join-Path (Split-Path $dockerBin -Parent) "cli-plugins"),
  "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\cli-plugins",
  "$env:ProgramFiles\Docker\Docker\resources\cli-plugins"
)
$pluginDir = $pluginCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($pluginDir) { $env:DOCKER_CLI_PLUGIN_EXTRA_DIRS = $pluginDir }

Write-Host "Starting PostgreSQL + Redis..." -ForegroundColor Yellow
$composeOk = $false
try {
  & $dockerExe compose version *> $null
  if ($LASTEXITCODE -eq 0) {
    & $dockerExe compose --env-file .env up -d
    if ($LASTEXITCODE -ne 0) { throw "docker compose failed" }
    $composeOk = $true
  }
} catch { }
if (-not $composeOk) {
  $legacyCandidates = @(
    (Join-Path $dockerBin "docker-compose.exe"),
    "$env:LOCALAPPDATA\Programs\DockerDesktop\resources\bin\docker-compose.exe",
    "$env:ProgramFiles\Docker\Docker\resources\bin\docker-compose.exe"
  )
  $composeExe = $legacyCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $composeExe) { throw "Docker Compose was not found." }
  & $composeExe --env-file .env up -d
  if ($LASTEXITCODE -ne 0) { throw "docker-compose failed" }
}

Write-Host "Waiting for PostgreSQL..." -ForegroundColor Yellow
$ready = $false
for ($i=0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 2
  $state = & $dockerExe inspect -f '{{.State.Health.Status}}' nfl-pulse-postgres 2>$null
  if ($state -eq 'healthy') { $ready = $true; break }
}
if (-not $ready) { throw "PostgreSQL did not become healthy. Check Docker Desktop and the nfl-pulse-postgres container." }

Write-Host "Installing npm packages..." -ForegroundColor Yellow
& npm.cmd install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

Write-Host "Generating Prisma client..." -ForegroundColor Yellow
& npm.cmd run db:generate
if ($LASTEXITCODE -ne 0) { throw "Prisma generate failed. Close any other NFL Pulse dev terminals and rerun setup." }

Write-Host "Applying database migration..." -ForegroundColor Yellow
& npm.cmd run db:migrate -- --name init
if ($LASTEXITCODE -ne 0) { throw "Database migration failed" }

Write-Host "Seeding users and master data..." -ForegroundColor Yellow
& npm.cmd run db:seed
if ($LASTEXITCODE -ne 0) { throw "Database seed failed" }

Write-Host "" 
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Admin login: admin@nfl.local / ChangeMe123!" -ForegroundColor Green
Write-Host "Run: npm.cmd run dev" -ForegroundColor Green
