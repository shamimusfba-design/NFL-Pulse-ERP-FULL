$ErrorActionPreference = "Stop"
Copy-Item ".env" "apps/api/.env" -Force
$envLine = Get-Content ".env" | Where-Object { $_ -match '^NEXT_PUBLIC_API_URL=' }
if ($envLine) { Set-Content "apps/web/.env.local" $envLine }
docker compose --env-file .env up -d
npm run dev
