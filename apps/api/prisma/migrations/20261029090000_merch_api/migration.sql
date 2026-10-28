-- Merchandising API: style merchandising fields, sample follow-up fields, sample quota, yarn requisition, cost rates
ALTER TABLE "Style" ADD COLUMN "fob" DECIMAL(12,4),
  ADD COLUMN "printEmbType" TEXT,
  ADD COLUMN "printEmbDesc" TEXT,
  ADD COLUMN "planningItemDesc" TEXT,
  ADD COLUMN "imageUrl" TEXT,
  ADD COLUMN "packingListStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';

ALTER TABLE "SampleOrderSheet" ADD COLUMN "merchStatus" TEXT NOT NULL DEFAULT 'ORDER_SHEET_SENT',
  ADD COLUMN "labDipStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "costingStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "yarnReqStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "trimsStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
  ADD COLUMN "fob" DECIMAL(12,4);

CREATE TABLE "SampleQuota" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "line" TEXT NOT NULL,
    "odQuota" INTEGER NOT NULL DEFAULT 0,
    "smsQuota" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SampleQuota_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SampleQuota_month_line_key" ON "SampleQuota"("month", "line");

CREATE TABLE "YarnRequisition" (
    "id" TEXT NOT NULL,
    "reqNo" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sampleSheetId" TEXT,
    "styleNo" TEXT,
    "buyerName" TEXT,
    "lines" JSONB NOT NULL,
    "totalKg" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SENT_TO_PURCHASE',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "YarnRequisition_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "YarnRequisition_reqNo_key" ON "YarnRequisition"("reqNo");
CREATE INDEX "YarnRequisition_status_idx" ON "YarnRequisition"("status");

CREATE TABLE "CostRateSet" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CostRateSet_pkey" PRIMARY KEY ("id")
);
