NFL Pulse ERP v0.4.15 - SAME-ORIGIN API HOTFIX

This build fixes the repeated browser message "Failed to fetch" when the API is actually running.

Key change:
- Web requests now go to /api on localhost:3000.
- Next.js proxies /api to 127.0.0.1:4000.
- Browser no longer needs to make a cross-origin request to port 4000.
- API still allows localhost/127.0.0.1 CORS for direct diagnostics.

FIRST RUN:
1. Extract into a NEW folder.
2. Copy your working apps\api\.env into this build.
3. Close all old NFL Pulse API/Web windows.
4. Double-click START-NFL-PULSE-v0.4.15.bat.
5. It opens /modules/data-import.
6. Choose a report and click Analyze & Preview.

Diagnostic URLs:
- http://localhost:4000/api/health  (direct API)
- http://localhost:3000/api/health  (same-origin proxy)
Both should return JSON with ok:true.
