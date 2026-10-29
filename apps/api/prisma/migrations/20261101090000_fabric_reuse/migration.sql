-- CreateTable
CREATE TABLE "ReuseStock" (
    "id" TEXT NOT NULL,
    "store" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "buyer" TEXT,
    "jobNo" TEXT,
    "fabric" TEXT NOT NULL,
    "fabricType" TEXT NOT NULL,
    "construction" TEXT NOT NULL,
    "composition" TEXT,
    "gsm" INTEGER,
    "dia" TEXT,
    "colour" TEXT,
    "process" TEXT,
    "kg" DECIMAL(14,2) NOT NULL,
    "reservedKg" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "location" TEXT,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReuseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReuseReservation" (
    "id" TEXT NOT NULL,
    "reuseStockId" TEXT NOT NULL,
    "styleId" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "kg" DECIMAL(14,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'HELD',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReuseReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReuseStock_store_fabricType_idx" ON "ReuseStock"("store", "fabricType");

-- CreateIndex
CREATE INDEX "ReuseStock_status_idx" ON "ReuseStock"("status");

-- CreateIndex
CREATE INDEX "ReuseReservation_styleId_idx" ON "ReuseReservation"("styleId");

-- AddForeignKey
ALTER TABLE "ReuseReservation" ADD CONSTRAINT "ReuseReservation_reuseStockId_fkey" FOREIGN KEY ("reuseStockId") REFERENCES "ReuseStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
