# Database Domain Model Contract

The runnable Prisma schema stays intentionally conservative until IT review. The full implementation should add domain tables incrementally rather than creating one untestable mega-migration.

## Shared identifiers
Every operational record should carry, where relevant:
- `factoryId`
- `orderId` / internal Job
- `styleId`
- optional `poId`, `color`, `size`
- planned date/time vs actual date/time separately
- source (`MANUAL`, `IMPORT`, `AUTO`)
- owner / createdBy / updatedBy
- createdAt / updatedAt
- source report/import batch reference
- audit history for critical changes

## Planned domain entities
- Projection, ProjectionStyle
- YarnRequirement, YarnPurchase, YarnDyeingOrder
- KnittingPlan, KnittingProduction, KnittingMachineProgram
- GreigeStockTransaction
- DyeingBatch, DyeingPlan, DyeingDelivery
- LabDip, LabTest, PillingTest, ColorFastnessTest, QaRelease
- FabricProcessPlan, FabricProcessExecution
- FinishedFabricReceipt, FinishedFabricIssue, FinishedFabricStock
- SampleRequest, SampleProcess, CentralSampleProduction, SampleDelivery
- CADFileHandover, PatternStatus, SizeSetStatus
- IEBulletin, IEBulletinOperation, LineCapability
- TaPlan, TaActivity, TaDependency
- PlanVersion, LinePlanAllocation, PlanChangeRequest, PlanChangeImpact
- CapacitySlot, CapacityLoad, SubcontractAllocation
- CuttingReadiness, DailyCutPlan, CuttingProduction
- PrintWorkOrder/Progress, EmbroideryWorkOrder/Progress, SpecialProcessProgress
- SewingInput, SewingProduction, SewingLineActual
- QualityEndLineEntry, QualityDefectEntry, QualityInspection, OqlSummary
- FinishingProduction, PackingProduction
- TrimRequirement, TrimReceipt, TrimIssue
- InventoryItem, InventoryTransaction
- ShipmentPlan, ShipmentExecution, ExportRecord
- DashboardSavedView, FloorDisplayConfig, FloorDisplayWidget
- Notification, EscalationEvent
- JobTimelineEvent / Job 360 projection

## Important modeling rules
- Do not duplicate Buyer/Job/Style/PO facts in every module; reference central IDs.
- Use child detail tables for repeated operational detail and JSON only for truly variable buyer/report extensions.
- Keep Plan and Actual separate.
- Preserve source import row/batch identifiers for reconciliation.
- Effective-date master changes that affect planning.
