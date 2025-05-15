/*
  Warnings:

  - The primary key for the `AverageItemRank` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `AverageItemRank` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AverageItemRank" DROP CONSTRAINT "AverageItemRank_pkey",
DROP COLUMN "id",
ADD COLUMN     "id" UUID NOT NULL DEFAULT gen_random_uuid(),
ADD CONSTRAINT "AverageItemRank_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "AverageItemComment" (
    "id" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AverageItemComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AverageItemComment_subject_itemName_idx" ON "AverageItemComment"("subject", "itemName");

-- CreateIndex
CREATE INDEX "AverageItemComment_userId_idx" ON "AverageItemComment"("userId");
