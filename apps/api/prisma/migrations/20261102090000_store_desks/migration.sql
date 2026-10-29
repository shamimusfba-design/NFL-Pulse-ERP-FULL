-- AlterTable
ALTER TABLE "ReuseStock" ADD COLUMN "ref" TEXT;

-- CreateTable
CREATE TABLE "StoreLine" (
    "id" TEXT NOT NULL,
    "desk" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSlice" (
    "desk" TEXT NOT NULL,
    "slice" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreSlice_pkey" PRIMARY KEY ("desk","slice")
);

-- CreateTable
CREATE TABLE "StoreChange" (
    "id" TEXT NOT NULL,
    "desk" TEXT NOT NULL,
    "slice" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReuseStock_ref_key" ON "ReuseStock"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "StoreLine_desk_kind_sourceRow_key" ON "StoreLine"("desk", "kind", "sourceRow");

-- CreateIndex
CREATE INDEX "StoreChange_desk_createdAt_idx" ON "StoreChange"("desk", "createdAt");
