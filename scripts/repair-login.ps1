$ErrorActionPreference = "Stop"
Write-Host "NFL Pulse ERP admin/login repair" -ForegroundColor Cyan
Copy-Item ".env" "apps/api/.env" -Force
& npm.cmd run db:seed
if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
Write-Host "Admin reset/seed complete: admin@nfl.local / ChangeMe123!" -ForegroundColor Green
