-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('LIKE', 'DISLIKE');

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followerId_fkey";

-- DropForeignKey
ALTER TABLE "Follow" DROP CONSTRAINT "Follow_followingId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_postId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_userId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Reply" DROP CONSTRAINT "Reply_postId_fkey";

-- DropForeignKey
ALTER TABLE "Reply" DROP CONSTRAINT "Reply_userId_fkey";

-- CreateTable
CREATE TABLE "RankingList" (
    "id" TEXT NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "authorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RankingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankedItem" (
    "id" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "itemDescription" TEXT,
    "listId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankedItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingList_subject_idx" ON "RankingList"("subject");

-- CreateIndex
CREATE INDEX "RankingList_authorId_idx" ON "RankingList"("authorId");

-- CreateIndex
CREATE INDEX "RankingList_createdAt_idx" ON "RankingList"("createdAt");

-- CreateIndex
CREATE INDEX "RankedItem_itemName_idx" ON "RankedItem"("itemName");

-- CreateIndex
CREATE INDEX "RankedItem_listId_rank_idx" ON "RankedItem"("listId", "rank");

-- CreateIndex
CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");

-- CreateIndex
CREATE INDEX "Like_postId_idx" ON "Like"("postId");

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Reply_postId_idx" ON "Reply"("postId");

-- CreateIndex
CREATE INDEX "Reply_userId_idx" ON "Reply"("userId");

-- AddForeignKey
ALTER TABLE "RankingList" ADD CONSTRAINT "RankingList_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankedItem" ADD CONSTRAINT "RankedItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "RankingList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Like" ADD CONSTRAINT "Like_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reply" ADD CONSTRAINT "Reply_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
