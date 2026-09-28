-- NFL Pulse ERP v0.4.37 cumulative material flow (additive only)
ALTER TABLE "IeTargetEntry" ADD COLUMN IF NOT EXISTS "regularHours" DOUBLE PRECISION NOT NULL DEFAULT 8;
ALTER TABLE "IeTargetEntry" ADD COLUMN IF NOT EXISTS "overtimeHours" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "IeTargetEntry" ADD COLUMN IF NOT EXISTS "regularTarget" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "IeTargetEntry" ADD COLUMN IF NOT EXISTS "overtimeTarget" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "MaterialItem" (
 "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "category" TEXT NOT NULL,
 "count" TEXT, "composition" TEXT, "color" TEXT, "gsm" DOUBLE PRECISION, "width" TEXT,
 "uom" TEXT NOT NULL DEFAULT 'KG', "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MaterialItem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialItem_code_key" ON "MaterialItem"("code");
CREATE INDEX "MaterialItem_category_active_idx" ON "MaterialItem"("category","active");

CREATE TABLE "MaterialLot" (
 "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "lotNo" TEXT NOT NULL, "supplierName" TEXT,
 "supplierLotNo" TEXT, "shade" TEXT, "status" TEXT NOT NULL DEFAULT 'OPEN',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MaterialLot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialLot_itemId_lotNo_key" ON "MaterialLot"("itemId","lotNo");
CREATE INDEX "MaterialLot_supplierName_idx" ON "MaterialLot"("supplierName");
ALTER TABLE "MaterialLot" ADD CONSTRAINT "MaterialLot_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MaterialStockBalance" (
 "id" TEXT NOT NULL, "stockKey" TEXT NOT NULL, "itemId" TEXT NOT NULL, "lotId" TEXT, "locationCode" TEXT,
 "rollNo" TEXT, "jobNo" TEXT, "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MaterialStockBalance_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialStockBalance_stockKey_key" ON "MaterialStockBalance"("stockKey");
CREATE INDEX "MaterialStockBalance_itemId_locationCode_idx" ON "MaterialStockBalance"("itemId","locationCode");
CREATE INDEX "MaterialStockBalance_jobNo_idx" ON "MaterialStockBalance"("jobNo");
ALTER TABLE "MaterialStockBalance" ADD CONSTRAINT "MaterialStockBalance_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialStockBalance" ADD CONSTRAINT "MaterialStockBalance_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MaterialLedger" (
 "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "lotId" TEXT, "locationCode" TEXT, "rollNo" TEXT, "jobNo" TEXT,
 "styleId" TEXT, "batchNo" TEXT, "txnType" TEXT NOT NULL, "direction" TEXT NOT NULL, "qty" DOUBLE PRECISION NOT NULL,
 "uom" TEXT NOT NULL DEFAULT 'KG', "referenceType" TEXT, "referenceId" TEXT, "idempotencyKey" TEXT NOT NULL,
 "remarks" TEXT, "createdByName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "MaterialLedger_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MaterialLedger_idempotencyKey_key" ON "MaterialLedger"("idempotencyKey");
CREATE INDEX "MaterialLedger_itemId_createdAt_idx" ON "MaterialLedger"("itemId","createdAt");
CREATE INDEX "MaterialLedger_jobNo_createdAt_idx" ON "MaterialLedger"("jobNo","createdAt");
ALTER TABLE "MaterialLedger" ADD CONSTRAINT "MaterialLedger_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialLedger" ADD CONSTRAINT "MaterialLedger_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MaterialReservation" (
 "id" TEXT NOT NULL, "itemId" TEXT NOT NULL, "lotId" TEXT, "jobNo" TEXT NOT NULL, "styleId" TEXT,
 "qty" DOUBLE PRECISION NOT NULL, "issuedQty" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'RESERVED',
 "reference" TEXT, "createdByName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "MaterialReservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MaterialReservation_jobNo_status_idx" ON "MaterialReservation"("jobNo","status");
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MaterialReservation" ADD CONSTRAINT "MaterialReservation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "KnittingPlan" (
 "id" TEXT NOT NULL, "jobNo" TEXT NOT NULL, "styleId" TEXT, "fabricCode" TEXT NOT NULL, "machineCode" TEXT,
 "machineCapability" TEXT, "plannedStart" TIMESTAMP(3), "plannedEnd" TIMESTAMP(3), "targetKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "actualKg" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'PLANNED', "subcontractor" TEXT,
 "remarks" TEXT, "createdByName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "KnittingPlan_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "KnittingPlan_jobNo_status_idx" ON "KnittingPlan"("jobNo","status");
CREATE INDEX "KnittingPlan_machineCode_plannedStart_idx" ON "KnittingPlan"("machineCode","plannedStart");

CREATE TABLE "KnittingProduction" (
 "id" TEXT NOT NULL, "planId" TEXT NOT NULL, "productionDate" TIMESTAMP(3) NOT NULL, "shift" TEXT,
 "yarnItemId" TEXT, "yarnLotId" TEXT, "yarnIssuedKg" DOUBLE PRECISION NOT NULL DEFAULT 0, "yarnConsumedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "yarnReturnedKg" DOUBLE PRECISION NOT NULL DEFAULT 0, "wastageKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "greigeKg" DOUBLE PRECISION NOT NULL DEFAULT 0, "rollNo" TEXT NOT NULL, "sourceRef" TEXT NOT NULL, "createdByName" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "KnittingProduction_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "KnittingProduction_sourceRef_key" ON "KnittingProduction"("sourceRef");
CREATE INDEX "KnittingProduction_planId_productionDate_idx" ON "KnittingProduction"("planId","productionDate");
ALTER TABLE "KnittingProduction" ADD CONSTRAINT "KnittingProduction_planId_fkey" FOREIGN KEY ("planId") REFERENCES "KnittingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "GreigeRoll" (
 "id" TEXT NOT NULL, "rollNo" TEXT NOT NULL, "knittingProductionId" TEXT, "jobNo" TEXT NOT NULL, "styleId" TEXT,
 "materialItemId" TEXT NOT NULL, "materialLotId" TEXT, "lotNo" TEXT NOT NULL, "gsm" DOUBLE PRECISION, "composition" TEXT,
 "width" TEXT, "weightKg" DOUBLE PRECISION NOT NULL, "qualityStatus" TEXT NOT NULL DEFAULT 'PENDING',
 "locationCode" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'AVAILABLE', "dyeBatchId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "GreigeRoll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GreigeRoll_rollNo_key" ON "GreigeRoll"("rollNo");
CREATE INDEX "GreigeRoll_jobNo_status_idx" ON "GreigeRoll"("jobNo","status");
CREATE INDEX "GreigeRoll_locationCode_status_idx" ON "GreigeRoll"("locationCode","status");
ALTER TABLE "GreigeRoll" ADD CONSTRAINT "GreigeRoll_knittingProductionId_fkey" FOREIGN KEY ("knittingProductionId") REFERENCES "KnittingProduction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GreigeRoll" ADD CONSTRAINT "GreigeRoll_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GreigeRoll" ADD CONSTRAINT "GreigeRoll_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DyeBatch" (
 "id" TEXT NOT NULL, "batchNo" TEXT NOT NULL, "jobNo" TEXT NOT NULL, "styleId" TEXT, "color" TEXT, "shade" TEXT,
 "machineCode" TEXT, "recipeRef" TEXT, "plannedStart" TIMESTAMP(3), "plannedEnd" TIMESTAMP(3), "actualStart" TIMESTAMP(3),
 "actualEnd" TIMESTAMP(3), "inputKg" DOUBLE PRECISION NOT NULL DEFAULT 0, "outputKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
 "processLossKg" DOUBLE PRECISION NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'PLANNED', "parentBatchId" TEXT,
 "remarks" TEXT, "createdByName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DyeBatch_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DyeBatch_batchNo_key" ON "DyeBatch"("batchNo");
CREATE INDEX "DyeBatch_jobNo_status_idx" ON "DyeBatch"("jobNo","status");
ALTER TABLE "DyeBatch" ADD CONSTRAINT "DyeBatch_parentBatchId_fkey" FOREIGN KEY ("parentBatchId") REFERENCES "DyeBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DyeBatchRoll" (
 "id" TEXT NOT NULL, "batchId" TEXT NOT NULL, "rollId" TEXT NOT NULL, "inputWeightKg" DOUBLE PRECISION NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "DyeBatchRoll_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DyeBatchRoll_batchId_rollId_key" ON "DyeBatchRoll"("batchId","rollId");
CREATE UNIQUE INDEX "DyeBatchRoll_rollId_key" ON "DyeBatchRoll"("rollId");
ALTER TABLE "DyeBatchRoll" ADD CONSTRAINT "DyeBatchRoll_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "DyeBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DyeBatchRoll" ADD CONSTRAINT "DyeBatchRoll_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "GreigeRoll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "FinishedFabricHandoff" (
 "id" TEXT NOT NULL, "dyeBatchId" TEXT NOT NULL, "jobNo" TEXT NOT NULL, "styleId" TEXT, "materialItemId" TEXT NOT NULL,
 "materialLotId" TEXT, "qtyKg" DOUBLE PRECISION NOT NULL, "status" TEXT NOT NULL DEFAULT 'READY', "sourceRef" TEXT NOT NULL,
 "createdByName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "FinishedFabricHandoff_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FinishedFabricHandoff_sourceRef_key" ON "FinishedFabricHandoff"("sourceRef");
CREATE INDEX "FinishedFabricHandoff_jobNo_status_idx" ON "FinishedFabricHandoff"("jobNo","status");
ALTER TABLE "FinishedFabricHandoff" ADD CONSTRAINT "FinishedFabricHandoff_dyeBatchId_fkey" FOREIGN KEY ("dyeBatchId") REFERENCES "DyeBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinishedFabricHandoff" ADD CONSTRAINT "FinishedFabricHandoff_materialItemId_fkey" FOREIGN KEY ("materialItemId") REFERENCES "MaterialItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinishedFabricHandoff" ADD CONSTRAINT "FinishedFabricHandoff_materialLotId_fkey" FOREIGN KEY ("materialLotId") REFERENCES "MaterialLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
