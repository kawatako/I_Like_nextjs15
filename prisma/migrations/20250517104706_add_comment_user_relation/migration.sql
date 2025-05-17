-- AddForeignKey
ALTER TABLE "RankingListComment" ADD CONSTRAINT "RankingListComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
