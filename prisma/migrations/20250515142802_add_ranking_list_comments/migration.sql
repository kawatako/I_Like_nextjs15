-- CreateTable
CREATE TABLE "RankingListComment" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RankingListComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RankingListComment_listId_idx" ON "RankingListComment"("listId");

-- CreateIndex
CREATE INDEX "RankingListComment_userId_idx" ON "RankingListComment"("userId");
