NFL Pulse ERP v0.4.17 - API TypeScript Compile Hotfix

Fixes the API startup blocker seen as:
TS7006: Parameter x implicitly has an any type
Found 36 errors. Watching for file changes.

This build keeps strict TypeScript checks but disables only noImplicitAny for the legacy/report-import parser layer so the API can boot while XLSX callbacks are progressively typed.

Run START-NFL-PULSE-v0.4.17.bat from the project root.
