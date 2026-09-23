# NFL Pulse ERP v0.4.2 — Office-ready cumulative build

This package is cumulative: v0.4.0 full consolidated + v0.4.1 Gantt correction + office-PC setup/seed fixes.

## Key fixes in v0.4.2
- Login screen version label updated to v0.4.2.
- Setup auto-detects Docker Desktop installed under the current user's AppData or Program Files.
- Supports both `docker compose` and `docker-compose.exe`.
- Uses `npm.cmd` on Windows to avoid PowerShell npm.ps1 policy problems.
- Waits for PostgreSQL health before Prisma migration/seed.
- Admin seed resets `admin@nfl.local` password to `ChangeMe123!`.
- NFL sewing line display names: Sewing-1 A–H, Sewing-2 J–R, Sewing-3 S–ZA.
- NCL sewing lines remain Line 1–22.
- NFL seeded line machine allocation is left at 0/configuration-required rather than inventing line-wise machine counts.

## Fresh/repair setup
From the project root in PowerShell:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup.ps1
```

Then:

```powershell
npm.cmd run dev
```

Admin: `admin@nfl.local` / `ChangeMe123!`

If only login/password needs repair after database is running:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\repair-login.ps1
```

## Demo data
After admin login, use the existing Load / Reset 50 Demo Jobs control. Demo jobs use reserved 990001–990050 and can be cleared separately.
