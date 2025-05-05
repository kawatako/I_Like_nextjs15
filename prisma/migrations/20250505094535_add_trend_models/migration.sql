-- CreateTable
CREATE TABLE "AverageItemRank" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "avgRank" DOUBLE PRECISION NOT NULL,
    "count" INTEGER NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AverageItemRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AverageItemRank_subject_idx" ON "AverageItemRank"("subject");

-- CreateIndex
CREATE INDEX "AverageItemRank_calculationDate_idx" ON "AverageItemRank"("calculationDate");
