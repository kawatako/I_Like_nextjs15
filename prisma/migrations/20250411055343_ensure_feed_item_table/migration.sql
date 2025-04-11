-- CreateEnum
CREATE TYPE "FeedType" AS ENUM ('POST', 'RANKING_UPDATE', 'RETWEET', 'QUOTE_RETWEET');

-- CreateTable
CREATE TABLE "FeedItem" (
    "id" TEXT NOT NULL,
    "type" "FeedType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "postId" TEXT,
    "rankingListId" TEXT,
    "retweetOfFeedItemId" TEXT,
    "quotedFeedItemId" TEXT,

    CONSTRAINT "FeedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedItem_userId_createdAt_idx" ON "FeedItem"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "FeedItem_createdAt_idx" ON "FeedItem"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "FeedItem_postId_idx" ON "FeedItem"("postId");

-- CreateIndex
CREATE INDEX "FeedItem_rankingListId_idx" ON "FeedItem"("rankingListId");

-- CreateIndex
CREATE INDEX "FeedItem_retweetOfFeedItemId_idx" ON "FeedItem"("retweetOfFeedItemId");

-- CreateIndex
CREATE INDEX "FeedItem_quotedFeedItemId_idx" ON "FeedItem"("quotedFeedItemId");

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "FeedItem_rankingListId_fkey" FOREIGN KEY ("rankingListId") REFERENCES "RankingList"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "retweet_of_feed_item_id" FOREIGN KEY ("retweetOfFeedItemId") REFERENCES "FeedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedItem" ADD CONSTRAINT "quoted_feed_item_id" FOREIGN KEY ("quotedFeedItemId") REFERENCES "FeedItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
