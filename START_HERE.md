# NFL Pulse ERP — START HERE

## Already-installed Windows PC

After a restart:
1. Open Docker Desktop and wait for **Engine running**.
2. Open the NFL Pulse ERP folder in VS Code.
3. Open a terminal in the project root.
4. Run `npm.cmd run dev`.
5. Open `http://localhost:3000`.

## First-time PC prerequisites
- Node.js (current installed Node 24 is working on the existing development PC; Node 22 LTS also remains a supported baseline)
- Docker Desktop with WSL2
- Git for Windows
- Visual Studio Code
- GitHub Desktop optional

PostgreSQL and Redis are not separately installed; Docker provides the local services.

## First-time project setup

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\scripts\setup.ps1
npm.cmd run dev
```

Local endpoints:
- Web: http://localhost:3000
- API: http://localhost:4000/api
- API health: http://localhost:4000/api/health

Development admin:
- `admin@nfl.local`
- `ChangeMe123!`

## Full consolidated update
If upgrading the already-working local project from earlier v0.3.x patches, follow `APPLY_FULL_CONSOLIDATED.md` instead of rerunning first-time setup.
