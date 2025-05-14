/*
  Warnings:

  - You are about to drop the `_RankingListTags` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "_RankingListTags" DROP CONSTRAINT "_RankingListTags_A_fkey";

-- DropForeignKey
ALTER TABLE "_RankingListTags" DROP CONSTRAINT "_RankingListTags_B_fkey";

-- DropTable
DROP TABLE "_RankingListTags";

-- CreateTable
CREATE TABLE "RankingListTag" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "RankingListTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RankingListTag_listId_tagId_key" ON "RankingListTag"("listId", "tagId");

-- CreateIndex
CREATE INDEX "idx_avgitemrank_subject_calcdate" ON "AverageItemRank"("subject", "calculationDate");

-- CreateIndex
CREATE INDEX "idx_rankinglist_status_subject_createdat" ON "RankingList"("status", "subject", "createdAt");

-- CreateIndex
CREATE INDEX "idx_trendingitem_period_calcdate" ON "TrendingItem"("period", "calculationDate");

-- CreateIndex
CREATE INDEX "idx_trendingsubject_period_calcdate" ON "TrendingSubject"("period", "calculationDate");

-- CreateIndex
CREATE INDEX "idx_trendingtag_period_calcdate" ON "TrendingTag"("period", "calculationDate");

-- AddForeignKey
ALTER TABLE "RankingListTag" ADD CONSTRAINT "RankingListTag_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RankingList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingListTag" ADD CONSTRAINT "RankingListTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
