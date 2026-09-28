-- v0.4.39 factory-standardized downstream fabric flow (additive only)
CREATE TABLE "FabricFinishingProcess" (
  "id" TEXT NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "handoffId" TEXT,
  "dyeBatchId" TEXT,
  "jobNo" TEXT NOT NULL,
  "styleId" TEXT,
  "processType" TEXT NOT NULL,
  "processorName" TEXT,
  "inputKg" DOUBLE PRECISION NOT NULL,
  "outputKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "processLossKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "plannedDate" TIMESTAMP(3),
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'PLANNED',
  "remarks" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FabricFinishingProcess_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "FabricFinishingProcess_sourceRef_key" ON "FabricFinishingProcess"("sourceRef");
CREATE INDEX "FabricFinishingProcess_jobNo_status_idx" ON "FabricFinishingProcess"("jobNo","status");
CREATE INDEX "FabricFinishingProcess_dyeBatchId_status_idx" ON "FabricFinishingProcess"("dyeBatchId","status");

CREATE TABLE "CuttingFabricIssue" (
  "id" TEXT NOT NULL,
  "sourceRef" TEXT NOT NULL,
  "jobNo" TEXT NOT NULL,
  "styleId" TEXT,
  "materialItemId" TEXT NOT NULL,
  "materialLotId" TEXT,
  "locationCode" TEXT,
  "qtyKg" DOUBLE PRECISION NOT NULL,
  "cuttingFloor" TEXT,
  "cutQty" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'ISSUED',
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "remarks" TEXT,
  "createdByName" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CuttingFabricIssue_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CuttingFabricIssue_sourceRef_key" ON "CuttingFabricIssue"("sourceRef");
CREATE INDEX "CuttingFabricIssue_jobNo_status_idx" ON "CuttingFabricIssue"("jobNo","status");
CREATE INDEX "CuttingFabricIssue_materialItemId_issuedAt_idx" ON "CuttingFabricIssue"("materialItemId","issuedAt");
