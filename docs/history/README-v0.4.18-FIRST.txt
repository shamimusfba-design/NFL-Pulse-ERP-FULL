NFL Pulse ERP v0.4.18

Fixes from the v0.4.17 build log:
- Ensures xlsx dependency is actually installed before API compile
- Fixes Prisma order create/update result typing
- Fixes nullable order flow in import engine
- Fixes capacity-check empty-array inferred never[] type
- Keeps same-origin /api proxy behavior from v0.4.16

FIRST RUN
1. Extract to a NEW folder.
2. Copy the working apps\api\.env into this project.
3. Double-click START-NFL-PULSE-v0.4.18.bat.
4. The launcher runs npm install even if node_modules already exists, then compiles API before opening Web.
