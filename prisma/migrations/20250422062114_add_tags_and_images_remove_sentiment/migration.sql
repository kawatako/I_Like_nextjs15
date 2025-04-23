/*
  Warnings:

  - You are about to drop the column `sentiment` on the `RankingList` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "RankingList" DROP COLUMN "sentiment";

-- DropEnum
DROP TYPE "Sentiment";

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RankingListTags" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RankingListTags_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "Tag_name_idx" ON "Tag"("name");

-- CreateIndex
CREATE INDEX "_RankingListTags_B_index" ON "_RankingListTags"("B");

-- AddForeignKey
ALTER TABLE "_RankingListTags" ADD CONSTRAINT "_RankingListTags_A_fkey" FOREIGN KEY ("A") REFERENCES "RankingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RankingListTags" ADD CONSTRAINT "_RankingListTags_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
