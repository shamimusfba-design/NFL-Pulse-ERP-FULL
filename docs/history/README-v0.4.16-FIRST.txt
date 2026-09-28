NFL Pulse ERP v0.4.16

Fix: client API is hard-locked to same-origin /api. NEXT_PUBLIC_API_URL can no longer force browser calls to port 4000. Login uses /api/auth/login too. Launcher clears NEXT_PUBLIC_API_URL and refuses to open the frontend unless http://localhost:3000/api/health passes.

Use:
1. Extract to a NEW folder.
2. Copy working apps\api\.env into this version.
3. Close old API/Web windows.
4. Double-click START-NFL-PULSE-v0.4.16.bat.
5. It opens Import Center only after API and proxy health are verified.
