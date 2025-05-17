-- AddForeignKey
ALTER TABLE "AverageItemComment" ADD CONSTRAINT "AverageItemComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
