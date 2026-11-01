-- CreateEnum
CREATE TYPE "ProductionLotStatus" AS ENUM ('DRAFT', 'APPROVED', 'RELEASED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportBatchStatus" AS ENUM ('STAGED', 'COMMITTED', 'ROLLED_BACK', 'FAILED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('VALID', 'ERROR', 'COMMITTED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "FabricComponentType" AS ENUM ('BODY', 'L_RIB', 'S_JERSEY', 'COLLAR_CUFF', 'POCKETING');

-- CreateEnum
CREATE TYPE "DyeingRoute" AS ENUM ('IN_HOUSE', 'SUBCONTRACT');

-- CreateEnum
CREATE TYPE "MultiProcessType" AS ENUM ('AOP', 'PEACH', 'BRUSH', 'SHEARING', 'SINGEING', 'SUEDING', 'HEAT_SETTING');

-- CreateEnum
CREATE TYPE "DyeingBatchStatus" AS ENUM ('PLANNED', 'GREIGE_ISSUED', 'LOADING', 'DYEING_RUNNING', 'SHADE_CHECKING', 'TOPPING_REQUIRED', 'UNLOADED', 'SLITTING_COMPLETED', 'STENTER_COMPLETED', 'COMPACTING_COMPLETED', 'STORE_DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RftStatus" AS ENUM ('RFT', 'NRFT', 'STRIP_REDYE', 'PENDING');

-- CreateEnum
CREATE TYPE "MultiProcessMovementStatus" AS ENUM ('CHALLAN_CREATED', 'GATE_PASS_ISSUED', 'IN_TRANSIT', 'AT_VENDOR_MILL', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED', 'CLOSED');

-- CreateTable
CREATE TABLE "MaintenanceMachine" (
    "id" TEXT NOT NULL,
    "factoryId" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "aliases" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceDailyMachine" (
    "id" TEXT NOT NULL,
    "machineId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryTotalQty" INTEGER,
    "breakdownQty" INTEGER NOT NULL DEFAULT 0,
    "rentQty" INTEGER NOT NULL DEFAULT 0,
    "utilizedQty" INTEGER NOT NULL DEFAULT 0,
    "unusedQty" INTEGER NOT NULL DEFAULT 0,
    "workingQty" INTEGER,
    "floorUsage" JSONB,
    "remarks" TEXT,
    "sourceFileName" TEXT,
    "sourceSheet" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MaintenanceDailyMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLot" (
    "id" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "shipmentDate" TIMESTAMP(3),
    "status" "ProductionLotStatus" NOT NULL DEFAULT 'DRAFT',
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sourceMetadata" JSONB,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "approvedByName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLotAllocation" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "colorCode" TEXT,
    "size" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "ean" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLotAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL,
    "moduleSlug" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceSheet" TEXT NOT NULL,
    "status" "ImportBatchStatus" NOT NULL DEFAULT 'STAGED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "validRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "mapping" JSONB,
    "headers" JSONB,
    "committedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "errors" JSONB,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'VALID',
    "jobNo" TEXT,
    "styleNo" TEXT,
    "buyer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferenceValue" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "source" TEXT,
    "sourceBatchId" TEXT,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferenceValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportProjection" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowId" TEXT,
    "moduleSlug" TEXT NOT NULL,
    "entityKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMutation" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportMutation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeTargetEntry" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT NOT NULL,
    "sectionCode" TEXT,
    "lineCode" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "styleNo" TEXT,
    "styleId" TEXT,
    "targetType" TEXT NOT NULL DEFAULT 'NORMAL',
    "sourceMode" TEXT NOT NULL DEFAULT 'AUTO',
    "smv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effectiveSmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shortFactor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "wipQty" INTEGER NOT NULL DEFAULT 0,
    "manpower" INTEGER NOT NULL DEFAULT 0,
    "plannedHours" DOUBLE PRECISION NOT NULL DEFAULT 8,
    "targetEfficiency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "targetPerHour" INTEGER NOT NULL DEFAULT 0,
    "finalTarget" INTEGER NOT NULL DEFAULT 0,
    "actualOutput" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "remarks" TEXT,
    "createdByName" TEXT,
    "releasedByName" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeTargetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeNptRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT,
    "lineCode" TEXT NOT NULL,
    "recordKind" TEXT NOT NULL DEFAULT 'NPT',
    "nptType" TEXT,
    "totalMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lostMoney" DOUBLE PRECISION,
    "responsiblePerson" TEXT,
    "ieName" TEXT,
    "daySpendMinutes" DOUBLE PRECISION,
    "dayProduceMinutes" DOUBLE PRECISION,
    "processName" TEXT,
    "machineType" TEXT,
    "waitingMinutes" DOUBLE PRECISION,
    "repairMinutes" DOUBLE PRECISION,
    "remarks" TEXT,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeNptRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeQcoRule" (
    "id" TEXT NOT NULL,
    "minSmv" DOUBLE PRECISION NOT NULL,
    "maxSmv" DOUBLE PRECISION,
    "standardMin" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeQcoRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeQcoRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT,
    "lineCode" TEXT NOT NULL,
    "buyer" TEXT,
    "jobNo" TEXT,
    "styleNo" TEXT,
    "item" TEXT,
    "smv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "machineQty" INTEGER NOT NULL DEFAULT 0,
    "standardMinutes" INTEGER NOT NULL DEFAULT 0,
    "actualMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lossMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "achievementPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actualStartTime" TEXT,
    "firstGoodOutputTime" TEXT,
    "failureReason" TEXT,
    "responsibleDeptPerson" TEXT,
    "remarks" TEXT,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeQcoRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MisPerformanceRecord" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT,
    "lineCode" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL DEFAULT '',
    "styleNo" TEXT,
    "smv" DOUBLE PRECISION,
    "employee" DOUBLE PRECISION,
    "operator" DOUBLE PRECISION,
    "helper" DOUBLE PRECISION,
    "finishing" DOUBLE PRECISION,
    "normalWorkers" DOUBLE PRECISION,
    "normalHours" DOUBLE PRECISION,
    "overtimeHours" DOUBLE PRECISION,
    "spentMinutes" DOUBLE PRECISION,
    "cumulativeSpentMinutes" DOUBLE PRECISION,
    "targetEfficiencyPct" DOUBLE PRECISION,
    "targetPerHour" DOUBLE PRECISION,
    "dailyTarget" DOUBLE PRECISION,
    "hourlyOutput" JSONB,
    "totalOutput" DOUBLE PRECISION,
    "cumulativeOutput" DOUBLE PRECISION,
    "efficiencyPct" DOUBLE PRECISION,
    "cumulativeEfficiencyPct" DOUBLE PRECISION,
    "performancePct" DOUBLE PRECISION,
    "targetProducedMinutes" DOUBLE PRECISION,
    "achievedProducedMinutes" DOUBLE PRECISION,
    "cumulativeAchievedMinutes" DOUBLE PRECISION,
    "lostProducedMinutes" DOUBLE PRECISION,
    "productivity" DOUBLE PRECISION,
    "areaGroup" TEXT,
    "remarks" TEXT,
    "sourceFileName" TEXT,
    "sourceSheet" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MisPerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MisSummarySnapshot" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "section" TEXT NOT NULL DEFAULT 'FACTORY',
    "metricKey" TEXT NOT NULL,
    "metricLabel" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "textValue" TEXT,
    "unit" TEXT,
    "sourceFileName" TEXT,
    "sourceSheet" TEXT,
    "extra" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MisSummarySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsibleAssignment" (
    "id" TEXT NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT NOT NULL,
    "areaCode" TEXT,
    "lineCode" TEXT,
    "department" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "personName" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "source" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResponsibleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiManualValue" (
    "id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "kpiKey" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "textValue" TEXT,
    "unit" TEXT,
    "floorCode" TEXT NOT NULL DEFAULT '',
    "lineCode" TEXT NOT NULL DEFAULT '',
    "personName" TEXT NOT NULL DEFAULT '',
    "remarks" TEXT,
    "enteredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiManualValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KaizenEntry" (
    "id" TEXT NOT NULL,
    "kaizenNo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "employeeName" TEXT,
    "department" TEXT,
    "section" TEXT,
    "floorCode" TEXT,
    "lineCode" TEXT,
    "beforeText" TEXT,
    "afterText" TEXT,
    "costBenefit" TEXT,
    "technicalBenefit" TEXT,
    "safetyBenefit" TEXT,
    "monthlySaving" DOUBLE PRECISION,
    "annualSaving" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "implementationDate" TIMESTAMP(3),
    "sustainCheckDate" TIMESTAMP(3),
    "spreadTo" JSONB,
    "attachmentUrl" TEXT,
    "remarks" TEXT,
    "submittedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KaizenEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeActualAssignment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT,
    "lineCode" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL DEFAULT '',
    "styleNo" TEXT,
    "operatorPresent" INTEGER NOT NULL DEFAULT 0,
    "helperPresent" INTEGER NOT NULL DEFAULT 0,
    "finishingPresent" INTEGER NOT NULL DEFAULT 0,
    "totalPresent" INTEGER NOT NULL DEFAULT 0,
    "assignedManpower" INTEGER NOT NULL DEFAULT 0,
    "actualTarget" INTEGER NOT NULL DEFAULT 0,
    "remarks" TEXT,
    "sourceFileName" TEXT,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeActualAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IeSkillMatrix" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "employeeName" TEXT NOT NULL,
    "factoryCode" TEXT NOT NULL DEFAULT 'NFL',
    "floorCode" TEXT,
    "lineCode" TEXT,
    "operation" TEXT NOT NULL,
    "machineType" TEXT,
    "skillLevel" INTEGER NOT NULL DEFAULT 1,
    "proficiencyPct" DOUBLE PRECISION,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IeSkillMatrix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DyeingMachine" (
    "id" TEXT NOT NULL,
    "machineCode" TEXT NOT NULL,
    "machineName" TEXT NOT NULL,
    "machineType" TEXT NOT NULL,
    "capacityKg" DOUBLE PRECISION NOT NULL,
    "brandName" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL,
    "nozzleCount" INTEGER NOT NULL DEFAULT 1,
    "chamberCount" INTEGER NOT NULL DEFAULT 0,
    "isSampleMachine" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DyeingMachine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcontractMill" (
    "id" TEXT NOT NULL,
    "millName" TEXT NOT NULL,
    "millCategory" TEXT NOT NULL,
    "allowedBuyers" TEXT[],
    "primaryContactPerson" TEXT,
    "primaryContactMobile" TEXT,
    "qcContactPerson" TEXT,
    "qcContactMobile" TEXT,
    "leadManagerName" TEXT,
    "leadManagerMobile" TEXT,
    "millAddress" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubcontractMill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricOrder" (
    "id" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "styleNo" TEXT,
    "season" TEXT,
    "merchandiser" TEXT,
    "orderQtyPcs" INTEGER NOT NULL DEFAULT 0,
    "slotNo" TEXT NOT NULL DEFAULT '1st Slot',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FabricOrderComponent" (
    "id" TEXT NOT NULL,
    "fabricOrderId" TEXT NOT NULL,
    "componentType" "FabricComponentType" NOT NULL,
    "fabricDescription" TEXT NOT NULL,
    "colourName" TEXT NOT NULL,
    "colorCode" TEXT,
    "gsm" TEXT NOT NULL,
    "widthDia" TEXT NOT NULL,
    "additionalProcess" TEXT,
    "requiredQtyKg" DOUBLE PRECISION NOT NULL,
    "greigeReceivedKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dyeingDeliveredKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finishedDeliveredKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FabricOrderComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GreigeRoll" (
    "id" TEXT NOT NULL,
    "rollBarcode" TEXT NOT NULL,
    "fabricOrderComponentId" TEXT NOT NULL,
    "knittingSource" TEXT NOT NULL,
    "knittingMachineNo" TEXT,
    "yarnLotNo" TEXT NOT NULL,
    "yarnBrandCount" TEXT,
    "rollGrossWeightKg" DOUBLE PRECISION NOT NULL,
    "rollNetWeightKg" DOUBLE PRECISION NOT NULL,
    "qualityGrade" TEXT NOT NULL DEFAULT 'A',
    "storeRackLocation" TEXT,
    "isAllocated" BOOLEAN NOT NULL DEFAULT false,
    "allocatedBatchId" TEXT,
    "receivedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GreigeRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DyeingBatch" (
    "id" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "fabricOrderComponentId" TEXT NOT NULL,
    "route" "DyeingRoute" NOT NULL,
    "targetMachineId" TEXT,
    "subcontractMillId" TEXT,
    "plannedBatchQtyKg" DOUBLE PRECISION NOT NULL,
    "greigeIssuedQtyKg" DOUBLE PRECISION NOT NULL,
    "liquorRatio" TEXT DEFAULT '1:6',
    "recipeCode" TEXT,
    "dyeingDate" TIMESTAMP(3) NOT NULL,
    "dyeingOutputKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "DyeingBatchStatus" NOT NULL DEFAULT 'PLANNED',
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DyeingBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DyeingQualityLog" (
    "id" TEXT NOT NULL,
    "dyeingBatchId" TEXT NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rftResult" "RftStatus" NOT NULL DEFAULT 'RFT',
    "shadeStatus" TEXT NOT NULL DEFAULT 'APPROVED',
    "lightSourceTested" TEXT DEFAULT 'D65, TL84',
    "reasonOfTopping" TEXT,
    "toppingRecipeCode" TEXT,
    "additionalDyeTimeMin" INTEGER NOT NULL DEFAULT 0,
    "approvedByTechnologist" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DyeingQualityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MultiProcessMovement" (
    "id" TEXT NOT NULL,
    "movementCode" TEXT NOT NULL,
    "dyeingBatchId" TEXT NOT NULL,
    "processType" "MultiProcessType" NOT NULL,
    "vendorMillId" TEXT,
    "outwardChallanNo" TEXT NOT NULL,
    "outwardGatePassNo" TEXT NOT NULL,
    "sendDate" TIMESTAMP(3) NOT NULL,
    "sendQtyKg" DOUBLE PRECISION NOT NULL,
    "comboName" TEXT,
    "inwardChallanNo" TEXT,
    "receiveDate" TIMESTAMP(3),
    "receivedQtyKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processLossKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processLossPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "movementStatus" "MultiProcessMovementStatus" NOT NULL DEFAULT 'CHALLAN_CREATED',
    "strikeOffApprovalDate" TIMESTAMP(3),
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MultiProcessMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishingRun" (
    "id" TEXT NOT NULL,
    "dyeingBatchId" TEXT NOT NULL,
    "slittingMachineId" TEXT,
    "slittingDate" TIMESTAMP(3),
    "slittingOutputKg" DOUBLE PRECISION,
    "stenterMachineId" TEXT,
    "stenterDate" TIMESTAMP(3),
    "stenterTempCelsius" INTEGER,
    "stenterSpeedMPerMin" DOUBLE PRECISION,
    "compactingMachineId" TEXT,
    "compactingDate" TIMESTAMP(3),
    "achievedGsm" INTEGER,
    "achievedWidthDia" TEXT,
    "fourPointPenaltyPoints" INTEGER NOT NULL DEFAULT 0,
    "qualityStatus" TEXT NOT NULL DEFAULT 'PASSED',
    "inspectedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinishedFabricDelivery" (
    "id" TEXT NOT NULL,
    "deliveryChallanNo" TEXT NOT NULL,
    "fabricOrderId" TEXT NOT NULL,
    "deliveryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "slotNo" TEXT NOT NULL DEFAULT '1st Slot',
    "bodyDeliveryKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lribDeliveryKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sjerseyDeliveryKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalDeliveryKg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "receivedByStoreOfficer" TEXT,
    "handedOverToCuttingOfficer" TEXT,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinishedFabricDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceMachine_factoryId_normalizedKey_key" ON "MaintenanceMachine"("factoryId", "normalizedKey");

-- CreateIndex
CREATE INDEX "MaintenanceDailyMachine_date_idx" ON "MaintenanceDailyMachine"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceDailyMachine_machineId_date_key" ON "MaintenanceDailyMachine"("machineId", "date");

-- CreateIndex
CREATE INDEX "ProductionLot_styleId_status_idx" ON "ProductionLot"("styleId", "status");

-- CreateIndex
CREATE INDEX "ProductionLot_shipmentDate_idx" ON "ProductionLot"("shipmentDate");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLot_styleId_code_key" ON "ProductionLot"("styleId", "code");

-- CreateIndex
CREATE INDEX "ProductionLotAllocation_purchaseOrderId_idx" ON "ProductionLotAllocation"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "ProductionLotAllocation_lotId_idx" ON "ProductionLotAllocation"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionLotAllocation_lotId_purchaseOrderId_color_size_key" ON "ProductionLotAllocation"("lotId", "purchaseOrderId", "color", "size");

-- CreateIndex
CREATE INDEX "ImportBatch_moduleSlug_status_idx" ON "ImportBatch"("moduleSlug", "status");

-- CreateIndex
CREATE INDEX "ImportBatch_createdAt_idx" ON "ImportBatch"("createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_batchId_status_idx" ON "ImportRow"("batchId", "status");

-- CreateIndex
CREATE INDEX "ImportRow_jobNo_idx" ON "ImportRow"("jobNo");

-- CreateIndex
CREATE INDEX "ImportRow_styleNo_idx" ON "ImportRow"("styleNo");

-- CreateIndex
CREATE INDEX "ReferenceValue_category_active_idx" ON "ReferenceValue"("category", "active");

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceValue_category_normalized_key" ON "ReferenceValue"("category", "normalized");

-- CreateIndex
CREATE INDEX "ImportProjection_moduleSlug_active_idx" ON "ImportProjection"("moduleSlug", "active");

-- CreateIndex
CREATE INDEX "ImportProjection_entityKey_idx" ON "ImportProjection"("entityKey");

-- CreateIndex
CREATE UNIQUE INDEX "ImportProjection_batchId_rowId_moduleSlug_key" ON "ImportProjection"("batchId", "rowId", "moduleSlug");

-- CreateIndex
CREATE INDEX "ImportMutation_batchId_createdAt_idx" ON "ImportMutation"("batchId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportMutation_entityType_entityId_idx" ON "ImportMutation"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "IeTargetEntry_date_floorCode_lineCode_idx" ON "IeTargetEntry"("date", "floorCode", "lineCode");

-- CreateIndex
CREATE INDEX "IeTargetEntry_jobNo_date_idx" ON "IeTargetEntry"("jobNo", "date");

-- CreateIndex
CREATE INDEX "IeTargetEntry_status_date_idx" ON "IeTargetEntry"("status", "date");

-- CreateIndex
CREATE INDEX "IeNptRecord_date_lineCode_idx" ON "IeNptRecord"("date", "lineCode");

-- CreateIndex
CREATE INDEX "IeNptRecord_recordKind_date_idx" ON "IeNptRecord"("recordKind", "date");

-- CreateIndex
CREATE INDEX "IeNptRecord_nptType_idx" ON "IeNptRecord"("nptType");

-- CreateIndex
CREATE INDEX "IeQcoRule_active_effectiveFrom_idx" ON "IeQcoRule"("active", "effectiveFrom");

-- CreateIndex
CREATE INDEX "IeQcoRecord_date_lineCode_idx" ON "IeQcoRecord"("date", "lineCode");

-- CreateIndex
CREATE INDEX "IeQcoRecord_jobNo_date_idx" ON "IeQcoRecord"("jobNo", "date");

-- CreateIndex
CREATE INDEX "MisPerformanceRecord_date_floorCode_lineCode_idx" ON "MisPerformanceRecord"("date", "floorCode", "lineCode");

-- CreateIndex
CREATE INDEX "MisPerformanceRecord_jobNo_date_idx" ON "MisPerformanceRecord"("jobNo", "date");

-- CreateIndex
CREATE UNIQUE INDEX "MisPerformanceRecord_date_factoryCode_lineCode_jobNo_key" ON "MisPerformanceRecord"("date", "factoryCode", "lineCode", "jobNo");

-- CreateIndex
CREATE INDEX "MisSummarySnapshot_date_section_idx" ON "MisSummarySnapshot"("date", "section");

-- CreateIndex
CREATE UNIQUE INDEX "MisSummarySnapshot_date_factoryCode_section_metricKey_key" ON "MisSummarySnapshot"("date", "factoryCode", "section", "metricKey");

-- CreateIndex
CREATE INDEX "ResponsibleAssignment_factoryCode_floorCode_department_acti_idx" ON "ResponsibleAssignment"("factoryCode", "floorCode", "department", "active");

-- CreateIndex
CREATE INDEX "ResponsibleAssignment_lineCode_department_active_idx" ON "ResponsibleAssignment"("lineCode", "department", "active");

-- CreateIndex
CREATE INDEX "KpiManualValue_year_month_section_idx" ON "KpiManualValue"("year", "month", "section");

-- CreateIndex
CREATE UNIQUE INDEX "KpiManualValue_year_month_section_kpiKey_floorCode_lineCode_key" ON "KpiManualValue"("year", "month", "section", "kpiKey", "floorCode", "lineCode", "personName");

-- CreateIndex
CREATE UNIQUE INDEX "KaizenEntry_kaizenNo_key" ON "KaizenEntry"("kaizenNo");

-- CreateIndex
CREATE INDEX "KaizenEntry_status_createdAt_idx" ON "KaizenEntry"("status", "createdAt");

-- CreateIndex
CREATE INDEX "KaizenEntry_department_createdAt_idx" ON "KaizenEntry"("department", "createdAt");

-- CreateIndex
CREATE INDEX "IeActualAssignment_date_floorCode_lineCode_idx" ON "IeActualAssignment"("date", "floorCode", "lineCode");

-- CreateIndex
CREATE UNIQUE INDEX "IeActualAssignment_date_factoryCode_lineCode_jobNo_key" ON "IeActualAssignment"("date", "factoryCode", "lineCode", "jobNo");

-- CreateIndex
CREATE INDEX "IeSkillMatrix_floorCode_lineCode_active_idx" ON "IeSkillMatrix"("floorCode", "lineCode", "active");

-- CreateIndex
CREATE INDEX "IeSkillMatrix_employeeName_active_idx" ON "IeSkillMatrix"("employeeName", "active");

-- CreateIndex
CREATE UNIQUE INDEX "DyeingMachine_machineCode_key" ON "DyeingMachine"("machineCode");

-- CreateIndex
CREATE UNIQUE INDEX "SubcontractMill_millName_key" ON "SubcontractMill"("millName");

-- CreateIndex
CREATE UNIQUE INDEX "FabricOrder_jobNo_key" ON "FabricOrder"("jobNo");

-- CreateIndex
CREATE INDEX "FabricOrder_buyerName_slotNo_idx" ON "FabricOrder"("buyerName", "slotNo");

-- CreateIndex
CREATE INDEX "FabricOrderComponent_fabricOrderId_componentType_idx" ON "FabricOrderComponent"("fabricOrderId", "componentType");

-- CreateIndex
CREATE UNIQUE INDEX "GreigeRoll_rollBarcode_key" ON "GreigeRoll"("rollBarcode");

-- CreateIndex
CREATE INDEX "GreigeRoll_fabricOrderComponentId_isAllocated_idx" ON "GreigeRoll"("fabricOrderComponentId", "isAllocated");

-- CreateIndex
CREATE UNIQUE INDEX "DyeingBatch_batchNo_key" ON "DyeingBatch"("batchNo");

-- CreateIndex
CREATE INDEX "DyeingBatch_route_status_idx" ON "DyeingBatch"("route", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MultiProcessMovement_movementCode_key" ON "MultiProcessMovement"("movementCode");

-- CreateIndex
CREATE INDEX "MultiProcessMovement_processType_movementStatus_idx" ON "MultiProcessMovement"("processType", "movementStatus");

-- CreateIndex
CREATE UNIQUE INDEX "FinishedFabricDelivery_deliveryChallanNo_key" ON "FinishedFabricDelivery"("deliveryChallanNo");

-- CreateIndex
CREATE INDEX "FinishedFabricDelivery_fabricOrderId_deliveryDate_idx" ON "FinishedFabricDelivery"("fabricOrderId", "deliveryDate");

-- AddForeignKey
ALTER TABLE "MaintenanceMachine" ADD CONSTRAINT "MaintenanceMachine_factoryId_fkey" FOREIGN KEY ("factoryId") REFERENCES "Factory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceDailyMachine" ADD CONSTRAINT "MaintenanceDailyMachine_machineId_fkey" FOREIGN KEY ("machineId") REFERENCES "MaintenanceMachine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLot" ADD CONSTRAINT "ProductionLot_styleId_fkey" FOREIGN KEY ("styleId") REFERENCES "Style"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLotAllocation" ADD CONSTRAINT "ProductionLotAllocation_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "ProductionLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLotAllocation" ADD CONSTRAINT "ProductionLotAllocation_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportProjection" ADD CONSTRAINT "ImportProjection_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMutation" ADD CONSTRAINT "ImportMutation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "ImportBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FabricOrderComponent" ADD CONSTRAINT "FabricOrderComponent_fabricOrderId_fkey" FOREIGN KEY ("fabricOrderId") REFERENCES "FabricOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GreigeRoll" ADD CONSTRAINT "GreigeRoll_fabricOrderComponentId_fkey" FOREIGN KEY ("fabricOrderComponentId") REFERENCES "FabricOrderComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DyeingBatch" ADD CONSTRAINT "DyeingBatch_fabricOrderComponentId_fkey" FOREIGN KEY ("fabricOrderComponentId") REFERENCES "FabricOrderComponent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DyeingBatch" ADD CONSTRAINT "DyeingBatch_targetMachineId_fkey" FOREIGN KEY ("targetMachineId") REFERENCES "DyeingMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DyeingBatch" ADD CONSTRAINT "DyeingBatch_subcontractMillId_fkey" FOREIGN KEY ("subcontractMillId") REFERENCES "SubcontractMill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DyeingQualityLog" ADD CONSTRAINT "DyeingQualityLog_dyeingBatchId_fkey" FOREIGN KEY ("dyeingBatchId") REFERENCES "DyeingBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiProcessMovement" ADD CONSTRAINT "MultiProcessMovement_dyeingBatchId_fkey" FOREIGN KEY ("dyeingBatchId") REFERENCES "DyeingBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MultiProcessMovement" ADD CONSTRAINT "MultiProcessMovement_vendorMillId_fkey" FOREIGN KEY ("vendorMillId") REFERENCES "SubcontractMill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingRun" ADD CONSTRAINT "FinishingRun_dyeingBatchId_fkey" FOREIGN KEY ("dyeingBatchId") REFERENCES "DyeingBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingRun" ADD CONSTRAINT "FinishingRun_slittingMachineId_fkey" FOREIGN KEY ("slittingMachineId") REFERENCES "DyeingMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingRun" ADD CONSTRAINT "FinishingRun_stenterMachineId_fkey" FOREIGN KEY ("stenterMachineId") REFERENCES "DyeingMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishingRun" ADD CONSTRAINT "FinishingRun_compactingMachineId_fkey" FOREIGN KEY ("compactingMachineId") REFERENCES "DyeingMachine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinishedFabricDelivery" ADD CONSTRAINT "FinishedFabricDelivery_fabricOrderId_fkey" FOREIGN KEY ("fabricOrderId") REFERENCES "FabricOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
