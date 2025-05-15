/*
  Warnings:

  - You are about to drop the column `itemName` on the `AverageItemComment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "AverageItemComment_subject_itemName_idx";

-- AlterTable
ALTER TABLE "AverageItemComment" DROP COLUMN "itemName";
