-- CreateTable
CREATE TABLE "DyeingLine" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRow" INTEGER NOT NULL,
    "month" TEXT NOT NULL,
    "slot" TEXT,
    "buyer" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL,
    "colour" TEXT,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DyeingLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DyeingStateSlice" (
    "slice" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DyeingStateSlice_pkey" PRIMARY KEY ("slice")
);

-- CreateTable
CREATE TABLE "DyeingChange" (
    "id" TEXT NOT NULL,
    "slice" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DyeingChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DyeingLine_source_sourceRow_key" ON "DyeingLine"("source", "sourceRow");

-- CreateIndex
CREATE INDEX "DyeingLine_month_idx" ON "DyeingLine"("month");

-- CreateIndex
CREATE INDEX "DyeingLine_jobNo_idx" ON "DyeingLine"("jobNo");

-- CreateIndex
CREATE INDEX "DyeingChange_slice_createdAt_idx" ON "DyeingChange"("slice", "createdAt");
