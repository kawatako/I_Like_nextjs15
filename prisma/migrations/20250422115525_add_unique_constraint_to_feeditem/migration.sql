/*
  Warnings:

  - A unique constraint covering the columns `[rankingListId,type]` on the table `FeedItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "FeedItem_rankingListId_type_key" ON "FeedItem"("rankingListId", "type");
