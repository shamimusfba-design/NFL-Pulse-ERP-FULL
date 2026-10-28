-- Yarn store, purchase pipeline, knitting planning / execution and knitting quality
ALTER TABLE "YarnRequisition" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'MERCHANDISER',
  ADD COLUMN "basis" TEXT NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN "requiredDate" TIMESTAMP(3),
  ADD COLUMN "note" TEXT,
  ADD COLUMN "approvedById" TEXT,
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "returnNote" TEXT;

CREATE TABLE "YarnCount" ("code" TEXT NOT NULL, "cnt" TEXT NOT NULL, "composition" TEXT, "shade" TEXT, "yarnType" TEXT, "moqKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "YarnCount_pkey" PRIMARY KEY ("code"));

CREATE TABLE "YarnLot" ("id" TEXT NOT NULL, "yarnDesc" TEXT NOT NULL, "countCode" TEXT, "supplier" TEXT, "lotNo" TEXT NOT NULL, "lpNo" TEXT NOT NULL DEFAULT '', "receivedAt" TIMESTAMP(3), "lcNo" TEXT, "location" TEXT, "qcStatus" TEXT NOT NULL DEFAULT 'PASSED', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "YarnLot_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "YarnLot_yarnDesc_lotNo_lpNo_key" ON "YarnLot"("yarnDesc", "lotNo", "lpNo");
CREATE INDEX "YarnLot_countCode_idx" ON "YarnLot"("countCode");

CREATE TABLE "YarnLedger" ("id" TEXT NOT NULL, "lotId" TEXT NOT NULL, "kind" TEXT NOT NULL, "kg" DECIMAL(14,2) NOT NULL, "date" TIMESTAMP(3) NOT NULL, "refType" TEXT NOT NULL, "refId" TEXT NOT NULL, "note" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "YarnLedger_pkey" PRIMARY KEY ("id"));
CREATE INDEX "YarnLedger_lotId_idx" ON "YarnLedger"("lotId");
CREATE INDEX "YarnLedger_refType_refId_idx" ON "YarnLedger"("refType", "refId");
ALTER TABLE "YarnLedger" ADD CONSTRAINT "YarnLedger_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "YarnLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "YarnPurchaseLine" ("id" TEXT NOT NULL, "poNo" TEXT NOT NULL, "requisitionId" TEXT, "countCode" TEXT NOT NULL, "supplier" TEXT NOT NULL, "piNo" TEXT, "lcNo" TEXT, "lcDate" TIMESTAMP(3), "eta" TIMESTAMP(3), "orderedKg" DECIMAL(14,2) NOT NULL, "receivedKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'ORDERED', "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "YarnPurchaseLine_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "YarnPurchaseLine_poNo_countCode_key" ON "YarnPurchaseLine"("poNo", "countCode");
CREATE INDEX "YarnPurchaseLine_countCode_idx" ON "YarnPurchaseLine"("countCode");
CREATE INDEX "YarnPurchaseLine_requisitionId_idx" ON "YarnPurchaseLine"("requisitionId");

CREATE TABLE "YarnReceipt" ("id" TEXT NOT NULL, "grnNo" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "purchaseLineId" TEXT NOT NULL, "lotId" TEXT NOT NULL, "kg" DECIMAL(14,2) NOT NULL, "bags" INTEGER, "cones" INTEGER, "invoiceNo" TEXT, "challanNo" TEXT, "qcStatus" TEXT NOT NULL, "clientRef" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "YarnReceipt_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "YarnReceipt_grnNo_key" ON "YarnReceipt"("grnNo");
CREATE UNIQUE INDEX "YarnReceipt_clientRef_key" ON "YarnReceipt"("clientRef");

CREATE TABLE "YarnIssue" ("id" TEXT NOT NULL, "issueNo" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "lotId" TEXT NOT NULL, "knitLineId" TEXT, "jobCode" TEXT NOT NULL, "colour" TEXT, "party" TEXT NOT NULL, "programNo" TEXT, "kg" DECIMAL(14,2) NOT NULL, "bags" INTEGER, "cones" INTEGER, "challanNo" TEXT, "clientRef" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "YarnIssue_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "YarnIssue_issueNo_key" ON "YarnIssue"("issueNo");
CREATE UNIQUE INDEX "YarnIssue_clientRef_key" ON "YarnIssue"("clientRef");
CREATE INDEX "YarnIssue_jobCode_idx" ON "YarnIssue"("jobCode");

CREATE TABLE "YarnReturn" ("id" TEXT NOT NULL, "returnNo" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "lotId" TEXT NOT NULL, "party" TEXT NOT NULL, "jobCode" TEXT, "programNo" TEXT, "kg" DECIMAL(14,2) NOT NULL, "reason" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "YarnReturn_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "YarnReturn_returnNo_key" ON "YarnReturn"("returnNo");

CREATE TABLE "YarnDeadAction" ("lotId" TEXT NOT NULL, "action" TEXT NOT NULL, "note" TEXT, "updatedById" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "YarnDeadAction_pkey" PRIMARY KEY ("lotId"));

CREATE TABLE "KnitMachine" ("id" TEXT NOT NULL, "dia" TEXT NOT NULL, "capKgDay" DECIMAL(10,2) NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, CONSTRAINT "KnitMachine_pkey" PRIMARY KEY ("id"));

CREATE TABLE "KnitJob" ("id" TEXT NOT NULL, "jobCode" TEXT NOT NULL, "buyer" TEXT NOT NULL, "style" TEXT, "merchandiser" TEXT, "shipDate" TIMESTAMP(3), "taClose" TIMESTAMP(3), "approvedAt" TIMESTAMP(3) NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING_PLANNING', "lines" JSONB NOT NULL, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "KnitJob_pkey" PRIMARY KEY ("id"));
CREATE INDEX "KnitJob_status_idx" ON "KnitJob"("status");

CREATE TABLE "KnitLine" ("id" TEXT NOT NULL, "jobId" TEXT, "source" TEXT NOT NULL, "buyer" TEXT NOT NULL, "jobCode" TEXT NOT NULL, "colour" TEXT NOT NULL, "part" TEXT, "fabric" TEXT NOT NULL, "fabricType" TEXT, "gsm" TEXT, "dia" TEXT, "countType" TEXT, "finishKg" DECIMAL(14,2), "orderKg" DECIMAL(14,2) NOT NULL, "finalKg" DECIMAL(14,2), "openingKnitKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "mode" TEXT NOT NULL DEFAULT 'IN_HOUSE', "stage" TEXT NOT NULL DEFAULT 'ACTIVE', "yarnCount" TEXT, "brand" TEXT, "yarnLot" TEXT, "finishWidth" TEXT, "stitchLength" TEXT, "fosDate" TIMESTAMP(3), "slot" TEXT, "season" TEXT, "taClose" TIMESTAMP(3), "shipDate" TIMESTAMP(3), "merchandiser" TEXT, "programNo" TEXT, "programRcvDate" TIMESTAMP(3), "remarks" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KnitLine_pkey" PRIMARY KEY ("id"));
CREATE INDEX "KnitLine_jobId_idx" ON "KnitLine"("jobId");
CREATE INDEX "KnitLine_stage_idx" ON "KnitLine"("stage");
CREATE INDEX "KnitLine_jobCode_idx" ON "KnitLine"("jobCode");
ALTER TABLE "KnitLine" ADD CONSTRAINT "KnitLine_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "KnitJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "KnitQueueItem" ("knitLineId" TEXT NOT NULL, "machineId" TEXT NOT NULL, "position" INTEGER NOT NULL, "notBefore" TIMESTAMP(3), "hold" BOOLEAN NOT NULL DEFAULT false, "holdReason" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KnitQueueItem_pkey" PRIMARY KEY ("knitLineId"));
CREATE INDEX "KnitQueueItem_machineId_position_idx" ON "KnitQueueItem"("machineId", "position");
ALTER TABLE "KnitQueueItem" ADD CONSTRAINT "KnitQueueItem_knitLineId_fkey" FOREIGN KEY ("knitLineId") REFERENCES "KnitLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "KnitOutsideAllocation" ("knitLineId" TEXT NOT NULL, "factory" TEXT NOT NULL, "programNo" TEXT, "startDate" TIMESTAMP(3), "endDate" TIMESTAMP(3), "allocatedById" TEXT NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KnitOutsideAllocation_pkey" PRIMARY KEY ("knitLineId"));
ALTER TABLE "KnitOutsideAllocation" ADD CONSTRAINT "KnitOutsideAllocation_knitLineId_fkey" FOREIGN KEY ("knitLineId") REFERENCES "KnitLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "KnitFactoryBooking" ("factory" TEXT NOT NULL, "tonsPerDay" DECIMAL(10,2) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "KnitFactoryBooking_pkey" PRIMARY KEY ("factory"));

CREATE TABLE "KnitProduction" ("id" TEXT NOT NULL, "knitLineId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "machineId" TEXT, "source" TEXT NOT NULL DEFAULT 'EXECUTION', "knittedKg" DECIMAL(14,2) NOT NULL, "deliveredKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "rejectedKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "KnitProduction_pkey" PRIMARY KEY ("id"));
CREATE INDEX "KnitProduction_knitLineId_idx" ON "KnitProduction"("knitLineId");
CREATE INDEX "KnitProduction_date_idx" ON "KnitProduction"("date");
ALTER TABLE "KnitProduction" ADD CONSTRAINT "KnitProduction_knitLineId_fkey" FOREIGN KEY ("knitLineId") REFERENCES "KnitLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "KnitRemark" ("id" TEXT NOT NULL, "knitLineId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "dept" TEXT NOT NULL, "type" TEXT NOT NULL, "reason" TEXT, "text" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "KnitRemark_pkey" PRIMARY KEY ("id"));
CREATE INDEX "KnitRemark_knitLineId_idx" ON "KnitRemark"("knitLineId");
ALTER TABLE "KnitRemark" ADD CONSTRAINT "KnitRemark_knitLineId_fkey" FOREIGN KEY ("knitLineId") REFERENCES "KnitLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "KnitInspection" ("id" TEXT NOT NULL, "inspNo" TEXT NOT NULL, "knitLineId" TEXT NOT NULL, "date" TIMESTAMP(3) NOT NULL, "machine" TEXT, "rolls" INTEGER, "inspectedKg" DECIMAL(14,2) NOT NULL, "defect" TEXT NOT NULL, "defectKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "rejectedKg" DECIMAL(14,2) NOT NULL DEFAULT 0, "decision" TEXT NOT NULL, "remarks" TEXT, "createdById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "KnitInspection_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "KnitInspection_inspNo_key" ON "KnitInspection"("inspNo");
CREATE INDEX "KnitInspection_date_idx" ON "KnitInspection"("date");
CREATE INDEX "KnitInspection_knitLineId_idx" ON "KnitInspection"("knitLineId");
ALTER TABLE "KnitInspection" ADD CONSTRAINT "KnitInspection_knitLineId_fkey" FOREIGN KEY ("knitLineId") REFERENCES "KnitLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "KnitLossRule" ("fabricType" TEXT NOT NULL, "lossPct" DECIMAL(5,2) NOT NULL, CONSTRAINT "KnitLossRule_pkey" PRIMARY KEY ("fabricType"));
