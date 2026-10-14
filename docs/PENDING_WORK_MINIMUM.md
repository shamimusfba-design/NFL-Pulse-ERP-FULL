# NOS Pending Work — Minimum Practical Rules

## Goal
Keep one simple job-linked task list from confirmed Buyer PO / Order Entry through shipment. Each department can see its own work and what it is waiting for without introducing a complex workflow engine.

## Task fields
- Job / Style and Buyer
- Task title and department
- Priority and due date (only when a real date is known)
- Status: PENDING, IN_PROGRESS, WAITING/BLOCKED, COMPLETED
- Next action and optional waiting-on department/person
- Responsible person can be assigned when user/employee mapping is connected

## Order import creates the initial parallel tasks
- CAD consumption
- IE / Operation Bulletin
- Fabric Order Sheet
- Trims & accessories BOM and ordering follow-up
- Lab dip / shade approval
- T&A preparation and Central Planning review
- Sample follow-up (buyer-required types only; SMS is optional)
- Costing
- Yarn requirement check
- Production planning input review

The initial list does not pretend every production step is already ready. Central Planning should set the plan; detailed knitting, dyeing, fabric store, cutting, sewing, finishing, QA and shipment work can then be created/updated from actual planning and production events.

## Status meaning
- PENDING: work has not started
- IN_PROGRESS: the owner is working on it
- WAITING/BLOCKED: a dependency or another team is holding it up; add a waiting-on note when known
- COMPLETED: work is finished

## Keep it simple
- Do not require approvals at every step.
- Do not create fake due dates or estimated material quantities.
- Reuse the imported order/style data instead of re-entering it.
- Do not force SMS or other buyer-optional sample types.
- Keep department-specific details in their own module; Pending Work is the shared action list, not a replacement for those modules.

## Current implementation boundary
This branch adds the initial job-linked task templates and exposes due date / next action in the task list. The task API in the web demo currently stores tasks in process memory, so a server restart clears updates and this is not yet a production multi-user database-backed task register. Employee assignment, real dependency links, automatic overdue calculation and task generation from later production events remain follow-up work.
