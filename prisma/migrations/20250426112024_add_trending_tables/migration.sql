-- CreateEnum
CREATE TYPE "TrendPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'ALL_TIME');

-- CreateTable
CREATE TABLE "TrendingSubject" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "period" "TrendPeriod" NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingTag" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "tagName" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "period" "TrendPeriod" NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrendingItem" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "rankScore" DOUBLE PRECISION NOT NULL,
    "period" "TrendPeriod" NOT NULL,
    "calculationDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrendingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendingSubject_period_calculationDate_count_idx" ON "TrendingSubject"("period", "calculationDate", "count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TrendingSubject_subject_period_calculationDate_key" ON "TrendingSubject"("subject", "period", "calculationDate");

-- CreateIndex
CREATE INDEX "TrendingTag_period_calculationDate_count_idx" ON "TrendingTag"("period", "calculationDate", "count" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TrendingTag_tagId_period_calculationDate_key" ON "TrendingTag"("tagId", "period", "calculationDate");

-- CreateIndex
CREATE INDEX "TrendingItem_itemName_idx" ON "TrendingItem"("itemName");

-- CreateIndex
CREATE INDEX "TrendingItem_period_calculationDate_rankScore_idx" ON "TrendingItem"("period", "calculationDate", "rankScore" DESC);

-- AddForeignKey
ALTER TABLE "TrendingTag" ADD CONSTRAINT "TrendingTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
