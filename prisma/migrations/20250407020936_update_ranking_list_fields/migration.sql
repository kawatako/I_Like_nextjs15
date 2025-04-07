/*
  Warnings:

  - You are about to drop the column `isPublic` on the `RankingList` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- AlterTable
ALTER TABLE "RankingList" DROP COLUMN "isPublic",
ADD COLUMN     "listImageUrl" TEXT,
ADD COLUMN     "status" "ListStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateIndex
CREATE INDEX "RankingList_status_idx" ON "RankingList"("status");
