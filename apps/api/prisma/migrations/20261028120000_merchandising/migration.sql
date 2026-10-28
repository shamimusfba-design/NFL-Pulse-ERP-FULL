-- Merchandising: bulk workflow steps, trims & accessories checklist, lab dip, cost sheet, sample order sheet
CREATE TABLE "MerchStep" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAIT',
    "data" JSONB,
    "doneById" TEXT,
    "doneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MerchStep_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrimsChecklist" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TrimsChecklist_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TrimsChecklistLine" (
    "id" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "sortNo" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "spec" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "perPc" DECIMAL(12,4) NOT NULL,
    "wastePct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "requiredQty" DECIMAL(14,2) NOT NULL,
    "orderStatus" TEXT NOT NULL DEFAULT 'NOT_ORDERED',
    "orderedAt" TIMESTAMP(3),
    "receivedQty" DECIMAL(14,2) NOT NULL DEFAULT 0,
    CONSTRAINT "TrimsChecklistLine_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "LabDip" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "rounds" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LabDip_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CostSheet" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fob" DECIMAL(12,4),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CostSheet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SampleOrderSheet" (
    "id" TEXT NOT NULL,
    "sheetNo" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "subBrand" TEXT,
    "styleNo" TEXT NOT NULL,
    "styleName" TEXT,
    "sampleType" TEXT NOT NULL,
    "coll" TEXT,
    "merchandiserId" TEXT,
    "requiredDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'TNA_PENDING',
    "returnReason" TEXT,
    "tna" JSONB,
    "plannedDelivery" TIMESTAMP(3),
    "fabric" JSONB,
    "instructions" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SampleOrderSheet_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SampleOrderColor" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    CONSTRAINT "SampleOrderColor_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MerchStep_styleId_step_key" ON "MerchStep"("styleId", "step");
CREATE INDEX "MerchStep_step_status_idx" ON "MerchStep"("step", "status");
CREATE UNIQUE INDEX "TrimsChecklist_styleId_key" ON "TrimsChecklist"("styleId");
CREATE INDEX "TrimsChecklistLine_checklistId_idx" ON "TrimsChecklistLine"("checklistId");
CREATE UNIQUE INDEX "LabDip_styleId_color_key" ON "LabDip"("styleId", "color");
CREATE UNIQUE INDEX "CostSheet_entityType_entityId_key" ON "CostSheet"("entityType", "entityId");
CREATE UNIQUE INDEX "SampleOrderSheet_sheetNo_key" ON "SampleOrderSheet"("sheetNo");
CREATE INDEX "SampleOrderSheet_status_idx" ON "SampleOrderSheet"("status");
CREATE INDEX "SampleOrderSheet_styleNo_idx" ON "SampleOrderSheet"("styleNo");
CREATE INDEX "SampleOrderColor_sheetId_idx" ON "SampleOrderColor"("sheetId");
ALTER TABLE "MerchStep" ADD CONSTRAINT "MerchStep_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrimsChecklist" ADD CONSTRAINT "TrimsChecklist_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrimsChecklistLine" ADD CONSTRAINT "TrimsChecklistLine_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "TrimsChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LabDip" ADD CONSTRAINT "LabDip_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SampleOrderColor" ADD CONSTRAINT "SampleOrderColor_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "SampleOrderSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;
