-- AlterTable
ALTER TABLE "RankingList" ADD COLUMN     "displayOrder" INTEGER;

-- CreateIndex
CREATE INDEX "RankingList_authorId_displayOrder_idx" ON "RankingList"("authorId", "displayOrder");
