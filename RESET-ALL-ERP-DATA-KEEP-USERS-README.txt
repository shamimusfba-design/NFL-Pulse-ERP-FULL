NFL Pulse ERP - FULL OPERATIONAL DATA RESET

Use this only when you want a clean operational database.

DELETES:
- Imported and manually entered operational data
- Orders, styles, PO/breakdowns
- T&A / planning / Gantt data stored under orders/styles
- Import history and projections
- Buyer master
- Factory / section / floor / line / machine pool master
- Reference dropdown data
- Tasks and audit logs

KEEPS:
- Users
- Roles
- Permissions
- Login accounts and access setup

HOW:
1. Put RESET-ALL-ERP-DATA-KEEP-USERS.bat in the project ROOT beside the apps folder.
2. Close Excel / browser pages that are editing ERP data.
3. Double-click the BAT.
4. Type RESET when asked.
5. After it says RESET COMPLETE, start the ERP normally.
6. Import clean factory reports again.

This reset is destructive and cannot be undone unless you have a database backup.
